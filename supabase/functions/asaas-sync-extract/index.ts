import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tipos de movimentação do extrato Asaas
interface AsaasFinancialTransaction {
    id: string
    value: number
    balance: number
    type: string // PAYMENT_RECEIVED, PAYMENT_FEE, TRANSFER, etc
    date: string
    description: string
    paymentId?: string
    transferId?: string
}

interface AsaasExtractResponse {
    object: string
    hasMore: boolean
    totalCount: number
    limit: number
    offset: number
    data: AsaasFinancialTransaction[]
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const asaasApiKey = Deno.env.get('ASAAS_API_KEY')
    if (!asaasApiKey) {
        return new Response(JSON.stringify({ error: 'ASAAS_API_KEY not configured' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }

    try {
        // Buscar parâmetros da request (opcional: data inicial e final)
        let startDate: string
        let endDate: string

        try {
            const body = await req.json()
            startDate = body.startDate || getDefaultStartDate()
            endDate = body.endDate || getDefaultEndDate()
        } catch {
            startDate = getDefaultStartDate()
            endDate = getDefaultEndDate()
        }

        console.log(`Syncing Asaas extract from ${startDate} to ${endDate}`)

        // Buscar extrato do Asaas
        const transactions = await fetchAsaasExtract(asaasApiKey, startDate, endDate)
        console.log(`Found ${transactions.length} transactions in Asaas`)

        // Processar cada transação
        let created = 0
        let skipped = 0

        for (const tx of transactions) {
            const result = await processTransaction(supabaseClient, tx)
            if (result === 'created') created++
            else skipped++
        }

        console.log(`Sync complete: ${created} created, ${skipped} skipped`)

        return new Response(JSON.stringify({
            success: true,
            total: transactions.length,
            created,
            skipped,
            period: { startDate, endDate }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('Error syncing extract:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})

function getDefaultStartDate(): string {
    // Últimos 30 dias
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
}

function getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0]
}

async function fetchAsaasExtract(apiKey: string, startDate: string, endDate: string): Promise<AsaasFinancialTransaction[]> {
    const allTransactions: AsaasFinancialTransaction[] = []
    let offset = 0
    const limit = 100
    let hasMore = true

    while (hasMore) {
        const url = `https://api.asaas.com/v3/financialTransactions?startDate=${startDate}&endDate=${endDate}&offset=${offset}&limit=${limit}`

        const response = await fetch(url, {
            headers: {
                'access_token': apiKey,
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Asaas API error: ${response.status} - ${errorText}`)
        }

        const data: AsaasExtractResponse = await response.json()
        allTransactions.push(...data.data)

        hasMore = data.hasMore
        offset += limit
    }

    return allTransactions
}

async function processTransaction(supabase: any, tx: AsaasFinancialTransaction): Promise<'created' | 'skipped'> {
    // Criar hash único para evitar duplicatas
    const importHash = `asaas_extract_${tx.id}`

    // Verificar se já existe
    const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('import_hash', importHash)
        .single()

    if (existing) {
        return 'skipped'
    }

    // Mapear tipo de transação para categoria
    const { category, type, isCac } = mapTransactionType(tx.type)

    // Criar transação
    const transactionData = {
        date: tx.date.split('T')[0],
        description: tx.description || mapTypeToDescription(tx.type),
        amount: tx.value, // Positivo = entrada, Negativo = saída
        category,
        is_cac: isCac,
        type, // 'revenue' ou 'expense'
        source: 'import',
        import_hash: importHash,
        notes: `Asaas ID: ${tx.id} | Tipo: ${tx.type}`,
    }

    const { error } = await supabase.from('transactions').insert(transactionData)

    if (error) {
        console.error(`Error inserting transaction ${tx.id}:`, error)
        return 'skipped'
    }

    return 'created'
}

function mapTransactionType(asaasType: string): { category: string, type: 'revenue' | 'expense', isCac: boolean } {
    // Tipos de entrada (receita)
    const revenueTypes = [
        'PAYMENT_RECEIVED',
        'PAYMENT_RECEIVED_IN_CASH',
        'RECEIVABLE_ANTICIPATION_CREDIT',
        'PROMOTIONAL_CODE_CREDIT',
        'REFUND_REVERSAL',
    ]

    // Tipos de saída (despesa) - taxas financeiras
    const feeTypes = [
        'PAYMENT_FEE',
        'PAYMENT_INSTALLMENT_FEE',
        'BILL_PAYMENT_FEE',
        'MOBILE_PHONE_RECHARGE_FEE',
        'CREDIT_CARD_FEE',
        'PIX_TRANSACTION_FEE',
        'ANTICIPATION_FEE',
        'REFUND_FEE',
        'CHARGEBACK_FEE',
    ]

    // Transferências/Saques - deixar como não categorizado para categorização manual
    const transferTypes = [
        'TRANSFER',
        'INTERNAL_TRANSFER',
    ]

    // Estornos e chargebacks
    const refundTypes = [
        'PAYMENT_REFUND',
        'PAYMENT_CHARGEBACK',
        'PAYMENT_CHARGEBACK_REFUND',
    ]

    if (revenueTypes.includes(asaasType)) {
        return { category: 'subscription', type: 'revenue', isCac: false }
    }

    if (feeTypes.includes(asaasType)) {
        // Taxas do Asaas vão para "Taxas Financeiras"
        return { category: 'financial_fees', type: 'expense', isCac: false }
    }

    if (transferTypes.includes(asaasType)) {
        // Transferências ficam como "Não Categorizado" para categorização manual
        return { category: 'uncategorized', type: 'expense', isCac: false }
    }

    if (refundTypes.includes(asaasType)) {
        // Estornos também ficam para categorização manual
        return { category: 'uncategorized', type: 'expense', isCac: false }
    }

    // Default: não categorizado para revisão manual
    return { category: 'uncategorized', type: 'expense', isCac: false }
}

function mapTypeToDescription(asaasType: string): string {
    const descriptions: Record<string, string> = {
        'PAYMENT_RECEIVED': 'Pagamento recebido',
        'PAYMENT_FEE': 'Taxa Asaas - Boleto/Pix',
        'CREDIT_CARD_FEE': 'Taxa Asaas - Cartão de Crédito',
        'PIX_TRANSACTION_FEE': 'Taxa Asaas - Pix',
        'TRANSFER': 'Transferência/Saque',
        'INTERNAL_TRANSFER': 'Transferência Interna',
        'PAYMENT_REFUND': 'Estorno de pagamento',
        'PAYMENT_CHARGEBACK': 'Chargeback',
        'ANTICIPATION_FEE': 'Taxa de Antecipação',
        'RECEIVABLE_ANTICIPATION_CREDIT': 'Crédito de Antecipação',
    }

    return descriptions[asaasType] || `Movimentação Asaas - ${asaasType}`
}

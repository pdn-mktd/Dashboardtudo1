import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
}

// Tipos de eventos do Asaas que vamos processar
type AsaasEvent =
    | 'PAYMENT_CREATED'
    | 'PAYMENT_UPDATED'
    | 'PAYMENT_CONFIRMED'
    | 'PAYMENT_RECEIVED'
    | 'PAYMENT_OVERDUE'
    | 'PAYMENT_DELETED'
    | 'PAYMENT_REFUNDED'
    | 'PAYMENT_CHARGEBACK_REQUESTED'
    | 'PAYMENT_CHARGEBACK_DISPUTE'
    | 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL'
    | 'SUBSCRIPTION_CREATED'
    | 'SUBSCRIPTION_UPDATED'
    | 'SUBSCRIPTION_DELETED';

interface AsaasPayment {
    id: string;
    customer: string;
    value: number;
    netValue?: number;
    description?: string;
    billingType: string;
    status: string;
    dueDate: string;
    paymentDate?: string;
    confirmedDate?: string;
    subscription?: string;
    installment?: string;
    invoiceUrl?: string;
    bankSlipUrl?: string;
    pixQrCodeUrl?: string;
}

interface AsaasWebhookPayload {
    event: AsaasEvent;
    payment?: AsaasPayment;
    subscription?: {
        id: string;
        customer: string;
        value: number;
        status: string;
    };
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const payload: AsaasWebhookPayload = await req.json()
        console.log('Webhook received:', payload.event)

        // 1. Salvar log do webhook (para debug e auditoria)
        await supabaseClient
            .from('asaas_webhook_logs')
            .insert({
                event_type: payload.event,
                payload: payload,
                processed: false
            })

        // 2. Processar evento
        if (payload.payment) {
            await processPaymentEvent(supabaseClient, payload.event, payload.payment)
        }

        if (payload.subscription) {
            await processSubscriptionEvent(supabaseClient, payload.event, payload.subscription)
        }

        // 3. Marcar log como processado
        await supabaseClient
            .from('asaas_webhook_logs')
            .update({ processed: true })
            .eq('payload->>event', payload.event)
            .order('created_at', { ascending: false })
            .limit(1)

        return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('Error processing webhook:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

async function processPaymentEvent(supabase: any, event: AsaasEvent, payment: AsaasPayment) {
    console.log(`Processing payment event: ${event} for payment ${payment.id}`)

    // Buscar cliente pelo asaas_customer_id
    const { data: client } = await supabase
        .from('clients')
        .select('id, name, email')
        .eq('asaas_customer_id', payment.customer)
        .single()

    const clientId = client?.id || null

    // Upsert na tabela asaas_payments
    const paymentData = {
        asaas_payment_id: payment.id,
        asaas_customer_id: payment.customer,
        client_id: clientId,
        value: payment.value,
        net_value: payment.netValue || null,
        description: payment.description || null,
        billing_type: payment.billingType,
        status: payment.status,
        due_date: payment.dueDate,
        payment_date: payment.paymentDate || null,
        confirmed_date: payment.confirmedDate || null,
        asaas_subscription_id: payment.subscription || null,
        installment: payment.installment || null,
        invoice_url: payment.invoiceUrl || null,
        bank_slip_url: payment.bankSlipUrl || null,
        pix_qr_code: payment.pixQrCodeUrl || null,
        updated_at: new Date().toISOString()
    }

    await supabase
        .from('asaas_payments')
        .upsert(paymentData, { onConflict: 'asaas_payment_id' })

    // Processar eventos específicos
    switch (event) {
        case 'PAYMENT_CONFIRMED':
        case 'PAYMENT_RECEIVED':
            await handlePaymentReceived(supabase, payment, clientId)
            break

        case 'PAYMENT_OVERDUE':
            await handlePaymentOverdue(supabase, payment, clientId)
            break

        case 'PAYMENT_REFUNDED':
            await handlePaymentRefunded(supabase, payment, clientId)
            break
    }
}

async function handlePaymentReceived(supabase: any, payment: AsaasPayment, clientId: string | null) {
    console.log(`Payment received: ${payment.id} - R$ ${payment.value}`)

    // 1. Criar transação de receita
    const transactionData = {
        date: payment.paymentDate || payment.confirmedDate || new Date().toISOString().split('T')[0],
        description: payment.description || `Pagamento Asaas - ${payment.billingType}`,
        amount: payment.value,
        category: payment.subscription ? 'subscription' : 'service', // Recorrente = subscription, avulso = service
        is_cac: false,
        type: 'revenue',
        source: 'import',
        asaas_payment_id: payment.id,
        payment_method: payment.billingType,
        client_id: clientId,
        notes: `Asaas ID: ${payment.id} | Cliente Asaas: ${payment.customer}`,
    }

    // Verificar se já existe (idempotência)
    const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('asaas_payment_id', payment.id)
        .single()

    if (!existing) {
        await supabase.from('transactions').insert(transactionData)
        console.log('Transaction created')
    } else {
        console.log('Transaction already exists, skipping')
    }

    // 2. Atualizar status do cliente se vinculado
    if (clientId) {
        await supabase
            .from('clients')
            .update({
                payment_status: 'ok',
                last_payment_date: payment.paymentDate || payment.confirmedDate,
                days_overdue: 0
            })
            .eq('id', clientId)
        console.log('Client payment status updated to OK')
    }
}

async function handlePaymentOverdue(supabase: any, payment: AsaasPayment, clientId: string | null) {
    console.log(`Payment overdue: ${payment.id}`)

    if (clientId) {
        // Calcular dias em atraso
        const dueDate = new Date(payment.dueDate)
        const today = new Date()
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

        await supabase
            .from('clients')
            .update({
                payment_status: 'overdue',
                days_overdue: daysOverdue > 0 ? daysOverdue : 0
            })
            .eq('id', clientId)
        console.log(`Client marked as overdue (${daysOverdue} days)`)
    }
}

async function handlePaymentRefunded(supabase: any, payment: AsaasPayment, clientId: string | null) {
    console.log(`Payment refunded: ${payment.id}`)

    // Criar transação de estorno (valor negativo)
    const refundData = {
        date: new Date().toISOString().split('T')[0],
        description: `Estorno - ${payment.description || 'Pagamento Asaas'}`,
        amount: -payment.value, // Negativo = saída
        category: 'other',
        is_cac: false,
        type: 'expense',
        source: 'import',
        asaas_payment_id: `${payment.id}_refund`,
        payment_method: payment.billingType,
        client_id: clientId,
        notes: `Estorno do pagamento Asaas: ${payment.id}`,
    }

    await supabase.from('transactions').insert(refundData)
    console.log('Refund transaction created')
}

async function processSubscriptionEvent(supabase: any, event: AsaasEvent, subscription: any) {
    console.log(`Processing subscription event: ${event}`)

    // Buscar cliente vinculado
    const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('asaas_customer_id', subscription.customer)
        .single()

    if (!client) {
        console.log('No linked client found for subscription')
        return
    }

    switch (event) {
        case 'SUBSCRIPTION_DELETED':
            // Cliente cancelou assinatura - pode ser indicativo de churn futuro
            console.log(`Subscription deleted for client ${client.id}`)
            // Não marcamos como churned automaticamente, apenas logamos
            // O churn manual dá mais controle
            break
    }
}

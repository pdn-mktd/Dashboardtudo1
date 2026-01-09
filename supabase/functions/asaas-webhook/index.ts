import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create Supabase client with Admin (Service Role) key to bypass RLS if needed
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get the request body (webhook payload from Asaas)
        const payload = await req.json()
        console.log('Webhook received:', payload)

        const { event, payment } = payload

        // We only care about received/confirmed payments
        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {

            // Map Asaas data to our Transaction schema
            const transactionData = {
                date: payment.paymentDate || payment.dateCreated, // Use payment date
                description: payment.description || `Pagamento Asaas - Cliente ${payment.customer}`,
                amount: payment.value, // Positive for revenue
                category: 'subscription', // Defaulting to subscription, could be logic based
                is_cac: false,
                type: 'revenue',
                source: 'import', // Marking as 'import' since 'manual' is for user input
                import_hash: payment.id, // Storing Asaas ID to prevent duplicates
                notes: `Asaas ID: ${payment.id} | Event: ${event}`
            }

            // Check if transaction already exists (idempotency)
            const { data: existing } = await supabaseClient
                .from('transactions')
                .select('id')
                .eq('import_hash', payment.id)
                .single()

            if (!existing) {
                const { error } = await supabaseClient
                    .from('transactions')
                    .insert(transactionData)

                if (error) {
                    console.error('Error inserting transaction:', error)
                    throw error
                }
                console.log('Transaction created successfully')
            } else {
                console.log('Transaction already exists, skipping')
            }
        }

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

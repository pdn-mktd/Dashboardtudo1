-- =============================================
-- ATUALIZAR CATEGORIAS DAS TRANSAÇÕES ASAAS JÁ IMPORTADAS
-- Execute no Supabase SQL Editor
-- =============================================

-- 1. Atualizar TAXAS para "Taxas Financeiras" (financial_fees)
UPDATE transactions 
SET category = 'financial_fees' 
WHERE import_hash LIKE 'asaas_extract_%' 
AND (
    notes LIKE '%PAYMENT_FEE%' 
    OR notes LIKE '%CREDIT_CARD_FEE%' 
    OR notes LIKE '%PIX_TRANSACTION_FEE%'
    OR notes LIKE '%ANTICIPATION_FEE%'
    OR notes LIKE '%CHARGEBACK_FEE%'
    OR notes LIKE '%REFUND_FEE%'
    OR notes LIKE '%BILL_PAYMENT_FEE%'
    OR notes LIKE '%INSTALLMENT_FEE%'
);

-- 2. Atualizar TRANSFERÊNCIAS e outras saídas para "Não Categorizado" (uncategorized)
UPDATE transactions 
SET category = 'uncategorized' 
WHERE import_hash LIKE 'asaas_extract_%' 
AND (
    notes LIKE '%TRANSFER%' 
    OR notes LIKE '%REFUND%'
    OR notes LIKE '%CHARGEBACK%'
)
AND category NOT IN ('financial_fees', 'subscription');

-- 3. Atualizar transações "other" importadas do Asaas para "Não Categorizado"
UPDATE transactions 
SET category = 'uncategorized' 
WHERE import_hash LIKE 'asaas_extract_%' 
AND category = 'other';

-- 4. Atualizar também transações com categoria "administrative" importadas do Asaas que são taxas
UPDATE transactions 
SET category = 'financial_fees' 
WHERE import_hash LIKE 'asaas_extract_%' 
AND category = 'administrative'
AND (
    description LIKE '%Taxa%' 
    OR description LIKE '%taxa%'
    OR notes LIKE '%FEE%'
);

-- Verificar resultado
SELECT category, COUNT(*) as qtd, SUM(amount) as total
FROM transactions 
WHERE import_hash LIKE 'asaas_extract_%'
GROUP BY category
ORDER BY category;

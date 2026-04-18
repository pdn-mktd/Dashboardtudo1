-- ============================================
-- Adicionar períodos trimestral e semestral ao billing_period
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Remover a constraint antiga que só permite 'mensal' e 'anual'
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_billing_period_check;

-- 2. Adicionar nova constraint incluindo 'trimestral' e 'semestral'
ALTER TABLE products ADD CONSTRAINT products_billing_period_check 
  CHECK (billing_period IN ('mensal', 'trimestral', 'semestral', 'anual'));

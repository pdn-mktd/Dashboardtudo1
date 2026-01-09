-- ============================================
-- INTEGRAÇÃO ASAAS - TUDO1 DASHBOARD
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Adicionar campos de integração na tabela clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'ok'; -- ok, pending, overdue
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_payment_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS days_overdue INTEGER DEFAULT 0;

-- Criar índice para busca rápida por ID do Asaas
CREATE INDEX IF NOT EXISTS idx_clients_asaas_customer_id ON clients(asaas_customer_id);

-- 2. Adicionar campos de integração na tabela transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method TEXT; -- PIX, BOLETO, CREDIT_CARD
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

-- Criar índice para evitar duplicatas
CREATE INDEX IF NOT EXISTS idx_transactions_asaas_payment_id ON transactions(asaas_payment_id);

-- 3. Criar tabela de histórico de pagamentos Asaas (para análises avançadas)
CREATE TABLE IF NOT EXISTS asaas_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asaas_payment_id TEXT UNIQUE NOT NULL,
  asaas_customer_id TEXT NOT NULL,
  client_id UUID REFERENCES clients(id),
  
  -- Dados do pagamento
  value DECIMAL(12,2) NOT NULL,
  net_value DECIMAL(12,2), -- Valor líquido (após taxas)
  description TEXT,
  billing_type TEXT, -- BOLETO, PIX, CREDIT_CARD, etc
  status TEXT NOT NULL, -- PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED, etc
  
  -- Datas importantes
  due_date DATE,
  payment_date DATE,
  confirmed_date DATE,
  
  -- Relacionamento com assinatura (se houver)
  asaas_subscription_id TEXT,
  installment TEXT, -- Número da parcela se for parcelado
  
  -- Metadados
  invoice_url TEXT,
  bank_slip_url TEXT,
  pix_qr_code TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_asaas_payments_customer ON asaas_payments(asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_asaas_payments_client ON asaas_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_asaas_payments_status ON asaas_payments(status);
CREATE INDEX IF NOT EXISTS idx_asaas_payments_due_date ON asaas_payments(due_date);

-- 4. Criar tabela de log de webhooks (para debug e auditoria)
CREATE TABLE IF NOT EXISTS asaas_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Habilitar RLS nas novas tabelas
ALTER TABLE asaas_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policies para asaas_payments
CREATE POLICY "Authenticated users can read asaas_payments" ON asaas_payments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage asaas_payments" ON asaas_payments
  FOR ALL TO service_role USING (true);

-- Policies para asaas_webhook_logs
CREATE POLICY "Authenticated users can read asaas_webhook_logs" ON asaas_webhook_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage asaas_webhook_logs" ON asaas_webhook_logs
  FOR ALL TO service_role USING (true);

-- 6. Criar view para análise de inadimplência
CREATE OR REPLACE VIEW v_client_payment_status AS
SELECT 
  c.id,
  c.name,
  c.email,
  c.asaas_customer_id,
  c.payment_status,
  c.days_overdue,
  c.last_payment_date,
  p.name as product_name,
  p.price as product_price,
  (
    SELECT COUNT(*) 
    FROM asaas_payments ap 
    WHERE ap.client_id = c.id AND ap.status = 'OVERDUE'
  ) as overdue_payments_count,
  (
    SELECT COALESCE(SUM(value), 0) 
    FROM asaas_payments ap 
    WHERE ap.client_id = c.id AND ap.status = 'OVERDUE'
  ) as overdue_amount
FROM clients c
LEFT JOIN products p ON c.product_id = p.id
WHERE c.status = 'active';

-- ============================================
-- PRONTO! Execute as próximas etapas:
-- 1. Atualize os emails dos clientes para bater com o Asaas
-- 2. Faça deploy da Edge Function
-- 3. Configure o webhook no painel Asaas
-- ============================================

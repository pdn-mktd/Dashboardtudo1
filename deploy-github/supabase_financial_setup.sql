-- ============================================
-- SISTEMA FINANCEIRO - TUDO1 DASHBOARD
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Criar tabela de transações
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,  -- Negativo = saída, Positivo = entrada
  category TEXT NOT NULL,
  subcategory TEXT,
  is_cac BOOLEAN DEFAULT FALSE,
  type TEXT NOT NULL DEFAULT 'expense',  -- 'expense' | 'revenue' | 'transfer'
  source TEXT DEFAULT 'manual',  -- 'manual' | 'import' | 'migrated'
  import_hash TEXT,  -- Para evitar duplicatas na importação
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar tabela de regras de categorização
CREATE TABLE IF NOT EXISTS category_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL,
  category TEXT NOT NULL,
  is_cac BOOLEAN DEFAULT FALSE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_is_cac ON transactions(is_cac);
CREATE INDEX IF NOT EXISTS idx_transactions_import_hash ON transactions(import_hash);

-- 4. Migrar dados existentes de expenses para transactions
INSERT INTO transactions (date, description, amount, category, is_cac, type, source, created_at, updated_at)
SELECT 
  month_year::date as date,
  'Marketing - ' || to_char(month_year, 'MM/YYYY') as description,
  -marketing_spend as amount,  -- Negativo pois é despesa
  'marketing' as category,
  TRUE as is_cac,  -- Marketing entra no CAC
  'expense' as type,
  'migrated' as source,
  created_at,
  updated_at
FROM expenses
WHERE marketing_spend > 0;

INSERT INTO transactions (date, description, amount, category, is_cac, type, source, created_at, updated_at)
SELECT 
  month_year::date as date,
  'Vendas - ' || to_char(month_year, 'MM/YYYY') as description,
  -sales_spend as amount,  -- Negativo pois é despesa
  'sales' as category,
  TRUE as is_cac,  -- Vendas entra no CAC
  'expense' as type,
  'migrated' as source,
  created_at,
  updated_at
FROM expenses
WHERE sales_spend > 0;

-- 5. Inserir regras padrão de categorização
INSERT INTO category_rules (pattern, category, is_cac, priority) VALUES
-- Marketing (CAC)
('*FACEBOOK*', 'marketing', TRUE, 10),
('*META*', 'marketing', TRUE, 10),
('*GOOGLE ADS*', 'marketing', TRUE, 10),
('*ADWORDS*', 'marketing', TRUE, 10),
('*INSTAGRAM*', 'marketing', TRUE, 10),
('*TIKTOK*', 'marketing', TRUE, 10),
('*LINKEDIN*', 'marketing', TRUE, 10),
('*RD STATION*', 'marketing', TRUE, 10),

-- Vendas (CAC)
('*HUBSPOT*', 'sales', TRUE, 10),
('*PIPEDRIVE*', 'sales', TRUE, 10),
('*SALESFORCE*', 'sales', TRUE, 10),
('*COMISSAO*', 'sales', TRUE, 10),
('*COMISSÃO*', 'sales', TRUE, 10),

-- Infraestrutura
('*AWS*', 'infrastructure', FALSE, 10),
('*AMAZON WEB*', 'infrastructure', FALSE, 10),
('*GOOGLE CLOUD*', 'infrastructure', FALSE, 10),
('*AZURE*', 'infrastructure', FALSE, 10),
('*HEROKU*', 'infrastructure', FALSE, 10),
('*VERCEL*', 'infrastructure', FALSE, 10),
('*NETLIFY*', 'infrastructure', FALSE, 10),
('*DIGITAL OCEAN*', 'infrastructure', FALSE, 10),
('*HOSTINGER*', 'infrastructure', FALSE, 10),
('*HOSTGATOR*', 'infrastructure', FALSE, 10),

-- Ferramentas
('*SLACK*', 'tools', FALSE, 10),
('*NOTION*', 'tools', FALSE, 10),
('*FIGMA*', 'tools', FALSE, 10),
('*ZOOM*', 'tools', FALSE, 10),
('*MEET*', 'tools', FALSE, 10),
('*TRELLO*', 'tools', FALSE, 10),
('*ASANA*', 'tools', FALSE, 10),
('*JIRA*', 'tools', FALSE, 10),
('*GITHUB*', 'tools', FALSE, 10),
('*GITLAB*', 'tools', FALSE, 10),

-- Folha de Pagamento
('*SALARIO*', 'payroll', FALSE, 10),
('*SALÁRIO*', 'payroll', FALSE, 10),
('*FOLHA*', 'payroll', FALSE, 10),
('*PRO-LABORE*', 'payroll', FALSE, 10),
('*13*SALARIO*', 'payroll', FALSE, 10),
('*FERIAS*', 'payroll', FALSE, 10),
('*FÉRIAS*', 'payroll', FALSE, 10),
('*VT*', 'payroll', FALSE, 10),
('*VR*', 'payroll', FALSE, 10),
('*VALE*TRANSPORTE*', 'payroll', FALSE, 10),
('*VALE*REFEICAO*', 'payroll', FALSE, 10),

-- Impostos
('*DAS*', 'taxes', FALSE, 10),
('*SIMPLES*', 'taxes', FALSE, 10),
('*IMPOSTO*', 'taxes', FALSE, 10),
('*ISS*', 'taxes', FALSE, 10),
('*ICMS*', 'taxes', FALSE, 10),
('*PIS*', 'taxes', FALSE, 10),
('*COFINS*', 'taxes', FALSE, 10),
('*IRPJ*', 'taxes', FALSE, 10),
('*CSLL*', 'taxes', FALSE, 10),
('*INSS*', 'taxes', FALSE, 10),
('*FGTS*', 'taxes', FALSE, 10),

-- Administrativo
('*CONTADOR*', 'administrative', FALSE, 10),
('*CONTABIL*', 'administrative', FALSE, 10),
('*CONTÁBIL*', 'administrative', FALSE, 10),
('*ADVOCACIA*', 'administrative', FALSE, 10),
('*JURIDICO*', 'administrative', FALSE, 10),
('*JURÍDICO*', 'administrative', FALSE, 10),
('*CARTORIO*', 'administrative', FALSE, 10),
('*CARTÓRIO*', 'administrative', FALSE, 10),
('*ALUGUEL*', 'administrative', FALSE, 10),
('*ENERGIA*', 'administrative', FALSE, 10),
('*INTERNET*', 'administrative', FALSE, 10),
('*TELEFONE*', 'administrative', FALSE, 10);

-- 6. Habilitar RLS (Row Level Security)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_rules ENABLE ROW LEVEL SECURITY;

-- 7. Criar policies (permite acesso para usuários autenticados)
CREATE POLICY "Authenticated users can read transactions" ON transactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert transactions" ON transactions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update transactions" ON transactions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete transactions" ON transactions
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read category_rules" ON category_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert category_rules" ON category_rules
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update category_rules" ON category_rules
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete category_rules" ON category_rules
  FOR DELETE TO authenticated USING (true);

-- 8. Adicionar campos na tabela clients (se não existirem)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'churn_reason') THEN
    ALTER TABLE clients ADD COLUMN churn_reason TEXT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'notes') THEN
    ALTER TABLE clients ADD COLUMN notes TEXT NULL;
  END IF;
END $$;

-- ============================================
-- PRONTO! Agora você pode usar o sistema financeiro
-- ============================================

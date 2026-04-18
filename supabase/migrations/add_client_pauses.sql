-- ============================================
-- SISTEMA DE PAUSA DE ASSINATURAS - TUDO1 DASHBOARD
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Criar tabela de histórico de pausas
CREATE TABLE IF NOT EXISTS client_pauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  reason TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_client_pauses_client_id ON client_pauses(client_id);
CREATE INDEX IF NOT EXISTS idx_client_pauses_dates ON client_pauses(start_date, end_date);

-- 3. Atualizar constraint de status dos clientes (se existir)
-- Primeiro tenta dropar a constraint existente (pode não existir)
DO $$
BEGIN
  -- Tenta remover constraint antiga de status
  ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
  -- Adiciona nova constraint com 'paused'
  ALTER TABLE clients ADD CONSTRAINT clients_status_check
    CHECK (status IN ('active', 'paused', 'churned'));
EXCEPTION WHEN OTHERS THEN
  -- Se não existir ou outro erro, ignora
  NULL;
END $$;

-- 4. Habilitar RLS (Row Level Security) na tabela client_pauses
ALTER TABLE client_pauses ENABLE ROW LEVEL SECURITY;

-- 5. Criar policies para client_pauses
CREATE POLICY "Authenticated users can read client_pauses" ON client_pauses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert client_pauses" ON client_pauses
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update client_pauses" ON client_pauses
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete client_pauses" ON client_pauses
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- PRONTO! A tabela de pausas está criada.
-- ============================================

-- Adiciona coluna para rastrear a data de mudança de plano (upsell/downgrade)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS plan_change_date DATE NULL;

-- Comentário explicativo
COMMENT ON COLUMN clients.plan_change_date IS 'Data da última alteração de plano (upsell ou downgrade)';

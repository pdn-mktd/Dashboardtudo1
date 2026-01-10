-- =============================================
-- LIMPEZA DE DADOS DUPLICADOS - ASAAS
-- Execute no Supabase SQL Editor
-- =============================================

-- 1. Ver situação atual antes de limpar
SELECT 
    type,
    category,
    COUNT(*) as qtd,
    SUM(amount) as total
FROM transactions 
WHERE import_hash LIKE 'asaas_extract_%'
GROUP BY type, category
ORDER BY type, category;

-- 2. DELETAR receitas importadas do Asaas (out-dez 2025)
--    Essas duplicam o MRR calculado dos clientes
DELETE FROM transactions 
WHERE import_hash LIKE 'asaas_extract_%' 
AND type = 'revenue'
AND date < '2026-01-01';

-- 3. MANTER taxas financeiras (já estão corretas)
-- Nada a fazer

-- 4. MANTER transferências como "Não Categorizado"
--    Usuário vai categorizar manualmente
-- Nada a fazer (já estão como uncategorized)

-- 5. Ver situação final após limpeza
SELECT 
    type,
    category,
    COUNT(*) as qtd,
    SUM(amount) as total
FROM transactions 
WHERE import_hash LIKE 'asaas_extract_%'
GROUP BY type, category
ORDER BY type, category;

-- Resultado esperado:
-- Apenas DESPESAS (taxas financeiras + não categorizadas)
-- Sem receitas duplicadas

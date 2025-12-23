import { Plan, PlanStatus } from '@/types/planning';

const STORAGE_KEY = 'dashtudo_plans';

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const getPlans = (): Plan[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Failed to parse plans:', error);
        return [];
    }
};

export const savePlan = (plan: Plan) => {
    const plans = getPlans();

    // Garantir unicidade: Se este plano for active, pausar quaisquer outros ativos existentes
    if (plan.status === 'active') {
        plans.forEach(p => {
            if (p.status === 'active' && p.id !== plan.id) {
                p.status = 'paused';
            }
        });
    }

    const index = plans.findIndex(p => p.id === plan.id);

    if (index >= 0) {
        plans[index] = plan;
    } else {
        plans.push(plan);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
};

export const deletePlan = (id: string) => {
    const plans = getPlans().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
};

export const getActivePlan = (): Plan | undefined => {
    return getPlans().find(p => p.status === 'active');
};

export const getPlansByStatus = (status: PlanStatus): Plan[] => {
    return getPlans().filter(p => p.status === status);
};

export const archiveActivePlan = (status: 'paused' | 'cancelled', reason?: string) => {
    const plans = getPlans();
    let updated = false;

    // Arquivar TODOS os planos ativos encontrados (limpeza de zumbis)
    plans.forEach(p => {
        if (p.status === 'active') {
            p.status = status;
            p.updatedAt = new Date().toISOString();
            if (reason) p.cancellationReason = reason;
            updated = true;
        }
    });

    if (updated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
        return true;
    }
    return false;
};

export const migrateLegacyPlan = (): void => {
    const isFinalized = localStorage.getItem('planning_finalized') === 'true';
    // Se não está finalizado e não tem dados relevantes, ignorar.

    // Verificamos se já existe algum plano no storage novo para evitar duplicatas em reloads
    if (getPlans().length > 0 && !isFinalized) return;

    // Se finalizado Legacy existe, migrar.
    if (isFinalized) {
        const actionsStr = localStorage.getItem('planning_actions');
        const scenariosStr = localStorage.getItem('scenarios');
        const startDate = localStorage.getItem('planning_start_date');
        const statusLegacy = localStorage.getItem('planning_status') || 'active';
        const cancellationReason = localStorage.getItem('planning_cancellation_reason');

        // Se status legado for 'cancelled' ou 'paused', migrar como tal.

        const newPlan: Plan = {
            id: generateId(),
            title: `Planejamento (Migrado) ${new Date().toLocaleDateString()}`,
            status: (statusLegacy as PlanStatus) || 'active',
            segment: 'Não Identificado',
            startDate: startDate || new Date().toISOString(),
            horizonte: 6,
            currentMetrics: { cac: 0, ticketMedio: 0, churnRate: 0, novosClientesMes: 0, mrr: 0, ltv: 0, totalClientes: 0 },
            simulatedMetrics: { cac: 0, ticketMedio: 0, churnRate: 0, novosClientesMes: 0 },
            actions: actionsStr ? JSON.parse(actionsStr) : [],
            scenarios: scenariosStr ? JSON.parse(scenariosStr) : [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            cancellationReason: cancellationReason || undefined
        };

        savePlan(newPlan);

        // Limpar chaves antigas
        localStorage.removeItem('planning_finalized');
        localStorage.removeItem('planning_actions');
        localStorage.removeItem('planning_start_date');
        localStorage.removeItem('planning_status');
        localStorage.removeItem('planning_cancellation_reason');
        localStorage.removeItem('scenarios');
        localStorage.removeItem('planning_status_dismissed');
    }
};

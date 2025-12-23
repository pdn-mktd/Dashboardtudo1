import { ActionItem } from '@/services/groqService';

export type PlanStatus = 'active' | 'paused' | 'cancelled';

export interface PlanMetrics {
    cac: number;
    ticketMedio: number;
    churnRate: number;
    novosClientesMes: number;
    mrr: number;
    ltv: number;
    totalClientes: number;
}

export interface SimulatedMetrics {
    cac: number;
    ticketMedio: number;
    churnRate: number;
    novosClientesMes: number;
}

export interface Scenario {
    id: string;
    name: string;
    cac: number;
    ticketMedio: number;
    churnRate: number;
    novosClientesMes: number;
    horizonte: number;
    createdAt: string | Date;
}

export interface Plan {
    id: string;
    title: string;
    status: PlanStatus;
    segment: string;
    startDate: string;
    horizonte: number;

    currentMetrics: PlanMetrics;
    simulatedMetrics: SimulatedMetrics;

    actions: ActionItem[];
    scenarios: Scenario[];

    createdAt: string;
    updatedAt: string;

    cancellationReason?: string;
}


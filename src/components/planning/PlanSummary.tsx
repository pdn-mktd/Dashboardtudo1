import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { ActionItem } from '@/services/groqService';
import { Target, TrendingUp, Users, Calendar, CheckCircle2, DollarSign, Activity, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MetricComparison {
    label: string;
    current: number;
    target: number;
    format: 'currency' | 'percent' | 'number';
    inverse?: boolean; // Se menor é melhor (ex: churn, cac)
}

interface PlanSummaryProps {
    segment: string;
    startDate: Date;
    horizonte: number;
    currentMetrics: {
        cac: number;
        ticketMedio: number;
        churnRate: number;
        novosClientesMes: number;
        mrr: number;
    };
    simulatedMetrics: {
        cac: number;
        ticketMedio: number;
        churnRate: number;
        novosClientesMes: number;
    };
    actions: ActionItem[];
}

export const PlanSummary = ({
    segment,
    startDate,
    horizonte,
    currentMetrics,
    simulatedMetrics,
    actions
}: PlanSummaryProps) => {
    const endDate = addMonths(startDate, horizonte);

    const metricsList: MetricComparison[] = [
        { label: 'CAC', current: currentMetrics.cac, target: simulatedMetrics.cac, format: 'currency', inverse: true },
        { label: 'Ticket Médio', current: currentMetrics.ticketMedio, target: simulatedMetrics.ticketMedio, format: 'currency', inverse: false },
        { label: 'Churn Rate', current: currentMetrics.churnRate, target: simulatedMetrics.churnRate, format: 'percent', inverse: true },
        { label: 'Novos Clientes/Mês', current: currentMetrics.novosClientesMes, target: simulatedMetrics.novosClientesMes, format: 'number', inverse: false },
    ];

    const formatValue = (value: number, type: 'currency' | 'percent' | 'number') => {
        if (type === 'currency') return formatCurrency(value);
        if (type === 'percent') return formatPercent(value);
        return value.toString();
    };

    return (
        <div
            id="plan-summary-document"
            className="bg-white text-slate-900 w-full max-w-[21cm] mx-auto relative shadow-2xl print:shadow-none font-sans overflow-hidden"
        >
            {/* Header Hero */}
            <div className="bg-slate-900 text-white p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 transform translate-x-12 -translate-y-12">
                    <Target className="w-80 h-80" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6 text-primary-foreground/80">
                        <span className="bg-primary/20 p-2 rounded-lg border border-primary/30">
                            <Award className="w-5 h-5 text-primary-foreground" />
                        </span>
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">Planejamento Estratégico</span>
                    </div>
                    <h1 className="text-5xl font-extrabold mb-3 tracking-tight leading-tight">Plano de<br />Crescimento</h1>
                    <p className="text-2xl text-slate-300 font-light max-w-lg mb-8">{segment}</p>

                    <div className="flex gap-12 border-t border-white/10 pt-8">
                        <div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-bold">Início</div>
                            <div className="font-medium text-lg">{format(startDate, "MMM yyyy", { locale: ptBR })}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-bold">Conclusão</div>
                            <div className="font-medium text-lg">{format(endDate, "MMM yyyy", { locale: ptBR })}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-bold">Duração</div>
                            <div className="font-medium text-lg">{horizonte} meses</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-12">
                {/* Seção de Metas em Cards */}
                <div className="mb-14">
                    <h2 className="text-2xl font-bold flex items-center gap-3 mb-8 text-slate-800 border-b pb-4">
                        <Activity className="w-6 h-6 text-primary" />
                        Objetivos de Impacto
                    </h2>

                    <div className="grid grid-cols-2 gap-6">
                        {metricsList.map((metric, i) => {
                            const isBetter = metric.inverse
                                ? metric.target < metric.current
                                : metric.target > metric.current;

                            const isSame = metric.target === metric.current;

                            return (
                                <div key={i} className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex flex-col justify-between relative overflow-hidden group hover:border-primary/30 transition-colors">
                                    {/* Decoration */}
                                    <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full -mr-4 -mt-4" />

                                    <span className="text-slate-500 font-bold text-xs uppercase tracking-wider z-10">{metric.label}</span>
                                    <div className="flex items-end gap-3 mt-3 z-10">
                                        <div className="text-3xl font-bold text-slate-900 tracking-tight">
                                            {formatValue(metric.target, metric.format)}
                                        </div>
                                        <div className="flex items-center text-sm text-slate-400 mb-1.5 gap-2">
                                            <span className="line-through opacity-70">{formatValue(metric.current, metric.format)}</span>
                                        </div>
                                    </div>

                                    {/* Badge de Evolução */}
                                    <div className="mt-4 inline-flex">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide ${isBetter
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : isSame
                                                ? 'bg-slate-200 text-slate-600'
                                                : 'bg-rose-100 text-rose-700'
                                            }`}>
                                            {isBetter ? 'Melhoria Projetada' : (isSame ? 'Manutenção' : 'Atenção')}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Mapa de Ações - Estilo Melhorado */}
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3 mb-10 text-slate-800 border-b pb-4">
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                        Cronograma de Execução
                    </h2>

                    <div className="space-y-8 relative pl-2">
                        {/* Linha vertical contínua */}
                        <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-slate-200" />

                        {actions.map((action, index) => (
                            <div key={action.id} className="relative pl-12">
                                {/* Ponto na timeline */}
                                <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-white bg-slate-900 shadow-sm z-10 text-center flex items-center justify-center ring-1 ring-slate-100">
                                    <span className="text-[10px] font-bold text-white relative -top-[1px]">{index + 1}</span>
                                </div>

                                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative">
                                    <div className="absolute left-0 top-8 w-3 h-3 bg-white border border-slate-200 border-r-0 border-b-0 transform -translate-x-1.5 rotate-45" />

                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-slate-900 text-lg leading-tight pr-4">{action.title}</h3>
                                        <Badge className={`${action.priority === 'alta' ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200' :
                                            action.priority === 'media' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200' :
                                                'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                                            } border px-2 py-0.5 capitalize shadow-none`}>
                                            {action.priority}
                                        </Badge>
                                    </div>

                                    <p className="text-slate-600 mb-5 leading-relaxed text-sm">
                                        {action.description}
                                    </p>

                                    {action.subtasks && action.subtasks.length > 0 && (
                                        <div className="bg-slate-50 rounded-lg p-5 border border-slate-100">
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Etapas Chave</h4>
                                            <div className="grid grid-cols-1 gap-2.5">
                                                {action.subtasks.map((sub, j) => (
                                                    <div key={j} className="flex items-start gap-2.5 text-sm text-slate-700">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                                                        <span>{sub.title}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-12 mt-12 border-t border-slate-200 flex justify-between items-center text-slate-400 text-sm">
                <div>
                    Documento gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
                <div className="font-medium italic flex items-center gap-1 opacity-60">
                    feito por <span className="font-bold text-slate-600 not-italic">tudo1</span>
                </div>
            </div>
        </div>
    );
};

import { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Clock,
  BarChart3,
  UserMinus,
  CreditCard,
  Activity,
  Zap,
  Percent,
  CheckCircle2,
  ChevronRight,
  Rocket,
  PauseCircle,
  XCircle,
  X,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { KPICard } from '@/components/dashboard/KPICard';
import { MRRChart } from '@/components/dashboard/MRRChart';
import { MRRProjectionChart } from '@/components/dashboard/MRRProjectionChart';
import { ClientChurnChart } from '@/components/dashboard/ClientChurnChart';
import { TotalRevenueChart } from '@/components/dashboard/TotalRevenueChart';
import { RecentClientsTable } from '@/components/dashboard/RecentClientsTable';
import { ClientRankingTable } from '@/components/dashboard/ClientRankingTable';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { ExportableChart } from '@/components/ExportableChart';
import {
  useDashboard,
  useDashboardComparison,
  useMrrHistory,
  useClientChurnHistory,
  useTotalRevenueHistory,
  useRecentClients
} from '@/hooks/useDashboard';
import { useClients } from '@/hooks/useClients';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { getActivePlan, getPlansByStatus } from '@/services/planningStorage';
import { Plan } from '@/types/planning';

export default function Dashboard() {
  // Default to current year for better data visibility
  const [startDate, setStartDate] = useState(startOfYear(new Date()));
  const [endDate, setEndDate] = useState(endOfYear(new Date()));
  const [comparisonStartDate, setComparisonStartDate] = useState<Date | undefined>();
  const [comparisonEndDate, setComparisonEndDate] = useState<Date | undefined>();
  // Estado para o Banner de Planejamento (compatível com visual existente)
  const [planningStatus, setPlanningStatus] = useState<{
    active: boolean; // Flag de visibilidade
    status: 'active' | 'paused' | 'cancelled';
    cancellationReason?: string;
    progress: number;
    actionsCount: number;
    completedCount: number;
    planId?: string;
    startDate?: string;
    endDate?: string;
    horizonte?: number;
    checkpoint?: 'halfway' | 'week_left' | 'today' | null;
  } | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [dismissedPlanId, setDismissedPlanId] = useState<string | null>(null);

  const navigate = useNavigate();

  // Load planning status from Storage Service
  useEffect(() => {
    const activePlan = getActivePlan();
    const pausedPlans = getPlansByStatus('paused');
    const cancelledPlans = getPlansByStatus('cancelled');

    // Definir qual plano mostrar no banner principal
    // Prioridade: 1. Ativo, 2. Pausado (mais recente), 3. Cancelado (mais recente)

    let targetPlan: Plan | undefined = activePlan;

    if (!targetPlan && pausedPlans.length > 0) {
      // Pega o pausado mais recente
      targetPlan = pausedPlans.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
    }

    if (!targetPlan && cancelledPlans.length > 0) {
      // Pega o cancelado mais recente
      targetPlan = cancelledPlans.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
    }

    if (targetPlan) {
      const completed = targetPlan.actions.filter(a => a.completed).length;
      const total = targetPlan.actions.length;
      const progress = total > 0 ? (completed / total) * 100 : 0;

      // Calcular checkpoint baseado nas datas
      let checkpoint: 'halfway' | 'week_left' | 'today' | null = null;
      if (targetPlan.startDate && targetPlan.horizonte && targetPlan.status === 'active') {
        const start = new Date(targetPlan.startDate);
        const end = new Date(start);
        end.setMonth(end.getMonth() + targetPlan.horizonte);

        const today = new Date();
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const daysElapsed = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Verificar checkpoints
        if (daysRemaining <= 0) {
          checkpoint = 'today'; // Prazo final ou passado
        } else if (daysRemaining <= 7) {
          checkpoint = 'week_left'; // Falta 1 semana ou menos
        } else if (daysElapsed >= totalDays / 2 && daysElapsed < (totalDays / 2) + 7) {
          checkpoint = 'halfway'; // Na metade do projeto (janela de 7 dias)
        }
      }

      // Calcular data de término
      let endDateStr: string | undefined;
      if (targetPlan.startDate && targetPlan.horizonte) {
        const end = new Date(targetPlan.startDate);
        end.setMonth(end.getMonth() + targetPlan.horizonte);
        endDateStr = end.toISOString();
      }

      setPlanningStatus({
        active: true,
        status: targetPlan.status,
        cancellationReason: targetPlan.cancellationReason,
        progress,
        actionsCount: total,
        completedCount: completed,
        planId: targetPlan.id,
        startDate: targetPlan.startDate,
        endDate: endDateStr,
        horizonte: targetPlan.horizonte,
        checkpoint
      });

      // Verificar dismiss por ID do plano
      const dismissedId = localStorage.getItem('planning_status_dismissed_id');
      if (dismissedId === targetPlan.id) {
        setIsDismissed(true);
        setDismissedPlanId(dismissedId);
      } else {
        setIsDismissed(false);
        setDismissedPlanId(null);
      }
    } else {
      setPlanningStatus(null);
    }
  }, []);

  const { data: metrics, isLoading: metricsLoading } = useDashboard({ startDate, endDate });
  const { data: comparisonData } = useDashboardComparison(startDate, endDate, comparisonStartDate, comparisonEndDate);
  const { data: mrrHistory, isLoading: mrrLoading } = useMrrHistory(startDate, endDate);
  const { data: clientChurnHistory, isLoading: churnLoading } = useClientChurnHistory(startDate, endDate);
  const { data: totalRevenueHistory, isLoading: revenueLoading } = useTotalRevenueHistory(startDate, endDate);
  const { data: recentClients, isLoading: clientsLoading } = useRecentClients();
  const { data: allClients, isLoading: allClientsLoading } = useClients();

  const handleDateChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleComparisonChange = (start: Date | undefined, end: Date | undefined) => {
    setComparisonStartDate(start);
    setComparisonEndDate(end);
  };

  // Calculate trend based on comparison
  const getTrend = (current: number, previous: number | undefined): { trend: 'up' | 'down' | 'neutral'; value: string } | null => {
    if (!previous || previous === 0) return null;
    const diff = ((current - previous) / previous) * 100;
    if (diff > 0) return { trend: 'up', value: `+${diff.toFixed(1)}%` };
    if (diff < 0) return { trend: 'down', value: `${diff.toFixed(1)}%` };
    return { trend: 'neutral', value: '0%' };
  };

  const mrrTrend = comparisonData ? getTrend(metrics?.mrr || 0, comparisonData.comparison.mrr) : null;
  const arrTrend = comparisonData ? getTrend(metrics?.arr || 0, comparisonData.comparison.arr) : null;
  const clientsTrend = comparisonData ? getTrend(metrics?.activeClients || 0, comparisonData.comparison.activeClients) : null;
  const churnTrend = comparisonData ? getTrend(metrics?.churnRate || 0, comparisonData.comparison.churnRate) : null;
  const cacTrend = comparisonData ? getTrend(metrics?.cac || 0, comparisonData.comparison.cac) : null;
  const ltvTrend = comparisonData ? getTrend(metrics?.ltv || 0, comparisonData.comparison.ltv) : null;

  const handleDismiss = () => {
    if (planningStatus?.planId) {
      localStorage.setItem('planning_status_dismissed_id', planningStatus.planId);
      setDismissedPlanId(planningStatus.planId);
    }
    setIsDismissed(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe as métricas do seu negócio em tempo real
            </p>
          </div>

          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onDateChange={handleDateChange}
            comparisonStartDate={comparisonStartDate}
            comparisonEndDate={comparisonEndDate}
            onComparisonChange={handleComparisonChange}
          />
        </div>

        {/* Planning Status Banner */}
        {planningStatus && planningStatus.active && !isDismissed && (
          <Card className={`
            relative transition-all duration-300
            ${planningStatus.status === 'active' ? 'bg-gradient-to-r from-primary/5 to-transparent border-primary/10' : ''}
            ${planningStatus.status === 'paused' ? 'bg-amber-50/50 border-amber-200/60' : ''}
            ${planningStatus.status === 'cancelled' ? 'bg-slate-50 border-dashed border-slate-200' : ''}
          `}>
            {/* Botão X para dispensar - disponível para todos os status */}
            <Button
              variant="ghost"
              size="icon"
              className={`absolute right-3 top-3 h-8 w-8 rounded-full z-10
                ${planningStatus.status === 'active' ? 'text-muted-foreground hover:text-foreground hover:bg-primary/10' : ''}
                ${planningStatus.status === 'paused' ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-100' : ''}
                ${planningStatus.status === 'cancelled' ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50' : ''}
              `}
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
            >
              <X className="w-4 h-4" />
            </Button>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className={`p-3 rounded-full shrink-0
                    ${planningStatus.status === 'active' ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : ''}
                    ${planningStatus.status === 'paused' ? 'bg-amber-100/50 text-amber-600 ring-1 ring-amber-200' : ''}
                    ${planningStatus.status === 'cancelled' ? 'bg-slate-100 text-slate-400' : ''}
                  `}>
                    {planningStatus.status === 'active' && <Rocket className="w-6 h-6" />}
                    {planningStatus.status === 'paused' && <PauseCircle className="w-6 h-6" />}
                    {planningStatus.status === 'cancelled' && <XCircle className="w-6 h-6" />}
                  </div>

                  <div>
                    {planningStatus.status === 'cancelled' ? (
                      <>
                        <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                          Nenhum plano ativo
                        </h3>
                        <div className="text-sm text-slate-500 mt-1 max-w-md">
                          O último planejamento foi cancelado. <br />
                          <span className="text-slate-400 text-xs mt-0.5 block italic">
                            Motivo: "{planningStatus.cancellationReason || 'Não informado'}"
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          {planningStatus.status === 'active' && 'Execução do Planejamento'}
                          {planningStatus.status === 'paused' && 'Planejamento Pausado'}
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border
                                ${planningStatus.status === 'active' ? 'text-primary bg-primary/5 border-primary/10' : ''}
                                ${planningStatus.status === 'paused' ? 'text-amber-600 bg-amber-50 border-amber-200' : ''}
                            `}>
                            {planningStatus.status === 'active' && 'Em Andamento'}
                            {planningStatus.status === 'paused' && 'Aguardando'}
                          </span>
                        </h3>

                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{planningStatus.completedCount} de {planningStatus.actionsCount} ações concluídas</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {planningStatus.status !== 'cancelled' && (
                  <div className="flex-1 w-full md:max-w-md space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-muted-foreground">Progresso Geral</span>
                      <span className="text-foreground">{Math.round(planningStatus.progress)}%</span>
                    </div>
                    <Progress
                      value={planningStatus.progress}
                      className={`h-2 ${planningStatus.status === 'paused' ? 'first-child:bg-amber-400' : ''}`}
                    />
                    {/* Checkpoint alerts */}
                    {planningStatus.checkpoint && (
                      <div className={`text-xs font-medium flex items-center gap-1 mt-2 px-2 py-1 rounded
                        ${planningStatus.checkpoint === 'halfway' ? 'bg-blue-500/10 text-blue-500' : ''}
                        ${planningStatus.checkpoint === 'week_left' ? 'bg-amber-500/10 text-amber-500' : ''}
                        ${planningStatus.checkpoint === 'today' ? 'bg-red-500/10 text-red-500' : ''}
                      `}>
                        <AlertCircle className="w-3 h-3" />
                        {planningStatus.checkpoint === 'halfway' && '📍 Metade do prazo do projeto!'}
                        {planningStatus.checkpoint === 'week_left' && '⚠️ Falta 1 semana para o prazo final!'}
                        {planningStatus.checkpoint === 'today' && '🚨 Prazo final atingido!'}
                      </div>
                    )}
                    {/* Data de término */}
                    {planningStatus.endDate && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Término: {format(new Date(planningStatus.endDate), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 w-full md:w-auto">
                  {planningStatus.status === 'cancelled' ? (
                    <>
                      <Button variant="ghost" onClick={() => navigate('/planejamento')} className="text-slate-500 hover:text-slate-700">
                        Ver Histórico
                      </Button>
                      <Button onClick={() => navigate('/planejamento?new=true')} className="bg-primary hover:bg-primary/90">
                        <Rocket className="w-4 h-4 mr-2" />
                        Nova Simulação
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => navigate('/planejamento')} className={`w-full md:w-auto ${planningStatus.status === 'paused' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}>
                      {planningStatus.status === 'paused' ? 'Gerenciar Plano' : 'Continuar Execução'}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metricsLoading ? (
            <>
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </>
          ) : (
            <>
              <KPICard
                title="MRR"
                value={formatCurrency(metrics?.mrr || 0)}
                subtitle="Receita Recorrente Mensal"
                icon={DollarSign}
                variant="primary"
                delay={0}
                trend={mrrTrend?.trend}
                trendValue={mrrTrend?.value}
                tooltip="Monthly Recurring Revenue - Soma de todas as receitas recorrentes mensais. Para planos anuais, divide por 12."
              />
              <KPICard
                title="ARR"
                value={formatCurrency(metrics?.arr || 0)}
                subtitle="Receita Recorrente Anual"
                icon={DollarSign}
                variant="primary"
                delay={50}
                trend={arrTrend?.trend}
                trendValue={arrTrend?.value}
                tooltip="Annual Recurring Revenue - MRR multiplicado por 12. Projeção anual da receita recorrente."
              />
              <KPICard
                title="Ticket Médio"
                value={formatCurrency(metrics?.ticketMedio || 0)}
                subtitle="Por cliente ativo"
                icon={CreditCard}
                variant="default"
                delay={50}
                tooltip="Valor médio mensal por cliente. Calculado dividindo o MRR pelo número de clientes ativos."
              />
              <KPICard
                title="Clientes Ativos"
                value={String(metrics?.activeClients || 0)}
                subtitle={`+${metrics?.newClientsThisMonth || 0} no período`}
                icon={Users}
                variant="success"
                delay={100}
                trend={clientsTrend?.trend}
                trendValue={clientsTrend?.value}
                tooltip="Total de clientes com assinatura ativa no final do período selecionado."
              />
              <KPICard
                title="Churn Rate"
                value={formatPercent(metrics?.churnRateMonthly || 0)}
                subtitle={`${formatPercent(metrics?.churnRate || 0)} no período (${metrics?.churnedThisMonth || 0} cancelamentos)`}
                icon={UserMinus}
                variant={metrics?.churnRateMonthly && metrics.churnRateMonthly > 5 ? 'destructive' : 'default'}
                delay={150}
                trend={churnTrend ? (churnTrend.trend === 'up' ? 'down' : 'up') : undefined}
                trendValue={churnTrend?.value}
                tooltip="Taxa média mensal de cancelamentos. Calculado: (cancelamentos / média de clientes) / meses. Ideal: <5%"
              />
              <KPICard
                title="CAC"
                value={formatCurrency(metrics?.cac || 0)}
                subtitle={metrics?.cac === 0 ? "Sem despesas no período" : "Custo de Aquisição"}
                icon={Target}
                variant="default"
                delay={200}
                trend={cacTrend ? (cacTrend.trend === 'up' ? 'down' : 'up') : undefined}
                trendValue={cacTrend?.value}
                tooltip="Customer Acquisition Cost - Total gasto em marketing e vendas dividido pelo número de novos clientes."
              />
              <KPICard
                title="LTV"
                value={formatCurrency(metrics?.ltv || 0)}
                subtitle="Lifetime Value"
                icon={TrendingUp}
                variant="success"
                delay={250}
                trend={ltvTrend?.trend}
                trendValue={ltvTrend?.value}
                tooltip="Receita total esperada de um cliente durante todo o relacionamento. Calculado: Ticket Médio × Tempo médio de vida."
              />
              <KPICard
                title="Faturamento Real"
                value={formatCurrency(metrics?.faturamentoReal || 0)}
                subtitle="Total cobrado no período"
                icon={BarChart3}
                variant="primary"
                delay={300}
                tooltip="Valor total efetivamente cobrado no período, incluindo novos clientes e renovações."
              />
              <KPICard
                title="Payback Period"
                value={`${formatNumber(metrics?.paybackPeriod || 0)} meses`}
                subtitle="CAC / Ticket Médio"
                icon={Clock}
                variant={metrics?.paybackPeriod && metrics.paybackPeriod > 12 ? 'warning' : 'default'}
                delay={350}
                tooltip="Tempo em meses para recuperar o investimento de aquisição de um cliente. Ideal: <12 meses"
              />
              <KPICard
                title="LTV/CAC Ratio"
                value={metrics?.ltvCacRatio === -1 ? "N/A" : `${formatNumber(metrics?.ltvCacRatio || 0)}x`}
                subtitle={
                  metrics?.ltvCacRatio === -1
                    ? "Cadastre despesas para calcular"
                    : (metrics?.ltvCacRatio && metrics.ltvCacRatio >= 3 ? "Saudável (≥3x)" : "Ideal: ≥3x")
                }
                icon={Activity}
                variant={
                  metrics?.ltvCacRatio === -1
                    ? 'default'
                    : (metrics?.ltvCacRatio && metrics.ltvCacRatio >= 3 ? 'success' : (metrics?.ltvCacRatio && metrics.ltvCacRatio >= 1 ? 'warning' : 'destructive'))
                }
                delay={400}
                tooltip="Relação entre o valor do cliente e o custo de aquisição. Acima de 3x indica negócio saudável e escalável."
              />
              <KPICard
                title="Quick Ratio"
                value={
                  metrics?.quickRatio === -1
                    ? "N/A"
                    : (metrics?.quickRatio === 99 ? "∞" : `${formatNumber(metrics?.quickRatio || 0)}x`)
                }
                subtitle={
                  metrics?.quickRatio === -1
                    ? "Sem movimentação no período"
                    : (metrics?.quickRatio === 99
                      ? "Sem churn! 🎉"
                      : (metrics?.quickRatio && metrics.quickRatio >= 4 ? "Excelente (≥4x)" : "Ideal: ≥4x"))
                }
                icon={Zap}
                variant={
                  metrics?.quickRatio === -1
                    ? 'default'
                    : (metrics?.quickRatio && metrics.quickRatio >= 4 ? 'success' : (metrics?.quickRatio && metrics.quickRatio >= 2 ? 'warning' : 'destructive'))
                }
                delay={450}
                tooltip="Eficiência de crescimento: (Novo MRR / MRR Perdido). Acima de 4x indica crescimento acelerado e sustentável."
              />
              <KPICard
                title="Margem Líquida"
                value={formatPercent(metrics?.netMargin || 0)}
                subtitle={metrics?.netMargin && metrics.netMargin >= 20 ? "Saudável" : "Ideal: ≥20%"}
                icon={Percent}
                variant={
                  metrics?.netMargin && metrics.netMargin >= 20
                    ? 'success'
                    : (metrics?.netMargin && metrics.netMargin >= 10 ? 'warning' : 'default')
                }
                delay={500}
                tooltip="Lucro líquido dividido pela receita. Indica quanto sobra após todas as despesas operacionais."
              />
            </>
          )}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {mrrLoading ? (
            <Skeleton className="h-[380px] rounded-xl" />
          ) : (
            <ExportableChart title="Evolução do MRR">
              <MRRChart data={mrrHistory || []} />
            </ExportableChart>
          )}

          {churnLoading ? (
            <Skeleton className="h-[380px] rounded-xl" />
          ) : (
            <ExportableChart title="Novos Clientes vs Cancelamentos">
              <ClientChurnChart data={clientChurnHistory || []} />
            </ExportableChart>
          )}
        </div>

        {/* Total Revenue Chart */}
        {revenueLoading ? (
          <Skeleton className="h-[380px] rounded-xl" />
        ) : (
          <ExportableChart title="Faturamento Total">
            <TotalRevenueChart data={totalRevenueHistory || []} />
          </ExportableChart>
        )}

        {/* MRR/ARR Projection Chart */}
        {mrrLoading ? (
          <Skeleton className="h-[380px] rounded-xl" />
        ) : (
          <ExportableChart title="Projeção MRR ARR">
            <MRRProjectionChart historicalData={mrrHistory || []} projectionMonths={6} />
          </ExportableChart>
        )}

        {/* Client Ranking Table */}
        {allClientsLoading ? (
          <Skeleton className="h-[400px] rounded-xl" />
        ) : (
          <ClientRankingTable clients={allClients || []} />
        )}

        {/* Recent Clients Table */}
        {clientsLoading ? (
          <Skeleton className="h-[300px] rounded-xl" />
        ) : (
          <RecentClientsTable clients={recentClients || []} />
        )}
      </div>
    </Layout>
  );
}

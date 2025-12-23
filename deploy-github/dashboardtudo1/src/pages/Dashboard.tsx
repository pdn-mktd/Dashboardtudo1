import { useState } from 'react';
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
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
  Percent
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
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

export default function Dashboard() {
  // Default to current year for better data visibility
  const [startDate, setStartDate] = useState(startOfYear(new Date()));
  const [endDate, setEndDate] = useState(endOfYear(new Date()));
  const [comparisonStartDate, setComparisonStartDate] = useState<Date | undefined>();
  const [comparisonEndDate, setComparisonEndDate] = useState<Date | undefined>();

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
                title="Margem Bruta"
                value={formatPercent(metrics?.grossMargin || 0)}
                subtitle={metrics?.grossMargin && metrics.grossMargin >= 50 ? "Saudável" : "Ideal: ≥50%"}
                icon={Percent}
                variant={
                  metrics?.grossMargin && metrics.grossMargin >= 50
                    ? 'success'
                    : (metrics?.grossMargin && metrics.grossMargin >= 30 ? 'warning' : 'default')
                }
                delay={500}
                tooltip="Lucro bruto dividido pela receita. Indica quanto sobra após os custos de aquisição (CAC)."
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

import { useState } from 'react';
import { startOfYear, endOfYear } from 'date-fns';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Wallet,
    PiggyBank,
    Percent,
    Flame,
    LineChart
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { KPICard } from '@/components/dashboard/KPICard';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { ExportableChart } from '@/components/ExportableChart';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinancialMetrics, useCashFlowHistory } from '@/hooks/useFinancial';
import { useDashboard } from '@/hooks/useDashboard';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { CATEGORY_LABELS, DREItem, TransactionCategory } from '@/types/database';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    Legend,
    BarChart,
    Bar,
    ReferenceLine,
} from 'recharts';

const COLORS = [
    'hsl(var(--primary))',
    'hsl(217, 91%, 60%)',
    'hsl(142, 76%, 36%)',
    'hsl(38, 92%, 50%)',
    'hsl(355, 78%, 56%)',
    'hsl(262, 83%, 58%)',
    'hsl(173, 58%, 39%)',
    'hsl(12, 76%, 61%)',
];

export default function Financial() {
    const [startDate, setStartDate] = useState(startOfYear(new Date()));
    const [endDate, setEndDate] = useState(endOfYear(new Date()));

    const { data: dashboardMetrics, isLoading: dashboardLoading } = useDashboard({ startDate, endDate });

    // Separate MRR (recurring) from setup (one-time) revenue
    // MRR = dashboardMetrics.mrr * number of months in period
    const months = dashboardMetrics ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))) : 1;
    const mrrRevenue = (dashboardMetrics?.mrr || 0) * months;

    // Setup = faturamentoReal - mrrRevenue (the difference is one-time payments)
    const faturamentoReal = dashboardMetrics?.faturamentoReal || 0;
    const setupRevenue = Math.max(0, faturamentoReal - mrrRevenue);

    const { data: financialMetrics, isLoading: metricsLoading } = useFinancialMetrics(startDate, endDate, mrrRevenue, setupRevenue);
    const { data: cashFlowData, isLoading: cashFlowLoading } = useCashFlowHistory(startDate, endDate);

    const isLoading = dashboardLoading || metricsLoading;

    // Build DRE with 3 revenue categories
    const dreItems: DREItem[] = financialMetrics ? [
        { label: 'Receita Bruta', value: financialMetrics.totalRevenue, indent: 0, isTotal: true },
        { label: 'Assinaturas (MRR)', value: financialMetrics.subscriptionRevenue, indent: 1 },
        { label: 'Setup / Pagamentos Únicos', value: financialMetrics.setupRevenue, indent: 1 },
        { label: 'Outras Receitas (Manual)', value: financialMetrics.otherRevenue, indent: 1 },
        { label: '(-) Custos de Aquisição (CAC)', value: -financialMetrics.cacExpenses, indent: 0 },
        { label: '(=) Lucro Bruto', value: financialMetrics.grossProfit, indent: 0, isSubtotal: true },
        { label: '(-) Despesas Operacionais', value: -financialMetrics.operationalExpenses, indent: 0 },
        { label: '(=) Resultado Operacional', value: financialMetrics.operationalResult, indent: 0, isTotal: true },
    ] : [];

    const handleDateRangeChange = (start: Date, end: Date) => {
        setStartDate(start);
        setEndDate(end);
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
                        <p className="text-muted-foreground mt-1">
                            DRE, Fluxo de Caixa e Análise Financeira
                        </p>
                    </div>
                    <DateRangeFilter
                        startDate={startDate}
                        endDate={endDate}
                        onDateChange={handleDateRangeChange}
                    />
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {isLoading ? (
                        [...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="h-32 rounded-xl" />
                        ))
                    ) : (
                        <>
                            <KPICard
                                title="Receita Total"
                                value={formatCurrency(financialMetrics?.totalRevenue || 0)}
                                subtitle="Assinaturas + Outras"
                                icon={DollarSign}
                                variant="primary"
                                delay={0}
                                tooltip="Soma de todas as receitas no período: assinaturas de clientes + receitas extras lançadas manualmente."
                            />
                            <KPICard
                                title="Despesas Totais"
                                value={formatCurrency(financialMetrics?.totalExpenses || 0)}
                                subtitle={`CAC: ${formatCurrency(financialMetrics?.cacExpenses || 0)}`}
                                icon={Wallet}
                                variant="destructive"
                                delay={50}
                                tooltip="Soma de todas as despesas no período, incluindo CAC (marketing + vendas) e despesas operacionais."
                            />
                            <KPICard
                                title="Resultado"
                                value={formatCurrency(financialMetrics?.operationalResult || 0)}
                                subtitle={`Margem: ${formatPercent(financialMetrics?.operationalMargin || 0)}`}
                                icon={(financialMetrics?.operationalResult || 0) >= 0 ? TrendingUp : TrendingDown}
                                variant={(financialMetrics?.operationalResult || 0) >= 0 ? 'success' : 'destructive'}
                                delay={100}
                                tooltip="Lucro ou prejuízo do período. Calculado: Receita Total - Despesas Totais."
                            />
                            <KPICard
                                title="Burn Rate"
                                value={formatCurrency(financialMetrics?.burnRate || 0)}
                                subtitle="Média mensal de despesas"
                                icon={Flame}
                                variant="warning"
                                delay={150}
                                tooltip="Média mensal de queima de caixa (despesas). Útil para calcular o runway."
                            />
                        </>
                    )}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Cash Flow Chart */}
                    <ExportableChart title="Fluxo de Caixa">
                        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Fluxo de Caixa</h3>
                            <div className="h-[300px]">
                                {cashFlowLoading ? (
                                    <Skeleton className="h-full w-full" />
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={cashFlowData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                            <XAxis
                                                dataKey="month"
                                                stroke="hsl(var(--muted-foreground))"
                                                fontSize={11}
                                                tickFormatter={(value) => {
                                                    const [year, month] = value.split('-');
                                                    return `${month}/${year.slice(2)}`;
                                                }}
                                            />
                                            <YAxis
                                                stroke="hsl(var(--muted-foreground))"
                                                fontSize={11}
                                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'hsl(var(--card))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: '8px',
                                                }}
                                                formatter={(value: number) => formatCurrency(value)}
                                            />
                                            <Legend />
                                            <Bar dataKey="revenue" name="Receitas" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="expenses" name="Despesas" fill="hsl(355, 78%, 56%)" radius={[4, 4, 0, 0]} />
                                            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </ExportableChart>

                    {/* Expenses by Category */}
                    <ExportableChart title="Despesas por Categoria">
                        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Despesas por Categoria</h3>
                            <div className="h-[300px]">
                                {isLoading ? (
                                    <Skeleton className="h-full w-full" />
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={financialMetrics?.expensesByCategory.map((item, index) => ({
                                                    ...item,
                                                    name: CATEGORY_LABELS[item.category as TransactionCategory] || item.category,
                                                    fill: COLORS[index % COLORS.length],
                                                })) || []}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={2}
                                                dataKey="amount"
                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                                            >
                                                {financialMetrics?.expensesByCategory.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'hsl(var(--card))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: '8px',
                                                }}
                                                formatter={(value: number) => formatCurrency(value)}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </ExportableChart>
                </div>

                {/* DRE */}
                <ExportableChart title="DRE Simplificado">
                    <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                        <h3 className="text-lg font-semibold text-foreground mb-4">DRE Simplificado</h3>
                        {isLoading ? (
                            <div className="space-y-3">
                                {[...Array(7)].map((_, i) => (
                                    <Skeleton key={i} className="h-10 w-full" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {dreItems.map((item, index) => (
                                    <div
                                        key={index}
                                        className={`flex items-center justify-between py-3 px-4 rounded-lg ${item.isTotal ? 'bg-primary/5 font-bold' :
                                            item.isSubtotal ? 'bg-muted font-semibold' : ''
                                            }`}
                                        style={{ paddingLeft: `${16 + item.indent * 24}px` }}
                                    >
                                        <span className={item.isTotal || item.isSubtotal ? 'text-foreground' : 'text-muted-foreground'}>
                                            {item.label}
                                        </span>
                                        <span className={`${item.value >= 0 ? 'text-foreground' : 'text-destructive'
                                            } ${item.isTotal || item.isSubtotal ? 'font-bold' : 'font-medium'}`}>
                                            {formatCurrency(item.value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </ExportableChart>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-success/10">
                                <PiggyBank className="h-5 w-5 text-success" />
                            </div>
                            <h4 className="font-semibold text-foreground">Lucro Bruto</h4>
                        </div>
                        <p className="text-3xl font-bold text-foreground">
                            {formatCurrency(financialMetrics?.grossProfit || 0)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Margem: {formatPercent(financialMetrics?.grossMargin || 0)}
                        </p>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Percent className="h-5 w-5 text-primary" />
                            </div>
                            <h4 className="font-semibold text-foreground">Margem Operacional</h4>
                        </div>
                        <p className="text-3xl font-bold text-foreground">
                            {formatPercent(financialMetrics?.operationalMargin || 0)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Meta: &gt; 20%
                        </p>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-warning/10">
                                <LineChart className="h-5 w-5 text-warning" />
                            </div>
                            <h4 className="font-semibold text-foreground">CAC / Receita</h4>
                        </div>
                        <p className="text-3xl font-bold text-foreground">
                            {formatPercent(
                                financialMetrics?.totalRevenue
                                    ? (financialMetrics.cacExpenses / financialMetrics.totalRevenue) * 100
                                    : 0
                            )}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Ideal: &lt; 30%
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MRRProjectionChartProps {
    historicalData: { month: string; mrr: number }[];
    projectionMonths?: number;
}

export function MRRProjectionChart({ historicalData, projectionMonths = 6 }: MRRProjectionChartProps) {
    // Calculate growth rate from historical data
    const calculateGrowthRate = () => {
        if (historicalData.length < 2) return 0;

        const recentMonths = historicalData.slice(-6); // Last 6 months for better accuracy
        if (recentMonths.length < 2) return 0;

        let totalGrowth = 0;
        let validPeriods = 0;

        for (let i = 1; i < recentMonths.length; i++) {
            const prev = recentMonths[i - 1].mrr;
            const curr = recentMonths[i].mrr;
            if (prev > 0) {
                totalGrowth += (curr - prev) / prev;
                validPeriods++;
            }
        }

        return validPeriods > 0 ? totalGrowth / validPeriods : 0;
    };

    const growthRate = calculateGrowthRate();
    const lastMrr = historicalData.length > 0 ? historicalData[historicalData.length - 1].mrr : 0;
    const lastMonth = historicalData.length > 0 ? historicalData[historicalData.length - 1].month : '';

    // Generate projection data
    const projectionData = [];
    let projectedMrr = lastMrr;
    const now = new Date();

    for (let i = 1; i <= projectionMonths; i++) {
        projectedMrr = projectedMrr * (1 + growthRate);
        const futureDate = addMonths(now, i);
        projectionData.push({
            month: format(futureDate, 'MMM/yy', { locale: ptBR }),
            mrr: null, // No actual MRR
            projected: Math.round(projectedMrr),
            arr: Math.round(projectedMrr * 12),
        });
    }

    // Combine historical and projection data
    const combinedData = [
        ...historicalData.map(d => ({
            ...d,
            projected: null,
            arr: d.mrr * 12,
        })),
        // Add last historical point to projection for continuity
        {
            month: lastMonth,
            mrr: lastMrr,
            projected: lastMrr,
            arr: lastMrr * 12,
        },
        ...projectionData,
    ];

    // Remove duplicate last month entry
    const uniqueData = combinedData.filter((item, index, self) =>
        index === self.findIndex((t) => t.month === item.month)
    );

    // Re-add last historical with projection for line continuity
    const lastHistoricalIndex = uniqueData.findIndex(d => d.month === lastMonth);
    if (lastHistoricalIndex !== -1) {
        uniqueData[lastHistoricalIndex] = {
            ...uniqueData[lastHistoricalIndex],
            projected: uniqueData[lastHistoricalIndex].mrr,
        };
    }

    const projectedArrIn6Months = projectionData.length > 0 ? projectionData[projectionData.length - 1].arr : 0;
    const currentArr = lastMrr * 12;
    const arrGrowth = currentArr > 0 ? ((projectedArrIn6Months - currentArr) / currentArr) * 100 : 0;

    return (
        <div className="bg-card rounded-xl border border-border p-6 shadow-card animate-slide-up" style={{ animationDelay: '400ms' }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Projeção de MRR/ARR</h3>
                    <p className="text-sm text-muted-foreground">
                        Próximos {projectionMonths} meses (taxa média: {(growthRate * 100).toFixed(1)}%/mês)
                    </p>
                </div>
                <div className="flex flex-col sm:items-end gap-1">
                    <div className="text-sm">
                        <span className="text-muted-foreground">ARR Projetado: </span>
                        <span className="font-semibold text-primary">{formatCurrency(projectedArrIn6Months)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {arrGrowth > 0 ? '+' : ''}{arrGrowth.toFixed(1)}% vs atual
                    </div>
                </div>
            </div>

            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={uniqueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="mrrHistoricalGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="mrrProjectedGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                            dataKey="month"
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                            tickLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <YAxis
                            tickFormatter={(value) => formatCurrency(value)}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                            tickLine={{ stroke: 'hsl(var(--border))' }}
                            width={100}
                        />
                        <Tooltip
                            formatter={(value: number, name: string) => {
                                if (value === null) return ['-', name];
                                const label = name === 'mrr' ? 'MRR Real' : 'MRR Projetado';
                                return [formatCurrency(value), label];
                            }}
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                boxShadow: 'var(--shadow-md)',
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <ReferenceLine
                            x={lastMonth}
                            stroke="hsl(var(--muted-foreground))"
                            strokeDasharray="5 5"
                            label={{
                                value: 'Hoje',
                                position: 'top',
                                fill: 'hsl(var(--muted-foreground))',
                                fontSize: 11
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="mrr"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            fill="url(#mrrHistoricalGradient)"
                            connectNulls={false}
                        />
                        <Area
                            type="monotone"
                            dataKey="projected"
                            stroke="hsl(142, 76%, 36%)"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            fill="url(#mrrProjectedGradient)"
                            connectNulls={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-primary"></div>
                    <span className="text-muted-foreground">MRR Real</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-green-600" style={{ borderStyle: 'dashed', borderWidth: '1px' }}></div>
                    <span className="text-muted-foreground">MRR Projetado</span>
                </div>
            </div>
        </div>
    );
}

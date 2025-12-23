import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/formatters';

interface TotalRevenueChartProps {
  data: { month: string; recorrente: number; unico: number }[];
}

export function TotalRevenueChart({ data }: TotalRevenueChartProps) {
  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Evolução do Faturamento Total
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="month" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip 
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === 'recorrente' ? 'Mensalidade (MRR)' : 'Setup/Serviços'
            ]}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Legend 
            formatter={(value) => value === 'recorrente' ? 'Mensalidade (MRR)' : 'Setup/Serviços'}
          />
          <Bar 
            dataKey="recorrente" 
            stackId="revenue"
            fill="hsl(var(--primary))" 
            name="recorrente"
            radius={[0, 0, 0, 0]}
          />
          <Bar 
            dataKey="unico" 
            stackId="revenue"
            fill="hsl(var(--chart-2))" 
            name="unico"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
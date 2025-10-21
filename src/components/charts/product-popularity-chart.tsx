'use client';

import { Pie, PieChart, ResponsiveContainer, Legend, Cell, Tooltip } from 'recharts';
// Données maintenant récupérées via Supabase
import type { ProductCategory } from '@/lib/types';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';

// Placeholder data - à remplacer par des données réelles via Supabase
const categoryCounts = {
  'Labo traditionnel': 45,
  'Laboratoire biscuit': 32,
  'Viennoiserie': 28,
  'Laboratoire cheese': 22,
  'Laboratoire gâteaux français': 38,
  'Laboratoire cake': 15,
  'Laboratoire tarte': 25,
  'Laboratoire gâteaux tunisiens': 30,
  'Laboratoire salés': 18
} as Record<ProductCategory, number>;

const data = Object.entries(categoryCounts)
  .map(([name, value]) => ({ name, value }))
  .filter(d => d.value > 0);

const chartConfig = data.reduce((acc, { name }, index) => {
    acc[name as keyof typeof acc] = {
      label: name,
      color: `hsl(var(--chart-${index + 1}))`,
    };
    return acc;
}, {} as ChartConfig)

export default function ProductPopularityChart() {
  return (
    <ChartContainer config={chartConfig} className="w-full h-[350px]">
      <PieChart>
        <Tooltip 
            cursor={{ fill: 'hsl(var(--muted))' }}
            content={<ChartTooltipContent />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          strokeWidth={2}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={`var(--color-${entry.name})`} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

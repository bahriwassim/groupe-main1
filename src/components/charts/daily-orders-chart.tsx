'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
// Données maintenant récupérées via Supabase
import { subDays, format } from 'date-fns';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';

const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), i)).reverse();

// Placeholder data - à remplacer par des données réelles via Supabase
const data = last7Days.map((day, i) => ({
  name: format(day, 'EEE'),
  total: Math.floor(Math.random() * 12) + 3, // Données simulées
}));

const chartConfig = {
  total: {
    label: 'Commandes',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function DailyOrdersChart() {
  return (
    <ChartContainer config={chartConfig} className="w-full h-[350px]">
      <BarChart accessibilityLayer data={data}>
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
          allowDecimals={false}
        />
        <ChartTooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            content={<ChartTooltipContent />} 
        />
        <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

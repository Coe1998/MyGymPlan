'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  data: { data: string; peso_kg: number }[]
}

export default function WeightChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <XAxis dataKey="data" tick={{ fontSize: 10, fill: 'oklch(0.45 0 0)' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'oklch(0.45 0 0)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 10%)', borderRadius: 8, fontSize: 12 }}
          formatter={(v: any) => [`${v} kg`, 'Peso']}
        />
        <Line type="monotone" dataKey="peso_kg" stroke="oklch(0.60 0.15 200)" strokeWidth={2}
          dot={{ r: 3, fill: 'oklch(0.60 0.15 200)', strokeWidth: 0 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { formatCurrency } from '../../utils/format'

interface DataPoint {
  date: string
  daily: number
}

interface Props {
  title: string
  data: DataPoint[]
}

function fmtDate(d: string): string {
  return `${d.slice(8)}.${d.slice(5, 7)}`
}

export default function QuarterBarChartCard({ title, data }: Props) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray=""
            vertical={false}
            stroke="#e2e8f0"
            strokeWidth={0.8}
          />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            interval="preserveStartEnd"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={v => (Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : String(v))}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            width={42}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v: unknown) => [formatCurrency(Number(v)), 'Sprzedaż']}
            labelFormatter={(d: unknown) => fmtDate(String(d))}
            contentStyle={{ borderRadius: 12, fontSize: 13 }}
            cursor={{ fill: 'rgba(148,163,184,0.1)' }}
          />
          <Bar dataKey="daily" fill="#059669" radius={[3, 3, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

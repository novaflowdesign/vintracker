import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { formatCurrency } from '../../utils/format'

interface BarChartCardProps {
  title: string
  data: { category: string; value: number }[]
  emptyText?: string
}

export default function BarChartCard({
  title,
  data,
  emptyText = 'Brak danych',
}: BarChartCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      {!data.length ? (
        <p className="text-sm text-slate-400 py-8 text-center">{emptyText}</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 52)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis
              type="number"
              tickFormatter={v => (Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : String(v))}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
            />
            <YAxis
              type="category"
              dataKey="category"
              width={108}
              tick={{ fontSize: 12, fill: '#64748b' }}
            />
            <Tooltip
              formatter={(v: unknown) => [formatCurrency(Number(v)), 'Zysk']}
              contentStyle={{ borderRadius: 12, fontSize: 13 }}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={i === 0 ? '#059669' : '#34d399'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

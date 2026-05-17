import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { formatCurrency } from '../../utils/format'

interface DataPoint {
  date: string
  cumulative: number
  [key: string]: string | number
}

interface LineChartCardProps {
  title: string
  data: DataPoint[]
  dataKey?: string
  referenceY?: number
  referenceLabel?: string
}

function fmtDate(d: string): string {
  return `${d.slice(8)}.${d.slice(5, 7)}`
}

export default function LineChartCard({
  title,
  data,
  dataKey = 'cumulative',
  referenceY,
  referenceLabel,
}: LineChartCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={v => (Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : String(v))}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            width={42}
          />
          <Tooltip
            formatter={(v: unknown) => [formatCurrency(Number(v)), 'Sprzedaż']}
            labelFormatter={fmtDate}
            contentStyle={{ borderRadius: 12, fontSize: 13 }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke="#059669"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          {referenceY !== undefined && (
            <ReferenceLine
              y={referenceY}
              stroke="#e11d48"
              strokeDasharray="5 5"
              label={{
                value: referenceLabel ?? '',
                fill: '#e11d48',
                fontSize: 11,
                position: 'insideTopRight',
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

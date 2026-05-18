import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'

const COLORS = ['#059669', '#0ea5e9', '#f59e0b', '#f43f5e', '#8b5cf6', '#94a3b8']

interface DonutChartCardProps {
  title: string
  data: { category: string; count: number }[]
  emptyText?: string
}

export default function DonutChartCard({
  title,
  data,
  emptyText = 'Brak danych',
}: DonutChartCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      {!data.length ? (
        <p className="text-sm text-slate-400 py-8 text-center">{emptyText}</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: unknown) => [`${v} szt.`, '']}
                contentStyle={{ borderRadius: 12, fontSize: 13 }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
            {data.map((entry, i) => (
              <div key={entry.category} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-xs text-gray-600 dark:text-slate-400">{entry.category}</span>
                <span className="text-xs font-semibold text-gray-900 dark:text-white">{entry.count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart as RechartsLineChart,
  BarChart as RechartsBarChart,
  Line,
  Bar,
  ResponsiveContainer,
} from "recharts"

interface ChartProps {
  data: any[]
  index: string
  categories: string[]
  colors: string[]
  valueFormatter?: (value: number) => string
  yAxisWidth?: number
}

export function LineChart({ data, index, categories, colors, valueFormatter, yAxisWidth }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={index} />
        <YAxis width={yAxisWidth} tickFormatter={valueFormatter} />
        <Tooltip formatter={valueFormatter ? (value) => [valueFormatter(value as number)] : undefined} />
        <Legend />
        {categories.map((category, i) => (
          <Line
            key={category}
            type="monotone"
            dataKey={category}
            stroke={colors[i % colors.length]}
            activeDot={{ r: 8 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}

export function BarChart({ data, index, categories, colors, valueFormatter, yAxisWidth }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart data={data} margin={{ top: 15, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={index} />
        <YAxis width={yAxisWidth} tickFormatter={valueFormatter} />
        <Tooltip formatter={valueFormatter ? (value) => [valueFormatter(value as number)] : undefined} />
        <Legend />
        {categories.map((category, i) => (
          <Bar key={category} dataKey={category} fill={colors[i % colors.length]} />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}


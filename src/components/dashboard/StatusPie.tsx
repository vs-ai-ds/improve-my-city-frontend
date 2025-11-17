// File: src/components/dashboard/StatusPie.tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const capitalize = (str: string) => {
  const replaced = str.replace(/_/g, " ");
  return replaced.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
};

export default function StatusPie({
  data,
  onPick,
}: {
  data: { name: string; value: number }[];
  onPick: (status: string) => void;
}) {
  const COLORS: Record<string, string> = {
    pending: "#f59e0b",
    in_progress: "#eab308", 
    resolved: "#10b981",
  };
  
  const total = data.reduce((sum, d) => sum + d.value, 0);
  
  const renderCustomLabel = (entry: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, name, value } = entry;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    const statusName = capitalize(name);
    const shortName = name === "in_progress" ? "In Prog" : statusName;
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="#ffffff" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
        stroke="#000000"
        strokeWidth={2}
        paintOrder="stroke fill"
      >
        {`${shortName} (${percentage}%)`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;
    const entry = payload[0];
    const value = entry.value;
    const name = entry.name;
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-gray-900">
          {capitalize(name)}: {value} ({percentage}%)
        </p>
      </div>
    );
  };

  const outerRadius = 110;
  const chartHeight = outerRadius * 2 + 40;
  const totalHeight = chartHeight + 40;

  return (
    <div className="flex flex-col" style={{ minHeight: `${totalHeight}px` }}>
      <div style={{ height: `${chartHeight}px`, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={outerRadius}
              onClick={(e: any) => e?.name && onPick(e.name)}
              label={renderCustomLabel}
              labelLine={false}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={COLORS[entry.name] || "#9ca3af"} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-center">
        <p className="text-sm font-semibold text-gray-700">Total Issues Reported: {total}</p>
      </div>
    </div>
  );
}
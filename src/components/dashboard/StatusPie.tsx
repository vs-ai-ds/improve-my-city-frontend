// File: src/components/dashboard/StatusPie.tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, LabelList } from "recharts";

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");

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
  
  const renderCustomLabel = (entry: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, name, value } = entry;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${capitalize(name)}: ${value}`}
      </text>
    );
  };

  return (
    <div className="h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={80}
            onClick={(e: any) => e?.name && onPick(e.name)}
            label={renderCustomLabel}
            labelLine={false}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={COLORS[entry.name] || "#9ca3af"} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, name: string) => [value, capitalize(name)]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
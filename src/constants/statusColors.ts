export const STATUS_COLORS = {
  pending: {
    bg: "bg-amber-50",
    bgGradient: "bg-gradient-to-br from-amber-50 to-orange-50",
    border: "border-amber-200",
    text: "text-amber-800",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    chart: "#f59e0b",
    hover: "hover:border-amber-300",
  },
  in_progress: {
    bg: "bg-yellow-50",
    bgGradient: "bg-gradient-to-br from-yellow-50 to-yellow-100",
    border: "border-yellow-200",
    text: "text-yellow-800",
    badge: "bg-yellow-100 text-yellow-800 border-yellow-300",
    chart: "#eab308",
    hover: "hover:border-yellow-300",
  },
  resolved: {
    bg: "bg-emerald-50",
    bgGradient: "bg-gradient-to-br from-emerald-50 to-teal-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
    chart: "#10b981",
    hover: "hover:border-emerald-300",
  },
} as const;

export const getStatusColors = (status: "pending" | "in_progress" | "resolved" | string) => {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || {
    bg: "bg-gray-50",
    bgGradient: "bg-gradient-to-br from-gray-50 to-gray-100",
    border: "border-gray-200",
    text: "text-gray-800",
    badge: "bg-gray-100 text-gray-800 border-gray-300",
    chart: "#9ca3af",
    hover: "hover:border-gray-300",
  };
};


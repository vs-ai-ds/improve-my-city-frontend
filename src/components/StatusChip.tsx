// File: src\components\StatusChip.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

export default function StatusChip({ status }: { status: "pending"|"in_progress"|"resolved" }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    resolved: "bg-green-100 text-green-800",
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status]}`}>{status.replace("_"," ")}</span>;
}
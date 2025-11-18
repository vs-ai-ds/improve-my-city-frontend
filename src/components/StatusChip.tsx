// File: src\components\StatusChip.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import { getStatusColors } from "../constants/statusColors";

export default function StatusChip({ status }: { status: "pending"|"in_progress"|"resolved" }) {
  const colors = getStatusColors(status);
  return <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors.badge}`}>{status.replace("_"," ")}</span>;
}
// File: src\components\IssueCard.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import type { Issue } from "../types/issue";
import StatusChip from "./StatusChip";
import { motion } from "framer-motion";

export default function IssueCard({ issue }: { issue: Issue }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-2xl border bg-white/90 backdrop-blur p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-[1px] hover:shadow-md"

    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{issue.title}</h3>
        <StatusChip status={issue.status} />
      </div>
      {issue.category && <p className="text-xs text-gray-500 mt-1">Category: {issue.category}</p>}
      {issue.description && <p className="mt-2 text-sm text-gray-700">{issue.description}</p>}
      {issue.lat && issue.lng && (
        <p className="mt-1 text-xs text-gray-500">Location: {issue.lat.toFixed(4)}, {issue.lng.toFixed(4)}</p>
      )}
      <p className="mt-2 text-xs text-gray-400">Created: {new Date(issue.created_at).toLocaleString()}</p>
    </motion.div>
  );
}
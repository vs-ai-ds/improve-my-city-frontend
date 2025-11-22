// src/utils/issueUtils.ts

export function formatIssueAge(createdAt: string, updatedAt?: string): string {
  const created = createdAt ? new Date(createdAt) : null;
  const updated = updatedAt ? new Date(updatedAt) : null;

  // Pick the most recent valid timestamp (updated if present, else created)
  const base = updated && !isNaN(updated.getTime())
    ? updated
    : created && !isNaN(created.getTime())
    ? created
    : null;

  if (!base) return "";

  const now = new Date();

  // Use absolute difference so even if server/client clocks differ
  const diffMs = Math.abs(now.getTime() - base.getTime());
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const totalMonths = Math.floor(totalDays / 30);   // rough but good enough
  const totalYears = Math.floor(totalDays / 365);   // rough but good enough

  if (totalMinutes < 60) {
    const minutes = Math.max(totalMinutes, 1); // never show 0 minutes
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }

  if (totalHours < 24) {
    return `${totalHours} hour${totalHours !== 1 ? "s" : ""} ago`;
  }

  if (totalDays < 30) {
    return `${totalDays} day${totalDays !== 1 ? "s" : ""} ago`;
  }

  if (totalDays < 365) {
    const months = Math.max(totalMonths, 1);
    return `${months} month${months !== 1 ? "s" : ""} ago`;
  }

  const years = Math.max(totalYears, 1);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

export function formatStalledTime(updatedAt: string | null, createdAt: string): string {
  const created = createdAt ? new Date(createdAt) : null;
  if (!created || isNaN(created.getTime())) return "";

  const reference = updatedAt ? new Date(updatedAt) : created;
  if (isNaN(reference.getTime())) return "";

  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - reference.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (!updatedAt) {
    // Never updated
    return diffDays > 0
      ? `Stalled • ${diffDays} day${diffDays !== 1 ? "s" : ""} no update`
      : "";
  }

  // Updated before, but stale
  return diffDays > 3
    ? `Stalled • ${diffDays} day${diffDays !== 1 ? "s" : ""} no update`
    : "";
}

export function formatResolutionTime(
  createdAt: string,
  resolvedAt: string | null
): string {
  if (!resolvedAt) return "";

  const created = createdAt ? new Date(createdAt) : null;
  const resolved = resolvedAt ? new Date(resolvedAt) : null;

  if (!created || isNaN(created.getTime()) || !resolved || isNaN(resolved.getTime())) {
    return "";
  }

  const diffMs = resolved.getTime() - created.getTime();
  if (diffMs < 0) return ""; // ignore weird data

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );

  if (diffDays > 0) {
    return `Resolved in ${diffDays} day${diffDays !== 1 ? "s" : ""} ${diffHours} hr${
      diffHours !== 1 ? "s" : ""
    }`;
  }

  return `Resolved in ${diffHours} hr${diffHours !== 1 ? "s" : ""}`;
}

export function isOverdue(createdAt: string, slaHours: number = 48): boolean {
  const created = createdAt ? new Date(createdAt) : null;
  if (!created || isNaN(created.getTime())) return false;

  const now = new Date();
  const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  return diffHours > slaHours;
}

export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return "";
          if (typeof value === "object") return JSON.stringify(value);
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
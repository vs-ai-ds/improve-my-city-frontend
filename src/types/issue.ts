// File: src\types\issue.ts
// Project: improve-my-city-frontend
// Auto-added for reference

export type Issue = {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  status: "pending" | "in_progress" | "resolved";
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  created_at: string;
};

export type IssueCreate = Pick<Issue, "title" | "description" | "category" | "lat" | "lng" | "address">;
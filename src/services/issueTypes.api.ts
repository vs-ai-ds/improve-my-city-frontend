// File: src/services/issueTypes.api.ts
import { api } from "./apiClient";
export async function listPublicIssueTypes() {
  const { data } = await api.get("/issue-types"); // <-- NOT /admin/issue-types
  return data;
}

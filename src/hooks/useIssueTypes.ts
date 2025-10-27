// File: src/hooks/useIssueTypes.ts
import { useQuery } from "@tanstack/react-query";
import { listPublicIssueTypes } from "../services/issueTypes.api";

export function useIssueTypes() {
  return useQuery({
    queryKey: ["issue-types:public"],
    queryFn: listPublicIssueTypes,
    staleTime: 300 * 60 * 1000,       // 300 min
    refetchOnWindowFocus: false,
  });
}
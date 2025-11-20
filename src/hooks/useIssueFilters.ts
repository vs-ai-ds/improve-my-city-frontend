import { useState, useCallback } from "react";

export type IssueStatusFilter = "all" | "pending" | "in_progress" | "resolved";
export type DateRangeFilter = "7d" | "30d" | "90d" | "all_time";
export type RangeKey = "today" | "7d" | "15d" | "30d" | "all";

export interface IssueFilters {
  status: IssueStatusFilter;
  dateRange: DateRangeFilter;
  categoryId: string;
  regionId: string;
  myIssuesOnly: boolean;
  search: string;
  page: number;
  pageSize: number;
}

const DEFAULT_FILTERS: IssueFilters = {
  status: "all",
  dateRange: "30d",
  categoryId: "all",
  regionId: "all",
  myIssuesOnly: false,
  search: "",
  page: 1,
  pageSize: 12,
};

export function useIssueFilters() {
  const [filters, setFilters] = useState<IssueFilters>(DEFAULT_FILTERS);

  const updateFilter = useCallback(<K extends keyof IssueFilters>(
    key: K,
    value: IssueFilters[K]
  ) => {
    setFilters((prev) => {
      const updated = { ...prev, [key]: value };
      if (key !== "page") {
        updated.page = 1;
      }
      return updated;
    });
  }, []);

  const setStatus = useCallback((status: IssueStatusFilter) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status === status ? "all" : status,
      page: 1,
    }));
  }, []);

  const setCategoryId = useCallback((categoryId: string) => {
    setFilters((prev) => ({
      ...prev,
      categoryId: prev.categoryId === categoryId ? "all" : categoryId,
      page: 1,
    }));
  }, []);

  const setRegionId = useCallback((regionId: string) => {
    setFilters((prev) => ({
      ...prev,
      regionId: prev.regionId === regionId ? "all" : regionId,
      page: 1,
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const clearFilter = useCallback((key: keyof IssueFilters) => {
    setFilters((prev) => ({
      ...prev,
      [key]: DEFAULT_FILTERS[key],
      page: 1,
    }));
  }, []);

  const convertDateRangeToRangeKey = useCallback((dateRange: DateRangeFilter): RangeKey => {
    if (dateRange === "7d") return "7d";
    if (dateRange === "30d") return "30d";
    if (dateRange === "90d") return "all";
    if (dateRange === "all_time") return "all";
    return "30d";
  }, []);

  return {
    filters,
    updateFilter,
    setStatus,
    setCategoryId,
    setRegionId,
    clearAllFilters,
    clearFilter,
    convertDateRangeToRangeKey,
  };
}


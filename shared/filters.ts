export type CommunityFilters = {
  codes: string[];
  labels?: string[];
  category: string;
  status: string;
  order?: "newest" | "oldest";
};
export const emptyFilters: CommunityFilters = {
  codes: [],
  labels: [],
  category: "",
  status: "",
};
export function filterCount(value: CommunityFilters) {
  return (
    Number(value.codes.some(Boolean)) +
    Number(!!value.category) +
    Number(!!value.status)
  );
}
export function chooseRegion(
  value: CommunityFilters,
  level: number,
  code: string,
  name: string,
): CommunityFilters {
  return {
    ...value,
    codes: [...value.codes.slice(0, level), ...(code ? [code] : [])],
    labels: [...(value.labels || []).slice(0, level), ...(code ? [name] : [])],
  };
}
export function filterQuery(value: CommunityFilters) {
  const params = new URLSearchParams();
  const code = value.codes.filter(Boolean).at(-1);
  if (code) params.set("region_code", code);
  if (value.category) params.set("category", value.category);
  if (value.status) params.set("status", value.status);
  if (value.order === "oldest") params.set("order", "oldest");
  return params.toString();
}

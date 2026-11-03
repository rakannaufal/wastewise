import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseRegion,
  emptyFilters,
  filterCount,
  filterQuery,
} from "./filters.ts";
test("unfiltered community requests omit status; each explicit status round-trips", () => {
  assert.equal(filterQuery(emptyFilters), "");
  for (const status of ["Pending", "In Progress", "Completed", "Rejected"]) {
    assert.equal(
      new URLSearchParams(filterQuery({ ...emptyFilters, status })).get(
        "status",
      ),
      status,
    );
  }
});
test("changing a parent clears its descendants and keeps category/status", () => {
  const previous = {
    codes: ["31", "31.71", "31.71.01", "31.71.01.1001"],
    labels: ["DKI", "Jakarta", "Gambir", "Gambir"],
    category: "paper",
    status: "Rejected",
  };
  const next = chooseRegion(previous, 1, "31.72", "Jakarta Utara");
  assert.deepEqual(next.codes, ["31", "31.72"]);
  assert.deepEqual(next.labels, ["DKI", "Jakarta Utara"]);
  assert.equal(next.category, "paper");
  assert.equal(next.status, "Rejected");
  assert.equal(filterCount(next), 3);
  assert.equal(
    new URLSearchParams(filterQuery(next)).get("region_code"),
    "31.72",
  );
  assert.deepEqual(chooseRegion(next, 0, "", "").codes, []);
  assert.equal(filterCount(emptyFilters), 0);
  assert.deepEqual(previous.codes, [
    "31",
    "31.71",
    "31.71.01",
    "31.71.01.1001",
  ]);
});

test("oldest order survives region changes and is sent to the API", () => {
  const value = { ...emptyFilters, order: "oldest" as const };
  assert.equal(new URLSearchParams(filterQuery(value)).get("order"), "oldest");
  assert.equal(chooseRegion(value, 0, "31", "Jakarta").order, "oldest");
  assert.equal(filterQuery({ ...emptyFilters, order: "newest" }), "");
});

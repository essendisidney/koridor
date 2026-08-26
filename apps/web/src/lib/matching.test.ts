import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateMatches,
  evaluateMatch,
  passesHardFilters,
} from "./matching";

function req(overrides: Record<string, unknown> = {}) {
  return {
    commodity: "Hass Avocado",
    quantity: 2000,
    certifications: ["GlobalG.A.P."],
    grade: "A",
    deliveryStart: new Date("2027-01-01"),
    deliveryEnd: new Date("2027-06-30"),
    originPreference: "KE",
    ...overrides,
  };
}

function cand(overrides: Record<string, unknown> = {}) {
  return {
    supplierOrgId: "sup-1",
    supplyLotId: "lot-1",
    commodity: "Hass Avocado",
    certifications: ["GlobalG.A.P.", "Organic"],
    availableQty: 700,
    grade: "A",
    harvestStart: new Date("2026-11-01"),
    harvestEnd: new Date("2027-02-28"),
    originCountry: "KE",
    trustScore: 94,
    exportEligible: true,
    ...overrides,
  };
}

describe("matching hard filters", () => {
  it("passes a full match", () => {
    const result = evaluateMatch(req(), cand());
    assert.ok(result);
    assert.ok(result.score >= 40);
    assert.equal(result.quantityMatched, 700);
  });

  it("rejects missing certifications", () => {
    const hard = passesHardFilters(req(), cand({ certifications: [] }));
    assert.equal(hard.pass, false);
    assert.ok(hard.failures.some((f) => f.includes("GlobalG.A.P.")));
    assert.equal(evaluateMatch(req(), cand({ certifications: [] })), null);
  });

  it("allows partial quantity matches", () => {
    const partial = evaluateMatch(req(), cand({ availableQty: 500 }));
    assert.ok(partial);
    assert.equal(partial.quantityMatched, 500);
    const agg = aggregateMatches([partial!], 2000);
    assert.equal(agg.matchedQuantity, 500);
    assert.equal(agg.fullyMatched, false);
  });

  it("rejects delivery window mismatches", () => {
    const hard = passesHardFilters(
      req(),
      cand({
        harvestStart: new Date("2027-08-01"),
        harvestEnd: new Date("2027-10-31"),
      }),
    );
    assert.equal(hard.pass, false);
    assert.ok(hard.failures.some((f) => f.includes("Delivery window")));
  });

  it("aggregates multiple partial lots to full coverage", () => {
    const lots = [
      evaluateMatch(req(), cand({ supplierOrgId: "a", availableQty: 700 })),
      evaluateMatch(req(), cand({ supplierOrgId: "b", availableQty: 500 })),
      evaluateMatch(req(), cand({ supplierOrgId: "c", availableQty: 400 })),
      evaluateMatch(req(), cand({ supplierOrgId: "d", availableQty: 400 })),
    ].filter((m): m is NonNullable<typeof m> => m !== null);
    const agg = aggregateMatches(lots, 2000);
    assert.equal(agg.fullyMatched, true);
    assert.equal(agg.matchedQuantity, 2000);
  });
});

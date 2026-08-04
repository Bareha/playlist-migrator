import { describe, expect, it } from "vitest";
import { estimateYoutubeQuotaUnits } from "./quota";

describe("estimateYoutubeQuotaUnits", () => {
  it("accounts for playlist creation, search, and insert costs", () => {
    expect(estimateYoutubeQuotaUnits(0)).toBe(50);
    expect(estimateYoutubeQuotaUnits(1)).toBe(200);
    expect(estimateYoutubeQuotaUnits(100)).toBe(15050);
  });
});

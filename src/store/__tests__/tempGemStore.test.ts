import { describe, expect, it } from "vitest";
import {
  createEmptyGemSelection,
  hasPendingGemSelection,
} from "../tempGemStore";

describe("hasPendingGemSelection", () => {
  it("is false when no gems are staged", () => {
    expect(hasPendingGemSelection(createEmptyGemSelection())).toBe(false);
  });

  it("is true once any gem is staged for this turn", () => {
    expect(
      hasPendingGemSelection({ ...createEmptyGemSelection(), ruby: 1 }),
    ).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { deriveKeywords, planCommand } from "./index.js";
describe("runner", () => {
  it("derives keywords", () => expect(deriveKeywords("toggleFormat bold / italic")).toEqual(["toggleformat", "bold", "italic"]));
  it("plans JS app analysis for directories", () => expect(planCommand(".")[0]).toBe("analyze-javascript-application"));
  it("rejects unsupported targets", () => expect(() => planCommand("/nope.bin")).toThrow(/unsupported/));
});

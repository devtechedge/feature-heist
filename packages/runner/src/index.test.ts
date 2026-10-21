import { describe, it, expect } from "vitest";
import { deriveKeywords, planCommand } from "./index.js";
describe("runner", () => {
  it("derives keywords", () => expect(deriveKeywords("toggleFormat bold / italic")).toEqual(["toggleformat", "bold", "italic"]));
  it("plans JS app analysis for directories", () => expect(planCommand(".")[0]).toBe("analyze-javascript-application"));
  it("plans per target type", () => {
    expect(planCommand("/x/a.har").slice(0, 3)).toEqual(["inspect-web-network-capture", "/x/a.har", "har"]);
    expect(planCommand("/x/weth.hex").slice(0, 3)).toEqual(["inspect-evm-interface", "/x/weth.hex", "hex"]);
    expect(planCommand("/x/Lib.dll")[0]).toBe("inspect-managed-members");
  });
  it("rejects unsupported targets", () => expect(() => planCommand("/nope.png")).toThrow(/unsupported/));
});

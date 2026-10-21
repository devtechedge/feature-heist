import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { load } from "@heist/evidence";
import { ABI, selector, argTypes } from "../src/index.js";

const dir = fileURLToPath(new URL("../../../../evidence/weth9-hex-weth9-wrap-unwrap-token", import.meta.url));

describe.runIf(existsSync(dir))("REA evidence backing this rebuild", () => {
  const { record } = load(dir);
  const fns = (record.raw_result as any).functions as { selector: string; arguments: string; stateMutability: string }[];
  it("came from REA's EVM interface inspection", () => expect(record.operation).toBe("inspect_evm_interface"));
  it("the rebuild implements exactly the interface REA recovered (selector, args, mutability)", () => {
    const mine = ABI.map((f) => ({ selector: selector(f.signature), arguments: argTypes(f.signature), stateMutability: f.mutability }));
    const sort = (x: { selector: string }[]) => [...x].sort((a, b) => a.selector.localeCompare(b.selector));
    expect(sort(mine)).toEqual(sort(fns.map(({ selector, arguments: a, stateMutability }) => ({ selector, arguments: a, stateMutability }))));
  });
  it("the fixture bytecode is the artifact REA analysed", () => {
    const sha = createHash("sha256").update(readFileSync(new URL("../fixtures/weth9.hex", import.meta.url))).digest("hex");
    expect(sha).toBe(record.subject.digest.sha256);
  });
});

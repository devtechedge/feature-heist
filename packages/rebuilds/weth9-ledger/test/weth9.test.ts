import { describe, it, expect } from "vitest";
import { Weth9, ABI, selector, argTypes, encodeCall, MAX_UINT } from "../src/index.js";
import { makeOriginal } from "./evm-harness.js";

const A = 0xaaaan, B = 0xbbbbn, C = 0xccccn;

describe("rebuild: behaviour", () => {
  it("wraps and unwraps", () => {
    const w = new Weth9();
    w.call(A, encodeCall("deposit()"), 5n);
    expect(BigInt("0x" + w.call(A, encodeCall("balanceOf(address)", [A])).returnData)).toBe(5n);
    expect(w.call(A, encodeCall("withdraw(uint256)", [6n])).reverted).toBe(true);
    expect(w.call(A, encodeCall("withdraw(uint256)", [5n])).ethOut).toEqual({ to: A, amount: 5n });
    expect(w.ethBalance).toBe(0n);
  });
  it("unknown selector and empty calldata fall back to deposit", () => {
    const w = new Weth9();
    w.call(A, "", 3n); w.call(A, "deadbeef", 4n);
    expect(w.balanceOf.get(A)).toBe(7n);
  });
  it("max allowance is never decremented", () => {
    const w = new Weth9();
    w.call(A, "", 10n); w.call(A, encodeCall("approve(address,uint256)", [B, MAX_UINT]));
    w.call(B, encodeCall("transferFrom(address,address,uint256)", [A, C, 4n]));
    expect(w.allowance.get(`${A}:${B}`)).toBe(MAX_UINT);
    expect(w.balanceOf.get(C)).toBe(4n);
  });
  it("non-payable functions reject ETH", () => expect(new Weth9().call(A, encodeCall("approve(address,uint256)", [B, 1n]), 1n).reverted).toBe(true));
});

// Deterministic PRNG.
function rng(seed: number) { return () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32); }

describe("differential parity with the original mainnet bytecode", () => {
  it("matches return data, reverts, event counts and ETH held over 1,500 random calls", async () => {
    const users = [A, B, C];
    const orig = await makeOriginal(users);
    const mine = new Weth9();
    const r = rng(7);
    const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
    const amt = () => pick([0n, 1n, 2n, 5n, 10n, 100n, MAX_UINT, BigInt(Math.floor(r() * 50))]);
    for (let i = 0; i < 1500; i++) {
      const sender = pick(users);
      const f = pick([...ABI, { signature: "fallback", mutability: "payable" as const }]);
      let data: string;
      if (f.signature === "fallback") data = pick(["", "12", "deadbeef"]);
      else data = selector(f.signature) + argTypes(f.signature).split(",").filter(Boolean)
        .map((t) => (t === "address" ? pick(users) : amt() === MAX_UINT ? MAX_UINT : BigInt(Math.floor(r() * 40))).toString(16).padStart(64, "0")).join("");
      const value = r() < 0.25 ? BigInt(Math.floor(r() * 20)) : 0n;
      const want = await orig.call(sender, data, value);
      const got = mine.call(sender, data, value);
      expect({ i, data, reverted: got.reverted, ret: got.returnData, logs: got.logs.length })
        .toEqual({ i, data, reverted: want.reverted, ret: want.returnData, logs: want.logCount });
    }
    expect(mine.ethBalance).toBe(await orig.ethBalance());
  }, 60_000);
});

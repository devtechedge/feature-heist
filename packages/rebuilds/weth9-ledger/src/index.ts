/**
 * WETH9 rebuilt from bytecode evidence.
 *
 * REA's `inspect-evm-interface` recovered 11 ABI functions (selector, argument types, mutability)
 * from mainnet WETH9 runtime bytecode. This module is a pure TypeScript ledger with the same
 * ABI surface and the behaviour checked against the original bytecode in an EVM (see tests).
 */
import { keccak_256 } from "@noble/hashes/sha3";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";

export const MAX_UINT = (1n << 256n) - 1n;
const ADDR_MASK = (1n << 160n) - 1n;

export interface AbiFunction { signature: string; mutability: "view" | "nonpayable" | "payable" }
/** The interface, written from REA's recovered argument lists and mutabilities. */
export const ABI: AbiFunction[] = [
  { signature: "name()", mutability: "view" },
  { signature: "approve(address,uint256)", mutability: "nonpayable" },
  { signature: "totalSupply()", mutability: "view" },
  { signature: "transferFrom(address,address,uint256)", mutability: "nonpayable" },
  { signature: "withdraw(uint256)", mutability: "nonpayable" },
  { signature: "decimals()", mutability: "view" },
  { signature: "balanceOf(address)", mutability: "view" },
  { signature: "symbol()", mutability: "view" },
  { signature: "transfer(address,uint256)", mutability: "nonpayable" },
  { signature: "deposit()", mutability: "payable" },
  { signature: "allowance(address,address)", mutability: "view" },
];

export const selector = (sig: string) => bytesToHex(keccak_256(utf8ToBytes(sig))).slice(0, 8);
export const argTypes = (sig: string) => sig.slice(sig.indexOf("(") + 1, -1);

export type Hex = string; // no 0x prefix internally
export interface Result { reverted: boolean; returnData: Hex; logs: Log[]; ethOut?: { to: bigint; amount: bigint } }
export interface Log { event: "Deposit" | "Withdrawal" | "Approval" | "Transfer"; args: bigint[] }

const word = (n: bigint) => n.toString(16).padStart(64, "0");
const encString = (s: string) => {
  const b = bytesToHex(utf8ToBytes(s));
  return word(32n) + word(BigInt(s.length)) + b.padEnd(Math.ceil(b.length / 64) * 64, "0");
};
const REVERT: Result = { reverted: true, returnData: "", logs: [] };

export class Weth9 {
  readonly balanceOf = new Map<bigint, bigint>();
  readonly allowance = new Map<string, bigint>();
  /** ETH held by the contract; WETH9 reports this as totalSupply. */
  ethBalance = 0n;

  private bal(a: bigint) { return this.balanceOf.get(a) ?? 0n; }
  private alw(o: bigint, s: bigint) { return this.allowance.get(`${o}:${s}`) ?? 0n; }

  /** Execute one call. `data` is hex calldata without 0x. */
  call(sender: bigint, data: Hex, value = 0n): Result {
    const sel = data.length >= 8 ? data.slice(0, 8) : null;
    // calldataload past the end reads zero bytes (Solidity 0.4 does not length-check).
    const arg = (i: number) => BigInt("0x" + (data.slice(8 + i * 64, 8 + (i + 1) * 64).padEnd(64, "0") || "0"));
    const fn = sel ? ABI.find((f) => selector(f.signature) === sel) : undefined;
    if (!fn) return this.deposit(sender, value); // fallback is payable deposit()
    if (fn.mutability !== "payable" && value !== 0n) return REVERT;
    switch (fn.signature) {
      case "name()": return ok(encString("Wrapped Ether"));
      case "symbol()": return ok(encString("WETH"));
      case "decimals()": return ok(word(18n));
      case "totalSupply()": return ok(word(this.ethBalance));
      case "balanceOf(address)": return ok(word(this.bal(arg(0) & ADDR_MASK)));
      case "allowance(address,address)": return ok(word(this.alw(arg(0) & ADDR_MASK, arg(1) & ADDR_MASK)));
      case "deposit()": return this.deposit(sender, value);
      case "withdraw(uint256)": {
        const wad = arg(0);
        if (this.bal(sender) < wad) return REVERT;
        this.balanceOf.set(sender, this.bal(sender) - wad);
        this.ethBalance -= wad;
        return { reverted: false, returnData: "", logs: [{ event: "Withdrawal", args: [sender, wad] }], ethOut: { to: sender, amount: wad } };
      }
      case "approve(address,uint256)": {
        const guy = arg(0) & ADDR_MASK, wad = arg(1);
        this.allowance.set(`${sender}:${guy}`, wad);
        return { reverted: false, returnData: word(1n), logs: [{ event: "Approval", args: [sender, guy, wad] }] };
      }
      case "transfer(address,uint256)": return this.transferFrom(sender, sender, arg(0) & ADDR_MASK, arg(1));
      case "transferFrom(address,address,uint256)": return this.transferFrom(sender, arg(0) & ADDR_MASK, arg(1) & ADDR_MASK, arg(2));
    }
    return REVERT;
  }

  private deposit(sender: bigint, value: bigint): Result {
    this.balanceOf.set(sender, this.bal(sender) + value);
    this.ethBalance += value;
    return { reverted: false, returnData: "", logs: [{ event: "Deposit", args: [sender, value] }] };
  }

  private transferFrom(sender: bigint, src: bigint, dst: bigint, wad: bigint): Result {
    if (this.bal(src) < wad) return REVERT;
    if (src !== sender && this.alw(src, sender) !== MAX_UINT) {
      if (this.alw(src, sender) < wad) return REVERT;
      this.allowance.set(`${src}:${sender}`, this.alw(src, sender) - wad);
    }
    this.balanceOf.set(src, this.bal(src) - wad);
    this.balanceOf.set(dst, this.bal(dst) + wad); // read after the debit: self-transfer is a no-op
    return { reverted: false, returnData: word(1n), logs: [{ event: "Transfer", args: [src, dst, wad] }] };
  }
}

function ok(returnData: Hex): Result { return { reverted: false, returnData, logs: [] }; }

/** ABI-encode a call for convenience in apps/tests. */
export function encodeCall(sig: string, args: bigint[] = []): Hex {
  return selector(sig) + args.map(word).join("");
}

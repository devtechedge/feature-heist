/** Executes the ORIGINAL WETH9 runtime bytecode (from mainnet) in @ethereumjs/evm. */
import { readFileSync } from "node:fs";
import { EVM } from "@ethereumjs/evm";
import { Address, Account, hexToBytes, bytesToHex } from "@ethereumjs/util";

const CODE = hexToBytes(readFileSync(new URL("../fixtures/weth9.hex", import.meta.url), "utf8").trim() as `0x${string}`);
export const WETH = Address.fromString("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
export const addr = (n: bigint) => new Address(hexToBytes(("0x" + n.toString(16).padStart(40, "0")) as `0x${string}`));

export async function makeOriginal(funded: bigint[]) {
  const evm = await EVM.create();
  await evm.stateManager.putAccount(WETH, new Account());
  await evm.stateManager.putContractCode(WETH, CODE);
  // Runtime code alone has no constructor-initialised storage. Seed WETH9's state-variable
  // initialisers exactly as mainnet storage holds them (Solidity short-string layout).
  const short = (s: string) => { const b = Buffer.alloc(32); b.write(s); b[31] = s.length * 2; return new Uint8Array(b); };
  const slot = (n: number) => { const b = new Uint8Array(32); b[31] = n; return b; };
  await evm.stateManager.putContractStorage(WETH, slot(0), short("Wrapped Ether"));
  await evm.stateManager.putContractStorage(WETH, slot(1), short("WETH"));
  await evm.stateManager.putContractStorage(WETH, slot(2), slot(18));
  for (const a of funded) await evm.stateManager.putAccount(addr(a), Account.fromAccountData({ balance: 10n ** 30n }));
  return {
    async call(sender: bigint, data: string, value = 0n) {
      const r = await evm.runCall({ caller: addr(sender), to: WETH, data: hexToBytes(("0x" + data) as `0x${string}`), value, gasLimit: 1_000_000n });
      const ex = r.execResult;
      return { reverted: !!ex.exceptionError, returnData: ex.exceptionError ? "" : bytesToHex(ex.returnValue).slice(2), logCount: ex.logs?.length ?? 0 };
    },
    async ethBalance() { return (await evm.stateManager.getAccount(WETH))!.balance; },
  };
}

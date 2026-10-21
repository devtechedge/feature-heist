# WETH9 ledger (EVM bytecode)

**Target:** WETH9 runtime bytecode at `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`, fetched with `eth_getCode`. The source is GPL-3.0; here the bytecode is analysed for interoperability.
**Question:** can we rebuild the token's behaviour from bytecode alone?

## 1. Inspect
```bash
heist targets/weth9/weth9.hex "weth9 wrap unwrap token" --keywords '*'
```
REA's `inspect-evm-interface` (evmole 0.9.3 adapter) recovered 11 functions, each with selector, bytecode offset, argument list and state mutability, plus the `bzzr0` CBOR metadata.

## 2. Rebuild
`packages/rebuilds/weth9-ledger`: `new Weth9().call(sender, calldataHex, value)` returns `{reverted, returnData, logs, ethOut}`. Function signatures were matched by keccak against the recovered selectors.

## 3. Proof
- `evidence.test.ts`: the rebuild's ABI, as (selector, args, mutability), equals REA's recovered list.
- `weth9.test.ts`: the original bytecode runs in `@ethereumjs/evm` alongside the rebuild for 1,500 seeded random calls, including fallback calldata, ETH sent to non-payable functions, max allowances and insufficient balances. Revert flag, return bytes and event count match on every call, and total ETH held matches at the end.
- Storage initialisers (`name`, `symbol`, `decimals`) aren't in runtime code. The harness seeds slots 0–2 with the exact words `eth_getStorageAt` returns on mainnet (`0x5772…1a`, `0x5745…08`, `0x…12`).

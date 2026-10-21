# Third-party material

Feature Heist's own code is MIT (see `LICENSE`). These files are third-party artifacts, kept as analysis targets and test oracles. They keep their own terms:

| Path | Origin | License |
|---|---|---|
| `packages/rebuilds/markdown-toggle-format/fixtures/original/format.js` | [electron-markdownify](https://github.com/amitmerchant1990/electron-markdownify) @ `13cb55c` | MIT, © 2020 Amit Merchant (`fixtures/original/LICENSE`) |
| `packages/rebuilds/english-number-words/fixtures/Humanizer.dll` | [Humanizer.Core 2.14.1](https://www.nuget.org/packages/Humanizer.Core/2.14.1) | MIT, © .NET Foundation and Contributors (`fixtures/HUMANIZER-LICENSE`) |
| `packages/rebuilds/weth9-ledger/fixtures/weth9.hex` | Public Ethereum mainnet state, `eth_getCode` of `0xC02a…6Cc2` | WETH9 source is GPL-3.0. Only the deployed bytecode is used, as an interoperability test oracle; no GPL source is included. |
| `packages/rebuilds/npm-search-client/fixtures/npm-search.redacted.har` | Responses from the public npm registry search API | Package metadata belongs to its publishers; e-mail addresses are redacted |
| `evidence/*/record.json.gz` | Output of [REA](https://github.com/morluto/rea) (MIT) over the targets above | Derived analysis data |
| `packages/rebuilds/native-pan-crc/target/*` | Written for this repo | MIT, same as the rest of Feature Heist |

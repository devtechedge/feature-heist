/** Curated metadata per rebuilt feature. Evidence numbers are read from /evidence at build time. */
export interface FeatureMeta {
  slug: string; title: string; tagline: string; targetType: string; target: string; targetLicense: string;
  targetUrl: string; reaCommand: string; rebuildPackage: string; oracle: string; demo: "toggle" | "weth" | "npm" | "words";
}
export const FEATURES: FeatureMeta[] = [
  { slug: "electron-markdownify-bold-italic-strikethrough-toggle", title: "Markdown format toggle", tagline: "Ctrl+B / Ctrl+I / Ctrl+/ from an Electron Markdown editor",
    targetType: "Electron app (JavaScript)", target: "amitmerchant1990/electron-markdownify @ 13cb55c", targetLicense: "MIT",
    targetUrl: "https://github.com/amitmerchant1990/electron-markdownify", reaCommand: "rea analyze-javascript-application <app> --json",
    rebuildPackage: "packages/rebuilds/markdown-toggle-format", oracle: "Original format.js executed in a Node VM against a CodeMirror stand-in; 5,000 random cases", demo: "toggle" },
  { slug: "weth9-hex-weth9-wrap-unwrap-token", title: "WETH9 ledger", tagline: "Wrapped Ether rebuilt from mainnet bytecode alone",
    targetType: "EVM bytecode", target: "WETH9 at 0xC02a…6Cc2 (Ethereum mainnet)", targetLicense: "GPL-3.0 (source); bytecode analysed for interoperability",
    targetUrl: "https://etherscan.io/address/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", reaCommand: "rea inspect-evm-interface weth9.hex hex",
    rebuildPackage: "packages/rebuilds/weth9-ledger", oracle: "Original bytecode in @ethereumjs/evm; 1,500 random calls", demo: "weth" },
  { slug: "npm-search-redacted-har-npm-registry-search-client", title: "npm search client", tagline: "Registry search grammar and paging from a recorded HAR",
    targetType: "Web traffic (HAR)", target: "registry.npmjs.org /-/v1/search", targetLicense: "Public documented API",
    targetUrl: "https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md", reaCommand: "rea inspect-web-network-capture capture.har har",
    rebuildPackage: "packages/rebuilds/npm-search-client", oracle: "Byte-exact URL round-trips and HAR replay of recorded responses", demo: "npm" },
  { slug: "humanizer-dll-english-number-to-words", title: "English number words", tagline: "Humanizer's ToWords / ToOrdinalWords / ToTuple from IL metadata",
    targetType: ".NET assembly", target: "Humanizer.Core 2.14.1 (netstandard2.0)", targetLicense: "MIT",
    targetUrl: "https://github.com/Humanizr/Humanizer", reaCommand: "rea inspect-managed-members Humanizer.dll --type …EnglishNumberToWordsConverter",
    rebuildPackage: "packages/rebuilds/english-number-words", oracle: "4,830 golden rows emitted by the original library via tools/humanizer-oracle", demo: "words" },
];

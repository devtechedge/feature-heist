# English number words (.NET)

**Target:** `Humanizer.dll` from Humanizer.Core 2.14.1 (netstandard2.0, MIT).

## 1. Inspect
```bash
heist Humanizer.dll "english number to words" --keywords EnglishNumberToWords \
  --rea-args "--type Humanizer.Localisation.NumberToWords.EnglishNumberToWordsConverter"
```
REA's `inspect-managed-members` read the PE/CLI metadata without loading the assembly. It returned 10 methods with decoded signatures, 3 static fields (`UnitsMap`, `TensMap`, `OrdinalExceptions`), 61 call edges, 7 field accesses and every `ldstr` literal.

## 2. Rebuild
`packages/rebuilds/english-number-words` exports `toWords(n, {addAnd})`, `toOrdinalWords(n)` and `toTuple(n)`, using `bigint` for the Int64 range.

## 3. Proof
- `tools/humanizer-oracle` (C#) runs the real library and writes 4,830 golden rows (cardinals with and without "and", ordinals, tuples), covering edge values up to `long.MaxValue`. Every row matches. CI regenerates the rows and diffs them.
- A vocabulary test checks that every word the rebuild can emit for 0–1199 is an `ldstr` literal REA recovered, or is built from one (`th`, `ieth`, scale formats).
- Quirks preserved:
  - `addAnd:false` only affects the last group, because the recursion uses default arguments (visible in the call edges).
  - Negative ordinals are cardinal.
  - A leading `one` is dropped from ordinals.

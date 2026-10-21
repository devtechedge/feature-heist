# Native pan and CRC-16 (ELF, Ghidra)

**Target:** `pancrc`, a small C program written for this repo (MIT) and compiled with `gcc -O2 -fno-inline-functions` to an x86-64 ELF. The rebuild was written from REA's Ghidra output alone. The C source is kept only so the build can be reproduced.

## 1. Inspect
```bash
export GHIDRA_INSTALL_DIR=/path/to/ghidra_12.1.4_PUBLIC JAVA_HOME=/path/to/jdk-21
rea doctor --provider ghidra
heist pancrc "native" --procedure fh_pan   --keywords fh_pan
heist pancrc "native" --procedure fh_crc16 --keywords fh_crc16
```
For each function, `rea function … --provider ghidra` returned:
- body ranges and the caller (`main`), with incoming references
- 25 to 30 decoded instructions
- Ghidra 12.1.4 pseudocode

The slice keeps this as a native dossier, and the site shows it.

## 2. What the evidence showed
- `fh_pan`:
  - `iVar3 = param_1 * 2 - param_2` with a rounding term `param_2 >> 1` or `-(param_2 / 2)`.
  - `(long)(iVar3 * 0x7f + iVar4) / (long)param_2`.
  - The dead zone is the unsigned compare `(int)uVar1 + 7U < 0xf`.
- `fh_crc16`:
  - Starts at `0xffffffff` and XORs each byte in at `<< 8`.
  - 8 shift steps, XORing in `0x1021` when the `(short)` sign bit is set.
  - Truncation to 16 bits happens at the call site, not in the function.

## 3. Rebuild
`packages/rebuilds/native-pan-crc` exports `pan(x, width)` and `crc16(bytes | string)`. Machine semantics are kept:
- `Math.imul` for the 32-bit multiply
- C truncating division
- the unsigned dead-zone compare
- an explicit 16-bit mask

## 4. Proof
The compiled ELF is the oracle. Its `batch` mode answers one request per line.
- **Pan:** 20,000 seeded cases, 20% of them with widths and positions near the 32-bit limits where `centered * 127` overflows. All match.
- **CRC:** 5,000 random ASCII strings. All match.
- **Evidence:** the evidence tests check that both dossiers come from the Ghidra provider and the committed binary's SHA-256. They also check the pseudocode contains the constants the rebuild depends on (`0x7f`, `+ 7U`, `0x1021`).

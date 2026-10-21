# Feature spec: native

- Target: `packages/rebuilds/native-pan-crc/target/pancrc`
- REA 6.7.0, operation `analyze_function`, evidence `ev_059bae19c8ecf5fceac50efa042a1e4433bda4dcf7e31f4449fa647b0186d1ac`
- Record sha256: `68ae1861062e8d17af31635808d5f634b581e0f0486a3a69ce228ae1404edb89`

## Call chain (from REA semantic graph)
_none found; refine --keywords_

## Evidence hits
| kind | label | location |
|---|---|---|
| incoming_references |  | `pancrc:0-0` |
| outgoing_references |  | `pancrc:0-0` |
| incoming_references |  | `pancrc:1-1` |
| outgoing_references |  | `pancrc:1-1` |
| incoming_references |  | `pancrc:2-2` |
| outgoing_references |  | `pancrc:2-2` |
| incoming_references |  | `pancrc:3-3` |

## Native dossier: `fh_pan` @ 0x1013c0

Callers: main · 30 instructions

```c
ulong fh_pan(int param_1,int param_2)

{
  ulong uVar1;
  ulong uVar2;
  int iVar3;
  int iVar4;
  
  uVar2 = 0;
  if (0 < param_2) {
    if (param_1 < 0) {
      param_1 = 0;
    }
    if (param_2 < param_1) {
      param_1 = param_2;
    }
    iVar3 = param_1 * 2 - param_2;
    if (iVar3 < 0) {
      iVar4 = -(param_2 / 2);
    }
    else {
      iVar4 = param_2 >> 1;
    }
    uVar1 = (long)(iVar3 * 0x7f + iVar4) / (long)param_2;
    uVar2 = uVar1 & 0xffffffff;
    if ((int)uVar1 + 7U < 0xf) {
      uVar2 = 0;
    }
  }
  return uVar2;
}
```

## Behaviour (from the Ghidra pseudocode)
- `fh_pan(x, width)` returns 0 when `width <= 0`. Otherwise it clamps `x` to `[0, width]`.
- `centered = 2x - width`. The rounding term is `width >> 1`, or `-(width / 2)` when `centered` is negative.
- `pan = (centered * 0x7f + round) / width`. The multiply is in 32-bit int and the division is done in 64-bit (`(long)` casts), then the result is truncated to 32 bits.
- Dead zone: `(int)pan + 7U < 0xf`, an unsigned compare, maps -7..7 to 0.

## Unknowns
- The `centered * 127` overflow is undefined behaviour in C. The compiled code wraps (imul), and the rebuild copies that with `Math.imul`. Differential tests cover widths up to 2^31.

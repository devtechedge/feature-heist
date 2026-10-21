# Feature spec: native

- Target: `packages/rebuilds/native-pan-crc/target/pancrc`
- REA 6.7.0, operation `analyze_function`, evidence `ev_53aef167fa1fd427bde3cde0657f311bda3d2206403c4859bcf94e5c57468fa5`
- Record sha256: `0538d2fe719965170998c3baa6bc205a00c1855da38f79184611dd1f9d7c12ef`

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

## Native dossier: `fh_crc16` @ 0x101410

Callers: main · 25 instructions

```c
uint fh_crc16(byte *param_1,long param_2)

{
  byte *pbVar1;
  uint uVar2;
  short sVar3;
  uint uVar4;
  int iVar5;
  
  if (param_2 != 0) {
    pbVar1 = param_1 + param_2;
    uVar4 = 0xffffffff;
    do {
      uVar4 = uVar4 ^ (uint)*param_1 << 8;
      iVar5 = 8;
      do {
        uVar2 = uVar4 * 2;
        sVar3 = (short)uVar4;
        uVar4 = uVar2;
        if (sVar3 < 0) {
          uVar4 = uVar2 ^ 0x1021;
        }
        iVar5 = iVar5 + -1;
      } while (iVar5 != 0);
      param_1 = param_1 + 1;
    } while (pbVar1 != param_1);
    return uVar4;
  }
  return 0xffffffff;
}
```

## Behaviour (from the Ghidra pseudocode)
- `fh_crc16(buf, len)` starts at `0xffffffff` in a 32-bit register. Each byte is XORed in at `<< 8`, followed by 8 shift steps that XOR in `0x1021` when bit 15 (`(short)` sign) is set.
- The caller only uses the low 16 bits, so this is CRC-16/CCITT-FALSE: check value `0x29B1` for `123456789`.

## Unknowns
- Ghidra types the return as `uint`. The 16-bit truncation happens at the call site (`movzx`), so the rebuild masks to 16 bits explicitly.

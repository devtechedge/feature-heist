/**
 * Rebuilt from Ghidra pseudocode that REA returned for the compiled `pancrc` ELF
 * (`rea function pancrc fh_pan|fh_crc16 --provider ghidra`). Machine semantics are kept:
 * 32-bit wrapping multiply, C truncating division, unsigned dead-zone compare, 16-bit return.
 */

/** Stereo pan in [-127, 127] for position x on a screen of `width` (Ghidra: fh_pan @ 0x1013c0). */
export function pan(x: number, width: number): number {
  x |= 0; width |= 0;
  if (width <= 0) return 0;
  if (x < 0) x = 0;
  if (x > width) x = width;
  const centered = (Math.imul(x, 2) - width) | 0;          // iVar3 = param_1 * 2 - param_2
  const half = centered < 0 ? -((width / 2) | 0) : width >> 1; // iVar4
  const num = (Math.imul(centered, 0x7f) + half) | 0;      // 32-bit int arithmetic before the (long) cast
  const q = Math.trunc(num / width) | 0;                    // (long)num / (long)width, low 32 bits
  if ((q + 7) >>> 0 < 0xf) return 0;                        // (int)uVar1 + 7U < 0xf  => -7..7 is the dead zone
  return q;
}

/** CRC-16/CCITT-FALSE (Ghidra: fh_crc16 @ 0x101410). Poly 0x1021, init 0xFFFF, no reflection, no xorout. */
export function crc16(data: Uint8Array | string): number {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let crc = 0xffff;
  for (const b of bytes) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

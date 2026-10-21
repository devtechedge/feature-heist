/*
 * pancrc: a tiny native target for Feature Heist (MIT, (c) 2026 Devayan Mandal).
 * Two routines worth recovering from the binary alone:
 *   fh_pan(x, width)    stereo pan in [-127, 127] for a sprite at x on a screen of `width`,
 *                       with a dead zone in the centre and integer rounding.
 *   fh_crc16(buf, len)  CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF).
 * The CLI prints results so tests can drive the compiled binary as an oracle.
 */
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

__attribute__((noinline)) int fh_pan(int x, int width) {
  if (width <= 0) return 0;
  if (x < 0) x = 0;
  if (x > width) x = width;
  int centered = 2 * x - width;              /* -width .. width */
  int pan = (centered * 127 + (centered >= 0 ? width / 2 : -(width / 2))) / width;
  if (pan > -8 && pan < 8) return 0;          /* dead zone */
  return pan;
}

__attribute__((noinline)) uint16_t fh_crc16(const uint8_t *buf, size_t len) {
  uint16_t crc = 0xFFFF;
  for (size_t i = 0; i < len; i++) {
    crc ^= (uint16_t)buf[i] << 8;
    for (int b = 0; b < 8; b++) crc = (crc & 0x8000) ? (uint16_t)((crc << 1) ^ 0x1021) : (uint16_t)(crc << 1);
  }
  return crc;
}

int main(int argc, char **argv) {
  if (argc == 4 && strcmp(argv[1], "pan") == 0) { printf("%d\n", fh_pan(atoi(argv[2]), atoi(argv[3]))); return 0; }
  if (argc == 3 && strcmp(argv[1], "crc16") == 0) { printf("%u\n", fh_crc16((const uint8_t *)argv[2], strlen(argv[2]))); return 0; }
  if (argc == 2 && strcmp(argv[1], "batch") == 0) {
    /* stdin lines: "pan X W" or "crc16 TEXT" -> one result per line */
    char line[4096];
    while (fgets(line, sizeof line, stdin)) {
      line[strcspn(line, "\n")] = 0;
      int x, w;
      if (sscanf(line, "pan %d %d", &x, &w) == 2) printf("%d\n", fh_pan(x, w));
      else if (strncmp(line, "crc16 ", 6) == 0) printf("%u\n", fh_crc16((const uint8_t *)line + 6, strlen(line + 6)));
      else printf("?\n");
    }
    return 0;
  }
  fprintf(stderr, "usage: pancrc pan X WIDTH | crc16 TEXT | batch\n");
  return 2;
}

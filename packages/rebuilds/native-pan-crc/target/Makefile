# Reproducible-ish build of the native target (x86-64 Linux ELF, symbols kept for readable evidence).
CC ?= gcc
pancrc: pancrc.c
	$(CC) -O2 -fno-inline-functions -o $@ $<

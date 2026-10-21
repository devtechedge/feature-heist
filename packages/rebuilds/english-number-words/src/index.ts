/**
 * English number-to-words, rebuilt from REA's static metadata inspection of Humanizer.dll 2.14.1
 * (`rea inspect-managed-members --type Humanizer.Localisation.NumberToWords.EnglishNumberToWordsConverter`).
 *
 * Evidence used: the method list (Convert(i8,bool,bool), ConvertToOrdinal(i4), ConvertToTuple(i4),
 * GetUnitValue, RemoveOnePrefix, ExceptionNumbersToWords), the call edges (Convert recurses into
 * Convert with default arguments), and every ldstr literal (unit/tens words, scale formats, "and",
 * "ieth", "th", tuple names). Outputs are pinned to golden data produced by the original library.
 */
const UNITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["zero", "ten", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const ORDINAL_EXCEPTIONS: Record<number, string> = { 1: "first", 2: "second", 3: "third", 4: "fourth", 5: "fifth", 8: "eighth", 9: "ninth", 12: "twelfth" };
const SCALES: [bigint, string][] = [
  [10n ** 18n, "quintillion"], [10n ** 15n, "quadrillion"], [10n ** 12n, "trillion"],
  [10n ** 9n, "billion"], [10n ** 6n, "million"], [1000n, "thousand"], [100n, "hundred"],
];
const TUPLES: Record<number, string> = { 1: "single", 2: "double", 3: "triple", 4: "quadruple", 5: "quintuple", 6: "sextuple",
  7: "septuple", 8: "octuple", 9: "nonuple", 10: "decuple", 100: "centuple", 1000: "milluple" };

const INT64_MIN = -(2n ** 63n), INT64_MAX = 2n ** 63n - 1n;
const INT32_MIN = -(2n ** 31n), INT32_MAX = 2n ** 31n - 1n;

function unitValue(n: number, ordinal: boolean): string {
  if (ordinal) return ORDINAL_EXCEPTIONS[n] ?? UNITS[n] + "th";
  return UNITS[n];
}

function convert(input: bigint, addAnd = true, ordinal = false): string {
  let n = input;
  if (n === 0n) return unitValue(0, ordinal);
  // Original negates then recurses with defaults: negative ordinals are cardinal ("minus five").
  if (n < 0n) return `minus ${convert(-n)}`;
  const parts: string[] = [];
  for (const [size, name] of SCALES) {
    if (n / size > 0n) {
      parts.push(`${convert(n / size)} ${name}`); // recursion uses default addAnd=true, as in the original
      n %= size;
    }
  }
  if (n > 0n) {
    if (parts.length !== 0 && addAnd) parts.push("and");
    const v = Number(n);
    if (v < 20) parts.push(unitValue(v, ordinal));
    else {
      let last = TENS[Math.floor(v / 10)];
      if (v % 10 > 0) last += `-${unitValue(v % 10, ordinal)}`;
      else if (ordinal) last = last.replace(/y+$/, "") + "ieth";
      parts.push(last);
    }
  } else if (ordinal) {
    parts[parts.length - 1] += "th";
  }
  let words = parts.join(" ");
  if (ordinal && words.startsWith("one ")) words = words.slice(4); // RemoveOnePrefix
  return words;
}

function toInt64(n: number | bigint): bigint {
  const b = typeof n === "bigint" ? n : (Number.isSafeInteger(n) ? BigInt(n) : NaN as never);
  if (typeof b !== "bigint" || b < INT64_MIN || b > INT64_MAX) throw new RangeError("value must be an integer within Int64");
  if (b === INT64_MIN) throw new RangeError("Int64.MinValue cannot be negated (the original throws OverflowException)");
  return b;
}
function toInt32(n: number | bigint): bigint {
  const b = toInt64(n);
  if (b < INT32_MIN || b > INT32_MAX) throw new RangeError("value must be within Int32");
  return b;
}

/** `ToWords()` — cardinal words. `addAnd` only affects the final group, matching the original. */
export function toWords(n: number | bigint, opts: { addAnd?: boolean } = {}): string {
  return convert(toInt64(n), opts.addAnd ?? true, false);
}
/** `ToOrdinalWords()` — Int32 input, like the original ConvertToOrdinal(int). */
export function toOrdinalWords(n: number | bigint): string {
  return convert(toInt32(n), true, true);
}
/** `ToTuple()` — "single", "double", ... or "{n}-tuple". */
export function toTuple(n: number | bigint): string {
  const v = Number(toInt32(n));
  return TUPLES[v] ?? `${v}-tuple`;
}

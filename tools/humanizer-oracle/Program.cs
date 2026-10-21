// Golden-output oracle: runs the ORIGINAL Humanizer 2.14.1 English number-to-words converter
// and prints JSON lines consumed by the TypeScript rebuild's tests.
using System.Globalization;
using System.Text.Json;
using Humanizer;

var en = new CultureInfo("en-US");
var rnd = new Random(1234);
var longs = new List<long>();
for (long i = -25; i <= 2100; i++) longs.Add(i);
long[] edges = { 9999, 10000, 10001, 99999, 100000, 100001, 101010, 999999, 1000000, 1000001, 1001000, 1100000, 2147483647, -2147483648,
  1000000000000, 1000000000000000, 1000000000000000000, long.MaxValue, long.MinValue + 1 };
longs.AddRange(edges);
for (int i = 0; i < 1500; i++) longs.Add((long)(rnd.NextDouble() * Math.Pow(10, rnd.Next(1, 19))) * (rnd.Next(4) == 0 ? -1 : 1));
var ints = Enumerable.Range(-5, 1300).Concat(new[] { 10000, 100000, 1000000, 1000001, 123456789, int.MaxValue }).ToList();

using var o = Console.OpenStandardOutput();
var w = new StreamWriter(o) { AutoFlush = false };
foreach (var n in longs.Distinct())
  w.WriteLine(JsonSerializer.Serialize(new { kind = "words", n = n.ToString(), and = n.ToWords(en), noAnd = n.ToWords(addAnd: false, culture: en) }));
foreach (var n in ints.Distinct())
{
  string ord; try { ord = n.ToOrdinalWords(en); } catch (Exception e) { ord = "!" + e.GetType().Name; }
  w.WriteLine(JsonSerializer.Serialize(new { kind = "ordinal", n = n.ToString(), ord }));
}
foreach (var n in Enumerable.Range(-2, 120))
  w.WriteLine(JsonSerializer.Serialize(new { kind = "tuple", n = n.ToString(), tuple = n.ToTuple(en) }));
w.Flush();

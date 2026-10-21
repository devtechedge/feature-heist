# Feature spec: english number to words

- Target: `packages/rebuilds/english-number-words/fixtures/Humanizer.dll`
- REA 6.7.0, operation `inspect_managed_members`, evidence `ev_7760baf9c3ec8e17093f04931fb473e62113b283ac16d7d70382bc9ea9fc894e`
- Record sha256: `0111a21487092478e6f840d0d9b495494fbea3ff243d9506f0cd753e002c0269`

## Call chain (from REA semantic graph)
_none found; refine --keywords_

## Evidence hits
| kind | label | location |
|---|---|---|
| types | EnglishNumberToWordsConverter | `Humanizer.dll:0-0` |
| fields | UnitsMap | `Humanizer.dll:0-0` |
| methods | Convert | `Humanizer.dll:0-0` |
| call_edges |  | `Humanizer.dll:0-0` |
| field_accesses |  | `Humanizer.dll:0-0` |
| fields | TensMap | `Humanizer.dll:1-1` |
| methods | Convert | `Humanizer.dll:1-1` |
| call_edges |  | `Humanizer.dll:1-1` |
| field_accesses |  | `Humanizer.dll:1-1` |
| fields | OrdinalExceptions | `Humanizer.dll:2-2` |
| methods | ConvertToOrdinal | `Humanizer.dll:2-2` |
| call_edges |  | `Humanizer.dll:2-2` |
| field_accesses |  | `Humanizer.dll:2-2` |
| call_edges |  | `Humanizer.dll:3-3` |
| field_accesses |  | `Humanizer.dll:3-3` |
| methods | GetUnitValue | `Humanizer.dll:4-4` |
| call_edges |  | `Humanizer.dll:4-4` |
| field_accesses |  | `Humanizer.dll:4-4` |
| methods | RemoveOnePrefix | `Humanizer.dll:5-5` |
| call_edges |  | `Humanizer.dll:5-5` |
| field_accesses |  | `Humanizer.dll:5-5` |
| methods | ExceptionNumbersToWords | `Humanizer.dll:6-6` |
| call_edges |  | `Humanizer.dll:6-6` |
| field_accesses |  | `Humanizer.dll:6-6` |
| methods | ConvertToTuple | `Humanizer.dll:7-7` |
| call_edges |  | `Humanizer.dll:7-7` |
| methods | .ctor | `Humanizer.dll:8-8` |
| call_edges |  | `Humanizer.dll:8-8` |
| call_edges |  | `Humanizer.dll:9-9` |
| call_edges |  | `Humanizer.dll:10-10` |
| call_edges |  | `Humanizer.dll:11-11` |
| call_edges |  | `Humanizer.dll:12-12` |
| call_edges |  | `Humanizer.dll:13-13` |
| call_edges |  | `Humanizer.dll:14-14` |
| call_edges |  | `Humanizer.dll:15-15` |
| call_edges |  | `Humanizer.dll:16-16` |
| call_edges |  | `Humanizer.dll:17-17` |
| call_edges |  | `Humanizer.dll:18-18` |
| call_edges |  | `Humanizer.dll:19-19` |
| call_edges |  | `Humanizer.dll:20-20` |

## Behaviour (fill in from evidence)
- Inputs:
- Outputs:
- Edge cases:

## Unknowns
- 

# Kết quả tối ưu prompt — provider=mock, seed=42

_Chạy lúc 2026-08-21T15:39:17.676Z · 20.6s · 85 genome khác nhau được chấm._

> ⚠️ **MOCK (giả lập tất định).** Con số dưới đây chỉ để KIỂM THỬ cỗ máy tiến hoá và minh hoạ đường cong fitness — **không phải kết quả khoa học**. Kết quả thật cần chạy `--provider vilao` với khoá API.

## Đường cong fitness qua các thế hệ

```
best  ▁▇▇▇▇▇▇███
mean  ▁▃▅▆█▇▆▆▄▇
```

| gen | best fitness | best accuracy | best tokens | mean fitness |
|----:|:---:|:---:|:---:|:---:|
| 0 | 0.674 | 87.1% | 9883 | 0.076 |
| 1 | 0.802 | 100.0% | 9888 | 0.336 |
| 2 | 0.802 | 100.0% | 9888 | 0.470 |
| 3 | 0.802 | 100.0% | 9888 | 0.618 |
| 4 | 0.802 | 100.0% | 9888 | 0.750 |
| 5 | 0.802 | 100.0% | 9888 | 0.672 |
| 6 | 0.802 | 100.0% | 9888 | 0.569 |
| 7 | 0.803 | 100.0% | 9865 | 0.636 |
| 8 | 0.803 | 100.0% | 9865 | 0.445 |
| 9 | 0.803 | 100.0% | 9865 | 0.706 |

## Cải thiện

- Best fitness: **0.674 → 0.803** qua 10 thế hệ.
- Best accuracy: **87.1% → 100.0%**.
- Prompt tốt nhất bật các gene: `queries-list`, `integer-coords`, `json-only`, `verify-asserts`.

## Cấu hình

```json
{
  "provider": "mock",
  "seed": 42,
  "dataset": 210,
  "lambda": 0.02,
  "pop": 12,
  "gen": 10,
  "elite": 2,
  "tournamentK": 3,
  "pMutBit": 0.15,
  "pMutSwap": 0.3,
  "initPOn": 0.5
}
```

Tệp kèm theo: `history.json`, `history.csv`, `best-prompt.txt`, `best-genome.json`.

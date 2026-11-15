import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const MIN_PRICE = 0.00001;
const MAX_PRICE = 9_999_999.99999;

interface CaseMarket {
  id: string;
  prices: number[];
}

interface Case {
  markets: CaseMarket[];
}

const price5 = (x: number): number => Math.round(Math.min(MAX_PRICE, Math.max(MIN_PRICE, x)) * 1e5) / 1e5;

/** Ridge model on log-returns (lambda=1, fitted on 528 rolling origins across 6 practice cases; LOO MAE 41790 vs persistence 43822; 5-case validation 34104 vs persistence 47055). */
function forecast(m: CaseMarket): number {
  if (!Array.isArray(m.prices) || m.prices.length === 0) throw new Error(`market ${m.id} has no prices`);
  const prices = m.prices;
  const n = prices.length;
  const pt = prices[n - 1] as number;
  if (typeof pt !== 'number' || !Number.isFinite(pt)) throw new Error(`market ${m.id}'s last price is not finite`);

  const x0 = 1;
  const x1 = Math.log(pt / (prices[n - 1 - 15] as number));
  const x2 = Math.log(pt / (prices[n - 1 - 60] as number));
  const x3 = Math.log(pt / (prices[n - 1 - 240] as number));
  const x4 = Math.log(pt / (prices[n - 1 - 1440] as number));

  const slice1440 = prices.slice(n - 1440, n).slice();
  slice1440.sort((a, b) => a - b);
  const median1440 = slice1440[Math.floor(slice1440.length / 2)] as number;
  const x5 = Math.log(pt / median1440);

  let sumR = 0;
  let sumR2 = 0;
  const retCount = 240;
  const startIdx = n - 1 - retCount;
  for (let i = startIdx + 1; i < n; i++) {
    const r = Math.log((prices[i] as number) / (prices[i - 1] as number));
    sumR += r;
    sumR2 += r * r;
  }
  const meanR = sumR / retCount;
  const meanR2 = sumR2 / retCount;
  const variance = Math.max(0, meanR2 - meanR * meanR);
  const stdR = Math.sqrt(variance);
  const x6 = 1000 * stdR;

  const W = [-0.00388, -0.00074, -0.00382, -0.00787, -0.01690, -0.00795, 0.00342];
  const sumWX = W[0] * x0 + W[1] * x1 + W[2] * x2 + W[3] * x3 + W[4] * x4 + W[5] * x5 + W[6] * x6;
  const guess = pt * Math.exp(sumWX);
  return price5(guess);
}

mkdirSync(OUTPUT_DIR, { recursive: true });
const inputs = readdirSync(INPUT_DIR).filter((f) => f.endsWith('.in')).sort();
for (const file of inputs) {
  const id = file.slice(0, -'.in'.length);
  const c = JSON.parse(readFileSync(join(INPUT_DIR, file), 'utf8')) as Case;
  if (!Array.isArray(c.markets) || c.markets.length !== 1) throw new Error(`${file} does not hold exactly one market`);
  const guessPrice = forecast(c.markets[0] as CaseMarket);
  writeFileSync(
    join(OUTPUT_DIR, `${id}.out`),
    `${JSON.stringify({ forecasts: [{ case: id, price: guessPrice }] })}\n`
  );
}

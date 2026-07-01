import type { PriceSnapshot } from "@/domains/tracking/types";

interface PriceHistoryChartProps {
  snapshots: PriceSnapshot[];
}

const WIDTH = 600;
const HEIGHT = 160;
const PAD_X = 10;
const PAD_Y = 18;

interface Point {
  available: boolean;
  price: number;
  scrapedAt: string;
  x: number;
  y: number;
}

function buildPoints(priced: (PriceSnapshot & { price: number })[]): Point[] {
  const times = priced.map((s) => Date.parse(s.scrapedAt));
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const prices = priced.map((s) => s.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const spanT = maxT - minT || 1;
  const spanP = maxP - minP || 1;

  return priced.map((s, i) => ({
    price: s.price,
    scrapedAt: s.scrapedAt,
    available: s.available,
    x: PAD_X + ((times[i] - minT) / spanT) * (WIDTH - 2 * PAD_X),
    y: PAD_Y + (1 - (s.price - minP) / spanP) * (HEIGHT - 2 * PAD_Y),
  }));
}

export function PriceHistoryChart({ snapshots }: PriceHistoryChartProps) {
  const priced = snapshots.filter(
    (s): s is PriceSnapshot & { price: number } =>
      s.available && s.price !== null
  );

  if (priced.length === 0) {
    return (
      <p className="py-6 text-center text-[#536365] text-sm">
        No price points recorded yet. The scraper stores a point every 2 hours
        when the price changes.
      </p>
    );
  }

  if (priced.length === 1) {
    const only = priced[0];
    return (
      <p className="py-6 text-center text-[#738C8A] text-sm">
        One data point so far: {only.currency} {only.price.toLocaleString()}.
        The chart appears once the price changes.
      </p>
    );
  }

  const points = buildPoints(priced);
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const baseline = HEIGHT - PAD_Y;
  const areaPath = `${linePath} L ${points.at(-1)?.x.toFixed(1)} ${baseline} L ${points[0].x.toFixed(1)} ${baseline} Z`;

  const lowest = points.reduce((a, b) => (b.price < a.price ? b : a));
  const latest = points.at(-1) as Point;

  return (
    <svg
      aria-label="Price history chart"
      className="h-auto w-full"
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
    >
      <defs>
        <linearGradient id="priceArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#2A4F58" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#2A4F58" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={areaPath} fill="url(#priceArea)" />
      <path
        d={linePath}
        fill="none"
        stroke="#5FA8A0"
        strokeLinejoin="round"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />

      {points.map((p) => (
        <circle
          cx={p.x}
          cy={p.y}
          fill="#0b1116"
          key={`${p.scrapedAt}-${p.price}`}
          r="2.5"
          stroke="#5FA8A0"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        >
          <title>
            {new Date(p.scrapedAt).toLocaleDateString()}:{" "}
            {p.price.toLocaleString()}
          </title>
        </circle>
      ))}

      <circle
        cx={lowest.x}
        cy={lowest.y}
        fill="#4ade80"
        r="3.5"
        vectorEffect="non-scaling-stroke"
      >
        <title>Lowest: {lowest.price.toLocaleString()}</title>
      </circle>
      <circle
        cx={latest.x}
        cy={latest.y}
        fill="#F5F7F8"
        r="3.5"
        vectorEffect="non-scaling-stroke"
      >
        <title>Latest: {latest.price.toLocaleString()}</title>
      </circle>
    </svg>
  );
}

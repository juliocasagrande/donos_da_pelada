import { formatCurrencyBRL } from "@/lib/financeUtils";

type CashFlowPoint = {
  key: string;
  label: string;
  balance: number;
};

const WIDTH = 320;
const HEIGHT = 120;
const PADDING_X = 8;
const PADDING_Y = 16;

export function CashFlowAreaChart({ data }: { data: CashFlowPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-[120px] items-center justify-center text-sm text-musgo">
        Sem historico suficiente para o grafico ainda.
      </div>
    );
  }

  const values = data.map((point) => point.balance);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const range = maxValue - minValue || 1;

  const innerWidth = WIDTH - PADDING_X * 2;
  const innerHeight = HEIGHT - PADDING_Y * 2;

  const toX = (index: number) => PADDING_X + (index / (data.length - 1)) * innerWidth;
  const toY = (value: number) => PADDING_Y + innerHeight - ((value - minValue) / range) * innerHeight;

  const linePoints = data.map((point, index) => `${toX(index)},${toY(point.balance)}`);
  const areaPoints = [`${toX(0)},${toY(0)}`, ...linePoints, `${toX(data.length - 1)},${toY(0)}`].join(" ");
  const lastPoint = data[data.length - 1];
  const lastIsPositive = lastPoint.balance >= 0;

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cashFlowFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1B9E4B" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1B9E4B" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={PADDING_X} y1={toY(0)} x2={WIDTH - PADDING_X} y2={toY(0)} stroke="#E6EADF" strokeWidth="1" />
        <polygon points={areaPoints} fill="url(#cashFlowFill)" />
        <polyline
          points={linePoints.join(" ")}
          fill="none"
          stroke="#1B9E4B"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((point, index) => (
          <circle key={point.key} cx={toX(index)} cy={toY(point.balance)} r="2.5" fill="#1B9E4B" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] font-semibold text-musgo">
        {data.map((point) => (
          <span key={point.key}>{point.label}</span>
        ))}
      </div>
      <p className={`mt-1 text-xs font-semibold ${lastIsPositive ? "text-campo" : "text-ausente"}`}>
        Caixa atual: {formatCurrencyBRL(lastPoint.balance)}
      </p>
    </div>
  );
}

import React, { useState } from 'react';
import { formatINR } from '../../utils/formatters';

export const OccupancyTrendChart: React.FC<{
  data: { month: string; occupancy: number }[];
}> = ({ data }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const w = 540;
  const h = 200;
  const padX = 40;
  const padY = 24;

  const points = data.map((d, i) => {
    const x = padX + (i * (w - padX * 2)) / Math.max(1, data.length - 1);
    const clamped = Math.max(40, Math.min(100, d.occupancy));
    const y = h - padY - ((clamped - 40) / 60) * (h - padY * 2);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${h - padY} L ${points[0].x} ${h - padY} Z`
      : '';

  return (
    <div className="relative w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-52 w-full min-w-[340px]">
        <defs>
          <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[50, 70, 85, 100].map((val) => {
          const y = h - padY - ((val - 40) / 60) * (h - padY * 2);
          return (
            <g key={val}>
              <line x1={padX} x2={w - padX} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={4} y={y + 4} fontSize="10" fill="#64748b" className="font-mono">
                {val}%
              </text>
            </g>
          );
        })}
        {areaPath && <path d={areaPath} fill="url(#occGrad)" />}
        {linePath && (
          <path d={linePath} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />
        )}
        {points.map((p, i) => (
          <g
            key={p.month}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-pointer"
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={hovered === i ? 6 : 4}
              fill="#4f46e5"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <text x={p.x} y={h - 4} textAnchor="middle" fontSize="10" fill="#64748b">
              {p.month}
            </text>
            {hovered === i && (
              <g>
                <rect x={p.x - 28} y={p.y - 30} width="56" height="22" rx="6" fill="#0f172a" />
                <text
                  x={p.x}
                  y={p.y - 15}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="#ffffff"
                  className="font-mono"
                >
                  {p.occupancy}%
                </text>
              </g>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

export const RevenueExpenseChart: React.FC<{
  data: { month: string; revenue: number; expense: number }[];
}> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxVal = Math.max(...data.flatMap((d) => [d.revenue, d.expense]), 10000);
  const activePoint = hoveredIdx !== null ? data[hoveredIdx] : data[data.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="font-mono tabular-nums text-slate-700">
          {activePoint && (
            <>
              <span className="font-sans font-semibold text-slate-900">{activePoint.month}:</span>{' '}
              <span className="text-indigo-700">{formatINR(activePoint.revenue)}</span>
              <span className="mx-1.5 text-slate-300">/</span>
              <span className="text-amber-700">{formatINR(activePoint.expense)}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-indigo-600" /> Rent Collected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-amber-500" /> Expenses
          </span>
        </div>
      </div>

      <div className="grid grid-cols-6 items-end gap-3 pt-2" style={{ height: 185 }}>
        {data.map((d, idx) => {
          const revH = Math.round((d.revenue / maxVal) * 135);
          const expH = Math.round((d.expense / maxVal) * 135);
          const isActive = hoveredIdx === idx;
          return (
            <div
              key={d.month}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="flex cursor-pointer flex-col items-center gap-1.5"
            >
              <div className="flex items-end gap-1.5" style={{ height: 140 }}>
                <div
                  className={`w-4 rounded-t transition-opacity sm:w-5 ${
                    isActive ? 'bg-indigo-700' : 'bg-indigo-600'
                  }`}
                  style={{ height: Math.max(8, revH) }}
                />
                <div
                  className={`w-4 rounded-t transition-opacity sm:w-5 ${
                    isActive ? 'bg-amber-600' : 'bg-amber-400'
                  }`}
                  style={{ height: Math.max(8, expH) }}
                />
              </div>
              <span
                className={`text-[11px] font-medium ${
                  isActive ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                {d.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const HorizontalBarBreakdown: React.FC<{
  items: { label: string; value: number; color?: string }[];
  valueFormatter?: (v: number) => string;
}> = ({ items, valueFormatter = formatINR }) => {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = Math.round((item.value / total) * 100);
        return (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">{item.label}</span>
              <span className="font-mono text-slate-700 tabular-nums">
                {valueFormatter(item.value)}{' '}
                <span className="text-slate-400">({pct}%)</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={item.color || 'bg-indigo-600'}
                style={{ width: `${Math.max(2, pct)}%`, height: '100%' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const ElectricityConsumptionChart: React.FC<{
  data: { label: string; units: number; amount: number }[];
}> = ({ data }) => {
  const [active, setActive] = useState<number | null>(null);
  const maxUnits = Math.max(...data.map((d) => d.units), 100);
  const shown = active !== null ? data[active] : data[data.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        {shown ? (
          <span className="font-mono tabular-nums text-slate-700">
            <strong className="font-sans text-slate-900">{shown.label}:</strong> {shown.units} kWh ·{' '}
            {formatINR(shown.amount)}
          </span>
        ) : (
          <span>No consumption data</span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-indigo-600" /> Units Consumed (kWh)
        </span>
      </div>
      <div
        className="grid items-end gap-3 pt-2"
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, data.length)}, minmax(0, 1fr))`,
          height: 185,
        }}
      >
        {data.map((d, i) => {
          const barH = Math.round((d.units / maxUnits) * 130);
          return (
            <div
              key={`${d.label}-${i}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              className="flex cursor-pointer flex-col items-center gap-1.5"
            >
              <span className="font-mono text-[10px] text-slate-500 tabular-nums">{d.units}</span>
              <div
                className={`w-full max-w-[40px] rounded-t transition-colors ${
                  active === i ? 'bg-indigo-700' : 'bg-indigo-500'
                }`}
                style={{ height: Math.max(8, barH) }}
              />
              <span className="truncate text-[11px] font-medium text-slate-600">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

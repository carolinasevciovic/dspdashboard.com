import React, { useState } from 'react';

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
  isHighlighted?: boolean; // For ONErpm
  subtext?: string;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  valueFormatter?: (val: number) => string;
  horizontal?: boolean;
  emptyMessage?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 240,
  valueFormatter = (v) => v.toLocaleString('pt-BR'),
  horizontal = false,
  emptyMessage = 'Sem dados disponíveis',
}) => {
  const [hoveredBar, setHoveredBar] = useState<{
    label: string;
    value: number;
    subtext?: string;
    screenX: number;
    screenY: number;
  } | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  if (horizontal) {
    return (
      <div className="w-full space-y-2 py-1 select-none">
        {data.map((item, idx) => {
          const pct = Math.max((item.value / maxValue) * 100, 2);
          const barColor = item.color
            ? item.color
            : item.isHighlighted
            ? '#FF5500'
            : '#94A3B8';

          return (
            <div key={idx} className="group">
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`truncate font-semibold ${
                      item.isHighlighted ? 'text-[#FF5500] font-bold' : 'text-slate-700'
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.isHighlighted && (
                    <span className="text-[10px] bg-orange-100 text-[#FF5500] font-bold px-1.5 py-0.2 rounded-xs">
                      ONErpm
                    </span>
                  )}
                </div>
                <span className="font-mono-numbers text-slate-600 font-medium shrink-0 ml-2">
                  {valueFormatter(item.value)}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-sm h-3 overflow-hidden">
                <div
                  className="h-full rounded-xs transition-all duration-300 group-hover:brightness-110"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Vertical Bar Chart
  const chartWidth = 550;
  const chartHeight = height;
  const paddingBottom = 45;
  const paddingTop = 20;
  const paddingLeft = 40;
  const paddingRight = 20;

  const innerW = chartWidth - paddingLeft - paddingRight;
  const innerH = chartHeight - paddingTop - paddingBottom;
  const barWidth = Math.min(innerW / (data.length * 1.6), 40);

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-auto overflow-visible"
        style={{ maxHeight: height }}
      >
        {/* Horizontal grid lines */}
        {[0, 0.33, 0.66, 1].map((ratio, i) => {
          const y = paddingTop + innerH * (1 - ratio);
          const val = maxValue * ratio;
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={chartWidth - paddingRight}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <text
                x={paddingLeft - 6}
                y={y + 3}
                textAnchor="end"
                className="text-[9px] fill-slate-400 font-mono-numbers"
              >
                {val >= 1000000
                  ? `${(val / 1000000).toFixed(1)}M`
                  : val >= 1000
                  ? `${(val / 1000).toFixed(0)}k`
                  : Math.round(val)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, idx) => {
          const step = innerW / data.length;
          const x = paddingLeft + idx * step + (step - barWidth) / 2;
          const barH = (item.value / maxValue) * innerH;
          const y = paddingTop + innerH - barH;
          const color = item.color
            ? item.color
            : item.isHighlighted
            ? '#FF5500'
            : '#64748B';

          return (
            <g
              key={idx}
              className="cursor-pointer group"
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredBar({
                  label: item.label,
                  value: item.value,
                  subtext: item.subtext,
                  screenX: rect.left + rect.width / 2,
                  screenY: rect.top,
                });
              }}
              onMouseLeave={() => setHoveredBar(null)}
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barH, 2)}
                rx={3}
                fill={color}
                className="transition-opacity hover:opacity-80"
              />
              {/* Label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight - 15}
                textAnchor="middle"
                className={`text-[9px] truncate ${
                  item.isHighlighted ? 'fill-[#FF5500] font-bold' : 'fill-slate-600 font-medium'
                }`}
              >
                {item.label.length > 10 ? `${item.label.substring(0, 9)}.` : item.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredBar && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full mb-2 bg-slate-900 text-white text-[11px] rounded-md px-2.5 py-1.5 shadow-lg border border-slate-800"
          style={{
            left: hoveredBar.screenX,
            top: hoveredBar.screenY - 8,
          }}
        >
          <div className="font-bold text-white">{hoveredBar.label}</div>
          <div className="text-[#FF7733] font-bold font-mono-numbers">
            {valueFormatter(hoveredBar.value)}
          </div>
          {hoveredBar.subtext && (
            <div className="text-slate-300 text-[10px] mt-0.5">{hoveredBar.subtext}</div>
          )}
        </div>
      )}
    </div>
  );
};

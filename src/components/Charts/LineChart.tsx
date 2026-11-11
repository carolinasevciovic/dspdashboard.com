import React, { useState } from 'react';

export interface LineSeries {
  id: string;
  label: string;
  color: string;
  data: { x: string; y: number }[];
}

interface LineChartProps {
  series: LineSeries[];
  height?: number;
  valueFormatter?: (val: number) => string;
  yAxisLabel?: string;
  emptyMessage?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  series,
  height = 260,
  valueFormatter = (v) => v.toLocaleString('pt-BR'),
  yAxisLabel,
  emptyMessage = 'Sem dados para o período selecionado',
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    seriesName: string;
    x: string;
    y: number;
    color: string;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Collect all unique X labels
  const allX = Array.from(
    new Set(series.flatMap((s) => s.data.map((d) => d.x)))
  );

  if (series.length === 0 || allX.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  // Calculate min & max Y
  const allY = series.flatMap((s) => s.data.map((d) => d.y));
  const maxY = Math.max(...allY, 1);
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  const chartWidth = 600; // viewBox coordinate space
  const chartHeight = height;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (allX.length <= 1) return paddingLeft + innerWidth / 2;
    return paddingLeft + (index / (allX.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    return paddingTop + innerHeight - (val / maxY) * innerHeight;
  };

  // Generate 4 horizontal grid lines
  const gridTicks = [0, maxY * 0.33, maxY * 0.66, maxY];

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-auto overflow-visible"
        style={{ maxHeight: height }}
      >
        {/* Horizontal grid lines */}
        {gridTicks.map((tick, i) => {
          const y = getY(tick);
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
                {tick >= 1000000
                  ? `${(tick / 1000000).toFixed(1)}M`
                  : tick >= 1000
                  ? `${(tick / 1000).toFixed(0)}k`
                  : Math.round(tick)}
              </text>
            </g>
          );
        })}

        {/* X Axis labels */}
        {allX.map((xVal, i) => {
          const x = getX(i);
          return (
            <text
              key={i}
              x={x}
              y={chartHeight - 12}
              textAnchor="middle"
              className="text-[9px] fill-slate-500 font-mono-numbers"
            >
              {xVal.length > 10 ? `${xVal.substring(0, 10)}...` : xVal}
            </text>
          );
        })}

        {/* Series lines and dots */}
        {series.map((s) => {
          if (s.data.length === 0) return null;

          // Build path points
          const points = allX.map((xVal, i) => {
            const found = s.data.find((d) => d.x === xVal);
            const val = found ? found.y : 0;
            return { x: getX(i), y: getY(val), val, xVal };
          });

          const pathD = points
            .map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
            .join(' ');

          return (
            <g key={s.id}>
              {/* Stroke path */}
              <path
                d={pathD}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {points.map((p, idx) => (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill="#FFFFFF"
                  stroke={s.color}
                  strokeWidth={2}
                  className="cursor-pointer transition-transform hover:scale-150"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredPoint({
                      seriesName: s.label,
                      x: p.xVal,
                      y: p.val,
                      color: s.color,
                      screenX: rect.left + rect.width / 2,
                      screenY: rect.top,
                    });
                  }}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredPoint && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full mb-2 bg-slate-900 text-white text-[11px] rounded-md px-2.5 py-1.5 shadow-lg border border-slate-800"
          style={{
            left: hoveredPoint.screenX,
            top: hoveredPoint.screenY - 8,
          }}
        >
          <div className="flex items-center gap-1.5 font-bold">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: hoveredPoint.color }}
            />
            <span>{hoveredPoint.seriesName}</span>
          </div>
          <div className="text-slate-300 text-[10px]">{hoveredPoint.x}</div>
          <div className="text-[#FF7733] font-bold font-mono-numbers mt-0.5">
            {valueFormatter(hoveredPoint.y)}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-3 pt-2 border-t border-slate-100">
        {series.map((s) => (
          <div key={s.id} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span
              className="w-2.5 h-2.5 rounded-xs shrink-0"
              style={{ backgroundColor: s.color }}
            />
            <span className="font-medium text-[11px]">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

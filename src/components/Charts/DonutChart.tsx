import React, { useState } from 'react';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerText?: string;
  centerSubtext?: string;
  valueFormatter?: (val: number) => string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 200,
  thickness = 32,
  centerText,
  centerSubtext,
  valueFormatter = (v) => v.toLocaleString('pt-BR'),
}) => {
  const [hoveredSlice, setHoveredSlice] = useState<DonutSlice | null>(null);

  const total = data.reduce((acc, cur) => acc + cur.value, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-xs text-slate-400">
        Nenhum dado para exibir no momento.
      </div>
    );
  }

  const radius = size / 2;
  const innerRadius = radius - thickness;
  const cx = radius;
  const cy = radius;

  // Compute SVG arc segments
  let currentAngle = -90; // Start at top
  const slicesWithAngles = data.map((slice) => {
    const sliceAngle = (slice.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle += sliceAngle;
    return {
      ...slice,
      startAngle,
      endAngle,
      percentage: ((slice.value / total) * 100).toFixed(1),
    };
  });

  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (
    x: number,
    y: number,
    rInner: number,
    rOuter: number,
    startAngle: number,
    endAngle: number
  ) => {
    // Avoid full 360 degree glitch by clamping slightly
    const clampedEnd = endAngle - startAngle >= 360 ? startAngle + 359.99 : endAngle;

    const startOuter = polarToCartesian(x, y, rOuter, clampedEnd);
    const endOuter = polarToCartesian(x, y, rOuter, startAngle);
    const startInner = polarToCartesian(x, y, rInner, startAngle);
    const endInner = polarToCartesian(x, y, rInner, clampedEnd);

    const largeArcFlag = clampedEnd - startAngle <= 180 ? '0' : '1';

    return [
      'M',
      startOuter.x,
      startOuter.y,
      'A',
      rOuter,
      rOuter,
      0,
      largeArcFlag,
      0,
      endOuter.x,
      endOuter.y,
      'L',
      startInner.x,
      startInner.y,
      'A',
      rInner,
      rInner,
      0,
      largeArcFlag,
      1,
      endInner.x,
      endInner.y,
      'Z',
    ].join(' ');
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
      {/* SVG Donut */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slicesWithAngles.map((slice, i) => {
            const isHovered = hoveredSlice?.label === slice.label;
            const pathD = describeArc(
              cx,
              cy,
              innerRadius,
              isHovered ? radius + 3 : radius,
              slice.startAngle + 90,
              slice.endAngle + 90
            );

            return (
              <path
                key={i}
                d={pathD}
                fill={slice.color}
                className="transition-all duration-150 cursor-pointer hover:opacity-90"
                onMouseEnter={() => setHoveredSlice(slice)}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          <span className="text-xs font-bold text-slate-800 font-mono-numbers">
            {hoveredSlice
              ? valueFormatter(hoveredSlice.value)
              : centerText || valueFormatter(total)}
          </span>
          <span className="text-[10px] text-slate-500 truncate max-w-[100px]">
            {hoveredSlice ? hoveredSlice.label : centerSubtext || 'Total'}
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-2 text-xs">
        {slicesWithAngles.map((slice, idx) => (
          <div
            key={idx}
            onMouseEnter={() => setHoveredSlice(slice)}
            onMouseLeave={() => setHoveredSlice(null)}
            className={`flex items-center justify-between gap-4 px-2 py-1 rounded-sm cursor-pointer transition-colors ${
              hoveredSlice?.label === slice.label ? 'bg-slate-100' : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-slate-700 truncate font-medium text-[11px]">
                {slice.label}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 font-mono-numbers text-[11px]">
              <span className="text-slate-900 font-semibold">{valueFormatter(slice.value)}</span>
              <span className="text-slate-400">({slice.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

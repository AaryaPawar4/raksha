import { useState } from 'react';
import { IncidentTrendPoint } from '@rakshasphere/shared';
import { useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';

interface IncidentTrendChartProps {
  data: IncidentTrendPoint[];
}

export function IncidentTrendChart({ data }: IncidentTrendChartProps) {
  const navigate = useNavigate();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex flex-col items-center justify-center text-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
        <TrendingUp className="w-8 h-8 text-slate-300 mb-2" />
        <p className="text-sm font-semibold text-slate-700">No Incidents Recorded in Date Range</p>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          When incidents occur within this filter period, a daily pattern timeline will render here.
        </p>
      </div>
    );
  }

  // Chart dimensions & scaling
  const width = 600;
  const height = 220;
  const paddingX = 40;
  const paddingY = 30;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const yTicks = [0, Math.ceil(maxCount / 2), maxCount];

  // Map points to SVG coordinates
  const points = data.map((d, i) => {
    const x =
      data.length === 1
        ? width / 2
        : paddingX + (i / (data.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - (d.count / maxCount) * (height - paddingY * 2);
    return { x, y, ...d };
  });

  const pathD =
    points.length === 1
      ? `M ${points[0].x - 20} ${points[0].y} L ${points[0].x + 20} ${points[0].y}`
      : points.reduce(
          (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
          ''
        );

  const areaD =
    points.length === 1
      ? `M ${points[0].x - 20} ${height - paddingY} L ${points[0].x - 20} ${points[0].y} L ${points[0].x + 20} ${points[0].y} L ${points[0].x + 20} ${height - paddingY} Z`
      : `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
          <span className="flex items-center gap-1 font-semibold text-slate-700">
            <TrendingUp className="w-3.5 h-3.5 text-rose-600" /> Incident Frequency Over Time
          </span>
          <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
            Interactive Timeline • Click bar to drill down
          </span>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-48 select-none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {yTicks.map((tick, idx) => {
            const y = height - paddingY - (tick / maxCount) * (height - paddingY * 2);
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 10}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94a3b8"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill="url(#roseGradient)" />

          {/* Line stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="#e11d48"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Data points */}
          {points.map((pt, i) => (
            <g
              key={i}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => navigate('/incidents')}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIndex === i ? 6 : 4}
                fill={hoveredIndex === i ? '#be123c' : '#f43f5e'}
                stroke="#ffffff"
                strokeWidth="2"
              />
              {/* X-axis date labels for first, middle, last */}
              {(i === 0 || i === Math.floor(points.length / 2) || i === points.length - 1) && (
                <text
                  x={pt.x}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#64748b"
                >
                  {new Date(pt.date).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </text>
              )}
            </g>
          ))}
        </svg>

        {/* Hover Tooltip display */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div className="mt-2 text-center text-xs bg-rose-50 text-rose-900 border border-rose-200 rounded-lg py-1 px-3">
            <strong>
              {new Date(points[hoveredIndex].date).toLocaleDateString('en-IN', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </strong>
            : {points[hoveredIndex].count} incident{points[hoveredIndex].count !== 1 ? 's' : ''}{' '}
            recorded
          </div>
        )}
      </div>
    </div>
  );
}

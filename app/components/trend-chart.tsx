import type { TrendPoint } from "@/lib/services/dashboard";

type Series = { key: keyof Pick<TrendPoint, "sent" | "received" | "won" | "revenueWon">; label: string; color: string };

export function TrendChart({ title, eyebrow, points, series, formatValue }: {
  title: string;
  eyebrow: string;
  points: TrendPoint[];
  series: Series[];
  formatValue?: (value: number) => string;
}) {
  const width = 640;
  const height = 230;
  const padding = { top: 18, right: 18, bottom: 38, left: 48 };
  const values = points.flatMap((point) => series.map((item) => point[item.key]));
  const max = Math.max(...values, 1);
  const x = (index: number) => padding.left + index * ((width - padding.left - padding.right) / Math.max(points.length - 1, 1));
  const y = (value: number) => padding.top + (max - value) * ((height - padding.top - padding.bottom) / max);
  const formatter = formatValue ?? ((value: number) => String(Math.round(value)));

  return (
    <article className="chartCard">
      <div className="chartHeader">
        <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>
        <div className="legend">{series.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>)}</div>
      </div>
      {points.length < 2 ? <p className="chartEmpty">Pas assez de données sur cette période.</p> : (
        <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
          {[0, .5, 1].map((ratio) => {
            const value = max * (1 - ratio);
            const gridY = padding.top + ratio * (height - padding.top - padding.bottom);
            return <g key={ratio}><line x1={padding.left} x2={width - padding.right} y1={gridY} y2={gridY} className="gridLine" /><text x={padding.left - 8} y={gridY + 4} textAnchor="end">{formatter(value)}</text></g>;
          })}
          {series.map((item) => (
            <polyline key={item.key} fill="none" stroke={item.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"
              points={points.map((point, index) => `${x(index)},${y(point[item.key])}`).join(" ")} />
          ))}
          {points.map((point, index) => index % Math.max(Math.ceil(points.length / 6), 1) === 0 && (
            <text key={point.key} x={x(index)} y={height - 12} textAnchor="middle">{point.label}</text>
          ))}
        </svg>
      )}
    </article>
  );
}

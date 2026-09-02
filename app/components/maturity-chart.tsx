"use client";

import { useState } from "react";
import type { MaturitySeries } from "@/lib/services/dashboard";

type Metric = "volume" | "revenue" | "opportunities";

const COLORS = ["#102f4f", "#f18748", "#55a182", "#8b6fb1", "#d2a43a", "#4f86a8", "#b75f76", "#738151"];
const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

const METRICS: { value: Metric; label: string }[] = [
  { value: "volume", label: "Volume échangé" },
  { value: "revenue", label: "CA gagné" },
  { value: "opportunities", label: "Nombre d’opportunités" }
];

export function MaturityChart({ series }: { series: MaturitySeries[] }) {
  const [metric, setMetric] = useState<Metric>("volume");
  const [horizon, setHorizon] = useState(12);
  const width = 980;
  const height = 340;
  const padding = { top: 18, right: 24, bottom: 42, left: 82 };
  const values = series.flatMap((group) => group.points.slice(0, horizon).map((point) => point[metric]));
  const max = Math.max(...values, 1);
  const x = (month: number) => padding.left + (month - 1) * ((width - padding.left - padding.right) / Math.max(horizon - 1, 1));
  const y = (value: number) => padding.top + (max - value) * ((height - padding.top - padding.bottom) / max);
  const format = metric === "opportunities" ? number.format : euro.format;

  return (
    <section className="maturityCard">
      <div className="maturityHeader">
        <div>
          <p className="eyebrow">CROISSANCE COMPARÉE</p>
          <h2>Les groupes à âge équivalent</h2>
          <p>Chaque mois correspond à une tranche de 30 jours depuis l’ouverture du groupe.</p>
        </div>
        <div className="maturityControls">
          <label><span>Indicateur</span><select value={metric} onChange={(event) => setMetric(event.target.value as Metric)}>{METRICS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label><span>Horizon</span><select value={horizon} onChange={(event) => setHorizon(Number(event.target.value))}><option value={6}>6 mois</option><option value={12}>12 mois</option><option value={24}>24 mois</option></select></label>
        </div>
      </div>
      {!series.length ? <p className="chartEmpty">Les dates de création des groupes ne sont pas encore renseignées.</p> : (
        <>
          <div className="maturityLegend">{series.map((group, index) => <span key={group.id}><i style={{ background: COLORS[index % COLORS.length] }} />{group.name}</span>)}</div>
          <svg className="maturityChart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Comparaison de la croissance des groupes à âge équivalent">
            {[0, .25, .5, .75, 1].map((ratio) => {
              const value = max * (1 - ratio);
              const gridY = padding.top + ratio * (height - padding.top - padding.bottom);
              return <g key={ratio}><line x1={padding.left} x2={width - padding.right} y1={gridY} y2={gridY} className="gridLine" /><text x={padding.left - 10} y={gridY + 4} textAnchor="end">{format(value)}</text></g>;
            })}
            {series.map((group, index) => {
              const points = group.points.slice(0, horizon);
              const color = COLORS[index % COLORS.length];
              return <g key={group.id}>
                {points.length > 1 && <polyline fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={points.map((point) => `${x(point.month)},${y(point[metric])}`).join(" ")} />}
                {points.map((point) => <circle key={point.month} cx={x(point.month)} cy={y(point[metric])} r="4" fill={color}><title>{group.name} · M{point.month} · {format(point[metric])}</title></circle>)}
              </g>;
            })}
            {Array.from({ length: horizon }, (_, index) => index + 1).map((month) => (month === 1 || month === horizon || month % (horizon === 24 ? 3 : 2) === 0) && <text key={month} x={x(month)} y={height - 13} textAnchor="middle">M{month}</text>)}
          </svg>
        </>
      )}
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { PrintButton } from "@/app/components/print-button";
import { getPilotageAccess } from "@/lib/auth/access";
import { getDashboardData } from "@/lib/services/dashboard";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("fr-FR");
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function monthRange(value: string) {
  const [year, month] = value.split("-").map(Number);
  const start = `${value}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start, end: `${value}-${String(lastDay).padStart(2, "0")}` };
}

function variation(current: number, previous: number) {
  if (!previous) return null;
  return (current - previous) / Math.abs(previous);
}

export default async function MonthlyReport({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const requestHeaders = await headers();
  const access = await getPilotageAccess(requestHeaders.get("cf-access-jwt-assertion"));
  if (access.role !== "network") return <main className="accessDenied"><section><h1>Accès non autorisé</h1><p>Ce rapport est réservé à la tête de réseau.</p></section></main>;

  const today = new Date();
  const defaultMonth = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
  const rawMonth = typeof params.month === "string" ? params.month : defaultMonth;
  const month = MONTH_PATTERN.test(rawMonth) ? rawMonth : defaultMonth;
  const range = monthRange(month);
  const data = await getDashboardData("custom", "all", range);
  const label = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  const topRevenue = [...data.groups].sort((a, b) => b.revenueWon - a.revenueWon)[0];
  const topActivity = [...data.groups].sort((a, b) => b.opportunitiesSent - a.opportunitiesSent)[0];
  const criticalGroups = data.networkHealth.filter((group) => group.status === "alert");
  const previous = data.previousKpis;
  const summary = [
    { label: "CA gagné", value: euro.format(data.kpis.revenueWon), change: variation(data.kpis.revenueWon, previous?.revenueWon ?? 0) },
    { label: "Affaires envoyées", value: number.format(data.kpis.opportunitiesSent), change: variation(data.kpis.opportunitiesSent, previous?.opportunitiesSent ?? 0) },
    { label: "Affaires gagnées", value: number.format(data.kpis.opportunitiesWon), change: variation(data.kpis.opportunitiesWon, previous?.opportunitiesWon ?? 0) },
    { label: "Taux de closing", value: percent.format(data.kpis.closingRate), change: variation(data.kpis.closingRate, previous?.closingRate ?? 0) }
  ];

  return (
    <main className="monthlyReport">
      <header className="reportHeader">
        <div className="reportBrand"><Image src="/brand/batimatch-mark.png" alt="" width={54} height={54} /><div><strong>Bâtimatch</strong><span>Pilotage réseau</span></div></div>
        <div className="reportActions"><Link href="/">Retour au tableau de bord</Link><PrintButton /></div>
      </header>

      <section className="reportTitle">
        <div><p className="eyebrow">RAPPORT MENSUEL</p><h1>{label}</h1><p>Vue de synthèse destinée à la tête de réseau.</p></div>
        <form method="get"><label><span>Mois observé</span><input type="month" name="month" defaultValue={month} /></label><button type="submit">Afficher</button></form>
      </section>

      <section className="reportSummary">
        {summary.map((item) => <article key={item.label}><span>{item.label}</span><strong>{item.value}</strong>{item.change !== null && <small className={item.change >= 0 ? "positive" : "negative"}>{item.change >= 0 ? "+" : ""}{percent.format(item.change)} vs mois précédent</small>}</article>)}
      </section>

      <section className="reportHighlights">
        <article><p className="eyebrow">FAITS MARQUANTS</p><h2>À retenir</h2><ul><li><strong>{topRevenue?.name ?? "—"}</strong> arrive en tête avec {euro.format(topRevenue?.revenueWon ?? 0)} de CA gagné.</li><li><strong>{topActivity?.name ?? "—"}</strong> est le groupe le plus donneur avec {number.format(topActivity?.opportunitiesSent ?? 0)} affaires envoyées.</li><li><strong>{number.format(data.kpis.pendingTreatment)}</strong> affaires sont encore en attente de première prise en charge.</li></ul></article>
        <article><p className="eyebrow">VIGILANCE</p><h2>Groupes à accompagner</h2>{criticalGroups.length ? <ul>{criticalGroups.map((group) => <li key={group.id}><strong>{group.name}</strong> — vigilance {group.score}/100, {group.pendingTreatment} affaire(s) à traiter.</li>)}</ul> : <p className="reportEmpty">Aucun groupe en alerte.</p>}</article>
      </section>

      <section className="reportSection">
        <div><p className="eyebrow">PERFORMANCE</p><h2>Résultats par groupe</h2></div>
        <div className="tableWrap"><table><thead><tr><th>Groupe</th><th>Actifs</th><th>Envoyées</th><th>Reçues</th><th>Gagnées</th><th>Closing</th><th>CA gagné</th><th>Pipeline</th></tr></thead><tbody>{data.groups.map((group) => {
          const health = data.networkHealth.find((item) => item.id === group.id);
          return <tr key={group.id}><td><strong>{group.name}</strong></td><td>{health?.activeMembers ?? group.memberCount}</td><td>{group.opportunitiesSent}</td><td>{group.opportunitiesReceived}</td><td>{group.wonOpportunities}</td><td>{percent.format(group.closingRate)}</td><td>{euro.format(group.revenueWon)}</td><td>{euro.format(group.pipelineValue)}</td></tr>;
        })}</tbody></table></div>
      </section>

      <section className="reportSection">
        <div><p className="eyebrow">OBJECTIFS</p><h2>Suivi des objectifs</h2></div>
        <div className="tableWrap"><table><thead><tr><th>Groupe</th><th>CA mensuel</th><th>Affaires mensuelles</th><th>Volume transmis</th><th>Nouveaux adhérents annuels</th></tr></thead><tbody>{data.groupObjectives.map((group) => <tr key={group.id}><td><strong>{group.name}</strong></td><td>{euro.format(group.monthlyRevenue.actual)} / {group.monthlyRevenue.target ? euro.format(group.monthlyRevenue.target) : "—"}</td><td>{group.monthlyOpportunities.actual} / {group.monthlyOpportunities.target || "—"}</td><td>{euro.format(group.monthlySentVolume.actual)} / {group.monthlySentVolume.target ? euro.format(group.monthlySentVolume.target) : "—"}</td><td>{group.annualNewMembers.actual} / {group.annualNewMembers.target || "—"}</td></tr>)}</tbody></table></div>
      </section>

      <footer className="reportFooter">Rapport généré depuis Bâtimatch Pilotage · Données Airtable au moment de l’ouverture</footer>
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { getPilotageAccess } from "@/lib/auth/access";
import { getFinanceData } from "@/lib/services/finance";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("fr-FR");
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PERIODS = [
  { value: "month", label: "Mois en cours" },
  { value: "previous-month", label: "Mois dernier" },
  { value: "30d", label: "30 derniers jours" },
  { value: "90d", label: "90 derniers jours" },
  { value: "year", label: "Année en cours" },
  { value: "all", label: "Depuis le début" },
  { value: "custom", label: "Plage personnalisée" }
] as const;
type FinancePeriod = typeof PERIODS[number]["value"];

function parseDate(value: unknown) {
  return typeof value === "string" && DATE_PATTERN.test(value) ? value : "";
}

function getRange(period: FinancePeriod, startValue: string, endValue: string) {
  const now = new Date();
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + 1);
  end.setUTCHours(0, 0, 0, 0);
  if (period === "all") return { start: null, end: null };
  if (period === "custom") {
    const start = startValue ? new Date(`${startValue}T00:00:00Z`) : null;
    const customEnd = endValue ? new Date(`${endValue}T00:00:00Z`) : null;
    if (customEnd) customEnd.setUTCDate(customEnd.getUTCDate() + 1);
    return { start, end: customEnd };
  }
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  if (period === "month") start.setUTCDate(1);
  else if (period === "previous-month") {
    start.setUTCMonth(start.getUTCMonth() - 1, 1);
    end.setUTCFullYear(now.getUTCFullYear(), now.getUTCMonth(), 1);
  }
  else if (period === "year") start.setUTCMonth(0, 1);
  else start.setUTCDate(start.getUTCDate() - (period === "90d" ? 89 : 29));
  return { start, end };
}

export default async function FinancesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const access = await getPilotageAccess((await headers()).get("cf-access-jwt-assertion"));
  if (access.role !== "network") return <main className="accessDenied"><section><h1>Accès non autorisé</h1><p>Les données financières sont réservées à la tête de réseau.</p></section></main>;

  const params = await searchParams;
  const requestedPeriod = typeof params.period === "string" ? params.period : "30d";
  const period: FinancePeriod = PERIODS.some((item) => item.value === requestedPeriod) ? requestedPeriod as FinancePeriod : "30d";
  const startDate = parseDate(params.start);
  const endDate = parseDate(params.end);
  const data = await getFinanceData(getRange(period, startDate, endDate));
  const periodLabel = period === "custom" && startDate && endDate ? `Du ${new Date(`${startDate}T00:00:00Z`).toLocaleDateString("fr-FR")} au ${new Date(`${endDate}T00:00:00Z`).toLocaleDateString("fr-FR")}` : PERIODS.find((item) => item.value === period)?.label;
  const contributionsDue = data.contributions - data.contributionsPaid;
  const commissionsDue = data.commissions - data.commissionsPaid;
  const generatedRevenue = data.memberships + data.contributions;

  return <main className="financePage">
    <header className="financeHeader">
      <div className="reportBrand"><Image src="/brand/batimatch-mark.png" alt="" width={54} height={54} /><div><strong>Bâtimatch</strong><span>Finance réseau</span></div></div>
      <Link href="/">Retour au tableau de bord</Link>
    </header>

    <section className="financeHero">
      <div><p className="eyebrow">PILOTAGE FINANCIER</p><h1>Finances du réseau</h1><p>Adhésions signées et flux issus des affaires gagnées.</p></div>
      <form method="get" className="financeFilters">
        <label><span>Période observée</span><select name="period" defaultValue={period}>{PERIODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label><span>Du</span><input type="date" name="start" defaultValue={startDate} /></label>
        <label><span>Au</span><input type="date" name="end" defaultValue={endDate} /></label>
        <button type="submit">Afficher</button>
      </form>
    </section>

    <section className="financePeriod"><span>Période :</span><strong>{periodLabel}</strong></section>

    <section className="financeRevenueHero">
      <div><span>CA généré</span><strong>{euro.format(generatedRevenue)}</strong><small>adhésions + rétributions générées sur la période</small></div>
      <div><span>Adhésions / cotisations</span><strong>{euro.format(data.memberships)}</strong><small>{number.format(data.membershipCount)} cotisation{data.membershipCount > 1 ? "s" : ""}</small></div>
      <div><span>Rétributions</span><strong>{euro.format(data.contributions)}</strong><small>issues des affaires gagnées</small></div>
    </section>

    <section className="financeKpis">
      <article><span>Cotisations à facturer</span><strong>{euro.format(data.membershipsToInvoice)}</strong><small>{number.format(data.membershipsToInvoiceCount)} dossier{data.membershipsToInvoiceCount > 1 ? "s" : ""} « En attente »</small></article>
      <article><span>Rétributions à facturer</span><strong>{euro.format(data.contributionsToInvoice)}</strong><small>statut Airtable « À facturer »</small></article>
      <article><span>Rétributions à encaisser</span><strong>{euro.format(contributionsDue)}</strong><small>{euro.format(data.contributionsPaid)} encaissés</small></article>
      <article><span>Commissions à provisionner</span><strong>{euro.format(commissionsDue)}</strong><small>dont {euro.format(data.membershipCommissions)} pour les présidents</small></article>
      <article><span>Solde net à venir</span><strong>{euro.format(data.membershipsToInvoice + contributionsDue - commissionsDue)}</strong><small>cotisations et rétributions moins commissions</small></article>
    </section>

    <section className="financeAlerts">
      <article><p className="eyebrow">EN RETARD</p><h2>Rétributions</h2><strong>{euro.format(data.overdueContributions)}</strong><span>{number.format(data.overdueContributionCount)} dossier{data.overdueContributionCount > 1 ? "s" : ""} arrivé{data.overdueContributionCount > 1 ? "s" : ""} à échéance</span></article>
      <article><p className="eyebrow">À RÉGLER</p><h2>Commissions</h2><strong>{euro.format(data.overdueCommissions)}</strong><span>{number.format(data.overdueCommissionCount)} dossier{data.overdueCommissionCount > 1 ? "s" : ""} arrivé{data.overdueCommissionCount > 1 ? "s" : ""} à échéance</span></article>
    </section>

    <section className="financeTablePanel">
      <div><p className="eyebrow">VENTILATION</p><h2>Situation par groupe</h2></div>
      <div className="tableWrap"><table><thead><tr><th>Groupe</th><th>Cotisations générées</th><th>Commission président</th><th>Rétributions générées</th><th>À encaisser</th><th>Commissions totales</th><th>À provisionner</th><th>Solde net généré</th></tr></thead><tbody>
        {data.groups.map((group) => { const contributionsLeft = group.contributions - group.contributionsPaid; const commissionsLeft = group.commissions - group.commissionsPaid; return <tr key={group.id}><td><strong>{group.name}</strong></td><td>{euro.format(group.memberships)} <small>({group.membershipCount})</small></td><td>{euro.format(group.membershipCommissions)}</td><td>{euro.format(group.contributions)}</td><td>{euro.format(contributionsLeft)}</td><td>{euro.format(group.commissions)}</td><td>{euro.format(commissionsLeft)}</td><td><strong>{euro.format(group.memberships + group.contributions - group.commissions)}</strong></td></tr>; })}
        {!data.groups.length && <tr><td colSpan={8} className="empty">Aucun mouvement financier sur cette période.</td></tr>}
      </tbody></table></div>
    </section>
    <p className="financeNote">Les cotisations sont encaissées à 100 % par Bâtimatch et génèrent une commission de 50 % au président du groupe. Les dossiers « En attente » sont à facturer et les dossiers annulés sont exclus. Le montant final Airtable est utilisé en priorité, puis le montant de base ; à défaut, le tarif standard de 400 € est appliqué. Faute de statut de reversement dans Airtable, les commissions président sont présentées comme des montants à provisionner.</p>
  </main>;
}

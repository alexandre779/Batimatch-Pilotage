import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { getPilotageAccess } from "@/lib/auth/access";
import { getFinanceData } from "@/lib/services/finance";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("fr-FR");
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function FinancesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const access = await getPilotageAccess((await headers()).get("cf-access-jwt-assertion"));
  if (access.role !== "network") return <main className="accessDenied"><section><h1>Accès non autorisé</h1><p>Les données financières sont réservées à la tête de réseau.</p></section></main>;

  const params = await searchParams;
  const now = new Date();
  const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const requestedMonth = typeof params.month === "string" ? params.month : currentMonth;
  const month = MONTH_PATTERN.test(requestedMonth) ? requestedMonth : currentMonth;
  const data = await getFinanceData(month);
  const label = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  const contributionsDue = data.contributions - data.contributionsPaid;
  const commissionsDue = data.commissions - data.commissionsPaid;

  return <main className="financePage">
    <header className="financeHeader">
      <div className="reportBrand"><Image src="/brand/batimatch-mark.png" alt="" width={54} height={54} /><div><strong>Bâtimatch</strong><span>Finance réseau</span></div></div>
      <Link href="/">Retour au tableau de bord</Link>
    </header>

    <section className="financeHero">
      <div><p className="eyebrow">PILOTAGE FINANCIER</p><h1>Finances du réseau</h1><p>Adhésions signées et flux issus des affaires gagnées.</p></div>
      <form method="get"><label><span>Mois observé</span><input type="month" name="month" defaultValue={month} /></label><button type="submit">Afficher</button></form>
    </section>

    <section className="financePeriod"><span>Échéances de</span><strong>{label}</strong></section>

    <section className="financeKpis">
      <article className="featured"><span>Adhésions signées</span><strong>{euro.format(data.memberships)}</strong><small>{number.format(data.membershipCount)} adhésion{data.membershipCount > 1 ? "s" : ""}</small></article>
      <article><span>Rétributions à encaisser</span><strong>{euro.format(contributionsDue)}</strong><small>{euro.format(data.contributionsPaid)} encaissés</small></article>
      <article><span>Commissions à payer</span><strong>{euro.format(commissionsDue)}</strong><small>{euro.format(data.commissionsPaid)} payés</small></article>
      <article><span>Solde net à venir</span><strong>{euro.format(contributionsDue - commissionsDue)}</strong><small>rétributions moins commissions</small></article>
    </section>

    <section className="financeAlerts">
      <article><p className="eyebrow">EN RETARD</p><h2>Rétributions</h2><strong>{euro.format(data.overdueContributions)}</strong><span>{number.format(data.overdueContributionCount)} dossier{data.overdueContributionCount > 1 ? "s" : ""} arrivé{data.overdueContributionCount > 1 ? "s" : ""} à échéance</span></article>
      <article><p className="eyebrow">À RÉGLER</p><h2>Commissions</h2><strong>{euro.format(data.overdueCommissions)}</strong><span>{number.format(data.overdueCommissionCount)} dossier{data.overdueCommissionCount > 1 ? "s" : ""} arrivé{data.overdueCommissionCount > 1 ? "s" : ""} à échéance</span></article>
    </section>

    <section className="financeTablePanel">
      <div><p className="eyebrow">VENTILATION</p><h2>Situation par groupe</h2></div>
      <div className="tableWrap"><table><thead><tr><th>Groupe</th><th>Adhésions signées</th><th>Rétributions générées</th><th>À encaisser</th><th>Commissions générées</th><th>À payer</th><th>Solde net</th></tr></thead><tbody>
        {data.groups.map((group) => { const contributionsLeft = group.contributions - group.contributionsPaid; const commissionsLeft = group.commissions - group.commissionsPaid; return <tr key={group.id}><td><strong>{group.name}</strong></td><td>{euro.format(group.memberships)} <small>({group.membershipCount})</small></td><td>{euro.format(group.contributions)}</td><td>{euro.format(contributionsLeft)}</td><td>{euro.format(group.commissions)}</td><td>{euro.format(commissionsLeft)}</td><td><strong>{euro.format(contributionsLeft - commissionsLeft)}</strong></td></tr>; })}
        {!data.groups.length && <tr><td colSpan={7} className="empty">Aucun mouvement financier sur ce mois.</td></tr>}
      </tbody></table></div>
    </section>
    <p className="financeNote">Les adhésions sont rattachées au mois de signature. Les rétributions et commissions sont rattachées à leur date d’échéance Airtable.</p>
  </main>;
}

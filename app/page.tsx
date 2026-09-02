import Image from "next/image";
import { headers } from "next/headers";
import { getDashboardData, type DashboardPeriod } from "@/lib/services/dashboard";
import { getPilotageAccess } from "@/lib/auth/access";
import { DashboardFilters } from "@/app/components/dashboard-filters";
import { TrendChart } from "@/app/components/trend-chart";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("fr-FR");
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: "30d", label: "30 derniers jours" },
  { value: "90d", label: "90 derniers jours" },
  { value: "year", label: "Année en cours" },
  { value: "all", label: "Depuis le début" },
  { value: "custom", label: "Plage personnalisée" }
];

function dateParam(value: string | string[] | undefined) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function formatDateRange(start: string, end: string) {
  if (!start || !end) return "Plage personnalisée";
  const formatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  return `${formatter.format(new Date(`${start}T00:00:00Z`))} – ${formatter.format(new Date(`${end}T00:00:00Z`))}`;
}

function Kpi({ label, value, hint, current, previous, inverse = false, featured = false }: { label: string; value: string; hint?: string; current?: number; previous?: number; inverse?: boolean; featured?: boolean }) {
  const change = previous && current !== undefined ? (current - previous) / Math.abs(previous) : null;
  const positive = change !== null && (inverse ? change <= 0 : change >= 0);
  return (
    <article className={`kpi${featured ? " kpiFeatured" : ""}`}>
      <div>
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      <div className="kpiValue"><strong>{value}</strong>{change !== null && <small className={positive ? "delta positive" : "delta negative"}>{change >= 0 ? "+" : ""}{percent.format(change)}</small>}</div>
    </article>
  );
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function scalar(value: string | string[] | undefined, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestHeaders = await headers();
  let access: Awaited<ReturnType<typeof getPilotageAccess>>;
  try {
    access = await getPilotageAccess(requestHeaders.get("cf-access-jwt-assertion"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Accès non autorisé";
    return <main className="accessDenied"><section><Image src="/brand/batimatch-mark.png" alt="" width={64} height={64} /><h1>Accès non autorisé</h1><p>{message}</p></section></main>;
  }
  const requestedGroupId = scalar(params.group, "all");
  const groupId = access.role === "president" ? access.groupId ?? "all" : requestedGroupId;
  const rawPeriod = scalar(params.period, "30d");
  const period: DashboardPeriod = PERIODS.some((p) => p.value === rawPeriod)
    ? (rawPeriod as DashboardPeriod)
    : "30d";
  const startDate = dateParam(params.start);
  const endDate = dateParam(params.end);

  let data: Awaited<ReturnType<typeof getDashboardData>> | null = null;
  let dataError: string | null = null;

  try {
    data = await getDashboardData(period, groupId, period === "custom" ? { start: startDate, end: endDate } : undefined);
  } catch (error) {
    dataError = error instanceof Error ? error.message : "Erreur inconnue lors du chargement Airtable";
  }

  const groups = data?.groups ?? [];
  const kpis = data?.kpis;
  const previous = data?.previousKpis;
  const visibleGroups = groupId === "all" ? groups : groups.filter((group) => group.id === groupId);
  const periodLabel = period === "custom"
    ? formatDateRange(startDate, endDate)
    : PERIODS.find((p) => p.value === period)?.label ?? "30 derniers jours";
  const scopeLabel = data?.selectedGroupName ?? "Réseau national";

  return (
    <main className="dashboard">
      <section className="hero">
        <header className="brandbar">
          <div className="brand">
            <span className="brandMark"><Image src="/brand/batimatch-mark.png" alt="" width={48} height={48} priority /></span>
            <span>Bâtimatch</span>
          </div>
          <p>Le réseau business des pros du bâtiment</p>
        </header>
        <div className="heroContent">
          <div>
            <p className="eyebrow eyebrowLight">PILOTAGE RÉSEAU</p>
            <h1>La performance<br />en un coup d’œil.</h1>
            <p className="subtitle subtitleLight">{scopeLabel} · {periodLabel}</p>
          </div>
          <div className="heroAccent" aria-hidden="true">B</div>
        </div>
      </section>

      <div className="content">
        <DashboardFilters
          groups={groups}
          periods={PERIODS}
          selectedGroupId={groupId}
          selectedPeriod={period}
          selectedGroupName={scopeLabel}
          canSelectGroup={access.role === "network"}
          startDate={startDate}
          endDate={endDate}
        />

        {dataError && (
        <section className="notice">
          Erreur de connexion Airtable : {dataError}
        </section>
        )}

        <section className="sectionBlock">
          <div className="sectionHeading">
            <div><p className="eyebrow">L’ESSENTIEL</p><h2>Résultats business</h2></div>
            {period !== "all" && <span className="comparisonNote">Évolution vs période précédente</span>}
          </div>
          <div className="kpis kpisPrimary">
            <Kpi featured label="CA gagné" value={euro.format(kpis?.revenueWon ?? 0)} hint="devis HT gagnés" current={kpis?.revenueWon} previous={previous?.revenueWon} />
            <Kpi featured label="Taux de closing" value={percent.format(kpis?.closingRate ?? 0)} hint="gagnées / affaires conclues" current={kpis?.closingRate} previous={previous?.closingRate} />
            <Kpi featured label="Devis → commande" value={percent.format(kpis?.quoteConversionRate ?? 0)} hint="gagnées / devis remis" current={kpis?.quoteConversionRate} previous={previous?.quoteConversionRate} />
            <Kpi featured label="Affaires gagnées" value={number.format(kpis?.opportunitiesWon ?? 0)} current={kpis?.opportunitiesWon} previous={previous?.opportunitiesWon} />
            <Kpi featured label="Pipeline ouvert" value={euro.format(kpis?.pipelineValue ?? 0)} hint={`${number.format(kpis?.openOpportunities ?? 0)} affaire(s) en cours`} />
          </div>
        </section>

        <section className="sectionBlock">
          <div className="sectionHeading"><div><p className="eyebrow">DYNAMIQUE</p><h2>Activité du réseau</h2></div></div>
          <div className="kpis kpisSecondary">
            <Kpi label="Membres actifs" value={number.format(kpis?.activeMembers ?? 0)} />
            <Kpi label="Opportunités envoyées" value={number.format(kpis?.opportunitiesSent ?? 0)} current={kpis?.opportunitiesSent} previous={previous?.opportunitiesSent} />
            <Kpi label="Opportunités reçues" value={number.format(kpis?.opportunitiesReceived ?? 0)} current={kpis?.opportunitiesReceived} previous={previous?.opportunitiesReceived} />
            <Kpi label="Affaires perdues" value={number.format(kpis?.opportunitiesLost ?? 0)} current={kpis?.opportunitiesLost} previous={previous?.opportunitiesLost} inverse />
            <Kpi label="Délai de conclusion" value={`${number.format(Math.round(kpis?.averageCloseDays ?? 0))} j`} hint="moyenne des affaires conclues" current={kpis?.averageCloseDays} previous={previous?.averageCloseDays} inverse />
          </div>
        </section>

        {data && <section className="charts">
        <TrendChart eyebrow="ACTIVITÉ" title="Opportunités dans le temps" points={data.trends} series={[
          { key: "sent", label: "Envoyées", color: "#102f4f" },
          { key: "received", label: "Reçues", color: "#f18748" },
          { key: "won", label: "Gagnées", color: "#55a182" }
        ]} />
        <TrendChart eyebrow="REVENU" title="CA gagné dans le temps" points={data.trends} series={[
          { key: "revenueWon", label: "CA gagné", color: "#f18748" }
        ]} formatValue={(value) => euro.format(value)} />
        </section>}

        <section className="panel">
        <div className="panelTitle">
          <div>
            <p className="eyebrow">GROUPES</p>
            <h2>{groupId === "all" ? "Performance du réseau" : "Performance du groupe"}</h2>
          </div>
          <span>{visibleGroups.length} groupe{visibleGroups.length > 1 ? "s" : ""}</span>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Groupe</th>
                <th>Membres</th>
                <th>Envoyées</th>
                <th>Reçues</th>
                <th>Gagnées</th>
                <th>Déclinées</th>
                <th>Closing</th>
                <th>Devis → commande</th>
                <th>CA gagné</th>
                <th>Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {visibleGroups.map((group) => (
                <tr key={group.id}>
                  <td><strong>{group.name || "Sans nom"}</strong></td>
                  <td>{number.format(group.memberCount)}</td>
                  <td>{number.format(group.opportunitiesSent)}</td>
                  <td>{number.format(group.opportunitiesReceived)}</td>
                  <td>{number.format(group.wonOpportunities)}</td>
                  <td>{number.format(group.declinedOpportunities)}</td>
                  <td>{percent.format(group.closingRate)}</td>
                  <td>{percent.format(group.quoteConversionRate)}</td>
                  <td>{euro.format(group.revenueWon)}</td>
                  <td>{euro.format(group.pipelineValue)}</td>
                </tr>
              ))}
              {!visibleGroups.length && <tr><td colSpan={10} className="empty">Aucune donnée disponible sur ce périmètre.</td></tr>}
            </tbody>
          </table>
        </div>
        </section>
        <footer>Des pros du BTP qui se ressemblent et qui bossent ensemble.</footer>
      </div>
    </main>
  );
}

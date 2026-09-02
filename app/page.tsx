import { getDashboardData, type DashboardPeriod } from "@/lib/services/dashboard";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("fr-FR");
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: "30d", label: "30 derniers jours" },
  { value: "90d", label: "90 derniers jours" },
  { value: "year", label: "Année en cours" },
  { value: "all", label: "Depuis le début" }
];

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="kpi">
      <div>
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      <strong>{value}</strong>
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
  const groupId = scalar(params.group, "all");
  const rawPeriod = scalar(params.period, "30d");
  const period: DashboardPeriod = PERIODS.some((p) => p.value === rawPeriod)
    ? (rawPeriod as DashboardPeriod)
    : "30d";

  let data: Awaited<ReturnType<typeof getDashboardData>> | null = null;
  let dataError = false;

  try {
    data = await getDashboardData(period, groupId);
  } catch {
    dataError = true;
  }

  const groups = data?.groups ?? [];
  const kpis = data?.kpis;
  const visibleGroups = groupId === "all" ? groups : groups.filter((group) => group.id === groupId);
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? "30 derniers jours";
  const scopeLabel = data?.selectedGroupName ?? "Réseau national";

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">BATIMATCH</p>
          <h1>Pilotage réseau</h1>
          <p className="subtitle">{scopeLabel} · {periodLabel}</p>
        </div>
        <form className="filters" method="get">
          <select aria-label="Groupe" name="group" defaultValue={groupId}>
            <option value="all">Tous les groupes</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
          <select aria-label="Période" name="period" defaultValue={period}>
            {PERIODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <button type="submit">Appliquer</button>
        </form>
      </header>

      {dataError && (
        <section className="notice">
          La connexion Airtable est prête. Il manque AIRTABLE_TOKEN dans l’environnement de déploiement pour afficher les données réelles.
        </section>
      )}

      <section className="kpis">
        <Kpi label="Membres actifs" value={number.format(kpis?.activeMembers ?? 0)} />
        <Kpi label="Opportunités envoyées" value={number.format(kpis?.opportunitiesSent ?? 0)} hint="groupe du donneur" />
        <Kpi label="Opportunités reçues" value={number.format(kpis?.opportunitiesReceived ?? 0)} hint="groupe du receveur" />
        <Kpi label="Affaires gagnées" value={number.format(kpis?.opportunitiesWon ?? 0)} />
        <Kpi label="CA gagné" value={euro.format(kpis?.revenueWon ?? 0)} hint="devis HT gagnés" />
        <Kpi label="Valeur du pipeline" value={euro.format(kpis?.pipelineValue ?? 0)} />
        <Kpi label="Volume reçu" value={euro.format(kpis?.receivedVolume ?? 0)} />
        <Kpi label="Transformation" value={percent.format(kpis?.conversionRate ?? 0)} hint="gagnées / reçues acceptées" />
      </section>

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
                <th>Taux transfo.</th>
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
                  <td>{percent.format(group.conversionRate)}</td>
                  <td>{euro.format(group.revenueWon)}</td>
                  <td>{euro.format(group.pipelineValue)}</td>
                </tr>
              ))}
              {!visibleGroups.length && <tr><td colSpan={9} className="empty">Aucune donnée disponible sur ce périmètre.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

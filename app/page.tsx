import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { getDashboardData, type DashboardPeriod, type LeaderboardEntry } from "@/lib/services/dashboard";
import { getPilotageAccess } from "@/lib/auth/access";
import { DashboardFilters } from "@/app/components/dashboard-filters";
import { TrendChart } from "@/app/components/trend-chart";
import { MaturityChart } from "@/app/components/maturity-chart";
import { NetworkPilotage } from "@/app/components/network-pilotage";
import { GroupDetail } from "@/app/components/group-detail";
import { PresidentCoach } from "@/app/components/president-coach";
import { GroupBalance } from "@/app/components/group-balance";
import { GoalSimulator } from "@/app/components/goal-simulator";
import { CollapsibleBlock } from "@/app/components/collapsible-block";

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

function Podium({ title, subtitle, entries, metric, amountLabel = "gagnés" }: { title: string; subtitle: string; entries: LeaderboardEntry[]; metric: "count" | "amount"; amountLabel?: string }) {
  if (!entries.length) {
    return (
      <article className="podiumCard">
        <div className="podiumHeader"><h3>{title}</h3><p>{subtitle}</p></div>
        <p className="podiumEmpty">Aucune affaire sur cette période.</p>
      </article>
    );
  }

  const places = [entries[1], entries[0], entries[2]].filter((entry): entry is LeaderboardEntry => Boolean(entry));
  return (
    <article className="podiumCard">
      <div className="podiumHeader"><h3>{title}</h3><p>{subtitle}</p></div>
      <ol className="podiumList">
        {places.map((entry) => {
          const rank = entries.findIndex((candidate) => candidate.id === entry.id) + 1;
          return (
            <li className={`podiumPlace podiumRank${rank}`} key={entry.id}>
              <div className="podiumPerson">
                <span className="podiumMedal" aria-label={`${rank}${rank === 1 ? "er" : "e"}`}>{rank}</span>
                <strong>{entry.name}</strong>
                <small>{metric === "count" ? euro.format(entry.amount) : `${number.format(entry.count)} ${entry.count === 1 ? "affaire" : "affaires"}`}</small>
              </div>
              <div className="podiumStep"><strong>{metric === "count" ? number.format(entry.count) : euro.format(entry.amount)}</strong><small>{metric === "count" ? (entry.count === 1 ? "affaire" : "affaires") : amountLabel}</small></div>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

function PerformanceTable({ groups, accessRole, groupHref }: { groups: Awaited<ReturnType<typeof getDashboardData>>["groups"]; accessRole: "network" | "president"; groupHref: (id: string) => string }) {
  return <table><thead><tr><th>Groupe</th><th>Membres</th><th>Envoyées</th><th>Reçues</th><th>Gagnées</th><th>Déclinées</th><th>Closing</th><th>Devis → commande</th><th>CA gagné</th><th>Pipeline</th></tr></thead><tbody>
    {groups.map((group) => <tr key={group.id}><td>{accessRole === "network" ? <Link className="groupTableLink" href={groupHref(group.id)}>{group.name || "Sans nom"}</Link> : <strong>{group.name || "Sans nom"}</strong>}</td><td>{number.format(group.memberCount)}</td><td>{number.format(group.opportunitiesSent)}</td><td>{number.format(group.opportunitiesReceived)}</td><td>{number.format(group.wonOpportunities)}</td><td>{number.format(group.declinedOpportunities)}</td><td>{percent.format(group.closingRate)}</td><td>{percent.format(group.quoteConversionRate)}</td><td>{euro.format(group.revenueWon)}</td><td>{euro.format(group.pipelineValue)}</td></tr>)}
    {!groups.length && <tr><td colSpan={10} className="empty">Aucune donnée disponible sur ce périmètre.</td></tr>}
  </tbody></table>;
}

function NetworkExecutiveOverview({ data, periodLabel }: { data: Awaited<ReturnType<typeof getDashboardData>>; periodLabel: string }) {
  const activeGroups = data.groups.filter((group) => group.memberCount > 0).length;
  const groupsToWatch = data.networkHealth.filter((group) => group.status !== "healthy").length;
  const revenueChange = data.previousKpis?.revenueWon
    ? (data.kpis.revenueWon - data.previousKpis.revenueWon) / Math.abs(data.previousKpis.revenueWon)
    : null;
  const trend = revenueChange === null
    ? "La dynamique du réseau se construit sur cette période."
    : revenueChange >= 0
      ? `Le chiffre d’affaires progresse de ${percent.format(revenueChange)} par rapport à la période précédente.`
      : `Le chiffre d’affaires recule de ${percent.format(Math.abs(revenueChange))} par rapport à la période précédente.`;
  const attention = groupsToWatch
    ? `${groupsToWatch} groupe${groupsToWatch > 1 ? "s nécessitent" : " nécessite"} actuellement une attention.`
    : "Tous les groupes présentent une situation opérationnelle saine.";

  return (
    <section className="networkExecutive" id="vue-ensemble">
      <div className="networkExecutiveHeader">
        <div><p className="eyebrow">VUE D’ENSEMBLE</p><h2>Le réseau en un coup d’œil</h2></div>
        <span>{periodLabel}</span>
      </div>
      <div className="networkExecutiveGrid">
        <article className="networkExecutiveKpi featured"><span>Chiffre d’affaires signé</span><strong>{euro.format(data.kpis.revenueWon)}</strong><small>devis HT gagnés</small></article>
        <article className="networkExecutiveKpi"><span>Affaires échangées</span><strong>{number.format(data.kpis.opportunitiesReceived)}</strong><small>opportunités reçues dans le réseau</small></article>
        <article className="networkExecutiveKpi"><span>Adhérents actifs</span><strong>{number.format(data.kpis.activeMembers)}</strong><small>membres actuellement actifs</small></article>
        <article className="networkExecutiveKpi"><span>Groupes actifs</span><strong>{number.format(activeGroups)}</strong><small>sur {number.format(data.groups.length)} groupe{data.groups.length > 1 ? "s" : ""}</small></article>
      </div>
      <div className={`networkExecutiveInsight${revenueChange !== null && revenueChange < 0 ? " watch" : ""}`}>
        <span aria-hidden="true">{revenueChange !== null && revenueChange < 0 ? "!" : "↗"}</span><p><strong>{trend}</strong> {attention}</p>
      </div>
    </section>
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
  const pendingTreatmentCount = access.role === "network"
    ? data?.pendingTreatmentByGroup.reduce((sum, group) => sum + group.count, 0) ?? 0
    : kpis?.pendingTreatment ?? 0;
  const visibleGroups = groupId === "all" ? groups : groups.filter((group) => group.id === groupId);
  const periodLabel = period === "custom"
    ? formatDateRange(startDate, endDate)
    : PERIODS.find((p) => p.value === period)?.label ?? "30 derniers jours";
  const scopeLabel = data?.selectedGroupName ?? "Réseau national";
  const selectedGroup = groupId === "all" ? null : groups.find((group) => group.id === groupId) ?? null;
  const firstName = access.name?.split(/[\s-]+/).find(Boolean) ?? null;
  const heroTitle = access.role === "president" ? `Bonjour${firstName ? ` ${firstName}` : ""} 👋` : `Bonjour${firstName ? ` ${firstName}` : ""}`;
  const groupHref = (id: string) => `/?group=${encodeURIComponent(id)}&period=${encodeURIComponent(period)}${period === "custom" ? `&start=${startDate}&end=${endDate}` : ""}#fiche-groupe`;
  const groupLinks = Object.fromEntries(groups.map((group) => [group.id, groupHref(group.id)]));
  const presentationHref = `/presentation?group=${encodeURIComponent(groupId)}&period=${encodeURIComponent(period === "custom" ? "30d" : period)}`;

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
            <p className="eyebrow eyebrowLight">{access.role === "president" ? "VOTRE PILOTAGE DU JOUR" : "PILOTAGE DU RÉSEAU"}</p>
            <h1>{heroTitle}</h1>
            <p className="heroPromise">{access.role === "president" ? `Voici ce qui mérite votre attention chez ${scopeLabel} aujourd’hui.` : "La performance nationale et les groupes à accompagner, en un coup d’œil."}</p>
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

        <nav className="dashboardNav" aria-label="Navigation dans le tableau de bord">
          {access.role === "network" ? <>
            <a href="#vue-ensemble">Vue d’ensemble</a>
            <a href="#pilotage">Groupes</a>
            <a href="#croissance">Croissance</a>
            <a href="#conversion">Conversion</a>
            <a href="#alertes">Alertes</a>
          </> : <>
            <a href="#priorites">Aujourd’hui</a>
            <a href="#resultats">Résultats</a>
            <a href="#objectif">Objectif</a>
            <a href="#equilibre">Équilibre</a>
            <a href="#detail">Détail</a>
          </>}
          {access.role === "president" && <Link className="meetingModeLink" href={presentationHref}>Présenter en réunion</Link>}
        </nav>

        {access.role === "network" && <div className="networkToolbar"><Link href="/rapport">Consulter le rapport mensuel</Link></div>}

        {dataError && (
        <section className="notice">
          Erreur de connexion Airtable : {dataError}
        </section>
        )}

        {access.role === "network" && data && <NetworkExecutiveOverview data={data} periodLabel={periodLabel} />}

        {data && (
          <section className="pendingActionCard" id="priorites" aria-label="Affaires en attente de traitement">
            <div>
              <p className="eyebrow">À TRAITER</p>
              <h2>Affaires en attente de prise en charge</h2>
              <p>Opportunités reçues qui nécessitent encore une première action.</p>
              <label className="pendingMemberSelect">
                <span>{access.role === "president" ? "Voir les adhérents concernés" : "Voir le détail par groupe"}</span>
                <select defaultValue="" aria-label={access.role === "president" ? "Adhérents ayant des affaires à traiter" : "Groupes ayant des affaires à traiter"}>
                  <option value="" disabled>{(access.role === "president" ? data.pendingTreatmentByMember : data.pendingTreatmentByGroup).length ? (access.role === "president" ? "Sélectionner un adhérent" : "Sélectionner un groupe") : "Aucune affaire en attente"}</option>
                  {(access.role === "president" ? data.pendingTreatmentByMember : data.pendingTreatmentByGroup).map((item) => (
                    <option value={item.id} key={item.id}>{item.name} — {item.count} {item.count > 1 ? "affaires" : "affaire"}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="pendingActionValue">
              <strong>{number.format(pendingTreatmentCount)}</strong>
              <span>{pendingTreatmentCount > 1 ? "affaires" : "affaire"}</span>
            </div>
          </section>
        )}

        {access.role === "president" && data && <PresidentCoach actions={data.presidentCoach} />}

        {access.role === "president" && data?.goalSimulator && <GoalSimulator simulator={data.goalSimulator} />}

        {access.role === "president" && data?.groupBalance && <div id="equilibre"><CollapsibleBlock eyebrow="ÉQUILIBRE DU GROUPE" title="Qui contribue, qui reçoit, qui remobiliser ?" hint="Lecture calculée sur la période sélectionnée."><GroupBalance balance={data.groupBalance} /></CollapsibleBlock></div>}

        <section className="sectionBlock" id="resultats">
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
          <div className="sectionHeading"><div><p className="eyebrow">DYNAMIQUE</p><h2>{access.role === "president" ? "Activité du groupe" : "Activité du réseau"}</h2></div></div>
          <div className="kpis kpisSecondary">
            <Kpi label="Membres actifs" value={number.format(kpis?.activeMembers ?? 0)} />
            <Kpi label="Opportunités envoyées" value={number.format(kpis?.opportunitiesSent ?? 0)} current={kpis?.opportunitiesSent} previous={previous?.opportunitiesSent} />
            <Kpi label="Opportunités reçues" value={number.format(kpis?.opportunitiesReceived ?? 0)} current={kpis?.opportunitiesReceived} previous={previous?.opportunitiesReceived} />
            <Kpi label="Affaires perdues" value={number.format(kpis?.opportunitiesLost ?? 0)} current={kpis?.opportunitiesLost} previous={previous?.opportunitiesLost} inverse />
            <Kpi label="Délai de conclusion" value={`${number.format(Math.round(kpis?.averageCloseDays ?? 0))} j`} hint="moyenne des affaires conclues" current={kpis?.averageCloseDays} previous={previous?.averageCloseDays} inverse />
          </div>
        </section>

        {data && (access.role === "president" ? <CollapsibleBlock eyebrow="ÉVOLUTION" title="Les résultats dans le temps" hint="Opportunités et chiffre d’affaires sur la période sélectionnée."><section className="charts">
        <TrendChart eyebrow="ACTIVITÉ" title="Opportunités dans le temps" points={data.trends} series={[
          { key: "sent", label: "Envoyées", color: "#102f4f" },
          { key: "received", label: "Reçues", color: "#f18748" },
          { key: "won", label: "Gagnées", color: "#55a182" }
        ]} />
        <TrendChart eyebrow="REVENU" title="CA gagné dans le temps" points={data.trends} series={[
          { key: "revenueWon", label: "CA gagné", color: "#f18748" }
        ]} formatValue={(value) => euro.format(value)} />
        </section></CollapsibleBlock> : <section className="charts">
          <TrendChart eyebrow="ACTIVITÉ" title="Opportunités dans le temps" points={data.trends} series={[{ key: "sent", label: "Envoyées", color: "#102f4f" }, { key: "received", label: "Reçues", color: "#f18748" }, { key: "won", label: "Gagnées", color: "#55a182" }]} />
          <TrendChart eyebrow="REVENU" title="CA gagné dans le temps" points={data.trends} series={[{ key: "revenueWon", label: "CA gagné", color: "#f18748" }]} formatValue={(value) => euro.format(value)} />
        </section>)}

        {access.role === "network" && data && <div id="croissance"><MaturityChart series={data.maturitySeries} /></div>}

        {access.role === "network" && data && <div id="pilotage"><NetworkPilotage data={data} groupLinks={groupLinks} /></div>}

        {access.role === "network" && data && selectedGroup && <GroupDetail group={selectedGroup} data={data} />}

        {access.role === "president" && data && (
          <section className="sectionBlock">
            <div className="sectionHeading">
              <div><p className="eyebrow">DÉVELOPPEMENT</p><h2>Recrutement du groupe</h2></div>
              <span className="comparisonNote">Sur la période sélectionnée</span>
            </div>
            <div className="kpis recruitmentKpis">
              <Kpi label="Nouveaux entrants" value={number.format(data.development.newMembers)} hint="selon la date de début du test" current={data.development.newMembers} previous={data.previousDevelopment?.newMembers} />
              <Kpi label="Invités" value={number.format(data.development.guests)} hint="invités aux événements du groupe" current={data.development.guests} previous={data.previousDevelopment?.guests} />
            </div>
          </section>
        )}

        {access.role === "president" && data && (
          <CollapsibleBlock eyebrow="CLASSEMENT" title="Les champions du groupe" hint="Sur la période sélectionnée">
            <div className="podiumGrid">
              <Podium title="Top donneurs — nombre" subtitle="Plus grand nombre d’affaires envoyées" entries={data.leaderboards.donorsByCount} metric="count" />
              <Podium title="Top donneurs — montant" subtitle="Plus fort montant d’affaires transmis" entries={data.leaderboards.donorsByAmount} metric="amount" amountLabel="transmis" />
              <Podium title="Top signeurs — nombre" subtitle="Plus grand nombre d’affaires gagnées" entries={data.leaderboards.signersByCount} metric="count" />
              <Podium title="Top signeurs — montant" subtitle="Plus fort chiffre d’affaires gagné" entries={data.leaderboards.signersByAmount} metric="amount" />
            </div>
          </CollapsibleBlock>
        )}

        <div id="detail">{access.role === "president" ? <CollapsibleBlock eyebrow="DONNÉES" title="Performance détaillée du groupe" hint="Tous les indicateurs consolidés dans un tableau."><section className="panel panelEmbedded"><div className="tableWrap"><PerformanceTable groups={visibleGroups} accessRole={access.role} groupHref={groupHref} /></div></section></CollapsibleBlock> : <section className="panel">
        <div className="panelTitle">
          <div>
            <p className="eyebrow">GROUPES</p>
            <h2>{groupId === "all" ? "Performance du réseau" : "Performance du groupe"}</h2>
          </div>
          <span>{visibleGroups.length} groupe{visibleGroups.length > 1 ? "s" : ""}</span>
        </div>
        <div className="tableWrap">
          <PerformanceTable groups={visibleGroups} accessRole={access.role} groupHref={groupHref} />
        </div>
        </section>}</div>
        <footer>Des pros du BTP qui se ressemblent et qui bossent ensemble.</footer>
      </div>
    </main>
  );
}

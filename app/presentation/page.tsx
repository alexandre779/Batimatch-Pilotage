import Image from "next/image";
import { headers } from "next/headers";
import { getPilotageAccess } from "@/lib/auth/access";
import { getDashboardData, type DashboardPeriod, type LeaderboardEntry } from "@/lib/services/dashboard";
import { PresentationControls } from "@/app/components/presentation-controls";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("fr-FR");
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });
const VALID_PERIODS = new Set<DashboardPeriod>(["30d", "90d", "year", "all"]);

function NetworkPresentation({ data, period, backHref }: { data: Awaited<ReturnType<typeof getDashboardData>>; period: DashboardPeriod; backHref: string }) {
  const activeGroups = data.groups.filter((group) => group.memberCount > 0).length;
  const watchGroups = data.networkHealth.filter((group) => group.status === "watch").length;
  const alertGroups = data.networkHealth.filter((group) => group.status === "alert").length;
  const topRevenue = [...data.groups].sort((a, b) => b.revenueWon - a.revenueWon).slice(0, 3);
  const topSent = [...data.groups].sort((a, b) => b.opportunitiesSent - a.opportunitiesSent).slice(0, 3);
  const maxRevenue = topRevenue[0]?.revenueWon || 1;
  const maturity = data.maturitySeries.map((series) => {
    const point = [...series.points].reverse().find((candidate) => candidate.revenue > 0 || candidate.opportunities > 0 || candidate.activeMembers > 0) ?? series.points[0];
    return { ...series, point };
  }).filter((series) => series.point);
  const maxMaturityRevenue = Math.max(1, ...maturity.map((series) => series.point?.revenue ?? 0));
  const revenueTarget = data.groupObjectives.reduce((sum, group) => sum + group.monthlyRevenue.target, 0);
  const revenueActual = data.groupObjectives.reduce((sum, group) => sum + group.monthlyRevenue.actual, 0);
  const targetProgress = revenueTarget ? revenueActual / revenueTarget : 0;
  const periodText = period === "30d" ? "30 derniers jours" : period === "90d" ? "90 derniers jours" : period === "year" ? "Année en cours" : "Depuis le début";
  const periodSentence = period === "year" ? "depuis le début de l’année" : period === "all" ? "depuis le lancement du réseau" : `sur les ${periodText.toLocaleLowerCase("fr-FR")}`;

  return <main className="presentationMode networkPresentationMode">
    <PresentationControls backHref={backHref} />
    <nav className="presentationDots" aria-label="Navigation de la présentation"><a href="#slide-1">1</a><a href="#slide-2">2</a><a href="#slide-3">3</a><a href="#slide-4">4</a><a href="#slide-5">5</a></nav>

    <section className="presentationSlide presentationIntro" id="slide-1">
      <header className="presentationBrand"><span><Image src="/brand/batimatch-mark.png" alt="" width={56} height={56} priority /></span><strong>Bâtimatch</strong></header>
      <div className="presentationIntroBody"><p className="eyebrow">PILOTAGE NATIONAL</p><h1>La dynamique du réseau</h1><p>La performance, la croissance des groupes et les priorités qui guideront notre prochain cap.</p><div className="meetingHeadline"><strong>{euro.format(data.kpis.revenueWon)}</strong><span>de chiffre d’affaires gagné {periodSentence}</span></div></div>
      <a className="presentationNext" href="#slide-2">Découvrir la performance ↓</a>
    </section>

    <section className="presentationSlide" id="slide-2">
      <div className="presentationSlideHeader"><div><p className="eyebrow">01 · VUE D’ENSEMBLE</p><h2>Le réseau en un coup d’œil</h2></div><span>{periodText}</span></div>
      <div className="meetingKpis networkMeetingKpis">
        <article className="meetingKpiFeatured"><span>CA gagné</span><strong>{euro.format(data.kpis.revenueWon)}</strong></article>
        <article><span>Affaires échangées</span><strong>{number.format(data.kpis.opportunitiesReceived)}</strong></article>
        <article><span>Adhérents actifs</span><strong>{number.format(data.kpis.activeMembers)}</strong></article>
        <article><span>Groupes actifs</span><strong>{number.format(activeGroups)}</strong></article>
        <article><span>Taux de closing</span><strong>{percent.format(data.kpis.closingRate)}</strong></article>
        <article><span>Pipeline ouvert</span><strong>{euro.format(data.kpis.pipelineValue)}</strong></article>
      </div>
    </section>

    <section className="presentationSlide networkGrowthSlide" id="slide-3">
      <div className="presentationSlideHeader"><div><p className="eyebrow">02 · CROISSANCE COMPARÉE</p><h2>Les groupes à âge équivalent</h2></div><span>Depuis leur ouverture</span></div>
      <div className="networkGrowthList">{maturity.map((series) => <article key={series.id}>
        <header><strong>{series.name}</strong><span>M{series.point?.month}</span></header>
        <div className="networkGrowthTrack"><i style={{ width: `${(series.point?.revenue ?? 0) / maxMaturityRevenue * 100}%` }} /></div>
        <footer><strong>{euro.format(series.point?.revenue ?? 0)}</strong><span>{number.format(series.point?.activeMembers ?? 0)} adhérents · {number.format(series.point?.opportunities ?? 0)} affaires</span></footer>
      </article>)}</div>
    </section>

    <section className="presentationSlide networkLeadersSlide" id="slide-4">
      <div className="presentationSlideHeader"><div><p className="eyebrow">03 · GROUPES MOTEURS</p><h2>Ceux qui donnent l’impulsion</h2></div><span>{periodText}</span></div>
      <div className="networkLeaderColumns">
        <article><h3>Chiffre d’affaires gagné</h3>{topRevenue.map((group, index) => <div key={group.id}><b>{index + 1}</b><span><strong>{group.name}</strong><i><em style={{ width: `${group.revenueWon / maxRevenue * 100}%` }} /></i></span><strong>{euro.format(group.revenueWon)}</strong></div>)}</article>
        <article><h3>Affaires envoyées</h3>{topSent.map((group, index) => <div key={group.id}><b>{index + 1}</b><span><strong>{group.name}</strong><small>{number.format(group.opportunitiesReceived)} reçues</small></span><strong>{number.format(group.opportunitiesSent)}</strong></div>)}</article>
      </div>
    </section>

    <section className="presentationSlide presentationGoalSlide networkCapSlide" id="slide-5">
      <div className="presentationSlideHeader"><div><p className="eyebrow">04 · CAP DU RÉSEAU</p><h2>Les priorités du prochain mois</h2></div><span>{alertGroups} critique{alertGroups > 1 ? "s" : ""} · {watchGroups} à accompagner</span></div>
      <div className="networkCapGrid">
        <div className="meetingGoalRing" style={{ background: `conic-gradient(#f18748 ${Math.min(1, targetProgress) * 360}deg, rgba(255,255,255,.14) 0)` }}><div><strong>{Math.round(targetProgress * 100)}<small>%</small></strong><span>des objectifs mensuels</span></div></div>
        <div className="networkCapNumbers"><div><span>Objectif cumulé</span><strong>{revenueTarget ? euro.format(revenueTarget) : "À renseigner"}</strong></div><div><span>Déjà signé</span><strong>{euro.format(revenueActual)}</strong></div><div><span>Affaires à traiter</span><strong>{number.format(data.kpis.pendingTreatment)}</strong></div></div>
        <div className="networkVigilanceList"><p className="eyebrow">GROUPES À MOBILISER</p>{data.networkHealth.filter((group) => group.status !== "healthy").slice(0, 5).map((group) => <div key={group.id}><i className={`health-${group.status}`} /><span><strong>{group.name}</strong><small>{group.overdueTreatment ? `${group.overdueTreatment} affaire${group.overdueTreatment > 1 ? "s" : ""} en retard` : "Dynamique à renforcer"}</small></span><b>{group.score}/100</b></div>)}{!alertGroups && !watchGroups && <p className="meetingAllClear">Tous les groupes présentent une situation saine.</p>}</div>
      </div>
      <div className="meetingClosing meetingClosingLight"><Image src="/brand/batimatch-mark.png" alt="" width={48} height={48} /><p>Faire grandir chaque groupe pour faire grandir tout le réseau.</p></div>
    </section>
  </main>;
}

function MeetingPodium({ title, subtitle, entries, metric }: { title: string; subtitle: string; entries: LeaderboardEntry[]; metric: "count" | "amount" }) {
  return <article className="meetingPodium"><header><div><p>{title}</p><span>{subtitle}</span></div><b>TOP 3</b></header><ol>
    {entries.slice(0, 3).map((entry, index) => <li key={entry.id}><span className={`meetingRank meetingRank${index + 1}`}>{index + 1}</span><strong>{entry.name}</strong><div><b>{metric === "count" ? `${entry.count} affaire${entry.count > 1 ? "s" : ""}` : euro.format(entry.amount)}</b><small>{metric === "count" ? euro.format(entry.amount) : `${entry.count} affaire${entry.count > 1 ? "s" : ""}`}</small></div></li>)}
    {!entries.length && <li className="meetingPodiumEmpty">Aucun résultat sur cette période</li>}
  </ol></article>;
}

export default async function PresentationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const access = await getPilotageAccess((await headers()).get("cf-access-jwt-assertion"));
  const groupId = access.role === "president" ? access.groupId ?? "all" : "all";
  const requestedPeriod = typeof params.period === "string" ? params.period as DashboardPeriod : "30d";
  const period = VALID_PERIODS.has(requestedPeriod) ? requestedPeriod : "30d";
  const data = await getDashboardData(period, groupId);
  const scope = data.selectedGroupName ?? "Réseau national";
  const goal = data.goalSimulator;
  const realisticScenario = goal?.scenarios.find((scenario) => scenario.key === "realistic");
  const progress = goal?.target ? Math.min(1, goal.actual / goal.target) : 0;
  const backHref = `/?group=${encodeURIComponent(groupId)}&period=${encodeURIComponent(period)}`;

  if (access.role === "network") return <NetworkPresentation data={data} period={period} backHref="/?group=all" />;

  return <main className="presentationMode">
    <PresentationControls backHref={backHref} />
    <nav className="presentationDots" aria-label="Navigation de la présentation"><a href="#slide-1">1</a><a href="#slide-2">2</a><a href="#slide-3">3</a><a href="#slide-4">4</a></nav>

    <section className="presentationSlide presentationIntro" id="slide-1">
      <header className="presentationBrand"><span><Image src="/brand/batimatch-mark.png" alt="" width={56} height={56} priority /></span><strong>Bâtimatch</strong></header>
      <div className="presentationIntroBody"><p className="eyebrow">POINT DE PILOTAGE</p><h1>{scope}</h1><p>Notre performance, nos réussites et les prochaines étapes à franchir ensemble.</p><div className="meetingHeadline"><strong>{euro.format(data.kpis.revenueWon)}</strong><span>de chiffre d’affaires gagné sur la période</span></div></div>
      <a className="presentationNext" href="#slide-2">Découvrir les résultats ↓</a>
    </section>

    <section className="presentationSlide" id="slide-2">
      <div className="presentationSlideHeader"><div><p className="eyebrow">01 · RÉSULTATS</p><h2>La performance en un coup d’œil</h2></div><span>{scope}</span></div>
      <div className="meetingKpis">
        <article className="meetingKpiFeatured"><span>CA gagné</span><strong>{euro.format(data.kpis.revenueWon)}</strong></article>
        <article><span>Affaires gagnées</span><strong>{number.format(data.kpis.opportunitiesWon)}</strong></article>
        <article><span>Taux de closing</span><strong>{percent.format(data.kpis.closingRate)}</strong></article>
        <article><span>Devis → commande</span><strong>{percent.format(data.kpis.quoteConversionRate)}</strong></article>
        <article><span>Affaires envoyées</span><strong>{number.format(data.kpis.opportunitiesSent)}</strong></article>
        <article><span>Affaires reçues</span><strong>{number.format(data.kpis.opportunitiesReceived)}</strong></article>
      </div>
    </section>

    <section className="presentationSlide presentationGoalSlide" id="slide-3">
      <div className="presentationSlideHeader"><div><p className="eyebrow">02 · OBJECTIF & PRIORITÉS</p><h2>Le cap à tenir ensemble</h2></div><span>{data.kpis.pendingTreatment} affaire{data.kpis.pendingTreatment > 1 ? "s" : ""} à traiter</span></div>
      <div className="meetingGoalGrid">
        <div className="meetingGoalRing" style={{ background: `conic-gradient(#f18748 ${progress * 360}deg, rgba(255,255,255,.14) 0)` }}><div><strong>{Math.round(progress * 100)}<small>%</small></strong><span>de l’objectif mensuel</span></div></div>
        <div className="meetingGoalNumbers">{goal?.target ? <><div><span>Objectif</span><strong>{euro.format(goal.target)}</strong></div><div><span>Déjà signé ce mois</span><strong>{euro.format(goal.actual)}</strong></div><div><span>Reste à sécuriser</span><strong>{euro.format(goal.remaining)}</strong></div></> : <p>Définissez un objectif mensuel pour activer cette projection.</p>}</div>
        <div className="meetingActions"><p className="eyebrow">NOS ENGAGEMENTS COLLECTIFS</p><ol>
          <li><span>1</span><div><strong>Prendre en charge les affaires en attente</strong><p>{data.kpis.pendingTreatment ? `${data.kpis.pendingTreatment} affaire${data.kpis.pendingTreatment > 1 ? "s attendent" : " attend"} encore une première action du groupe.` : "Toutes les affaires reçues ont été prises en charge."}</p></div></li>
          <li><span>2</span><div><strong>Créer de nouvelles opportunités ensemble</strong><p>{realisticScenario ? `Notre cap réaliste est de travailler un volume équivalent à ${realisticScenario.opportunities} nouvelles affaires.` : "Chaque mise en relation contribue à la dynamique collective."}</p></div></li>
          <li><span>3</span><div><strong>Transformer l’élan en signatures</strong><p>{realisticScenario ? `Objectif collectif : sécuriser ${realisticScenario.wins} signature${realisticScenario.wins > 1 ? "s" : ""} supplémentaire${realisticScenario.wins > 1 ? "s" : ""} ce mois-ci.` : `Continuons à faire progresser les ${data.kpis.openOpportunities} affaires actuellement ouvertes.`}</p></div></li>
        </ol></div>
      </div>
    </section>

    <section className="presentationSlide" id="slide-4">
      <div className="presentationSlideHeader"><div><p className="eyebrow">03 · TEMPS FORTS</p><h2>Les champions du groupe</h2></div><span>12 places pour célébrer les contributions</span></div>
      <div className="meetingPodiumGrid">
        <MeetingPodium title="Top donneurs" subtitle="Nombre d’affaires envoyées" entries={data.leaderboards.donorsByCount} metric="count" />
        <MeetingPodium title="Top donneurs" subtitle="Montant d’affaires transmis" entries={data.leaderboards.donorsByAmount} metric="amount" />
        <MeetingPodium title="Top signeurs" subtitle="Nombre d’affaires gagnées" entries={data.leaderboards.signersByCount} metric="count" />
        <MeetingPodium title="Top signeurs" subtitle="Chiffre d’affaires gagné" entries={data.leaderboards.signersByAmount} metric="amount" />
      </div>
      <div className="meetingClosing"><Image src="/brand/batimatch-mark.png" alt="" width={48} height={48} /><p>Des pros du BTP qui se ressemblent et qui bossent ensemble.</p></div>
    </section>
  </main>;
}

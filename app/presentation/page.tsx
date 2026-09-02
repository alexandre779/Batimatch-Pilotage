import Image from "next/image";
import { headers } from "next/headers";
import { getPilotageAccess } from "@/lib/auth/access";
import { getDashboardData, type DashboardPeriod } from "@/lib/services/dashboard";
import { PresentationControls } from "@/app/components/presentation-controls";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("fr-FR");
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });
const VALID_PERIODS = new Set<DashboardPeriod>(["30d", "90d", "year", "all"]);

export default async function PresentationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const access = await getPilotageAccess((await headers()).get("cf-access-jwt-assertion"));
  const requestedGroup = typeof params.group === "string" ? params.group : "all";
  const groupId = access.role === "president" ? access.groupId ?? "all" : requestedGroup;
  const requestedPeriod = typeof params.period === "string" ? params.period as DashboardPeriod : "30d";
  const period = VALID_PERIODS.has(requestedPeriod) ? requestedPeriod : "30d";
  const data = await getDashboardData(period, groupId);
  const scope = data.selectedGroupName ?? "Réseau national";
  const firstName = access.name?.split(/[\s-]+/).find(Boolean);
  const goal = data.goalSimulator;
  const progress = goal?.target ? Math.min(1, goal.actual / goal.target) : 0;
  const backHref = `/?group=${encodeURIComponent(groupId)}&period=${encodeURIComponent(period)}`;
  const topDonor = data.leaderboards.donorsByCount[0];
  const topSigner = data.leaderboards.signersByAmount[0];

  return <main className="presentationMode">
    <PresentationControls backHref={backHref} />
    <nav className="presentationDots" aria-label="Navigation de la présentation"><a href="#slide-1">1</a><a href="#slide-2">2</a><a href="#slide-3">3</a><a href="#slide-4">4</a></nav>

    <section className="presentationSlide presentationIntro" id="slide-1">
      <header className="presentationBrand"><span><Image src="/brand/batimatch-mark.png" alt="" width={56} height={56} priority /></span><strong>Bâtimatch</strong></header>
      <div className="presentationIntroBody"><p className="eyebrow">POINT DE PILOTAGE</p><h1>{scope}</h1><p>{firstName ? `${firstName}, ` : ""}voici les chiffres et les actions à partager avec le groupe.</p><div className="meetingHeadline"><strong>{euro.format(data.kpis.revenueWon)}</strong><span>de chiffre d’affaires gagné sur la période</span></div></div>
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
        <div className="meetingActions"><p className="eyebrow">LES ACTIONS DU PRÉSIDENT</p>{data.presidentCoach.length ? <ol>{data.presidentCoach.map((action, index) => <li key={action.id}><span>{index + 1}</span><div><strong>{action.title}</strong><p>{action.impact}</p></div></li>)}</ol> : <div className="meetingAllClear"><strong>Tout est sous contrôle</strong><p>Aucune action urgente n’est détectée.</p></div>}</div>
      </div>
    </section>

    <section className="presentationSlide" id="slide-4">
      <div className="presentationSlideHeader"><div><p className="eyebrow">03 · TEMPS FORTS</p><h2>Les réussites à célébrer</h2></div><span>Bravo au groupe !</span></div>
      <div className="meetingChampions">
        <article><span className="meetingMedal">1</span><p>Top donneur</p><h3>{topDonor?.name ?? "À révéler"}</h3><strong>{topDonor ? `${topDonor.count} affaire${topDonor.count > 1 ? "s" : ""}` : "—"}</strong><small>{topDonor ? euro.format(topDonor.amount) : "Aucune affaire sur la période"}</small></article>
        <article><span className="meetingMedal">1</span><p>Top signeur</p><h3>{topSigner?.name ?? "À révéler"}</h3><strong>{topSigner ? euro.format(topSigner.amount) : "—"}</strong><small>{topSigner ? `${topSigner.count} affaire${topSigner.count > 1 ? "s" : ""} gagnée${topSigner.count > 1 ? "s" : ""}` : "Aucune signature sur la période"}</small></article>
      </div>
      <div className="meetingClosing"><Image src="/brand/batimatch-mark.png" alt="" width={48} height={48} /><p>Des pros du BTP qui se ressemblent et qui bossent ensemble.</p></div>
    </section>
  </main>;
}

import type { GoalSimulator as GoalSimulatorData } from "@/lib/services/dashboard";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function GoalSimulator({ simulator }: { simulator: GoalSimulatorData }) {
  const progress = simulator.target ? Math.min(1, simulator.actual / simulator.target) : 0;
  const realistic = simulator.scenarios.find((scenario) => scenario.key === "realistic")!;
  return (
    <section className="goalSimulator">
      <header className="goalHeader">
        <div><p className="eyebrow">CAP DU MOIS</p><h2>Simulateur d’objectif</h2><p>Le plan d’action nécessaire pour atteindre l’objectif mensuel du groupe.</p></div>
        <span>{simulator.daysRemaining} jours restants</span>
      </header>
      {!simulator.target ? <div className="goalMissing"><strong>Objectif mensuel non renseigné</strong><p>Ajoutez l’objectif de CA du groupe dans Airtable pour activer la simulation.</p></div> : <>
        <div className="goalOverview">
          <div><span>Objectif</span><strong>{euro.format(simulator.target)}</strong></div>
          <div><span>Déjà signé</span><strong>{euro.format(simulator.actual)}</strong></div>
          <div><span>Reste à sécuriser</span><strong>{euro.format(simulator.remaining)}</strong></div>
          <div><span>Pipeline pondéré à 30 j</span><strong>{euro.format(simulator.weightedPipeline)}</strong></div>
        </div>
        <div className="goalProgress"><span style={{ width: `${progress * 100}%` }} /><small>{Math.round(progress * 100)} % de l’objectif atteint</small></div>
        <div className="scenarioGrid">{simulator.scenarios.map((scenario) => <article className={`scenarioCard scenario-${scenario.key}`} key={scenario.key}><h3>{scenario.label}</h3><dl><div><dt>Affaires à générer</dt><dd>{scenario.opportunities}</dd></div><div><dt>Rendez-vous</dt><dd>{scenario.appointments}</dd></div><div><dt>Devis à remettre</dt><dd>{scenario.quotes}</dd></div><div><dt>Signatures</dt><dd>{scenario.wins}</dd></div></dl><p>{scenario.opportunitiesPerMember} affaire{scenario.opportunitiesPerMember > 1 ? "s" : ""} par membre actif</p></article>)}</div>
        <p className="goalDirective">Cap réaliste : travailler un volume équivalent à <strong>{realistic.opportunities} affaires</strong>, obtenir <strong>{realistic.appointments} rendez-vous</strong>, remettre <strong>{realistic.quotes} devis</strong> et sécuriser <strong>{realistic.wins} signatures</strong>. Le pipeline pondéré couvre actuellement <strong>{simulator.remaining ? Math.round((simulator.weightedPipeline / simulator.remaining) * 100) : 100} %</strong> du reste à signer ; ces opportunités doivent encore être animées jusqu’au closing.</p>
        <p className="goalFootnote">Projection indicative fondée sur l’historique du groupe et la valeur moyenne des affaires gagnées ({euro.format(simulator.averageWonAmount)}).</p>
      </>}
    </section>
  );
}

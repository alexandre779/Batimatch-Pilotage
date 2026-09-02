import type { PresidentCoachAction } from "@/lib/services/dashboard";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const LABELS: Record<PresidentCoachAction["priority"], string> = {
  urgent: "À faire maintenant",
  important: "À engager cette semaine",
  opportunity: "Opportunité à saisir"
};

export function PresidentCoach({ actions }: { actions: PresidentCoachAction[] }) {
  return (
    <section className="presidentCoach">
      <header className="coachHeader">
        <div><p className="eyebrow">VOTRE COACH PRÉSIDENT</p><h2>Les actions qui feront avancer votre groupe</h2><p>Priorités calculées à partir de l’activité réelle du groupe.</p></div>
        <span>Mis à jour aujourd’hui</span>
      </header>
      {actions.length ? (
        <div className="coachGrid">
          {actions.map((action, index) => (
            <article className={`coachAction coach-${action.priority}`} key={action.id}>
              <div className="coachRank">{index + 1}</div>
              <div className="coachActionBody">
                <span className="coachPriority">{LABELS[action.priority]}</span>
                <h3>{action.title}</h3>
                <p>{action.summary}</p>
                {action.amount !== null && <strong className="coachAmount">{euro.format(action.amount)} concernés</strong>}
                <details>
                  <summary>Voir les éléments concernés</summary>
                  <ul>{action.items.map((item) => <li key={item}>{item}</li>)}</ul>
                </details>
                <div className="coachImpact"><span>Impact attendu</span><p>{action.impact}</p></div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="coachAllClear"><strong>Aucune action urgente détectée</strong><p>Les affaires sont traitées, les membres contribuent régulièrement et aucun devis ne nécessite de relance particulière.</p></div>
      )}
    </section>
  );
}

import type { GroupBalance as GroupBalanceData, MemberBalance } from "@/lib/services/dashboard";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

const QUADRANTS: Array<{ key: MemberBalance["quadrant"]; title: string; hint: string }> = [
  { key: "giver", title: "Contributeurs à valoriser", hint: "Donnent beaucoup · reçoivent peu" },
  { key: "motor", title: "Membres moteurs", hint: "Donnent et reçoivent beaucoup" },
  { key: "inactive", title: "Membres à remobiliser", hint: "Donnent et reçoivent peu" },
  { key: "receiver", title: "Réciprocité à travailler", hint: "Reçoivent beaucoup · donnent peu" }
];

export function GroupBalance({ balance }: { balance: GroupBalanceData }) {
  return (
    <section className="balanceSection">
      <header className="balanceHeader">
        <div><p className="eyebrow">ÉQUILIBRE DU GROUPE</p><h2>Qui contribue, qui reçoit, qui remobiliser ?</h2><p>Lecture calculée sur la période sélectionnée.</p></div>
        <div className="balanceScore"><strong>{balance.score}<small>/100</small></strong><span>{balance.label}</span></div>
      </header>

      <div className="balanceStats">
        <div><strong>{percent.format(balance.giverParticipation)}</strong><span>donnent au moins une affaire</span></div>
        <div><strong>{percent.format(balance.receiverParticipation)}</strong><span>reçoivent au moins une affaire</span></div>
        <div><strong>{balance.sentReceivedRatio === null ? "—" : balance.sentReceivedRatio.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</strong><span>ratio envoyé / reçu</span></div>
        <div><strong>{percent.format(balance.topThreeShare)}</strong><span>des affaires données par le top 3</span></div>
      </div>

      <div className="balanceBody">
        <div className="balanceMatrix" aria-label="Matrice de contribution et de réception des adhérents">
          <span className="balanceYAxis">Donne davantage ↑</span>
          {QUADRANTS.map((quadrant) => {
            const members = balance.members.filter((member) => member.quadrant === quadrant.key);
            return (
              <article className={`balanceQuadrant quadrant-${quadrant.key}`} key={quadrant.key}>
                <header><strong>{quadrant.title}</strong><span>{quadrant.hint}</span></header>
                <div>{members.length ? members.map((member) => <span className="memberChip" key={member.id}>{member.name}</span>) : <small>Aucun adhérent</small>}</div>
              </article>
            );
          })}
          <span className="balanceXAxis">Reçoit davantage →</span>
        </div>

        <aside className="balanceRecommendations">
          <p className="eyebrow">ANIMATION</p><h3>Actions suggérées</h3>
          <ol>{balance.recommendations.map((recommendation, index) => <li key={recommendation}><span>{index + 1}</span><p>{recommendation}</p></li>)}</ol>
          <details>
            <summary>Voir le détail des adhérents</summary>
            <div className="memberBalanceDetails">
              {balance.members.map((member) => <article key={member.id}><strong>{member.name}</strong><span>Envoyé : {member.sentCount} · {euro.format(member.sentAmount)}</span><span>Reçu : {member.receivedCount} · {euro.format(member.receivedAmount)}</span><small>Dernier envoi : {member.lastSentDays === null ? "jamais" : `il y a ${member.lastSentDays} j`}</small></article>)}
            </div>
          </details>
        </aside>
      </div>
      <p className="balanceFootnote">Les quadrants utilisent la moyenne du groupe sur la période. Cet outil sert à préparer l’animation collective, pas à sanctionner les adhérents.</p>
    </section>
  );
}

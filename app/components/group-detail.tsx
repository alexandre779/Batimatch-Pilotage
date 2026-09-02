import type { DashboardData, GroupPerformance } from "@/lib/services/dashboard";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("fr-FR");
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

export function GroupDetail({ group, data }: { group: GroupPerformance; data: DashboardData }) {
  const health = data.networkHealth.find((item) => item.id === group.id);
  const objectives = data.groupObjectives.find((item) => item.id === group.id);
  const alerts = data.networkAlerts.filter((item) => item.groupName === group.name);
  const objectiveItems = objectives ? [
    { label: "CA mensuel", ...objectives.monthlyRevenue, format: euro.format },
    { label: "Affaires mensuelles", ...objectives.monthlyOpportunities, format: number.format },
    { label: "Volume transmis", ...objectives.monthlySentVolume, format: euro.format },
    { label: "Nouveaux adhérents", ...objectives.annualNewMembers, format: number.format }
  ] : [];

  return (
    <section className="groupDetail" id="fiche-groupe">
      <div className="groupDetailHero">
        <div><p className="eyebrow">FICHE GROUPE</p><h2>{group.name}</h2><p>Vue opérationnelle complète du groupe sélectionné.</p></div>
        {health && <div className={`groupHealthBadge health-${health.status}`}><strong>{health.score}/100</strong><span>{health.status === "healthy" ? "Situation saine" : health.status === "watch" ? "À surveiller" : "Action requise"}</span></div>}
      </div>

      <div className="groupDetailKpis">
        <div><span>Adhérents actifs</span><strong>{number.format(health?.activeMembers ?? group.memberCount)}</strong></div>
        <div><span>Affaires envoyées</span><strong>{number.format(group.opportunitiesSent)}</strong></div>
        <div><span>Affaires reçues</span><strong>{number.format(group.opportunitiesReceived)}</strong></div>
        <div><span>CA gagné</span><strong>{euro.format(group.revenueWon)}</strong></div>
        <div><span>Closing</span><strong>{percent.format(group.closingRate)}</strong></div>
        <div><span>Pipeline</span><strong>{euro.format(group.pipelineValue)}</strong></div>
      </div>

      <div className="groupDetailColumns">
        <article className="groupDetailPanel">
          <h3>Actions prioritaires</h3>
          {alerts.length ? <ul className="groupAlertList">{alerts.map((alert) => <li className={alert.level} key={alert.id}><i /><div><strong>{alert.level === "critical" ? "Prioritaire" : "À surveiller"}</strong><span>{alert.message}</span></div></li>)}</ul> : <p className="groupEmpty">Aucune alerte pour ce groupe.</p>}
          <h4>Affaires en attente par adhérent</h4>
          {data.pendingTreatmentByMember.length ? <ol className="memberPendingList">{data.pendingTreatmentByMember.map((member) => <li key={member.id}><span>{member.name}</span><strong>{member.count}</strong></li>)}</ol> : <p className="groupEmpty">Aucune affaire en attente.</p>}
        </article>

        <article className="groupDetailPanel">
          <h3>Avancement des objectifs</h3>
          <div className="groupObjectiveList">{objectiveItems.map((item) => {
            const progress = item.target > 0 ? Math.min(1, item.actual / item.target) : 0;
            return <div key={item.label}><header><span>{item.label}</span><strong>{item.format(item.actual)} / {item.target ? item.format(item.target) : "—"}</strong></header><div><i style={{ width: `${progress * 100}%` }} /></div></div>;
          })}</div>
        </article>

        <article className="groupDetailPanel groupLeaders">
          <h3>Membres moteurs</h3>
          <h4>Donneurs d’affaires</h4>
          <ol>{data.leaderboards.donorsByCount.map((member, index) => <li key={member.id}><span>{index + 1}</span><strong>{member.name}</strong><b>{member.count}</b></li>)}</ol>
          <h4>Signataires</h4>
          <ol>{data.leaderboards.signersByAmount.map((member, index) => <li key={member.id}><span>{index + 1}</span><strong>{member.name}</strong><b>{euro.format(member.amount)}</b></li>)}</ol>
        </article>
      </div>
    </section>
  );
}

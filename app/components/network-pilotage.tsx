import type { DashboardData, GroupPerformance } from "@/lib/services/dashboard";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("fr-FR");
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

function Ranking({ title, groups, value }: { title: string; groups: GroupPerformance[]; value: (group: GroupPerformance) => string }) {
  return (
    <article className="networkRanking">
      <h3>{title}</h3>
      <ol>
        {groups.slice(0, 3).map((group, index) => (
          <li key={group.id}><span>{index + 1}</span><strong>{group.name}</strong><b>{value(group)}</b></li>
        ))}
      </ol>
    </article>
  );
}

export function NetworkPilotage({ data }: { data: DashboardData }) {
  const byRevenue = [...data.groups].sort((a, b) => b.revenueWon - a.revenueWon);
  const bySent = [...data.groups].sort((a, b) => b.opportunitiesSent - a.opportunitiesSent);
  const byClosing = [...data.groups].filter((group) => group.opportunitiesReceived > 0).sort((a, b) => b.closingRate - a.closingRate);
  const progress = (actual: number, target: number) => target > 0 ? Math.min(1, actual / target) : null;

  return (
    <>
      <section className="sectionBlock networkCommand">
        <div className="sectionHeading">
          <div><p className="eyebrow">SUPERVISION</p><h2>Vigilance opérationnelle des groupes</h2></div>
          <span className="comparisonNote">Les groupes nécessitant une action apparaissent en premier</span>
        </div>
        <div className="healthGrid">
          {data.networkHealth.map((group) => (
            <article className={`healthCard health-${group.status}`} key={group.id}>
              <header><strong>{group.name}</strong><span title="Score de vigilance opérationnelle">Vigilance {group.score}/100</span></header>
              <div className="healthStatus"><i />{group.status === "healthy" ? "Situation saine" : group.status === "watch" ? "À surveiller" : "Action requise"}</div>
              <dl>
                <div><dt>Adhérents actifs</dt><dd>{number.format(group.activeMembers)}</dd></div>
                <div><dt>À traiter</dt><dd>{number.format(group.pendingTreatment)}</dd></div>
                <div><dt>En retard +7 j</dt><dd>{number.format(group.overdueTreatment)}</dd></div>
                <div><dt>Dernière affaire</dt><dd>{group.daysSinceLastOpportunity === null ? "Jamais" : `${group.daysSinceLastOpportunity} j`}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="networkSplit sectionBlock">
        <article className="networkPanel alertPanel">
          <div className="networkPanelHeader"><p className="eyebrow">ALERTES</p><h2>Points d’attention</h2></div>
          <div className="alertList">
            {data.networkAlerts.length ? data.networkAlerts.map((alert) => (
              <div className={`networkAlert ${alert.level}`} key={alert.id}>
                <i /><div><strong>{alert.groupName}</strong><p>{alert.message}</p></div>
              </div>
            )) : <p className="networkEmpty">Aucune alerte opérationnelle.</p>}
          </div>
        </article>

        <article className="networkPanel">
          <div className="networkPanelHeader"><p className="eyebrow">PRÉVISION</p><h2>CA pondéré à venir</h2></div>
          <div className="forecastGrid">
            <div><span>30 jours</span><strong>{euro.format(data.forecast.days30)}</strong></div>
            <div><span>60 jours</span><strong>{euro.format(data.forecast.days60)}</strong></div>
            <div><span>90 jours</span><strong>{euro.format(data.forecast.days90)}</strong></div>
          </div>
          <p className="networkNote">Projection basée sur le montant et la probabilité de chaque étape. Pipeline analysé : {euro.format(data.forecast.pipeline)}.</p>
        </article>
      </section>

      <section className="networkPanel sectionBlock">
        <div className="networkPanelHeader"><p className="eyebrow">CONVERSION</p><h2>Entonnoir commercial national</h2><p>Affaires créées sur la période sélectionnée, comptabilisées selon l’étape atteinte.</p></div>
        <div className="funnel">
          {data.funnel.map((step, index) => {
            const max = data.funnel[0]?.count || 1;
            return (
              <div className="funnelRow" key={step.stage}>
                <div><strong>{step.stage}</strong>{step.conversion !== null && <span>{percent.format(step.conversion)} depuis l’étape précédente</span>}</div>
                <div className="funnelTrack"><i style={{ width: `${Math.max(4, step.count / max * 100)}%` }} /></div>
                <b>{number.format(step.count)}</b>
              </div>
            );
          })}
        </div>
      </section>

      <section className="sectionBlock">
        <div className="sectionHeading"><div><p className="eyebrow">CLASSEMENTS</p><h2>Groupes moteurs du réseau</h2></div><span className="comparisonNote">Sur la période sélectionnée</span></div>
        <div className="networkRankings">
          <Ranking title="Chiffre d’affaires gagné" groups={byRevenue} value={(group) => euro.format(group.revenueWon)} />
          <Ranking title="Affaires envoyées" groups={bySent} value={(group) => number.format(group.opportunitiesSent)} />
          <Ranking title="Taux de closing" groups={byClosing} value={(group) => percent.format(group.closingRate)} />
        </div>
      </section>

      <section className="networkPanel sectionBlock">
        <div className="networkPanelHeader"><p className="eyebrow">OBJECTIFS</p><h2>Avancement par groupe</h2><p>CA, affaires et volume sur les 30 derniers jours ; recrutement depuis le 1er janvier.</p></div>
        <div className="objectiveTableWrap">
          <table className="objectiveTable">
            <thead><tr><th>Groupe</th><th>CA mensuel</th><th>Affaires mensuelles</th><th>Volume transmis</th><th>Nouveaux adhérents</th></tr></thead>
            <tbody>{data.groupObjectives.map((group) => (
              <tr key={group.id}>
                <td><strong>{group.name}</strong></td>
                {[
                  { ...group.monthlyRevenue, format: euro.format },
                  { ...group.monthlyOpportunities, format: number.format },
                  { ...group.monthlySentVolume, format: euro.format },
                  { ...group.annualNewMembers, format: number.format }
                ].map((item, index) => {
                  const completion = progress(item.actual, item.target);
                  return <td key={index}><div className="objectiveValue"><span>{item.format(item.actual)} / {item.target ? item.format(item.target) : "—"}</span>{completion !== null && <b>{percent.format(completion)}</b>}</div><div className="objectiveTrack"><i style={{ width: `${(completion ?? 0) * 100}%` }} /></div></td>;
                })}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}

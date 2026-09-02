import type { DashboardData, GroupPerformance } from "@/lib/services/dashboard";
import { NetworkHealthMatrix } from "@/app/components/network-health-matrix";
import { CollapsibleBlock } from "@/app/components/collapsible-block";

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

export function NetworkPilotage({ data, groupLinks }: { data: DashboardData; groupLinks: Record<string, string> }) {
  const byRevenue = [...data.groups].sort((a, b) => b.revenueWon - a.revenueWon);
  const bySent = [...data.groups].sort((a, b) => b.opportunitiesSent - a.opportunitiesSent);
  const byClosing = [...data.groups].filter((group) => group.opportunitiesReceived > 0).sort((a, b) => b.closingRate - a.closingRate);
  const progress = (actual: number, target: number) => target > 0 ? Math.min(1, actual / target) : null;

  return (
    <>
      <CollapsibleBlock eyebrow="SANTÉ DU RÉSEAU" title="La situation de chaque groupe" hint="Une lecture synthétique de la dynamique, des objectifs et du traitement." defaultOpen id="groupes-sante">
        <NetworkHealthMatrix groups={data.groups} health={data.networkHealth} objectives={data.groupObjectives} alerts={data.networkAlerts} links={groupLinks} />
      </CollapsibleBlock>

      <section className="networkSplit sectionBlock">
        <CollapsibleBlock eyebrow="ALERTES" title="Détail des alertes" hint="Le tableau de santé résume la situation ; ce bloc explique les causes." id="alertes">
          <article className="networkPanel alertPanel panelEmbedded">
          <div className="alertList">
            {data.networkAlerts.length ? data.networkAlerts.map((alert) => (
              <div className={`networkAlert ${alert.level}`} key={alert.id}>
                <i /><div><strong>{alert.groupName}</strong><p>{alert.message}</p></div>
              </div>
            )) : <p className="networkEmpty">Aucune alerte opérationnelle.</p>}
          </div>
          </article>
        </CollapsibleBlock>

        <CollapsibleBlock eyebrow="PRÉVISION" title="CA pondéré à venir" hint="Projection à 30, 60 et 90 jours selon la maturité du pipeline.">
          <article className="networkPanel panelEmbedded">
          <div className="forecastGrid">
            <div><span>30 jours</span><strong>{euro.format(data.forecast.days30)}</strong></div>
            <div><span>60 jours</span><strong>{euro.format(data.forecast.days60)}</strong></div>
            <div><span>90 jours</span><strong>{euro.format(data.forecast.days90)}</strong></div>
          </div>
          <p className="networkNote">Projection basée sur le montant et la probabilité de chaque étape. Pipeline analysé : {euro.format(data.forecast.pipeline)}.</p>
          </article>
        </CollapsibleBlock>
      </section>

      <CollapsibleBlock eyebrow="CONVERSION" title="Entonnoir commercial national" hint="Affaires créées sur la période, comptabilisées selon l’étape atteinte." id="conversion">
        <section className="networkPanel panelEmbedded">
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
      </CollapsibleBlock>

      <CollapsibleBlock eyebrow="CLASSEMENTS" title="Groupes moteurs du réseau" hint="Les trois groupes en tête sur la période sélectionnée.">
        <div className="networkRankings">
          <Ranking title="Chiffre d’affaires gagné" groups={byRevenue} value={(group) => euro.format(group.revenueWon)} />
          <Ranking title="Affaires envoyées" groups={bySent} value={(group) => number.format(group.opportunitiesSent)} />
          <Ranking title="Taux de closing" groups={byClosing} value={(group) => percent.format(group.closingRate)} />
        </div>
      </CollapsibleBlock>

      <CollapsibleBlock eyebrow="OBJECTIFS" title="Avancement par groupe" hint="CA, affaires et volume sur 30 jours ; recrutement depuis le 1er janvier.">
        <section className="networkPanel panelEmbedded">
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
      </CollapsibleBlock>
    </>
  );
}

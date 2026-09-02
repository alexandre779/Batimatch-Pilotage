"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GroupObjective, GroupPerformance, NetworkAlert, NetworkHealth } from "@/lib/services/dashboard";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("fr-FR");
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

type Props = {
  groups: GroupPerformance[];
  health: NetworkHealth[];
  objectives: GroupObjective[];
  alerts: NetworkAlert[];
  links: Record<string, string>;
};

function statusLabel(status: NetworkHealth["status"]) {
  return status === "healthy" ? "Bonne dynamique" : status === "watch" ? "À accompagner" : "Action requise";
}

export function NetworkHealthMatrix({ groups, health, objectives, alerts, links }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedHealth = health.find((item) => item.id === selectedId) ?? null;
  const selectedGroup = groups.find((item) => item.id === selectedId) ?? null;
  const selectedObjective = objectives.find((item) => item.id === selectedId) ?? null;
  const selectedAlerts = selectedGroup ? alerts.filter((item) => item.groupName === selectedGroup.name) : [];

  useEffect(() => {
    if (!selectedId) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setSelectedId(null);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [selectedId]);

  return (
    <>
      <section className="networkMatrix" id="groupes">
        <div className="networkMatrixMeta"><span>Cliquez sur un groupe pour ouvrir sa fiche de pilotage.</span><strong>{health.length} groupe{health.length > 1 ? "s" : ""} suivi{health.length > 1 ? "s" : ""}</strong></div>
        <div className="networkMatrixWrap">
          <table>
            <thead><tr><th>Groupe</th><th>Dynamique</th><th>Objectif CA</th><th>Engagement</th><th>Traitement</th><th>Dernière activité</th><th /></tr></thead>
            <tbody>{health.map((item) => {
              const objective = objectives.find((candidate) => candidate.id === item.id)?.monthlyRevenue;
              const completion = objective?.target ? objective.actual / objective.target : null;
              return (
                <tr key={item.id}>
                  <td><button className="matrixGroupButton" type="button" onClick={() => setSelectedId(item.id)}>{item.name}</button></td>
                  <td><span className={`matrixStatus health-${item.status}`}><i />{statusLabel(item.status)}</span></td>
                  <td>{completion === null ? <span className="matrixMuted">Non renseigné</span> : <div className="matrixProgress"><span>{percent.format(completion)}</span><i><b style={{ width: `${Math.min(100, completion * 100)}%` }} /></i></div>}</td>
                  <td><strong>{number.format(item.opportunitiesInPeriod)}</strong><small> affaire{item.opportunitiesInPeriod > 1 ? "s" : ""}</small></td>
                  <td className={item.overdueTreatment ? "matrixWarning" : ""}><strong>{number.format(item.pendingTreatment)}</strong><small> à traiter{item.overdueTreatment ? ` · ${item.overdueTreatment} en retard` : ""}</small></td>
                  <td>{item.daysSinceLastOpportunity === null ? "Jamais" : item.daysSinceLastOpportunity === 0 ? "Aujourd’hui" : `Il y a ${item.daysSinceLastOpportunity} j`}</td>
                  <td><button className="matrixOpen" type="button" onClick={() => setSelectedId(item.id)} aria-label={`Ouvrir la fiche de ${item.name}`}>→</button></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </section>

      {selectedHealth && selectedGroup && <div className="groupDrawerLayer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedId(null)}>
        <aside className="groupDrawer" role="dialog" aria-modal="true" aria-labelledby="group-drawer-title">
          <header className="groupDrawerHeader">
            <div><p className="eyebrow">FICHE GROUPE</p><h2 id="group-drawer-title">{selectedGroup.name}</h2></div>
            <button type="button" onClick={() => setSelectedId(null)} aria-label="Fermer la fiche">×</button>
          </header>
          <div className={`groupDrawerStatus health-${selectedHealth.status}`}><i /><strong>{statusLabel(selectedHealth.status)}</strong><span>Vigilance {selectedHealth.score}/100</span></div>
          <div className="groupDrawerKpis">
            <div><span>CA gagné</span><strong>{euro.format(selectedGroup.revenueWon)}</strong></div>
            <div><span>Pipeline</span><strong>{euro.format(selectedGroup.pipelineValue)}</strong></div>
            <div><span>Adhérents actifs</span><strong>{number.format(selectedHealth.activeMembers)}</strong></div>
            <div><span>Affaires en attente</span><strong>{number.format(selectedHealth.pendingTreatment)}</strong></div>
          </div>
          <section className="drawerSection">
            <h3>Objectif mensuel de CA</h3>
            {selectedObjective?.monthlyRevenue.target ? <>
              <div className="drawerObjective"><strong>{euro.format(selectedObjective.monthlyRevenue.actual)}</strong><span>sur {euro.format(selectedObjective.monthlyRevenue.target)}</span></div>
              <div className="drawerObjectiveTrack"><i style={{ width: `${Math.min(100, selectedObjective.monthlyRevenue.actual / selectedObjective.monthlyRevenue.target * 100)}%` }} /></div>
            </> : <p>Aucun objectif renseigné pour ce groupe.</p>}
          </section>
          <section className="drawerSection">
            <h3>Points d’attention</h3>
            {selectedAlerts.length ? <ul>{selectedAlerts.slice(0, 4).map((alert) => <li className={alert.level} key={alert.id}><i /><span>{alert.message}</span></li>)}</ul> : <p>Aucune alerte opérationnelle.</p>}
          </section>
          <section className="drawerSection drawerEngagement">
            <h3>Engagement du groupe</h3>
            <div><span>Affaires sur la période</span><strong>{number.format(selectedHealth.opportunitiesInPeriod)}</strong></div>
            <div><span>En attente depuis plus de 7 jours</span><strong>{number.format(selectedHealth.overdueTreatment)}</strong></div>
          </section>
          <Link className="drawerFullLink" href={links[selectedGroup.id] ?? "/"}>Ouvrir la fiche complète <span>→</span></Link>
        </aside>
      </div>}
    </>
  );
}

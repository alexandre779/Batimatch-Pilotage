import { getGroups, getNetworkKpis } from "@/lib/services/dashboard";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("fr-FR");
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <article className="kpi">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default async function Home() {
  let groups = [] as Awaited<ReturnType<typeof getGroups>>;
  let kpis: Awaited<ReturnType<typeof getNetworkKpis>> | null = null;
  let dataError = false;

  try {
    [groups, kpis] = await Promise.all([getGroups(), getNetworkKpis()]);
  } catch {
    dataError = true;
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">BATIMATCH</p>
          <h1>Pilotage réseau</h1>
        </div>
        <div className="filters">
          <select aria-label="Groupe" defaultValue="all">
            <option value="all">Tous les groupes</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
          <select aria-label="Période" defaultValue="30d">
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
            <option value="year">Année en cours</option>
          </select>
        </div>
      </header>

      {dataError && (
        <section className="notice">
          La structure Airtable est connectée dans le code. Ajoute simplement AIRTABLE_TOKEN dans l’environnement de déploiement pour afficher les données réelles.
        </section>
      )}

      <section className="kpis">
        <Kpi label="Membres actifs" value={number.format(kpis?.activeMembers ?? 0)} />
        <Kpi label="Opportunités envoyées" value={number.format(kpis?.opportunitiesSent ?? 0)} />
        <Kpi label="Affaires gagnées" value={number.format(kpis?.opportunitiesWon ?? 0)} />
        <Kpi label="CA gagné" value={euro.format(kpis?.revenueWon ?? 0)} />
        <Kpi label="Volume reçu" value={euro.format(kpis?.receivedVolume ?? 0)} />
        <Kpi label="Transformation" value={percent.format(kpis?.conversionRate ?? 0)} />
      </section>

      <section className="panel">
        <div className="panelTitle">
          <div><p className="eyebrow">GROUPES</p><h2>Performance du réseau</h2></div>
          <span>{groups.length} groupes</span>
        </div>
        <div className="tableWrap">
          <table>
            <thead><tr><th>Groupe</th><th>Membres</th><th>Opportunités</th><th>Gagnées</th><th>Taux transfo.</th><th>CA gagné</th></tr></thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id}>
                  <td><strong>{group.name || "Sans nom"}</strong></td>
                  <td>{number.format(group.memberCount)}</td>
                  <td>{number.format(group.opportunities)}</td>
                  <td>{number.format(group.wonOpportunities)}</td>
                  <td>{percent.format(group.conversionRate)}</td>
                  <td>{euro.format(group.revenue)}</td>
                </tr>
              ))}
              {!groups.length && <tr><td colSpan={6} className="empty">Données disponibles dès configuration du token Airtable.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

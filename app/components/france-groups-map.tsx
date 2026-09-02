import type { GroupPerformance } from "@/lib/services/dashboard";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("fr-FR");

const CITY_COORDINATES: Record<string, [number, number]> = {
  "le mans": [48.0061, 0.1996],
  "la fleche": [47.6999, -0.0751]
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function project([latitude, longitude]: [number, number]) {
  return {
    x: 62 + ((longitude + 5.2) / 14.8) * 326,
    y: 30 + ((51.2 - latitude) / 9.1) * 440
  };
}

export function FranceGroupsMap({ groups, period, startDate, endDate }: {
  groups: GroupPerformance[];
  period: string;
  startDate?: string;
  endDate?: string;
}) {
  const located = groups.flatMap((group) => {
    const coordinates = CITY_COORDINATES[normalize(group.city)];
    return coordinates ? [{ group, ...project(coordinates) }] : [];
  });
  const cityRanks = new Map<string, number>();
  const markers = located.map((item) => {
    const key = normalize(item.group.city);
    const rank = cityRanks.get(key) ?? 0;
    cityRanks.set(key, rank + 1);
    const angle = rank * 1.45;
    const radius = rank ? 13 + Math.floor((rank - 1) / 4) * 8 : 0;
    return { ...item, x: item.x + Math.cos(angle) * radius, y: item.y + Math.sin(angle) * radius };
  });

  return (
    <section className="networkMapCard">
      <div className="networkMapHeader">
        <div><p className="eyebrow">IMPLANTATION</p><h2>Les groupes en France</h2><p>La taille des points reflète le nombre d’adhérents actifs.</p></div>
        <span>{number.format(groups.length)} groupe{groups.length > 1 ? "s" : ""}</span>
      </div>
      <div className="networkMapLayout">
        <svg className="franceMap" viewBox="0 0 450 510" role="img" aria-label="Carte des groupes Bâtimatch en France">
          <path className="franceShape" d="M214 18 L282 36 L318 70 L371 83 L398 130 L383 179 L410 222 L384 269 L393 321 L355 349 L338 410 L290 433 L260 482 L218 465 L181 489 L148 451 L102 442 L87 393 L46 362 L55 313 L29 270 L53 225 L43 176 L78 143 L91 91 L145 73 L171 35 Z" />
          <path className="franceDetail" d="M72 145 Q180 190 382 178 M55 313 Q205 274 389 321 M146 74 Q214 210 218 465" />
          {markers.map(({ group, x, y }) => {
            const size = Math.max(8, Math.min(18, 7 + Math.sqrt(group.memberCount) * 2));
            const query = new URLSearchParams({ group: group.id, period });
            if (period === "custom" && startDate && endDate) { query.set("start", startDate); query.set("end", endDate); }
            return (
              <a href={`?${query.toString()}`} key={group.id} className="mapMarkerLink" aria-label={`Afficher ${group.name}`}>
                <circle className="mapMarkerHalo" cx={x} cy={y} r={size + 7} />
                <circle className="mapMarker" cx={x} cy={y} r={size} />
                <text className="mapMarkerCount" x={x} y={y + 4} textAnchor="middle">{group.memberCount}</text>
                <title>{`${group.name} · ${group.city}\n${group.memberCount} adhérents · ${euro.format(group.revenueWon)} de CA gagné`}</title>
              </a>
            );
          })}
        </svg>
        <div className="mapGroupList">
          {groups.map((group) => {
            const query = new URLSearchParams({ group: group.id, period });
            if (period === "custom" && startDate && endDate) { query.set("start", startDate); query.set("end", endDate); }
            return <a href={`?${query.toString()}`} key={group.id} className="mapGroupRow">
              <span className="mapGroupDot" />
              <span><strong>{group.name}</strong><small>{group.city || "Ville non renseignée"} · {group.department}</small></span>
              <span><strong>{number.format(group.memberCount)}</strong><small>adhérents</small></span>
              <span><strong>{euro.format(group.revenueWon)}</strong><small>CA gagné</small></span>
            </a>;
          })}
        </div>
      </div>
      {located.length < groups.length && <p className="maturityNote">{groups.length - located.length} groupe(s) sans ville reconnue ne figurent pas encore sur la carte.</p>}
    </section>
  );
}

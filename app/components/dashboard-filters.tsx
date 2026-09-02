"use client";

import { useState } from "react";
import type { DashboardPeriod } from "@/lib/services/dashboard";

type FilterGroup = { id: string; name: string };
type FilterPeriod = { value: DashboardPeriod; label: string };

export function DashboardFilters({
  groups,
  periods,
  selectedGroupId,
  selectedPeriod,
  selectedGroupName,
  startDate,
  endDate
}: {
  groups: FilterGroup[];
  periods: FilterPeriod[];
  selectedGroupId: string;
  selectedPeriod: DashboardPeriod;
  selectedGroupName: string;
  startDate: string;
  endDate: string;
}) {
  const [period, setPeriod] = useState(selectedPeriod);
  const isCustom = period === "custom";

  return (
    <form className={`filters${isCustom ? " filtersCustom" : ""}`} method="get">
      <div className="filterIntro">
        <span>Vue affichée</span>
        <strong>{selectedGroupName}</strong>
      </div>
      <label className="filterField">
        <span>Groupe</span>
        <select aria-label="Groupe" name="group" defaultValue={selectedGroupId}>
          <option value="all">Tous les groupes</option>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
      </label>
      <label className="filterField">
        <span>Période</span>
        <select aria-label="Période" name="period" value={period} onChange={(event) => setPeriod(event.target.value as DashboardPeriod)}>
          {periods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      {isCustom && (
        <div className="dateRange" aria-label="Plage de dates personnalisée">
          <label className="filterField">
            <span>Du</span>
            <input aria-label="Date de début" type="date" name="start" defaultValue={startDate} required />
          </label>
          <label className="filterField">
            <span>Au</span>
            <input aria-label="Date de fin" type="date" name="end" defaultValue={endDate} required />
          </label>
        </div>
      )}
      <button type="submit">Appliquer</button>
    </form>
  );
}

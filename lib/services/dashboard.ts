import "server-only";
import { FIELDS, TABLES } from "@/lib/airtable/config";
import { listRecords } from "@/lib/airtable/client";
import type { GroupSummary, NetworkKpis } from "@/lib/domain/types";

const asNumber = (value: unknown) => (typeof value === "number" ? value : 0);
const asString = (value: unknown) => (typeof value === "string" ? value : "");
const asArray = (value: unknown) => (Array.isArray(value) ? value : []);

export async function getGroups(): Promise<GroupSummary[]> {
  const f = FIELDS.groups;
  const records = await listRecords(TABLES.groups, Object.values(f));

  return records.map((record) => ({
    id: record.id,
    name: asString(record.fields[f.name]),
    memberCount: asArray(record.fields[f.members]).length,
    opportunities: asNumber(record.fields[f.createdOpportunities]),
    wonOpportunities: asNumber(record.fields[f.wonOpportunities]),
    declinedOpportunities: asNumber(record.fields[f.declinedOpportunities]),
    conversionRate: asNumber(record.fields[f.conversionRate]),
    revenue: asNumber(record.fields[f.revenue]),
    receivedVolume: asNumber(record.fields[f.receivedVolume])
  }));
}

export async function getNetworkKpis(): Promise<NetworkKpis> {
  const f = FIELDS.users;
  const records = await listRecords(TABLES.users, [
    f.memberStatus,
    f.sentOpportunities,
    f.wonOpportunities,
    f.declinedOpportunities,
    f.wonRevenue,
    f.receivedVolume
  ]);

  const active = records.filter((record) => {
    const status = record.fields[f.memberStatus];
    return typeof status === "string" ? status === "Actif" : false;
  });

  const opportunitiesSent = active.reduce((sum, r) => sum + asNumber(r.fields[f.sentOpportunities]), 0);
  const opportunitiesWon = active.reduce((sum, r) => sum + asNumber(r.fields[f.wonOpportunities]), 0);
  const declined = active.reduce((sum, r) => sum + asNumber(r.fields[f.declinedOpportunities]), 0);
  const revenueWon = active.reduce((sum, r) => sum + asNumber(r.fields[f.wonRevenue]), 0);
  const receivedVolume = active.reduce((sum, r) => sum + asNumber(r.fields[f.receivedVolume]), 0);
  const acceptedBase = Math.max(opportunitiesSent - declined, 0);

  return {
    activeMembers: active.length,
    opportunitiesSent,
    opportunitiesWon,
    revenueWon,
    receivedVolume,
    conversionRate: acceptedBase ? opportunitiesWon / acceptedBase : 0
  };
}

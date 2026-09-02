import "server-only";
import { FIELDS, TABLES } from "@/lib/airtable/config";
import { listRecords } from "@/lib/airtable/client";

export type DashboardPeriod = "30d" | "90d" | "year" | "all";

export type GroupPerformance = {
  id: string;
  name: string;
  memberCount: number;
  opportunitiesSent: number;
  opportunitiesReceived: number;
  wonOpportunities: number;
  declinedOpportunities: number;
  conversionRate: number;
  revenueWon: number;
  receivedVolume: number;
  pipelineValue: number;
};

export type DashboardKpis = {
  activeMembers: number;
  opportunitiesSent: number;
  opportunitiesReceived: number;
  opportunitiesWon: number;
  declinedOpportunities: number;
  revenueWon: number;
  receivedVolume: number;
  pipelineValue: number;
  conversionRate: number;
};

export type DashboardData = {
  groups: GroupPerformance[];
  kpis: DashboardKpis;
  selectedGroupName: string | null;
};

const CLOSED_STAGES = new Set(["Gagnée", "Perdue", "Annulée", "Déclinée"]);
const WON_STAGE = "Gagnée";
const DECLINED_STAGE = "Déclinée";

const asNumber = (value: unknown) => (typeof value === "number" ? value : 0);
const asString = (value: unknown) => (typeof value === "string" ? value : "");
const asIds = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

function periodStart(period: DashboardPeriod): Date | null {
  const now = new Date();
  if (period === "all") return null;
  if (period === "year") return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const days = period === "30d" ? 30 : 90;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function isInPeriod(value: unknown, start: Date | null) {
  if (!start) return true;
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date >= start;
}

function firstId(value: unknown) {
  return asIds(value)[0] ?? null;
}

export async function getDashboardData(
  period: DashboardPeriod = "30d",
  selectedGroupId = "all"
): Promise<DashboardData> {
  const uf = FIELDS.users;
  const gf = FIELDS.groups;
  const of = FIELDS.opportunities;

  const [users, groupRecords, opportunities] = await Promise.all([
    listRecords(TABLES.users, [uf.memberStatus, uf.groupLinks]),
    listRecords(TABLES.groups, [gf.name, gf.members]),
    listRecords(TABLES.opportunities, [
      of.giver,
      of.receiver,
      of.stage,
      of.createdAt,
      of.opportunityAmount,
      of.quoteAmountHT
    ])
  ]);

  const userGroups = new Map<string, string[]>();
  const activeUserIds = new Set<string>();

  for (const user of users) {
    userGroups.set(user.id, asIds(user.fields[uf.groupLinks]));
    if (asString(user.fields[uf.memberStatus]) === "Actif") activeUserIds.add(user.id);
  }

  const start = periodStart(period);
  const filteredOpportunities = opportunities.filter((opportunity) =>
    isInPeriod(opportunity.fields[of.createdAt], start)
  );

  const groupNames = new Map(groupRecords.map((g) => [g.id, asString(g.fields[gf.name])]));

  function opportunityGroup(opportunity: (typeof filteredOpportunities)[number], role: "giver" | "receiver") {
    const userId = firstId(opportunity.fields[role === "giver" ? of.giver : of.receiver]);
    if (!userId) return null;
    return userGroups.get(userId)?.[0] ?? null;
  }

  function compute(groupId: string | null): DashboardKpis {
    const memberIds = groupId
      ? users.filter((u) => asIds(u.fields[uf.groupLinks]).includes(groupId)).map((u) => u.id)
      : users.map((u) => u.id);
    const activeMembers = memberIds.filter((id) => activeUserIds.has(id)).length;

    const sent = filteredOpportunities.filter((o) => !groupId || opportunityGroup(o, "giver") === groupId);
    const received = filteredOpportunities.filter((o) => !groupId || opportunityGroup(o, "receiver") === groupId);
    const won = received.filter((o) => asString(o.fields[of.stage]) === WON_STAGE);
    const declined = received.filter((o) => asString(o.fields[of.stage]) === DECLINED_STAGE);
    const pipeline = received.filter((o) => !CLOSED_STAGES.has(asString(o.fields[of.stage])));

    const revenueWon = won.reduce((sum, o) => sum + asNumber(o.fields[of.quoteAmountHT]), 0);
    const receivedVolume = received.reduce((sum, o) => sum + asNumber(o.fields[of.opportunityAmount]), 0);
    const pipelineValue = pipeline.reduce((sum, o) => {
      const quote = asNumber(o.fields[of.quoteAmountHT]);
      return sum + (quote || asNumber(o.fields[of.opportunityAmount]));
    }, 0);
    const acceptedBase = Math.max(received.length - declined.length, 0);

    return {
      activeMembers,
      opportunitiesSent: sent.length,
      opportunitiesReceived: received.length,
      opportunitiesWon: won.length,
      declinedOpportunities: declined.length,
      revenueWon,
      receivedVolume,
      pipelineValue,
      conversionRate: acceptedBase ? won.length / acceptedBase : 0
    };
  }

  const groups: GroupPerformance[] = groupRecords.map((group) => {
    const kpis = compute(group.id);
    return {
      id: group.id,
      name: asString(group.fields[gf.name]),
      memberCount: asIds(group.fields[gf.members]).length,
      opportunitiesSent: kpis.opportunitiesSent,
      opportunitiesReceived: kpis.opportunitiesReceived,
      wonOpportunities: kpis.opportunitiesWon,
      declinedOpportunities: kpis.declinedOpportunities,
      conversionRate: kpis.conversionRate,
      revenueWon: kpis.revenueWon,
      receivedVolume: kpis.receivedVolume,
      pipelineValue: kpis.pipelineValue
    };
  }).sort((a, b) => b.revenueWon - a.revenueWon);

  const validSelectedGroupId = selectedGroupId !== "all" && groupNames.has(selectedGroupId) ? selectedGroupId : null;

  return {
    groups,
    kpis: compute(validSelectedGroupId),
    selectedGroupName: validSelectedGroupId ? groupNames.get(validSelectedGroupId) ?? null : null
  };
}

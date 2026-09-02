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
  opportunitiesLost: number;
  openOpportunities: number;
  declinedOpportunities: number;
  revenueWon: number;
  receivedVolume: number;
  pipelineValue: number;
  conversionRate: number;
  averageCloseDays: number;
};

export type TrendPoint = {
  key: string;
  label: string;
  sent: number;
  received: number;
  won: number;
  revenueWon: number;
};

export type DashboardData = {
  groups: GroupPerformance[];
  kpis: DashboardKpis;
  previousKpis: DashboardKpis | null;
  trends: TrendPoint[];
  selectedGroupName: string | null;
};

const CLOSED_STAGES = new Set(["Gagnée", "Perdue", "Annulée", "Déclinée"]);
const WON_STAGE = "Gagnée";
const DECLINED_STAGE = "Déclinée";
const LOST_STAGE = "Perdue";

const asNumber = (value: unknown) => (typeof value === "number" ? value : 0);
const asString = (value: unknown) => (typeof value === "string" ? value : "");
const asIds = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

function periodBounds(period: DashboardPeriod) {
  const now = new Date();
  if (period === "all") return { start: null, end: now, previousStart: null, previousEnd: null };
  if (period === "year") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const previousStart = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
    const previousEnd = new Date(previousStart.getTime() + (now.getTime() - start.getTime()));
    return { start, end: now, previousStart, previousEnd };
  }
  const days = period === "30d" ? 30 : 90;
  const duration = days * 24 * 60 * 60 * 1000;
  const start = new Date(now.getTime() - duration);
  return { start, end: now, previousStart: new Date(start.getTime() - duration), previousEnd: start };
}

function recordDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function isInPeriod(value: unknown, start: Date | null, end: Date | null) {
  if (!start) return true;
  const date = recordDate(value);
  return Boolean(date && date >= start && (!end || date < end));
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
      of.closedAt,
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

  const bounds = periodBounds(period);
  const filteredOpportunities = opportunities.filter((opportunity) =>
    isInPeriod(opportunity.fields[of.createdAt], bounds.start, bounds.end)
  );
  const closedOpportunities = opportunities.filter((opportunity) =>
    isInPeriod(opportunity.fields[of.closedAt], bounds.start, bounds.end)
  );
  const previousOpportunities = bounds.previousStart
    ? opportunities.filter((opportunity) =>
        isInPeriod(opportunity.fields[of.createdAt], bounds.previousStart, bounds.previousEnd)
      )
    : [];
  const previousClosedOpportunities = bounds.previousStart
    ? opportunities.filter((opportunity) =>
        isInPeriod(opportunity.fields[of.closedAt], bounds.previousStart, bounds.previousEnd)
      )
    : [];

  const groupNames = new Map(groupRecords.map((g) => [g.id, asString(g.fields[gf.name])]));

  function opportunityGroup(opportunity: (typeof opportunities)[number], role: "giver" | "receiver") {
    const userId = firstId(opportunity.fields[role === "giver" ? of.giver : of.receiver]);
    if (!userId) return null;
    return userGroups.get(userId)?.[0] ?? null;
  }

  function compute(activitySource: typeof opportunities, outcomeSource: typeof opportunities, groupId: string | null, includePipeline = true): DashboardKpis {
    const memberIds = groupId
      ? users.filter((u) => asIds(u.fields[uf.groupLinks]).includes(groupId)).map((u) => u.id)
      : users.map((u) => u.id);
    const activeMembers = memberIds.filter((id) => activeUserIds.has(id)).length;

    const sent = activitySource.filter((o) => !groupId || opportunityGroup(o, "giver") === groupId);
    const received = activitySource.filter((o) => !groupId || opportunityGroup(o, "receiver") === groupId);
    const outcomes = outcomeSource.filter((o) => !groupId || opportunityGroup(o, "receiver") === groupId);
    const won = outcomes.filter((o) => asString(o.fields[of.stage]) === WON_STAGE);
    const lost = outcomes.filter((o) => asString(o.fields[of.stage]) === LOST_STAGE);
    const declined = received.filter((o) => asString(o.fields[of.stage]) === DECLINED_STAGE);
    const pipeline = includePipeline
      ? opportunities.filter((o) => (!groupId || opportunityGroup(o, "receiver") === groupId) && !CLOSED_STAGES.has(asString(o.fields[of.stage])))
      : [];

    const revenueWon = won.reduce((sum, o) => sum + asNumber(o.fields[of.quoteAmountHT]), 0);
    const receivedVolume = received.reduce((sum, o) => sum + asNumber(o.fields[of.opportunityAmount]), 0);
    const pipelineValue = pipeline.reduce((sum, o) => {
      const quote = asNumber(o.fields[of.quoteAmountHT]);
      return sum + (quote || asNumber(o.fields[of.opportunityAmount]));
    }, 0);
    const decided = won.length + lost.length;
    const closeDurations = [...won, ...lost].flatMap((opportunity) => {
      const createdAt = recordDate(opportunity.fields[of.createdAt]);
      const closedAt = recordDate(opportunity.fields[of.closedAt]);
      if (!createdAt || !closedAt || closedAt < createdAt) return [];
      return [(closedAt.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000)];
    });

    return {
      activeMembers,
      opportunitiesSent: sent.length,
      opportunitiesReceived: received.length,
      opportunitiesWon: won.length,
      opportunitiesLost: lost.length,
      openOpportunities: pipeline.length,
      declinedOpportunities: declined.length,
      revenueWon,
      receivedVolume,
      pipelineValue,
      conversionRate: decided ? won.length / decided : 0,
      averageCloseDays: closeDurations.length
        ? closeDurations.reduce((sum, days) => sum + days, 0) / closeDurations.length
        : 0
    };
  }

  const groups: GroupPerformance[] = groupRecords.map((group) => {
    const kpis = compute(filteredOpportunities, closedOpportunities, group.id);
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

  const trendMap = new Map<string, TrendPoint>();
  const useWeeks = period === "30d" || period === "90d";
  const bucketStart = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), useWeeks ? date.getUTCDate() - date.getUTCDay() + 1 : 1));
  const allDates = opportunities.flatMap((opportunity) => [recordDate(opportunity.fields[of.createdAt]), recordDate(opportunity.fields[of.closedAt])].filter((date): date is Date => Boolean(date)));
  const firstTrendDate = bounds.start ?? (allDates.length ? new Date(Math.min(...allDates.map((date) => date.getTime()))) : bounds.end);
  for (let cursor = bucketStart(firstTrendDate); cursor <= bounds.end; cursor = useWeeks
    ? new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000)
    : new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))) {
    const key = cursor.toISOString().slice(0, 10);
    trendMap.set(key, {
      key,
      label: cursor.toLocaleDateString("fr-FR", useWeeks ? { day: "2-digit", month: "short" } : { month: "short", year: "2-digit" }),
      sent: 0,
      received: 0,
      won: 0,
      revenueWon: 0
    });
  }

  for (const opportunity of filteredOpportunities) {
    const date = recordDate(opportunity.fields[of.createdAt]);
    if (!date) continue;
    const bucketDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), useWeeks ? date.getUTCDate() - date.getUTCDay() + 1 : 1));
    const key = bucketDate.toISOString().slice(0, 10);
    const point = trendMap.get(key);
    if (!point) continue;
    if (!validSelectedGroupId || opportunityGroup(opportunity, "giver") === validSelectedGroupId) point.sent += 1;
    if (!validSelectedGroupId || opportunityGroup(opportunity, "receiver") === validSelectedGroupId) point.received += 1;
  }

  for (const opportunity of closedOpportunities) {
    if (validSelectedGroupId && opportunityGroup(opportunity, "receiver") !== validSelectedGroupId) continue;
    if (asString(opportunity.fields[of.stage]) !== WON_STAGE) continue;
    const date = recordDate(opportunity.fields[of.closedAt]);
    if (!date) continue;
    const point = trendMap.get(bucketStart(date).toISOString().slice(0, 10));
    if (!point) continue;
    point.won += 1;
    point.revenueWon += asNumber(opportunity.fields[of.quoteAmountHT]);
  }

  return {
    groups,
    kpis: compute(filteredOpportunities, closedOpportunities, validSelectedGroupId),
    previousKpis: bounds.previousStart ? compute(previousOpportunities, previousClosedOpportunities, validSelectedGroupId, false) : null,
    trends: [...trendMap.values()].sort((a, b) => a.key.localeCompare(b.key)),
    selectedGroupName: validSelectedGroupId ? groupNames.get(validSelectedGroupId) ?? null : null
  };
}

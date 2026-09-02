import "server-only";
import { FIELDS, TABLES } from "@/lib/airtable/config";
import { listRecords } from "@/lib/airtable/client";

export type DashboardPeriod = "30d" | "90d" | "year" | "all" | "custom";

export type DashboardDateRange = {
  start: string;
  end: string;
};

export type GroupPerformance = {
  id: string;
  name: string;
  memberCount: number;
  opportunitiesSent: number;
  opportunitiesReceived: number;
  wonOpportunities: number;
  declinedOpportunities: number;
  closingRate: number;
  quoteConversionRate: number;
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
  closingRate: number;
  quoteConversionRate: number;
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

export type LeaderboardEntry = {
  id: string;
  name: string;
  count: number;
  amount: number;
};

export type MaturityPoint = {
  month: number;
  volume: number;
  revenue: number;
  opportunities: number;
  activeMembers: number;
};

export type MaturitySeries = {
  id: string;
  name: string;
  points: MaturityPoint[];
};

export type DashboardData = {
  groups: GroupPerformance[];
  kpis: DashboardKpis;
  previousKpis: DashboardKpis | null;
  trends: TrendPoint[];
  leaderboards: {
    donorsByCount: LeaderboardEntry[];
    donorsByAmount: LeaderboardEntry[];
    signersByCount: LeaderboardEntry[];
    signersByAmount: LeaderboardEntry[];
  };
  development: {
    newMembers: number;
    guests: number;
  };
  previousDevelopment: {
    newMembers: number;
    guests: number;
  } | null;
  maturitySeries: MaturitySeries[];
  selectedGroupName: string | null;
};

const CLOSED_STAGES = new Set(["Gagnée", "Perdue", "Annulée", "Déclinée"]);
const WON_STAGE = "Gagnée";
const DECLINED_STAGE = "Déclinée";
const LOST_STAGE = "Perdue";

const asNumber = (value: unknown) => (typeof value === "number" ? value : 0);
const asString = (value: unknown) => (typeof value === "string" ? value : "");
const asIds = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

function dateOnly(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function periodBounds(period: DashboardPeriod, customRange?: DashboardDateRange) {
  const now = new Date();
  if (period === "all") return { start: null, end: now, previousStart: null, previousEnd: null };
  if (period === "custom") {
    const start = dateOnly(customRange?.start);
    const inclusiveEnd = dateOnly(customRange?.end);
    if (!start || !inclusiveEnd || start > inclusiveEnd) throw new Error("La plage de dates personnalisée est invalide");
    const end = new Date(inclusiveEnd.getTime() + 24 * 60 * 60 * 1000);
    const duration = end.getTime() - start.getTime();
    return {
      start,
      end,
      previousStart: new Date(start.getTime() - duration),
      previousEnd: start
    };
  }
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
  selectedGroupId = "all",
  customRange?: DashboardDateRange
): Promise<DashboardData> {
  const uf = FIELDS.users;
  const gf = FIELDS.groups;
  const of = FIELDS.opportunities;
  const guestFields = FIELDS.guests;

  const [users, groupRecords, opportunities, guests] = await Promise.all([
    listRecords(TABLES.users, [uf.displayName, uf.memberStatus, uf.userType, uf.groupLinks, uf.testStartDate, uf.createdAt]),
    listRecords(TABLES.groups, [gf.name, gf.members, gf.createdAt]),
    listRecords(TABLES.opportunities, [
      of.giver,
      of.receiver,
      of.stage,
      of.createdAt,
      of.closedAt,
      of.quoteDate,
      of.opportunityAmount,
      of.quoteAmountHT
    ]),
    listRecords(TABLES.guests, [guestFields.eventStartDate, guestFields.linkedUsers])
  ]);

  const userGroups = new Map<string, string[]>();
  const activeUserIds = new Set<string>();

  for (const user of users) {
    userGroups.set(user.id, asIds(user.fields[uf.groupLinks]));
    if (asString(user.fields[uf.memberStatus]) === "Actif") activeUserIds.add(user.id);
  }

  const bounds = periodBounds(period, customRange);
  const filteredOpportunities = opportunities.filter((opportunity) =>
    isInPeriod(opportunity.fields[of.createdAt], bounds.start, bounds.end)
  );
  const closedOpportunities = opportunities.filter((opportunity) =>
    isInPeriod(opportunity.fields[of.closedAt], bounds.start, bounds.end)
  );
  const quotedOpportunities = opportunities.filter((opportunity) =>
    recordDate(opportunity.fields[of.quoteDate]) &&
    isInPeriod(opportunity.fields[of.quoteDate], bounds.start, bounds.end)
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
  const previousQuotedOpportunities = bounds.previousStart
    ? opportunities.filter((opportunity) =>
        isInPeriod(opportunity.fields[of.quoteDate], bounds.previousStart, bounds.previousEnd)
      )
    : [];

  const groupNames = new Map(groupRecords.map((g) => [g.id, asString(g.fields[gf.name])]));
  const userNames = new Map(users.map((user) => [user.id, asString(user.fields[uf.displayName]) || "Membre sans nom"]));

  function opportunityGroup(opportunity: (typeof opportunities)[number], role: "giver" | "receiver") {
    const userId = firstId(opportunity.fields[role === "giver" ? of.giver : of.receiver]);
    if (!userId) return null;
    return userGroups.get(userId)?.[0] ?? null;
  }

  function compute(activitySource: typeof opportunities, outcomeSource: typeof opportunities, quoteSource: typeof opportunities, groupId: string | null, includePipeline = true): DashboardKpis {
    const memberIds = groupId
      ? users.filter((u) => asIds(u.fields[uf.groupLinks]).includes(groupId)).map((u) => u.id)
      : users.map((u) => u.id);
    const activeMembers = memberIds.filter((id) => activeUserIds.has(id)).length;

    const sent = activitySource.filter((o) => !groupId || opportunityGroup(o, "giver") === groupId);
    const received = activitySource.filter((o) => !groupId || opportunityGroup(o, "receiver") === groupId);
    const outcomes = outcomeSource.filter((o) => !groupId || opportunityGroup(o, "receiver") === groupId);
    const won = outcomes.filter((o) => asString(o.fields[of.stage]) === WON_STAGE);
    const lost = outcomes.filter((o) => asString(o.fields[of.stage]) === LOST_STAGE);
    const quoted = quoteSource.filter((o) => !groupId || opportunityGroup(o, "receiver") === groupId);
    const quotedWon = quoted.filter((o) => asString(o.fields[of.stage]) === WON_STAGE);
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
      closingRate: decided ? won.length / decided : 0,
      quoteConversionRate: quoted.length ? quotedWon.length / quoted.length : 0,
      averageCloseDays: closeDurations.length
        ? closeDurations.reduce((sum, days) => sum + days, 0) / closeDurations.length
        : 0
    };
  }

  const groups: GroupPerformance[] = groupRecords.map((group) => {
    const kpis = compute(filteredOpportunities, closedOpportunities, quotedOpportunities, group.id);
    return {
      id: group.id,
      name: asString(group.fields[gf.name]),
      memberCount: asIds(group.fields[gf.members]).length,
      opportunitiesSent: kpis.opportunitiesSent,
      opportunitiesReceived: kpis.opportunitiesReceived,
      wonOpportunities: kpis.opportunitiesWon,
      declinedOpportunities: kpis.declinedOpportunities,
      closingRate: kpis.closingRate,
      quoteConversionRate: kpis.quoteConversionRate,
      revenueWon: kpis.revenueWon,
      receivedVolume: kpis.receivedVolume,
      pipelineValue: kpis.pipelineValue
    };
  }).sort((a, b) => b.revenueWon - a.revenueWon);

  const validSelectedGroupId = selectedGroupId !== "all" && groupNames.has(selectedGroupId) ? selectedGroupId : null;

  const maturityReferenceDate = new Date();
  const maturitySeries: MaturitySeries[] = groupRecords.flatMap((group) => {
    const openedAt = recordDate(group.fields[gf.createdAt]);
    if (!openedAt || openedAt > maturityReferenceDate) return [];
    const monthCount = Math.min(24, Math.floor((maturityReferenceDate.getTime() - openedAt.getTime()) / (30 * 24 * 60 * 60 * 1000)) + 1);
    const points = Array.from({ length: monthCount }, (_, index) => ({
      month: index + 1,
      volume: 0,
      revenue: 0,
      opportunities: 0,
      activeMembers: 0
    }));
    return [{ id: group.id, name: asString(group.fields[gf.name]) || "Groupe sans nom", points }];
  });
  const maturityByGroup = new Map(maturitySeries.map((series) => [series.id, series]));

  function maturityMonth(groupId: string, value: unknown) {
    const openedAt = recordDate(groupRecords.find((group) => group.id === groupId)?.fields[gf.createdAt]);
    const date = recordDate(value);
    if (!openedAt || !date || date < openedAt) return null;
    const month = Math.floor((date.getTime() - openedAt.getTime()) / (30 * 24 * 60 * 60 * 1000)) + 1;
    return month >= 1 && month <= 24 ? month : null;
  }

  function membershipMonth(groupId: string, value: unknown) {
    const openedAt = recordDate(groupRecords.find((group) => group.id === groupId)?.fields[gf.createdAt]);
    const createdAt = recordDate(value);
    if (!openedAt || !createdAt) return null;
    if (createdAt <= openedAt) return 1;
    const month = Math.floor((createdAt.getTime() - openedAt.getTime()) / (30 * 24 * 60 * 60 * 1000)) + 1;
    return month >= 1 && month <= 24 ? month : null;
  }

  for (const opportunity of opportunities) {
    const groupId = opportunityGroup(opportunity, "receiver");
    if (!groupId) continue;
    const series = maturityByGroup.get(groupId);
    if (!series) continue;
    const activityMonth = maturityMonth(groupId, opportunity.fields[of.createdAt]);
    if (activityMonth && series.points[activityMonth - 1]) {
      series.points[activityMonth - 1].opportunities += 1;
      series.points[activityMonth - 1].volume += asNumber(opportunity.fields[of.opportunityAmount]);
    }
    if (asString(opportunity.fields[of.stage]) !== WON_STAGE) continue;
    const revenueMonth = maturityMonth(groupId, opportunity.fields[of.closedAt]);
    if (revenueMonth && series.points[revenueMonth - 1]) {
      series.points[revenueMonth - 1].revenue += asNumber(opportunity.fields[of.quoteAmountHT]);
    }
  }

  for (const user of users) {
    if (!activeUserIds.has(user.id) || asString(user.fields[uf.userType]) !== "Adhérent") continue;
    for (const groupId of userGroups.get(user.id) ?? []) {
      const series = maturityByGroup.get(groupId);
      if (!series) continue;
      const entryMonth = membershipMonth(groupId, user.fields[uf.createdAt]);
      if (entryMonth && series.points[entryMonth - 1]) series.points[entryMonth - 1].activeMembers += 1;
    }
  }

  function leaderboard(source: typeof opportunities, role: "giver" | "receiver", amountField: string, wonOnly = false) {
    const totals = new Map<string, LeaderboardEntry>();

    for (const opportunity of source) {
      if (wonOnly && asString(opportunity.fields[of.stage]) !== WON_STAGE) continue;
      if (validSelectedGroupId && opportunityGroup(opportunity, role) !== validSelectedGroupId) continue;
      const userId = firstId(opportunity.fields[role === "giver" ? of.giver : of.receiver]);
      if (!userId) continue;
      const current = totals.get(userId) ?? {
        id: userId,
        name: userNames.get(userId) ?? "Membre sans nom",
        count: 0,
        amount: 0
      };
      current.count += 1;
      current.amount += asNumber(opportunity.fields[amountField]);
      totals.set(userId, current);
    }

    return [...totals.values()];
  }

  const donorTotals = leaderboard(filteredOpportunities, "giver", of.opportunityAmount);
  const signerTotals = leaderboard(closedOpportunities, "receiver", of.quoteAmountHT, true);
  const byCount = (a: LeaderboardEntry, b: LeaderboardEntry) =>
    b.count - a.count || b.amount - a.amount || a.name.localeCompare(b.name, "fr");
  const byAmount = (a: LeaderboardEntry, b: LeaderboardEntry) =>
    b.amount - a.amount || b.count - a.count || a.name.localeCompare(b.name, "fr");
  const leaderboards = {
    donorsByCount: [...donorTotals].sort(byCount).slice(0, 3),
    donorsByAmount: [...donorTotals].sort(byAmount).slice(0, 3),
    signersByCount: [...signerTotals].sort(byCount).slice(0, 3),
    signersByAmount: [...signerTotals].sort(byAmount).slice(0, 3)
  };

  function firstDateValue(value: unknown) {
    if (typeof value === "string") return value;
    return Array.isArray(value) ? value.find((item): item is string => typeof item === "string") : undefined;
  }

  function development(start: Date | null, end: Date | null) {
    const belongsToSelectedGroup = (userId: string) =>
      !validSelectedGroupId || userGroups.get(userId)?.includes(validSelectedGroupId);
    const newMembers = users.filter((user) => {
      const testStartDate = user.fields[uf.testStartDate];
      return belongsToSelectedGroup(user.id) && Boolean(recordDate(testStartDate)) && isInPeriod(testStartDate, start, end);
    }).length;
    const guestCount = guests.filter((guest) => {
      const linkedUserIds = asIds(guest.fields[guestFields.linkedUsers]);
      const eventStartDate = firstDateValue(guest.fields[guestFields.eventStartDate]);
      return linkedUserIds.some(belongsToSelectedGroup) &&
        Boolean(recordDate(eventStartDate)) && isInPeriod(eventStartDate, start, end);
    }).length;
    return { newMembers, guests: guestCount };
  }

  const trendMap = new Map<string, TrendPoint>();
  const trendDuration = bounds.start ? bounds.end.getTime() - bounds.start.getTime() : Number.POSITIVE_INFINITY;
  const useWeeks = trendDuration <= 120 * 24 * 60 * 60 * 1000;
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
    kpis: compute(filteredOpportunities, closedOpportunities, quotedOpportunities, validSelectedGroupId),
    previousKpis: bounds.previousStart ? compute(previousOpportunities, previousClosedOpportunities, previousQuotedOpportunities, validSelectedGroupId, false) : null,
    trends: [...trendMap.values()].sort((a, b) => a.key.localeCompare(b.key)),
    leaderboards,
    development: development(bounds.start, bounds.end),
    previousDevelopment: bounds.previousStart ? development(bounds.previousStart, bounds.previousEnd) : null,
    maturitySeries,
    selectedGroupName: validSelectedGroupId ? groupNames.get(validSelectedGroupId) ?? null : null
  };
}

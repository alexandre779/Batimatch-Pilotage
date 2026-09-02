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
  pendingTreatment: number;
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

export type NetworkHealth = {
  id: string;
  name: string;
  status: "healthy" | "watch" | "alert";
  score: number;
  activeMembers: number;
  pendingTreatment: number;
  overdueTreatment: number;
  daysSinceLastOpportunity: number | null;
  opportunitiesInPeriod: number;
  revenueWon: number;
};

export type NetworkAlert = {
  id: string;
  level: "warning" | "critical";
  groupName: string;
  message: string;
};

export type FunnelStep = {
  stage: string;
  count: number;
  conversion: number | null;
};

export type NetworkForecast = {
  days30: number;
  days60: number;
  days90: number;
  pipeline: number;
};

export type GroupObjective = {
  id: string;
  name: string;
  monthlyRevenue: { actual: number; target: number };
  monthlyOpportunities: { actual: number; target: number };
  monthlySentVolume: { actual: number; target: number };
  annualNewMembers: { actual: number; target: number };
};

export type PresidentCoachAction = {
  id: string;
  priority: "urgent" | "important" | "opportunity";
  title: string;
  summary: string;
  amount: number | null;
  impact: string;
  items: string[];
};

export type MemberBalance = {
  id: string;
  name: string;
  sentCount: number;
  sentAmount: number;
  receivedCount: number;
  receivedAmount: number;
  lastSentDays: number | null;
  lastReceivedDays: number | null;
  quadrant: "motor" | "giver" | "receiver" | "inactive";
};

export type GroupBalance = {
  score: number;
  label: "Équilibre solide" | "Participation concentrée" | "Échanges déséquilibrés" | "Mobilisation nécessaire";
  giverParticipation: number;
  receiverParticipation: number;
  sentReceivedRatio: number | null;
  topThreeShare: number;
  members: MemberBalance[];
  recommendations: string[];
};

export type GoalScenario = {
  key: "prudent" | "realistic" | "ambitious";
  label: string;
  wins: number;
  quotes: number;
  appointments: number;
  opportunities: number;
  opportunitiesPerMember: number;
};

export type GoalSimulator = {
  target: number;
  actual: number;
  remaining: number;
  daysRemaining: number;
  weightedPipeline: number;
  gapAfterPipeline: number;
  averageWonAmount: number;
  scenarios: GoalScenario[];
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
  pendingTreatmentByMember: Array<{ id: string; name: string; count: number }>;
  pendingTreatmentByGroup: Array<{ id: string; name: string; count: number }>;
  networkHealth: NetworkHealth[];
  networkAlerts: NetworkAlert[];
  funnel: FunnelStep[];
  forecast: NetworkForecast;
  groupObjectives: GroupObjective[];
  presidentCoach: PresidentCoachAction[];
  groupBalance: GroupBalance | null;
  goalSimulator: GoalSimulator | null;
  selectedGroupName: string | null;
};

const CLOSED_STAGES = new Set(["Gagnée", "Perdue", "Annulée", "Déclinée"]);
const WON_STAGE = "Gagnée";
const DECLINED_STAGE = "Déclinée";
const LOST_STAGE = "Perdue";
const PENDING_TREATMENT_STAGE = "A traiter";

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
    listRecords(TABLES.groups, [
      gf.name, gf.members, gf.createdAt, gf.monthlyRevenueTarget,
      gf.monthlyOpportunityTarget, gf.monthlySentVolumeTarget, gf.annualNewMemberTarget
    ]),
    listRecords(TABLES.opportunities, [
      of.reference,
      of.name,
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
    const pendingTreatment = opportunities.filter((o) =>
      (!groupId || opportunityGroup(o, "receiver") === groupId) &&
      asString(o.fields[of.stage]) === PENDING_TREATMENT_STAGE
    ).length;

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
      pendingTreatment,
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

  const pendingByMember = new Map<string, { id: string; name: string; count: number }>();
  const pendingByGroup = new Map<string, { id: string; name: string; count: number }>();
  for (const opportunity of opportunities) {
    if (asString(opportunity.fields[of.stage]) !== PENDING_TREATMENT_STAGE) continue;
    const receiverGroupId = opportunityGroup(opportunity, "receiver");
    if (receiverGroupId) {
      const currentGroup = pendingByGroup.get(receiverGroupId) ?? {
        id: receiverGroupId,
        name: groupNames.get(receiverGroupId) ?? "Groupe sans nom",
        count: 0
      };
      currentGroup.count += 1;
      pendingByGroup.set(receiverGroupId, currentGroup);
    }
    if (validSelectedGroupId && receiverGroupId !== validSelectedGroupId) continue;
    const receiverId = firstId(opportunity.fields[of.receiver]);
    if (!receiverId) continue;
    const current = pendingByMember.get(receiverId) ?? {
      id: receiverId,
      name: userNames.get(receiverId) ?? "Adhérent sans nom",
      count: 0
    };
    current.count += 1;
    pendingByMember.set(receiverId, current);
  }

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const networkHealth: NetworkHealth[] = groupRecords.map((group) => {
    const groupId = group.id;
    const groupOpportunities = opportunities.filter((opportunity) =>
      opportunityGroup(opportunity, "giver") === groupId || opportunityGroup(opportunity, "receiver") === groupId
    );
    const receivedPending = opportunities.filter((opportunity) =>
      opportunityGroup(opportunity, "receiver") === groupId &&
      asString(opportunity.fields[of.stage]) === PENDING_TREATMENT_STAGE
    );
    const overdueTreatment = receivedPending.filter((opportunity) => {
      const createdAt = recordDate(opportunity.fields[of.createdAt]);
      return Boolean(createdAt && now.getTime() - createdAt.getTime() > 7 * dayMs);
    }).length;
    const lastActivity = groupOpportunities
      .map((opportunity) => recordDate(opportunity.fields[of.createdAt]))
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const daysSinceLastOpportunity = lastActivity
      ? Math.max(0, Math.floor((now.getTime() - lastActivity.getTime()) / dayMs))
      : null;
    const activeMembers = users.filter((user) =>
      activeUserIds.has(user.id) && asIds(user.fields[uf.groupLinks]).includes(groupId)
    ).length;
    const periodKpis = compute(filteredOpportunities, closedOpportunities, quotedOpportunities, groupId);
    const inactive = daysSinceLastOpportunity === null || daysSinceLastOpportunity > 30;
    const status: NetworkHealth["status"] = overdueTreatment > 0 || inactive
      ? "alert"
      : receivedPending.length > 0 || (daysSinceLastOpportunity ?? 0) > 14
        ? "watch"
        : "healthy";
    const score = Math.max(0, 100
      - Math.min(45, overdueTreatment * 15)
      - Math.min(20, Math.max(0, receivedPending.length - overdueTreatment) * 5)
      - (inactive ? 35 : (daysSinceLastOpportunity ?? 0) > 14 ? 15 : 0));
    return {
      id: groupId,
      name: groupNames.get(groupId) || "Groupe sans nom",
      status,
      score,
      activeMembers,
      pendingTreatment: receivedPending.length,
      overdueTreatment,
      daysSinceLastOpportunity,
      opportunitiesInPeriod: periodKpis.opportunitiesReceived,
      revenueWon: periodKpis.revenueWon
    };
  }).sort((a, b) => a.score - b.score || a.name.localeCompare(b.name, "fr"));

  const networkAlerts: NetworkAlert[] = networkHealth.flatMap((group) => {
    const alerts: NetworkAlert[] = [];
    if (group.overdueTreatment > 0) alerts.push({
      id: `${group.id}-overdue`, level: "critical", groupName: group.name,
      message: `${group.overdueTreatment} affaire${group.overdueTreatment > 1 ? "s" : ""} sans traitement depuis plus de 7 jours`
    });
    const recentPending = group.pendingTreatment - group.overdueTreatment;
    if (recentPending > 0) alerts.push({
      id: `${group.id}-pending`, level: "warning", groupName: group.name,
      message: `${recentPending} affaire${recentPending > 1 ? "s" : ""} en attente de prise en charge`
    });
    if (group.daysSinceLastOpportunity === null || group.daysSinceLastOpportunity > 30) alerts.push({
      id: `${group.id}-inactive`, level: "critical", groupName: group.name,
      message: group.daysSinceLastOpportunity === null
        ? "Aucune opportunité enregistrée"
        : `Aucune nouvelle opportunité depuis ${group.daysSinceLastOpportunity} jours`
    });
    return alerts;
  });

  const funnelStages = ["A traiter", "Nouvelle", "RDV calé", "RDV fait", "Devis remis", "Gagnée"];
  const funnelCounts = funnelStages.map(() => 0);
  for (const opportunity of filteredOpportunities) {
    if (validSelectedGroupId && opportunityGroup(opportunity, "receiver") !== validSelectedGroupId) continue;
    const rawStage = asString(opportunity.fields[of.stage]);
    const stage = rawStage === "Gagnée sous condition" ? "Gagnée" : rawStage;
    const stageIndex = funnelStages.indexOf(stage);
    if (stageIndex < 0) continue;
    for (let index = 0; index <= stageIndex; index += 1) funnelCounts[index] += 1;
  }
  const funnel: FunnelStep[] = funnelStages.map((stage, index) => ({
    stage,
    count: funnelCounts[index],
    conversion: index === 0 || !funnelCounts[index - 1] ? null : funnelCounts[index] / funnelCounts[index - 1]
  }));

  const forecastWeights: Record<string, { weight: number; horizon: 30 | 60 | 90 }> = {
    "A traiter": { weight: 0.1, horizon: 90 },
    "Nouvelle": { weight: 0.15, horizon: 90 },
    "RDV calé": { weight: 0.3, horizon: 90 },
    "RDV fait": { weight: 0.45, horizon: 60 },
    "Devis remis": { weight: 0.7, horizon: 30 },
    "Gagnée sous condition": { weight: 0.85, horizon: 30 },
    "Reportée": { weight: 0.2, horizon: 90 }
  };
  let days30 = 0;
  let days60 = 0;
  let days90 = 0;
  let forecastPipeline = 0;
  for (const opportunity of opportunities) {
    if (validSelectedGroupId && opportunityGroup(opportunity, "receiver") !== validSelectedGroupId) continue;
    const stage = asString(opportunity.fields[of.stage]);
    const config = forecastWeights[stage];
    if (!config) continue;
    const amount = asNumber(opportunity.fields[of.quoteAmountHT]) || asNumber(opportunity.fields[of.opportunityAmount]);
    const weighted = amount * config.weight;
    forecastPipeline += amount;
    days90 += weighted;
    if (config.horizon <= 60) days60 += weighted;
    if (config.horizon <= 30) days30 += weighted;
  }

  const last30Start = new Date(now.getTime() - 30 * dayMs);
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const last30Activity = opportunities.filter((opportunity) =>
    isInPeriod(opportunity.fields[of.createdAt], last30Start, now)
  );
  const last30Outcomes = opportunities.filter((opportunity) =>
    isInPeriod(opportunity.fields[of.closedAt], last30Start, now)
  );
  const groupObjectives: GroupObjective[] = groupRecords.map((group) => {
    const groupId = group.id;
    const monthlyKpis = compute(last30Activity, last30Outcomes, [], groupId, false);
    const monthlySentVolume = last30Activity
      .filter((opportunity) => opportunityGroup(opportunity, "giver") === groupId)
      .reduce((sum, opportunity) => sum + asNumber(opportunity.fields[of.opportunityAmount]), 0);
    const annualNewMembers = users.filter((user) =>
      asString(user.fields[uf.userType]) === "Adhérent" &&
      asIds(user.fields[uf.groupLinks]).includes(groupId) &&
      isInPeriod(user.fields[uf.createdAt], yearStart, now)
    ).length;
    return {
      id: groupId,
      name: groupNames.get(groupId) || "Groupe sans nom",
      monthlyRevenue: { actual: monthlyKpis.revenueWon, target: asNumber(group.fields[gf.monthlyRevenueTarget]) },
      monthlyOpportunities: { actual: monthlyKpis.opportunitiesReceived, target: asNumber(group.fields[gf.monthlyOpportunityTarget]) },
      monthlySentVolume: { actual: monthlySentVolume, target: asNumber(group.fields[gf.monthlySentVolumeTarget]) },
      annualNewMembers: { actual: annualNewMembers, target: asNumber(group.fields[gf.annualNewMemberTarget]) }
    };
  }).sort((a, b) => a.name.localeCompare(b.name, "fr"));

  let goalSimulator: GoalSimulator | null = null;
  if (validSelectedGroupId) {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const receivedByGroup = opportunities.filter((opportunity) => opportunityGroup(opportunity, "receiver") === validSelectedGroupId);
    const wonByGroup = receivedByGroup.filter((opportunity) => asString(opportunity.fields[of.stage]) === WON_STAGE);
    const wonThisMonth = wonByGroup.filter((opportunity) => isInPeriod(opportunity.fields[of.closedAt], monthStart, nextMonthStart));
    const actual = wonThisMonth.reduce((sum, opportunity) => sum + asNumber(opportunity.fields[of.quoteAmountHT]), 0);
    const target = groupObjectives.find((group) => group.id === validSelectedGroupId)?.monthlyRevenue.target ?? 0;
    const remaining = Math.max(0, target - actual);
    const weightedPipeline = days30;
    const gapAfterPipeline = Math.max(0, remaining - weightedPipeline);
    const wonAmounts = wonByGroup.map((opportunity) => asNumber(opportunity.fields[of.quoteAmountHT])).filter((amount) => amount > 0);
    const averageWonAmount = wonAmounts.length ? wonAmounts.reduce((sum, amount) => sum + amount, 0) / wonAmounts.length : 10000;
    const quotedByGroup = receivedByGroup.filter((opportunity) => Boolean(recordDate(opportunity.fields[of.quoteDate])));
    const historicalClosing = receivedByGroup.length ? wonByGroup.length / receivedByGroup.length : 0.2;
    const historicalQuoteConversion = quotedByGroup.length ? wonByGroup.filter((opportunity) => Boolean(recordDate(opportunity.fields[of.quoteDate]))).length / quotedByGroup.length : 0.35;
    const activeMembers = users.filter((user) => activeUserIds.has(user.id) && asIds(user.fields[uf.groupLinks]).includes(validSelectedGroupId)).length || 1;
    const scenarioConfig: Array<{ key: GoalScenario["key"]; label: string; multiplier: number }> = [
      { key: "prudent", label: "Prudent", multiplier: 0.85 },
      { key: "realistic", label: "Réaliste", multiplier: 1 },
      { key: "ambitious", label: "Ambitieux", multiplier: 1.15 }
    ];
    // Le pipeline est une probabilité de revenu, pas du chiffre d'affaires déjà signé.
    // Il éclaire la faisabilité de l'objectif mais ne doit pas annuler le plan d'action.
    const wins = remaining > 0 ? Math.ceil(remaining / averageWonAmount) : 0;
    const scenarios = scenarioConfig.map(({ key, label, multiplier }) => {
      const quoteConversion = Math.max(0.12, Math.min(0.9, historicalQuoteConversion * multiplier));
      const closing = Math.max(0.05, Math.min(0.8, historicalClosing * multiplier));
      const quotes = wins ? Math.ceil(wins / quoteConversion) : 0;
      const appointments = quotes ? Math.ceil(quotes / Math.max(0.3, Math.min(0.85, 0.65 * multiplier))) : 0;
      const requiredOpportunities = wins ? Math.ceil(wins / closing) : 0;
      return { key, label, wins, quotes, appointments, opportunities: requiredOpportunities, opportunitiesPerMember: requiredOpportunities ? Math.ceil(requiredOpportunities / activeMembers) : 0 };
    });
    goalSimulator = { target, actual, remaining, daysRemaining: Math.max(0, Math.ceil((nextMonthStart.getTime() - now.getTime()) / dayMs)), weightedPipeline, gapAfterPipeline, averageWonAmount, scenarios };
  }

  const presidentCoach: PresidentCoachAction[] = [];
  if (validSelectedGroupId) {
    const stalled = opportunities.filter((opportunity) => {
      if (opportunityGroup(opportunity, "receiver") !== validSelectedGroupId || asString(opportunity.fields[of.stage]) !== PENDING_TREATMENT_STAGE) return false;
      const createdAt = recordDate(opportunity.fields[of.createdAt]);
      return Boolean(createdAt && now.getTime() - createdAt.getTime() >= 7 * dayMs);
    }).sort((a, b) => (recordDate(a.fields[of.createdAt])?.getTime() ?? 0) - (recordDate(b.fields[of.createdAt])?.getTime() ?? 0));
    if (stalled.length) {
      const amount = stalled.reduce((sum, opportunity) => sum + asNumber(opportunity.fields[of.opportunityAmount]), 0);
      presidentCoach.push({
        id: "stalled-opportunities",
        priority: "urgent",
        title: `Relancer ${stalled.length} affaire${stalled.length > 1 ? "s" : ""} bloquée${stalled.length > 1 ? "s" : ""}`,
        summary: "Ces opportunités attendent une première prise en charge depuis au moins 7 jours.",
        amount: amount || null,
        impact: "Réduire le risque de perte et accélérer la mise en relation.",
        items: stalled.slice(0, 4).map((opportunity) => {
          const createdAt = recordDate(opportunity.fields[of.createdAt]);
          const days = createdAt ? Math.floor((now.getTime() - createdAt.getTime()) / dayMs) : 0;
          const receiverId = firstId(opportunity.fields[of.receiver]);
          const label = asString(opportunity.fields[of.name]) || asString(opportunity.fields[of.reference]) || "Affaire sans nom";
          return `${label} · ${userNames.get(receiverId ?? "") ?? "Adhérent non renseigné"} · ${days} jours`;
        })
      });
    }

    const inactiveMembers = users.flatMap((user) => {
      if (!activeUserIds.has(user.id) || !asIds(user.fields[uf.groupLinks]).includes(validSelectedGroupId)) return [];
      const sentDates = opportunities
        .filter((opportunity) => firstId(opportunity.fields[of.giver]) === user.id)
        .map((opportunity) => recordDate(opportunity.fields[of.createdAt]))
        .filter((date): date is Date => Boolean(date));
      const lastSentAt = sentDates.length ? new Date(Math.max(...sentDates.map((date) => date.getTime()))) : null;
      const memberSince = recordDate(user.fields[uf.createdAt]) ?? recordDate(user.fields[uf.testStartDate]);
      const referenceDate = lastSentAt ?? memberSince;
      if (!referenceDate) return [];
      const days = Math.floor((now.getTime() - referenceDate.getTime()) / dayMs);
      return days >= 45 ? [{ id: user.id, name: userNames.get(user.id) ?? "Adhérent sans nom", days, neverSent: !lastSentAt }] : [];
    }).sort((a, b) => b.days - a.days);
    if (inactiveMembers.length) {
      presidentCoach.push({
        id: "inactive-members",
        priority: "important",
        title: `Réactiver ${inactiveMembers.length} adhérent${inactiveMembers.length > 1 ? "s" : ""}`,
        summary: `Aucune affaire envoyée depuis au moins 45 jours.`,
        amount: null,
        impact: "Remobiliser les membres et rééquilibrer la contribution au groupe.",
        items: inactiveMembers.slice(0, 5).map((member) => `${member.name} · ${member.neverSent ? "aucune affaire envoyée" : `dernière affaire il y a ${member.days} jours`}`)
      });
    }

    const quotesToFollow = opportunities.filter((opportunity) =>
      opportunityGroup(opportunity, "receiver") === validSelectedGroupId && asString(opportunity.fields[of.stage]) === "Devis remis"
    ).sort((a, b) => asNumber(b.fields[of.quoteAmountHT]) - asNumber(a.fields[of.quoteAmountHT]));
    if (quotesToFollow.length) {
      const amount = quotesToFollow.reduce((sum, opportunity) => sum + (asNumber(opportunity.fields[of.quoteAmountHT]) || asNumber(opportunity.fields[of.opportunityAmount])), 0);
      const objective = groupObjectives.find((group) => group.id === validSelectedGroupId)?.monthlyRevenue;
      const remaining = objective?.target ? Math.max(0, objective.target - objective.actual) : 0;
      presidentCoach.push({
        id: "quotes-to-follow",
        priority: "opportunity",
        title: `Accélérer ${quotesToFollow.length} devis en cours`,
        summary: "Ces devis remis constituent le levier commercial le plus proche de la signature.",
        amount,
        impact: remaining > 0 ? `Il reste ${Math.round(remaining).toLocaleString("fr-FR")} € à sécuriser pour atteindre l’objectif mensuel.` : "Transformer ces devis pour dépasser ou consolider l’objectif mensuel.",
        items: quotesToFollow.slice(0, 4).map((opportunity) => {
          const receiverId = firstId(opportunity.fields[of.receiver]);
          const label = asString(opportunity.fields[of.name]) || asString(opportunity.fields[of.reference]) || "Devis sans nom";
          const amountValue = asNumber(opportunity.fields[of.quoteAmountHT]) || asNumber(opportunity.fields[of.opportunityAmount]);
          return `${label} · ${userNames.get(receiverId ?? "") ?? "Adhérent non renseigné"}${amountValue ? ` · ${Math.round(amountValue).toLocaleString("fr-FR")} €` : ""}`;
        })
      });
    }
  }

  let groupBalance: GroupBalance | null = null;
  if (validSelectedGroupId) {
    const groupMembers = users.filter((user) => activeUserIds.has(user.id) && asIds(user.fields[uf.groupLinks]).includes(validSelectedGroupId));
    const memberMetrics = groupMembers.map((user) => {
      const sent = filteredOpportunities.filter((opportunity) => firstId(opportunity.fields[of.giver]) === user.id);
      const received = filteredOpportunities.filter((opportunity) => firstId(opportunity.fields[of.receiver]) === user.id);
      const allSentDates = opportunities.filter((opportunity) => firstId(opportunity.fields[of.giver]) === user.id).map((opportunity) => recordDate(opportunity.fields[of.createdAt])).filter((date): date is Date => Boolean(date));
      const allReceivedDates = opportunities.filter((opportunity) => firstId(opportunity.fields[of.receiver]) === user.id).map((opportunity) => recordDate(opportunity.fields[of.createdAt])).filter((date): date is Date => Boolean(date));
      const sentAmount = sent.reduce((sum, opportunity) => sum + asNumber(opportunity.fields[of.opportunityAmount]), 0);
      const receivedAmount = received.reduce((sum, opportunity) => sum + asNumber(opportunity.fields[of.opportunityAmount]), 0);
      const latestDays = (dates: Date[]) => dates.length ? Math.max(0, Math.floor((now.getTime() - Math.max(...dates.map((date) => date.getTime()))) / dayMs)) : null;
      return {
        id: user.id,
        name: userNames.get(user.id) ?? "Adhérent sans nom",
        sentCount: sent.length,
        sentAmount,
        receivedCount: received.length,
        receivedAmount,
        lastSentDays: latestDays(allSentDates),
        lastReceivedDays: latestDays(allReceivedDates),
        sentWeight: sentAmount || sent.length,
        receivedWeight: receivedAmount || received.length
      };
    });
    const memberCount = memberMetrics.length;
    const averageSent = memberCount ? memberMetrics.reduce((sum, member) => sum + member.sentWeight, 0) / memberCount : 0;
    const averageReceived = memberCount ? memberMetrics.reduce((sum, member) => sum + member.receivedWeight, 0) / memberCount : 0;
    const members: MemberBalance[] = memberMetrics.map((member) => {
      const givesHigh = member.sentWeight > 0 && member.sentWeight >= averageSent;
      const receivesHigh = member.receivedWeight > 0 && member.receivedWeight >= averageReceived;
      const quadrant: MemberBalance["quadrant"] = givesHigh && receivesHigh ? "motor" : givesHigh ? "giver" : receivesHigh ? "receiver" : "inactive";
      return { ...member, quadrant };
    });
    const giverParticipation = memberCount ? members.filter((member) => member.sentCount > 0).length / memberCount : 0;
    const receiverParticipation = memberCount ? members.filter((member) => member.receivedCount > 0).length / memberCount : 0;
    const totalSentAmount = members.reduce((sum, member) => sum + member.sentAmount, 0);
    const totalReceivedAmount = members.reduce((sum, member) => sum + member.receivedAmount, 0);
    const totalSentMeasure = totalSentAmount || members.reduce((sum, member) => sum + member.sentCount, 0);
    const totalReceivedMeasure = totalReceivedAmount || members.reduce((sum, member) => sum + member.receivedCount, 0);
    const sentReceivedRatio = totalReceivedMeasure > 0 ? totalSentMeasure / totalReceivedMeasure : totalSentMeasure > 0 ? null : 1;
    const contributionValues = members.map((member) => totalSentAmount ? member.sentAmount : member.sentCount).sort((a, b) => b - a);
    const totalContribution = contributionValues.reduce((sum, value) => sum + value, 0);
    const topThreeShare = totalContribution ? contributionValues.slice(0, 3).reduce((sum, value) => sum + value, 0) / totalContribution : 0;
    const reciprocity = sentReceivedRatio === null ? 0 : Math.min(sentReceivedRatio, 1 / Math.max(sentReceivedRatio, 0.0001));
    const concentration = Math.max(0, 1 - Math.max(0, topThreeShare - 0.4) / 0.6);
    const score = Math.round(Math.max(0, Math.min(100, ((giverParticipation + receiverParticipation) / 2) * 40 + reciprocity * 30 + concentration * 30)));
    const label: GroupBalance["label"] = score >= 75 ? "Équilibre solide" : score >= 55 ? "Participation concentrée" : score >= 35 ? "Échanges déséquilibrés" : "Mobilisation nécessaire";
    const recommendations: string[] = [];
    const giver = [...members].filter((member) => member.quadrant === "giver").sort((a, b) => b.sentAmount - a.sentAmount || b.sentCount - a.sentCount)[0];
    const receiver = [...members].filter((member) => member.quadrant === "receiver").sort((a, b) => b.receivedAmount - a.receivedAmount || b.receivedCount - a.receivedCount)[0];
    const inactive = [...members].filter((member) => member.quadrant === "inactive").sort((a, b) => (b.lastSentDays ?? 9999) - (a.lastSentDays ?? 9999))[0];
    if (giver) recommendations.push(`Valoriser ${giver.name}, qui contribue fortement et reçoit encore peu sur la période.`);
    if (receiver) recommendations.push(`Travailler la réciprocité avec ${receiver.name}, qui reçoit davantage qu’il ne transmet actuellement.`);
    if (inactive) recommendations.push(`Remobiliser ${inactive.name}, encore en retrait dans les échanges de la période.`);
    if (!recommendations.length) recommendations.push("Entretenir cette dynamique en valorisant publiquement les échanges croisés du groupe.");
    groupBalance = { score, label, giverParticipation, receiverParticipation, sentReceivedRatio, topThreeShare, members, recommendations: recommendations.slice(0, 3) };
  }

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
    pendingTreatmentByMember: [...pendingByMember.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr")),
    pendingTreatmentByGroup: [...pendingByGroup.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr")),
    networkHealth,
    networkAlerts,
    funnel,
    forecast: { days30, days60, days90, pipeline: forecastPipeline },
    groupObjectives,
    presidentCoach: presidentCoach.slice(0, 3),
    groupBalance,
    goalSimulator,
    selectedGroupName: validSelectedGroupId ? groupNames.get(validSelectedGroupId) ?? null : null
  };
}

import "server-only";
import { FIELDS, TABLES } from "@/lib/airtable/config";
import { listRecords } from "@/lib/airtable/client";

type SelectValue = { name?: string } | string | null | undefined;

export type FinanceGroup = {
  id: string;
  name: string;
  memberships: number;
  membershipCount: number;
  membershipCommissions: number;
  contributions: number;
  contributionsPaid: number;
  commissions: number;
  commissionsPaid: number;
};

export type FinanceData = {
  memberships: number;
  membershipCount: number;
  membershipCommissions: number;
  membershipsPaid: number;
  membershipsToInvoice: number;
  membershipsToInvoiceCount: number;
  contributions: number;
  contributionsPaid: number;
  contributionsToInvoice: number;
  commissions: number;
  commissionsPaid: number;
  overdueContributions: number;
  overdueContributionCount: number;
  overdueCommissions: number;
  overdueCommissionCount: number;
  groups: FinanceGroup[];
};

function text(value: SelectValue) {
  return typeof value === "string" ? value : value?.name ?? "";
}

function amount(value: unknown): number {
  if (Array.isArray(value)) return value.reduce<number>((total, item) => total + amount(item), 0);
  if (value && typeof value === "object") {
    const lookup = value as { valuesByLinkedRecordId?: Record<string, unknown[]> };
    if (lookup.valuesByLinkedRecordId) return Object.values(lookup.valuesByLinkedRecordId).flat().reduce<number>((total, item) => total + amount(item), 0);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function date(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function inRange(value: unknown, start: Date | null, end: Date | null) {
  if (!start) return true;
  const parsed = date(value);
  return Boolean(parsed && parsed >= start && (!end || parsed < end));
}

function isPaid(value: unknown) {
  return /pay[eé]|r[eé]gl[eé]|encaiss[eé]/i.test(text(value as SelectValue));
}

function linkedGroup(value: unknown) {
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "string" && first) return { id: first, name: first };
    return linkedGroup(first);
  }
  if (!value || typeof value !== "object") return null;
  const lookup = value as { linkedRecordIds?: string[]; valuesByLinkedRecordId?: Record<string, Array<{ id?: string; name?: string }>> };
  const linkedId = lookup.linkedRecordIds?.[0];
  const item = linkedId ? lookup.valuesByLinkedRecordId?.[linkedId]?.[0] : undefined;
  return item?.id && item.name ? { id: item.id, name: item.name } : null;
}

export async function getFinanceData(range: { start: Date | null; end: Date | null }): Promise<FinanceData> {
  const cf = FIELDS.contributions;
  const of = FIELDS.opportunities;
  const gf = FIELDS.groups;
  const [memberships, opportunities, groups] = await Promise.all([
    listRecords(TABLES.contributions, [cf.startDate, cf.testStartDate, cf.issuedAt, cf.paidAt, cf.status, cf.group, cf.baseAmount, cf.finalAmount]),
    listRecords(TABLES.opportunities, [of.stage, of.signedAt, of.dueAt, of.contribution, of.commission, of.contributionStatus, of.commissionStatus, of.receiverGroup]),
    listRecords(TABLES.groups, [gf.name])
  ]);

  const groupNames = new Map(groups.map((record) => [record.id, String(record.fields[gf.name] ?? record.id)]));
  const groupMap = new Map<string, FinanceGroup>();
  const groupRow = (group: { id: string; name: string } | null) => {
    const key = group?.id ?? "unassigned";
    const resolvedName = key === "unassigned" ? "Groupe non renseigné" : groupNames.get(key) ?? group?.name ?? key;
    if (!groupMap.has(key)) groupMap.set(key, { id: key, name: resolvedName, memberships: 0, membershipCount: 0, membershipCommissions: 0, contributions: 0, contributionsPaid: 0, commissions: 0, commissionsPaid: 0 });
    return groupMap.get(key)!;
  };

  let membershipTotal = 0, membershipCount = 0, membershipCommissions = 0, membershipsPaid = 0, membershipsToInvoice = 0, membershipsToInvoiceCount = 0;
  for (const record of memberships) {
    const status = text(record.fields[cf.status] as SelectValue);
    const accountingDate = record.fields[cf.issuedAt] ?? record.fields[cf.startDate] ?? record.fields[cf.testStartDate] ?? record.createdTime;
    if (/annul/i.test(status) || !inRange(accountingDate, range.start, range.end)) continue;
    const value = amount(record.fields[cf.finalAmount]) || amount(record.fields[cf.baseAmount]) || 400;
    const presidentCommission = value / 2;
    membershipTotal += value;
    membershipCount += 1;
    membershipCommissions += presidentCommission;
    if (/pay[eé]e?/i.test(status)) membershipsPaid += value;
    if (/attente/i.test(status)) { membershipsToInvoice += value; membershipsToInvoiceCount += 1; }
    const row = groupRow(linkedGroup(record.fields[cf.group]));
    row.memberships += value;
    row.membershipCount += 1;
    row.membershipCommissions += presidentCommission;
    row.commissions += presidentCommission;
  }

  let contributions = 0, contributionsPaid = 0, contributionsToInvoice = 0, commissions = membershipCommissions, commissionsPaid = 0;
  let overdueContributions = 0, overdueContributionCount = 0, overdueCommissions = 0, overdueCommissionCount = 0;
  const now = new Date();
  for (const record of opportunities) {
    if (!/^gagn[eé]e?$/i.test(text(record.fields[of.stage] as SelectValue)) || !inRange(record.fields[of.signedAt], range.start, range.end)) continue;
    const contribution = amount(record.fields[of.contribution]);
    const commission = amount(record.fields[of.commission]);
    const contributionPaid = isPaid(record.fields[of.contributionStatus]);
    const commissionPaid = isPaid(record.fields[of.commissionStatus]);
    const due = date(record.fields[of.dueAt]);
    const overdue = Boolean(due && due < now);
    contributions += contribution;
    commissions += commission;
    if (contributionPaid) contributionsPaid += contribution;
    else if (/facturer/i.test(text(record.fields[of.contributionStatus] as SelectValue))) contributionsToInvoice += contribution;
    else if (overdue && contribution) { overdueContributions += contribution; overdueContributionCount += 1; }
    if (commissionPaid) commissionsPaid += commission;
    else if (overdue && commission) { overdueCommissions += commission; overdueCommissionCount += 1; }
    const row = groupRow(linkedGroup(record.fields[of.receiverGroup]));
    row.contributions += contribution;
    row.commissions += commission;
    if (contributionPaid) row.contributionsPaid += contribution;
    if (commissionPaid) row.commissionsPaid += commission;
  }

  return { memberships: membershipTotal, membershipCount, membershipCommissions, membershipsPaid, membershipsToInvoice, membershipsToInvoiceCount, contributions, contributionsPaid, contributionsToInvoice, commissions, commissionsPaid, overdueContributions, overdueContributionCount, overdueCommissions, overdueCommissionCount, groups: [...groupMap.values()].sort((a, b) => b.contributions - a.contributions) };
}

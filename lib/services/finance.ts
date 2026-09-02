import "server-only";
import { FIELDS, TABLES } from "@/lib/airtable/config";
import { listRecords } from "@/lib/airtable/client";

type SelectValue = { name?: string } | string | null | undefined;

export type FinanceGroup = {
  id: string;
  name: string;
  memberships: number;
  membershipCount: number;
  contributions: number;
  contributionsPaid: number;
  commissions: number;
  commissionsPaid: number;
};

export type FinanceData = {
  memberships: number;
  membershipCount: number;
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

function amount(value: unknown) {
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
  const mf = FIELDS.memberships;
  const of = FIELDS.opportunities;
  const [memberships, opportunities] = await Promise.all([
    listRecords(TABLES.memberships, [mf.group, mf.signedAt, mf.signatureStatus, mf.amount]),
    listRecords(TABLES.opportunities, [of.stage, of.signedAt, of.dueAt, of.contribution, of.commission, of.contributionStatus, of.commissionStatus, of.receiverGroup])
  ]);

  const groupMap = new Map<string, FinanceGroup>();
  const groupRow = (group: { id: string; name: string } | null) => {
    const key = group?.id ?? "unassigned";
    if (!groupMap.has(key)) groupMap.set(key, { id: key, name: group?.name ?? "Groupe non renseigné", memberships: 0, membershipCount: 0, contributions: 0, contributionsPaid: 0, commissions: 0, commissionsPaid: 0 });
    return groupMap.get(key)!;
  };

  let membershipTotal = 0;
  let membershipCount = 0;
  for (const record of memberships) {
    if (!/^sign[eé]$/i.test(text(record.fields[mf.signatureStatus] as SelectValue)) || !inRange(record.fields[mf.signedAt], range.start, range.end)) continue;
    const value = amount(record.fields[mf.amount]);
    membershipTotal += value;
    membershipCount += 1;
    const row = groupRow(linkedGroup(record.fields[mf.group]));
    row.memberships += value;
    row.membershipCount += 1;
  }

  let contributions = 0, contributionsPaid = 0, contributionsToInvoice = 0, commissions = 0, commissionsPaid = 0;
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

  return { memberships: membershipTotal, membershipCount, contributions, contributionsPaid, contributionsToInvoice, commissions, commissionsPaid, overdueContributions, overdueContributionCount, overdueCommissions, overdueCommissionCount, groups: [...groupMap.values()].sort((a, b) => b.contributions - a.contributions) };
}

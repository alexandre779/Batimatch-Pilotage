export type DashboardScope = {
  groupId?: string;
  from?: Date;
  to?: Date;
};

export type GroupSummary = {
  id: string;
  name: string;
  memberCount: number;
  opportunities: number;
  wonOpportunities: number;
  declinedOpportunities: number;
  conversionRate: number;
  revenue: number;
  receivedVolume: number;
};

export type NetworkKpis = {
  activeMembers: number;
  opportunitiesSent: number;
  opportunitiesWon: number;
  revenueWon: number;
  receivedVolume: number;
  conversionRate: number;
};

export const AIRTABLE_BASE_ID = "appfHlDc9F79EB56n";

export const TABLES = {
  users: "tbl01JNaBDfgkQiKB",
  memberships: "tbl7QlGwHODocrcT9",
  groups: "tblIzIViD5BFkLEco",
  events: "tblKIWuG4zK8PaeHe",
  opportunities: "tblEzFJg26Ze5dUls",
  guests: "tbl8Dzf45oVQo5pXu",
  jobs: "tblxApvtIX0roufDJ",
  tickets: "tblcoKk9ELZMfp2pH",
  contributions: "tblBfPGkfdIo4wkFp",
} as const;

export const FIELDS = {
  users: {
    displayName: "fld2jFRhfbc7oOFgl",
    firstName: "fldcFX5q6eW54TOlw",
    lastName: "fldGFpCcmnWicV0kD",
    email: "fldvOTwWGLYQrtk2z",
    userType: "fldb4yzNQaHMM00rC",
    function: "fldV21zzqCCctM2j1",
    memberStatus: "fldEyukN4YMivIrMU",
    testStartDate: "fldsUrNUBHlVDheTA",
    createdAt: "fldiq6kU7D5Vpd9V7",
    ownedGroups: "fldNTnQmAbi2ZDB2U",
    groupLinks: "fldzAsPg6OtSd8MvT",
    pilotageRole: "fldGbKRVtEE82xzEU",
    sentOpportunities: "fldTMKFcGk6GtxJGl",
    receivedOpportunities: "fldMDYrwK4OjcujZj",
    declinedOpportunities: "fldjIbnGfYdXkICpp",
    wonOpportunities: "fldFllCDpYqhTz6qB",
    conversionRate: "fldvs7n7vHaoRNbhy",
    sentVolume: "fld23aZxrB8pUtYKm",
    receivedVolume: "fld1tywjw2wDEWSOR",
    wonRevenue: "fld6ozyQHqTsslYW3",
    lastLogin: "fldK2xWsvVsBWFn6T"
  },
  guests: {
    eventStartDate: "fldneXYqOxjSrr0f1",
    linkedUsers: "fldJ7M7FMhexTlo5C"
  },
  groups: {
    name: "fldYE5skYY83xqu5x",
    publicId: "fldprt1jE0J6CtPdO",
    members: "fldxYQ33PzuOJEXeJ",
    createdOpportunities: "fldy0wpvEDxHksyxF",
    declinedOpportunities: "fldQOMDJeOWFS2lVZ",
    wonOpportunities: "fldT0vbyIF576CJf0",
    conversionRate: "fld1n9FzoYx2ylnbl",
    revenue: "fld8S3LSKkwftvwmz",
    receivedVolume: "fldL4O6nf2kFewoOz",
    createdAt: "fldqi6kDDqWZO2PaY",
    city: "fldtS1NkChyJOj7X6",
    department: "fldn4d6hZQcAhH5nI",
    region: "fldrAfKgnFsBtprGI",
    monthlyRevenueTarget: "fldeeng9aRxqqy7ST",
    monthlyOpportunityTarget: "fldeG2GEQ0soalcrn",
    monthlySentVolumeTarget: "fldEuJ2aDUZ6w8vVI",
    annualNewMemberTarget: "fldVWrJEYxHu0iei0"
  },
  opportunities: {
    reference: "fldqzDqQNR339WYb1",
    name: "fldN3zDj4DJm7bzbe",
    giver: "fldAPbDxLdzxUXOsy",
    receiver: "fldGxvgSfbxSzbS2F",
    stage: "fldcZi6Yv3UV8Ss1h",
    status: "fld2eDFhnetqaH66n",
    createdAt: "fldJMQErnP1BK3MQz",
    closedAt: "fldhtBo8z0w4NwOWM",
    appointmentAt: "fldrBi2xweIVsMp1K",
    quoteDate: "fldQX5j1IvLnHpCI5",
    signedAt: "fldKAqM3LvvgVKQFO",
    opportunityAmount: "fldB3sjVNRG4WVdtv",
    quoteAmountHT: "fldoKSNqwyYUswpp0",
    quoteAmountTTC: "fld6MLilV9k210Fyf",
    contribution: "fldc1D4YM68W1pl9j",
    commission: "fldGQF29QR80K2ucj",
    dueAt: "fld2NzaPxskB2BvF6",
    contributionStatus: "fldrc7DGJEE9eY0NX",
    commissionStatus: "fldr2Wv767plnuUqa",
    receiverGroup: "fldD7UBCJtmKaFGpM"
  },
  memberships: {
    group: "fldPJY2LPXmfPlQM5",
    signedAt: "fldpnh3lQWNAI4Wws",
    signatureStatus: "fldF7lPIKuJGB6KwJ",
    amount: "fldlfc3OFFwWcE54X"
  },
  contributions: {
    startDate: "fldJU5fv1yplHCFlI",
    testStartDate: "fldAcmxxGxQDMqXJf",
    issuedAt: "fldSrTEhK82B82HKT",
    paidAt: "fldJds5nOpHpXbNTt",
    status: "fldig8PzxQn06HgMS",
    group: "fldCu70jgUSzAgYFy",
    baseAmount: "fldae3OJsSRpr9xnx",
    finalAmount: "fldreBUtt8zr8T9y6"
  }
} as const;

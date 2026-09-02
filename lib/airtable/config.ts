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
} as const;

// Intentionally excluded: "Cotisations ( A SUPPRIMER )" (temporary copy).

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
    city: "fldtS1NkChyJOj7X6",
    department: "fldn4d6hZQcAhH5nI",
    region: "fldrAfKgnFsBtprGI"
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
    commission: "fldGQF29QR80K2ucj"
  }
} as const;

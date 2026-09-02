import "server-only";
import { env as cloudflareBindings } from "cloudflare:workers";
import { AIRTABLE_BASE_ID } from "./config";

type RuntimeBindings = {
  AIRTABLE_BASE_ID?: string;
  AIRTABLE_TOKEN?: string;
};

const runtimeBindings = cloudflareBindings as RuntimeBindings;

function getRuntimeVariable(name: keyof RuntimeBindings) {
  // Workers variables and secrets are request-time bindings; process.env is
  // only a fallback for local Node/Next.js execution.
  return runtimeBindings[name] ?? process.env[name];
}

type AirtableRecord = {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
};

type AirtableListResponse = {
  records: AirtableRecord[];
  offset?: string;
};

function getToken() {
  const token = getRuntimeVariable("AIRTABLE_TOKEN");
  if (!token) throw new Error("AIRTABLE_TOKEN is not configured");
  return token;
}

function getBaseId() {
  return getRuntimeVariable("AIRTABLE_BASE_ID") ?? AIRTABLE_BASE_ID;
}

export async function listRecords(
  tableId: string,
  fieldIds: string[],
  options: { filterByFormula?: string; maxRecords?: number } = {}
): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams();
    fieldIds.forEach((fieldId) => params.append("fields[]", fieldId));
    params.set("returnFieldsByFieldId", "true");
    if (options.filterByFormula) params.set("filterByFormula", options.filterByFormula);
    if (options.maxRecords) params.set("maxRecords", String(options.maxRecords));
    if (offset) params.set("offset", offset);

    const response = await fetch(
      `https://api.airtable.com/v0/${getBaseId()}/${tableId}?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${getToken()}` },
        next: { revalidate: 60 }
      }
    );

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(
        `Airtable request failed: ${response.status} ${response.statusText}${detail ? ` - ${detail}` : ""}`
      );
    }

    const page = (await response.json()) as AirtableListResponse;
    records.push(...page.records);
    offset = page.offset;
  } while (offset && (!options.maxRecords || records.length < options.maxRecords));

  return options.maxRecords ? records.slice(0, options.maxRecords) : records;
}

import "server-only";
import { AIRTABLE_BASE_ID } from "./config";

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
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) throw new Error("AIRTABLE_TOKEN is not configured");
  return token;
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
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${getToken()}` },
        next: { revalidate: 60 }
      }
    );

    if (!response.ok) {
      throw new Error(`Airtable request failed: ${response.status} ${response.statusText}`);
    }

    const page = (await response.json()) as AirtableListResponse;
    records.push(...page.records);
    offset = page.offset;
  } while (offset && (!options.maxRecords || records.length < options.maxRecords));

  return options.maxRecords ? records.slice(0, options.maxRecords) : records;
}

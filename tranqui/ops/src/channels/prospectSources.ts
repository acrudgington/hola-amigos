import { config } from "../config.js";

export type RawProspect = {
  source: "places" | "companies_house";
  sourceRef: string;
  name: string;
  region: "UK" | "Costa Blanca";
  website?: string;
  phone?: string;
  address?: string;
  category?: string;
  entityType?: string;
  rating?: number;
  reviews?: number;
};

/** Google Places API (New) Text Search. Official API: no scraping of Google Maps. */
export async function searchPlaces(query: string, region: "UK" | "Costa Blanca", pageToken?: string) {
  if (!config.places.key) throw new Error("GOOGLE_PLACES_API_KEY not set");
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": config.places.key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.internationalPhoneNumber,places.primaryTypeDisplayName,places.rating,places.userRatingCount,places.businessStatus,nextPageToken",
    },
    body: JSON.stringify({
      textQuery: query,
      regionCode: region === "UK" ? "GB" : "ES",
      languageCode: "en",
      pageSize: 20,
      ...(pageToken ? { pageToken } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Places ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  const prospects: RawProspect[] = (data.places ?? [])
    .filter((p: any) => p.businessStatus !== "CLOSED_PERMANENTLY")
    .map((p: any) => ({
      source: "places", sourceRef: `places:${p.id}`, name: p.displayName?.text ?? "Unknown", region,
      website: p.websiteUri, phone: p.internationalPhoneNumber, address: p.formattedAddress,
      category: p.primaryTypeDisplayName?.text, rating: p.rating, reviews: p.userRatingCount,
    }));
  return { prospects, nextPageToken: data.nextPageToken as string | undefined };
}

/**
 * Companies House advanced search: active small companies by location and SIC code.
 * Gives the legal entity type (ltd/llp), which decides whether cold email is lawful under PECR.
 */
export async function searchCompaniesHouse(opts: { location: string; sicCodes?: string[]; size?: number; incorporatedFrom?: string }) {
  if (!config.companiesHouse.key) throw new Error("COMPANIES_HOUSE_API_KEY not set");
  const qs = new URLSearchParams({ location: opts.location, company_status: "active", size: String(opts.size ?? 50) });
  if (opts.sicCodes?.length) qs.set("sic_codes", opts.sicCodes.join(","));
  if (opts.incorporatedFrom) qs.set("incorporated_from", opts.incorporatedFrom);
  const res = await fetch(`https://api.company-information.service.gov.uk/advanced-search/companies?${qs}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${config.companiesHouse.key}:`).toString("base64")}` },
  });
  if (!res.ok) throw new Error(`Companies House ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  return (data.items ?? []).map((c: any): RawProspect => ({
    source: "companies_house", sourceRef: `ch:${c.company_number}`, name: c.company_name, region: "UK",
    address: [c.registered_office_address?.address_line_1, c.registered_office_address?.locality, c.registered_office_address?.postal_code].filter(Boolean).join(", "),
    entityType: normaliseEntity(c.company_type), category: (c.sic_codes ?? []).join(","),
  }));
}

/** Look a business up by name to learn its legal form (PECR gate for UK Places results). */
export async function lookupEntityType(name: string): Promise<string> {
  if (!config.companiesHouse.key) return "unknown";
  const res = await fetch(`https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(name)}&items_per_page=5`, {
    headers: { Authorization: `Basic ${Buffer.from(`${config.companiesHouse.key}:`).toString("base64")}` },
  });
  if (!res.ok) return "unknown";
  const data: any = await res.json();
  const clean = (s: string) => s.toLowerCase().replace(/\b(ltd|limited|llp|plc)\b|[^a-z0-9]/g, "");
  const hit = (data.items ?? []).find((i: any) => i.company_status === "active" && clean(i.title) === clean(name));
  return hit ? normaliseEntity(hit.company_type) : "unknown";
}

function normaliseEntity(t: string | undefined): string {
  if (!t) return "unknown";
  if (t === "ltd" || t === "private-limited-guarant-nsc" || t === "private-limited-guarant-nsc-limited-exemption" || t === "private-unlimited") return "ltd";
  if (t === "llp") return "llp";
  if (t === "plc") return "plc";
  return "unknown";
}

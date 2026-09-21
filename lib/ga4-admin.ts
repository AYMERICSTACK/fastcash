import crypto from "node:crypto";

const DATA_API = "https://analyticsdata.googleapis.com/v1beta";

type GaCell = { value?: string };
type GaRow = { dimensionValues?: GaCell[]; metricValues?: GaCell[] };
type GaResponse = { rows?: GaRow[]; totals?: GaRow[]; rowCount?: number; error?: { message?: string } };

export type AnalyticsPeriod = "today" | "7d" | "30d";
export type AnalyticsRealtimeSnapshot = {
  activeUsers: number;
  addToCart: number;
  checkouts: number;
  purchases: number;
  leads: number;
  offers: number;
};

export type AnalyticsSnapshot = {
  users: number;
  sessions: number;
  views: number;
  productViews: number;
  addToCart: number;
  checkouts: number;
  purchases: number;
  leads: number;
  offers: number;
  topPages: Array<{ path: string; title: string; views: number; users: number }>;
  sources: Array<{ source: string; sessions: number; users: number }>;
  devices: Array<{ device: string; users: number }>;
  countries: Array<{ country: string; users: number }>;
};

function b64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function getConfig() {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  const clientEmail = process.env.GA4_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!propertyId || !clientEmail || !privateKey) return null;
  return { propertyId, clientEmail, privateKey };
}

export function isGa4AdminConfigured() {
  return Boolean(getConfig());
}

async function getAccessToken(config: NonNullable<ReturnType<typeof getConfig>>) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss: config.clientEmail,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), config.privateKey);
  const assertion = `${unsigned}.${b64url(signature)}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
  });
  const json = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !json.access_token) throw new Error(json.error_description || "Impossible d'obtenir le jeton Google Analytics.");
  return json.access_token;
}

async function report(token: string, propertyId: string, body: Record<string, unknown>) {
  const response = await fetch(`${DATA_API}/properties/${encodeURIComponent(propertyId)}:runReport`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await response.json() as GaResponse;
  if (!response.ok) throw new Error(json.error?.message || "Google Analytics Data API a refusé la requête.");
  return json;
}


async function realtimeReport(token: string, propertyId: string, body: Record<string, unknown>) {
  const response = await fetch(`${DATA_API}/properties/${encodeURIComponent(propertyId)}:runRealtimeReport`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await response.json() as GaResponse;
  if (!response.ok) throw new Error(json.error?.message || "Google Analytics Realtime API a refusé la requête.");
  return json;
}

const num = (cell?: GaCell) => Number(cell?.value || 0) || 0;
const text = (cell?: GaCell) => cell?.value || "—";

export async function getGa4Snapshot(period: AnalyticsPeriod): Promise<AnalyticsSnapshot> {
  const config = getConfig();
  if (!config) throw new Error("CONFIG_MISSING");
  const token = await getAccessToken(config);
  const startDate = period === "today" ? "today" : period === "7d" ? "7daysAgo" : "30daysAgo";
  const dateRanges = [{ startDate, endDate: "today" }];

  const [summary, events, pages, sources, devices, countries] = await Promise.all([
    report(token, config.propertyId, { dateRanges, metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }] }),
    report(token, config.propertyId, {
      dateRanges,
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: { filter: { fieldName: "eventName", inListFilter: { values: ["view_item", "add_to_cart", "begin_checkout", "purchase", "generate_lead", "submit_offer"] } } },
      limit: "20",
    }),
    report(token, config.propertyId, { dateRanges, dimensions: [{ name: "pagePath" }, { name: "pageTitle" }], metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: "8" }),
    report(token, config.propertyId, { dateRanges, dimensions: [{ name: "sessionSourceMedium" }], metrics: [{ name: "sessions" }, { name: "activeUsers" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: "8" }),
    report(token, config.propertyId, { dateRanges, dimensions: [{ name: "deviceCategory" }], metrics: [{ name: "activeUsers" }], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }], limit: "5" }),
    report(token, config.propertyId, { dateRanges, dimensions: [{ name: "country" }], metrics: [{ name: "activeUsers" }], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }], limit: "8" }),
  ]);

  const totals = summary.totals?.[0]?.metricValues || summary.rows?.[0]?.metricValues || [];
  const eventMap = new Map((events.rows || []).map((row) => [text(row.dimensionValues?.[0]), num(row.metricValues?.[0])]));

  return {
    users: num(totals[0]), sessions: num(totals[1]), views: num(totals[2]),
    productViews: eventMap.get("view_item") || 0,
    addToCart: eventMap.get("add_to_cart") || 0,
    checkouts: eventMap.get("begin_checkout") || 0,
    purchases: eventMap.get("purchase") || 0,
    leads: eventMap.get("generate_lead") || 0,
    offers: eventMap.get("submit_offer") || 0,
    topPages: (pages.rows || []).map((r) => ({ path: text(r.dimensionValues?.[0]), title: text(r.dimensionValues?.[1]), views: num(r.metricValues?.[0]), users: num(r.metricValues?.[1]) })),
    sources: (sources.rows || []).map((r) => ({ source: text(r.dimensionValues?.[0]), sessions: num(r.metricValues?.[0]), users: num(r.metricValues?.[1]) })),
    devices: (devices.rows || []).map((r) => ({ device: text(r.dimensionValues?.[0]), users: num(r.metricValues?.[0]) })),
    countries: (countries.rows || []).map((r) => ({ country: text(r.dimensionValues?.[0]), users: num(r.metricValues?.[0]) })),
  };
}


export async function getGa4RealtimeSnapshot(): Promise<AnalyticsRealtimeSnapshot> {
  const config = getConfig();
  if (!config) throw new Error("CONFIG_MISSING");
  const token = await getAccessToken(config);

  const [users, events] = await Promise.all([
    realtimeReport(token, config.propertyId, { metrics: [{ name: "activeUsers" }] }),
    realtimeReport(token, config.propertyId, {
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          inListFilter: { values: ["add_to_cart", "begin_checkout", "purchase", "generate_lead", "submit_offer"] },
        },
      },
      limit: "20",
    }),
  ]);

  const userValues = users.totals?.[0]?.metricValues || users.rows?.[0]?.metricValues || [];
  const eventMap = new Map((events.rows || []).map((row) => [text(row.dimensionValues?.[0]), num(row.metricValues?.[0])]));

  return {
    activeUsers: num(userValues[0]),
    addToCart: eventMap.get("add_to_cart") || 0,
    checkouts: eventMap.get("begin_checkout") || 0,
    purchases: eventMap.get("purchase") || 0,
    leads: eventMap.get("generate_lead") || 0,
    offers: eventMap.get("submit_offer") || 0,
  };
}

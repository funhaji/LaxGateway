import { createHash } from "crypto";

const SEARCH_URL = "https://daramet.com/api/v2/Donates/Search";

/** Deterministic marker we put in donate message text and search via API after payment */
export function darametOrderRefTag(hashId: string): string {
  return createHash("sha256").update(hashId, "utf8").digest("hex").slice(0, 16);
}

export function buildDarametWebIntentUrl(username: string, donateIrr: number, message: string): string {
  const user = username.replace(/^\/+|\/+$/g, "").trim();
  const base =
    user.length > 0 ? `https://daramet.com/${encodeURIComponent(user)}` : "https://daramet.com";
  const dm = donateIrr;
  const mg = encodeURIComponent(message);
  // Doc style: ...?webintent&donate=N&message=...
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}webintent&donate=${dm}&message=${mg}`;
}

export interface DarametDonateRecord {
  id: string;
  amount: number;
  message: string;
  /** ms since epoch when known */
  paidAtMs?: number;
}

function coerceNumber(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.round(raw);
  if (typeof raw === "string" && /^-?\d+(\.\d+)?$/.test(raw.trim())) {
    const n = Number(raw.trim());
    if (Number.isFinite(n)) return Math.round(n);
  }
  return undefined;
}

function coerceDonate(rec: Record<string, unknown>): DarametDonateRecord | null {
  const idRaw =
    rec.Id ??
    rec.id ??
    rec.ID ??
    rec.DonateId ??
    rec.donate_id ??
    rec.TrackCode ??
    rec.trackCode;
  const id =
    typeof idRaw === "string"
      ? idRaw
      : typeof idRaw === "number"
        ? String(idRaw)
        : undefined;
  if (!id?.trim()) return null;

  const amt =
    coerceNumber(rec.Amount) ??
    coerceNumber(rec.amount) ??
    coerceNumber(rec.DonateAmount) ??
    coerceNumber(rec.donate_amount) ??
    coerceNumber(rec.Money);

  if (amt === undefined) return null;

  const msgRaw =
    rec.Message ??
    rec.message ??
    rec.Description ??
    rec.description ??
    rec.Text ??
    rec.text ??
    "";
  const message = typeof msgRaw === "string" ? msgRaw : String(msgRaw);

  let paidAtMs: number | undefined;
  const dt =
    rec.CreatedAt ??
    rec.created_at ??
    rec.CreatedDate ??
    rec.Date ??
    rec.date ??
    rec.Time;
  if (typeof dt === "string") {
    const t = Date.parse(dt);
    if (!Number.isNaN(t)) paidAtMs = t;
  }

  return { id: id.trim(), amount: amt, message, paidAtMs };
}

function extractDonatesFromPayload(payload: unknown): DarametDonateRecord[] {
  const out: DarametDonateRecord[] = [];
  const seen = new Set<string>();

  function maybeTake(obj: unknown) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    const lite = coerceDonate(obj as Record<string, unknown>);
    if (!lite || seen.has(lite.id)) return;
    seen.add(lite.id);
    out.push(lite);
  }

  function walk(node: unknown) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) {
        maybeTake(item);
        walk(item);
      }
      return;
    }
    for (const value of Object.values(node)) walk(value);
  }

  walk(payload);
  return out;
}

async function fetchDarametSearch(token: string, term: string): Promise<unknown> {
  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      Authorization: token.trim(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ term }),
    cache: "no-store",
  });

  let data: unknown;
  try {
    data = (await res.json()) as unknown;
  } catch {
    data = {};
  }

  if (!res.ok) {
    const msg =
      (data &&
        typeof data === "object" &&
        typeof (data as { message?: string }).message === "string"
        ? (data as { message: string }).message
        : "") || `Daramet search failed (${res.status})`;
    throw new Error(msg);
  }

  const err =
    data &&
    typeof data === "object" &&
    typeof (data as { error?: unknown }).error === "boolean" &&
    (data as { error: boolean }).error;
  if (err) {
    const msg =
      typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Daramet search error";
    throw new Error(msg);
  }

  return data;
}

export async function findDarametDonateForOrder(params: {
  token: string;
  refTag: string;
  expectedAmountIrr: number;
  /** Only accept donations at/after order time (unix ms), minus slack */
  notBeforeMs: number;
}): Promise<DarametDonateRecord | null> {
  const data = await fetchDarametSearch(params.token, params.refTag);
  const donations = extractDonatesFromPayload(data);
  const ref = params.refTag.toLowerCase();
  const slack = 120_000;
  const minT = params.notBeforeMs - slack;

  const matches = donations.filter((d) => {
    if (d.amount !== params.expectedAmountIrr) return false;
    if (!d.message.toLowerCase().includes(ref)) return false;
    if (d.paidAtMs !== undefined && d.paidAtMs < minT) return false;
    return true;
  });

  if (matches.length === 0) return null;
  matches.sort((a, b) => (b.paidAtMs ?? 0) - (a.paidAtMs ?? 0));
  return matches[0] ?? null;
}

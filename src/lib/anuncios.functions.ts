import { createServerFn } from "@tanstack/react-start";
import { attachNlosToken, requireNlos } from "@/lib/diagnostico.functions";

// Métricas de anúncios (Google Ads e Meta Ads) via API do Windsor.ai.
// A chave fica só no servidor do HUB (secret WINDSOR_API_KEY).

export type CanalId = "google" | "meta";

export type LinhaAnuncio = {
  date: string;
  spend: number;
  clicks: number;
  impressions: number;
};

export type AnunciosResult = {
  dateFrom: string;
  dateTo: string;
  canais: Record<CanalId, { linhas: LinhaAnuncio[]; aviso: string | null }>;
  aviso: string | null;
};

const CONNECTOR: Record<CanalId, string> = { google: "google_ads", meta: "facebook" };
const NOME: Record<CanalId, string> = { google: "Google Ads", meta: "Meta Ads" };

function hojeSP(offsetDias = 0): string {
  const d = new Date(Date.now() - 3 * 3_600_000 - offsetDias * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

async function buscarCanal(
  canal: CanalId,
  key: string,
  dateFrom: string,
  dateTo: string,
): Promise<{ linhas: LinhaAnuncio[]; aviso: string | null }> {
  const url = new URL(`https://connectors.windsor.ai/${CONNECTOR[canal]}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("date_from", dateFrom);
  url.searchParams.set("date_to", dateTo);
  url.searchParams.set("fields", "date,spend,clicks,impressions");
  try {
    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    const text = await res.text();
    if (!res.ok) {
      if (/no \w+ accounts are configured/i.test(text)) {
        return { linhas: [], aviso: `${NOME[canal]}: conta ainda não conectada no Windsor.ai. Conecte em onboard.windsor.ai para os dados aparecerem aqui.` };
      }
      return { linhas: [], aviso: `${NOME[canal]}: falha ao buscar dados (${res.status}). ${text.slice(0, 120)}` };
    }
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      return { linhas: [], aviso: `${NOME[canal]}: resposta inesperada do Windsor.` };
    }
    const arr: any[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : Array.isArray(json?.result) ? json.result : [];
    if (!arr.length && json?.error) {
      return { linhas: [], aviso: `${NOME[canal]}: ${String(json.error).slice(0, 160)}` };
    }
    // agrega por dia (pode vir mais de uma linha por dia)
    const porDia: Record<string, LinhaAnuncio> = {};
    for (const r of arr) {
      const date = String(r?.date ?? "").slice(0, 10);
      if (!date) continue;
      const cur = (porDia[date] ??= { date, spend: 0, clicks: 0, impressions: 0 });
      cur.spend += num(r?.spend);
      cur.clicks += num(r?.clicks);
      cur.impressions += num(r?.impressions);
    }
    return { linhas: Object.values(porDia).sort((a, b) => a.date.localeCompare(b.date)), aviso: null };
  } catch (e: any) {
    return { linhas: [], aviso: `${NOME[canal]}: não foi possível contatar o Windsor (${e?.message ?? "erro de rede"}).` };
  }
}

export const getAnuncios = createServerFn({ method: "POST" })
  .middleware([attachNlosToken, requireNlos])
  .inputValidator((d: { dias: number }) => ({ dias: [7, 30, 90].includes(Number(d?.dias)) ? Number(d.dias) : 30 }))
  .handler(async ({ data }): Promise<AnunciosResult> => {
    const dateTo = hojeSP(0);
    const dateFrom = hojeSP(data.dias - 1);
    const vazio = { linhas: [] as LinhaAnuncio[], aviso: null as string | null };
    const key = process.env.WINDSOR_API_KEY?.trim();
    if (!key) {
      return {
        dateFrom,
        dateTo,
        canais: { google: vazio, meta: vazio },
        aviso: "Secret WINDSOR_API_KEY ainda não configurado no backend do HUB. Adicione o secret e recarregue.",
      };
    }
    const [google, meta] = await Promise.all([
      buscarCanal("google", key, dateFrom, dateTo),
      buscarCanal("meta", key, dateFrom, dateTo),
    ]);
    return { dateFrom, dateTo, canais: { google, meta }, aviso: null };
  });

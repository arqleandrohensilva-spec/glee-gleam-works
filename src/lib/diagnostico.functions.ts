import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { nlosAuth } from "@/lib/nlos-auth-client";

// Endpoint pronto e seguro do lado da landing (diagnosticonlarquitetos).
// O segredo NUNCA vai pro navegador — fica só em process.env no servidor do HUB.
const DIAG_LEADS_URL =
  "https://diagnosticonlarquitetos.lovable.app/api/public/get-leads-for-hub";

export type DiagLead = {
  id: string;
  nome: string;
  whatsapp: string;
  situacao: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string | null;
};

// Anexa o token do usuário logado (nlosAuth) na chamada da server function,
// garantindo que o requireSupabaseAuth valide a sessão do HUB — sem login extra.
const attachNlosToken = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await nlosAuth.auth.getSession();
  const token = data.session?.access_token;
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});

export const getDiagnosticoLeads = createServerFn({ method: "POST" })
  .middleware([attachNlosToken, requireSupabaseAuth])
  .handler(async (): Promise<DiagLead[]> => {
    const secret = process.env.DIAG_HUB_SECRET?.trim();
    if (!secret) {
      throw new Error(
        "Configure o secret DIAG_HUB_SECRET no backend do NL OS HUB para ler os leads do Diagnóstico.",
      );
    }

    const res = await fetch(DIAG_LEADS_URL, {
      method: "GET",
      headers: { "x-hub-secret": secret },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        throw new Error("Secret do Diagnóstico inválido (x-hub-secret rejeitado pela landing).");
      }
      throw new Error(`Falha ao buscar leads do Diagnóstico (${res.status}): ${body.slice(0, 160)}`);
    }

    const json = (await res.json().catch(() => ({}))) as { leads?: unknown };
    const arr = Array.isArray(json?.leads) ? json.leads : [];
    return arr.map((l: any): DiagLead => ({
      id: String(l?.id ?? ""),
      nome: String(l?.nome ?? ""),
      whatsapp: String(l?.whatsapp ?? ""),
      situacao: l?.situacao ?? null,
      utm_source: l?.utm_source ?? null,
      utm_medium: l?.utm_medium ?? null,
      utm_campaign: l?.utm_campaign ?? null,
      created_at: l?.created_at ?? null,
    }));
  });

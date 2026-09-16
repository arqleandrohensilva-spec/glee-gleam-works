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
  let token = data.session?.access_token;
  // Se não há token ou ele está a <60s de expirar, força um refresh — evita
  // "Unauthorized: Invalid token" por access token vencido.
  const expMs = data.session?.expires_at ? data.session.expires_at * 1000 : 0;
  if (!token || (expMs && expMs < Date.now() + 60_000)) {
    try {
      const r = await nlosAuth.auth.refreshSession();
      token = r.data.session?.access_token ?? token;
    } catch {
      /* mantém o token atual; se inválido, o servidor devolve Unauthorized */
    }
  }
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});

export type DiagLeadsResult = { leads: DiagLead[]; aviso: string | null };

export const getDiagnosticoLeads = createServerFn({ method: "POST" })
  .middleware([attachNlosToken, requireSupabaseAuth])
  .handler(async (): Promise<DiagLeadsResult> => {
    // Falhas de config/rede viram AVISO (não erro) pra não derrubar a tela —
    // o módulo continua utilizável (campanhas) e mostra a mensagem no painel.
    const secret = process.env.DIAG_HUB_SECRET?.trim();
    if (!secret) {
      return {
        leads: [],
        aviso: "Secret DIAG_HUB_SECRET ainda não configurado no backend do HUB. Adicione o secret e recarregue.",
      };
    }

    try {
      const res = await fetch(DIAG_LEADS_URL, {
        method: "GET",
        headers: { "x-hub-secret": secret },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return { leads: [], aviso: "Secret do Diagnóstico rejeitado pela landing (x-hub-secret inválido)." };
        }
        const body = await res.text().catch(() => "");
        return { leads: [], aviso: `Falha ao buscar leads (${res.status}): ${body.slice(0, 120)}` };
      }

      const json = (await res.json().catch(() => ({}))) as { leads?: unknown };
      const arr = Array.isArray(json?.leads) ? json.leads : [];
      const leads = arr.map((l: any): DiagLead => ({
        id: String(l?.id ?? ""),
        nome: String(l?.nome ?? ""),
        whatsapp: String(l?.whatsapp ?? ""),
        situacao: l?.situacao ?? null,
        utm_source: l?.utm_source ?? null,
        utm_medium: l?.utm_medium ?? null,
        utm_campaign: l?.utm_campaign ?? null,
        created_at: l?.created_at ?? null,
      }));
      return { leads, aviso: null };
    } catch (e: any) {
      return { leads: [], aviso: `Não foi possível contatar a landing: ${e?.message ?? "erro de rede"}` };
    }
  });

import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { nlosAuth } from "@/lib/nlos-auth-client";

// Endpoint pronto e seguro do lado da landing (diagnosticonlarquitetos).
// O segredo NUNCA vai pro navegador — fica só em process.env no servidor do HUB.
const DIAG_LEADS_URL =
  "https://diagnosticonlarquitetos.lovable.app/api/public/get-leads-for-hub";

// Banco de auth do ecossistema (mesmo do nlosAuth). Validamos o token do HUB
// direto aqui, sem depender do Authorization/process.env — que no HUB tem dois
// clients Supabase e pode injetar o token errado ("Invalid token").
const NLOS_URL = "https://gwmifubdcjfyyrypenah.supabase.co";
const NLOS_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3bWlmdWJkY2pmeXlyeXBlbmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MDI3MTYsImV4cCI6MjEwNDI3ODcxNn0.zfd7JU4JtqpSn-y-2mfuTIRQJafzNoBvlMQsL6-7pBQ";

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

// CLIENT: manda o token do nlosAuth num header PRÓPRIO (x-nlos-token), que o
// attachSupabaseAuth global não sobrescreve. Força refresh se estiver vencendo.
const attachNlosToken = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await nlosAuth.auth.getSession();
  let token = data.session?.access_token;
  const expMs = data.session?.expires_at ? data.session.expires_at * 1000 : 0;
  if (!token || (expMs && expMs < Date.now() + 60_000)) {
    try {
      const r = await nlosAuth.auth.refreshSession();
      token = r.data.session?.access_token ?? token;
    } catch {
      /* mantém o token atual */
    }
  }
  return next({ headers: token ? { "x-nlos-token": token } : {} });
});

// SERVER: valida o x-nlos-token direto contra o banco do ecossistema.
const requireNlos = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const req = getRequest();
  const token = req?.headers?.get("x-nlos-token") ?? "";
  if (!token || token.split(".").length !== 3) {
    throw new Error("Faça login no NL OS HUB para acessar o Diagnóstico.");
  }
  const sb = createClient(NLOS_URL, NLOS_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) {
    throw new Error("Sessão do HUB inválida ou expirada. Recarregue a página e tente de novo.");
  }
  return next({ context: { userId: data.user.id } });
});

export type DiagLeadsResult = { leads: DiagLead[]; aviso: string | null };

export const getDiagnosticoLeads = createServerFn({ method: "POST" })
  .middleware([attachNlosToken, requireNlos])
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

import { createFileRoute } from "@tanstack/react-router";


export const Route = createFileRoute("/api/public/recuperar-senha")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            email_login?: string;
            email_recuperacao?: string;
          };
          const emailLogin = (body.email_login ?? "").trim().toLowerCase();
          const emailRecuperacao = (body.email_recuperacao ?? "").trim().toLowerCase();

          if (!emailLogin || !emailRecuperacao) {
            return Response.json({ ok: true });
          }

          const ip =
            request.headers.get("cf-connecting-ip") ??
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            "unknown";

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Rate limit: 5 tentativas / 15 minutos por IP
          const desde = new Date(Date.now() - 15 * 60 * 1000).toISOString();
          const { count } = await supabaseAdmin
            .from("recuperacao_tentativas")
            .select("id", { count: "exact", head: true })
            .eq("ip", ip)
            .gte("created_at", desde);

          if ((count ?? 0) >= 5) {
            return new Response(JSON.stringify({ error: "rate_limited" }), {
              status: 429,
              headers: { "Content-Type": "application/json" },
            });
          }

          await supabaseAdmin.from("recuperacao_tentativas").insert({ ip });

          // Busca registro
          const { data: rec } = await supabaseAdmin
            .from("usuarios_recuperacao")
            .select("user_id, email_login, email_recuperacao")
            .ilike("email_login", emailLogin)
            .maybeSingle();

          const parBate =
            rec != null &&
            rec.email_recuperacao.trim().toLowerCase() === emailRecuperacao;

          if (parBate && rec) {
            const origin = new URL(request.url).origin;
            const redirectTo = `${origin}/redefinir-senha`;

            // Gera link de recuperação para o email_login (conta real no Auth)
            const { data: linkData, error: linkErr } =
              await supabaseAdmin.auth.admin.generateLink({
                type: "recovery",
                email: rec.email_login,
                options: { redirectTo },
              });

            if (!linkErr && linkData?.properties?.action_link) {
              const actionLink = linkData.properties.action_link;
              const resendKey = process.env.RESEND_API_KEY;
              if (resendKey) {
                try {
                  const res = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${resendKey}`,
                    },
                    body: JSON.stringify({
                      from: "NL OS <naoresponda@notificacoes.nl.arq.br>",
                      to: [rec.email_recuperacao],
                      subject: "Redefinição de senha — NL OS",
                      html: renderHtml(actionLink),
                      text: renderText(actionLink),
                    }),
                  });
                  if (!res.ok) {
                    const errBody = await res.text();
                    console.error(
                      `[recuperar-senha] resend failed [${res.status}]: ${errBody}`,
                    );
                  }
                } catch (err) {
                  console.error("[recuperar-senha] email send failed", err);
                }
              } else {
                console.error("[recuperar-senha] RESEND_API_KEY não configurada");
              }
            } else if (linkErr) {
              console.error("[recuperar-senha] generateLink error", linkErr);
            }
          }

          // Sempre resposta genérica
          return Response.json({ ok: true });
        } catch (err) {
          console.error("[recuperar-senha] erro", err);
          // Nunca vazar detalhes
          return Response.json({ ok: true });
        }
      },
    },
  },
});

function renderHtml(link: string) {
  return `<!doctype html>
<html><body style="font-family: Georgia, serif; background:#E8E4DF; padding:40px; color:#3A3A3A;">
  <div style="max-width:520px; margin:0 auto; background:#ffffff; border:1px solid #D1D1D1; border-radius:8px; padding:40px;">
    <div style="text-align:center; margin-bottom:24px;">
      <div style="display:inline-block; width:48px; height:48px; background:#3A3A3A; color:#fff; font-weight:bold; font-size:18px; line-height:48px; border-radius:2px;">NL</div>
    </div>
    <h1 style="font-family: Georgia, serif; font-size:20px; color:#3A3A3A; text-align:center; margin:0 0 16px;">Redefinição de senha</h1>
    <p style="font-family: 'DM Mono', monospace; font-size:12px; color:#8B7355; text-align:center; line-height:1.6;">
      Recebemos um pedido de redefinição de senha para sua conta do NL OS. Clique no botão abaixo para escolher uma nova senha.
    </p>
    <div style="text-align:center; margin:32px 0;">
      <a href="${link}" style="display:inline-block; background:#3A3A3A; color:#ffffff; text-decoration:none; padding:12px 24px; font-family:'DM Mono', monospace; text-transform:uppercase; letter-spacing:2px; font-size:11px; border-radius:6px;">Redefinir senha</a>
    </div>
    <p style="font-family:'DM Mono', monospace; font-size:10px; color:#8B7355; text-align:center; opacity:0.7;">
      Se você não solicitou esta redefinição, ignore este e-mail.
    </p>
  </div>
  <p style="text-align:center; font-family: Georgia, serif; font-style:italic; color:#8B7355; font-size:12px; margin-top:24px;">A arquitetura como decisão.</p>
</body></html>`;
}

function renderText(link: string) {
  return `Redefinição de senha - NL OS\n\nAcesse o link abaixo para escolher uma nova senha:\n${link}\n\nSe você não solicitou esta redefinição, ignore este e-mail.`;
}

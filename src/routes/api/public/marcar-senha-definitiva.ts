import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/marcar-senha-definitiva")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { user_id?: string };
          const userId = body.user_id;
          if (!userId) {
            return Response.json({ ok: false }, { status: 400 });
          }
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin
            .from("usuarios_recuperacao")
            .update({ senha_temporaria: false })
            .eq("user_id", userId);
          return Response.json({ ok: true });
        } catch (err) {
          console.error("[marcar-senha-definitiva] erro", err);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});

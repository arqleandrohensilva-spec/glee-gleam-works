import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });

    const { data: rec } = await supabase
      .from("usuarios_recuperacao")
      .select("senha_temporaria")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (rec?.senha_temporaria) throw redirect({ to: "/trocar-senha" });

    return { user: data.user };
  },
  component: () => <Outlet />,
});

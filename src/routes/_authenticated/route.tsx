import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { nlosAuth } from "@/lib/nlos-auth-client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await nlosAuth.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});

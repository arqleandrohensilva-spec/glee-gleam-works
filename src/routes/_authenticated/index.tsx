import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Briefcase,
  Megaphone,
  Camera,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { nlosAuth } from "@/lib/nlos-auth-client";

export const Route = createFileRoute("/_authenticated/")({
  component: HubPage,
});

type SystemStatus = "active" | "soon";

interface SystemDef {
  name: string;
  description: string;
  icon: LucideIcon;
  status: SystemStatus;
  url?: string;
}

const SYSTEMS: SystemDef[] = [
  {
    name: "NL OS",
    description: "Clientes, propostas, projetos e financeiro",
    icon: Briefcase,
    status: "active",
    url: "https://app.nl.arq.br/auth/callback",
  },
  {
    name: "NL OS MKT",
    description: "Conteúdo, biblioteca visual e radar de mercado",
    icon: Megaphone,
    status: "active",
    url: "https://nlosmktv2.lovable.app/auth/callback",
  },
  {
    name: "NL OS RENDER",
    description: "Renders com IA a partir de projetos reais",
    icon: Camera,
    status: "soon",
  },
];

function HubPage() {
  const navigate = useNavigate();
  const [userLabel, setUserLabel] = useState<string>("");

  useEffect(() => {
    nlosAuth.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) setUserLabel(u.email ?? u.id);
    });
    const { data: sub } = nlosAuth.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/login", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleLogout() {
    await nlosAuth.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--ice)" }}>
      <header
        className="sticky top-0 z-10 h-16 px-6 flex items-center justify-between border-b border-[color:var(--divider)] bg-white"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 flex items-center justify-center rounded-sm"
            style={{ backgroundColor: "var(--graphite)" }}
          >
            <span className="text-white font-serif font-bold text-sm leading-none">NL</span>
          </div>
          <span
            className="font-mono uppercase tracking-widest"
            style={{ color: "var(--bronze)", fontSize: "10px" }}
          >
            NL OS HUB
          </span>
        </div>

        <div className="flex items-center gap-5">
          <span
            className="hidden sm:inline font-mono text-xs"
            style={{ color: "var(--graphite)" }}
          >
            {userLabel}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 h-9 px-3 rounded-md border border-[color:var(--divider)] font-mono uppercase tracking-widest text-[10px] transition-colors hover:border-[color:var(--bronze)]"
            style={{ color: "var(--graphite)" }}
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 py-14 max-w-5xl w-full mx-auto">
        <div
          className="font-mono uppercase tracking-widest mb-6"
          style={{ color: "var(--bronze)", fontSize: "10px" }}
        >
          Sistemas
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SYSTEMS.map((sys) => (
            <SystemCard key={sys.name} system={sys} />
          ))}
        </div>
      </main>

      <footer className="border-t border-[color:var(--divider)] bg-white px-6 py-6 flex flex-col items-center gap-1">
        <p
          className="font-mono uppercase tracking-widest"
          style={{ color: "var(--bronze)", fontSize: "10px", opacity: 0.75 }}
        >
          NL Arquitetos · Sistema interno
        </p>
        <p
          className="italic font-serif"
          style={{ color: "var(--bronze)", fontSize: "12px" }}
        >
          A arquitetura como decisão.
        </p>
      </footer>
    </div>
  );
}

function SystemCard({ system }: { system: SystemDef }) {
  const Icon = system.icon;
  const isActive = system.status === "active";

  const handleClick = async () => {
    if (!isActive || !system.url) return;
    const { data } = await nlosAuth.auth.getSession();
    const session = data.session;
    if (!session?.access_token || !session?.refresh_token) {
      window.open(system.url, "_blank", "noopener,noreferrer");
      return;
    }
    const params = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    window.open(`${system.url}?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isActive}
      className={[
        "text-left bg-white border border-[color:var(--divider)] rounded-lg p-6 transition-colors",
        isActive
          ? "hover:border-[color:var(--bronze)] cursor-pointer"
          : "cursor-not-allowed opacity-70",
      ].join(" ")}
    >
      <div className="flex items-start justify-between">
        <Icon size={32} style={{ color: "var(--graphite)" }} strokeWidth={1.5} />
        <span
          className="font-mono uppercase tracking-widest"
          style={{
            fontSize: "9px",
            color: isActive ? "var(--bronze)" : "var(--graphite)",
            opacity: isActive ? 1 : 0.5,
          }}
        >
          {isActive ? "Ativo" : "Em breve"}
        </span>
      </div>
      <h2
        className="mt-6 font-serif"
        style={{ color: "var(--graphite)", fontSize: "18px" }}
      >
        {system.name}
      </h2>
      <p
        className="mt-2 font-mono"
        style={{ color: "var(--bronze)", fontSize: "11px", opacity: 0.8 }}
      >
        {system.description}
      </p>
    </button>
  );
}

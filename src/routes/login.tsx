import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("reset") === "1") {
        setNotice("Senha redefinida com sucesso. Faça login com a nova senha.");
      }
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setLoading(false);
      setError("Credenciais inválidas. Verifique e tente novamente.");
      return;
    }
    const meta = (data.user.user_metadata ?? {}) as { senha_temporaria?: boolean };
    if (meta.senha_temporaria) {
      window.location.replace("/trocar-senha");
    } else {
      window.location.replace("/");
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--sand)" }}
    >
      <div className="w-full max-w-md bg-white border border-[color:var(--divider)] rounded-lg p-10 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div
            className="w-12 h-12 flex items-center justify-center rounded-sm"
            style={{ backgroundColor: "var(--graphite)" }}
          >
            <span className="text-white font-serif font-bold text-lg leading-none">NL</span>
          </div>
          <h1 className="mt-5 font-serif text-[20px]" style={{ color: "var(--graphite)" }}>
            NL OS
          </h1>
          <p
            className="mt-1 font-mono uppercase tracking-widest"
            style={{ color: "var(--bronze)", fontSize: "10px" }}
          >
            Sistema interno · NL Arquitetos
          </p>
        </div>

        {notice && (
          <p
            className="mt-6 font-mono text-xs text-center"
            style={{ color: "var(--graphite)" }}
            role="status"
          >
            {notice}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block font-mono uppercase tracking-widest"
              style={{ color: "var(--bronze)", fontSize: "10px" }}
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3 bg-[color:var(--ice)] border border-[color:var(--divider)] rounded-md font-mono text-sm outline-none focus:border-[color:var(--bronze)] transition-colors"
              style={{ color: "var(--graphite)" }}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block font-mono uppercase tracking-widest"
              style={{ color: "var(--bronze)", fontSize: "10px" }}
            >
              Senha
            </label>
            <PasswordInput id="password" value={password} onChange={setPassword} />
          </div>

          {error && (
            <p className="font-mono text-xs" style={{ color: "#B84A4A" }} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-md font-mono uppercase tracking-widest text-xs text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: "var(--graphite)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bronze)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--graphite)")}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="text-center">
            <Link
              to="/recuperar-senha"
              className="font-mono uppercase tracking-widest text-[10px] transition-colors hover:opacity-70"
              style={{ color: "var(--bronze)" }}
            >
              Esqueci minha senha
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

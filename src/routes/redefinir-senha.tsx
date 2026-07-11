import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/redefinir-senha")({
  ssr: false,
  component: RedefinirSenhaPage,
});

function RedefinirSenhaPage() {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setReady(true);
      if (!data.session) {
        setError("Link inválido ou expirado. Solicite um novo link de recuperação.");
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
        setError(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (senha.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);

    const { error: updateErr } = await supabase.auth.updateUser({
      password: senha,
      data: { senha_temporaria: false },
    });
    if (updateErr) {
      setLoading(false);
      setError("Não foi possível redefinir a senha. Tente novamente.");
      return;
    }

    await supabase.auth.signOut();
    window.location.replace("/login?reset=1");
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
            Redefinir senha
          </h1>
          <p
            className="mt-2 font-mono"
            style={{ color: "var(--bronze)", fontSize: "11px", opacity: 0.8 }}
          >
            Defina uma nova senha para sua conta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="nova"
              className="block font-mono uppercase tracking-widest"
              style={{ color: "var(--bronze)", fontSize: "10px" }}
            >
              Nova senha
            </label>
            <input
              id="nova"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full h-11 px-3 bg-[color:var(--ice)] border border-[color:var(--divider)] rounded-md font-mono text-sm outline-none focus:border-[color:var(--bronze)] transition-colors"
              style={{ color: "var(--graphite)" }}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="confirmar"
              className="block font-mono uppercase tracking-widest"
              style={{ color: "var(--bronze)", fontSize: "10px" }}
            >
              Confirmar senha
            </label>
            <input
              id="confirmar"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className="w-full h-11 px-3 bg-[color:var(--ice)] border border-[color:var(--divider)] rounded-md font-mono text-sm outline-none focus:border-[color:var(--bronze)] transition-colors"
              style={{ color: "var(--graphite)" }}
            />
          </div>

          {error && (
            <p className="font-mono text-xs" style={{ color: "#B84A4A" }} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !ready}
            className="w-full h-11 rounded-md font-mono uppercase tracking-widest text-xs text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: "var(--graphite)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bronze)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--graphite)")}
          >
            {loading ? "Salvando..." : "Redefinir senha"}
          </button>
        </form>
      </div>
    </div>
  );
}

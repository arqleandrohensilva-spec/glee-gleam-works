import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/trocar-senha")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: TrocarSenhaPage,
});

function TrocarSenhaPage() {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setError("Não foi possível atualizar a senha. Tente novamente.");
      return;
    }

    window.location.replace("/");
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
            Defina sua nova senha
          </h1>
          <p
            className="mt-2 font-mono"
            style={{ color: "var(--bronze)", fontSize: "11px", opacity: 0.8 }}
          >
            Você está usando uma senha temporária. Defina uma senha definitiva para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <SenhaField id="nova" label="Nova senha" value={senha} onChange={setSenha} />
          <SenhaField
            id="confirmar"
            label="Confirmar senha"
            value={confirmar}
            onChange={setConfirmar}
          />

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
            {loading ? "Salvando..." : "Salvar e continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function SenhaField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block font-mono uppercase tracking-widest"
        style={{ color: "var(--bronze)", fontSize: "10px" }}
      >
        {label}
      </label>
      <PasswordInput
        id={id}
        value={value}
        onChange={onChange}
        autoComplete="new-password"
        minLength={8}
      />
    </div>
  );
}

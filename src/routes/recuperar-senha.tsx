import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/recuperar-senha")({
  ssr: false,
  component: RecuperarSenhaPage,
});

const MENSAGEM_GENERICA =
  "Se os dados estiverem corretos, você receberá um e-mail com instruções em alguns minutos.";

function RecuperarSenhaPage() {
  const [emailLogin, setEmailLogin] = useState("");
  const [emailRecuperacao, setEmailRecuperacao] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/public/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_login: emailLogin.trim().toLowerCase(),
          email_recuperacao: emailRecuperacao.trim().toLowerCase(),
        }),
      });
      if (res.status === 429) {
        setError("Muitas tentativas. Tente novamente em alguns minutos.");
        setLoading(false);
        return;
      }
      // Sempre exibe mensagem genérica, independentemente do resultado
      setEnviado(true);
    } catch {
      setEnviado(true);
    } finally {
      setLoading(false);
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
            Recuperar acesso
          </h1>
          <p
            className="mt-2 font-mono"
            style={{ color: "var(--bronze)", fontSize: "11px", opacity: 0.8 }}
          >
            Informe seu e-mail de acesso e o e-mail pessoal cadastrado para receber o link de
            redefinição.
          </p>
        </div>

        {enviado ? (
          <div className="mt-10 space-y-6">
            <p
              className="font-mono text-xs text-center"
              style={{ color: "var(--graphite)" }}
              role="status"
            >
              {MENSAGEM_GENERICA}
            </p>
            <div className="text-center">
              <Link
                to="/login"
                className="font-mono uppercase tracking-widest text-[10px] transition-colors hover:opacity-70"
                style={{ color: "var(--bronze)" }}
              >
                Voltar ao login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
            <Field
              id="email_login"
              label="E-mail de acesso"
              type="email"
              value={emailLogin}
              onChange={setEmailLogin}
            />
            <Field
              id="email_recuperacao"
              label="E-mail pessoal"
              type="email"
              value={emailRecuperacao}
              onChange={setEmailRecuperacao}
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
              {loading ? "Enviando..." : "Enviar link de redefinição"}
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className="font-mono uppercase tracking-widest text-[10px] transition-colors hover:opacity-70"
                style={{ color: "var(--bronze)" }}
              >
                Voltar ao login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type: string;
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
      <input
        id={id}
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-3 bg-[color:var(--ice)] border border-[color:var(--divider)] rounded-md font-mono text-sm outline-none focus:border-[color:var(--bronze)] transition-colors"
        style={{ color: "var(--graphite)" }}
      />
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ArrowLeft, Copy, Check, Trash2, Plus, Link2, Users, Target, Layers, Loader2 } from "lucide-react";
import { nlosAuth } from "@/lib/nlos-auth-client";
import { getDiagnosticoLeads, type DiagLead } from "@/lib/diagnostico.functions";

export const Route = createFileRoute("/_authenticated/diagnostico")({
  component: DiagnosticoPage,
});

type Campanha = {
  id: string;
  origem: string;
  meio: string;
  nome_campanha: string;
  url_base: string;
  url_completa: string;
  created_at: string;
};

function montarUrlUtm(urlBase: string, origem: string, meio: string, campanha: string): string {
  const base = urlBase.includes("://") ? urlBase : `https://${urlBase}`;
  try {
    const u = new URL(base);
    u.searchParams.set("utm_source", origem);
    u.searchParams.set("utm_medium", meio);
    u.searchParams.set("utm_campaign", campanha);
    return u.toString();
  } catch {
    const sep = urlBase.includes("?") ? "&" : "?";
    return `${urlBase}${sep}utm_source=${encodeURIComponent(origem)}&utm_medium=${encodeURIComponent(meio)}&utm_campaign=${encodeURIComponent(campanha)}`;
  }
}

function waHref(whats: string): string | null {
  const d = (whats || "").replace(/\D/g, "");
  if (!d) return null;
  const full = d.length <= 11 ? `55${d}` : d;
  return `https://wa.me/${full}`;
}

function fmtData(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

// Segunda-feira da semana da data (para agrupar leads por semana).
function inicioSemana(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const dia = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - dia);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function DiagnosticoPage() {
  const qc = useQueryClient();
  const getLeads = useServerFn(getDiagnosticoLeads);

  const { data: leadsData, isLoading: loadingLeads, error: leadsError } = useQuery({
    queryKey: ["diag-leads"],
    queryFn: () => getLeads(),
  });

  const { data: campanhas } = useQuery({
    queryKey: ["diag-campanhas"],
    queryFn: async () => {
      const { data, error } = await nlosAuth
        .from("diag_campanhas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Campanha[];
    },
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--ice)" }}>
      <header className="sticky top-0 z-10 h-16 px-6 flex items-center justify-between border-b border-[color:var(--divider)] bg-white">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-mono uppercase tracking-widest text-[10px] hover:text-[color:var(--bronze)] transition-colors"
            style={{ color: "var(--graphite)" }}
          >
            <ArrowLeft size={14} /> HUB
          </Link>
          <span className="h-4 w-px bg-[color:var(--divider)]" />
          <span className="font-serif" style={{ color: "var(--graphite)", fontSize: "16px" }}>
            NL Diagnóstico
          </span>
        </div>
      </header>

      <main className="flex-1 px-6 py-10 max-w-5xl w-full mx-auto space-y-14">
        <CampanhasSection campanhas={campanhas ?? []} onChange={() => qc.invalidateQueries({ queryKey: ["diag-campanhas"] })} />
        <LeadsSection leads={leadsData?.leads ?? []} aviso={leadsData?.aviso ?? null} loading={loadingLeads} error={leadsError as Error | null} />
      </main>
    </div>
  );
}

/* ---------------- A) Registro de campanhas / links ---------------- */

function CampanhasSection({ campanhas, onChange }: { campanhas: Campanha[]; onChange: () => void }) {
  const [origem, setOrigem] = useState("");
  const [meio, setMeio] = useState("");
  const [nome, setNome] = useState("");
  const [urlBase, setUrlBase] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const preview = useMemo(() => {
    if (!origem || !meio || !nome || !urlBase) return "";
    return montarUrlUtm(urlBase, origem.trim(), meio.trim(), nome.trim());
  }, [origem, meio, nome, urlBase]);

  const salvar = useMutation({
    mutationFn: async () => {
      const url_completa = montarUrlUtm(urlBase, origem.trim(), meio.trim(), nome.trim());
      const { error } = await nlosAuth.from("diag_campanhas").insert({
        origem: origem.trim(),
        meio: meio.trim(),
        nome_campanha: nome.trim(),
        url_base: urlBase.trim(),
        url_completa,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setOrigem(""); setMeio(""); setNome(""); setUrlBase("");
      onChange();
    },
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await nlosAuth.from("diag_campanhas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: onChange,
  });

  async function copiar(id: string, texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1600);
    } catch {
      /* silêncio */
    }
  }

  const podeSalvar = origem && meio && nome && urlBase && !salvar.isPending;

  return (
    <section>
      <div className="font-mono uppercase tracking-widest mb-5" style={{ color: "var(--bronze)", fontSize: "10px" }}>
        Registrar campanha / link
      </div>

      <div className="bg-white border border-[color:var(--divider)] rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo label="Origem (utm_source)" value={origem} onChange={setOrigem} placeholder="instagram, google…" list="diag-origens" />
          <Campo label="Meio (utm_medium)" value={meio} onChange={setMeio} placeholder="reels, bio, gbp, stories…" list="diag-meios" />
          <Campo label="Nome da campanha (utm_campaign)" value={nome} onChange={setNome} placeholder="financiamento_ep1" />
          <Campo label="URL base de destino" value={urlBase} onChange={setUrlBase} placeholder="https://diagnosticonlarquitetos.lovable.app" />
        </div>
        <datalist id="diag-origens"><option value="instagram" /><option value="google" /><option value="facebook" /><option value="youtube" /></datalist>
        <datalist id="diag-meios"><option value="reels" /><option value="bio" /><option value="gbp" /><option value="stories" /><option value="feed" /><option value="anuncio" /></datalist>

        {preview && (
          <div className="mt-4 border border-[color:var(--divider)] rounded-md bg-[color:var(--ice)] p-3">
            <div className="font-mono uppercase tracking-widest mb-1" style={{ color: "var(--bronze)", fontSize: "9px" }}>
              Link que será gerado
            </div>
            <div className="text-xs break-all" style={{ color: "var(--graphite)" }}>{preview}</div>
          </div>
        )}

        <div className="mt-5">
          <button
            onClick={() => salvar.mutate()}
            disabled={!podeSalvar}
            className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-white text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--graphite)" }}
          >
            {salvar.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Salvar e gerar link
          </button>
          {salvar.isError && (
            <span className="ml-3 text-xs text-red-600">Erro ao salvar. Tente de novo.</span>
          )}
        </div>
      </div>

      {/* Lista de campanhas */}
      <div className="mt-6 space-y-3">
        {campanhas.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-[color:var(--divider)] rounded-lg">
            <p className="font-mono uppercase tracking-widest text-[10px]" style={{ color: "var(--bronze)", opacity: 0.7 }}>
              Nenhum link cadastrado ainda
            </p>
          </div>
        ) : (
          campanhas.map((c) => (
            <div key={c.id} className="bg-white border border-[color:var(--divider)] rounded-lg p-4 flex items-start gap-4">
              <Link2 size={18} className="mt-0.5 shrink-0" style={{ color: "var(--bronze)" }} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip>{c.origem}</Chip>
                  <Chip>{c.meio}</Chip>
                  <span className="font-serif" style={{ color: "var(--graphite)", fontSize: "14px" }}>{c.nome_campanha}</span>
                </div>
                <div className="mt-1 text-xs break-all" style={{ color: "var(--graphite)", opacity: 0.7 }}>{c.url_completa}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => copiar(c.id, c.url_completa)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--divider)] px-2.5 py-1.5 text-[11px] hover:border-[color:var(--bronze)] transition-colors"
                  style={{ color: "var(--graphite)" }}
                >
                  {copiedId === c.id ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
                </button>
                <button
                  onClick={() => { if (confirm(`Excluir o link "${c.nome_campanha}"?`)) excluir.mutate(c.id); }}
                  className="p-1.5 text-[color:var(--graphite)]/40 hover:text-red-500 transition-colors"
                  title="Excluir link"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

/* ---------------- B) Painel de leads ---------------- */

function LeadsSection({ leads, aviso, loading, error }: { leads: DiagLead[]; aviso: string | null; loading: boolean; error: Error | null }) {
  const resumo = useMemo(() => {
    const total = leads.length;
    const comUtm = leads.filter((l) => (l.utm_source ?? "").trim() !== "").length;
    const direto = total - comUtm;

    const rank = (key: (l: DiagLead) => string | null) => {
      const m: Record<string, number> = {};
      for (const l of leads) {
        const k = (key(l) ?? "").trim();
        if (!k) continue;
        m[k] = (m[k] ?? 0) + 1;
      }
      return Object.entries(m).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n);
    };

    return {
      total,
      comUtm,
      direto,
      campanhas: rank((l) => l.utm_campaign),
      meios: rank((l) => l.utm_medium),
    };
  }, [leads]);

  const semanal = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of leads) {
      const s = inicioSemana(l.created_at);
      if (!s) continue;
      m[s] = (m[s] ?? 0) + 1;
    }
    return Object.entries(m)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([iso, total]) => ({
        label: new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        total,
      }));
  }, [leads]);

  const leadsOrdenados = useMemo(
    () => [...leads].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")),
    [leads],
  );

  return (
    <section>
      <div className="font-mono uppercase tracking-widest mb-5" style={{ color: "var(--bronze)", fontSize: "10px" }}>
        Painel de leads
      </div>

      {aviso && (
        <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm" style={{ color: "#7a5b16" }}>
          {aviso}
        </div>
      )}

      {error ? (
        <div className="bg-white border border-red-200 rounded-lg p-5 text-sm text-red-600">
          {error.message}
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 py-10 justify-center" style={{ color: "var(--bronze)" }}>
          <Loader2 size={18} className="animate-spin" /> Carregando leads…
        </div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={Users} label="Total de leads" value={String(resumo.total)} />
            <Stat icon={Target} label="Com UTM / direto" value={`${resumo.comUtm} / ${resumo.direto}`} />
            <Stat icon={Layers} label="Top campanha" value={resumo.campanhas[0]?.k ?? "—"} sub={resumo.campanhas[0] ? `${resumo.campanhas[0].n} leads` : undefined} />
            <Stat icon={Layers} label="Top meio" value={resumo.meios[0]?.k ?? "—"} sub={resumo.meios[0] ? `${resumo.meios[0].n} leads` : undefined} />
          </div>

          {/* Gráfico por semana */}
          <div className="mt-6 bg-white border border-[color:var(--divider)] rounded-lg p-5">
            <div className="font-mono uppercase tracking-widest mb-4" style={{ color: "var(--bronze)", fontSize: "9px" }}>
              Leads por semana
            </div>
            {semanal.length === 0 ? (
              <p className="text-xs py-8 text-center" style={{ color: "var(--graphite)", opacity: 0.6 }}>Sem dados suficientes.</p>
            ) : (
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={semanal} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D1D1D1" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#3A3A3A" }} tickLine={false} axisLine={{ stroke: "#D1D1D1" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#3A3A3A" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(139,115,85,0.08)" }}
                      contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #D1D1D1" }}
                      labelStyle={{ color: "#3A3A3A" }}
                    />
                    <Bar dataKey="total" fill="#8B7355" radius={[3, 3, 0, 0]} maxBarSize={38} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Tabela */}
          <div className="mt-6 bg-white border border-[color:var(--divider)] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--divider)]" style={{ color: "var(--bronze)" }}>
                    {["Nome", "WhatsApp", "Situação", "Fonte", "Meio", "Campanha", "Data"].map((h) => (
                      <th key={h} className="text-left font-mono uppercase tracking-widest px-4 py-3" style={{ fontSize: "9px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leadsOrdenados.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-xs" style={{ color: "var(--graphite)", opacity: 0.6 }}>Nenhum lead ainda.</td></tr>
                  ) : (
                    leadsOrdenados.map((l) => {
                      const wa = waHref(l.whatsapp);
                      return (
                        <tr key={l.id} className="border-b border-[color:var(--divider)] last:border-0">
                          <td className="px-4 py-3" style={{ color: "var(--graphite)" }}>{l.nome || "—"}</td>
                          <td className="px-4 py-3">
                            {wa ? (
                              <a href={wa} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "var(--bronze)" }}>{l.whatsapp}</a>
                            ) : (
                              <span style={{ color: "var(--graphite)", opacity: 0.5 }}>—</span>
                            )}
                          </td>
                          <td className="px-4 py-3" style={{ color: "var(--graphite)" }}>{l.situacao || "—"}</td>
                          <td className="px-4 py-3" style={{ color: "var(--graphite)" }}>{l.utm_source || <Direto />}</td>
                          <td className="px-4 py-3" style={{ color: "var(--graphite)" }}>{l.utm_medium || "—"}</td>
                          <td className="px-4 py-3" style={{ color: "var(--graphite)" }}>{l.utm_campaign || "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--graphite)", opacity: 0.8 }}>{fmtData(l.created_at)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/* ---------------- UI helpers ---------------- */

function Campo({ label, value, onChange, placeholder, list }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; list?: string }) {
  return (
    <label className="block">
      <div className="font-mono uppercase tracking-widest mb-1.5" style={{ color: "var(--bronze)", fontSize: "9px" }}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={list}
        className="w-full rounded-md border border-[color:var(--divider)] bg-[color:var(--ice)] px-3 py-2 text-sm outline-none focus:border-[color:var(--bronze)]"
        style={{ color: "var(--graphite)" }}
      />
    </label>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono uppercase tracking-widest rounded px-2 py-0.5" style={{ fontSize: "9px", color: "var(--bronze)", backgroundColor: "rgba(139,115,85,0.1)" }}>
      {children}
    </span>
  );
}

function Direto() {
  return <span className="font-mono uppercase tracking-widest" style={{ fontSize: "9px", color: "var(--graphite)", opacity: 0.4 }}>direto</span>;
}

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-[color:var(--divider)] rounded-lg p-5">
      <div className="flex items-center justify-between">
        <div className="font-mono uppercase tracking-widest" style={{ color: "var(--bronze)", fontSize: "9px" }}>{label}</div>
        <Icon size={16} style={{ color: "var(--bronze)", opacity: 0.6 }} />
      </div>
      <div className="mt-3 font-serif truncate" style={{ color: "var(--graphite)", fontSize: "22px" }} title={value}>{value}</div>
      {sub && <div className="mt-0.5 font-mono" style={{ color: "var(--graphite)", opacity: 0.6, fontSize: "10px" }}>{sub}</div>}
    </div>
  );
}

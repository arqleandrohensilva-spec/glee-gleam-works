import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Loader2, RefreshCw } from "lucide-react";
import { getAnuncios, type CanalId } from "@/lib/anuncios.functions";
import type { DiagLead } from "@/lib/diagnostico.functions";

const PERIODOS = [7, 30, 90] as const;

const CANAIS: { id: CanalId; nome: string; ehLead: (l: DiagLead) => boolean }[] = [
  {
    id: "google",
    nome: "Google Ads",
    ehLead: (l) => norm(l.utm_source) === "google" && norm(l.utm_medium) === "cpc",
  },
  {
    id: "meta",
    nome: "Instagram / Meta Ads",
    ehLead: (l) =>
      ["instagram", "facebook", "meta"].includes(norm(l.utm_source)) && norm(l.utm_medium) === "paid",
  },
];

function norm(v: string | null | undefined) {
  return (v ?? "").trim().toLowerCase();
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const int = (n: number) => Math.round(n).toLocaleString("pt-BR");

function diaSP(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
}

export function AnunciosSection({ leads }: { leads: DiagLead[] }) {
  const qc = useQueryClient();
  const fetchAnuncios = useServerFn(getAnuncios);
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["diag-anuncios", dias],
    queryFn: () => fetchAnuncios({ data: { dias } }),
    staleTime: 5 * 60_000,
  });

  const resumo = useMemo(() => {
    if (!data) return null;
    const noPeriodo = (l: DiagLead) => {
      const d = diaSP(l.created_at);
      return d !== null && d >= data.dateFrom && d <= data.dateTo;
    };
    const linhas = CANAIS.map((c) => {
      const rows = data.canais[c.id].linhas;
      const spend = rows.reduce((s, r) => s + r.spend, 0);
      const clicks = rows.reduce((s, r) => s + r.clicks, 0);
      const impressions = rows.reduce((s, r) => s + r.impressions, 0);
      const nLeads = leads.filter((l) => noPeriodo(l) && c.ehLead(l)).length;
      return {
        ...c,
        spend,
        clicks,
        impressions,
        leads: nLeads,
        cpc: clicks ? spend / clicks : null,
        cpl: nLeads ? spend / nLeads : null,
        aviso: data.canais[c.id].aviso,
      };
    });
    const tot = linhas.reduce(
      (a, r) => ({ spend: a.spend + r.spend, clicks: a.clicks + r.clicks, impressions: a.impressions + r.impressions, leads: a.leads + r.leads }),
      { spend: 0, clicks: 0, impressions: 0, leads: 0 },
    );

    // série diária: gasto total e leads pagos
    const mapa: Record<string, { spend: number; leads: number }> = {};
    const ini = new Date(`${data.dateFrom}T12:00:00Z`);
    const fim = new Date(`${data.dateTo}T12:00:00Z`);
    for (let d = new Date(ini); d <= fim; d.setUTCDate(d.getUTCDate() + 1)) {
      mapa[d.toISOString().slice(0, 10)] = { spend: 0, leads: 0 };
    }
    for (const c of CANAIS) for (const r of data.canais[c.id].linhas) if (mapa[r.date]) mapa[r.date].spend += r.spend;
    for (const l of leads) {
      const d = diaSP(l.created_at);
      if (d && mapa[d] && CANAIS.some((c) => c.ehLead(l))) mapa[d].leads += 1;
    }
    const serie = Object.entries(mapa).map(([iso, v]) => ({
      label: `${iso.slice(8, 10)}/${iso.slice(5, 7)}`,
      gasto: Number(v.spend.toFixed(2)),
      leads: v.leads,
    }));

    return {
      linhas,
      tot: { ...tot, cpc: tot.clicks ? tot.spend / tot.clicks : null, cpl: tot.leads ? tot.spend / tot.leads : null },
      serie,
    };
  }, [data, leads]);

  return (
    <section>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="font-mono uppercase tracking-widest" style={{ color: "var(--bronze)", fontSize: "10px" }}>
          Anúncios pagos
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-[color:var(--divider)] p-1 rounded-md">
            {PERIODOS.map((p) => (
              <button
                key={p}
                onClick={() => setDias(p)}
                className="px-3 py-1 rounded-[4px] font-mono uppercase tracking-widest text-[9px] transition-colors"
                style={dias === p ? { backgroundColor: "var(--graphite)", color: "#fff" } : { color: "var(--graphite)", opacity: 0.6 }}
              >
                {p} dias
              </button>
            ))}
          </div>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["diag-anuncios"] })}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--divider)] px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest hover:border-[color:var(--bronze)] transition-colors disabled:opacity-40"
            style={{ color: "var(--graphite)" }}
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} /> Atualizar
          </button>
        </div>
      </div>

      {data?.aviso && <Aviso texto={data.aviso} />}
      {resumo?.linhas.filter((l) => l.aviso).map((l) => <Aviso key={l.id} texto={l.aviso!} />)}

      {error ? (
        <div className="bg-white border border-red-200 rounded-lg p-5 text-sm text-red-600">{(error as Error).message}</div>
      ) : isLoading || !resumo ? (
        <div className="flex items-center gap-2 py-10 justify-center" style={{ color: "var(--bronze)" }}>
          <Loader2 size={18} className="animate-spin" /> Carregando anúncios…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi label="Investimento" value={brl(resumo.tot.spend)} sub={`${dias} dias`} />
            <Kpi label="Cliques" value={int(resumo.tot.clicks)} sub={`${int(resumo.tot.impressions)} impressões`} />
            <Kpi label="Leads de anúncio" value={int(resumo.tot.leads)} sub="contados no banco da NL" />
            <Kpi label="Custo por lead" value={resumo.tot.cpl !== null ? brl(resumo.tot.cpl) : "—"} sub={resumo.tot.cpc !== null ? `CPC médio ${brl(resumo.tot.cpc)}` : "sem cliques ainda"} />
          </div>

          <div className="mt-6 bg-white border border-[color:var(--divider)] rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono uppercase tracking-widest" style={{ color: "var(--bronze)", fontSize: "9px" }}>
                  <th className="px-4 py-3 font-normal">Canal</th>
                  <th className="px-4 py-3 font-normal text-right">Investimento</th>
                  <th className="px-4 py-3 font-normal text-right">Impressões</th>
                  <th className="px-4 py-3 font-normal text-right">Cliques</th>
                  <th className="px-4 py-3 font-normal text-right">CPC</th>
                  <th className="px-4 py-3 font-normal text-right">Leads</th>
                  <th className="px-4 py-3 font-normal text-right">Custo/lead</th>
                </tr>
              </thead>
              <tbody style={{ color: "var(--graphite)" }}>
                {resumo.linhas.map((r) => (
                  <tr key={r.id} className="border-t border-[color:var(--divider)]">
                    <td className="px-4 py-3">{r.nome}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{brl(r.spend)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{int(r.impressions)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{int(r.clicks)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.cpc !== null ? brl(r.cpc) : "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.leads}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.cpl !== null ? brl(r.cpl) : "—"}</td>
                  </tr>
                ))}
                <tr className="border-t border-[color:var(--divider)] font-medium">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums">{brl(resumo.tot.spend)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{int(resumo.tot.impressions)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{int(resumo.tot.clicks)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{resumo.tot.cpc !== null ? brl(resumo.tot.cpc) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{resumo.tot.leads}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{resumo.tot.cpl !== null ? brl(resumo.tot.cpl) : "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 bg-white border border-[color:var(--divider)] rounded-lg p-5">
            <div className="font-mono uppercase tracking-widest mb-4" style={{ color: "var(--bronze)", fontSize: "9px" }}>
              Investimento e leads por dia
            </div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <ComposedChart data={resumo.serie} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D1D1D1" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#3A3A3A" }} tickLine={false} axisLine={{ stroke: "#D1D1D1" }} minTickGap={16} />
                  <YAxis yAxisId="g" tick={{ fontSize: 10, fill: "#3A3A3A" }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                  <YAxis yAxisId="l" orientation="right" allowDecimals={false} tick={{ fontSize: 10, fill: "#3A3A3A" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #D1D1D1" }}
                    labelStyle={{ color: "#3A3A3A" }}
                    formatter={(v: number, n: string) => (n === "Investimento" ? brl(v) : v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="g" dataKey="gasto" name="Investimento" fill="#B5A48A" radius={[3, 3, 0, 0]} maxBarSize={26} />
                  <Line yAxisId="l" dataKey="leads" name="Leads" stroke="#3A3A3A" strokeWidth={2} dot={{ r: 2 }} type="monotone" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="mt-4 text-xs" style={{ color: "var(--graphite)", opacity: 0.6 }}>
            Investimento, cliques e impressões vêm do Google Ads e da Meta (via Windsor.ai, com atraso de algumas horas).
            Leads são contados no banco da NL: Google = utm google/cpc · Meta = utm instagram ou facebook com meio paid.
          </p>
        </>
      )}
    </section>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm" style={{ color: "#7a5b16" }}>
      {texto}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-[color:var(--divider)] rounded-lg p-4">
      <div className="font-mono uppercase tracking-widest" style={{ color: "var(--bronze)", fontSize: "9px" }}>
        {label}
      </div>
      <div className="mt-2 font-serif" style={{ color: "var(--graphite)", fontSize: "24px" }}>
        {value}
      </div>
      {sub && (
        <div className="mt-1 font-mono" style={{ color: "var(--graphite)", opacity: 0.55, fontSize: "10px" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarValor } from "@/lib/formatar";
import type { Ponto, ValorRecorte } from "@/lib/tipos";

const CORES = ["#0f6e66", "#c2620c", "#5b4bb7"];
const EIXO = { fontSize: 11, fill: "#5d6776" };

function encurtar(texto: string, max = 32): string {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

export function GraficoLinha({ serie, unidade }: { serie: Ponto[]; unidade: string }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={serie} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#e2e0d9" vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} tickLine={false} axisLine={false} />
        <YAxis tick={EIXO} tickLine={false} axisLine={false} width={72}
               tickFormatter={(v: number) => formatarValor(v, unidade)} />
        <ReferenceLine y={0} stroke="#b9b6ad" />
        <Tooltip formatter={(v) => formatarValor(Number(v), unidade)} />
        <Line type="monotone" dataKey="valor" stroke={CORES[0]} strokeWidth={2} dot={serie.length <= 12} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function GraficoBarras({ dados, unidade }: { dados: ValorRecorte[]; unidade: string }) {
  const ordenados = [...dados].sort((a, b) => b.valor - a.valor);
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, ordenados.length * 26 + 30)}>
      <BarChart data={ordenados} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#e2e0d9" horizontal={false} />
        <XAxis type="number" tick={EIXO} tickLine={false} axisLine={false}
               domain={[(min: number) => Math.min(0, min), "auto"]}
               tickFormatter={(v: number) => formatarValor(v, unidade)} />
        <YAxis type="category" dataKey="recorte" tick={EIXO} tickLine={false} axisLine={false} width={190}
               tickFormatter={(t: string) => encurtar(t)} />
        <ReferenceLine x={0} stroke="#b9b6ad" />
        <Tooltip formatter={(v) => formatarValor(Number(v), unidade)} />
        <Bar dataKey="valor" radius={[0, 3, 3, 0]}>
          {ordenados.map((d) => (
            <Cell key={d.recorte} fill={d.valor < 0 ? "#b42318" : CORES[0]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Séries de até 3 municípios sobrepostas (página Comparar).
export function GraficoComparacao({
  series,
  unidade,
}: {
  series: { nome: string; serie: Ponto[] }[];
  unidade: string;
}) {
  const periodos = [...new Set(series.flatMap((s) => s.serie.map((p) => p.periodo)))].sort();
  const dados = periodos.map((periodo) => {
    const linha: Record<string, string | number | null> = { periodo };
    for (const s of series) linha[s.nome] = s.serie.find((p) => p.periodo === periodo)?.valor ?? null;
    return linha;
  });
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={dados} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#e2e0d9" vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} tickLine={false} axisLine={false} />
        <YAxis tick={EIXO} tickLine={false} axisLine={false} width={72}
               tickFormatter={(v: number) => formatarValor(v, unidade)} />
        <ReferenceLine y={0} stroke="#b9b6ad" />
        <Tooltip formatter={(v) => formatarValor(Number(v), unidade)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Line key={s.nome} type="monotone" dataKey={s.nome} stroke={CORES[i % CORES.length]}
                strokeWidth={2} dot={periodos.length <= 12} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

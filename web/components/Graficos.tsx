"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
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

// Mesma ordem usada nos botões da comparação: azul-mar, âmbar do farol, violeta.
export const CORES = ["#0b6a80", "#d99a1e", "#7461c4"];
const EIXO = { fontSize: 11, fill: "#566c7a" };
const GRADE = "#dae4e7";
const ZERO = "#a9bcc4";
const DICA = {
  contentStyle: {
    borderRadius: 10,
    border: "1px solid #dae4e7",
    boxShadow: "0 8px 24px -12px rgb(10 42 61 / 0.35)",
    fontSize: 12,
    padding: "8px 12px",
  },
  labelStyle: { fontWeight: 600, color: "#0d2433", marginBottom: 2 },
  cursor: { stroke: "#0b6a80", strokeOpacity: 0.25 },
};
const ANIMACAO = { isAnimationActive: true, animationDuration: 700, animationEasing: "ease-out" as const };

function encurtar(texto: string, max = 32): string {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

export function GraficoLinha({ serie, unidade }: { serie: Ponto[]; unidade: string }) {
  const id = useId();
  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={serie} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={CORES[0]} stopOpacity={0.28} />
            <stop offset="1" stopColor={CORES[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRADE} vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} tickLine={false} axisLine={false} />
        <YAxis tick={EIXO} tickLine={false} axisLine={false} width={88}
               tickFormatter={(v: number) => formatarValor(v, unidade)} />
        <ReferenceLine y={0} stroke={ZERO} />
        <Tooltip {...DICA} formatter={(v) => formatarValor(Number(v), unidade)} />
        <Area type="monotone" dataKey="valor" name="Valor" stroke={CORES[0]} strokeWidth={2.5} fill={`url(#${id})`}
              dot={serie.length <= 12 ? { r: 3, fill: "#fff", stroke: CORES[0], strokeWidth: 2 } : false}
              activeDot={{ r: 5, fill: CORES[0], stroke: "#fff", strokeWidth: 2 }} {...ANIMACAO} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function GraficoBarras({ dados, unidade }: { dados: ValorRecorte[]; unidade: string }) {
  const ordenados = [...dados].sort((a, b) => b.valor - a.valor);
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, ordenados.length * 28 + 30)}>
      <BarChart data={ordenados} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRADE} horizontal={false} />
        <XAxis type="number" tick={EIXO} tickLine={false} axisLine={false}
               domain={[(min: number) => Math.min(0, min), "auto"]}
               tickFormatter={(v: number) => formatarValor(v, unidade)} />
        <YAxis type="category" dataKey="recorte" tick={EIXO} tickLine={false} axisLine={false} width={190}
               tickFormatter={(t: string) => encurtar(t)} />
        <ReferenceLine x={0} stroke={ZERO} />
        <Tooltip {...DICA} cursor={{ fill: "#0b6a80", fillOpacity: 0.06 }} formatter={(v) => formatarValor(Number(v), unidade)} />
        <Bar dataKey="valor" name="Valor" radius={[0, 5, 5, 0]} {...ANIMACAO}>
          {ordenados.map((d) => (
            <Cell key={d.recorte} fill={d.valor < 0 ? "#c0392b" : CORES[0]} />
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
  series: { chave: string; nome: string; serie: Ponto[] }[];
  unidade: string;
}) {
  const periodos = [...new Set(series.flatMap((s) => s.serie.map((p) => p.periodo)))].sort();
  const dados = periodos.map((periodo) => {
    const linha: Record<string, string | number | null> = { periodo };
    for (const s of series) linha[s.chave] = s.serie.find((p) => p.periodo === periodo)?.valor ?? null;
    return linha;
  });
  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={dados} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRADE} vertical={false} />
        <XAxis dataKey="periodo" tick={EIXO} tickLine={false} axisLine={false} />
        <YAxis tick={EIXO} tickLine={false} axisLine={false} width={88}
               tickFormatter={(v: number) => formatarValor(v, unidade)} />
        <ReferenceLine y={0} stroke={ZERO} />
        <Tooltip {...DICA} formatter={(v) => formatarValor(Number(v), unidade)} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
        {series.map((s, i) => (
          <Line key={s.chave} name={s.nome} type="monotone" dataKey={s.chave} stroke={CORES[i % CORES.length]}
                strokeWidth={2.5} dot={periodos.length <= 12 ? { r: 3, fill: "#fff", strokeWidth: 2 } : false}
                activeDot={{ r: 5 }} connectNulls {...ANIMACAO} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

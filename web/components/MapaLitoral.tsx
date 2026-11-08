"use client";

import { useRouter } from "next/navigation";
import { useId, useRef } from "react";
import { corDoValor, malha } from "@/lib/mapa";
import { idMunicipio } from "@/lib/normalizar";

export type ValorMapa = { nome: string; valor: number | null; texto: string; posicao?: number; total?: number };

const NEUTRO = "#c9d6da";
const FONTE = 9.5;

// Linhas de ondas que deslizam devagar sobre a água (30 unidades por período, deslocamento de 60 fecha o ciclo).
function ondas() {
  const linhas = [];
  for (let y = 14; y < malha.altura; y += 22) {
    let d = `M-60 ${y}`;
    for (let x = -60; x < malha.largura + 60; x += 30) d += "q7.5 -4 15 0t15 0";
    linhas.push(<path key={y} d={d} fill="none" stroke="#fff" strokeOpacity={0.07} strokeWidth={0.9} />);
  }
  return linhas;
}

function MiniLocalizacao() {
  const m = malha.mini;
  return (
    <svg viewBox={`-2 -2 ${m.largura + 4} ${m.altura + 4}`} className="h-auto w-16 shrink-0 sm:w-20" aria-hidden="true">
      <path d={m.rs} fill="#e6dfcb" stroke="#b9ad8a" strokeWidth={1} />
      <path d={m.litoral} fill="#0b6a80" stroke="#0b6a80" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

export function MapaLitoral({
  valores,
  min = 0,
  max = 1,
  ativo = null,
  aoAtivar,
  somenteDestaque = false,
  animar = true,
  rotulo = "Mapa do litoral gaúcho",
}: {
  valores?: Record<string, ValorMapa>;
  min?: number;
  max?: number;
  ativo?: string | null;
  aoAtivar?: (cod: string | null) => void;
  somenteDestaque?: boolean;
  animar?: boolean;
  rotulo?: string;
}) {
  const router = useRouter();
  const id = useId();
  const toque = useRef(false);
  const ativoNoToque = useRef<string | null>(null);
  const interativo = !somenteDestaque;
  const completo = !somenteDestaque;
  const ordemEntrada = [...malha.municipios].sort((a, b) => a.cy - b.cy).map((m) => m.cod);
  const lista = [...malha.municipios].sort((a, b) => Number(a.cod === ativo) - Number(b.cod === ativo));
  const info = ativo && valores ? valores[ativo] : null;

  function preencher(cod: string): string {
    if (somenteDestaque) return cod === ativo ? "#0b6a80" : "#d3dde0";
    const v = valores?.[cod]?.valor;
    return v === null || v === undefined ? NEUTRO : corDoValor(v, min, max);
  }

  function abrir(cod: string) {
    const nome = valores?.[cod]?.nome ?? malha.municipios.find((m) => m.cod === cod)?.nome;
    if (nome) router.push(`/municipio/${idMunicipio(cod, nome)}`);
  }

  // No toque, o primeiro toque destaca a cidade; o segundo abre a página.
  // `ativoNoToque` guarda qual cidade estava ativa no início do toque (o navegador dispara mouseenter antes do clique).
  function aoClicar(cod: string) {
    if (toque.current && ativoNoToque.current !== cod) {
      aoAtivar?.(cod);
      return;
    }
    abrir(cod);
  }

  function eventos(cod: string) {
    if (!interativo) return {};
    return {
      onPointerDown: (e: React.PointerEvent) => {
        toque.current = e.pointerType !== "mouse";
        ativoNoToque.current = ativo;
      },
      onMouseEnter: () => aoAtivar?.(cod),
      onMouseLeave: () => !toque.current && aoAtivar?.(null),
      onClick: () => aoClicar(cod),
    };
  }

  return (
    <div className="relative w-full select-none">
      <svg viewBox={`0 0 ${malha.largura} ${malha.altura}`} role="group" aria-label={rotulo} className="block h-auto w-full overflow-hidden rounded-xl">
        <defs>
          <linearGradient id={`${id}-agua`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#14566d" />
            <stop offset="1" stopColor="#0a2a3d" />
          </linearGradient>
          <clipPath id={`${id}-recorte`}>
            <path d={malha.agua} />
          </clipPath>
        </defs>

        {/* Terra fora do RS, RS e água */}
        <rect width={malha.largura} height={malha.altura} fill="#f3f0e7" />
        <path d={malha.rs} fill="#e7e0cc" />
        <path d={malha.agua} fill={`url(#${id}-agua)`} />
        <g clipPath={`url(#${id}-recorte)`}>
          <g className="mar-ondas">{ondas()}</g>
        </g>

        {completo && (
          <g aria-hidden="true" fontStyle="italic" fill="#fff" fillOpacity={0.5} fontSize={9}>
            {malha.nomesAgua.map((n) => (
              <text key={n.texto} x={n.x} y={n.y} textAnchor="middle" transform={n.rot ? `rotate(${n.rot} ${n.x} ${n.y})` : undefined}
                    fontSize={n.texto.startsWith("Oceano") ? 11 : 8}>
                {n.texto}
              </text>
            ))}
          </g>
        )}
        {completo && (
          <g aria-hidden="true" fill="#9a8f70" fontSize={8.5}>
            {malha.nomesTerra.map((n) => (
              <text key={n.texto} x={n.x} y={n.y} textAnchor="middle">{n.texto}</text>
            ))}
          </g>
        )}

        {/* Municípios */}
        {lista.map((m) => {
          const ehAtivo = m.cod === ativo;
          const dado = valores?.[m.cod];
          const ordem = ordemEntrada.indexOf(m.cod);
          return (
            <g
              key={m.cod}
              className={animar ? "mun-entrada" : undefined}
              {...(interativo
                ? {
                    role: "link",
                    tabIndex: 0,
                    "aria-label": `${m.nome}${dado ? `: ${dado.texto}` : ""}. Abrir página da cidade`,
                    onFocus: () => aoAtivar?.(m.cod),
                    onBlur: () => aoAtivar?.(null),
                    onKeyDown: (e: React.KeyboardEvent) => e.key === "Enter" && abrir(m.cod),
                    ...eventos(m.cod),
                  }
                : {})}
              style={{
                ...(interativo ? { cursor: "pointer", outline: "none" } : {}),
                ...(animar ? { animationDelay: `${ordem * 55}ms` } : {}),
              }}
            >
              <path
                d={m.d}
                fill={preencher(m.cod)}
                fillOpacity={ativo && !ehAtivo && interativo ? 0.6 : 1}
                stroke={ehAtivo ? "#f0b13b" : "#fff"}
                strokeWidth={ehAtivo ? 2.4 : 0.7}
                strokeLinejoin="round"
                style={{ transition: "fill 450ms ease, fill-opacity 200ms ease" }}
              />
            </g>
          );
        })}

        {/* Anel pulsante em volta da cidade ativa: deixa visível até as menores */}
        {completo &&
          malha.municipios
            .filter((m) => m.cod === ativo)
            .map((m) => (
              <g key={`anel-${m.cod}`} pointerEvents="none" aria-hidden="true">
                <circle cx={m.cx} cy={m.cy} r={9} fill="none" stroke="#f0b13b" strokeWidth={1.6} className="anel-pulso" style={{ transformOrigin: `${m.cx}px ${m.cy}px` }} />
                <circle cx={m.cx} cy={m.cy} r={2.4} fill="#f0b13b" stroke="#0a2a3d" strokeWidth={0.8} />
              </g>
            ))}

        {/* Rótulos no mar, ligados à cidade por uma linha de chamada */}
        {completo &&
          malha.municipios.map((m) => {
            const ehAtivo = m.cod === ativo;
            const largura = m.nome.length * 5.15 + 12;
            return (
              <g
                key={`r-${m.cod}`}
                aria-hidden="true"
                className={ehAtivo ? undefined : "max-sm:hidden"}
                {...eventos(m.cod)}
                style={{ cursor: "pointer", opacity: ativo && !ehAtivo ? 0.5 : 1, transition: "opacity 200ms ease" }}
              >
                <path
                  d={`M${m.ax} ${m.ay}L${m.lx - 4} ${m.ly}`}
                  stroke={ehAtivo ? "#f0b13b" : "#fff"}
                  strokeOpacity={ehAtivo ? 1 : 0.45}
                  strokeWidth={ehAtivo ? 1.3 : 0.6}
                  pointerEvents="none"
                />
                <circle cx={m.ax} cy={m.ay} r={ehAtivo ? 2 : 1.3} fill={ehAtivo ? "#f0b13b" : "#fff"} pointerEvents="none" />
                {ehAtivo && <rect x={m.lx - 5} y={m.ly - 8} width={largura} height={16} rx={8} fill="#f0b13b" />}
                <rect x={m.lx - 5} y={m.ly - 7} width={largura} height={14} fill="transparent" />
                <text
                  x={m.lx + 1}
                  y={m.ly}
                  dominantBaseline="central"
                  fontSize={FONTE}
                  fontWeight={ehAtivo ? 700 : 500}
                  fill={ehAtivo ? "#0a2a3d" : "#fff"}
                  fillOpacity={ehAtivo ? 1 : 0.88}
                >
                  {m.nome}
                </text>
              </g>
            );
          })}

        {completo && (
          <g transform={`translate(${malha.largura - 22} ${malha.altura - 40})`} fill="#fff" fillOpacity={0.6} aria-hidden="true">
            <path d="M0 -12 4.5 4 0 1 -4.5 4z" />
            <text y="16" textAnchor="middle" fontSize={9} fontWeight={600}>N</text>
          </g>
        )}
      </svg>

      {completo && (
        <div
          aria-live="polite"
          className="pointer-events-none mt-3 rounded-xl bg-white/92 p-3 ring-1 ring-black/5 sm:absolute sm:left-[3%] sm:top-[3%] sm:mt-0 sm:w-[44%] sm:min-w-[150px] sm:max-w-[230px] sm:shadow-[0_8px_24px_-12px_rgb(10_42_61/0.45)] sm:backdrop-blur-sm"
        >
          {info ? (
            <>
              <p className="titulo text-base font-semibold leading-tight text-tinta">{info.nome}</p>
              <p className="titulo mt-1 text-2xl font-semibold tabular-nums text-destaque">{info.texto}</p>
              {info.posicao && (
                <p className="mt-0.5 text-xs text-suave">
                  {info.posicao}º de {info.total} municípios
                </p>
              )}
              <p className="mt-2 text-xs font-medium text-tinta/70">Clique para ver a cidade</p>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <MiniLocalizacao />
              <p className="text-xs leading-snug text-suave">
                <span className="block font-semibold text-tinta">Litoral do RS</span>
                16 cidades de frente para o mar. Passe o mouse ou toque numa delas.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

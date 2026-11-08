import { useId } from "react";
import { malha } from "@/lib/mapa";

// Caixa que envolve o desenho de um município (o caminho é só "M x yL x y ... Z").
function caixa(d: string) {
  const n = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < n.length - 1; i += 2) {
    x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]);
    y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]);
  }
  return { x0, y0, x1, y1 };
}

const PROPORCAO = 0.8; // largura / altura do quadro
const LADO_MINIMO = 70; // nunca aproxima além disso, para a cidade não virar um borrão sem contexto
const LARGURA_PX = 180; // largura aproximada na tela, para dimensionar os textos

// Quadro aproximado na cidade: ela em âmbar com contorno escuro, vizinhas em tom claro com o nome.
export function MiniMapaCidade({ cod, nome }: { cod: string; nome: string }) {
  const id = useId();
  const alvo = malha.municipios.find((m) => m.cod === cod);
  if (!alvo) return null;

  const b = caixa(alvo.d);
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  let h = Math.max((b.y1 - b.y0) * 1.5, ((b.x1 - b.x0) * 1.5) / PROPORCAO, LADO_MINIMO / PROPORCAO);
  let w = h * PROPORCAO;
  // Mantém o quadro dentro do mapa.
  const x = Math.min(Math.max(cx - w / 2, 0), Math.max(0, malha.largura - w));
  const y = Math.min(Math.max(cy - h / 2, 0), Math.max(0, malha.altura - h));
  h = Math.min(h, malha.altura);
  w = Math.min(w, malha.largura);
  const px = w / LARGURA_PX; // unidades do mapa por pixel da tela

  const vizinhas = malha.municipios.filter(
    (m) => m.cod !== cod && m.cx > x + w * 0.08 && m.cx < x + w * 0.92 && m.cy > y + h * 0.06 && m.cy < y + h * 0.94,
  );

  return (
    <svg
      viewBox={`${x} ${y} ${w} ${h}`}
      role="img"
      aria-label={`${nome} destacada no mapa do litoral gaúcho`}
      className="block h-auto w-full overflow-hidden rounded-xl ring-1 ring-white/25"
    >
      <defs>
        <linearGradient id={`${id}-agua`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14566d" />
          <stop offset="1" stopColor="#0a2a3d" />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill="#f3f0e7" />
      <path d={malha.rs} fill="#e7e0cc" />
      <path d={malha.agua} fill={`url(#${id}-agua)`} />

      {malha.municipios
        .filter((m) => m.cod !== cod)
        .map((m) => (
          <path key={m.cod} d={m.d} fill="#bcd3d8" stroke="#fff" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        ))}

      {/* A cidade: contorno escuro por fora, âmbar por dentro e filete branco, para contrastar com terra, mar e vizinhas */}
      <path d={alvo.d} fill="none" stroke="#0a2a3d" strokeWidth={5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <path d={alvo.d} fill="#f0b13b" stroke="#fff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />

      <g aria-hidden="true" fontSize={8.5 * px} fill="#0a2a3d" fontWeight={600} textAnchor="middle" style={{ paintOrder: "stroke" }} stroke="#fff" strokeWidth={2.2 * px} strokeLinejoin="round">
        {vizinhas.map((m) => (
          <text key={m.cod} x={m.cx} y={m.cy}>{m.nome}</text>
        ))}
      </g>
    </svg>
  );
}

"use client";

import { useEffect, useState } from "react";
import { formatarValor } from "@/lib/formatar";

// Número que sobe até o valor final ao carregar. Sem JS ou com movimento reduzido, mostra o valor direto.
export function Contador({ valor, unidade, duracao = 1200 }: { valor: number; unidade: string; duracao?: number }) {
  const [atual, setAtual] = useState(valor);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let quadro = 0;
    let inicio = 0;
    const passo = (agora: number) => {
      if (!inicio) inicio = agora;
      const t = Math.min(1, (agora - inicio) / duracao);
      setAtual(valor * (1 - Math.pow(1 - t, 3)));
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [valor, duracao]);

  return <span className="tabular-nums">{formatarValor(atual, unidade)}</span>;
}

import { GraficoBarras, GraficoLinha } from "@/components/Graficos";
import { formatarPosicao, formatarValor } from "@/lib/formatar";
import type { Indicador as DadosIndicador, ItemCatalogo, Posicao } from "@/lib/tipos";
import { tipoVisualizacao } from "@/lib/visualizacao";

function dataCurta(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";
}

export function NotaFonte({ item, dados, carregadoEm }: { item: ItemCatalogo; dados: DadosIndicador | null; carregadoEm?: string }) {
  const periodo = dados?.ultimo?.periodo ?? item.periodo_max ?? "—";
  return (
    <p className="mt-4 border-t border-linha pt-3 text-xs text-suave">
      Fonte: {item.fonte} · Período: {periodo} · Atualizado em {dataCurta(carregadoEm)}
    </p>
  );
}

// Uma fita com um traço por município: o destacado mostra onde a cidade está no ranking.
export function FitaPosicao({ posicao, claro = false }: { posicao: Posicao; claro?: boolean }) {
  return (
    <div>
      <div className="flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: posicao.total }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i + 1 === posicao.posicao ? "bg-farol" : claro ? "bg-white/20" : "bg-linha"
            } ${i + 1 === posicao.posicao ? "h-2.5 -translate-y-px" : ""}`}
          />
        ))}
      </div>
      <p className={`mt-1.5 text-xs font-medium ${claro ? "text-white/80" : "text-destaque"}`}>{formatarPosicao(posicao)}</p>
    </div>
  );
}

export function Cartao({ item, dados }: { item: ItemCatalogo; dados: DadosIndicador | null }) {
  const ultimo = dados?.ultimo ?? null;
  return (
    <div className="cartao flex flex-col p-4 sm:p-5">
      <p className="text-sm text-suave">{item.nome}</p>
      <p className="titulo mt-1 text-3xl font-semibold tabular-nums">{formatarValor(ultimo?.valor, item.unidade)}</p>
      <p className="mb-3 text-xs text-suave">{ultimo ? `em ${ultimo.periodo}` : " "}</p>
      {dados?.posicao && <div className="mt-auto"><FitaPosicao posicao={dados.posicao} /></div>}
    </div>
  );
}

export function Indicador({ item, dados, carregadoEm }: { item: ItemCatalogo; dados: DadosIndicador | null; carregadoEm?: string }) {
  const tipo = tipoVisualizacao(dados);
  return (
    <article className="cartao p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold" title={item.descricao}>{item.nome}</h3>
        {tipo !== "vazio" && (
          <span className="titulo text-xl font-semibold tabular-nums">
            {dados?.ultimo ? formatarValor(dados.ultimo.valor, item.unidade) : "Sem dado no período mais recente"}
          </span>
        )}
      </header>
      <p className="mt-1 text-sm leading-snug text-suave">{item.descricao}</p>
      {dados?.posicao && (
        <div className="mt-3 max-w-xs">
          <FitaPosicao posicao={dados.posicao} />
        </div>
      )}
      <div className="mt-4">
        {tipo === "vazio" && (
          <p className="rounded-lg bg-papel px-3 py-3 text-sm text-suave">
            Sem dado. <span className="text-xs">{item.motivo_ausencia}</span>
          </p>
        )}
        {tipo === "linha" && <GraficoLinha serie={dados!.serie} unidade={item.unidade} />}
        {tipo === "barras" && (
          <>
            {dados!.serie.length >= 2 && <GraficoLinha serie={dados!.serie} unidade={item.unidade} />}
            <p className="mb-1 mt-3 text-sm font-medium">Por setor em {dados!.ultimo?.periodo}</p>
            <GraficoBarras dados={dados!.por_recorte!} unidade={item.unidade} />
          </>
        )}
      </div>
      <NotaFonte item={item} dados={dados} carregadoEm={carregadoEm} />
    </article>
  );
}

import { GraficoBarras, GraficoLinha } from "@/components/Graficos";
import { formatarPosicao, formatarValor } from "@/lib/formatar";
import type { Indicador as DadosIndicador, ItemCatalogo } from "@/lib/tipos";
import { tipoVisualizacao } from "@/lib/visualizacao";

function dataCurta(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";
}

export function NotaFonte({ item, dados, carregadoEm }: { item: ItemCatalogo; dados: DadosIndicador | null; carregadoEm?: string }) {
  const periodo = dados?.ultimo?.periodo ?? item.periodo_max ?? "—";
  return (
    <p className="mt-3 text-xs text-suave">
      Fonte: {item.fonte} · Período: {periodo} · Atualizado em {dataCurta(carregadoEm)}
    </p>
  );
}

export function Cartao({ item, dados }: { item: ItemCatalogo; dados: DadosIndicador | null }) {
  const ultimo = dados?.ultimo ?? null;
  return (
    <div className="rounded-xl border border-linha bg-cartao p-4">
      <p className="text-xs font-medium text-suave">{item.nome}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{formatarValor(ultimo?.valor, item.unidade)}</p>
      {ultimo && <p className="text-xs text-suave">{ultimo.periodo}</p>}
      {dados?.posicao && (
        <p className="mt-2 text-xs text-destaque">
          {formatarPosicao(dados.posicao)}
        </p>
      )}
    </div>
  );
}

export function Indicador({ item, dados, carregadoEm }: { item: ItemCatalogo; dados: DadosIndicador | null; carregadoEm?: string }) {
  const tipo = tipoVisualizacao(dados);
  return (
    <article className="rounded-xl border border-linha bg-cartao p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium" title={item.descricao}>{item.nome}</h3>
        {tipo !== "vazio" && (
          <span className="text-lg font-semibold tabular-nums">
            {dados?.ultimo ? formatarValor(dados.ultimo.valor, item.unidade) : "Sem dado no período mais recente"}
          </span>
        )}
      </header>
      {dados?.posicao && (
        <p className="text-xs text-destaque">
          {formatarPosicao(dados.posicao)}
        </p>
      )}
      <div className="mt-3">
        {tipo === "vazio" && (
          <p className="text-sm text-suave">
            Sem dado. <span className="text-xs">{item.motivo_ausencia}</span>
          </p>
        )}
        {tipo === "linha" && <GraficoLinha serie={dados!.serie} unidade={item.unidade} />}
        {tipo === "barras" && (
          <>
            {dados!.serie.length >= 2 && <GraficoLinha serie={dados!.serie} unidade={item.unidade} />}
            <p className="mb-1 mt-3 text-xs text-suave">Por setor em {dados!.ultimo?.periodo}</p>
            <GraficoBarras dados={dados!.por_recorte!} unidade={item.unidade} />
          </>
        )}
      </div>
      <NotaFonte item={item} dados={dados} carregadoEm={carregadoEm} />
    </article>
  );
}

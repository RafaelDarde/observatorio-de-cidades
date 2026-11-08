"""Comando `observatorio atualizar [--fonte <id>]`: baixa, carrega, deriva, valida e exporta."""
import argparse
import logging
from types import ModuleType

from observatorio.banco import conectar
from observatorio.catalogo import carregar_catalogo
from observatorio.config import SAIDA_DIR
from observatorio.derivados import calcular_derivados
from observatorio.exportar import exportar
from observatorio.fontes import caged, ibge_cempre, ibge_municipios, ibge_pib, ibge_populacao
from observatorio.validar import validar

log = logging.getLogger("observatorio")

FONTES: dict[str, ModuleType] = {
    "ibge_municipios": ibge_municipios,
    "ibge_populacao": ibge_populacao,
    "ibge_pib": ibge_pib,
    "ibge_cempre": ibge_cempre,
    "caged": caged,
}


def atualizar(con, fontes: dict = FONTES, so: str | None = None) -> int:
    if so is not None and so not in fontes:
        log.error("fonte desconhecida: %s (disponíveis: %s)", so, ", ".join(fontes))
        return 2
    for nome, fonte in fontes.items():
        if so is not None and nome != so:
            continue
        try:
            fonte.baixar()
            linhas = fonte.carregar(con)
            log.info("%s: %d linhas carregadas", nome, linhas)
        except Exception:
            log.exception("%s: falhou; mantida a última carga boa", nome)
        if nome == "ibge_municipios" and con.execute("select count(*) from municipios").fetchone()[0] == 0:
            log.error("sem lista de municípios: as outras fontes dependem dela; atualização interrompida")
            return 1

    calcular_derivados(con)
    erros = validar(con, fontes["ibge_municipios"].total_api())
    if erros:
        for erro in erros:
            log.error("validação: %s", erro)
        log.error("exportação cancelada")
        return 1
    exportar(con, carregar_catalogo(), SAIDA_DIR)
    log.info("JSONs exportados em %s", SAIDA_DIR)
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(prog="observatorio")
    sub = parser.add_subparsers(dest="comando", required=True)
    p = sub.add_parser("atualizar", help="baixa as fontes e exporta os JSONs do site")
    p.add_argument("--fonte", choices=list(FONTES), help="atualiza só esta fonte")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    raise SystemExit(atualizar(conectar(), FONTES, args.fonte))

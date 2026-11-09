from dataclasses import dataclass
from pathlib import Path

import yaml

UNIDADES = {"pessoas", "R$", "R$ mil", "salarios_minimos", "empregos", "%", "empregos_por_mil_hab", "unidades",
            "ocorrencias", "por_100mil_hab", "indice"}
TEMAS = {"populacao", "economia", "empresas", "emprego", "seguranca"}
_PADRAO = Path(__file__).with_name("indicadores.yaml")


@dataclass(frozen=True)
class Indicador:
    id: str
    nome: str
    unidade: str
    fonte: str
    descricao: str
    tema: str
    relativo: bool
    ranking: bool
    motivo_ausencia: str


def carregar_catalogo(caminho: Path | None = None) -> dict[str, Indicador]:
    itens = yaml.safe_load(Path(caminho or _PADRAO).read_text(encoding="utf-8"))
    catalogo: dict[str, Indicador] = {}
    for item in itens:
        ind = Indicador(**item)
        if ind.id in catalogo:
            raise ValueError(f"id duplicado no catálogo: {ind.id}")
        if ind.unidade not in UNIDADES:
            raise ValueError(f"unidade inválida em {ind.id}: {ind.unidade}")
        if ind.tema not in TEMAS:
            raise ValueError(f"tema inválido em {ind.id}: {ind.tema}")
        catalogo[ind.id] = ind
    return catalogo

"""Recorte territorial: quais municípios o Observatório cobre (ver recorte.yaml)."""
from dataclasses import dataclass
from pathlib import Path

import yaml

_PADRAO = Path(__file__).with_name("recorte.yaml")


@dataclass(frozen=True)
class Recorte:
    nome: str
    descricao: str
    municipios: dict[str, str]  # código IBGE -> nome


def carregar_recorte(caminho: Path | None = None) -> Recorte:
    dados = yaml.safe_load(Path(caminho or _PADRAO).read_text(encoding="utf-8"))
    return Recorte(dados["nome"], dados["descricao"], {str(c): n for c, n in dados["municipios"].items()})


def territorio_sidra(recorte: Recorte | None = None) -> str:
    return "n6/" + ",".join(sorted((recorte or carregar_recorte()).municipios))


def cache_do_recorte(fonte: str, recorte: Recorte | None = None) -> Path:
    """Cache do dia separado por lista de municípios: trocar o recorte não reaproveita respostas de outro."""
    import hashlib
    from observatorio.config import cache_do_dia
    chave = hashlib.sha1(territorio_sidra(recorte).encode()).hexdigest()[:10]
    return cache_do_dia(fonte) / f"recorte-{chave}"

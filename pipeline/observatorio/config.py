from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CACHE_DIR = RAIZ / "_cache"
DB_PATH = RAIZ / "observatorio.duckdb"
SAIDA_DIR = RAIZ / "web" / "public" / "dados"
SCHEMA_PATH = RAIZ / "schema" / "dados.schema.json"
CAGED_MESES = 24


def cache_do_dia(fonte: str) -> Path:
    """Diretório de cache datado: respostas de API mudam com o tempo, então o cache vale por um dia."""
    from datetime import date
    return CACHE_DIR / fonte / date.today().isoformat()

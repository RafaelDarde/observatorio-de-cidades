from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CACHE_DIR = RAIZ / "_cache"
DB_PATH = RAIZ / "observatorio.duckdb"
SAIDA_DIR = RAIZ / "web" / "public" / "dados"
SCHEMA_PATH = RAIZ / "schema" / "dados.schema.json"
CAGED_MESES = 24

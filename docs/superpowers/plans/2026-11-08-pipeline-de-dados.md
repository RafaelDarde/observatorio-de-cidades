# Pipeline de Dados — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pipeline Python que baixa IBGE (municípios, população, PIB, CEMPRE) e Novo CAGED, normaliza tudo numa tabela `fatos` no DuckDB, valida e exporta os JSONs que o site consome.

**Architecture:** um módulo por fonte com o contrato `baixar()` / `carregar(con)`. Todas as fontes gravam na tabela longa `fatos`. `derivados.py` calcula indicadores derivados, `validar.py` barra dados inconsistentes e `exportar.py` gera os JSONs validados por JSON Schema em `web/public/dados/`.

**Tech Stack:** Python 3.12, uv, duckdb, pyyaml, jsonschema, py7zr, pytest. HTTP e FTP via `urllib` da stdlib, com `ftplib` para listar o FTP.

**Spec:** `docs/superpowers/specs/2026-11-08-observatorio-de-cidades-design.md`

## Global Constraints

- Código de município é texto de 7 dígitos (`"4314902"`). O código de 6 dígitos existe só em `municipios.cod6` e dentro de `fontes/caged.py`.
- `periodo` é texto: `"AAAA"` ou `"AAAA-MM"`.
- `recorte` é `NULL` para o total. Recortes usam o rótulo legível da fonte (por exemplo, `"G - Comércio; reparação de veículos..."` no CEMPRE, `"Comércio"` no CAGED).
- Dado ausente nunca vira zero: a linha simplesmente não entra em `fatos` e sai como `null` no JSON.
- Downloads: timeout de 60 s, até 3 novas tentativas, espera exponencial (1 s, 2 s, 4 s). O que já está em `_cache/` não é baixado de novo.
- CAGED: os últimos 24 meses disponíveis (`CAGED_MESES = 24`).
- Checagem de população: a soma dos municípios não pode divergir mais de 1% do total Brasil.
- Caminhos (`observatorio/config.py`): `RAIZ` = raiz do repo, `CACHE_DIR = RAIZ/"_cache"`, `DB_PATH = RAIZ/"observatorio.duckdb"`, `SAIDA_DIR = RAIZ/"web/public/dados"`, `SCHEMA_PATH = RAIZ/"schema/dados.schema.json"`.
- Todos os comandos rodam em `pipeline/` (`cd pipeline`).

## Decisões deste plano (refinam o spec)

- **`ultimo` e `posicao`:** "último período" é o período mais recente do indicador no país inteiro. Se o município não tem valor nesse período, `ultimo` e `posicao` saem `null`, mas `serie` continua com o histórico. O indicador inteiro sai `null` só quando o município não tem nenhuma linha dele.
- **CAGED no MVP:** só o arquivo `CAGEDMOV` (movimentações no prazo). Os ajustes `CAGEDFOR`/`CAGEDEXC` ficam fora, e a `descricao` no catálogo avisa que o saldo pode diferir levemente do número oficial divulgado.
- **Total Brasil da população:** guardado na tabela `referencias(indicador, periodo, valor)`, que só a validação usa.

## Review Focus

1. **Valores especiais do SIDRA** (`"-"`, `".."`, `"..."`, `"X"` de sigilo): a linha é descartada, nunca vira 0. Teste em `test_sidra.py`.
2. **Município na API de localidades com `microrregiao: null`** (caso real de municípios recém-criados): a região tem de vir de `regiao-imediata`. Teste em `test_ibge_municipios.py`.
3. **Código de município do CAGED sem correspondência** (por exemplo `"999999"`, ignorado): a linha é descartada e a contagem vai para o log. Teste em `test_caged.py`.
4. **Município sem valor no último período mas com histórico**: `ultimo: null`, fora do ranking, e a `serie` é mantida. Teste em `test_exportar.py`.
5. **Uma fonte falhando (rede fora) durante `atualizar`**: as outras seguem, a carga anterior é mantida e o processo termina com código ≠ 0 só se a validação falhar. Teste em `test_cli.py`.

---

### Task 1: Projeto Python, config e banco

**Files:**
- Create: `pipeline/pyproject.toml`, `pipeline/observatorio/__init__.py`, `pipeline/observatorio/config.py`, `pipeline/observatorio/banco.py`
- Test: `pipeline/tests/test_banco.py`

**Interfaces:**
- Produces:
  - `conectar(caminho: str | Path = DB_PATH) -> duckdb.DuckDBPyConnection` cria (se não existirem) as tabelas `municipios(cod_municipio VARCHAR PRIMARY KEY, cod6 VARCHAR, nome VARCHAR, uf VARCHAR, regiao VARCHAR)`, `fatos(fonte VARCHAR, cod_municipio VARCHAR, indicador VARCHAR, periodo VARCHAR, recorte VARCHAR, valor DOUBLE)`, `cargas(fonte VARCHAR PRIMARY KEY, carregado_em TIMESTAMP, periodo_min VARCHAR, periodo_max VARCHAR, linhas BIGINT)` e `referencias(indicador VARCHAR, periodo VARCHAR, valor DOUBLE)`.
  - `substituir_fatos(con, fonte: str, linhas: list[tuple[str, str, str, str | None, float]]) -> int`: apaga as linhas da fonte, insere tuplas `(cod_municipio, indicador, periodo, recorte, valor)`, atualiza `cargas` (período mín/máx, contagem, `now()`) e devolve a contagem.
  - Constantes de `config.py` conforme as Global Constraints, mais `CAGED_MESES = 24`.

- [ ] **Step 1: Criar o projeto** com `uv init --package --name observatorio pipeline` (ajustar para o layout acima) e `uv add duckdb pyyaml jsonschema py7zr` e `uv add --dev pytest`. Em `pyproject.toml`, adicionar `[project.scripts] observatorio = "observatorio.cli:main"`.
- [ ] **Step 2: Escrever o teste que falha**

```python
def test_conectar_cria_tabelas():
    con = conectar(":memory:")
    nomes = {r[0] for r in con.execute("select table_name from information_schema.tables").fetchall()}
    assert {"municipios", "fatos", "cargas", "referencias"} <= nomes

def test_substituir_fatos_troca_so_a_fonte_e_registra_carga():
    con = conectar(":memory:")
    substituir_fatos(con, "a", [("4314902", "x", "2020", None, 1.0)])
    substituir_fatos(con, "b", [("4314902", "y", "2021", None, 2.0)])
    n = substituir_fatos(con, "a", [("4314902", "x", "2022", None, 3.0), ("4314902", "x", "2023", None, 4.0)])
    assert n == 2
    assert con.execute("select count(*) from fatos where fonte='a'").fetchone()[0] == 2
    assert con.execute("select count(*) from fatos where fonte='b'").fetchone()[0] == 1
    assert con.execute("select periodo_min, periodo_max, linhas from cargas where fonte='a'").fetchone() == ("2022", "2023", 2)
```

- [ ] **Step 3: Rodar:** `uv run pytest tests/test_banco.py -v`. Esperado: FAIL (import).
- [ ] **Step 4: Implementar** `config.py` e `banco.py`. `substituir_fatos` roda em uma transação: `begin`, delete, `executemany`, upsert em `cargas`, `commit`.
- [ ] **Step 5: Rodar:** `uv run pytest -v`. Esperado: PASS.
- [ ] **Step 6: Commit:** `git add pipeline && git commit -m "pipeline: projeto, config e banco DuckDB"`

---

### Task 2: Download com cache e retentativa

**Files:**
- Create: `pipeline/observatorio/rede.py`
- Test: `pipeline/tests/test_rede.py`

**Interfaces:**
- Produces:
  - `baixar(url: str, destino: Path, *, abrir=urllib.request.urlopen, dormir=time.sleep, tentativas: int = 3, timeout: int = 60) -> Path`: se `destino` existe e não está vazio, devolve-o sem abrir a URL. Senão grava em `destino.with_suffix(".parcial")` e renomeia ao terminar (um download interrompido nunca vira cache válido). A cada falha (`OSError`, que inclui `URLError`), chama `dormir(2**i)` e tenta de novo. Esgotadas as tentativas, relança a última exceção. `abrir(url, timeout=timeout)` devolve um objeto com `.read()` e é usável como context manager. Funciona para `http(s)://` e `ftp://`.
  - `baixar_json(url: str, destino: Path, **kw) -> Any`: chama `baixar` e faz `json.loads` do conteúdo.

- [ ] **Step 1: Escrever os testes que falham**

```python
def test_usa_cache_sem_abrir(tmp_path):
    arq = tmp_path / "a.json"; arq.write_text("[1]")
    def abrir(*a, **k): raise AssertionError("não devia baixar")
    assert baixar_json("http://x", arq, abrir=abrir) == [1]

def test_retenta_com_espera_exponencial_e_depois_grava(tmp_path):
    chamadas, esperas = [], []
    def abrir(url, timeout):
        chamadas.append(url)
        if len(chamadas) < 3: raise URLError("fora")
        return io.BytesIO(b"ok")
    p = baixar("http://x", tmp_path / "f.bin", abrir=abrir, dormir=esperas.append)
    assert p.read_bytes() == b"ok" and esperas == [1, 2]

def test_esgota_tentativas_relanca_e_nao_deixa_cache(tmp_path):
    def abrir(url, timeout): raise URLError("fora")
    with pytest.raises(URLError):
        baixar("http://x", tmp_path / "f.bin", abrir=abrir, dormir=lambda s: None)
    assert not (tmp_path / "f.bin").exists()
```

No teste 3, `tentativas=3` resulta em 4 chamadas no total (1 + 3 novas tentativas) e esperas `[1, 2, 4]`.

- [ ] **Step 2: Rodar:** `uv run pytest tests/test_rede.py -v`. Esperado: FAIL.
- [ ] **Step 3: Implementar** `baixar` e `baixar_json`. Criar `destino.parent` se não existir.
- [ ] **Step 4: Rodar:** `uv run pytest -v`. Esperado: PASS.
- [ ] **Step 5: Commit:** `git commit -am "pipeline: download com cache e retentativa"` (com `git add` dos arquivos novos)

---

### Task 3: Catálogo de indicadores

**Files:**
- Create: `pipeline/observatorio/indicadores.yaml`, `pipeline/observatorio/catalogo.py`
- Test: `pipeline/tests/test_catalogo.py`

**Interfaces:**
- Produces:
  - `@dataclass(frozen=True) class Indicador: id, nome, unidade, fonte, descricao, tema, relativo: bool, ranking: bool, motivo_ausencia: str`.
  - `carregar_catalogo(caminho: Path | None = None) -> dict[str, Indicador]`: usa o yaml do pacote por padrão e mantém a ordem do arquivo. Levanta `ValueError` se houver id duplicado, `unidade` fora de `{"pessoas","R$","R$ mil","salarios_minimos","empregos","%","empregos_por_mil_hab","unidades"}` ou `tema` fora de `{"populacao","economia","empresas","emprego"}`.
- Conteúdo do yaml: os 17 indicadores da seção 2.4 do spec. `relativo: true` para `populacao_var_5a`, `pib_per_capita`, `cempre_salario_medio_sm` e `caged_saldo_12m_por_mil_hab`. `ranking: true` para `populacao`, `populacao_var_5a`, `pib`, `pib_per_capita`, `cempre_pessoal_ocupado`, `cempre_salario_medio_sm`, `caged_saldo_12m` e `caged_saldo_12m_por_mil_hab`. A `descricao` dos `caged_*` cita o uso exclusivo do CAGEDMOV, e o `motivo_ausencia` dos `cempre_*` cita o sigilo estatístico.

- [ ] **Step 1: Teste que falha:** `test_catalogo_real_valido` (17 ids, os 8 com ranking acima, todos com `motivo_ausencia` não vazio), `test_id_duplicado_falha`, `test_unidade_invalida_falha` (os dois últimos usando yaml em `tmp_path`).
- [ ] **Step 2: Rodar:** `uv run pytest tests/test_catalogo.py -v`. Esperado: FAIL.
- [ ] **Step 3: Implementar** o yaml e `catalogo.py`. Incluir o yaml como package data.
- [ ] **Step 4: Rodar:** `uv run pytest -v`. Esperado: PASS.
- [ ] **Step 5: Commit:** `"pipeline: catálogo de indicadores"`

---

### Task 4: Fonte `ibge_municipios`

**Files:**
- Create: `pipeline/observatorio/fontes/__init__.py`, `pipeline/observatorio/fontes/ibge_municipios.py`
- Test: `pipeline/tests/test_ibge_municipios.py`, `pipeline/tests/fixtures/localidades.json` (3 municípios reais copiados da API, sendo 1 com `"microrregiao": null`)

**Interfaces:**
- Consumes: `baixar_json` (Task 2), `conectar` (Task 1).
- Produces:
  - `URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"`
  - `parse(dados: list[dict]) -> list[tuple[str, str, str, str, str]]` devolve `(cod7, cod6, nome, uf_sigla, regiao_nome)`. `cod6 = cod7[:6]`. A UF vem de `microrregiao.mesorregiao.UF` e, se `microrregiao` for null, de `regiao-imediata.regiao-intermediaria.UF`.
  - `baixar() -> list[Path]` e `carregar(con) -> int`: substitui toda a tabela `municipios`.
  - `total_api() -> int`: `len()` do JSON em cache, usado pela validação.

- [ ] **Step 1: Teste que falha:** `test_parse_extrai_campos` (Porto Alegre → `("4314902","431490","Porto Alegre","RS","Sul")`) e `test_parse_microrregiao_nula_usa_regiao_imediata`.
- [ ] **Step 2: Rodar:** esperado FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar:** `uv run pytest -v`. Esperado: PASS.
- [ ] **Step 5: Commit:** `"pipeline: fonte ibge_municipios"`

---

### Task 5: Cliente SIDRA

**Files:**
- Create: `pipeline/observatorio/sidra.py`
- Test: `pipeline/tests/test_sidra.py`

**Interfaces:**
- Produces:
  - `url_sidra(tabela: int, variaveis: list[int], periodo: str, territorio: str = "n6/all", classificacao: str = "") -> str` monta `f"https://apisidra.ibge.gov.br/values/t/{tabela}/{territorio}/v/{','.join(...)}/p/{periodo}{('/' + classificacao) if classificacao else ''}"`. O `periodo` aceita `"2022"`, `"last 10"` (o espaço vai codificado como `%20`) ou `"all"`.
  - `parse_sidra(linhas: list[dict]) -> list[dict]`: a primeira linha é o cabeçalho, que mapeia as chaves (`"D1C"`, `"V"`, ...) para rótulos. Devolve dicts indexados pelo rótulo (`"Município (Código)"`, `"Ano"`, `"Variável (Código)"`, `"Valor"`...). `"Valor"` vira `float`, e linhas com valor em `{"-", "..", "...", "X"}` são descartadas.

- [ ] **Step 1: Teste que falha:**

```python
LINHAS = [
  {"D1C": "Município (Código)", "D2C": "Ano", "D3C": "Variável (Código)", "V": "Valor"},
  {"D1C": "4314902", "D2C": "2024", "D3C": "9324", "V": "1389322"},
  {"D1C": "4300034", "D2C": "2024", "D3C": "9324", "V": "X"},
  {"D1C": "4300059", "D2C": "2024", "D3C": "9324", "V": "..."},
  {"D1C": "4300109", "D2C": "2024", "D3C": "9324", "V": "-"},
]
def test_parse_descarta_especiais_nunca_zero():
    r = parse_sidra(LINHAS)
    assert r == [{"Município (Código)": "4314902", "Ano": "2024", "Variável (Código)": "9324", "Valor": 1389322.0}]

def test_url_sidra():
    assert url_sidra(5938, [37, 497], "last 5") == "https://apisidra.ibge.gov.br/values/t/5938/n6/all/v/37,497/p/last%205"
```

- [ ] **Step 2: Rodar:** esperado FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar:** esperado PASS.
- [ ] **Step 5: Commit:** `"pipeline: cliente SIDRA"`

---

### Task 6: Fonte `ibge_populacao`

**Files:**
- Create: `pipeline/observatorio/fontes/ibge_populacao.py`
- Test: `pipeline/tests/test_ibge_populacao.py`, `pipeline/tests/fixtures/sidra_6579.json`, `pipeline/tests/fixtures/sidra_4709.json`

**Interfaces:**
- Consumes: `url_sidra`, `parse_sidra`, `baixar_json`, `substituir_fatos`.
- Produces:
  - `normalizar(linhas_estimativas: list[dict], linhas_censo: list[dict]) -> list[tuple]` devolve tuplas de `fatos` com `indicador="populacao"` e `recorte=None`. Se o mesmo município e ano aparecerem nas duas, vale o Censo.
  - `baixar()`: as estimativas (6579, `"last 10"`, uma requisição por ano para ficar abaixo do limite de valores do SIDRA) e o Censo 2022 (4709, `"2022"`). Também baixa o total Brasil (`territorio="n1/all"`) das mesmas tabelas.
  - `carregar(con)`: `substituir_fatos(con, "ibge_populacao", ...)` e grava o total Brasil em `referencias` (indicador `"populacao"`), substituindo o anterior.

- [ ] **Step 0: Confirmar códigos.** Abrir `https://servicodados.ibge.gov.br/api/v3/agregados/6579/metadados` e `.../4709/metadados` e anotar no topo do módulo `TABELA_ESTIMATIVAS`, `VAR_ESTIMATIVAS`, `TABELA_CENSO` e `VAR_CENSO` (spec: 6579 e 4709, variável "População residente"). Gravar as fixtures com respostas reais pequenas: `n6/4314902,4300034` e 2 anos.
- [ ] **Step 1: Teste que falha:** `test_normalizar_censo_prevalece` e `test_normalizar_gera_tuplas` (formato `("4314902","populacao","2024",None,1389322.0)`).
- [ ] **Step 2: Rodar:** esperado FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar:** esperado PASS.
- [ ] **Step 5: Commit:** `"pipeline: fonte ibge_populacao"`

---

### Task 7: Fonte `ibge_pib`

**Files:**
- Create: `pipeline/observatorio/fontes/ibge_pib.py`
- Test: `pipeline/tests/test_ibge_pib.py`, `pipeline/tests/fixtures/sidra_5938.json`

**Interfaces:**
- Produces:
  - `VARIAVEIS: dict[int, str]` mapeia o código da variável SIDRA para o id do indicador (`pib`, `pib_per_capita`, `vab_agro`, `vab_industria`, `vab_servicos`, `vab_adm_publica`).
  - `normalizar(linhas: list[dict]) -> list[tuple]`; `baixar()` (5938, `"last 5"`, uma requisição por ano); `carregar(con)` com a fonte `"ibge_pib"`.

- [ ] **Step 0: Confirmar** os códigos das 6 variáveis em `.../agregados/5938/metadados` e preencher `VARIAVEIS`. Gravar a fixture com 1 município e 2 anos.
- [ ] **Step 1: Teste que falha:** `test_normalizar_mapeia_variaveis` (cada código vira o indicador certo) e `test_variavel_desconhecida_ignorada`.
- [ ] **Steps 2–5:** rodar (FAIL), implementar, rodar (PASS) e commitar `"pipeline: fonte ibge_pib"`.

---

### Task 8: Fonte `ibge_cempre`

**Files:**
- Create: `pipeline/observatorio/fontes/ibge_cempre.py`
- Test: `pipeline/tests/test_ibge_cempre.py`, `pipeline/tests/fixtures/sidra_1685.json`

**Interfaces:**
- Produces:
  - `VARIAVEIS: dict[int, str]` → `cempre_unidades_locais`, `cempre_pessoal_ocupado`, `cempre_salario_medio_sm`.
  - `UFS: list[str]`: os 27 códigos de UF.
  - `normalizar(linhas)`: a categoria "Total" da classificação CNAE vira `recorte=None`, e as demais usam o rótulo da seção como `recorte`.
  - `baixar()`: o último ano (`"last 1"`), uma requisição por UF (`territorio=f"n6/in n3 {uf}"`), com classificação de seções CNAE 2.0 (`all`). `carregar(con)` com a fonte `"ibge_cempre"`.

- [ ] **Step 0: Confirmar** a tabela, as 3 variáveis e o código da classificação de seção CNAE em `.../agregados/1685/metadados`. O spec diz 1685. Se o metadado mostrar que a 1685 não tem nível municipal, procurar a tabela CEMPRE municipal por seção CNAE 2.0 na lista de agregados da pesquisa CEMPRE e anotar no módulo. Gravar a fixture com 1 município, Total e 2 seções, incluindo um valor `"X"`.
- [ ] **Step 1: Teste que falha:** `test_total_vira_recorte_nulo`, `test_secao_vira_recorte` e `test_sigilo_descartado`.
- [ ] **Steps 2–5:** rodar (FAIL), implementar, rodar (PASS) e commitar `"pipeline: fonte ibge_cempre"`.

---

### Task 9: Fonte `caged`

**Files:**
- Create: `pipeline/observatorio/fontes/caged.py`
- Test: `pipeline/tests/test_caged.py`, `pipeline/tests/fixtures/CAGEDMOV_amostra.txt` (cabeçalho real e cerca de 10 linhas, separador `;`)

**Interfaces:**
- Consumes: `baixar` (Task 2), `municipios.cod6` (Task 4), `substituir_fatos`.
- Produces:
  - `FTP_HOST = "ftp.mtps.gov.br"`, `BASE = "/pdet/microdados/NOVO CAGED"`.
  - `COLUNAS_ESPERADAS: list[str]` é o cabeçalho exato do CAGEDMOV, copiado do arquivo real no Step 0.
  - `class LayoutInesperado(Exception)`.
  - `GRANDE_SETOR: dict[str, str]` mapeia a seção CNAE para o grande setor: `A→"Agropecuária"`, `B,C,D,E→"Indústria"`, `F→"Construção"`, `G→"Comércio"`, demais→`"Serviços"`.
  - `meses_disponiveis(listar: Callable[[str], list[str]]) -> list[str]` devolve `"AAAA-MM"` em ordem crescente. `listar(caminho)` devolve os nomes do diretório no FTP (em produção, `ftplib.FTP.nlst`).
  - `agregar(con, arquivo_txt: Path) -> tuple[list[tuple], int]`: lê o arquivo com `read_csv` do DuckDB (`delim=';'`, `header=true`, todas as colunas como VARCHAR), confere o cabeçalho (`LayoutInesperado` com as colunas faltando ou sobrando se o cabeçalho for diferente de `COLUNAS_ESPERADAS`) e faz join `municipio = cod6`. Gera `caged_admissoes` (saldo = 1), `caged_desligamentos` (saldo = −1, valor positivo) e `caged_saldo` por mês (`competênciamov` → `"AAAA-MM"`), para o total (`recorte=None`) e por grande setor. Devolve `(tuplas, descartadas)`, onde `descartadas` é o número de linhas sem correspondência de município.
  - `baixar()`: os últimos `CAGED_MESES` meses, de `ftp://{FTP_HOST}{BASE}/{AAAA}/{AAAAMM}/CAGEDMOV{AAAAMM}.7z`, extraídos com `py7zr` para `_cache/caged/`.
  - `carregar(con)`: agrega todos os meses, registra `descartadas` no log e grava com a fonte `"caged"`.

- [ ] **Step 0: Confirmar o layout.** Baixar um mês real e copiar para `COLUNAS_ESPERADAS` e para a fixture o cabeçalho e 10 linhas: 1 com município `999999`, admissões e desligamentos em seções A, C e G, e 2 competências.
- [ ] **Step 1: Teste que falha:**
  - `test_agregar_total_e_setor`: valores esperados contados à mão na fixture.
  - `test_municipio_sem_correspondencia_descartado_e_contado`: `descartadas == 1`.
  - `test_layout_diferente_levanta`: fixture com uma coluna removida → `LayoutInesperado`.
  - `test_meses_disponiveis_ordena`: um `listar` falso devolve `["2025"]` → `["202511","202512"]`.
- [ ] **Steps 2–5:** rodar (FAIL), implementar, rodar (PASS) e commitar `"pipeline: fonte caged"`.

---

### Task 10: Indicadores derivados

**Files:**
- Create: `pipeline/observatorio/derivados.py`
- Test: `pipeline/tests/test_derivados.py`

**Interfaces:**
- Produces: `calcular_derivados(con) -> int`, que substitui a fonte `"derivado"` com:
  - `populacao_var_5a` em %: `(pop[P] / pop[P-5] - 1) * 100`, onde `P` é o último ano de `populacao`. Sem `pop[P-5]`, nada é gravado.
  - `caged_saldo_12m`: a soma do `caged_saldo` total dos 12 meses até o último mês `M`, gravada com `periodo = M`. Só é gravado se o município tiver os 12 meses.
  - `caged_saldo_12m_por_mil_hab`: `saldo_12m / populacao[último ano] * 1000`.

- [ ] **Step 1: Teste que falha:** `test_var_5a`, `test_var_5a_sem_ano_base_omite`, `test_saldo_12m_soma_12_meses` (com 14 meses inseridos) e `test_saldo_por_mil`.
- [ ] **Steps 2–5:** rodar (FAIL), implementar em SQL, rodar (PASS) e commitar `"pipeline: indicadores derivados"`.

---

### Task 11: Validação

**Files:**
- Create: `pipeline/observatorio/validar.py`
- Test: `pipeline/tests/test_validar.py`

**Interfaces:**
- Produces: `validar(con, total_municipios_api: int) -> list[str]` devolve mensagens de erro, e a lista vazia significa ok. Checagens:
  1. `count(municipios) == total_municipios_api`;
  2. não há duplicata em `(fonte, cod_municipio, indicador, periodo, recorte)`, com recortes NULL comparados como iguais;
  3. para o último ano presente em `referencias` e `populacao`, `abs(soma/total - 1) <= 0.01`;
  4. `fatos.cod_municipio` está sempre em `municipios`.

(O layout do CAGED é checado em `caged.agregar` e o JSON Schema em `exportar`, conforme a seção 5 do spec.)

- [ ] **Step 1: Teste que falha:** um caso que passa e um que falha para cada uma das 4 checagens.
- [ ] **Steps 2–5:** rodar (FAIL), implementar, rodar (PASS) e commitar `"pipeline: validação"`.

---

### Task 12: JSON Schema e exportação

**Files:**
- Create: `schema/dados.schema.json`, `pipeline/observatorio/exportar.py`
- Test: `pipeline/tests/test_exportar.py`

**Interfaces:**
- Consumes: `carregar_catalogo` (Task 3), as tabelas da Task 1.
- Produces:
  - O schema tem `$defs`: `catalogo`, `indiceMunicipios`, `perfil`, `indicador`, `ranking` e `meta`, nas formas da seção 3 do spec com o refinamento deste plano: `indicador` é `null` ou `{serie, ultimo (nullable), posicao (nullable), por_recorte?}`. O `perfil.indicadores` tem como chaves exatamente os ids do catálogo, com valores `null` ou `indicador`.
  - `montar_perfis(con, catalogo) -> dict[str, dict]`: todos os perfis em poucas consultas (nada de uma consulta por município). As posições saem de `rank() over (order by valor desc)` e `rank() over (partition by uf order by valor desc)` no último período do indicador.
  - `montar_ranking(con, indicador: str) -> list[dict]` devolve `[{cod, nome, uf, valor, posicao}]` em ordem decrescente.
  - `exportar(con, catalogo, saida: Path = SAIDA_DIR) -> None`: valida cada objeto contra o `$def` correspondente antes de gravar e levanta `jsonschema.ValidationError`. Grava num diretório temporário irmão e troca pelo `saida` no final, para que uma falha não deixe metade dos arquivos novos. JSON compacto, UTF-8, `ensure_ascii=False`. O `meta.json` traz `gerado_em` (ISO) e a tabela `cargas`.

- [ ] **Step 1: Teste que falha:** com um banco em memória de 3 municípios (2 em RS e 1 em SC):
  - `test_perfil_valido_no_schema`;
  - `test_indicador_sem_linhas_e_null`;
  - `test_sem_valor_no_ultimo_periodo_ultimo_null_serie_mantida` (Review Focus 4);
  - `test_posicoes_brasil_e_uf`;
  - `test_por_recorte_do_ultimo_periodo`;
  - `test_ranking_ordenado_sem_municipio_ausente`;
  - `test_falha_de_schema_nao_altera_saida` (com o catálogo adulterado para gerar uma unidade inválida, os arquivos anteriores em `saida` continuam intactos).
- [ ] **Steps 2–5:** rodar (FAIL), implementar, rodar (PASS) e commitar `"pipeline: schema e exportação JSON"`.

---

### Task 13: CLI `observatorio atualizar`

**Files:**
- Create: `pipeline/observatorio/cli.py`
- Test: `pipeline/tests/test_cli.py`

**Interfaces:**
- Consumes: todos os módulos de fonte, `calcular_derivados`, `validar`, `exportar`, `carregar_catalogo`.
- Produces:
  - `FONTES: dict[str, ModuleType]` em ordem, com `ibge_municipios` primeiro.
  - `atualizar(con, fontes: dict, so: str | None = None) -> int` devolve o código de saída. Para cada fonte (ou só `so`), chama `baixar()` e `carregar(con)` em `try`. Uma exceção é registrada no log com o nome da fonte e o loop segue. Depois rodam `calcular_derivados`, `validar` (com erros, registra cada um no log e devolve 1 sem exportar) e `exportar`, e a função devolve 0.
  - `main()`: `argparse` com o subcomando `atualizar` e `--fonte`. Configura `logging` no nível INFO.

- [ ] **Step 1: Teste que falha:**
  - `test_fonte_que_falha_nao_impede_as_outras` (Review Focus 5): fontes falsas, com uma levantando `URLError`, terminam com código 0, o JSON é exportado e a carga anterior da fonte que falhou continua em `fatos`;
  - `test_validacao_falha_retorna_1_sem_exportar`;
  - `test_so_roda_fonte_pedida`.
- [ ] **Steps 2–5:** rodar (FAIL), implementar, rodar (PASS) e commitar `"pipeline: CLI atualizar"`.

---

### Task 14: Execução real e primeira carga de dados

**Files:**
- Create: `web/public/dados/**` (saída)

- [ ] **Step 1:** `uv run observatorio atualizar`. Esperado: código 0, um log por fonte com a contagem de linhas e a contagem de descartados do CAGED.
- [ ] **Step 2: Conferência manual:**
  - `municipios.json` tem o mesmo número de entradas da API;
  - em `municipios/4314902.json`, a população de Porto Alegre fica entre 1,3 e 1,45 milhão, e o PIB per capita está entre 40 e 90 mil reais;
  - `rankings/pib_per_capita.json` tem município com `posicao` 1;
  - `meta.json` traz as 5 fontes.

  Se algum valor fugir do esperado, investigar antes de commitar.
- [ ] **Step 3:** `du -sh web/public/dados`. Esperado: abaixo de 150 MB. Se passar, registrar no plano web e reduzir a `serie` do CAGED nos perfis.
- [ ] **Step 4: Commit:** `git add web/public/dados && git commit -m "dados: primeira carga (IBGE + CAGED)"`

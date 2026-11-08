import json
import logging
import shutil
import time
import urllib.request
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)


def _abrir_padrao(url: str, timeout: int):
    req = urllib.request.Request(url, headers={"User-Agent": "observatorio-de-cidades/0.1"})
    return urllib.request.urlopen(req, timeout=timeout)


def baixar(url: str, destino: Path, *, abrir=_abrir_padrao, dormir=time.sleep,
           tentativas: int = 3, timeout: int = 60) -> Path:
    destino = Path(destino)
    if destino.exists() and destino.stat().st_size > 0:
        return destino
    destino.parent.mkdir(parents=True, exist_ok=True)
    parcial = destino.with_suffix(destino.suffix + ".parcial")
    for i in range(tentativas + 1):
        try:
            with abrir(url, timeout=timeout) as resp, open(parcial, "wb") as f:
                shutil.copyfileobj(resp, f)
            parcial.replace(destino)
            return destino
        except OSError as erro:
            parcial.unlink(missing_ok=True)
            if i == tentativas:
                raise
            log.warning("falha ao baixar %s (%s); nova tentativa em %ss", url, erro, 2**i)
            dormir(2**i)
    raise AssertionError("inalcançável")


def baixar_json(url: str, destino: Path, **kw) -> Any:
    return json.loads(baixar(url, destino, **kw).read_text(encoding="utf-8"))

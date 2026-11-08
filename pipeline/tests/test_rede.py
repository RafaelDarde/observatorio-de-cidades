import io
from urllib.error import URLError

import pytest

from observatorio.rede import baixar, baixar_json


def test_usa_cache_sem_abrir(tmp_path):
    arq = tmp_path / "a.json"
    arq.write_text("[1]")

    def abrir(*a, **k):
        raise AssertionError("não devia baixar")

    assert baixar_json("http://x", arq, abrir=abrir) == [1]


def test_retenta_com_espera_exponencial_e_depois_grava(tmp_path):
    chamadas, esperas = [], []

    def abrir(url, timeout):
        chamadas.append(url)
        if len(chamadas) < 3:
            raise URLError("fora")
        return io.BytesIO(b"ok")

    p = baixar("http://x", tmp_path / "f.bin", abrir=abrir, dormir=esperas.append)
    assert p.read_bytes() == b"ok" and esperas == [1, 2]


def test_esgota_tentativas_relanca_e_nao_deixa_cache(tmp_path):
    chamadas, esperas = [], []

    def abrir(url, timeout):
        chamadas.append(url)
        raise URLError("fora")

    with pytest.raises(URLError):
        baixar("http://x", tmp_path / "f.bin", abrir=abrir, dormir=esperas.append)
    assert not (tmp_path / "f.bin").exists()
    assert len(chamadas) == 4 and esperas == [1, 2, 4]

#!/usr/bin/env python3
"""Une data/raw/*.json en data/data.js (window.DATA) para el sitio estático."""
import json, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
BLOQUES = {
    "privada": "paises_privada.json",
    "publica": "paises_publica.json",
    "bigtech": "empresas_bigtech.json",
    "labs": "labs_startups.json",
    "unis": "universidades.json",
    "latam": "latam_peru.json",
    "inv": "inversionistas.json",
    "noti": "noticias.json",
    "cadena": "cadena_valor.json",
    "macro": "macro.json",
}

data = {"corte": "2026-10-11", "generado": datetime.date.today().isoformat()}
for clave, archivo in BLOQUES.items():
    ruta = RAW / archivo
    if ruta.exists():
        data[clave] = json.loads(ruta.read_text(encoding="utf-8"))
    else:
        print("falta", archivo)
        data[clave] = {}

salida = ROOT / "data" / "data.js"
salida.write_text("window.DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
print("ok", salida, salida.stat().st_size, "bytes")

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


def degradar(o):
    """Cifras vistas solo en el extracto del buscador (página con 403/paywall) bajan a nivel C."""
    if isinstance(o, dict):
        if o.get("verificacion") == "busqueda":
            o["nivel"] = "C"
        for v in o.values():
            degradar(v)
    elif isinstance(o, list):
        for v in o:
            degradar(v)


degradar(data)
# Proyección de Gartner: la nota original no se pudo abrir (403); fuera hasta verificarla.
if data["bigtech"].get("proyecciones"):
    data["bigtech"]["proyecciones"] = [x for x in data["bigtech"]["proyecciones"] if "Gartner" not in x.get("concepto", "")]
# Tipos de cambio declarados (spot del día de corte) para ordenar cifras en moneda local.
data["fx"] = data["publica"].get("meta", {}).get("tipos_de_cambio_usd", {})

salida = ROOT / "data" / "data.js"
salida.write_text("window.DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
print("ok", salida, salida.stat().st_size, "bytes")

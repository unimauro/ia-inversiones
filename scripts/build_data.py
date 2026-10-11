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


# ---------------------------------------------------------------------------
# Complementos: data/raw/extra_*.json rellena huecos sin tocar los originales.
# ---------------------------------------------------------------------------
def extra(nombre):
    ruta = RAW / nombre
    if not ruta.exists():
        return {}
    try:
        return json.loads(ruta.read_text(encoding="utf-8"))
    except Exception as e:  # un complemento roto no debe tumbar el build
        print("extra inválido", nombre, e)
        return {}


def clave(x, campos):
    return "|".join(str(x.get(c, "")).strip().lower() for c in campos)


def anexar(destino, nuevos, campos):
    """Agrega a la lista los ítems cuya clave no exista todavía."""
    vistos = {clave(x, campos) for x in destino}
    n = 0
    for x in nuevos or []:
        if isinstance(x, dict) and clave(x, campos) not in vistos:
            destino.append(x)
            vistos.add(clave(x, campos))
            n += 1
    return n


def tiene(o):
    return isinstance(o, dict) and (o.get("valor") is not None or o.get("valor_min") is not None)


def fusionar():
    log = {}
    # noticias
    e = extra("extra_noticias.json")
    if e and data["noti"]:
        d = data["noti"]
        log["noticias"] = anexar(d.setdefault("noticias", []), e.get("noticias"), ["empresa", "fecha", "operacion"])
        por = {clave(h, ["ciudad"]): h for h in d.setdefault("hubs", [])}
        for h in e.get("hubs") or []:
            k = clave(h, ["ciudad"])
            if k in por and not tiene(por[k].get("monto")):
                por[k].update(h)
            elif k not in por:
                d["hubs"].append(h)
        log["rentabilidad"] = anexar(d.setdefault("rentabilidad", []), e.get("rentabilidad"), ["empresa"])
        d.setdefault("meta", {}).setdefault("advertencias", []).extend(e.get("meta", {}).get("advertencias", []))
    # inversionistas
    e = extra("extra_inversionistas.json")
    if e and data["inv"]:
        d = data["inv"]
        log["fondos"] = anexar(d.setdefault("fondos", []), e.get("fondos"), ["nombre"])
        log["corporativos"] = anexar(d.setdefault("corporativos", []), e.get("corporativos"), ["inversor", "participada"])
        por = {clave(x, ["nombre"]): x for x in d.setdefault("personas", [])}
        for x in e.get("personas") or []:
            k = clave(x, ["nombre"])
            if k in por:
                if not tiene(por[k].get("patrimonio")) and tiene(x.get("patrimonio")):
                    por[k]["patrimonio"] = x["patrimonio"]
                anexar(por[k].setdefault("apuestas", []), [a for a in x.get("apuestas", []) if isinstance(a, dict)], ["concepto"])
            else:
                d["personas"].append(x)
        log["flujos"] = anexar(d.setdefault("flujos", []), e.get("flujos"), ["concepto", "periodo"])
        por = {clave(x, ["nombre"]): x for x in d["fondos"]}
        for x in e.get("aum_revalidados") or []:
            k = clave(x, ["nombre"])
            if k in por and tiene(x.get("aum")):
                por[k]["aum"] = x["aum"]
        d.setdefault("meta", {}).setdefault("advertencias", []).extend(e.get("meta", {}).get("advertencias", []))
    # universidades
    e = extra("extra_universidades.json")
    if e and data["unis"]:
        d = data["unis"]
        if len(e.get("conferencias") or []) >= 5:
            d["conferencias"] = e["conferencias"]  # conteo independiente reemplaza las cifras autodeclaradas
        log["inv_uni"] = anexar(d.setdefault("inversiones_universitarias", []), e.get("inversiones_universitarias"), ["universidad", "concepto"])
        for k in ("modelos_notables_pais", "modelos_notables_org", "citas_pais"):
            if e.get(k):
                d[k] = e[k]
        if e.get("peru_universidades") and data["latam"].get("peru") is not None:
            anexar(data["latam"]["peru"].setdefault("universidades", []), e["peru_universidades"], ["universidad", "programa"])
        d.setdefault("meta", {}).setdefault("advertencias", []).extend(e.get("meta", {}).get("advertencias", []))
    # cadena de valor
    e = extra("extra_cadena.json")
    if e and data["cadena"]:
        d = data["cadena"]
        en, ch = d.setdefault("energia", {}), d.setdefault("chips", {})
        por = {x.get("iso3"): x for x in en.setdefault("por_pais", [])}
        for x in e.get("por_pais") or []:
            if x.get("iso3") in por:
                for k, v in x.items():
                    if not tiene(por[x["iso3"]].get(k)) and (tiene(v) or k not in por[x["iso3"]]):
                        por[x["iso3"]][k] = v
            elif x.get("iso3"):
                en["por_pais"].append(x)
        anios = {str(x.get("anio")) for x in en.setdefault("serie_twh", [])}
        en["serie_twh"] += [x for x in e.get("serie_twh") or [] if str(x.get("anio")) not in anios and x.get("valor") is not None]
        en["serie_twh"].sort(key=lambda x: int(str(x.get("anio"))[:4]))
        nuevas = {clave(x, ["nombre"]) for x in e.get("fabricas") or []}
        ch["fabricas"] = [x for x in ch.get("fabricas", []) if clave(x, ["nombre"]) not in nuevas] + (e.get("fabricas") or [])
        anexar(d.setdefault("memorias", []), e.get("memorias"), ["concepto"])
        anexar(ch.setdefault("datos", []), e.get("chips_datos"), ["concepto"])
        anexar(en.setdefault("datos", []), e.get("agua"), ["concepto"])
        if e.get("alquiler_h100_historico"):
            d.setdefault("entrenamiento", {})["alquiler_historico"] = e["alquiler_h100_historico"]
        d.setdefault("meta", {}).setdefault("advertencias", []).extend(e.get("meta", {}).get("advertencias", []))
    # gasto público
    e = extra("extra_publica.json")
    if e and data["publica"]:
        d = data["publica"]
        por = {x.get("iso3"): x for x in d.setdefault("paises", [])}
        for x in e.get("paises") or []:
            y = por.get(x.get("iso3"))
            if y is None:
                if x.get("iso3"):
                    d["paises"].append(x)
                continue
            est = x.get("estrategia")
            vieja = y.get("estrategia") or {}
            # solo se reemplaza una estrategia que no tenía URL verificada
            if isinstance(est, dict) and est.get("nombre") and (not vieja.get("url") or vieja.get("url_abierta") is False):
                y["estrategia"] = est
            if tiene(x.get("publico_anual")) and not tiene(y.get("publico_anual")):
                y["publico_anual"] = x["publico_anual"]
            # mismo monto en el mismo país = mismo programa con otro nombre: no duplicar
            montos = {round(float(c.get("valor_original") or c.get("valor") or 0), 1) for c in y.get("compromisos") or []}
            anexar(y.setdefault("compromisos", []), [c for c in x.get("compromisos") or [] if round(float(c.get("valor_original") or c.get("valor") or 0), 1) not in montos
                                                         and not ("gigafactor" in c.get("nombre", "").lower() and any("gigafactor" in o.get("nombre", "").lower() for o in y.get("compromisos") or []))], ["nombre"])
        if e.get("ai_index_gasto_publico"):
            d["ai_index_gasto"] = e["ai_index_gasto_publico"]
        d.setdefault("meta", {}).setdefault("advertencias", []).extend(e.get("meta", {}).get("advertencias", []))
    # Perú y LATAM
    e = extra("extra_peru.json")
    if e and data["latam"]:
        d = data["latam"]
        pe, ep = d.setdefault("peru", {}), e.get("peru") or {}
        anexar(pe.setdefault("startups", []), ep.get("startups"), ["nombre"])
        anexar(pe.setdefault("anuncios", []), ep.get("anuncios"), ["empresa", "concepto"])
        anexar(pe.setdefault("indicadores", []), ep.get("indicadores"), ["indicador", "anio"])
        anexar(pe.setdefault("marco_legal", []), ep.get("marco_legal"), ["norma"])
        anexar(pe.setdefault("universidades", []), ep.get("universidades"), ["universidad", "programa"])
        por = {x.get("iso3"): x for x in d.setdefault("latam", [])}
        for x in e.get("latam") or []:
            y = por.get(x.get("iso3"))
            if y is None:
                continue
            if tiene(x.get("vc_ia")):
                y["vc_ia"] = x["vc_ia"]
            if tiene(x.get("publico")):
                y["publico"] = x["publico"]
            anexar(y.setdefault("anuncios", []), x.get("anuncios"), ["empresa", "concepto"])
        if e.get("startups_latam"):
            d["startups_latam"] = e["startups_latam"]
        d.setdefault("meta", {}).setdefault("advertencias", []).extend(e.get("meta", {}).get("advertencias", []))
    if log:
        print("complementos:", log)


fusionar()

def degradar(o):
    """Cifras vistas solo en el extracto del buscador (403/paywall) o tomadas de Wikipedia o agregadores bajan a nivel C."""
    if isinstance(o, dict):
        if o.get("verificacion") == "busqueda" or any(k in str(o.get("fuente", "")).lower() + str(o.get("url", "")).lower() for k in ("wikipedia", "aifunding.me")):
            o["nivel"] = "C"
        for v in o.values():
            degradar(v)
    elif isinstance(o, list):
        for v in o:
            degradar(v)


degradar(data)
# Filas de balance (saldos, flujos, compromisos globales) no son una participada: se marcan para no sumarlas.
for fila in data["inv"].get("corporativos", []):
    if any(k in fila.get("participada", "").lower() for k in ("saldo en balance", "flujo de caja", "compromisos de inversión pendientes", "método de participación")):
        fila["agregado"] = True
# Proyección de Gartner: la nota original no se pudo abrir (403); fuera hasta verificarla.
if data["bigtech"].get("proyecciones"):
    data["bigtech"]["proyecciones"] = [x for x in data["bigtech"]["proyecciones"] if "Gartner" not in x.get("concepto", "")]
# Tipos de cambio declarados (spot del día de corte) para ordenar cifras en moneda local.
data["fx"] = data["publica"].get("meta", {}).get("tipos_de_cambio_usd", {})

salida = ROOT / "data" / "data.js"
salida.write_text("window.DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
print("ok", salida, salida.stat().st_size, "bytes")

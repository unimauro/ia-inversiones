#!/usr/bin/env python3
"""Ranking de universidades por producción científica en IA, con datos abiertos de OpenAlex (CC0).

Misma filosofía que los rankings de Carlos Cárdenas (universidades-latam y universidades-peru):
bibliométrico, abierto y reproducible. Aquí se restringe al subcampo "Artificial Intelligence"
(OpenAlex subfield 1702), años 2021-2025.

Salida: data/raw/universidades_openalex.json
Uso:    python3 scripts/pull_openalex_ia.py [ruta a universidades-latam] [ruta a universidades-peru]
"""
import json, pathlib, sys, time, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
LATAM = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path.home() / "Documents/Repos/universidades-latam")
PERU = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else pathlib.Path.home() / "Documents/Repos/universidades-peru")
API = "https://api.openalex.org"
MAIL = "carlos@cardenas.pe"
BASE = "primary_topic.subfield.id:1702,publication_year:2021-2025"
TOP10 = ",cited_by_percentile_year.min:90"


def get(path, **params):
    params["mailto"] = MAIL
    url = f"{API}/{path}?" + urllib.parse.urlencode(params, safe=":,|-*")
    for intento in range(4):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                return json.load(r)
        except Exception as e:  # reintento simple ante 429/timeout
            time.sleep(2 + 3 * intento)
            err = e
    raise err


def grupos(filtro):
    """Las 200 instituciones con más trabajos (sin cursor: con cursor OpenAlex ordena por id, no por conteo)."""
    d = get("works", filter=filtro, group_by="authorships.institutions.id", **{"per-page": 200})
    return {g["key"].rsplit("/", 1)[-1]: (g["key_display_name"], g["count"]) for g in d.get("group_by", [])}


def conteo(oa, extra=""):
    """Trabajos de IA de una institución concreta (conteo exacto)."""
    time.sleep(0.11)
    return get("works", filter=BASE + extra + ",authorships.institutions.id:" + oa, **{"per-page": 1})["meta"]["count"]


def instituciones(ids):
    meta = {}
    ids = list(ids)
    for i in range(0, len(ids), 50):
        d = get("institutions", filter="openalex:" + "|".join(ids[i:i + 50]), select="id,display_name,country_code,type,geo", **{"per-page": 50})
        for x in d.get("results", []):
            g = x.get("geo") or {}
            meta[x["id"].rsplit("/", 1)[-1]] = {"nombre": x["display_name"], "cc": x.get("country_code"), "tipo": x.get("type"),
                                               "ciudad": g.get("city"), "lat": g.get("latitude"), "lon": g.get("longitude")}
    return meta


def tabla(todos, top10, meta, solo_educacion=True, limite=None):
    filas = []
    for k, (nombre, n) in todos.items():
        m = meta.get(k, {})
        if solo_educacion and m.get("tipo") != "education":
            continue
        filas.append({"oa": k, "nombre": m.get("nombre") or nombre, "cc": m.get("cc"), "ciudad": m.get("ciudad"), "lat": m.get("lat"), "lon": m.get("lon"),
                      "trabajos_ia": n, "top10_ia": top10.get(k, (None, 0))[1]})
    filas.sort(key=lambda f: -f["trabajos_ia"])
    for i, f in enumerate(filas, 1):
        f["puesto_ia"] = i
    return filas[:limite] if limite else filas


def main():
    out = {"meta": {
        "fuente": "OpenAlex (CC0)", "url": "https://api.openalex.org/works?filter=" + BASE + "&group_by=authorships.institutions.id",
        "consultado": time.strftime("%Y-%m-%d"),
        "metodo": "Trabajos cuyo tema principal pertenece al subcampo «Artificial Intelligence» de OpenAlex, publicados en 2021-2025, con al menos un autor afiliado a la universidad. La columna del 10% más citado cuenta los que están en ese tramo dentro de su año. Un trabajo cuenta para cada universidad coautora. En América Latina y España se evalúan las 300 primeras del ranking general; en el Perú, las 95 del observatorio.",
        "advertencias": [
            "Mide volumen e impacto de publicaciones en IA, no docencia ni empleabilidad.",
            "La clasificación temática es automática (OpenAlex): un trabajo cuenta si su tema principal cae en el subcampo de IA.",
            "Las citas de 2024-2025 aún están madurando; el top 10% se calcula dentro de cada año.",
        ]}}
    # --- mundo
    g_all, g_top = grupos(BASE), grupos(BASE + TOP10)
    meta = instituciones(set(g_all))
    out["mundo"] = tabla(g_all, g_top, meta, limite=100)
    for f in out["mundo"]:
        if f["oa"] not in g_top:
            f["top10_ia"] = conteo(f["oa"], TOP10)
    # --- LATAM + España (universo = ranking universidades-latam)
    lat = json.loads((LATAM / "data/universidades.json").read_text(encoding="utf-8"))
    unis = {u["oa"]: u for u in lat["unis"]}
    ccs = sorted({u["cc"].lower() for u in lat["unis"]})
    # candidatas: las 300 primeras del ranking general; conteo exacto una por una
    filas = []
    for u in sorted(lat["unis"], key=lambda u: u.get("rank") or 9999)[:300]:
        k = u["oa"]
        n = conteo(k)
        l_top = {k: (None, conteo(k, TOP10) if n else 0)}
        filas.append({"oa": k, "nombre": u["name"], "cc": u["cc"], "ciudad": u.get("city"), "lat": u.get("lat"), "lon": u.get("lng"), "region": u.get("region"),
                      "trabajos_ia": n, "top10_ia": l_top.get(k, (None, 0))[1],
                      "puesto_general": u.get("rank"), "score_general": u.get("score"), "h": u.get("h"), "q1_pct": u.get("q1_pct")})
    filas.sort(key=lambda x: -x["trabajos_ia"])
    for i, x in enumerate(filas, 1):
        x["puesto_ia"] = i
    out["latam_es"] = filas[:150]
    out["meta"]["latam_meta"] = {"n_universo": len(unis), "paises": len(ccs), "indice": lat["meta"].get("indice"), "extraido": lat["meta"].get("extraido"),
                                 "sitio": "https://unimauro.github.io/universidades-latam/"}
    # --- Perú (universo = ranking universidades-peru)
    pe = json.loads((PERU / "data/universidades.json").read_text(encoding="utf-8"))
    filas = []
    for u in pe["unis"]:
        i = u.get("rank")
        k = u["oa"].rsplit("/", 1)[-1]
        n = conteo(k)
        p_all, p_top = {k: (None, n)}, {k: (None, conteo(k, TOP10) if n else 0)}
        filas.append({"oa": k, "nombre": u["name"], "sigla": u.get("acron"), "tipo": u.get("tipo"), "ciudad": u.get("city"), "lat": u.get("lat"), "lon": u.get("lng"),
                      "trabajos_ia": p_all.get(k, (None, 0))[1], "top10_ia": p_top.get(k, (None, 0))[1],
                      "puesto_general": i, "score_general": u.get("score"), "h": u.get("h"), "q1_pct": u.get("q1_pct"), "trabajos_total": u.get("works"), "area_principal": u.get("area")})
    filas.sort(key=lambda x: -x["trabajos_ia"])
    for i, x in enumerate(filas, 1):
        x["puesto_ia"] = i
    out["peru"] = filas
    out["meta"]["peru_meta"] = {"n_universo": len(pe["unis"]), "extraido": pe["meta"].get("extraido"), "sitio": "https://unimauro.github.io/universidades-peru/"}
    dst = ROOT / "data/raw/universidades_openalex.json"
    dst.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("ok", dst, "mundo", len(out["mundo"]), "latam_es", len(out["latam_es"]), "peru", len(out["peru"]))


if __name__ == "__main__":
    main()

/* ============================================================================
   app2.js — noticias de capital, cadena de valor (energía, chips, memorias,
   entrenamiento, modelos de negocio), simulador de estrategia nacional y FAQ.
   Usa los ayudantes de app.js (window.IA).
   ============================================================================ */
(function () {
  "use strict";
  var D = window.DATA || {}, IA = window.IA;
  if (!IA) return;
  var N = D.noti || {}, K = D.cadena || {}, M = (D.macro || {}).paises || {};
  var $ = function (id) { return document.getElementById(id); };
  var arr = function (x) { return Array.isArray(x) ? x : []; };
  var num = IA.num, fmt = IA.fmt, money = IA.money, unitOf = IA.unitOf, when = IA.when, toBn = IA.toBn, norm = IA.norm, esc = IA.esc, nombre = IA.nombre;
  var table = IA.table, hbar = IA.hbar, fig = IA.fig, link = IA.link, note = IA.note, lv = IA.lv, mk = IA.mk, pal = IA.pal;
  var MUT = '<span class="mut">—</span>';

  // valor absoluto en US$ a partir de la unidad declarada
  function usd(o) {
    var n = num(o); if (n == null) return null;
    var u = norm(unitOf(o));
    if (/miles de millones|billion|\bbn\b/.test(u)) return n * 1e9;
    if (/millones|million|\bmm\b/.test(u)) return n * 1e6;
    if (/\bmiles\b|thousand/.test(u)) return n * 1e3;
    return n;
  }
  function usdTxt(v) {
    if (v == null) return "—"; var a = Math.abs(v);
    if (a >= 1e12) return "US$ " + fmt(v / 1e12) + " billones";
    if (a >= 1e9) return "US$ " + fmt(v / 1e9) + " mil M";
    if (a >= 1e6) return "US$ " + fmt(v / 1e6) + " M";
    if (a >= 1e3) return "US$ " + fmt(v / 1e3, 0) + " mil";
    return "US$ " + fmt(v);
  }
  function isUsd(o) { return /usd|us\$/i.test(unitOf(o)); }
  // cifra genérica: dinero si la unidad es USD "grande", si no valor + unidad
  function cif(o, opts) {
    if (num(o) == null) return MUT;
    var u = norm(unitOf(o)), big = isUsd(o) && /millones|billion|million|\bbn\b/.test(u);
    var rng = (num(o.min) != null && num(o.max) != null) ? ' <span class="mut">[' + fmt(num(o.min)) + "–" + fmt(num(o.max)) + "]</span>" : "";
    return fig(o, Object.assign({ raw: !big }, opts || {})) + rng;
  }
  function datosTable(id, rows, o) {
    if (!$(id)) return;
    if (!rows.length) { $(id).style.display = "none"; return; }
    table(id, [
      { t: (o && o.t) || "Concepto", h: function (r) { return esc(r.concepto || r.nombre || "") + (r.nota ? '<br><span class="mut">' + esc(r.nota) + "</span>" : ""); }, cls: "wide" },
      { t: "Valor", num: true, h: function (r) { return cif(r); } }
    ], rows);
  }

  // ---- NOTICIAS ------------------------------------------------------------
  var fam = "";
  function fecha(s) {
    var m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(String(s || "")); if (!m) return esc(s || "");
    var ms = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return (m[3] ? +m[3] + " " : "") + ms[+m[2] - 1] + " " + m[1];
  }
  function feed() {
    var q = norm($("qNoti").value);
    var ns = arr(N.noticias).filter(function (n) {
      return (!fam || n.familia === fam) && (!q || norm([n.empresa, n.inversores, n.ciudad, n.subcategoria, n.titular, nombre(n.pais_iso3)].join(" ")).indexOf(q) >= 0);
    }).sort(function (a, b) { return String(b.fecha).localeCompare(String(a.fecha)); });
    $("feed").innerHTML = ns.map(function (n) {
      return '<div class="nw"><div class="dt">' + fecha(n.fecha) + '</div><div><div class="hd">' + link(n.titular || n.empresa, n.url) + '</div><div class="mt">' +
        '<span class="tag t-' + esc(n.familia || "") + '">' + esc(n.familia || "") + (n.subcategoria ? " · " + esc(n.subcategoria) : "") + "</span> " +
        "<b>" + esc(n.empresa || "") + "</b> · " + esc((n.ciudad ? n.ciudad + ", " : "") + nombre(n.pais_iso3)) + (n.operacion ? " · " + esc(n.operacion) : "") +
        (n.inversores ? '<br>Inversores: ' + esc(n.inversores) : "") + (n.fuente ? ' <span class="mut">· ' + esc(n.fuente) + "</span>" : "") + "</div></div>" +
        '<div class="amt">' + (num(n.monto) != null ? esc(money(num(n.monto), unitOf(n.monto))) : "") + (num(n.valoracion) != null ? "<small>valoración " + esc(money(num(n.valoracion), unitOf(n.valoracion))) + "</small>" : "") + "</div></div>";
    }).join("") || '<p class="empty">Sin resultados.</p>';
    var tot = 0; ns.forEach(function (n) { if (num(n.monto) != null && isUsd(n.monto)) tot += toBn(n.monto); });
    note("nFeed", ns.length + " operaciones" + (tot ? " · " + esc(money(tot, "USD miles de millones")) + " en montos reportados (incluye deuda y adquisiciones)" : "") + ".");
  }
  function noticias() {
    var fams = {}; arr(N.noticias).forEach(function (n) { if (n.familia) fams[n.familia] = (fams[n.familia] || 0) + 1; });
    var seg = $("segNoti");
    seg.innerHTML = [["", "Todas"]].concat(Object.keys(fams).sort().map(function (f) { return [f, f.charAt(0).toUpperCase() + f.slice(1) + " (" + fams[f] + ")"]; }))
      .map(function (f) { return '<button role="tab" data-id="' + esc(f[0]) + '" aria-selected="' + (f[0] === fam) + '">' + esc(f[1]) + "</button>"; }).join("");
    seg.onclick = function (e) { var b = e.target.closest("button"); if (!b) return; fam = b.getAttribute("data-id"); Array.prototype.forEach.call(seg.children, function (x) { x.setAttribute("aria-selected", x === b ? "true" : "false"); }); feed(); };
    $("qNoti").oninput = feed; feed();

    var hs = arr(N.hubs).filter(function (h) { return num(h.monto) != null; }).sort(function (a, b) { return toBn(b.monto) - toBn(a.monto); });
    hbar("cHubs", hs.slice(0, 15).map(function (h) { return { name: h.ciudad, value: toBn(h.monto), extra: nombre(h.pais_iso3) + " · " + when(h.monto) + (num(h.pct_mundial) != null ? " · " + fmt(num(h.pct_mundial)) + "% del mundo" : "") }; }), { color: 3, fmt: function (v) { return money(v, "USD miles de millones"); }, short: function (v) { return fmt(v); } });
    note("nHubs", hs.length ? "Capital levantado por empresas de IA con sede en cada ciudad, miles de millones de US$. " + IA.srcNote(hs[0].monto, "Actívalo también en el mapa («Dónde se levanta capital»).") : "");
    datosTable("tInstr", arr(N.instrumentos));
    if (arr(N.bolsas).length) table("tBolsas", [
      { t: "Salida a bolsa", v: function (r) { return r.empresa; }, h: function (r) { return "<b>" + link(r.empresa, r.url) + "</b>"; }, asc: true },
      { t: "Bolsa", v: function (r) { return r.bolsa || ""; }, h: function (r) { return esc(r.bolsa || ""); }, asc: true },
      { t: "Fecha", v: function (r) { return String(r.fecha || ""); }, h: function (r) { return fecha(r.fecha); } },
      { t: "Recaudado", num: true, v: function (r) { return toBn(r.recaudado); }, h: function (r) { return num(r.recaudado) != null ? "<b>" + esc(money(num(r.recaudado), unitOf(r.recaudado))) + "</b>" : MUT; } },
      { t: "Valoración", num: true, v: function (r) { return toBn(r.valoracion_salida); }, h: function (r) { return num(r.valoracion_salida) != null ? esc(money(num(r.valoracion_salida), unitOf(r.valoracion_salida))) : MUT; } }
    ], arr(N.bolsas), { sort: 2 }); else $("tBolsas").style.display = "none";

    table("tRent", [
      { t: "Empresa", v: function (r) { return r.empresa; }, h: function (r) { return "<b>" + esc(r.empresa) + "</b>" + (r.nota ? '<br><span class="mut">' + esc(r.nota) + "</span>" : ""); }, cls: "wide", asc: true },
      { t: "Periodo", h: function (r) { return esc(r.periodo || ""); } },
      { t: "Ingresos", num: true, v: function (r) { return toBn(r.ingresos); }, h: function (r) { return num(r.ingresos) != null ? "<b>" + esc(money(num(r.ingresos), unitOf(r.ingresos))) + "</b>" + (r.ingresos.tipo ? '<br><span class="mut">' + esc(r.ingresos.tipo) + "</span>" : "") : MUT; } },
      { t: "Margen bruto", num: true, v: function (r) { return num(r.margen_bruto_pct); }, h: function (r) { return num(r.margen_bruto_pct) != null ? fmt(num(r.margen_bruto_pct), 0) + "%" : MUT; } },
      { t: "Resultado", num: true, v: function (r) { return toBn(r.resultado); }, h: function (r) { var v = num(r.resultado); return v != null ? "<b>" + (v < 0 ? "−" : "+") + esc(money(Math.abs(v), unitOf(r.resultado))) + "</b>" + (r.resultado.tipo ? '<br><span class="mut">' + esc(String(r.resultado.tipo).replace(/_/g, " ")) + "</span>" : "") : MUT; } },
      { t: "¿Rentable?", v: function (r) { return r.rentable === true ? 1 : r.rentable === false ? 0 : null; }, h: function (r) { return r.rentable === true ? '<span class="tag ok">▲ sí</span>' : r.rentable === false ? '<span class="tag ko">▼ no</span>' : MUT; } },
      { t: "Fuente", h: function (r) { return lv(r) || link("ver", r.url); } }
    ], arr(N.rentabilidad), { sort: 2, rank: true });
    if (!arr(N.contexto_retorno).length) $("cardRetorno").style.display = "none"; else datosTable("tRetorno", arr(N.contexto_retorno));
  }

  // ---- CADENA DE VALOR -----------------------------------------------------
  function cadena() {
    var p = pal(), E = K.energia || {}, CH = K.chips || {}, T = K.entrenamiento || {};
    var st = arr(E.serie_twh).filter(function (r) { return num(r) != null; });
    if (!st.length) IA.noData("cTwh"); else {
      mk("cTwh").setOption({
        grid: { left: 8, right: 16, top: 28, bottom: 8, containLabel: true },
        tooltip: Object.assign(IA.tipBase(p), { trigger: "axis", axisPointer: { type: "shadow" }, formatter: function (a) { var r = st[a[0].dataIndex]; return "<b>" + esc(r.anio) + (r.proyeccion ? " (proyección)" : "") + "</b><br>" + fmt(num(r)) + " TWh"; } }),
        xAxis: IA.axisCat(p, st.map(function (r) { return r.anio + (r.proyeccion ? "p" : ""); })), yAxis: IA.axisVal(p),
        series: [{ type: "bar", barMaxWidth: 34, data: st.map(function (r) { return { value: num(r), itemStyle: { color: p.s[3], opacity: r.proyeccion ? .5 : 1, borderRadius: [4, 4, 0, 0] } }; }),
          label: { show: true, position: "top", color: p.ink2, fontSize: 11.5, formatter: function (x) { return fmt(x.value, 0); } } }]
      });
      note("nTwh", "TWh por año en todo el mundo. Barras tenues: proyección (año con «p»). Fuente: " + link(E.serie_fuente || "ver", E.serie_url) + ".");
    }
    var pp = arr(E.por_pais);
    var metric = [["capacidad_mw", "Capacidad instalada de centros de datos", "MW"], ["consumo_twh", "Consumo eléctrico de centros de datos", "TWh"], ["n_centros", "Número de centros de datos", ""]]
      .map(function (d) { return { k: d[0], t: d[1], u: d[2], n: pp.filter(function (r) { return num(r[d[0]]) != null; }).length }; }).sort(function (a, b) { return b.n - a.n; })[0];
    if (metric && metric.n) {
      var rs = pp.filter(function (r) { return num(r[metric.k]) != null; }).sort(function (a, b) { return num(b[metric.k]) - num(a[metric.k]); });
      hbar("cEnPais", rs.slice(0, 15).map(function (r) { return { name: nombre(r.iso3), value: num(r[metric.k]), extra: num(r.pct_demanda) != null ? fmt(num(r.pct_demanda)) + "% de la demanda eléctrica nacional" : "" }; }), { color: 3, fmt: function (v) { return fmt(v) + " " + (unitOf(rs[0][metric.k]) || metric.u); } });
      $("tEnPais").textContent = metric.t; note("nEnPais", esc(unitOf(rs[0][metric.k]) || metric.u) + ", " + esc(when(rs[0][metric.k])) + ". " + IA.srcNote(rs[0][metric.k]));
    } else IA.noData("cEnPais");
    table("tAcuerdos", [
      { t: "Comprador", v: function (r) { return r.comprador; }, h: function (r) { return "<b>" + esc(r.comprador) + "</b>"; }, asc: true },
      { t: "Proveedor", h: function (r) { return link(r.proveedor || "", r.url) + (r.nota ? '<br><span class="mut">' + esc(r.nota) + "</span>" : ""); }, cls: "wide" },
      { t: "Tipo", v: function (r) { return r.tipo || ""; }, h: function (r) { return r.tipo ? '<span class="tag">' + esc(r.tipo) + "</span>" : ""; }, asc: true },
      { t: "Capacidad", num: true, v: function (r) { return num(r.capacidad_mw); }, h: function (r) { return num(r.capacidad_mw) != null ? fmt(num(r.capacidad_mw), 0) + " MW" : MUT; } },
      { t: "Fecha", h: function (r) { return esc(r.fecha || ""); } }
    ], arr(E.acuerdos), { sort: 3 });
    datosTable("tDC", arr(K.centros_datos).concat(arr(E.datos)));

    var nv = arr(CH.nvidia_dc_trimestral).filter(function (r) { return num(r) != null; });
    if (!nv.length) IA.noData("cNvda"); else {
      mk("cNvda").setOption({
        grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
        tooltip: Object.assign(IA.tipBase(p), { trigger: "axis", axisPointer: { type: "shadow" }, formatter: function (a) { var r = nv[a[0].dataIndex]; return "<b>" + esc(r.periodo) + "</b>" + (r.cierre ? " · cierre " + esc(r.cierre) : "") + "<br>" + money(num(r), "USD miles de millones"); } }),
        xAxis: IA.axisCat(p, nv.map(function (r) { return String(r.periodo).replace("FY", "").replace("-Q", " T"); }), { axisLabel: { color: p.ink2, fontSize: 10.5, rotate: 40 } }), yAxis: IA.axisVal(p),
        series: [{ type: "bar", barMaxWidth: 26, data: nv.map(num), itemStyle: { color: p.s[2], borderRadius: [4, 4, 0, 0] } }]
      });
      note("nNvda", "Miles de millones de US$ por trimestre fiscal de Nvidia (su año fiscal cierra en enero). Fuente: " + link(CH.nvidia_fuente || "Nvidia", CH.nvidia_url) + ".");
    }
    table("tAcel", [
      { t: "Acelerador", v: function (r) { return r.nombre; }, h: function (r) { return "<b>" + link(r.nombre, r.url) + "</b>" + (r.nota ? '<br><span class="mut">' + esc(r.nota) + "</span>" : ""); }, cls: "wide", asc: true },
      { t: "Precio", num: true, v: function (r) { return usd(r.precio); }, h: function (r) { return num(r.precio) != null ? "<b>" + esc(usdTxt(usd(r.precio))) + "</b>" + (/rack|sistema|servidor/i.test(unitOf(r.precio)) ? '<br><span class="mut">' + esc(unitOf(r.precio)) + "</span>" : "") + lv(r.precio) : MUT; } },
      { t: "Potencia", num: true, v: function (r) { return num(r.potencia_kw); }, h: function (r) { return num(r.potencia_kw) != null ? fmt(num(r.potencia_kw)) + " kW" : MUT; } },
      { t: "Año", num: true, v: function (r) { return num(r.lanzamiento); }, h: function (r) { return esc(r.lanzamiento || ""); } }
    ], arr(CH.aceleradores), { sort: 3 });
    table("tFabs", [
      { t: "Fábrica", v: function (r) { return r.nombre; }, h: function (r) { return "<b>" + link(r.nombre, r.url) + "</b>" + (r.estado ? '<br><span class="mut">' + esc(r.estado) + "</span>" : ""); }, cls: "wide", asc: true },
      { t: "Ubicación", v: function (r) { return nombre(r.pais_iso3); }, h: function (r) { return esc(r.lugar || "") + '<br><span class="mut">' + esc(nombre(r.pais_iso3)) + "</span>"; }, asc: true },
      { t: "Inversión", num: true, v: function (r) { return toBn(r.inversion); }, h: function (r) { return fig(r.inversion, { noWhen: true }); } },
      { t: "Subsidio público", num: true, v: function (r) { return toBn(r.subsidio); }, h: function (r) { return fig(r.subsidio, { noWhen: true }); } },
      { t: "Nodo", h: function (r) { return esc(r.nodo || ""); } }
    ], arr(CH.fabricas), { sort: 2, rank: true });
    datosTable("tChipDatos", arr(CH.obleas).map(function (o) { return Object.assign({ concepto: "Oblea TSMC " + o.nodo }, o.precio || {}); }).concat(arr(CH.datos)));
    datosTable("tMem", arr(K.memorias));

    var cm = arr(T.costos_modelos).filter(function (r) { return num(r.costo) != null; }).sort(function (a, b) { return usd(b.costo) - usd(a.costo); });
    hbar("cTrain", cm.slice(0, 15).map(function (r) { return { name: r.modelo + (r.anio ? " (" + r.anio + ")" : ""), value: Math.round(usd(r.costo) / 1e4) / 100, extra: (r.organizacion || "") + (r.nota ? " · " + r.nota : "") }; }), { color: 4, fmt: function (v) { return money(v, "USD millones"); }, short: function (v) { return fmt(v); } });
    note("nTrain", cm.length ? "Millones de US$, costo estimado de cómputo del entrenamiento final (no incluye salarios ni experimentos fallidos). " + IA.srcNote(cm[0].costo) : "");
    table("tGpuHora", [
      { t: "GPU en alquiler", v: function (r) { return r.gpu; }, h: function (r) { return "<b>" + esc(r.gpu) + "</b>"; }, asc: true },
      { t: "Proveedor", v: function (r) { return r.proveedor || ""; }, h: function (r) { return esc(r.proveedor || ""); }, asc: true },
      { t: "US$ / hora", num: true, v: function (r) { return num(r.precio_hora); }, h: function (r) { return num(r.precio_hora) != null ? "<b>" + fmt(num(r.precio_hora)) + "</b>" + lv(r.precio_hora) : MUT; }, asc: true },
      { t: "Fecha", h: function (r) { return esc(r.fecha || (r.precio_hora && when(r.precio_hora)) || ""); } }
    ], arr(T.alquiler_gpu), { sort: 2, dir: 1 });
    table("tApi", [
      { t: "Modelo (API)", v: function (r) { return r.modelo; }, h: function (r) { return "<b>" + link(r.modelo, r.url) + "</b>"; }, asc: true },
      { t: "Proveedor", v: function (r) { return r.proveedor || ""; }, h: function (r) { return esc(r.proveedor || ""); }, asc: true },
      { t: "Entrada", num: true, tip: "US$ por millón de tokens de entrada", v: function (r) { return num(r.entrada); }, h: function (r) { return num(r.entrada) != null ? "US$ " + fmt(num(r.entrada)) : MUT; } },
      { t: "Salida", num: true, tip: "US$ por millón de tokens de salida", v: function (r) { return num(r.salida); }, h: function (r) { return num(r.salida) != null ? "US$ " + fmt(num(r.salida)) : MUT; } }
    ], arr(T.precios_api), { sort: 3 });
    table("tClusters", [
      { t: "Clúster", v: function (r) { return r.nombre; }, h: function (r) { return "<b>" + link(r.nombre, r.url) + "</b><br><span class=\"mut\">" + esc((r.operador ? r.operador + " · " : "") + nombre(r.pais_iso3)) + "</span>"; }, cls: "wide", asc: true },
      { t: "GPU", num: true, v: function (r) { return num(r.gpus); }, h: function (r) { return num(r.gpus) != null ? fmt(num(r.gpus), 0) : MUT; } },
      { t: "Potencia", num: true, v: function (r) { return num(r.potencia_mw); }, h: function (r) { return num(r.potencia_mw) != null ? fmt(num(r.potencia_mw), 0) + " MW" : MUT; } }
    ], arr(T.clusteres), { sort: 1, rank: true });
    datosTable("tTrainDatos", arr(T.datos).concat(arr(CH.controles).map(function (c) { return { concepto: "Control de exportación (" + (c.fecha || "") + "): " + c.resumen, valor: null, url: c.url, fuente: c.fuente }; })));
    // los controles no tienen valor numérico: se muestran como texto con enlace
    var tc = $("tTrainDatos"); if (tc && arr(CH.controles).length) Array.prototype.forEach.call(tc.querySelectorAll("tr"), function (tr, i) {
      var rows = arr(T.datos).length; if (i > rows) { var c = CH.controles[i - rows - 1]; if (c) tr.lastChild.innerHTML = link("fuente", c.url); }
    });

    $("biz").innerHTML = arr(K.modelos_negocio).map(function (b) {
      return '<div class="bz"><span class="tag">' + esc(b.capa || "") + "</span><h4>" + esc(b.esquema) + "</h4><p>" + esc(b.como_cobra || "") + "</p>" +
        (arr(b.ejemplos).length ? '<p class="mut" style="color:var(--muted)">' + esc(b.ejemplos.join(" · ")) + "</p>" : "") +
        (b.precio_referencia && (num(b.precio_referencia) != null || b.precio_referencia.texto) ? '<div class="pr">Referencia: ' + (num(b.precio_referencia) != null ? cif(b.precio_referencia) : esc(b.precio_referencia.texto) + lv(b.precio_referencia)) + "</div>" : "") +
        (num(b.margen_bruto) != null ? '<div class="pr">Margen bruto: <b>' + fmt(num(b.margen_bruto), 0) + "%</b>" + lv(b.margen_bruto) + "</div>" : "") +
        (b.riesgo ? '<div class="rk">Riesgo: ' + esc(b.riesgo) + "</div>" : "") + "</div>";
    }).join("") || '<p class="empty">Sin datos.</p>';
  }

  // ---- SIMULADOR -----------------------------------------------------------
  var SIM = K.simulador || {}, PAR = {};
  arr(SIM.parametros).forEach(function (q) { if (q.clave && num(q) != null) PAR[q.clave] = q; });
  function par(k) { return PAR[k] ? (/kw|pue|vida|anios/.test(k) ? num(PAR[k]) : usd(PAR[k])) : null; }
  var PILARES = [
    { k: "propio", t: "Cómputo propio", d: "Centro de datos y GPU del país" },
    { k: "alquiler", t: "Cómputo alquilado", d: "GPU por hora en la nube" },
    { k: "talento", t: "Talento", d: "Investigadores y doctorados" },
    { k: "startups", t: "Fondo de startups", d: "Capital para empresas locales" }
  ];
  var PRESETS = [
    { id: "eq", t: "Equilibrada", w: [25, 25, 25, 25], d: "Reparte por igual: sirve para ver el orden de magnitud de cada pilar." },
    { id: "sob", t: "Soberanía de cómputo", w: [60, 5, 20, 15], d: "Construir capacidad propia, al estilo de los países del Golfo o las «gigafábricas» europeas. Mucho capital fijo y dependencia del suministro de chips y de la red eléctrica." },
    { id: "adop", t: "Adoptador rápido", w: [0, 45, 35, 20], d: "No construye: alquila cómputo y concentra el esfuerzo en usar la IA en el Estado y las empresas. Bajo capital fijo, pero el gasto es recurrente y en el exterior." },
    { id: "tal", t: "Talento primero", w: [10, 15, 60, 15], d: "Formar y retener investigadores, como hicieron Canadá o Corea. Rinde a largo plazo; el riesgo es la fuga de talento." },
    { id: "hub", t: "Hub de startups", w: [5, 20, 20, 55], d: "Capital público como ancla para atraer fondos privados, al estilo de Francia o Israel. Depende de que exista un ecosistema que lo absorba." }
  ];
  var sim = { iso: "PER", w: PRESETS[0].w.slice(), preset: "eq" };
  // escala logarítmica del deslizador: 0.005% … 2% del PIB
  function pctOf(v) { return 0.005 * Math.pow(400, v / 100); }
  function simKwh(iso) { var r = arr((K.energia || {}).por_pais).filter(function (x) { return x.iso3 === iso; })[0]; return r && num(r.precio_kwh) != null ? r.precio_kwh : null; }
  function simInit() {
    var isos = Object.keys(M).sort(function (a, b) { return nombre(a).localeCompare(nombre(b), "es"); });
    if (!isos.length) { $("simulador").style.display = "none"; return false; }
    if (!M[sim.iso]) sim.iso = isos[0];
    $("simPais").innerHTML = isos.map(function (i) { return '<option value="' + i + '"' + (i === sim.iso ? " selected" : "") + ">" + esc(nombre(i)) + "</option>"; }).join("");
    $("simPais").onchange = function () { sim.iso = this.value; simDraw(); };
    $("simPct").oninput = simDraw; $("simAnios").oninput = simDraw;
    $("simPresets").innerHTML = PRESETS.map(function (q) { return '<button data-id="' + q.id + '" aria-selected="' + (q.id === sim.preset) + '">' + esc(q.t) + "</button>"; }).join("");
    $("simPresets").onclick = function (e) { var b = e.target.closest("button"); if (!b) return; var q = PRESETS.filter(function (x) { return x.id === b.getAttribute("data-id"); })[0]; sim.preset = q.id; sim.w = q.w.slice(); simSliders(); simDraw(); };
    simSliders();
    return true;
  }
  function simSliders() {
    Array.prototype.forEach.call($("simPresets").children, function (b) { b.setAttribute("aria-selected", b.getAttribute("data-id") === sim.preset ? "true" : "false"); });
    var q = PRESETS.filter(function (x) { return x.id === sim.preset; })[0];
    note("simPresetDesc", q ? esc(q.d) : "Reparto personalizado.");
    $("simSliders").innerHTML = PILARES.map(function (pl, i) {
      return '<div class="sl"><div class="row"><span><b>' + esc(pl.t) + "</b> · " + esc(pl.d) + '</span><b id="simW' + i + '"></b></div><input type="range" min="0" max="100" step="5" value="' + sim.w[i] + '" data-i="' + i + '" aria-label="' + esc(pl.t) + '"></div>';
    }).join("");
    Array.prototype.forEach.call($("simSliders").querySelectorAll("input"), function (inp) {
      inp.oninput = function () { sim.w[+inp.getAttribute("data-i")] = +inp.value; sim.preset = ""; Array.prototype.forEach.call($("simPresets").children, function (b) { b.setAttribute("aria-selected", "false"); }); note("simPresetDesc", "Reparto personalizado."); simDraw(); };
    });
  }
  function li(a) { return a.filter(Boolean).map(function (x) { return "<li>" + x + "</li>"; }).join(""); }
  function simDraw() {
    var m = M[sim.iso]; if (!m) return;
    var pct = pctOf(+$("simPct").value), anios = +$("simAnios").value;
    var anual = m.pib * 1e9 * pct / 100, total = anual * anios;
    var sum = sim.w.reduce(function (a, b) { return a + b; }, 0) || 1, sh = sim.w.map(function (x) { return x / sum; });
    $("simPctV").textContent = fmt(pct, pct < 0.1 ? 3 : 2) + "%"; $("simAniosV").textContent = anios + (anios === 1 ? " año" : " años");
    PILARES.forEach(function (pl, i) { $("simW" + i).textContent = fmt(sh[i] * 100, 0) + "%"; });
    var x = IA.C[sim.iso] || { idx: {} };
    $("simCtx").innerHTML = "PIB: <b>" + esc(usdTxt(m.pib * 1e9)) + "</b> (" + m.pib_anio + ")" + (m.pob ? " · Población: <b>" + fmt(m.pob) + " M</b>" : "") +
      (m.gerd != null ? "<br>I+D total hoy: <b>" + fmt(m.gerd) + "% del PIB</b> (" + m.gerd_anio + ")" : "") +
      (num(x.priv) != null ? "<br>Inversión privada en IA: <b>" + esc(money(num(x.priv), unitOf(x.priv))) + "</b> (" + esc(when(x.priv)) + ")" : "") +
      (x.estrategia && x.estrategia.nombre ? "<br>Estrategia: " + esc(x.estrategia.nombre) : "");
    $("simKpis").innerHTML = [
      { lab: "Presupuesto anual", val: usdTxt(anual), ctx: fmt(pct, pct < 0.1 ? 3 : 2) + "% del PIB de " + nombre(sim.iso) },
      { lab: "Total en " + anios + (anios === 1 ? " año" : " años"), val: usdTxt(total), ctx: m.pob ? "US$ " + fmt(anual / (m.pob * 1e6)) + " por habitante al año" : "" },
      m.gerd != null ? { lab: "Frente a la I+D actual del país", val: fmt(pct / m.gerd * 100, 0) + "%", ctx: "de lo que hoy gasta en toda su I+D" } : null
    ].filter(Boolean).map(function (k) { return '<div class="kpi"><div class="lab">' + esc(k.lab) + '</div><div class="val">' + esc(k.val) + '</div><div class="ctx">' + esc(k.ctx) + "</div></div>"; }).join("");

    var out = [], b;
    // 1. cómputo propio
    b = total * sh[0];
    var capMw = par("capex_por_mw"), kwGpu = par("kw_por_gpu"), pue = par("pue") || 1, pGpu = par("precio_gpu"), vida = par("vida_util_gpu_anios");
    if (b > 0) {
      var mw = capMw ? b / capMw : null, gpus = (mw != null && kwGpu) ? mw * 1000 / (kwGpu * pue) : (pGpu ? b / pGpu : null);
      var kwh = simKwh(sim.iso), twh = mw != null ? mw * 8760 / 1e6 : null;
      out.push('<div class="sr"><h4>Cómputo propio · ' + esc(usdTxt(b)) + '</h4><div class="big">' + (mw != null ? fmt(mw) + " MW" : gpus != null ? fmt(gpus, 0) + " GPU" : "—") + "</div><ul>" + li([
        gpus != null && mw != null ? "≈ <b>" + fmt(gpus, 0) + " GPU</b> de gama alta instaladas" : null,
        twh != null ? "Consumiría hasta <b>" + fmt(twh) + " TWh</b> al año a plena carga" : null,
        twh != null && kwh ? "Factura eléctrica: <b>" + esc(usdTxt(twh * 1e9 * num(kwh))) + "</b> al año (a US$ " + fmt(num(kwh), 3) + "/kWh)" : null,
        vida ? "Las GPU se deprecian en ~" + fmt(vida) + " años: hay que reinvertir" : null,
        refSuper(gpus)
      ]) + "</ul></div>");
    }
    // 2. alquiler
    b = total * sh[1];
    var hr = par("alquiler_gpu_hora"), fr = par("costo_entrenar_frontera"), af = par("costo_afinar_modelo_abierto");
    if (b > 0) {
      var horas = hr ? b / hr : null, eq = horas != null ? horas / (8760 * anios) : null;
      out.push('<div class="sr"><h4>Cómputo alquilado · ' + esc(usdTxt(b)) + '</h4><div class="big">' + (horas != null ? fmt(horas / 1e6) + " M GPU-hora" : "—") + "</div><ul>" + li([
        eq != null ? "Equivale a <b>" + fmt(eq, 0) + " GPU</b> encendidas todo el periodo" : null,
        fr ? "Alcanza para <b>" + fmt(b / fr, b / fr < 10 ? 1 : 0) + "</b> entrenamientos de un modelo frontera" : null,
        af ? "o <b>" + fmt(b / af, 0) + "</b> afinamientos de un modelo abierto" : null,
        "Sin capital fijo, pero el gasto es recurrente"
      ]) + "</ul></div>");
    }
    // 3. talento
    b = total * sh[2];
    var sal = par("salario_investigador_latam"), salUsa = par("salario_investigador_usa"), beca = par("beca_doctorado_anual");
    var latam = (IA.BLOQUES.filter(function (q) { return q.id === "latam"; })[0] || { isos: [] }).isos.indexOf(sim.iso) >= 0;
    var s0 = latam && sal ? sal : (salUsa || sal);
    if (b > 0) {
      out.push('<div class="sr"><h4>Talento · ' + esc(usdTxt(b)) + '</h4><div class="big">' + (s0 ? fmt(b / s0 / anios, 0) + " investigadores" : "—") + "</div><ul>" + li([
        s0 ? "contratados durante " + anios + (anios === 1 ? " año" : " años") + " a US$ " + fmt(s0, 0) + " al año" + (latam && sal ? " (referencia regional)" : " (referencia de EE.UU.)") : null,
        beca ? "o <b>" + fmt(b / (beca * 4), 0) + "</b> doctorados completos (4 años de beca)" : null,
        salUsa && s0 !== salUsa ? "Un investigador en EE.UU. cuesta " + fmt(salUsa / s0, 1) + " veces más: ahí está el riesgo de fuga" : null
      ]) + "</ul></div>");
    }
    // 4. startups
    b = total * sh[3];
    if (b > 0) {
      var fn = arr(SIM.fondos_nacionales).filter(function (f) { return usd(f.monto) != null; }).sort(function (a, c) { return Math.abs(usd(a.monto) - b) - Math.abs(usd(c.monto) - b); })[0];
      var med = mediana(arr(N.noticias).filter(function (n) { return /serie a|series a|semilla|seed/i.test(n.operacion || "") && usd(n.monto) != null; }).map(function (n) { return usd(n.monto); }));
      out.push('<div class="sr"><h4>Fondo de startups · ' + esc(usdTxt(b)) + '</h4><div class="big">' + esc(usdTxt(b)) + "</div><ul>" + li([
        med ? "≈ <b>" + fmt(b / med, 0) + "</b> rondas iniciales del tamaño mediano visto en 2026 (" + esc(usdTxt(med)) + ")" : null,
        fn ? "Tamaño parecido a: " + esc(fn.nombre) + " de " + esc(nombre(fn.pais_iso3)) + " (" + esc(usdTxt(usd(fn.monto))) + ")" : null,
        "Funciona como ancla si atrae capital privado adicional"
      ]) + "</ul></div>");
    }
    $("simRes").innerHTML = out.join("") || '<p class="empty">Asigna presupuesto a algún pilar.</p>';

    // comparación
    var cmp = [{ name: nombre(sim.iso) + " (simulado, anual)", value: anual / 1e9, me: true }];
    Object.keys(IA.C).forEach(function (i) { var c = IA.C[i]; if (i !== sim.iso && num(c.pub) != null && isUsd(c.pub)) cmp.push({ name: nombre(i) + " · presupuesto público IA", value: toBn(c.pub) }); });
    cmp.sort(function (a, c) { return c.value - a.value; });
    var pos = cmp.map(function (c) { return c.me; }).indexOf(true);
    var win = cmp.slice(Math.max(0, pos - 4), pos + 5);
    var pl = pal();
    if (win.length < 2) IA.noData("cSim"); else {
      var rv = win.slice().reverse();
      mk("cSim").setOption({
        grid: { left: 8, right: 70, top: 8, bottom: 8, containLabel: true },
        tooltip: Object.assign(IA.tipBase(pl), { trigger: "item", formatter: function (q) { return "<b>" + esc(rv[q.dataIndex].name) + "</b><br>" + money(rv[q.dataIndex].value, "USD miles de millones"); } }),
        xAxis: IA.axisVal(pl, { axisLabel: { show: false }, splitLine: { show: false } }),
        yAxis: IA.axisCat(pl, rv.map(function (r) { return r.name; }), { axisLabel: { color: pl.ink, fontSize: 12, width: 230, overflow: "truncate" }, axisLine: { show: false } }),
        series: [{ type: "bar", barMaxWidth: 18, data: rv.map(function (r) { return { value: r.value, itemStyle: { color: r.me ? pl.s[1] : pl.s[0], borderRadius: [0, 4, 4, 0] } }; }),
          label: { show: true, position: "right", color: pl.ink2, fontSize: 11.5, formatter: function (q) { return fmt(q.value); } } }]
      });
      var topE = arr((D.bigtech || {}).empresas).filter(function (e) { return toBn(e.capex_2026) != null; }).sort(function (a, c) { return toBn(c.capex_2026) - toBn(a.capex_2026); })[0];
      note("nSim", "Miles de millones de US$ al año, frente a los presupuestos públicos anuales de IA verificados de otros países (posición " + (pos + 1) + " de " + cmp.length + ")." +
        (topE ? " Como referencia, " + esc(topE.nombre) + " prevé un capex de " + esc(money(toBn(topE.capex_2026), "USD miles de millones")) + " en 2026: " + fmt(toBn(topE.capex_2026) / (anual / 1e9), 0) + " veces este presupuesto anual." : ""));
    }
  }
  function mediana(a) { if (!a.length) return null; a = a.slice().sort(function (x, y) { return x - y; }); return a[Math.floor(a.length / 2)]; }
  function refSuper(gpus) {
    if (gpus == null) return null;
    var s = arr(SIM.supercomputadores).filter(function (q) { return num(q.gpus) != null; }).sort(function (a, c) { return Math.abs(num(a.gpus) - gpus) - Math.abs(num(c.gpus) - gpus); })[0];
    return s ? "Referencia: " + esc(s.nombre) + " (" + esc(nombre(s.pais_iso3)) + ") tiene " + fmt(num(s.gpus), 0) + " GPU" : null;
  }
  function simTables() {
    table("tSimParams", [
      { t: "Supuesto", h: function (r) { return esc(r.nombre || r.clave) + (r.nota ? '<br><span class="mut">' + esc(r.nota) + "</span>" : ""); }, cls: "wide" },
      { t: "Valor usado", num: true, h: function (r) { return cif(r); } }
    ], arr(SIM.parametros));
    if (arr(SIM.supercomputadores).length) table("tSimSuper", [
      { t: "Supercomputador nacional", v: function (r) { return r.nombre; }, h: function (r) { return "<b>" + link(r.nombre, r.url) + "</b><br><span class=\"mut\">" + esc(nombre(r.pais_iso3)) + (r.anio ? " · " + esc(r.anio) : "") + "</span>"; }, asc: true },
      { t: "GPU", num: true, v: function (r) { return num(r.gpus); }, h: function (r) { return num(r.gpus) != null ? fmt(num(r.gpus), 0) : MUT; } },
      { t: "Costo", num: true, v: function (r) { return usd(r.monto); }, h: function (r) { return usd(r.monto) != null && isUsd(r.monto) ? "<b>" + esc(usdTxt(usd(r.monto))) + "</b>" + lv(r.monto) : cif(r.monto); } }
    ], arr(SIM.supercomputadores), { sort: 1 }); else $("tSimSuper").style.display = "none";
    if (arr(SIM.fondos_nacionales).length) table("tSimFondos", [
      { t: "Fondo o programa nacional", v: function (r) { return r.nombre; }, h: function (r) { return "<b>" + link(r.nombre, r.url) + "</b><br><span class=\"mut\">" + esc(nombre(r.pais_iso3)) + (r.anio ? " · " + esc(r.anio) : "") + "</span>"; }, cls: "wide", asc: true },
      { t: "Monto", num: true, v: function (r) { return usd(r.monto); }, h: function (r) { return usd(r.monto) != null && isUsd(r.monto) ? "<b>" + esc(usdTxt(usd(r.monto))) + "</b>" + lv(r.monto) : cif(r.monto); } }
    ], arr(SIM.fondos_nacionales), { sort: 1 }); else $("tSimFondos").style.display = "none";
  }

  // ---- FAQ -----------------------------------------------------------------
  function faq() {
    var P = D.privada || {}, B = D.bigtech || {}, L = D.labs || {}, I = D.inv || {}, E = K.energia || {};
    var qa = [];
    function top(list, get, n) { return arr(list).filter(function (x) { return get(x) != null; }).sort(function (a, b) { return get(b) - get(a); }).slice(0, n); }
    var g = arr((P.series || {}).global), gl = g[g.length - 1];
    var cs = top(Object.keys(IA.C).map(function (i) { return IA.C[i]; }), function (x) { return num(x.priv) != null ? toBn(x.priv) : null; }, 5);
    if (cs.length) qa.push(["¿Qué países invierten más en IA?", (gl ? "La inversión privada mundial en IA fue de <b>" + esc(money(num(gl), "USD miles de millones")) + "</b> en " + esc(gl.anio) + ". " : "") + "Lideran " + cs.map(function (x) { return "<b>" + esc(nombre(x.iso)) + "</b> (" + esc(money(num(x.priv), unitOf(x.priv))) + ")"; }).join(", ") + ". Estados Unidos concentra la mayor parte; el resto del mundo se reparte lo demás."]);
    var es = top(B.empresas, function (e) { return toBn(e.capex_2026); }, 5);
    if (es.length) qa.push(["¿Qué empresas gastan más?", "Por capex previsto para 2026: " + es.map(function (e) { return "<b>" + esc(e.nombre) + "</b> (" + esc(money(toBn(e.capex_2026), "USD miles de millones")) + ")"; }).join(", ") + ". Es inversión total de la empresa en centros de datos, chips y equipos; ninguna publica cuánto es exactamente IA, pero es lo que explica el salto de los últimos años."]);
    var ls = top(L.empresas, function (e) { return toBn(e.valoracion); }, 5);
    if (ls.length) qa.push(["¿Cuáles son las empresas de IA más valiosas?", ls.map(function (e) { return "<b>" + esc(e.nombre) + "</b> (" + esc(money(toBn(e.valoracion), "USD miles de millones")) + ", " + esc(when(e.valoracion)) + ")"; }).join(", ") + ". Son valoraciones de la última ronda u oferta reportada, no precios de mercado diarios."]);
    var sob = arr(I.fondos).filter(function (f) { return f.tipo === "soberano"; });
    if (sob.length) qa.push(["¿Hay fondos soberanos metidos en esto?", "Sí, y son de los bolsillos más grandes. En el informe aparecen " + sob.length + ": " + sob.slice(0, 8).map(function (f) { return "<b>" + esc(f.nombre) + "</b> (" + esc(nombre(f.pais_iso3)) + (toBn(f.comprometido_ia) != null ? ", " + esc(money(toBn(f.comprometido_ia), "USD miles de millones")) + " comprometidos a IA" : "") + ")"; }).join(", ") + ". Buena parte son compromisos anunciados a varios años, no dinero ya desembolsado. Míralos filtrando por «Fondo soberano» en la sección Quién pone el dinero."]);
    var ps = top(I.personas, function (p) { return toBn(p.patrimonio); }, 5);
    if (ps.length) qa.push(["¿Quiénes son las personas con más dinero en juego?", ps.map(function (p) { return "<b>" + esc(p.nombre) + "</b> (" + esc(money(toBn(p.patrimonio), "USD miles de millones")) + ")"; }).join(", ") + ". Es patrimonio estimado, ligado sobre todo al precio de las acciones de sus empresas."]);
    var rr = arr(N.rentabilidad), si = rr.filter(function (r) { return r.rentable === true; }), no = rr.filter(function (r) { return r.rentable === false; });
    if (rr.length) qa.push(["¿La IA ya es rentable?", "Depende de la capa. De las " + rr.length + " empresas con cifras publicadas en este informe, <b>" + si.length + " ganan dinero</b>" + (si.length ? " (" + si.slice(0, 5).map(function (r) { return esc(r.empresa); }).join(", ") + ")" : "") + " y <b>" + no.length + " pierden</b>" + (no.length ? " (" + no.slice(0, 5).map(function (r) { return esc(r.empresa); }).join(", ") + ")" : "") + ". Hoy la rentabilidad está sobre todo en quien vende los chips y la infraestructura; los laboratorios de modelos crecen rápido en ingresos pero siguen quemando caja."]);
    var hs = top(N.hubs, function (h) { return toBn(h.monto); }, 4);
    if (hs.length) qa.push(["¿Dónde se levanta el capital?", "Muy concentrado: " + hs.map(function (h) { return "<b>" + esc(h.ciudad) + "</b> (" + esc(money(toBn(h.monto), "USD miles de millones")) + ")"; }).join(", ") + ". Las rondas grandes ya no son solo capital: mezclan deuda y acuerdos de cómputo con los proveedores de chips y nube."]);
    var st = arr(E.serie_twh), a0 = st.filter(function (r) { return !r.proyeccion; }).slice(-1)[0], a1 = st.filter(function (r) { return r.proyeccion; }).slice(-1)[0];
    if (a0) qa.push(["¿Cuánta electricidad consume la IA?", "Los centros de datos del mundo consumieron unos <b>" + fmt(num(a0)) + " TWh</b> en " + esc(a0.anio) + (a1 ? " y la proyección es de <b>" + fmt(num(a1)) + " TWh</b> para " + esc(a1.anio) : "") + ". No todo es IA, pero la IA es lo que más crece. Por eso las tecnológicas firman contratos de energía nuclear, gas y renovables."]);
    var cap = PAR.capex_por_mw, gp = PAR.precio_gpu;
    if (cap || gp) qa.push(["¿Cuánto cuesta montar un centro de datos de IA?", (cap ? "Alrededor de <b>" + esc(usdTxt(usd(cap))) + " por MW</b> todo incluido" + (num(cap.min) != null ? " (rango reportado " + fmt(num(cap.min)) + "–" + fmt(num(cap.max)) + " " + esc(unitOf(cap)) + ")" : "") + ", es decir, " + esc(usdTxt(usd(cap) * 1000)) + " por GW. " : "") + (gp ? "Una GPU de gama alta ronda <b>" + esc(usdTxt(usd(gp))) + "</b>. " : "") + "La mayor parte del costo son los chips, no el edificio."]);
    if (M.PER) qa.push(["¿Qué puede hacer un país mediano o pequeño?", "No va a competir en capex con un hiperescalador, pero sí puede elegir dónde entrar: alquilar cómputo en vez de construirlo, formar talento, usar modelos abiertos y poner un fondo ancla para startups. El <a href=\"#simulador\">simulador</a> traduce cualquier presupuesto a GPU, megavatios, investigadores y rondas, con los costos de este informe."]);
    qa.push(["¿Se pueden sumar todas estas cifras?", "No. La inversión privada (rondas en empresas de IA), el capex corporativo (centros de datos y chips), el gasto público y los compromisos anunciados miden cosas distintas y en parte se solapan: el dinero de una ronda termina pagando chips que ya están contados en el capex de otra empresa."]);
    qa.push(["¿De dónde salen los datos y qué tan confiables son?", "Cada cifra enlaza a su fuente y lleva un nivel: <b>A</b> primaria u oficial, <b>B</b> prensa o informes confiables, <b>C</b> estimación de terceros. Lo que no se pudo verificar no se muestra. Corte: 11 de octubre de 2026."]);
    $("faqList").innerHTML = qa.map(function (x, i) { return "<details" + (i === 0 ? " open" : "") + "><summary>" + esc(x[0]) + '</summary><div class="ans">' + x[1] + "</div></details>"; }).join("");
  }

  var simReady = null;
  window.IA2 = {
    usd: usd, usdTxt: usdTxt, PAR: PAR,
    render: function () {
      noticias(); cadena();
      if (simReady == null) simReady = simInit();
      if (simReady) { simDraw(); simTables(); }
      faq();
    }
  };
})();

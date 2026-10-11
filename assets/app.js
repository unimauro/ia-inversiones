/* ============================================================================
   app.js — "¿Cuánto invierte el mundo en IA?"
   Lee window.DATA (data/data.js, generado por scripts/build_data.py) y dibuja
   el mapa, los gráficos y las tablas. Cada cifra es un objeto
   {valor, unidad, anio, fuente, url, nivel}.
   ============================================================================ */
(function () {
  "use strict";
  var D = window.DATA || {};
  var P = D.privada || {}, G = D.publica || {}, B = D.bigtech || {}, L = D.labs || {}, U = D.unis || {}, LA = D.latam || {}, I = D.inv || {};
  var $ = function (id) { return document.getElementById(id); };
  var arr = function (x) { return Array.isArray(x) ? x : []; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[<>&"]/g, function (c) { return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]; }); };
  var norm = function (s) { return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); };
  var safeUrl = function (u) { return /^https?:\/\//i.test(u || "") ? u : ""; };

  // ---- cifras --------------------------------------------------------------
  function num(o) {
    if (o == null) return null;
    if (typeof o === "number") return isFinite(o) ? o : null;
    if (typeof o === "string") { var f = parseFloat(o); return isFinite(f) ? f : null; }
    if (typeof o === "object") return num(o.valor);
    return null;
  }
  function fmt(n, d) {
    if (n == null) return "—";
    var a = Math.abs(n);
    if (d == null) d = a >= 100 ? 0 : a >= 10 ? 1 : 2;
    return n.toLocaleString("es-PE", { maximumFractionDigits: d });
  }
  function unitOf(o) { return (o && typeof o === "object" && o.unidad) ? String(o.unidad) : ""; }
  function money(n, unidad) {
    if (n == null) return "—";
    var u = norm(unidad || "USD miles de millones");
    var usd = /usd|us\$|dolar/.test(u) || u === "";
    if (!usd) return fmt(n) + " " + unidad;
    if (/miles de millones|billion|\bbn\b|mil m/.test(u)) {
      if (Math.abs(n) >= 1000) return "US$ " + fmt(n / 1000) + " billones";
      if (Math.abs(n) < 1) return "US$ " + fmt(n * 1000) + " M";
      return "US$ " + fmt(n) + " mil M";
    }
    if (/millones|million|\bmm\b|\bm\b/.test(u)) {
      if (Math.abs(n) >= 1000) return "US$ " + fmt(n / 1000) + " mil M";
      return "US$ " + fmt(n) + " M";
    }
    return "US$ " + fmt(n);
  }
  function when(o) { return o && (o.anio || o.periodo || o.fecha) ? String(o.anio || o.periodo || o.fecha) : ""; }
  function lv(o) {
    if (!o || typeof o !== "object") return "";
    var n = o.nivel || "", u = safeUrl(o.url);
    var t = esc((o.fuente || "Fuente") + (n ? " · nivel " + n : ""));
    var cls = "lv" + (n === "A" ? " lvA" : "");
    return u ? '<a class="' + cls + '" href="' + esc(u) + '" target="_blank" rel="noopener" title="' + t + '">' + esc(n || "↗") + "</a>"
      : (n ? '<span class="' + cls + '" title="' + t + '">' + esc(n) + "</span>" : "");
  }
  function fig(o, opts) {
    var n = num(o); if (n == null) return '<span class="mut">—</span>';
    opts = opts || {};
    var s = opts.raw ? fmt(n) + (unitOf(o) ? " " + esc(unitOf(o)) : "") : money(n, unitOf(o));
    var w = when(o);
    return "<b>" + s + "</b>" + (w && !opts.noWhen ? ' <span class="mut">(' + esc(w) + ")</span>" : "") + lv(o);
  }
  function link(text, url) { var u = safeUrl(url); return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(text) + "</a>" : esc(text); }

  // ---- índice por país -----------------------------------------------------
  var C = {};           // iso3 -> ficha
  var NOMBRES = {};     // iso3 -> nombre en español (del mapa)
  function c(iso, nombre) {
    if (!iso) return null;
    if (!C[iso]) C[iso] = { iso: iso, nombre: nombre || iso, idx: {}, compromisos: [], proyectos: [], unis: [], empresas: [], labs: [], anuncios: [] };
    if (nombre && C[iso].nombre === iso) C[iso].nombre = nombre;
    return C[iso];
  }
  var IDX = LA.indices || {};
  var IDX_KEYS = Object.keys(IDX).filter(function (k) { return IDX[k] && arr(IDX[k].paises).length; });
  function buildIndex() {
    arr(P.paises).forEach(function (p) { var x = c(p.iso3, p.nombre_es); if (!x) return; x.priv = p.privada_ultimo_anio; x.acum = p.privada_acumulada; x.startups = p.startups_financiadas; x.notaPriv = p.notas; });
    arr(G.paises).forEach(function (p) {
      var x = c(p.iso3, p.nombre_es); if (!x) return;
      x.pub = p.publico_anual; x.compromisos = arr(p.compromisos); x.estrategia = p.estrategia; x.gerd = p.gerd_pct_pib; x.notaPub = p.notas;
    });
    IDX_KEYS.forEach(function (k) { arr(IDX[k].paises).forEach(function (p) { var x = c(p.iso3); if (x) x.idx[k] = p; }); });
    arr(U.produccion_pais).forEach(function (p) { var x = c(p.iso3, p.nombre_es); if (x) { x.pubs = p.publicaciones; x.citas = p.citas_pct; } });
    arr(LA.latam).forEach(function (p) {
      var x = c(p.iso3, p.nombre_es); if (!x) return; x.latam = p;
      if (!x.estrategia && p.estrategia) x.estrategia = p.estrategia;
      if (!x.gerd && p.gerd_pct_pib) x.gerd = p.gerd_pct_pib;
      x.anuncios = arr(p.anuncios);
    });
    arr(L.megaproyectos).forEach(function (m) { var x = c(m.pais_iso3); if (x) x.proyectos.push(m); });
    arr(U.universidades).concat(arr(U.latam)).forEach(function (u) { var x = c(u.pais_iso3); if (x && x.unis.indexOf(u) < 0) x.unis.push(u); });
    arr(B.empresas).forEach(function (e) { var x = c(e.pais_iso3); if (x) x.empresas.push(e); });
    arr(L.empresas).forEach(function (e) { var x = c(e.pais_iso3); if (x) x.labs.push(e); });
  }
  function nombre(iso) { return NOMBRES[iso] || (C[iso] && C[iso].nombre !== iso ? C[iso].nombre : iso) || iso; }

  // ---- tema / colores ------------------------------------------------------
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
  function pal() {
    return {
      ink: css("--ink"), ink2: css("--ink-2"), muted: css("--muted"), line: css("--line"), line2: css("--line-2"), card: css("--card"),
      s: [css("--s1"), css("--s2"), css("--s3"), css("--s4"), css("--s5")],
      seq: [css("--seq1"), css("--seq2"), css("--seq3"), css("--seq4"), css("--seq5"), css("--seq6")], nodata: css("--nodata")
    };
  }
  var charts = {};
  function mk(id) {
    var el = $(id); if (!el || !window.echarts) return null;
    if (charts[id]) charts[id].dispose();
    charts[id] = echarts.init(el, null, { renderer: "canvas" });
    return charts[id];
  }
  function noData(id, msg) { var el = $(id); if (el) { if (charts[id]) { charts[id].dispose(); delete charts[id]; } el.innerHTML = '<p class="empty">' + esc(msg || "Sin datos verificados para este gráfico.") + "</p>"; el.style.height = "auto"; } }
  function tipBase(p) {
    return { backgroundColor: p.card, borderColor: p.line2, borderWidth: 1, textStyle: { color: p.ink, fontSize: 12.5, fontFamily: "Inter, sans-serif" }, extraCssText: "box-shadow:0 8px 24px rgba(0,0,0,.14);border-radius:10px;max-width:320px;white-space:normal" };
  }
  function axisCat(p, data, o) {
    return Object.assign({ type: "category", data: data, axisLine: { lineStyle: { color: p.line2 } }, axisTick: { show: false }, axisLabel: { color: p.ink2, fontSize: 11.5 } }, o || {});
  }
  function axisVal(p, o) {
    return Object.assign({ type: "value", axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: p.line } }, axisLabel: { color: p.muted, fontSize: 11.5 } }, o || {});
  }
  function note(id, html) { var el = $(id); if (el) el.innerHTML = html || ""; }
  function srcNote(o, extra) {
    if (!o) return extra || "";
    return "Fuente: " + link(o.fuente || "ver enlace", o.url) + (extra ? ". " + extra : "");
  }

  // barras horizontales (ranking)
  function hbar(id, items, o) {
    o = o || {};
    if (!items.length) return noData(id);
    var p = pal(), ch = mk(id); if (!ch) return;
    items = items.slice().reverse();
    ch.setOption({
      grid: { left: 8, right: 64, top: 8, bottom: 8, containLabel: true },
      tooltip: Object.assign(tipBase(p), { trigger: "item", formatter: function (q) { var it = items[q.dataIndex]; return "<b>" + esc(it.name) + "</b><br>" + (o.fmt ? o.fmt(it.value, it) : fmt(it.value)) + (it.extra ? '<br><span style="opacity:.7">' + esc(it.extra) + "</span>" : ""); } }),
      xAxis: axisVal(p, { axisLabel: { show: false }, splitLine: { show: false } }),
      yAxis: axisCat(p, items.map(function (i) { return i.name; }), { axisLabel: { color: p.ink, fontSize: 12, width: 150, overflow: "truncate" }, axisLine: { show: false } }),
      series: [{
        type: "bar", data: items.map(function (i) { return i.value; }), barMaxWidth: 18, itemStyle: { color: p.s[o.color || 0], borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: "right", color: p.ink2, fontSize: 11.5, formatter: function (q) { return o.short ? o.short(q.value) : fmt(q.value); } },
        emphasis: { itemStyle: { opacity: .82 } }
      }]
    });
    if (o.onClick) ch.on("click", function (q) { o.onClick(items[q.dataIndex]); });
  }

  // ---- tabla genérica ------------------------------------------------------
  function table(id, cols, rows, o) {
    var el = $(id); if (!el) return;
    o = o || {};
    var st = { key: o.sort == null ? -1 : o.sort, dir: o.dir || -1 };
    function draw() {
      var rs = rows.slice();
      if (o.filter) rs = rs.filter(o.filter);
      if (st.key >= 0 && cols[st.key] && cols[st.key].v) {
        var f = cols[st.key].v;
        rs.sort(function (a, b) {
          var x = f(a), y = f(b);
          if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
          return (typeof x === "string" ? x.localeCompare(y, "es") : x - y) * st.dir;
        });
      }
      if (!rs.length) { el.innerHTML = '<p class="empty">' + (rows.length ? "Sin resultados." : "Datos en preparación.") + "</p>"; return; }
      var h = "<table><thead><tr>" + (o.rank ? "<th>#</th>" : "") + cols.map(function (cdef, i) {
        var ar = st.key === i ? '<span class="ar">' + (st.dir < 0 ? "▼" : "▲") + "</span>" : "";
        return '<th class="' + (cdef.num ? "num " : "") + (cdef.v ? "sortable" : "") + '" data-i="' + i + '"' + (cdef.tip ? ' title="' + esc(cdef.tip) + '"' : "") + ">" + esc(cdef.t) + ar + "</th>";
      }).join("") + "</tr></thead><tbody>";
      rs.forEach(function (r, n) {
        h += "<tr>" + (o.rank ? '<td class="rk">' + (n + 1) + "</td>" : "") + cols.map(function (cdef) {
          return '<td class="' + (cdef.num ? "num " : "") + (cdef.cls || "") + '">' + cdef.h(r) + "</td>";
        }).join("") + "</tr>";
      });
      el.innerHTML = h + "</tbody></table>";
      Array.prototype.forEach.call(el.querySelectorAll("th.sortable"), function (th) {
        th.onclick = function () {
          var i = +th.getAttribute("data-i");
          if (st.key === i) st.dir = -st.dir; else { st.key = i; st.dir = cols[i].asc ? 1 : -1; }
          draw();
        };
      });
    }
    draw();
    return { redraw: draw };
  }
  function fillPaises(selId, isos) {
    var s = $(selId); if (!s) return;
    var u = {}; isos.forEach(function (i) { if (i) u[i] = 1; });
    s.innerHTML = '<option value="">Todos los países</option>' + Object.keys(u).sort(function (a, b) { return nombre(a).localeCompare(nombre(b), "es"); })
      .map(function (i) { return '<option value="' + esc(i) + '">' + esc(nombre(i)) + "</option>"; }).join("");
  }
  function hook(ids, fn) { ids.forEach(function (i) { var e = $(i); if (e) e.oninput = fn; }); }

  // ---- KPIs ----------------------------------------------------------------
  function last(a) { a = arr(a); return a.length ? a[a.length - 1] : null; }
  function kpis() {
    var out = [];
    var sp = P.series || {}, g = last(sp.global);
    if (g && num(g) != null) out.push({ lab: "Inversión privada mundial en IA", val: money(num(g), "USD miles de millones"), ctx: "en " + (g.anio || "") + ", según el AI Index de Stanford" });
    var usa = C.USA && num(C.USA.priv);
    if (usa != null && g && num(g)) out.push({ lab: "De esa inversión, va a Estados Unidos", val: fmt(usa / num(g) * 100, 0) + "%", ctx: money(usa, unitOf(C.USA.priv)) + " en " + when(C.USA.priv) });
    var ca = arr((B.series || {}).capex_hiperescaladores_anual), cl = last(ca);
    if (cl && num(cl) != null) out.push({ lab: "Capex de los hiperescaladores", val: money(num(cl), "USD miles de millones"), ctx: (cl.estimado ? "estimado para " : "en ") + cl.anio });
    var top = arr(L.empresas).filter(function (e) { return num(e.valoracion) != null; }).sort(function (a, b) { return num(b.valoracion) - num(a.valoracion); })[0];
    if (top) out.push({ lab: "Startup de IA más valiosa: " + top.nombre, val: money(num(top.valoracion), unitOf(top.valoracion)), ctx: "valoración a " + when(top.valoracion) });
    $("kpis").innerHTML = out.map(function (k) { return '<div class="kpi"><div class="lab">' + esc(k.lab) + '</div><div class="val">' + esc(k.val) + '</div><div class="ctx">' + esc(k.ctx) + "</div></div>"; }).join("");
  }

  // ---- MAPA ----------------------------------------------------------------
  var LAYERS = [], layer = null, mapChart = null, selected = null;
  function defLayers() {
    function add(id, label, get, o) {
      var n = Object.keys(C).filter(function (i) { return num(get(C[i])) != null; }).length;
      if (n >= 3) LAYERS.push(Object.assign({ id: id, label: label, get: get, n: n }, o || {}));
    }
    add("priv", "Inversión privada", function (x) { return x.priv; }, { money: true, desc: "Inversión privada en IA, último año" });
    add("acum", "Privada acumulada", function (x) { return x.acum; }, { money: true, desc: "Inversión privada en IA acumulada" });
    add("pub", "Presupuesto público", function (x) { return x.pub; }, { money: true, desc: "Presupuesto público anual en IA" });
    IDX_KEYS.forEach(function (k) {
      var lab = { vibrancy: "Dinamismo (Stanford)", tortoise: "Global AI Index", oxford_readiness: "Preparación del Estado", imf_aipi: "Preparación (FMI)", ilia: "Índice LATAM (ILIA)" }[k] || IDX[k].nombre || k;
      add("idx_" + k, lab, function (x) { return x.idx[k] ? x.idx[k].puntaje : null; }, { desc: (IDX[k].nombre || lab) + (IDX[k].edicion ? " · " + IDX[k].edicion : ""), src: IDX[k], idx: k });
    });
    add("pubs", "Publicaciones", function (x) { return x.pubs; }, { desc: "Publicaciones científicas de IA" });
    add("gerd", "I+D total (% PIB)", function (x) { return x.gerd; }, { desc: "Gasto total en I+D como % del PIB (todas las áreas, no solo IA)", pct: true });
  }
  function nice(v) { if (v === 0) return 0; var e = Math.pow(10, Math.floor(Math.log10(Math.abs(v))) - 1); return Math.round(v / e) * e; }
  function breaks(vals, k) {
    vals = vals.slice().sort(function (a, b) { return a - b; });
    var out = [];
    for (var i = 1; i < k; i++) { var b = nice(vals[Math.min(vals.length - 1, Math.floor(i * vals.length / k))]); if (out.indexOf(b) < 0 && b > vals[0]) out.push(b); }
    return out;
  }
  function layerFmt(ly, v) { return ly.money ? money(v, "USD miles de millones") : ly.pct ? fmt(v) + "%" : fmt(v); }
  function drawMap() {
    if (!layer || !mapChart) return;
    var p = pal();
    var data = [], vals = [];
    Object.keys(C).forEach(function (i) { var v = num(layer.get(C[i])); if (v != null) { data.push({ name: i, value: v }); vals.push(v); } });
    var bs = breaks(vals, Math.min(6, Math.max(3, Math.floor(vals.length / 3))));
    var cols = bs.length + 1 <= 6 ? p.seq.slice(6 - (bs.length + 1)) : p.seq;
    if (css("color-scheme") === "dark") cols = p.seq.slice(0, bs.length + 1);
    var pieces = [];
    for (var i = 0; i <= bs.length; i++) {
      var pc = { color: cols[i] };
      if (i > 0) pc.gte = bs[i - 1]; if (i < bs.length) pc.lt = bs[i];
      pc.label = i === 0 ? "< " + fmt(bs[0]) : i === bs.length ? "≥ " + fmt(bs[i - 1]) : fmt(bs[i - 1]) + " – " + fmt(bs[i]);
      pieces.push(pc);
    }
    var series = [{ type: "map", geoIndex: 0, data: data, name: layer.label }];
    if ($("ptProy").checked) {
      var pr = arr(L.megaproyectos).filter(function (m) { return num(m.lat) != null && num(m.lon) != null; });
      series.push({
        type: "scatter", coordinateSystem: "geo", name: "Megaproyectos", z: 5,
        data: pr.map(function (m) { return { name: m.nombre, value: [m.lon, m.lat, num(m.monto) || 0], m: m }; }),
        symbolSize: function (v) { return Math.max(9, Math.min(30, 8 + Math.sqrt(v[2] || 0) * 1.6)); },
        itemStyle: { color: p.s[1], borderColor: p.card, borderWidth: 2, opacity: .92 }
      });
    }
    if ($("ptUni").checked) {
      var us = arr(U.universidades).filter(function (u) { return num(u.lat) != null && num(u.lon) != null; });
      series.push({
        type: "scatter", coordinateSystem: "geo", name: "Universidades", z: 6, symbol: "diamond", symbolSize: 10,
        data: us.map(function (u) { return { name: u.nombre, value: [u.lon, u.lat], u: u }; }),
        itemStyle: { color: p.s[2], borderColor: p.card, borderWidth: 1.5 }
      });
    }
    if ($("ptHub").checked) {
      var hs = arr((D.noti || {}).hubs).filter(function (h) { return num(h.lat) != null && num(h.lon) != null; });
      series.push({
        type: "scatter", coordinateSystem: "geo", name: "Hubs de capital", z: 7,
        data: hs.map(function (h) { return { name: h.ciudad, value: [h.lon, h.lat, toBn(h.monto) || 0], h: h }; }),
        symbolSize: function (v) { return Math.max(8, Math.min(34, 7 + Math.sqrt(v[2] || 0) * 2.4)); },
        itemStyle: { color: p.s[3], borderColor: p.card, borderWidth: 2, opacity: .9 }
      });
    }
    if ($("ptFab").checked) {
      var fb = arr(((D.cadena || {}).chips || {}).fabricas).filter(function (f) { return num(f.lat) != null && num(f.lon) != null; });
      series.push({
        type: "scatter", coordinateSystem: "geo", name: "Fábricas de chips", z: 8, symbol: "rect", symbolSize: 11,
        data: fb.map(function (f) { return { name: f.nombre, value: [f.lon, f.lat], f: f }; }),
        itemStyle: { color: p.s[4], borderColor: p.card, borderWidth: 1.5 }
      });
    }
    mapChart.setOption({
      tooltip: Object.assign(tipBase(p), {
        trigger: "item", formatter: function (q) {
          if (q.data && q.data.h) { var hh = q.data.h; return "<b>" + esc(hh.ciudad) + "</b><br>" + esc(nombre(hh.pais_iso3)) + (num(hh.monto) != null ? "<br>Capital de IA levantado: <b>" + money(num(hh.monto), unitOf(hh.monto)) + "</b> (" + esc(when(hh.monto)) + ")" : "") + (num(hh.pct_mundial) != null ? "<br>" + fmt(num(hh.pct_mundial)) + "% del total mundial" : ""); }
          if (q.data && q.data.f) { var ff = q.data.f; return "<b>" + esc(ff.nombre) + "</b><br>" + esc((ff.lugar ? ff.lugar + ", " : "") + nombre(ff.pais_iso3)) + (num(ff.inversion) != null ? "<br>Inversión: <b>" + money(num(ff.inversion), unitOf(ff.inversion)) + "</b>" : "") + (ff.nodo ? "<br>Nodo: " + esc(ff.nodo) : "") + (ff.estado ? '<br><span style="opacity:.7">' + esc(ff.estado) + "</span>" : ""); }
          if (q.data && q.data.m) { var m = q.data.m; return "<b>" + esc(m.nombre) + "</b><br>" + esc(m.lugar || nombre(m.pais_iso3)) + (num(m.monto) != null ? "<br>" + money(num(m.monto), unitOf(m.monto)) : "") + (m.capacidad_gw ? " · " + fmt(num(m.capacidad_gw)) + " GW" : "") + (m.estado ? '<br><span style="opacity:.7">' + esc(m.estado) + "</span>" : ""); }
          if (q.data && q.data.u) { var u = q.data.u; return "<b>" + esc(u.nombre) + "</b><br>" + esc((u.ciudad ? u.ciudad + ", " : "") + nombre(u.pais_iso3)) + "<br>" + rkList(u); }
          var v = (q.componentSubType === "map" && q.value != null && !isNaN(q.value)) ? q.value : null;
          return "<b>" + esc(nombre(q.name)) + "</b><br>" + (v != null ? esc(layer.desc) + ": <b>" + layerFmt(layer, v) + "</b>" : '<span style="opacity:.7">Sin dato para este indicador</span>');
        }
      }),
      visualMap: { type: "piecewise", seriesIndex: 0, pieces: pieces, orient: "horizontal", left: "center", bottom: 4, itemWidth: 16, itemHeight: 10, itemGap: 10, textStyle: { color: p.ink2, fontSize: 11.5 }, outOfRange: { color: p.nodata } },
      geo: {
        map: "world", roam: true, nameProperty: "name", left: 4, right: 4, top: 6, bottom: 44, scaleLimit: { min: 1, max: 12 },
        itemStyle: { areaColor: p.nodata, borderColor: p.card, borderWidth: .6 },
        emphasis: { label: { show: false }, itemStyle: { areaColor: null, borderColor: p.ink, borderWidth: 1.2 } },
        select: { disabled: true }
      },
      series: series
    }, true);
    var srcO = layer.src || firstSrc(layer);
    note("mapNote", esc(layer.desc) + " · " + layer.n + " países con dato. Gris: sin dato verificado." + (srcO ? " Fuente: " + link(srcO.fuente || srcO.nombre || "ver", srcO.url) + "." : "") + " Arrastra para mover y usa la rueda para acercar.");
  }
  function firstSrc(ly) { var ks = Object.keys(C); for (var i = 0; i < ks.length; i++) { var o = ly.get(C[ks[i]]); if (o && typeof o === "object" && o.fuente) return o; } return null; }
  function rkList(u) {
    var r = u.rankings || {}, names = rkNames();
    return Object.keys(r).filter(function (k) { return r[k] != null && r[k] !== ""; }).map(function (k) { return esc(names[k] || k) + ": <b>#" + esc(r[k]) + "</b>"; }).join("<br>");
  }
  function rkNames() { var o = {}; arr((U.meta || {}).rankings).forEach(function (r) { o[r.clave] = r.corto || r.nombre || r.clave; }); return o; }

  function ficha(iso) {
    selected = iso;
    var el = $("ficha"), x = C[iso];
    if (!iso) { el.innerHTML = "<h3>Elige un país</h3><p class=\"note\">Haz clic en el mapa para ver su ficha: inversión privada, presupuesto público, estrategia nacional, índices, empresas, universidades y megaproyectos.</p>"; return; }
    var h = "<h3>" + esc(nombre(iso)) + '</h3><div class="iso">' + esc(iso) + "</div>";
    if (!x) { el.innerHTML = h + '<p class="note">No hay datos verificados de este país en el informe.</p>'; return; }
    var dl = [];
    function row(t, o, opts) { if (num(o) != null) dl.push("<dt>" + esc(t) + "</dt><dd>" + fig(o, opts) + "</dd>"); }
    row("Inversión privada en IA", x.priv); row("Inversión privada acumulada", x.acum);
    row("Startups de IA financiadas", x.startups, { raw: true });
    row("Presupuesto público anual en IA", x.pub);
    if (num(x.gerd) != null) dl.push("<dt>I+D total (todas las áreas)</dt><dd><b>" + fmt(num(x.gerd)) + "% del PIB</b> <span class=\"mut\">(" + esc(when(x.gerd)) + ")</span>" + lv(x.gerd) + "</dd>");
    row("Publicaciones de IA", x.pubs, { raw: true });
    IDX_KEYS.forEach(function (k) { var v = x.idx[k]; if (v) dl.push("<dt>" + esc(IDX[k].nombre || k) + "</dt><dd>" + (v.rank != null ? "<b>#" + esc(v.rank) + "</b>" : "") + (num(v.puntaje) != null ? ' <span class="mut">puntaje ' + fmt(num(v.puntaje)) + "</span>" : "") + lv({ url: IDX[k].url, fuente: IDX[k].nombre }) + "</dd>"); });
    if (x.estrategia && x.estrategia.nombre) dl.push("<dt>Estrategia nacional</dt><dd>" + link(x.estrategia.nombre, x.estrategia.url) + (x.estrategia.anio ? ' <span class="mut">(' + esc(x.estrategia.anio) + ")</span>" : "") + "</dd>");
    h += dl.length ? "<dl>" + dl.join("") + "</dl>" : "";
    function list(t, items, f) { if (items.length) h += "<h4>" + esc(t) + "</h4><ul>" + items.slice(0, 8).map(function (i) { return "<li>" + f(i) + "</li>"; }).join("") + (items.length > 8 ? "<li class=\"mut\">y " + (items.length - 8) + " más</li>" : "") + "</ul>"; }
    list("Compromisos públicos", x.compromisos, function (k) { return esc(k.nombre) + ": " + fig(k); });
    list("Megaproyectos", x.proyectos, function (m) { return esc(m.nombre) + (num(m.monto) != null ? ": " + fig(m.monto, { noWhen: true }) : "") + (m.estado ? ' <span class="mut">· ' + esc(m.estado) + "</span>" : ""); });
    list("Empresas cotizadas", x.empresas.slice().sort(function (a, b) { return (num(b.capex_2025) || 0) - (num(a.capex_2025) || 0); }), function (e) { return esc(e.nombre) + (num(e.capex_2025) != null ? ' <span class="mut">capex ' + money(num(e.capex_2025), unitOf(e.capex_2025)) + "</span>" : ""); });
    list("Laboratorios y startups", x.labs.slice().sort(function (a, b) { return (num(b.valoracion) || 0) - (num(a.valoracion) || 0); }), function (e) { return esc(e.nombre) + (num(e.valoracion) != null ? ' <span class="mut">valoración ' + money(num(e.valoracion), unitOf(e.valoracion)) + "</span>" : ""); });
    list("Universidades", x.unis, function (u) { var r = u.rankings || {}, k = Object.keys(r).filter(function (q) { return r[q] != null && r[q] !== ""; })[0]; return esc(u.nombre) + (k ? ' <span class="mut">#' + esc(r[k]) + " " + esc(rkNames()[k] || k) + "</span>" : ""); });
    list("Anuncios de inversión", x.anuncios, function (a) { return esc(a.empresa || "") + (a.concepto ? ": " + esc(a.concepto) : "") + (num(a.monto) != null ? " — " + fig(a.monto, { noWhen: true }) : ""); });
    var nt = [x.notaPriv, x.notaPub, x.latam && x.latam.notas].filter(Boolean).join(" ");
    if (nt) h += '<p class="note">' + esc(nt) + "</p>";
    if (!dl.length && h.indexOf("<h4>") < 0) h += '<p class="note">No hay datos verificados de este país en el informe.</p>';
    el.innerHTML = h; el.scrollTop = 0;
  }

  function initMap() {
    defLayers();
    var seg = $("mapLayers");
    seg.innerHTML = LAYERS.map(function (l, i) { return '<button role="tab" data-id="' + l.id + '" aria-selected="' + (i === 0) + '">' + esc(l.label) + "</button>"; }).join("");
    seg.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      layer = LAYERS.filter(function (l) { return l.id === b.getAttribute("data-id"); })[0];
      Array.prototype.forEach.call(seg.children, function (x) { x.setAttribute("aria-selected", x === b ? "true" : "false"); });
      drawMap();
    });
    layer = LAYERS[0] || null;
    ficha(null);
    if (!layer) return noData("mapChart", "Aún no hay datos por país.");
    fetch("assets/world.json").then(function (r) { return r.json(); }).then(function (geo) {
      geo.features = geo.features.filter(function (f) { return f.id !== "ATA"; });
      geo.features.forEach(function (f) { NOMBRES[f.id] = f.properties.nombre; });
      NOMBRES.TWN = "Taiwán"; NOMBRES.KOR = "Corea del Sur"; NOMBRES.PRK = "Corea del Norte"; NOMBRES.CHN = "China"; NOMBRES.HKG = "Hong Kong";
      echarts.registerMap("world", geo);
      mapChart = mk("mapChart");
      mapChart.on("click", function (q) {
        if (q.data && q.data.m) return ficha(q.data.m.pais_iso3);
        if (q.data && q.data.u) return ficha(q.data.u.pais_iso3);
        if (q.data && (q.data.h || q.data.f)) return ficha((q.data.h || q.data.f).pais_iso3);
        if (q.name) ficha(q.name);
      });
      drawMap(); ficha(C.PER ? "PER" : null); renderAll();
    }).catch(function () { noData("mapChart", "No se pudo cargar el mapa."); renderAll(); });
    ["ptProy", "ptUni", "ptHub", "ptFab"].forEach(function (i) { $(i).addEventListener("change", drawMap); });
  }

  // ---- BLOQUES -------------------------------------------------------------
  // Membresías a octubre de 2026. Los bloques se solapan: no se suman entre sí.
  var UE = "AUT BEL BGR HRV CYP CZE DNK EST FIN FRA DEU GRC HUN IRL ITA LVA LTU LUX MLT NLD POL PRT ROU SVK SVN ESP SWE".split(" ");
  var BLOQUES = [
    { id: "", label: "Todo el mundo" },
    { id: "g7", label: "G7 / G8", isos: "USA CAN GBR FRA DEU ITA JPN RUS".split(" "), nota: "G7: Estados Unidos, Canadá, Reino Unido, Francia, Alemania, Italia y Japón. Se incluye a Rusia, que formó el G8 hasta su suspensión en 2014." },
    { id: "ue", label: "Unión Europea", isos: UE, nota: "Los 27 Estados miembros." },
    { id: "brics", label: "BRICS+", isos: "BRA RUS IND CHN ZAF EGY ETH IRN ARE IDN".split(" "), nota: "Brasil, Rusia, India, China y Sudáfrica, más Egipto, Etiopía, Irán, Emiratos Árabes Unidos e Indonesia." },
    { id: "pot", label: "Otras potencias", isos: "CHN IND KOR AUS BRA MEX IDN SAU TUR ZAF ARG ISR SGP ARE CHE TWN ESP NLD SWE".split(" "), nota: "Economías fuera del G7 con peso propio en IA: resto del G20 más Israel, Singapur, Emiratos, Suiza, Taiwán, España, Países Bajos y Suecia." },
    { id: "golfo", label: "Golfo", isos: "SAU ARE QAT KWT BHR OMN".split(" "), nota: "Consejo de Cooperación del Golfo." },
    { id: "asia", label: "Asia-Pacífico", isos: "CHN JPN KOR TWN HKG SGP IND IDN MYS THA VNM PHL AUS NZL PAK BGD".split(" "), nota: "Asia oriental, del sur y sudeste, más Oceanía." },
    { id: "latam", label: "América Latina", isos: "ARG BOL BRA CHL COL CRI CUB DOM ECU SLV GTM HND MEX NIC PAN PRY PER URY VEN".split(" "), nota: "" },
    { id: "africa", label: "África", isos: "ZAF EGY NGA KEN MAR ETH GHA TUN DZA RWA SEN UGA TZA CIV MUS".split(" "), nota: "" }
  ];
  var bloque = BLOQUES[0];
  function enBloque(iso) { return !bloque.isos || bloque.isos.indexOf(iso) >= 0; }
  function initBloques() {
    var seg = $("bloques"); if (!seg) return;
    seg.innerHTML = BLOQUES.map(function (b, i) { return '<button role="tab" data-id="' + b.id + '" aria-selected="' + (i === 0) + '">' + esc(b.label) + "</button>"; }).join("");
    seg.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      bloque = BLOQUES.filter(function (x) { return x.id === b.getAttribute("data-id"); })[0];
      Array.prototype.forEach.call(seg.children, function (x) { x.setAttribute("aria-selected", x === b ? "true" : "false"); });
      paises();
    });
  }
  function bloquesChart() {
    var rows = BLOQUES.filter(function (b) { return b.isos; }).map(function (b) {
      var t = 0, n = 0; b.isos.forEach(function (i) { var v = C[i] && num(C[i].priv); if (v != null) { t += toBn(C[i].priv); n++; } });
      return { name: b.label, value: Math.round(t * 100) / 100, extra: n + " de " + b.isos.length + " países con dato", n: n };
    }).filter(function (r) { return r.n > 0; });
    var usa = C.USA && num(C.USA.priv) != null ? toBn(C.USA.priv) : null, chn = C.CHN && num(C.CHN.priv) != null ? toBn(C.CHN.priv) : null;
    if (usa != null) rows.push({ name: "Estados Unidos (solo)", value: usa, extra: "referencia" });
    if (chn != null) rows.push({ name: "China (solo)", value: chn, extra: "referencia" });
    rows.sort(function (a, b) { return b.value - a.value; });
    hbar("cBloques", rows, { fmt: function (v) { return money(v, "USD miles de millones"); }, short: function (v) { return fmt(v); } });
    note("nBloques", rows.length ? "Inversión privada en IA sumada por bloque, miles de millones de US$, último año. Solo suma países con dato verificado; los bloques comparten miembros, así que no se suman entre sí." : "");
  }

  // ---- PAÍSES --------------------------------------------------------------
  function paises() {
    var p = pal();
    bloquesChart();
    note("nBloque", bloque.isos ? "<b>" + esc(bloque.label) + ".</b> " + esc(bloque.nota || "") + " El filtro aplica al ranking, al presupuesto público, a los compromisos y a la tabla." : "");
    var priv = Object.keys(C).filter(function (i) { return enBloque(i) && num(C[i].priv) != null; }).sort(function (a, b) { return num(C[b].priv) - num(C[a].priv); });
    hbar("cPrivRank", priv.slice(0, 15).map(function (i) { return { name: nombre(i), value: num(C[i].priv), iso: i }; }), {
      fmt: function (v) { return money(v, "USD miles de millones"); }, short: function (v) { return fmt(v); },
      onClick: function (it) { ficha(it.iso); location.hash = "#mapa"; }
    });
    if (!priv.length) note("nPrivRank", ""); else note("nPrivRank", "Miles de millones de US$, " + esc(when(C[priv[0]].priv)) + ". " + srcNote(C[priv[0]].priv, "Clic en una barra para abrir la ficha del país."));

    var sp = P.series || {}, defs = [["global", "Mundo"], ["USA", "Estados Unidos"], ["CHN", "China"], ["EUR_UK", "Europa y Reino Unido"], ["genai_global", "IA generativa (mundo)"]]
      .filter(function (d) { return arr(sp[d[0]]).length > 1; });
    if (!defs.length) noData("cPrivSerie"); else {
      var years = {}; defs.forEach(function (d) { sp[d[0]].forEach(function (q) { years[q.anio] = 1; }); });
      var ys = Object.keys(years).sort();
      var ch = mk("cPrivSerie");
      ch.setOption({
        color: p.s, grid: { left: 8, right: 130, top: 36, bottom: 8, containLabel: true },
        legend: { top: 0, left: 0, textStyle: { color: p.ink2, fontSize: 12 }, icon: "roundRect", itemWidth: 12, itemHeight: 3 },
        tooltip: Object.assign(tipBase(p), { trigger: "axis", valueFormatter: function (v) { return v == null ? "—" : money(v, "USD miles de millones"); } }),
        xAxis: axisCat(p, ys), yAxis: axisVal(p),
        series: defs.map(function (d, i) {
          var m = {}; sp[d[0]].forEach(function (q) { m[q.anio] = num(q); });
          return { name: d[1], type: "line", data: ys.map(function (y) { return m[y] == null ? null : m[y]; }), lineStyle: { width: 2 }, symbol: "circle", symbolSize: 6, showSymbol: false, connectNulls: true,
            endLabel: i < 4 ? { show: true, formatter: "{a}", color: p.ink2, fontSize: 11.5 } : { show: false } };
        })
      });
      note("nPrivSerie", "Miles de millones de US$ por año. " + srcNote(sp));
    }

    var pub = Object.keys(C).filter(function (i) { return enBloque(i) && num(C[i].pub) != null && /usd|us\$/i.test(unitOf(C[i].pub)); }).sort(function (a, b) { return num(C[b].pub) - num(C[a].pub); });
    hbar("cPubRank", pub.slice(0, 15).map(function (i) { return { name: nombre(i), value: toBn(C[i].pub), extra: when(C[i].pub) + " · " + (C[i].pub.fuente || ""), iso: i }; }).sort(function (a, b) { return b.value - a.value; }), {
      color: 2, fmt: function (v) { return money(v, "USD miles de millones"); }, short: function (v) { return fmt(v); }, onClick: function (it) { ficha(it.iso); location.hash = "#mapa"; }
    });
    note("nPubRank", pub.length ? "Miles de millones de US$. Los años fiscales y lo que cada gobierno cuenta como «IA» difieren: comparar con cautela. Fuente por país en la tabla." : "");

    var comp = []; Object.keys(C).filter(enBloque).forEach(function (i) { C[i].compromisos.forEach(function (k) { comp.push({ iso: i, k: k }); }); });
    table("tCompromisos", [
      { t: "País", v: function (r) { return nombre(r.iso); }, h: function (r) { return esc(nombre(r.iso)); }, asc: true },
      { t: "Programa", h: function (r) { return esc(r.k.nombre) + (r.k.tipo ? ' <span class="tag">' + esc(String(r.k.tipo).replace(/_/g, " ")) + "</span>" : ""); }, cls: "wide" },
      { t: "Monto", num: true, v: function (r) { return /usd|us\$/i.test(unitOf(r.k)) ? toBn(r.k) : null; }, h: function (r) { return fig(r.k, { noWhen: true }); } },
      { t: "Periodo", h: function (r) { return esc(when(r.k)); } }
    ], comp, { sort: 2 });

    var all = Object.keys(C).filter(function (i) { var x = C[i]; return enBloque(i) && (num(x.priv) != null || num(x.pub) != null || num(x.gerd) != null || Object.keys(x.idx).length || x.estrategia); });
    var cols = [
      { t: "País", v: function (i) { return nombre(i); }, h: function (i) { return '<a href="#mapa" data-iso="' + esc(i) + '">' + esc(nombre(i)) + "</a>"; }, asc: true },
      { t: "Inversión privada", num: true, v: function (i) { return num(C[i].priv); }, h: function (i) { return fig(C[i].priv, { noWhen: true }); } },
      { t: "Privada acumulada", num: true, v: function (i) { return num(C[i].acum); }, h: function (i) { return fig(C[i].acum, { noWhen: true }); } },
      { t: "Presupuesto público", num: true, v: function (i) { return num(C[i].pub) != null && /usd|us\$/i.test(unitOf(C[i].pub)) ? toBn(C[i].pub) : null; }, h: function (i) { return fig(C[i].pub); } },
      { t: "I+D % PIB", num: true, tip: "Gasto total en I+D, todas las áreas", v: function (i) { return num(C[i].gerd); }, h: function (i) { return num(C[i].gerd) != null ? "<b>" + fmt(num(C[i].gerd)) + "%</b>" + lv(C[i].gerd) : '<span class="mut">—</span>'; } }
    ];
    IDX_KEYS.forEach(function (k) {
      if (k === "ilia") return;
      cols.push({ t: ({ vibrancy: "Stanford", tortoise: "Global AI Index", oxford_readiness: "Oxford", imf_aipi: "FMI" }[k] || k), num: true, tip: (IDX[k].nombre || k) + " — posición", asc: true,
        v: function (i) { var q = C[i].idx[k]; return q ? (num(q.rank) != null ? num(q.rank) : null) : null; },
        h: function (i) { var q = C[i].idx[k]; return q ? (q.rank != null ? "#" + esc(q.rank) : fmt(num(q.puntaje))) : '<span class="mut">—</span>'; } });
    });
    cols.push({ t: "Estrategia nacional", h: function (i) { var e = C[i].estrategia; return e && e.nombre ? link(e.nombre, e.url) + (e.anio ? ' <span class="mut">' + esc(e.anio) + "</span>" : "") : '<span class="mut">—</span>'; }, cls: "wide" });
    var t = table("tPaises", cols, all, { sort: 1, rank: true, filter: function (i) { var q = norm($("qPais").value); return !q || norm(nombre(i)).indexOf(q) >= 0; } });
    $("qPais").oninput = t.redraw;
    $("tPaises").onclick = function (e) { var a = e.target.closest("a[data-iso]"); if (a) ficha(a.getAttribute("data-iso")); };
  }
  function toBn(o) { var n = num(o), u = norm(unitOf(o)); if (n == null) return null; return /miles de millones|billion|\bbn\b/.test(u) ? n : /millones|million/.test(u) ? n / 1000 : n; }

  // ---- EMPRESAS ------------------------------------------------------------
  function empresas() {
    var p = pal(), S = B.series || {};
    var q = S.capex_trimestral || {}, tick = Object.keys(q).filter(function (k) { return arr(q[k]).length > 1; }).slice(0, 5);
    var NM = { AMZN: "Amazon", MSFT: "Microsoft", GOOGL: "Alphabet", GOOG: "Alphabet", META: "Meta", ORCL: "Oracle" };
    if (!tick.length) noData("cCapexQ"); else {
      var per = {}; tick.forEach(function (k) { q[k].forEach(function (r) { per[r.periodo] = 1; }); });
      var ps = Object.keys(per).sort();
      mk("cCapexQ").setOption({
        color: p.s, grid: { left: 8, right: 78, top: 36, bottom: 8, containLabel: true },
        legend: { top: 0, left: 0, textStyle: { color: p.ink2, fontSize: 12 }, icon: "roundRect", itemWidth: 12, itemHeight: 3 },
        tooltip: Object.assign(tipBase(p), { trigger: "axis", valueFormatter: function (v) { return v == null ? "—" : money(v, "USD miles de millones"); } }),
        xAxis: axisCat(p, ps.map(function (s) { return s.replace("-Q", " T"); }), { axisLabel: { color: p.ink2, fontSize: 11, interval: "auto" } }), yAxis: axisVal(p),
        series: tick.map(function (k, i) {
          var m = {}; q[k].forEach(function (r) { m[r.periodo] = num(r); });
          return { name: NM[k] || k, type: "line", data: ps.map(function (s) { return m[s] == null ? null : m[s]; }), lineStyle: { width: 2 }, symbol: "circle", symbolSize: 6, showSymbol: false, connectNulls: true,
            endLabel: i < 4 ? { show: true, formatter: "{a}", color: p.ink2, fontSize: 11.5 } : { show: false } };
        })
      });
      note("nCapexQ", "Miles de millones de US$ por trimestre calendario. " + srcNote(S));
    }
    var an = arr(S.capex_hiperescaladores_anual);
    if (!an.length) noData("cCapexA"); else {
      mk("cCapexA").setOption({
        grid: { left: 8, right: 16, top: 28, bottom: 8, containLabel: true },
        tooltip: Object.assign(tipBase(p), { trigger: "axis", axisPointer: { type: "shadow" }, formatter: function (a) { var r = an[a[0].dataIndex]; return "<b>" + esc(r.anio) + (r.estimado ? " (estimado)" : "") + "</b><br>" + money(num(r), "USD miles de millones"); } }),
        xAxis: axisCat(p, an.map(function (r) { return r.anio + (r.estimado ? "e" : ""); })), yAxis: axisVal(p),
        series: [{ type: "bar", barMaxWidth: 34, data: an.map(function (r) { return { value: num(r), itemStyle: { color: p.s[0], opacity: r.estimado ? .5 : 1, borderRadius: [4, 4, 0, 0] } }; }),
          label: { show: true, position: "top", color: p.ink2, fontSize: 11.5, formatter: function (x) { return fmt(x.value, 0); } } }]
      });
      note("nCapexA", "Miles de millones de US$. Barras tenues: estimación o guía (año marcado con «e»). " + (S.nota_anual ? esc(S.nota_anual) + " " : "") + srcNote(S));
    }
    var es = arr(B.empresas);
    fillPaises("fEmpPais", es.map(function (e) { return e.pais_iso3; }));
    var t = table("tEmpresas", [
      { t: "Empresa", v: function (e) { return e.nombre; }, h: function (e) { return "<b>" + esc(e.nombre) + "</b>" + (e.ticker ? ' <span class="mut">' + esc(e.ticker) + "</span>" : "") + (e.foco_ia ? '<br><span class="mut">' + esc(e.foco_ia) + "</span>" : ""); }, cls: "wide", asc: true },
      { t: "País", v: function (e) { return nombre(e.pais_iso3); }, h: function (e) { return esc(nombre(e.pais_iso3)); }, asc: true },
      { t: "Capex 2025", num: true, v: function (e) { return toBn(e.capex_2025); }, h: function (e) { return fig(e.capex_2025, { noWhen: true }); } },
      { t: "Capex 2026", num: true, tip: "Guía oficial de la empresa o consenso de analistas", v: function (e) { return toBn(e.capex_2026); }, h: function (e) { return fig(e.capex_2026, { noWhen: true }) + (e.capex_2026 && e.capex_2026.tipo ? '<br><span class="mut">' + esc(String(e.capex_2026.tipo).replace(/_/g, " ")) + "</span>" : ""); } },
      { t: "I+D 2025", num: true, v: function (e) { return toBn(e.id_2025); }, h: function (e) { return fig(e.id_2025, { noWhen: true }); } },
      { t: "Valor en bolsa", num: true, v: function (e) { return toBn(e.market_cap); }, h: function (e) { return fig(e.market_cap, { noWhen: true }); } }
    ], es, { sort: 3, rank: true, filter: function (e) { var s = norm($("qEmp").value), f = $("fEmpPais").value; return (!s || norm(e.nombre + " " + (e.ticker || "")).indexOf(s) >= 0) && (!f || e.pais_iso3 === f); } });
    hook(["qEmp", "fEmpPais"], t.redraw);
    var pr = arr(B.proyecciones);
    if (!pr.length) $("cardProy").style.display = "none";
    else table("tProyecciones", [
      { t: "Concepto", h: function (r) { return esc(r.concepto); }, cls: "wide" },
      { t: "Monto", num: true, h: function (r) {
        if (num(r) != null) return fig(r, { noWhen: true });
        var a = num(r.valor_min), b = num(r.valor_max);
        if (a == null && b == null) return '<span class="mut">—</span>';
        return "<b>" + (a != null && b != null ? money(a, r.unidad) + " – " + fmt(b) : a != null ? "más de " + money(a, r.unidad) : "hasta " + money(b, r.unidad)) + "</b>" + lv(r);
      } },
      { t: "Horizonte", h: function (r) { return esc(r.horizonte || ""); } },
      { t: "Fuente", h: function (r) { return link(r.fuente || "ver", r.url); } }
    ], pr);
  }

  // ---- LABS ----------------------------------------------------------------
  function labs() {
    var p = pal(), es = arr(L.empresas);
    var val = es.filter(function (e) { return num(e.valoracion) != null; }).sort(function (a, b) { return toBn(b.valoracion) - toBn(a.valoracion); });
    hbar("cValor", val.slice(0, 15).map(function (e) { return { name: e.nombre, value: toBn(e.valoracion), extra: when(e.valoracion) + (e.estado && /cotiza/i.test(e.estado) ? " · cotiza en bolsa" : "") }; }), { fmt: function (v) { return money(v, "USD miles de millones"); }, short: function (v) { return fmt(v, 0); } });
    note("nValor", val.length ? "Miles de millones de US$. Valoraciones reportadas en la última ronda u oferta; fuente de cada una en la tabla." : "");
    var vc = arr((L.series || {}).vc_ia_trimestral);
    if (!vc.length) noData("cVC"); else {
      mk("cVC").setOption({
        grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
        tooltip: Object.assign(tipBase(p), { trigger: "axis", axisPointer: { type: "shadow" }, formatter: function (a) { var r = vc[a[0].dataIndex]; return "<b>" + esc(String(r.periodo).replace("-Q", " T")) + "</b><br>" + money(num(r), "USD miles de millones") + (num(r.pct_vc_total) != null ? "<br>" + fmt(num(r.pct_vc_total), 0) + "% de todo el capital de riesgo" : ""); } }),
        xAxis: axisCat(p, vc.map(function (r) { return String(r.periodo).replace("-Q", " T"); }), { axisLabel: { color: p.ink2, fontSize: 11 } }), yAxis: axisVal(p),
        series: [{ type: "bar", barMaxWidth: 26, data: vc.map(num), itemStyle: { color: p.s[0], borderRadius: [4, 4, 0, 0] } }]
      });
      note("nVC", "Miles de millones de US$ por trimestre. " + srcNote(L.series));
    }
    fillPaises("fLabPais", es.map(function (e) { return e.pais_iso3; }));
    var t = table("tLabs", [
      { t: "Empresa", v: function (e) { return e.nombre; }, h: function (e) { return "<b>" + esc(e.nombre) + "</b>" + (e.estado && /cotiza/i.test(e.estado) ? ' <span class="tag">cotiza</span>' : "") + (e.categoria ? '<br><span class="mut">' + esc(e.categoria) + (e.fundacion ? " · " + esc(e.fundacion) : "") + "</span>" : ""); }, cls: "wide", asc: true },
      { t: "País", v: function (e) { return nombre(e.pais_iso3); }, h: function (e) { return esc(nombre(e.pais_iso3)); }, asc: true },
      { t: "Valoración", num: true, v: function (e) { return toBn(e.valoracion); }, h: function (e) { return fig(e.valoracion); } },
      { t: "Total recaudado", num: true, v: function (e) { return toBn(e.financiamiento_total); }, h: function (e) { return fig(e.financiamiento_total, { noWhen: true }); } },
      { t: "Última ronda", num: true, v: function (e) { return toBn(e.ultima_ronda); }, h: function (e) { return fig(e.ultima_ronda) + (e.ultima_ronda && e.ultima_ronda.lideres ? '<br><span class="mut">' + esc(e.ultima_ronda.lideres) + "</span>" : ""); } },
      { t: "Ingresos anualizados", num: true, v: function (e) { return toBn(e.ingresos_anualizados); }, h: function (e) { return fig(e.ingresos_anualizados); } }
    ], es, { sort: 2, rank: true, filter: function (e) { var s = norm($("qLab").value), f = $("fLabPais").value; return (!s || norm(e.nombre).indexOf(s) >= 0) && (!f || e.pais_iso3 === f); } });
    hook(["qLab", "fLabPais"], t.redraw);
    table("tRondas", [
      { t: "Empresa", v: function (r) { return r.empresa; }, h: function (r) { return "<b>" + esc(r.empresa) + "</b>"; }, asc: true },
      { t: "Monto", num: true, v: function (r) { return toBn(r); }, h: function (r) { return fig(r, { noWhen: true }); } },
      { t: "Fecha", v: function (r) { return String(r.fecha || ""); }, h: function (r) { return esc(r.fecha || ""); } },
      { t: "Inversores", h: function (r) { return esc(r.inversores || ""); }, cls: "wide" }
    ], arr(L.megarondas), { sort: 1, rank: true });
    var gp = arr(L.gasto_perdidas);
    if (!gp.length) $("cardGasto").style.display = "none"; else table("tGasto", [
      { t: "Empresa", v: function (r) { return r.empresa; }, h: function (r) { return "<b>" + esc(r.empresa) + "</b>"; }, asc: true },
      { t: "Concepto", h: function (r) { return esc(r.concepto || "") + (r.tipo ? ' <span class="tag">' + esc(r.tipo) + "</span>" : ""); }, cls: "wide" },
      { t: "Monto", num: true, v: function (r) { return toBn(r); }, h: function (r) { return fig(r); } }
    ], gp, { sort: 2 });
    var lr = [].concat.apply([], Object.keys(LA.latam_regional || {}).map(function (k) { return arr(LA.latam_regional[k]); }));
    if (!lr.length) $("cardLatReg").style.display = "none"; else table("tLatReg", [
      { t: "Indicador regional", h: function (r) { return esc(r.indicador || r.concepto || "") + (r.rondas ? ' <span class="mut">' + esc(r.rondas) + " rondas</span>" : ""); }, cls: "wide" },
      { t: "Valor", num: true, h: function (r) { return fig(r, { raw: !/usd|us\$/i.test(unitOf(r)) }); } }
    ], lr);
    table("tMega", [
      { t: "Proyecto", v: function (m) { return m.nombre; }, h: function (m) { return "<b>" + esc(m.nombre) + "</b>" + (m.promotores ? '<br><span class="mut">' + esc(m.promotores) + "</span>" : ""); }, cls: "wide", asc: true },
      { t: "Ubicación", v: function (m) { return nombre(m.pais_iso3); }, h: function (m) { return esc(m.lugar || "") + '<br><span class="mut">' + esc(nombre(m.pais_iso3)) + "</span>"; }, asc: true },
      { t: "Monto anunciado", num: true, v: function (m) { return toBn(m.monto); }, h: function (m) { return fig(m.monto, { noWhen: true }); } },
      { t: "Capacidad", num: true, v: function (m) { return num(m.capacidad_gw); }, h: function (m) { return num(m.capacidad_gw) != null ? fmt(num(m.capacidad_gw)) + " GW" : '<span class="mut">—</span>'; } },
      { t: "Estado", v: function (m) { return m.estado || ""; }, h: function (m) { return m.estado ? '<span class="tag">' + esc(m.estado) + "</span>" : ""; } },
      { t: "Fuente", h: function (m) { return link(m.fuente || (m.monto && m.monto.fuente) || "ver", m.url || (m.monto && m.monto.url)); } }
    ], arr(L.megaproyectos), { sort: 2, rank: true });
  }

  // ---- QUIÉN FINANCIA -------------------------------------------------------
  var TIPOS = { capital_riesgo: "Capital de riesgo", crecimiento: "Crecimiento", private_equity: "Private equity", gestora: "Gestora", soberano: "Fondo soberano", corporativo: "Corporativo", conglomerado: "Conglomerado" };
  function tipoNom(t) { return TIPOS[t] || String(t || "").replace(/_/g, " "); }
  function chips(a) { return arr(a).map(function (x) { return '<span class="tag">' + esc(typeof x === "string" ? x : (x.nombre || x.concepto || "")) + "</span>"; }).join(" "); }
  function dinero() {
    var fs = arr(I.fondos), tipos = {};
    fs.forEach(function (f) { if (f.tipo) tipos[f.tipo] = 1; });
    $("fFondoTipo").innerHTML = '<option value="">Todos los tipos</option>' + Object.keys(tipos).sort().map(function (t) { return '<option value="' + esc(t) + '">' + esc(tipoNom(t)) + "</option>"; }).join("");
    fillPaises("fFondoPais", fs.map(function (f) { return f.pais_iso3; }));
    var t = table("tFondos", [
      { t: "Inversor", v: function (f) { return f.nombre; }, h: function (f) { return "<b>" + esc(f.nombre) + "</b>" + (f.nota ? '<br><span class="mut">' + esc(f.nota) + "</span>" : ""); }, cls: "wide", asc: true },
      { t: "Tipo", v: function (f) { return tipoNom(f.tipo); }, h: function (f) { return '<span class="tag">' + esc(tipoNom(f.tipo)) + "</span>"; }, asc: true },
      { t: "País", v: function (f) { return nombre(f.pais_iso3); }, h: function (f) { return esc(nombre(f.pais_iso3)); }, asc: true },
      { t: "Activos / tamaño", num: true, tip: "Activos bajo gestión o tamaño del último fondo", v: function (f) { return toBn(f.aum); }, h: function (f) { return fig(f.aum); } },
      { t: "Comprometido a IA", num: true, v: function (f) { return toBn(f.comprometido_ia); }, h: function (f) { return fig(f.comprometido_ia) + (f.comprometido_ia && f.comprometido_ia.concepto ? '<br><span class="mut">' + esc(f.comprometido_ia.concepto) + "</span>" : ""); } },
      { t: "Apuestas en IA", h: function (f) { return chips(f.apuestas); }, cls: "wide" }
    ], fs, { sort: 4, rank: true, filter: function (f) {
      var q = norm($("qFondo").value), ty = $("fFondoTipo").value, pa = $("fFondoPais").value;
      return (!q || norm(f.nombre + " " + arr(f.apuestas).join(" ")).indexOf(q) >= 0) && (!ty || f.tipo === ty) && (!pa || f.pais_iso3 === pa);
    } });
    hook(["qFondo", "fFondoTipo", "fFondoPais"], t.redraw);

    var cs = arr(I.corporativos), tot = {};
    cs.forEach(function (r) { var v = toBn(r.monto); if (v != null && /usd|us\$/i.test(unitOf(r.monto))) { tot[r.inversor] = tot[r.inversor] || { v: 0, ps: [] }; tot[r.inversor].v += v; tot[r.inversor].ps.push(r.participada); } });
    hbar("cCorp", Object.keys(tot).map(function (k) { return { name: k, value: Math.round(tot[k].v * 100) / 100, extra: tot[k].ps.join(", ") }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 15), { color: 1, fmt: function (v) { return money(v, "USD miles de millones"); }, short: function (v) { return fmt(v); } });
    note("nCorp", cs.length ? "Suma de montos reportados por inversor, miles de millones de US$. Mezcla dinero ya invertido con compromisos futuros (ver columna «Tipo» en el detalle); parte se paga en créditos de nube o chips, no en efectivo." : "");
    table("tCorp", [
      { t: "Inversor", v: function (r) { return r.inversor; }, h: function (r) { return "<b>" + esc(r.inversor) + "</b>"; }, asc: true },
      { t: "Participada", v: function (r) { return r.participada; }, h: function (r) { return esc(r.participada) + (r.nota ? '<br><span class="mut">' + esc(r.nota) + "</span>" : ""); }, cls: "wide", asc: true },
      { t: "Monto", num: true, v: function (r) { return toBn(r.monto); }, h: function (r) { return fig(r.monto); } },
      { t: "Tipo", h: function (r) { return r.monto && r.monto.tipo ? '<span class="tag">' + esc(r.monto.tipo) + "</span>" : ""; } }
    ], cs, { sort: 2 });

    var ps = arr(I.personas);
    fillPaises("fPersPais", ps.map(function (r) { return r.pais_iso3; }));
    var tp = table("tPersonas", [
      { t: "Persona", v: function (r) { return r.nombre; }, h: function (r) { return "<b>" + esc(r.nombre) + "</b>" + (r.rol ? '<br><span class="mut">' + esc(r.rol) + "</span>" : ""); }, cls: "wide", asc: true },
      { t: "País", v: function (r) { return nombre(r.pais_iso3); }, h: function (r) { return esc(nombre(r.pais_iso3)); }, asc: true },
      { t: "Patrimonio", num: true, v: function (r) { return toBn(r.patrimonio); }, h: function (r) { return fig(r.patrimonio); } },
      { t: "Vehículos", h: function (r) { return chips(r.vehiculos); } },
      { t: "Apuestas en IA", h: function (r) { return arr(r.apuestas).slice(0, 5).map(function (a) { return typeof a === "string" ? esc(a) : esc(a.concepto || "") + (num(a.monto) != null ? " — " + fig(a.monto, { noWhen: true }) : ""); }).join("<br>") + (r.nota ? '<br><span class="mut">' + esc(r.nota) + "</span>" : ""); }, cls: "wide" }
    ], ps, { sort: 2, rank: true, filter: function (r) { var q = norm($("qPers").value), pa = $("fPersPais").value; return (!q || norm(r.nombre + " " + (r.rol || "")).indexOf(q) >= 0) && (!pa || r.pais_iso3 === pa); } });
    hook(["qPers", "fPersPais"], tp.redraw);

    var fl = arr(I.flujos);
    if (!fl.length) $("cardFlujos").style.display = "none";
    else table("tFlujos", [
      { t: "Concepto", h: function (r) { return esc(r.concepto); }, cls: "wide" },
      { t: "Valor", num: true, h: function (r) { return fig(r, { raw: !/usd|us\$/i.test(unitOf(r)), noWhen: true }); } },
      { t: "Periodo", h: function (r) { return esc(r.periodo || ""); } },
      { t: "Fuente", h: function (r) { return link(r.fuente || "ver", r.url); } }
    ], fl);
  }

  // ---- UNIVERSIDADES -------------------------------------------------------
  function rkNum(v) { if (v == null || v === "") return null; var f = parseFloat(String(v).replace(/[^0-9.]/, "")); return isFinite(f) ? f : null; }
  function uniCols(keys) {
    var names = rkNames();
    var cols = [
      { t: "Universidad", v: function (u) { return u.nombre; }, h: function (u) { return "<b>" + esc(u.nombre) + "</b>" + (u.ciudad ? '<br><span class="mut">' + esc(u.ciudad) + "</span>" : ""); }, cls: "wide", asc: true },
      { t: "País", v: function (u) { return nombre(u.pais_iso3); }, h: function (u) { return esc(nombre(u.pais_iso3)); }, asc: true }
    ];
    keys.forEach(function (k) {
      cols.push({ t: names[k] || k, num: true, asc: true, tip: "Posición en " + (names[k] || k),
        v: function (u) { return rkNum((u.rankings || {})[k]); },
        h: function (u) { var v = (u.rankings || {})[k]; return v == null || v === "" ? '<span class="mut">—</span>' : "#" + esc(v); } });
    });
    return cols;
  }
  function rkKeys(list) {
    var cnt = {}; list.forEach(function (u) { Object.keys(u.rankings || {}).forEach(function (k) { if (u.rankings[k] != null && u.rankings[k] !== "") cnt[k] = (cnt[k] || 0) + 1; }); });
    var order = arr((U.meta || {}).rankings).map(function (r) { return r.clave; });
    return Object.keys(cnt).sort(function (a, b) { var x = order.indexOf(a), y = order.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); });
  }
  function universidades() {
    var us = arr(U.universidades), keys = rkKeys(us);
    fillPaises("fUniPais", us.map(function (u) { return u.pais_iso3; }));
    var t = table("tUnis", uniCols(keys), us, { sort: keys.length ? 2 : 0, dir: 1, filter: function (u) { var s = norm($("qUni").value), f = $("fUniPais").value; return (!s || norm(u.nombre).indexOf(s) >= 0) && (!f || u.pais_iso3 === f); } });
    hook(["qUni", "fUniPais"], t.redraw);
    note("nUnis", arr((U.meta || {}).rankings).map(function (r) { return "<b>" + esc(r.corto || r.nombre) + "</b>: " + link((r.nombre || "") + (r.edicion ? " " + r.edicion : ""), r.url) + (r.metodo ? " — " + esc(r.metodo) : ""); }).join("<br>"));

    var pr = arr(U.produccion_pais).filter(function (r) { return num(r.publicaciones) != null; }).sort(function (a, b) { return num(b.publicaciones) - num(a.publicaciones); });
    hbar("cPubs", pr.slice(0, 15).map(function (r) { return { name: nombre(r.iso3), value: num(r.publicaciones), iso: r.iso3 }; }), { color: 2, fmt: function (v, it) { return fmt(v) + " " + (unitOf(pr[0].publicaciones) || "publicaciones"); } });
    if (pr.length) note("nPubs", esc(unitOf(pr[0].publicaciones) || "Publicaciones") + ", " + esc(when(pr[0].publicaciones)) + ". " + srcNote(pr[0].publicaciones));
    var cf = arr(U.conferencias).filter(function (r) { return num(r.papers) != null; });
    var conf = cf.length ? cf[0].conferencia : "";
    cf = cf.filter(function (r) { return r.conferencia === conf; }).sort(function (a, b) { return num(b.papers) - num(a.papers); });
    hbar("cConf", cf.slice(0, 15).map(function (r) { return { name: r.institucion, value: num(r.papers), extra: (r.tipo || "") + " · " + nombre(r.pais_iso3) }; }), { color: 0, fmt: function (v) { return fmt(v) + " papers"; } });
    if (cf.length) { $("tConf").textContent = "Papers aceptados en " + conf; note("nConf", "Incluye universidades y empresas. " + srcNote(cf[0])); }
    table("tTalento", [
      { t: "Indicador", h: function (r) { return esc(r.indicador); }, cls: "wide" },
      { t: "País", v: function (r) { return nombre(r.pais_iso3 || ""); }, h: function (r) { return r.pais_iso3 ? esc(nombre(r.pais_iso3)) : '<span class="mut">Mundo</span>'; }, asc: true },
      { t: "Valor", num: true, v: function (r) { return num(r); }, h: function (r) { return fig(r, { raw: true }); } }
    ], arr(U.talento));
    table("tInvUni", [
      { t: "Universidad", h: function (r) { return "<b>" + esc(r.universidad) + "</b><br><span class=\"mut\">" + esc(nombre(r.pais_iso3)) + "</span>"; } },
      { t: "Concepto", h: function (r) { return link(r.concepto || "", r.url); }, cls: "wide" },
      { t: "Monto", num: true, v: function (r) { return num(r.monto_usd_mm); }, h: function (r) { return num(r.monto_usd_mm) != null ? "<b>" + money(num(r.monto_usd_mm), "USD millones") + "</b>" : '<span class="mut">—</span>'; } },
      { t: "Año", num: true, v: function (r) { return num(r.anio); }, h: function (r) { return esc(r.anio || ""); } }
    ], arr(U.inversiones_universitarias), { sort: 2 });
  }

  // ---- LATAM ---------------------------------------------------------------
  function latam() {
    var il = IDX.ilia;
    if (il && arr(il.paises).length) {
      var ps = il.paises.filter(function (r) { return num(r.puntaje) != null; }).sort(function (a, b) { return num(b.puntaje) - num(a.puntaje); });
      hbar("cIlia", ps.map(function (r) { return { name: nombre(r.iso3), value: num(r.puntaje), iso: r.iso3 }; }), { color: 0, fmt: function (v) { return "Puntaje " + fmt(v); }, onClick: function (it) { ficha(it.iso); location.hash = "#mapa"; } });
      $("cIlia").style.height = Math.max(400, ps.length * 24) + "px"; if (charts.cIlia) charts.cIlia.resize();
      $("tIlia").textContent = (il.nombre || "Índice Latinoamericano de IA") + (il.edicion ? " · " + il.edicion : "");
      note("nIlia", "Puntaje " + esc(il.escala || "0-100") + ". Fuente: " + link(il.nombre || "ILIA", il.url) + ".");
    } else noData("cIlia");
    var ul = arr(U.latam);
    table("tUniLatam", uniCols(rkKeys(ul)), ul, { sort: 2, dir: 1 });
    table("tLatam", [
      { t: "País", v: function (r) { return nombre(r.iso3); }, h: function (r) { return '<a href="#mapa" data-iso="' + esc(r.iso3) + '"><b>' + esc(nombre(r.iso3)) + "</b></a>"; }, asc: true },
      { t: "Estrategia nacional", h: function (r) { var e = r.estrategia; return e && e.nombre ? link(e.nombre, e.url) + (e.anio ? ' <span class="mut">' + esc(e.anio) + "</span>" : "") : '<span class="mut">—</span>'; }, cls: "wide" },
      { t: "Monto anunciado", num: true, h: function (r) { var m = r.estrategia && r.estrategia.monto; return num(m) != null ? fig(m) + (m.moneda_original ? '<br><span class="mut">' + esc(m.moneda_original) + "</span>" : "") : '<span class="mut">—</span>'; } },
      { t: "I+D % PIB", num: true, v: function (r) { return num(r.gerd_pct_pib); }, h: function (r) { return num(r.gerd_pct_pib) != null ? "<b>" + fmt(num(r.gerd_pct_pib)) + "%</b>" + lv(r.gerd_pct_pib) : '<span class="mut">—</span>'; } },
      { t: "Anuncios de inversión", h: function (r) { return arr(r.anuncios).slice(0, 3).map(function (a) { return esc(a.empresa || "") + (num(a.monto) != null ? " " + fig(a.monto, { noWhen: true }) : "") + (a.fecha ? ' <span class="mut">' + esc(a.fecha) + "</span>" : ""); }).join("<br>") || '<span class="mut">—</span>'; }, cls: "wide" }
    ], arr(LA.latam), { sort: 0, dir: 1 });
    $("tLatam").onclick = function (e) { var a = e.target.closest("a[data-iso]"); if (a) ficha(a.getAttribute("data-iso")); };

    var pe = LA.peru, el = $("peruCard");
    if (!pe) { el.style.display = "none"; return; }
    function ul2(t, items, f) { return items.length ? "<div><h4>" + esc(t) + "</h4><ul>" + items.map(function (i) { return "<li>" + f(i) + "</li>"; }).join("") + "</ul></div>" : ""; }
    function any(i) { return typeof i === "string" ? esc(i) : (i.nombre || i.empresa || i.universidad || i.norma ? "<b>" + link(i.nombre || i.empresa || i.universidad || i.norma, i.url) + "</b>" : "") + (i.concepto || i.resumen || i.descripcion || i.programa || i.nota ? " — " + esc(i.concepto || i.resumen || i.descripcion || i.programa || i.nota) : "") + (num(i.monto) != null ? " " + fig(i.monto, { noWhen: true }) : "") + (i.fecha ? ' <span class="mut">' + esc(i.fecha) + "</span>" : ""); }
    el.innerHTML = "<h3>Perú, a detalle</h3>" + (pe.resumen ? '<p class="res">' + esc(pe.resumen) + "</p>" : "") + '<div class="cols">' +
      ul2("Indicadores", arr(pe.indicadores), function (i) { return esc(i.indicador) + ": " + fig(i, { raw: !/usd|us\$/i.test(unitOf(i)) }); }) +
      ul2("Marco legal", arr(pe.marco_legal), any) + ul2("Startups", arr(pe.startups), any) + ul2("Anuncios de inversión", arr(pe.anuncios), any) + ul2("Universidades", arr(pe.universidades), any) + "</div>";
  }

  // ---- FUENTES -------------------------------------------------------------
  function fuentes() {
    var seen = {}, fs = [], ad = [];
    [P, G, B, L, I, U, LA].forEach(function (blk) {
      var m = blk.meta || {};
      arr(m.fuentes_principales).concat(arr(m.rankings)).forEach(function (f) { var k = f.url || f.nombre; if (k && !seen[k]) { seen[k] = 1; fs.push(f); } });
      arr(m.advertencias).forEach(function (a) { ad.push(a); });
    });
    $("listaFuentes").innerHTML = fs.map(function (f) { return "<li>" + link(f.nombre || f.url, f.url) + (f.edicion ? ' <span class="mut">' + esc(f.edicion) + "</span>" : "") + "</li>"; }).join("") || "<li>—</li>";
    $("listaAdvert").innerHTML = ad.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") || "<li>—</li>";
  }

  // ---- arranque ------------------------------------------------------------
  var started = false;
  function renderAll() {
    kpis(); paises(); empresas(); labs(); dinero(); universidades(); latam();
    if (window.IA2) window.IA2.render();
    if (!started) { fuentes(); started = true; }
  }
  function boot() {
    // bloques cuyo JSON aún no existe: se oculta la sección y su enlace
    Array.prototype.forEach.call(document.querySelectorAll("section[data-block]"), function (sec) {
      var blk = D[sec.getAttribute("data-block")];
      if (blk && Object.keys(blk).length) return;
      sec.style.display = "none";
      var a = document.querySelector('.nav a[href="#' + sec.id + '"]'); if (a) a.style.display = "none";
    });
    buildIndex(); initBloques();
    var saved = null; try { saved = localStorage.getItem("ia-theme"); } catch (e) {}
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    $("themeBtn").addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", cur);
      try { localStorage.setItem("ia-theme", cur); } catch (e) {}
      drawMap(); renderAllCharts();
    });
    initMap();
    var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { Object.keys(charts).forEach(function (k) { charts[k].resize(); }); }, 120); });
  }
  // al cambiar de tema solo se redibujan los gráficos; las tablas usan CSS
  function renderAllCharts() {
    var keep = {}; ["qPais", "qEmp", "fEmpPais", "qLab", "fLabPais", "qUni", "fUniPais", "qFondo", "fFondoTipo", "fFondoPais", "qPers", "fPersPais"].forEach(function (i) { if ($(i)) keep[i] = $(i).value; });
    renderAll();
    Object.keys(keep).forEach(function (i) { $(i).value = keep[i]; });
  }

  window.IA = { table: table, hbar: hbar, mk: mk, pal: pal, fig: fig, link: link, note: note, lv: lv, noData: noData, axisCat: axisCat, axisVal: axisVal, tipBase: tipBase, fillPaises: fillPaises, hook: hook, charts: charts, srcNote: srcNote, drawMap: function () { drawMap(); },
    BLOQUES: BLOQUES, C: C, nombre: nombre, num: num, fmt: fmt, money: money, unitOf: unitOf, when: when, toBn: toBn, norm: norm, esc: esc, ficha: ficha, rkNames: rkNames, IDX: IDX };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

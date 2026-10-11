/* ============================================================================
   chat.js — Asistente de "¿Cuánto invierte el mundo en IA?"
   Responde con los datos reales de la página (motor local) y, para preguntas
   libres, usa el gateway ai.tunky.net (POST /v1/chat) con fallback local.
   ============================================================================ */
(function () {
  "use strict";
  var D = window.DATA || {}, IA = window.IA || {};
  var num = IA.num, fmt = IA.fmt, money = IA.money, unitOf = IA.unitOf, when = IA.when, toBn = IA.toBn, norm = IA.norm, esc = IA.esc, nombre = IA.nombre;
  var arr = function (x) { return Array.isArray(x) ? x : []; };

  // ---- CONFIG del gateway -------------------------------------------------
  // El gateway valida el Origin (unimauro.github.io ya permitido) y el header
  // X-Client-Token. Pega aquí un token DEDICADO del proyecto (ej. "ia_...")
  // para activar la IA en preguntas libres. Mientras esté vacío, el asistente
  // responde solo con el motor local (datos de la propia página).
  var GW = {
    url: "https://ai.tunky.net/v1/chat",
    token: "",   // ← pega aquí el token dedicado de ai.tunky.net para este informe
    system: "Eres el asistente del informe '¿Cuánto invierte el mundo en IA?' (corte: 11 de octubre de 2026). " +
      "Respondes en español, breve y claro, SOLO sobre inversión en inteligencia artificial: países, empresas, laboratorios, " +
      "inversionistas, megaproyectos de cómputo y universidades. Usa únicamente las cifras del CONTEXTO que sigue; " +
      "si el dato no está, dilo y no lo inventes. Distingue inversión privada, gasto público y capex corporativo: no son sumables. " +
      "No des asesoría de inversión."
  };
  // ------------------------------------------------------------------------

  var $ = function (id) { return document.getElementById(id); };
  var hist = [], open = false, busy = false, greeted = false;
  var mkEl = function (cls, html) { var d = document.createElement("div"); d.className = cls; if (html != null) d.innerHTML = html; return d; };

  function add(role, html, raw) { var log = $("chatLog"); log.appendChild(mkEl("msg " + role, raw ? html : esc(html))); log.scrollTop = log.scrollHeight; }
  function typing() { var log = $("chatLog"); var m = mkEl("msg bot", '<span class="typing"><i></i><i></i><i></i></span>'); log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }
  function suggest(items) {
    var wrap = mkEl("chat-suggest");
    items.forEach(function (q) { var b = document.createElement("button"); b.textContent = q; b.onclick = function () { wrap.remove(); handle(q); }; wrap.appendChild(b); });
    $("chatLog").appendChild(wrap); $("chatLog").scrollTop = $("chatLog").scrollHeight;
  }
  function greet() {
    if (greeted) return; greeted = true;
    add("bot", "¡Hola! Soy el asistente de datos de este informe. Pregúntame por un país, una empresa, un fondo, una persona o una universidad.");
    suggest(["¿Qué países invierten más?", "¿Cuánto gasta Microsoft?", "¿Quién financia a OpenAI?", "Compara G7 y BRICS", "¿Cómo está el Perú?", "Top universidades en IA"]);
  }

  // ------- utilidades de datos -------
  function m(o) { var n = num(o); return n == null ? null : money(n, unitOf(o)); }
  function top(list, get, n) { return list.filter(function (x) { return get(x) != null; }).sort(function (a, b) { return get(b) - get(a); }).slice(0, n || 5); }
  function find(list, t, key) {
    var best = null;
    arr(list).forEach(function (x) {
      var k = norm(x[key || "nombre"]); if (!k) return;
      var short = k.replace(/\b(inc|corp|corporation|group|holdings|university|universidad|of|the|de|la)\b/g, " ").replace(/\s+/g, " ").trim();
      if ((t.indexOf(k) >= 0 || (short.length >= 4 && new RegExp("\\b" + short.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(t))) && (!best || k.length > norm(best[key || "nombre"]).length)) best = x;
    });
    return best;
  }
  var ALIAS = { "eeuu": "USA", "ee.uu": "USA", "usa": "USA", "estados unidos": "USA", "reino unido": "GBR", "inglaterra": "GBR", "corea": "KOR", "emiratos": "ARE", "arabia": "SAU", "holanda": "NLD", "rusia": "RUS" };
  function paisFind(t) {
    for (var a in ALIAS) if (t.indexOf(a) >= 0) return ALIAS[a];
    var best = null, bl = 0;
    Object.keys(IA.C).forEach(function (i) { var n = norm(nombre(i)); if (n.length > 3 && t.indexOf(n) >= 0 && n.length > bl) { best = i; bl = n.length; } });
    return best;
  }
  function paisTxt(iso) {
    var x = IA.C[iso], L = [];
    if (!x) return null;
    if (m(x.priv)) L.push("• Inversión privada en IA: <b>" + m(x.priv) + "</b> (" + when(x.priv) + ")");
    if (m(x.acum)) L.push("• Privada acumulada: <b>" + m(x.acum) + "</b> (" + when(x.acum) + ")");
    if (m(x.pub)) L.push("• Presupuesto público anual en IA: <b>" + m(x.pub) + "</b> (" + when(x.pub) + ")");
    if (num(x.gerd) != null) L.push("• I+D total: <b>" + fmt(num(x.gerd)) + "% del PIB</b> (" + when(x.gerd) + ")");
    Object.keys(x.idx).forEach(function (k) { var v = x.idx[k]; if (v.rank != null) L.push("• " + esc((IA.IDX[k] || {}).nombre || k) + ": <b>puesto " + esc(v.rank) + "</b>"); });
    if (x.estrategia && x.estrategia.nombre) L.push("• Estrategia: " + esc(x.estrategia.nombre) + (x.estrategia.anio ? " (" + esc(x.estrategia.anio) + ")" : ""));
    if (x.compromisos.length) L.push("• Compromisos públicos: " + x.compromisos.slice(0, 3).map(function (k) { return esc(k.nombre) + (m(k) ? " " + m(k) : ""); }).join("; "));
    if (x.labs.length) L.push("• Laboratorios/startups: " + x.labs.slice(0, 5).map(function (e) { return esc(e.nombre); }).join(", "));
    if (x.unis.length) L.push("• Universidades: " + x.unis.slice(0, 4).map(function (u) { return esc(u.nombre); }).join(", "));
    if (x.proyectos.length) L.push("• Megaproyectos: " + x.proyectos.slice(0, 3).map(function (p) { return esc(p.nombre); }).join(", "));
    if (!L.length) return "No tengo datos verificados de <b>" + esc(nombre(iso)) + "</b> en este informe.";
    if (IA.ficha) IA.ficha(iso);
    return "<b>" + esc(nombre(iso)) + "</b>\n" + L.join("\n");
  }
  function bloqueTxt(b) {
    var t = 0, n = 0, tops = [];
    b.isos.forEach(function (i) { var x = IA.C[i]; if (x && num(x.priv) != null) { t += toBn(x.priv); n++; tops.push(i); } });
    tops.sort(function (a, c) { return toBn(IA.C[c].priv) - toBn(IA.C[a].priv); });
    if (!n) return "No hay inversión privada verificada para los países de <b>" + esc(b.label) + "</b>.";
    return "<b>" + esc(b.label) + "</b>: inversión privada en IA sumada de <b>" + money(t, "USD miles de millones") + "</b> (" + n + " de " + b.isos.length + " países con dato). Lideran: " +
      tops.slice(0, 4).map(function (i) { return esc(nombre(i)) + " " + m(IA.C[i].priv); }).join("; ") + ".";
  }

  // ------- motor local -------
  function localAnswer(q) {
    var t = norm(q);
    var B = D.bigtech || {}, L = D.labs || {}, U = D.unis || {}, I = D.inv || {}, LA = D.latam || {};

    if (/^(hola|buenas|hey|que tal|buenos dias|buenas tardes)/.test(t)) return "¡Hola! Pregúntame por un país, una empresa, un fondo, una persona o una universidad.";
    if (/(fuente|de donde|confiable|inventa|metodolog)/.test(t)) return "Cada cifra enlaza a su fuente y lleva un nivel: <b>A</b> primaria u oficial, <b>B</b> prensa confiable, <b>C</b> estimación de terceros. Lo que no se pudo verificar no aparece. Mira la sección “Cómo leer este informe”.";

    // bloques
    var bs = arr(IA.BLOQUES).filter(function (b) { return b.isos; });
    var hit = bs.filter(function (b) { return ({ g7: /\bg ?[78]\b/, ue: /(union europea|\bue\b|europa)/, brics: /brics/, pot: /(potencias|emergentes)/, golfo: /(golfo|petrodolar)/, asia: /asia/, latam: /(latinoamerica|america latina|latam)/, africa: /africa/ }[b.id] || /$^/).test(t); });
    if (hit.length) return hit.map(bloqueTxt).join("\n\n") + (hit.length > 1 ? "\n\nLos bloques comparten miembros: no se suman entre sí." : "");

    // entidades con nombre
    var per = find(I.personas, t);
    if (per) return "<b>" + esc(per.nombre) + "</b>" + (per.rol ? " — " + esc(per.rol) : "") + (m(per.patrimonio) ? "\n• Patrimonio estimado: <b>" + m(per.patrimonio) + "</b> (" + when(per.patrimonio) + ")" : "") +
      (arr(per.vehiculos).length ? "\n• Vehículos: " + esc(per.vehiculos.join(", ")) : "") +
      arr(per.apuestas).slice(0, 5).map(function (a) { return "\n• " + (typeof a === "string" ? esc(a) : esc(a.concepto || "") + (m(a.monto) ? ": <b>" + m(a.monto) + "</b>" : "")); }).join("");
    if (/(quien financia|quien invierte en|inversores de|inversionistas de|accionistas de|quien esta detras)/.test(t)) {
      var lab0 = find(L.empresas, t);
      if (lab0) {
        var cs = arr(I.corporativos).filter(function (r) { return norm(r.participada).indexOf(norm(lab0.nombre)) >= 0; });
        var fs = arr(I.fondos).filter(function (f) { return arr(f.apuestas).some(function (a) { return norm(a).indexOf(norm(lab0.nombre)) >= 0; }); });
        var out = "<b>Quién financia a " + esc(lab0.nombre) + "</b>";
        if (lab0.ultima_ronda && lab0.ultima_ronda.lideres) out += "\n• Última ronda (" + (m(lab0.ultima_ronda) || "") + ", " + when(lab0.ultima_ronda) + "): " + esc(lab0.ultima_ronda.lideres);
        if (cs.length) out += "\n• Tecnológicas: " + cs.map(function (r) { return esc(r.inversor) + (m(r.monto) ? " " + m(r.monto) : ""); }).join("; ");
        if (fs.length) out += "\n• Fondos: " + fs.slice(0, 10).map(function (f) { return esc(f.nombre); }).join(", ");
        return out;
      }
    }
    var emp = find(B.empresas, t);
    if (emp) return "<b>" + esc(emp.nombre) + "</b> (" + esc(nombre(emp.pais_iso3)) + ")" +
      (m(emp.capex_2025) ? "\n• Capex 2025: <b>" + m(emp.capex_2025) + "</b>" : "") +
      (m(emp.capex_2026) ? "\n• Capex 2026 (" + esc(String((emp.capex_2026.tipo || "estimado")).replace(/_/g, " ")) + "): <b>" + m(emp.capex_2026) + "</b>" : "") +
      (m(emp.id_2025) ? "\n• I+D 2025: <b>" + m(emp.id_2025) + "</b>" : "") +
      (emp.foco_ia ? "\n" + esc(emp.foco_ia) : "") + "\nOjo: son montos totales de la empresa, no solo de IA.";
    var lab = find(L.empresas, t);
    if (lab) return "<b>" + esc(lab.nombre) + "</b> (" + esc(nombre(lab.pais_iso3)) + ")" +
      (m(lab.valoracion) ? "\n• Valoración: <b>" + m(lab.valoracion) + "</b> (" + when(lab.valoracion) + ")" : "") +
      (m(lab.financiamiento_total) ? "\n• Total recaudado: <b>" + m(lab.financiamiento_total) + "</b>" : "") +
      (m(lab.ultima_ronda) ? "\n• Última ronda: <b>" + m(lab.ultima_ronda) + "</b> (" + when(lab.ultima_ronda) + ")" + (lab.ultima_ronda.lideres ? ", lidera " + esc(lab.ultima_ronda.lideres) : "") : "") +
      (m(lab.ingresos_anualizados) ? "\n• Ingresos anualizados: <b>" + m(lab.ingresos_anualizados) + "</b> (" + when(lab.ingresos_anualizados) + ")" : "") +
      (lab.nota ? "\n" + esc(lab.nota) : "");
    var fon = find(I.fondos, t);
    if (fon) return "<b>" + esc(fon.nombre) + "</b> (" + esc(nombre(fon.pais_iso3)) + ")" + (m(fon.aum) ? "\n• Activos / tamaño: <b>" + m(fon.aum) + "</b> (" + when(fon.aum) + ")" : "") +
      (m(fon.comprometido_ia) ? "\n• Comprometido a IA: <b>" + m(fon.comprometido_ia) + "</b>" : "") + (arr(fon.apuestas).length ? "\n• Apuestas: " + esc(fon.apuestas.join(", ")) : "") + (fon.nota ? "\n" + esc(fon.nota) : "");
    var uni = find(arr(U.universidades).concat(arr(U.latam)), t);
    if (uni) { var names = IA.rkNames(), r = uni.rankings || {}; return "<b>" + esc(uni.nombre) + "</b> (" + esc(nombre(uni.pais_iso3)) + ")\n" + Object.keys(r).filter(function (k) { return r[k] != null && r[k] !== ""; }).map(function (k) { return "• " + esc(names[k] || k) + ": <b>#" + esc(r[k]) + "</b>"; }).join("\n"); }

    // listas
    if (/(universidad|campus|donde estudiar)/.test(t)) {
      var us = arr(U.universidades).slice(0, 10);
      return us.length ? "<b>Universidades líderes en IA</b> (orden de la tabla):\n" + us.map(function (u, i) { return (i + 1) + ". " + esc(u.nombre) + " — " + esc(nombre(u.pais_iso3)); }).join("\n") + "\nCada ranking mide algo distinto; mira las columnas en la sección Universidades." : null;
    }
    if (/(magnate|millonario|multimillonario|rico|persona|quien pone|dueno)/.test(t)) {
      var ps = top(arr(I.personas), function (p) { return toBn(p.patrimonio); }, 8);
      return ps.length ? "<b>Personas con más patrimonio vinculadas a la IA</b>:\n" + ps.map(function (p, i) { return (i + 1) + ". " + esc(p.nombre) + " — " + m(p.patrimonio) + (p.rol ? " · " + esc(p.rol) : ""); }).join("\n") : null;
    }
    if (/(fondo|soberano|venture|capital de riesgo|\bvc\b|inversionista|inversor)/.test(t)) {
      var ff = top(arr(I.fondos), function (f) { return toBn(f.comprometido_ia); }, 8);
      return ff.length ? "<b>Mayores compromisos declarados a IA</b>:\n" + ff.map(function (f, i) { return (i + 1) + ". " + esc(f.nombre) + " (" + esc(nombre(f.pais_iso3)) + ") — " + m(f.comprometido_ia); }).join("\n") + "\nSon anuncios, no dinero ya desembolsado." : null;
    }
    if (/(startup|laboratorio|valoracion|unicornio|mas valios)/.test(t)) {
      var ls = top(arr(L.empresas), function (e) { return toBn(e.valoracion); }, 8);
      return ls.length ? "<b>Empresas de IA más valiosas</b>:\n" + ls.map(function (e, i) { return (i + 1) + ". " + esc(e.nombre) + " — " + m(e.valoracion) + " (" + when(e.valoracion) + ")"; }).join("\n") : null;
    }
    if (/(ronda|levanto|recaudo)/.test(t)) {
      var rs = top(arr(L.megarondas), function (r) { return toBn(r); }, 6);
      return rs.length ? "<b>Las rondas más grandes</b>:\n" + rs.map(function (r, i) { return (i + 1) + ". " + esc(r.empresa) + " — " + m(r) + " (" + esc(r.fecha || "") + ")"; }).join("\n") : null;
    }
    if (/(centro de datos|data center|datacenter|megaproyecto|stargate|gigavat|\bgw\b|computo)/.test(t)) {
      var mp = top(arr(L.megaproyectos), function (x) { return toBn(x.monto); }, 6);
      return mp.length ? "<b>Megaproyectos de cómputo más grandes (anunciados)</b>:\n" + mp.map(function (x, i) { return (i + 1) + ". " + esc(x.nombre) + " — " + m(x.monto) + (x.capacidad_gw ? ", " + fmt(num(x.capacidad_gw)) + " GW" : "") + " · " + esc(nombre(x.pais_iso3)); }).join("\n") : null;
    }
    if (/(empresa|capex|big ?tech|hiperescalador|compania|corporaci)/.test(t)) {
      var es = top(arr(B.empresas), function (e) { return toBn(e.capex_2026) != null ? toBn(e.capex_2026) : toBn(e.capex_2025); }, 8);
      return es.length ? "<b>Empresas con mayor capex</b>:\n" + es.map(function (e, i) { return (i + 1) + ". " + esc(e.nombre) + " — " + (m(e.capex_2026) ? m(e.capex_2026) + " (2026)" : m(e.capex_2025) + " (2025)"); }).join("\n") + "\nCapex total de la empresa, no solo IA." : null;
    }
    var iso = paisFind(t);
    if (iso) return paisTxt(iso);
    if (/(pais|paises|quien invierte mas|ranking|lider|mundo|global|cuanto)/.test(t)) {
      var cs2 = top(Object.keys(IA.C).map(function (i) { return IA.C[i]; }), function (x) { return num(x.priv) != null ? toBn(x.priv) : null; }, 8);
      var g = arr((D.privada || {}).series && D.privada.series.global), gl = g[g.length - 1];
      return cs2.length ? (gl ? "La inversión privada mundial en IA fue de <b>" + money(num(gl), "USD miles de millones") + "</b> en " + gl.anio + ".\n" : "") + "<b>Países con más inversión privada</b>:\n" +
        cs2.map(function (x, i) { return (i + 1) + ". " + esc(nombre(x.iso)) + " — " + m(x.priv); }).join("\n") : null;
    }
    return null; // sin coincidencia → gateway
  }

  // contexto compacto para el gateway: los top de cada bloque
  function contexto() {
    var qs = ["¿Qué países invierten más?", "empresas capex", "startups más valiosas", "fondos", "magnates", "megaproyectos", "universidades", "peru", "g7", "brics"];
    return qs.map(function (q) { var a = localAnswer(q); return a ? a.replace(/<[^>]+>/g, "") : ""; }).filter(Boolean).join("\n\n").slice(0, 6000);
  }
  function pick(data) {
    if (!data) return ""; if (typeof data === "string") return data;
    return data.reply || data.message || data.content || data.answer || (data.choices && data.choices[0] && (data.choices[0].message ? data.choices[0].message.content : data.choices[0].text)) || "";
  }
  function gateway() {
    return fetch(GW.url, {
      method: "POST", headers: { "Content-Type": "application/json", "X-Client-Token": GW.token },
      body: JSON.stringify({ messages: [{ role: "system", content: GW.system + "\n\nCONTEXTO:\n" + contexto() }].concat(hist.slice(-10)) })
    }).then(function (res) {
      return res.text().then(function (raw) { var data; try { data = JSON.parse(raw); } catch (e) { data = raw; } if (!res.ok) throw new Error("HTTP " + res.status); return pick(data); });
    });
  }
  function fallback() { return "No tengo ese dato verificado, así que prefiero no inventarlo. Prueba con un país (“Japón”), una empresa (“Nvidia”), un laboratorio (“Anthropic”), un fondo (“SoftBank”), un bloque (“G7”, “BRICS”) o “top universidades”."; }

  function handle(text) {
    text = (text || "").trim(); if (!text || busy) return;
    add("me", text); hist.push({ role: "user", content: text });
    busy = true; $("chatSend").disabled = true;
    var tp = typing();
    var done = function (html) {
      tp.remove(); add("bot", html, true);
      hist.push({ role: "assistant", content: html.replace(/<[^>]+>/g, "") });
      busy = false; $("chatSend").disabled = false; $("chatInput").focus();
    };
    var local = null; try { local = localAnswer(text); } catch (e) { local = null; }
    if (local) { setTimeout(function () { done(local); }, 220); return; }
    if (!GW.token) { setTimeout(function () { done(fallback()); }, 220); return; }
    gateway().then(function (reply) { done(reply && reply.trim() ? esc(reply) : fallback()); }).catch(function () { done(fallback()); });
  }

  function toggle(v) {
    open = (v == null) ? !open : v;
    var panel = $("chatPanel");
    panel.classList.toggle("open", open); panel.setAttribute("aria-hidden", open ? "false" : "true");
    $("chatbtn").style.display = open ? "none" : "";
    if (open) { greet(); setTimeout(function () { $("chatInput").focus(); }, 180); }
  }
  function boot() {
    $("chatbtn").addEventListener("click", function () { toggle(true); });
    $("chatClose").addEventListener("click", function () { toggle(false); });
    $("chatForm").addEventListener("submit", function (e) { e.preventDefault(); var v = $("chatInput").value; $("chatInput").value = ""; handle(v); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) toggle(false); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

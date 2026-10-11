# IA Top Inversiones — ¿Cuánto invierte el mundo en IA?

Informe interactivo sobre la inversión mundial en inteligencia artificial, con corte al **11 de octubre de 2026**.

**Sitio:** https://unimauro.github.io/ia-inversiones/

## Qué incluye

- **Mapa mundial interactivo** con capas por indicador (inversión privada, presupuesto público, índices de preparación, I+D) y ficha por país.
- **Países y bloques**: G7/G8, Unión Europea, BRICS+, Golfo, Asia-Pacífico, América Latina, África.
- **Empresas**: capex e I+D de las grandes tecnológicas; laboratorios y startups por valoración.
- **Quién pone el dinero**: fondos de riesgo, gestoras, fondos soberanos, corporativos y personas.
- **Noticias de capital**: rondas de 2026 en infraestructura y servicios, dónde se levanta y rentabilidad.
- **Energía, centros de datos y chips**: consumo eléctrico, costo por MW, GPU, fábricas, memorias, entrenamiento y modelos de negocio.
- **Simulador de estrategia nacional**: traduce un % del PIB de cualquier país a GPU, MW, investigadores y rondas.
- **Universidades**: ranking abierto por producción científica en IA (OpenAlex, CC0) con vistas Mundo, América Latina y España, y Perú, apoyado en los rankings propios [universidades-latam](https://unimauro.github.io/universidades-latam/) y [universidades-peru](https://unimauro.github.io/universidades-peru/); los rankings comerciales (QS, THE, US News, Shanghái, CSRankings) quedan como contraste. Se regenera con `python3 scripts/pull_openalex_ia.py`.
- **Talento**, **América Latina y Perú**, FAQ y asistente de datos.

## Regla de datos

No se inventan cifras. Cada dato es un objeto `{valor, unidad, anio, fuente, url, nivel}`:

| Nivel | Significado |
|---|---|
| A | Fuente primaria u oficial |
| B | Fuente secundaria confiable |
| C | Estimación de terceros |

## Estructura

```
index.html
assets/        app.js, app2.js, chat.js, styles.css, world.json (Natural Earth)
data/raw/      un JSON por bloque de investigación
data/data.js   generado: window.DATA
scripts/build_data.py
```

Tras editar `data/raw/*.json`:

```bash
python3 scripts/build_data.py
python3 -m http.server 8000   # http://localhost:8000
```

## Asistente

`assets/chat.js` responde con los datos de la página. Para preguntas libres usa el gateway `ai.tunky.net`: pegar un token dedicado en `GW.token`.

## Créditos

Desarrollo e investigación de datos: Carlos Cárdenas · carlos@cardenas.pe
Mapa base: Natural Earth (dominio público). PIB y población: Banco Mundial.

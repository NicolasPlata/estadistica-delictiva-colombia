# Sistema de Diseño: Criterium Analytics

Este documento indexa las especificaciones visuales del proyecto y define, de forma vinculante, cómo el frontend (Fase 2 y 4 de `03-plan-desarrollo-frontend.md`) debe consumirlas antes de construir mockups o componentes.

*   **[DESIGN-dark.md](./DESIGN-dark.md):** Export original del tema oscuro ("Criterium Analytics Dark"). Tema **por defecto**, alineado con RNF-04.
*   **[DESIGN-light.md](./DESIGN-light.md):** Export original del tema claro ("Criterium Analytics").

Ambos archivos se conservan **sin modificar** como material de referencia (probablemente exports de una herramienta de diseño). La sección de "Reconciliación" de este documento es la que manda a la hora de implementar: donde la prosa de esos dos archivos entra en conflicto con su propio frontmatter, o entre sí, **este documento resuelve el conflicto y su tabla de tokens es la fuente de verdad**.

## Estrategia de Theming
El frontend implementa el cambio de tema mediante variables CSS conmutadas por `data-theme="dark" | "light"` en la raíz, con `prefers-color-scheme` como valor inicial (ambos scopes deben declararse, con el `data-theme` ganando sobre la preferencia del SO). Cada rol semántico de la tabla siguiente se traduce a **una única variable CSS** cuyo valor cambia por tema — los componentes se escriben contra el rol (`var(--surface-card)`), nunca contra el hex ni contra el nombre crudo del token M3 (`primary`, `secondary`, etc.).

---

## ✅ Reconciliación 1 — Rol semántico del acento interactivo

**Problema:** `primary` no significa lo mismo en los dos archivos. En oscuro es un celeste de acento; en claro es un navy casi negro (el azul de acción real vive en `secondary`). Mapear `--color-primary` 1:1 por nombre habría vuelto el botón principal celeste en un tema y casi negro en el otro.

**Resolución — capa de roles funcionales, no nombres M3:**

| Rol funcional | Uso | Oscuro (token → hex) | Claro (token → hex) |
|---|---|---|---|
| `accent-interactive` (bg) | Botón primario, elemento activo del nav, chip seleccionado | `primary-container` → `#38bdf8` | `secondary-container` → `#2170e4` |
| `accent-interactive` (on) | Texto/ícono sobre el anterior | `on-primary-container` → `#004965` | `on-secondary-container` → `#fefcff` |
| `accent-subtle` (bg/texto) | Links, íconos, anillo de foco, acentos de baja énfasis | `primary` → `#8ed5ff` / `on-primary` → `#00354a` | `secondary` → `#0058be` / `on-secondary` → `#ffffff` |

Regla estructural (para que no se repita el problema): en **cada** tema, `accent-interactive` toma la variante `*-container` de la familia tonal que ese tema usa como acento de marca, y `accent-subtle` toma la variante base de esa misma familia. Así el par queda simétrico entre temas aunque los nombres M3 de origen difieran (`primary-container` en oscuro vs. `secondary-container` en claro).

**Superficies estructurales (sidebar/header) — revisado tras ver el mockup:** la primera versión de este documento proponía usar `primary-container` (`#1e293b`, Deep Slate — navy oscuro) como fondo del sidebar/header **incluso en tema claro**, siguiendo literalmente la prosa de `DESIGN-light.md` ("Primary... para navegación estructural, headers"). Al verlo construido en Figma, el resultado no leía como un tema claro — el panel y la barra superior seguían oscuros y la diferencia entre temas no se notaba. **Se descarta esa decisión.** Ahora `surface-panel` usa la misma familia de token (`surface-container-low`) en ambos temas, igual que `surface-card` ya hacía — sin excepciones de marca que reintroduzcan oscuridad en el tema claro. Ver tabla corregida abajo.

## ✅ Reconciliación 2 — Prosa vs. frontmatter

**Problema:** la prosa de ambos archivos cita hexadecimales de Tailwind (`#0f172a`, `#1e293b`, `#334155`, `#3B82F6`, `#F8FAFC`...) que no existen en su propio frontmatter — parecen placeholders genéricos de una plantilla, no los tokens reales generados para esta marca.

**Resolución:** de aquí en adelante, **la tabla de roles funcionales de este documento (arriba, y la de superficies/tipografía más abajo) es la única fuente de verdad para hex e implementación.** La prosa de `DESIGN-dark.md`/`DESIGN-light.md` se conserva como *intención de diseño* (qué comunica cada color, qué "siente" la marca) pero ningún hex mencionado ahí debe copiarse directo a código — siempre pasar por el rol funcional correspondiente en esta tabla.

| Rol funcional | Oscuro | Claro |
|---|---|---|
| `surface-canvas` (fondo de página) | `background` → `#0b1326` | `background` → `#f8f9ff` |
| `surface-panel` (sidebar, header, toolbars) | `surface-container-low` → `#131b2e` | `surface-container-low` → `#eff4ff` |
| `surface-panel-on` (texto/ícono sobre el anterior) | `on-surface` → `#dae2fd` | `on-surface` → `#0b1c30` |
| `surface-card` (tarjetas, tooltips, paneles flotantes) | `surface-container-high` → `#222a3d` | `surface-container-high` → `#dce9ff` |
| `surface-card-hover` | `surface-container-highest` → `#2d3449` | `surface-container-highest` → `#d3e4fe` |
| `text-primary` | `on-surface` → `#dae2fd` | `on-surface` → `#0b1c30` |
| `text-secondary` | `on-surface-variant` → `#bdc8d1` | `on-surface-variant` → `#45474c` |
| `border` | `outline-variant` → `#3e484f` | `outline-variant` → `#c5c6cd` |
| `error` | `error` → `#ffb4ab` | `error` → `#ba1a1a` |

## ✅ Reconciliación 3 — Rampa del choropleth/heatmap (HU-1.02)

**Problema:** `DESIGN-dark.md` proponía una rampa **divergente** Rosa↔Esmeralda (dos tonos) para representar densidad delictiva. Densidad de delitos es una **magnitud** (cuánto), no una **polaridad** (bien/mal a ambos lados de un punto medio) — usar una rampa divergente ahí es un error metodológico de visualización de datos, y roja↔verde es además el peor caso para daltonismo (deuteranopía/protanopía). `DESIGN-light.md` ya proponía algo más cercano a lo correcto (secuencial, amarillo→rojo) pero no estaba definida en pasos concretos, y no coincidía en filosofía con la versión oscura.

**Resolución:** rampa **secuencial de un solo tono** (familia roja, coherente con el token `error` ya existente en ambos temas) en los dos modos, validada con el script `validate_palette.js` del skill de dataviz (`--ordinal`, que exige L monotónica, saltos ΔL ≥ 0.06, contraste del extremo "cercano a cero" ≥ 2:1 contra la superficie, y un solo tono):

| Paso (baja→alta densidad) | Claro | Oscuro |
|---|---|---|
| 1 (mínimo) | `#e59595` | `#ff8a80` |
| 2 | `#d97070` | `#e37070` |
| 3 | `#cc4d4d` | `#c85c5c` |
| 4 | `#a81717` | `#a34450` |
| 5 (máximo) | `#701010` | `#7a3b45` |

*Nota de dirección (revisada 2026-08-07):* pedido explícito del usuario — "más oscuro = más peligroso" debe leerse igual en ambos temas, no relativo a la superficie. El paso 5 (máximo) es el color más **oscuro** en los dos modos; el paso 1 (mínimo) es el más **claro**. Esto reemplaza la regla original ("el extremo recede hacia la superficie, en polos opuestos de luminosidad según el tema") — la rampa de oscuro se invirtió (mismos 5 tonos, orden de pasos invertido) para lograrlo. La rampa de claro no cambió: ya cumplía la regla nueva de casualidad, sin necesidad de tocarla.

*Validación:* los 5 tonos por tema son los mismos que ya pasaban `validate_palette.js --ordinal` (L monotónica, ΔL ≥ 0.06, un solo tono) — invertir el orden de asignación a los pasos no cambia el set de colores ni su ΔL entre pasos consecutivos, así que ambos siguen pasando. El único check que sí cambia de extremo es "contraste ≥ 2:1 contra la superficie en el paso más cercano a cero": en oscuro ese paso ahora es `#ff8a80` (antes `#7a3b45`), con *más* contraste contra `#0b1326`, no menos — el check sigue pasando con margen mayor.
```
node validate_palette.js "#e59595,#d97070,#cc4d4d,#a81717,#701010" --ordinal --mode light --surface "#f8f9ff"
node validate_palette.js "#ff8a80,#e37070,#c85c5c,#a34450,#7a3b45" --ordinal --mode dark --surface "#0b1326"
```

**Sin datos (HU-1.02):** municipios/departamentos sin registros en el filtro actual se pintan con `border` a 40% de opacidad sobre `surface-canvas` (no un color de la rampa) — nunca un color de la rampa en el extremo bajo, que sí representa "densidad mínima *reportada*", una categoría distinta de "sin dato".

## ✅ Hallazgo adicional — falta paleta de estado (Chips/Badges)

Ambos archivos piden en su sección de Componentes chips de estado en verde/rojo ("Status Chips", "Chips/Badges") pero **ningún token de éxito (verde) existe en ninguno de los dos frontmatters** — solo hay `error`/`tertiary`. Se adopta la paleta de estado fija y ya validada del skill de dataviz (mismos 4 pasos en ambos temas, contraste recalculado contra las superficies reales de este proyecto):

| Rol | Hex | Contraste vs. `surface-canvas` claro (`#f8f9ff`) | Contraste vs. `surface-canvas` oscuro (`#0b1326`) |
|---|---|---|---|
| `status-good` | `#0ca30c` | 3.19 | 5.51 |
| `status-warning` | `#fab219` | 1.75 ⚠️ | 10.08 |
| `status-serious` | `#ec835a` | 2.51 ⚠️ | 7.01 |
| `status-critical` | `#d03b3b` | 4.57 | 3.85 |

⚠️ = por debajo de 3:1 en claro **por diseño** (igual que en el default del skill) — estos dos **siempre** van acompañados de ícono + etiqueta de texto, nunca de color solo, tal como exige HU-3.03 y el propio criterio de accesibilidad del skill de dataviz.

## ✅ Reconciliación 4 — Paleta categórica para comparación (HU-3.04, RF-09)

**Problema:** RF-09 ("comparar visualmente datos de diferentes periodos o regiones de manera paralela") no tenía ningún token asociado — ni la rampa de choropleth (es secuencial, para magnitud) ni la paleta de estado (reservada a good/warning/serious/critical) sirven para esto: comparar dos regiones/periodos es **identidad** (Serie A vs. Serie B), no magnitud ni estado, así que corresponde una paleta **categórica** de 2 colores por el criterio del skill de dataviz.

Se usan los slots 1 (azul) y 2 (naranja) de la paleta categórica default del skill — ya validados como par adyacente en su documentación — recalculados contra las superficies reales de este proyecto:

| Rol | Claro | Oscuro |
|---|---|---|
| `comparacion-serie-a` | `#2a78d6` | `#3987e5` |
| `comparacion-serie-b` | `#eb6834` | `#d95926` |

*Validación (`--mode <light\|dark> --surface <superficie real>`):* ambos pasan los 5 checks categóricos en los dos temas — banda de luminosidad, piso de croma, separación CVD (ΔE 24.7-26.8, muy por encima del objetivo de 8), piso de visión normal (ΔE 31.8-33.6) y contraste ≥3:1 contra `surface-canvas`.

**Regla de uso:** estos 2 colores están **reservados** para HU-3.04 (comparación) — no se reutilizan como "serie 3" en ningún otro gráfico ni como acento decorativo, siguiendo la regla del skill de "el color sigue a la entidad, nunca a su rango".

---

## ✅ Reconciliación 5 — Paleta categórica para distribución de género (HU-3.01)

**Problema:** el donut de género del panel de KPIs necesita 3 colores de identidad (Masculino/Femenino/No reportado) — es otro caso categórico, pero no puede reutilizar los slots 1-2 (`comparacion-serie-a/b`, reservados exclusivamente para HU-3.04) ni la familia roja (ya cargada de significado en esta app: rampa del choropleth y `status-critical`).

Se probaron combinaciones de 3 slots de la paleta categórica default del skill que evitan 1, 2 y la familia roja (slot 8), validadas con `--pairs all` (un donut muestra todas las porciones a la vez, así que aplica el gate "todos contra todos", no solo adyacente) contra las superficies reales de ambos temas. Los slots 4/6/7 (amarillo/verde/violeta) son los que pasan limpio en los dos modos:

| Rol | Claro | Oscuro |
|---|---|---|
| `genero-masculino` (slot 6, verde) | `#008300` | `#008300` |
| `genero-femenino` (slot 7, violeta) | `#4a3aa7` | `#9085e9` |
| `genero-no-reportado` (slot 4, amarillo) | `#eda100` | `#c98500` |

*Validación (`--pairs all --mode <light\|dark> --surface <superficie real>`):* separación CVD peor-caso ΔE 6.9-16.2 (banda 6-8 en oscuro, legal con codificación secundaria — el donut siempre lleva leyenda + etiquetas directas, nunca depende solo del color), piso de visión normal ΔE 15.6-30.3 (por encima del piso de 15), contraste ≥3:1 en oscuro (en claro el amarillo queda en 2.06:1 — alivio ya cubierto por las etiquetas del donut).

**Regla de uso:** reservados para distribución de género en el panel de KPIs — no se combinan en el mismo gráfico con `comparacion-serie-a/b` (no ocurre en la app: son paneles distintos) ni se reutiliza el slot 8 (rojo) para evitar confundirse con el significado ya establecido de "densidad alta"/"crítico".

---

## ✅ Hallazgo adicional — límite departamental de referencia en el mapa (HU-1.04)

**Problema:** en la vista de Municipio, el mapa solo dibuja los límites municipales (grises, HU-1.02) — el usuario pierde toda referencia visual de a qué departamento pertenece cada municipio, dificultando la lectura macro que HU-1.04 promete ("analizar los datos a nivel macro... sin importar el nivel de zoom"). No es un caso de paleta de datos (no codifica una magnitud/categoría/estado) — es una línea cartográfica fija de "chrome", así que no aplican los 4 checks categóricos del skill de dataviz punto por punto, pero sí se validó el único que importa para una línea decorativa: contraste contra la superficie real.

**Resolución:** un único tono fijo (`limite-departamental`), reservado y no reutilizado en ningún otro rol — no puede ser rojo (choropleth/`status-critical`), azul (`accent-interactive`, ya usado para resaltar la región seleccionada de HU-3.03), ni ninguno de los tonos ya cargados de significado (comparación, género, estado). Se eligió **teal**, la única familia de tono todavía libre en la app:

| Rol | Claro | Oscuro |
|---|---|---|
| `limite-departamental` | `#047857` | `#0d9488` |

*Validación (`validate_palette.js --mode <light\|dark> --surface <superficie real>`, un solo color):* banda de luminosidad, piso de croma y contraste (≥3:1) en verde en ambos temas.

**Regla de uso:** siempre visible sobre el mapa, en las dos granularidades — línea **sólida** (no discontinua: a la escala de país completo, un patrón discontinuo se vuelve ilegible) de 2px, por encima de la capa de límites municipales/departamentales normal. No es interactiva (sin hover/click propio) y nunca se reutiliza para otro propósito.

---

## Tipografía, Radios y Espaciado
Sin conflicto entre temas — se usan tal cual del frontmatter de cada archivo (`typography`, `rounded`, `spacing`). Único punto de atención: `DESIGN-dark.md` y `DESIGN-light.md` tienen escalas tipográficas ligeramente distintas (ej. dark trae `display-lg`/`headline-lg-mobile`/`code-sm`; light trae `headline-sm`/`data-mono` en su lugar). Al construir el mapeo a Tailwind, unificar el **nombre** de cada escala (`headline-sm`, etc.) entre ambos temas aunque el `fontSize`/`lineHeight` no cambie con el tema — la tipografía no debería variar por tema, solo el color.

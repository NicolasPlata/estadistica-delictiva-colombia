# Dashboard Geoespacial de Estadística Delictiva

## 1. Contexto y Visión General
El presente proyecto consiste en el diseño, arquitectura y desarrollo integral de un **Dashboard de Estadística Delictiva de Colombia**, concebido desde cero como una pieza central para un portafolio profesional de ingeniería de software. 

La herramienta permite explorar, filtrar y visualizar millones de registros de actos delictivos ocurridos entre los años 2020 y 2025 a nivel nacional. Destaca por su capacidad de renderizar datos espacialmente (Choropleth/Mapas de calor) y proveer analítica de manera dinámica y ultrarrápida.

## 2. El Problema (Desafío Técnico)
Trabajar con datos geoespaciales y millones de registros estadísticos (Open Data de la Policía Nacional) suele implicar infraestructuras pesadas y costosas:
1. **Volumen de Datos:** Procesar más de 4.5 millones de filas de datos tabulares (archivos de Excel masivos).
2. **Latencia y Renderizado:** Cargar polígonos complejos (como los 1,122 municipios de Colombia) junto con sus datos estadísticos típicamente congestiona la memoria del navegador o satura los servidores GIS tradicionales (ej. GeoServer), traduciéndose en una mala experiencia de usuario y altos costos de hosting.
3. **Falta de Estructura:** La data cruda gubernamental carece de normalización, lo que dificulta su indexación y análisis cruzado en bases de datos relacionales.

## 3. La Solución (Enfoque del Proyecto)
Se ha diseñado una plataforma Full-Stack de **alto rendimiento y bajo coste computacional**, optimizada explícitamente para destacar en entornos "Free-Tier" (Capa Gratuita) y mostrar habilidades avanzadas de ingeniería:

*   **ETL Riguroso:** Implementación de flujos de estandarización en Python para limpiar, tipificar y enriquecer los datos crudos, cruzándolos algorítmicamente con los códigos geográficos oficiales del DANE.
*   **Base de Datos Espacial:** Uso de **PostgreSQL + PostGIS** para delegar la carga de agregación analítica y cruce de polígonos directamente a la base de datos, garantizando tiempos de respuesta mínimos.
*   **Backend Híper-Eficiente:** Construcción de una API RESTful en **Rust** (Axum/Actix-Web). Rust garantiza seguridad en el manejo de memoria (Memory Safety) y permite empaquetar grandes volúmenes de datos en formatos optimizados (Vector Tiles / GeoJSON) con un consumo de RAM casi imperceptible en el servidor.
*   **Frontend Interactivo:** Desarrollo de una interfaz "Premium" (Dark Theme, Glassmorphism) utilizando **React** y **MapLibre GL JS**, que renderiza los mapas usando la GPU del dispositivo del cliente (WebGL), alcanzando 60 FPS sin ralentizaciones.

## 4. Audiencia Objetivo y Casos de Uso
1. **Reclutadores Técnicos y Líderes de Ingeniería:** Quienes evaluarán la limpieza del código, la toma de decisiones arquitectónicas (ADRs), el performance (Rust + PostGIS) y el dominio de bases de datos espaciales.
2. **Analistas de Datos / Usuarios Finales:** Quienes interactuarán con la plataforma para:
   * Evaluar la evolución anual y mensual de delitos por municipio o departamento.
   * Identificar perfiles de criminalidad a través de KPIs de género, tipo de delito y arma utilizada.
   * Visualizar los puntos de mayor concentración delictiva de manera intuitiva.

## 5. Estructura de la Documentación
Para garantizar un desarrollo escalable e integrable por cualquier equipo de software, el conocimiento del producto se rige por la siguiente documentación profesional:
*   `requirements/requerimientos.md`: Reglas de performance, alcance y dependencias.
*   `requirements/historias-usuario.md`: Perspectiva ágil del comportamiento del frontend.
*   `requirements/reglas-negocio.md`: La lógica inquebrantable del trato de la información.
*   `architecture/01-arquitectura.md` y `02-api-contracts.md`: Planos del sistema.

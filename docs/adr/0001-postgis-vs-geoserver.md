# ADR 0001: PostGIS vs GeoServer

## Contexto
Se requiere servir geometría de municipios y departamentos (miles de polígonos) al frontend de manera eficiente y a bajo costo (arquitectura serverless/free-tier).

## Decisión
Se decidió utilizar **PostgreSQL + PostGIS** conectado directamente a un backend en **Rust** (que genere MVT/GeoJSON al vuelo), en lugar de desplegar un servidor GIS pesado como **GeoServer**.

## Consecuencias
- Reducción drástica en costos de infraestructura y consumo de memoria RAM.
- Mayor velocidad de respuesta.
- Se requiere escribir las consultas SQL espaciales manualmente en Rust.

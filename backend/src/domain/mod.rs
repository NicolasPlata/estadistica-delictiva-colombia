//! Entidades y reglas de negocio puras. Sin dependencias de axum ni sqlx
//! (sí de `serde`, una excepción pragmática documentada en cada struct).

pub mod breakdown;
pub mod delito_categoria;
pub mod evolution;
pub mod filters;
pub mod granularidad;
pub mod kpis;
pub mod map_stats;
pub mod metrica;
pub mod vocabulario;

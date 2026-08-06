//! Entidades y reglas de negocio puras. Sin dependencias de axum ni sqlx
//! (sí de `serde`, una excepción pragmática documentada en cada struct).

pub mod evolution;
pub mod filters;
pub mod kpis;
pub mod vocabulario;

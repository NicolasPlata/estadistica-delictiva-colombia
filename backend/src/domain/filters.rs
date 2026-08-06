use serde::Deserialize;

/// Rango histórico válido del dataset (RN-06, `reglas-negocio.md`). Se usa
/// como default cuando el usuario no acota `anio_inicio`/`anio_fin` pero se
/// necesita un rango concreto para cálculos derivados (ej. "periodo anterior"
/// para `variacion_porcentual`, HU-3.01).
pub const ANIO_MIN: i32 = 2020;
pub const ANIO_MAX: i32 = 2025;

/// Filtros globales que cruzan toda la app (RF-05, HU-2.01/2.02/2.03).
/// Todos los campos son opcionales por diseño — un `GlobalFilters` vacío
/// significa "sin filtrar". Implementa `Deserialize` directamente (una
/// excepción pragmática a "domain sin dependencias de framework": `serde`
/// es una librería de serialización, no de infraestructura como axum/sqlx,
/// y separar un DTO idéntico solo para evitar el derive sería una
/// abstracción sin beneficio real en este tamaño de proyecto).
#[derive(Debug, Default, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "snake_case", default)]
pub struct GlobalFilters {
    pub anio_inicio: Option<i32>,
    pub anio_fin: Option<i32>,
    pub departamento_id: Option<i32>,
    pub municipio_id: Option<i32>,
    pub delitos: Option<Vec<String>>,
    pub genero: Option<String>,
    pub grupo_edad: Option<String>,
    pub arma_medio: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserializes_full_payload() {
        let json = r#"{
            "anio_inicio": 2020,
            "anio_fin": 2025,
            "departamento_id": 11,
            "municipio_id": 11001,
            "delitos": ["HURTO A PERSONAS"],
            "genero": "FEMENINO",
            "grupo_edad": "DE 18 ANOS Y MAS",
            "arma_medio": "ARMA DE FUEGO"
        }"#;

        let filters: GlobalFilters = serde_json::from_str(json).unwrap();

        assert_eq!(filters.anio_inicio, Some(2020));
        assert_eq!(filters.anio_fin, Some(2025));
        assert_eq!(filters.departamento_id, Some(11));
        assert_eq!(filters.municipio_id, Some(11001));
        assert_eq!(filters.delitos, Some(vec!["HURTO A PERSONAS".to_string()]));
        assert_eq!(filters.genero, Some("FEMENINO".to_string()));
        assert_eq!(filters.grupo_edad, Some("DE 18 ANOS Y MAS".to_string()));
        assert_eq!(filters.arma_medio, Some("ARMA DE FUEGO".to_string()));
    }

    #[test]
    fn deserializes_empty_payload_as_all_none() {
        let filters: GlobalFilters = serde_json::from_str("{}").unwrap();

        assert_eq!(filters, GlobalFilters::default());
    }

    #[test]
    fn deserializes_partial_payload() {
        let json = r#"{ "anio_inicio": 2023, "genero": "MASCULINO" }"#;

        let filters: GlobalFilters = serde_json::from_str(json).unwrap();

        assert_eq!(filters.anio_inicio, Some(2023));
        assert_eq!(filters.genero, Some("MASCULINO".to_string()));
        assert_eq!(filters.anio_fin, None);
        assert_eq!(filters.delitos, None);
    }
}

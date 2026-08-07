use std::collections::HashMap;

use serde::Serialize;

/// Respuesta de `POST /api/v1/stats/kpi` (`02-api-contracts.md` §2.1,
/// HU-3.01). `delito_mas_comun`/`mes_mayor_impacto` son `Option` porque un
/// conjunto de filtros sin ningún registro (ej. un municipio sin datos en
/// el rango de años elegido) no tiene un "más común" que reportar.
/// `variacion_porcentual` también es `Option` (no siempre `f64`, ver
/// `application::get_kpis`): `None` cuando el "periodo anterior" a
/// comparar cae fuera del rango real del dataset (RN-06, 2020-2025) — ej.
/// al filtrar "todos los años" o solo el primer año — porque ahí no hay
/// ningún dato con el que comparar, ni siquiera cero real; mostrar un
/// número (incluso +100%) sería afirmar una comparación que no existe.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct Kpis {
    pub total_delitos: i64,
    pub variacion_porcentual: Option<f64>,
    pub delito_mas_comun: Option<String>,
    pub mes_mayor_impacto: Option<String>,
    pub distribucion_genero: HashMap<String, i64>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn serializes_with_snake_case_keys_matching_api_contract() {
        let kpis = Kpis {
            total_delitos: 450210,
            variacion_porcentual: Some(5.4),
            delito_mas_comun: Some("HURTO A PERSONAS".to_string()),
            mes_mayor_impacto: Some("2023-07".to_string()),
            distribucion_genero: HashMap::from([("MASCULINO".to_string(), 210000)]),
        };

        let json = serde_json::to_value(&kpis).unwrap();

        assert_eq!(json["total_delitos"], 450210);
        assert_eq!(json["variacion_porcentual"], 5.4);
        assert_eq!(json["delito_mas_comun"], "HURTO A PERSONAS");
        assert_eq!(json["mes_mayor_impacto"], "2023-07");
        assert_eq!(json["distribucion_genero"]["MASCULINO"], 210000);
    }

    #[test]
    fn serializes_variacion_porcentual_as_null_when_none() {
        let kpis = Kpis {
            total_delitos: 100,
            variacion_porcentual: None,
            delito_mas_comun: None,
            mes_mayor_impacto: None,
            distribucion_genero: HashMap::new(),
        };

        let json = serde_json::to_value(&kpis).unwrap();

        assert!(json["variacion_porcentual"].is_null());
    }
}

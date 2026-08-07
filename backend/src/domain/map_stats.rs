use std::collections::HashMap;

use serde::Serialize;

use crate::domain::granularidad::Granularidad;

/// Respuesta de `POST /api/v1/map/stats` (`02-api-contracts.md` §3.2).
/// `data` mapea código de región (string, sin ceros a la izquierda) → un
/// valor numérico cuyo significado depende de `Metrica` (cantidad absoluta
/// de delitos, o tasa por 100.000 habitantes — Fase 6, RN-12) — solo
/// regiones con dato disponible para la métrica pedida aparecen (RN-09 y
/// ADR 0002 para `Absoluta`; RN-12 también excluye por población
/// desconocida/cero cuando la métrica es `Tasa`). `f64` en vez de `i64`
/// porque una tasa es inherentemente decimal (ej. `312.4`) — para
/// `Absoluta` el valor sigue siendo un entero exacto, solo que representado
/// como `f64` (sin riesgo de precisión: los conteos de este dataset están
/// muy por debajo de los ~9×10^15 que `f64` representa de forma exacta).
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct MapStats {
    pub granularidad: Granularidad,
    pub data: HashMap<String, f64>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn serializes_with_snake_case_keys_matching_api_contract() {
        let stats = MapStats {
            granularidad: Granularidad::Departamento,
            data: HashMap::from([("11".to_string(), 240832.0), ("5".to_string(), 583421.0)]),
        };

        let json = serde_json::to_value(&stats).unwrap();

        assert_eq!(json["granularidad"], "DEPARTAMENTO");
        assert_eq!(json["data"]["11"], 240832.0);
        assert_eq!(json["data"]["5"], 583421.0);
    }

    #[test]
    fn serializes_tasa_values_with_decimals() {
        let stats = MapStats {
            granularidad: Granularidad::Municipio,
            data: HashMap::from([("11001".to_string(), 312.4)]),
        };

        let json = serde_json::to_value(&stats).unwrap();

        assert_eq!(json["data"]["11001"], 312.4);
    }
}

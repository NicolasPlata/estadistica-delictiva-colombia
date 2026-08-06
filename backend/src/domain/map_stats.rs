use std::collections::HashMap;

use serde::Serialize;

use crate::domain::granularidad::Granularidad;

/// Respuesta de `POST /api/v1/map/stats` (`02-api-contracts.md` §3.2).
/// `data` mapea código de región (string, sin ceros a la izquierda) →
/// `cantidad` — solo regiones con registros en el filtro actual aparecen
/// (RN-09 y ADR 0002: el backend no rellena ceros para regiones sin datos).
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct MapStats {
    pub granularidad: Granularidad,
    pub data: HashMap<String, i64>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn serializes_with_snake_case_keys_matching_api_contract() {
        let stats = MapStats {
            granularidad: Granularidad::Departamento,
            data: HashMap::from([("11".to_string(), 240832), ("5".to_string(), 583421)]),
        };

        let json = serde_json::to_value(&stats).unwrap();

        assert_eq!(json["granularidad"], "DEPARTAMENTO");
        assert_eq!(json["data"]["11"], 240832);
        assert_eq!(json["data"]["5"], 583421);
    }
}

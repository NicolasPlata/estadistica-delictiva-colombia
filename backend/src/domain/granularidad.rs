use serde::{Deserialize, Serialize};

/// Nivel de agregación geográfica (RF-03, HU-1.04) — compartido por
/// `GET /api/v1/map/geometry/{granularidad}` (path param) y
/// `POST /api/v1/map/stats` (campo del body y, ecoado, de la respuesta).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Granularidad {
    Departamento,
    Municipio,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserializes_from_uppercase_strings() {
        assert_eq!(
            serde_json::from_str::<Granularidad>(r#""DEPARTAMENTO""#).unwrap(),
            Granularidad::Departamento
        );
        assert_eq!(
            serde_json::from_str::<Granularidad>(r#""MUNICIPIO""#).unwrap(),
            Granularidad::Municipio
        );
    }

    #[test]
    fn serializes_back_to_uppercase_strings() {
        assert_eq!(
            serde_json::to_value(Granularidad::Departamento).unwrap(),
            "DEPARTAMENTO"
        );
        assert_eq!(
            serde_json::to_value(Granularidad::Municipio).unwrap(),
            "MUNICIPIO"
        );
    }
}

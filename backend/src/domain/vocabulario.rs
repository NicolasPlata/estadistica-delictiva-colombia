use serde::Serialize;

/// Vocabulario fijo para poblar los 4 selectores del sidebar (RF-05,
/// HU-2.02, HU-2.03) — respuesta de `GET /api/v1/metadata/filtros`
/// (`02-api-contracts.md` §4.1). Mismo razonamiento que `GlobalFilters`
/// sobre por qué lleva un derive de `serde` directamente.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct FiltrosVocabulario {
    pub delitos: Vec<String>,
    pub armas_medios: Vec<String>,
    pub generos: Vec<String>,
    pub grupos_edad: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_with_snake_case_keys_matching_api_contract() {
        let vocab = FiltrosVocabulario {
            delitos: vec!["HURTO A PERSONAS".to_string()],
            armas_medios: vec!["ARMA DE FUEGO".to_string()],
            generos: vec!["MASCULINO".to_string()],
            grupos_edad: vec!["DE 18 ANOS Y MAS".to_string()],
        };

        let json = serde_json::to_value(&vocab).unwrap();

        assert_eq!(json["delitos"][0], "HURTO A PERSONAS");
        assert_eq!(json["armas_medios"][0], "ARMA DE FUEGO");
        assert_eq!(json["generos"][0], "MASCULINO");
        assert_eq!(json["grupos_edad"][0], "DE 18 ANOS Y MAS");
    }
}

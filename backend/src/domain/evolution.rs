use serde::{Deserialize, Serialize};

/// Granularidad temporal de `/api/v1/stats/evolution` (HU-3.02/HU-3.03).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Agrupacion {
    Anual,
    Mensual,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct EvolutionPoint {
    pub periodo: String,
    pub cantidad: i64,
}

/// Respuesta de `POST /api/v1/stats/evolution` (`02-api-contracts.md` §2.2).
/// `region_label` es "Nacional" sin filtro geográfico, el nombre del
/// departamento/municipio si se filtró por uno (municipio tiene prioridad
/// si ambos están presentes — ver `application::get_evolution`).
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct Evolution {
    pub region_label: String,
    pub series: Vec<EvolutionPoint>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn agrupacion_deserializes_from_uppercase_strings() {
        assert_eq!(
            serde_json::from_str::<Agrupacion>(r#""ANUAL""#).unwrap(),
            Agrupacion::Anual
        );
        assert_eq!(
            serde_json::from_str::<Agrupacion>(r#""MENSUAL""#).unwrap(),
            Agrupacion::Mensual
        );
    }

    #[test]
    fn evolution_serializes_with_snake_case_keys_matching_api_contract() {
        let evolution = Evolution {
            region_label: "BOGOTÁ, D.C.".to_string(),
            series: vec![
                EvolutionPoint {
                    periodo: "2020".to_string(),
                    cantidad: 85000,
                },
                EvolutionPoint {
                    periodo: "2021".to_string(),
                    cantidad: 91000,
                },
            ],
        };

        let json = serde_json::to_value(&evolution).unwrap();

        assert_eq!(json["region_label"], "BOGOTÁ, D.C.");
        assert_eq!(json["series"][0]["periodo"], "2020");
        assert_eq!(json["series"][0]["cantidad"], 85000);
        assert_eq!(json["series"][1]["periodo"], "2021");
    }
}

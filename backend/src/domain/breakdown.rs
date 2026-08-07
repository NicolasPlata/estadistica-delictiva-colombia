use serde::Serialize;

/// Fila de `Breakdown.por_delito` — un delito homologado con su categoría
/// padre ya resuelta (Fase 7, RN-04), para que el cliente no necesite
/// conocer la taxonomía de `domain::delito_categoria` para agrupar.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct DelitoCantidad {
    pub delito: String,
    pub categoria: String,
    pub cantidad: i64,
}

/// Fila de `Breakdown.por_categoria` — ya agregado por categoría padre,
/// listo para alimentar la gráfica de pastel directamente (8 categorías
/// como máximo, nunca 47).
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct CategoriaCantidad {
    pub categoria: String,
    pub cantidad: i64,
}

/// Respuesta de `POST /api/v1/stats/breakdown` (Fase 7). `por_delito`
/// alimenta la tabla (detalle completo, ordenable en el cliente);
/// `por_categoria` alimenta el pastel ya agregado.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct Breakdown {
    pub region_label: String,
    pub por_delito: Vec<DelitoCantidad>,
    pub por_categoria: Vec<CategoriaCantidad>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_with_snake_case_keys_matching_api_contract() {
        let breakdown = Breakdown {
            region_label: "ANTIOQUIA".to_string(),
            por_delito: vec![DelitoCantidad {
                delito: "ARTICULO 239. HURTO PERSONAS".to_string(),
                categoria: "Delitos contra el Patrimonio Económico".to_string(),
                cantidad: 142031,
            }],
            por_categoria: vec![CategoriaCantidad {
                categoria: "Delitos contra el Patrimonio Económico".to_string(),
                cantidad: 198450,
            }],
        };

        let json = serde_json::to_value(&breakdown).unwrap();

        assert_eq!(json["region_label"], "ANTIOQUIA");
        assert_eq!(json["por_delito"][0]["delito"], "ARTICULO 239. HURTO PERSONAS");
        assert_eq!(json["por_delito"][0]["categoria"], "Delitos contra el Patrimonio Económico");
        assert_eq!(json["por_delito"][0]["cantidad"], 142031);
        assert_eq!(json["por_categoria"][0]["categoria"], "Delitos contra el Patrimonio Económico");
        assert_eq!(json["por_categoria"][0]["cantidad"], 198450);
    }
}

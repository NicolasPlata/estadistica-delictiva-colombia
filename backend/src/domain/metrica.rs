use serde::{Deserialize, Serialize};

/// Unidad en la que se expresa `MapStats.data` (Fase 6, RN-12 de
/// `reglas-negocio.md`) — `Absoluta` es el conteo de delitos tal cual
/// (comportamiento por default, sin cambios respecto al contrato previo);
/// `Tasa` normaliza por población (`delitos por cada 100.000 habitantes`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Deserialize, Serialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Metrica {
    #[default]
    Absoluta,
    Tasa,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_to_absoluta() {
        assert_eq!(Metrica::default(), Metrica::Absoluta);
    }

    #[test]
    fn deserializes_from_uppercase_strings() {
        assert_eq!(
            serde_json::from_str::<Metrica>(r#""ABSOLUTA""#).unwrap(),
            Metrica::Absoluta
        );
        assert_eq!(
            serde_json::from_str::<Metrica>(r#""TASA""#).unwrap(),
            Metrica::Tasa
        );
    }
}

/// Categoría padre de un delito homologado (Fase 7, RN-04 de
/// `reglas-negocio.md`) — agrupa los 47 delitos reales de la base (ya
/// homologados por `scripts/migrations/0001_...`) en 8 categorías por
/// título del Código Penal, para que la gráfica de pastel del desglose
/// (HU nueva, Fase 7) sea legible. Mapeo estático a propósito, no una
/// tabla en la base de datos: son 47 valores fijos que no cambian en
/// tiempo de ejecución, mismo precedente que la homologación de RN-03
/// (vive como `UPDATE`s en una migración, no como tabla de referencia).
///
/// Taxonomía aprobada por el usuario el 2026-08-07 (ver
/// `docs/plans/04-plan-desarrollo-funcionalidades-v2.md` Hito 7.1) — no
/// modificar la agrupación sin repetir esa aprobación, es contenido de
/// dominio, no una decisión técnica.
pub fn categoria_de(delito: &str) -> &'static str {
    match delito {
        "ARTICULO 103. HOMICIDIO"
        | "ARTICULO 104A. FEMINICIDIO"
        | "ARTICULO 109. HOMICIDIO CULPOSO ( EN ACCIDENTE DE TRANSITO)"
        | "ARTICULO 110. HOMICIDIO CULPOSO ( CIRCUNSTANCIAS DE AGRAVACION)"
        | "ARTICULO 111. LESIONES PERSONALES"
        | "ARTICULO 112. INCAPACIDAD PARA TRABAJAR O ENFERMEDAD"
        | "ARTICULO 113. DEFORMIDAD"
        | "ARTICULO 114. PERTURBACION FUNCIONAL"
        | "ARTICULO 115. LESIONES CON PERTURBACION PSIQUICA TRANSITORIA"
        | "ARTICULO 116. PERDIDA ANATOMICA O FUNCIONAL DE UN ORGANO O MIEMBRO"
        | "ARTICULO 119. LESIONES PERSONALES ( CIRCUNSTANCIAS DE AGRAVACION)"
        | "ARTICULO 120. LESIONES CULPOSAS ( EN ACCIDENTE DE TRANSITO )"
        | "ARTICULO 125. LESIONES AL FETO"
        | "ARTICULO 126. LESIONE CULPOSAS AL FETO"
        | "ARTICULO 136. LESIONES EN PERSONA PROTEGIDA" => "Delitos contra la Vida e Integridad Personal",

        "ARTICULO 205. ACCESO CARNAL VIOLENTO"
        | "ARTICULO 206. ACTO SEXUAL VIOLENTO"
        | "ARTICULO 207. ACCESO CARNAL O ACTO SEXUAL EN PERSONA PUESTA EN INCAPACIDAD DE RESISTIR"
        | "ARTICULO 208. ACCESO CARNAL ABUSIVO CON MENOR DE 14 ANOS"
        | "ARTICULO 209. ACTOS SEXUALES CON MENOR DE 14 ANOS"
        | "ARTICULO 210 A. ACOSO SEXUAL"
        | "ARTICULO 210. ACCESO CARNAL O ACTO SEXUAL ABUSIVO CON INCAPAZ DE RESISTIR"
        | "ARTICULO 211. ACCESO CARNAL ABUSIVO CON MENOR DE 14 ANOS (CIRCUNSTANCIAS AGRAVACION)"
        | "ARTICULO 213 A. PROXENETISMO CON MENOR DE EDAD"
        | "ARTICULO 213. INDUCCION A LA PROSTITUCION"
        | "ARTICULO 214. CONSTRENIMIENTO A LA PROSTITUCION"
        | "ARTICULO 216. INDUCCION A LA PROSTITUCION (CIRCUNSTANCIAS AGRAVACION)"
        | "ARTICULO 217 A. DEMANDA DE EXPLOTACION SEXUAL COMERCIAL DE PERSONA MENOR DE 18 ANOS DE EDAD"
        | "ARTICULO 217. ESTIMULO A LA PROSTITUCION DE MENORES DE 14 ANOS"
        | "ARTICULO 218. PORNOGRAFIA CON MENORES DE 14 ANOS"
        | "ARTICULO 219 A. UTILIZACION O FACILITACION DE MEDIOS DE COMUNICACION PARA OFRECER SERVICIOS SEXUALES DE MENORES"
        | "ARTICULO 219 B. OMISION DE DENUNCIA" => "Delitos Sexuales",

        "ARTICULO 229. VIOLENCIA INTRAFAMILIAR" => "Violencia Intrafamiliar",

        "ARTICULO 239. HURTO AUTOMOTORES"
        | "ARTICULO 239. HURTO ENTIDADES COMERCIALES"
        | "ARTICULO 239. HURTO ENTIDADES FINANCIERAS"
        | "ARTICULO 239. HURTO MOTOCICLETAS"
        | "ARTICULO 239. HURTO PERSONAS"
        | "ARTICULO 239. HURTO PIRATERIA TERRESTRE"
        | "ARTICULO 239. HURTO RESIDENCIAS"
        | "ARTICULO 243. ABIGEATO" => "Delitos contra el Patrimonio Económico",

        "ARTICULO 168. SECUESTRO SIMPLE" | "ARTICULO 169. SECUESTRO EXTORSIVO" => "Secuestro",

        "ARTICULO 244. EXTORSION" => "Extorsión",

        "ARTICULO 144. ACTOS DE TERRORISMO" | "ARTICULO 343. TERRORISMO" => "Terrorismo",

        "ARTICULO 347. AMENAZAS" => "Amenazas",

        // No debería ocurrir contra los 47 delitos homologados reales de
        // la base (ver el test de integración en
        // infrastructure::postgres_stats_repository que audita esto
        // contra la base de datos real) — cubre defensivamente un delito
        // nuevo que aparezca tras un futuro re-ETL sin que el endpoint
        // reviente.
        _ => "Otros",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn categorizes_a_known_delito_from_each_of_the_8_categorias() {
        assert_eq!(categoria_de("ARTICULO 103. HOMICIDIO"), "Delitos contra la Vida e Integridad Personal");
        assert_eq!(categoria_de("ARTICULO 205. ACCESO CARNAL VIOLENTO"), "Delitos Sexuales");
        assert_eq!(categoria_de("ARTICULO 229. VIOLENCIA INTRAFAMILIAR"), "Violencia Intrafamiliar");
        assert_eq!(categoria_de("ARTICULO 239. HURTO PERSONAS"), "Delitos contra el Patrimonio Económico");
        assert_eq!(categoria_de("ARTICULO 168. SECUESTRO SIMPLE"), "Secuestro");
        assert_eq!(categoria_de("ARTICULO 244. EXTORSION"), "Extorsión");
        assert_eq!(categoria_de("ARTICULO 343. TERRORISMO"), "Terrorismo");
        assert_eq!(categoria_de("ARTICULO 347. AMENAZAS"), "Amenazas");
    }

    #[test]
    fn falls_back_to_otros_for_an_unknown_delito() {
        assert_eq!(categoria_de("ALGO QUE NO EXISTE"), "Otros");
    }
}

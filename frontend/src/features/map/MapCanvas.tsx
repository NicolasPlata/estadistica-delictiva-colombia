import type { Map as MaplibreMap, MapLayerMouseEvent, RasterTileSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import { fetchMapStats } from "../../shared/api/mapStats";
import { useAppStore } from "../../shared/store/useAppStore";
import { BasemapSwitcher } from "./BasemapSwitcher";
import { BASEMAP_SOURCES } from "./basemapSources";
import { buildChoroplethExpression, computeQuantileBreaks } from "./choropleth";
import { toFeatureStateEntries } from "./featureState";
import { type HoveredRegion, MapTooltip } from "./MapTooltip";
import {
  readAccentColor,
  readBorderColor,
  readChoroplethRamp,
  readLimiteDepartamentalColor,
} from "./readDesignTokens";

const GEOMETRY_SOURCE_ID = "regiones";
const FILL_LAYER_ID = "regiones-fill";
const LINE_LAYER_ID = "regiones-linea";
const BASEMAP_SOURCE_ID = "basemap";
const BASEMAP_LAYER_ID = "basemap";
const DEPARTAMENTO_LIMITE_SOURCE_ID = "departamentos-limite";
const DEPARTAMENTO_LIMITE_LAYER_ID = "departamentos-limite-linea";

/** Colombia continental — centro y zoom que la deja completa en pantallas
 * de escritorio sin recortar Amazonas ni La Guajira. */
const INITIAL_VIEW_STATE = { longitude: -74.3, latitude: 4.5, zoom: 4.6 };

/** Canvas cartográfico (Hito 3.1/3.2): geometría estática cacheada por
 * granularidad (ADR 0002) + estadísticas dinámicas aplicadas vía
 * `feature-state`, sin volver a pedir ni re-renderizar polígonos en cada
 * cambio de filtro. */
export function MapCanvas() {
  // El mapa se guarda en estado (no en un `useRef` leído dentro de otros
  // efectos): react-map-gl crea la instancia real de MapLibre en un efecto
  // interno posterior al primer render, así que un ref quedaría "stale"
  // para cualquier efecto cuyas dependencias no cambien en ese momento —
  // con estado, en cambio, su llegada dispara un re-render real.
  const [map, setMap] = useState<MaplibreMap | null>(null);
  const theme = useAppStore((s) => s.theme);
  const basemap = useAppStore((s) => s.basemap);
  const granularidad = useAppStore((s) => s.granularidad);
  const filters = useAppStore((s) => s.filters);
  const geometryCache = useAppStore((s) => s.geometryCache);
  const loadGeometry = useAppStore((s) => s.loadGeometry);
  const selectedRegion = useAppStore((s) => s.selectedRegion);
  const setSelectedRegion = useAppStore((s) => s.setSelectedRegion);
  const comparisonMode = useAppStore((s) => s.comparisonMode);
  const setComparisonRegion = useAppStore((s) => s.setComparisonRegion);

  const [mapStatsData, setMapStatsData] = useState<Record<string, number>>({});
  const [hovered, setHovered] = useState<HoveredRegion | null>(null);
  const previousSelectedId = useRef<number | null>(null);

  const geometry = geometryCache[granularidad];
  const departamentoGeometry = geometryCache.DEPARTAMENTO;
  const source = BASEMAP_SOURCES[basemap];

  useEffect(() => {
    loadGeometry(granularidad);
  }, [granularidad, loadGeometry]);

  // El límite departamental es una referencia siempre visible (HU-1.04),
  // independiente de la granularidad activa — se carga aparte para que
  // exista incluso viendo Municipio. `loadGeometry` ya evita el refetch si
  // la granularidad activa ya la dejó cacheada.
  useEffect(() => {
    loadGeometry("DEPARTAMENTO");
  }, [loadGeometry]);

  useEffect(() => {
    let cancelled = false;
    fetchMapStats(filters, granularidad)
      .then((stats) => {
        if (!cancelled) setMapStatsData(stats.data);
      })
      .catch(() => {
        // Degradado aceptable: sin estadísticas, todas las regiones se
        // pintan neutras (HU-1.02) en vez de tumbar el mapa.
        if (!cancelled) setMapStatsData({});
      });
    return () => {
      cancelled = true;
    };
  }, [filters, granularidad]);

  // RN-09/HU-1.02: aplica las estadísticas ya cargadas sobre la geometría
  // ya cargada vía feature-state — nunca reconstruye la fuente/capa.
  useEffect(() => {
    if (!map || !geometry) return;

    function applyFeatureState() {
      const entries = toFeatureStateEntries({ granularidad, data: mapStatsData });
      const idsConDatos = new Set(entries.map((entry) => entry.id));

      for (const feature of geometry!.features) {
        if (!idsConDatos.has(feature.properties.codigo_dane)) {
          map!.removeFeatureState({ source: GEOMETRY_SOURCE_ID, id: feature.properties.codigo_dane });
        }
      }
      for (const entry of entries) {
        map!.setFeatureState({ source: GEOMETRY_SOURCE_ID, id: entry.id }, { cantidad: entry.cantidad });
      }
    }

    // `<Source>` registra la fuente en el estilo (y la tiliza en un Web
    // Worker vía geojson-vt) de forma asíncrona respecto a este efecto —
    // `isSourceLoaded` lanza si la fuente todavía no existe, así que se
    // comprueba primero, y luego se espera a que termine de tilizar
    // (fijar el feature-state antes se pierde en cuanto el tile "real"
    // reemplaza al provisional).
    let cancelled = false;
    function waitAndApply() {
      if (cancelled) return;
      if (map!.getSource(GEOMETRY_SOURCE_ID) && map!.isSourceLoaded(GEOMETRY_SOURCE_ID)) {
        applyFeatureState();
      } else {
        requestAnimationFrame(waitAndApply);
      }
    }
    waitAndApply();

    return () => {
      cancelled = true;
    };
  }, [map, geometry, granularidad, mapStatsData]);

  // HU-3.03: resalta el territorio aislado en el mapa — limpia el
  // feature-state de la selección anterior antes de marcar la nueva, para
  // que nunca queden dos regiones resaltadas a la vez.
  useEffect(() => {
    if (!map || !map.getSource(GEOMETRY_SOURCE_ID)) return;

    if (previousSelectedId.current !== null) {
      map.setFeatureState(
        { source: GEOMETRY_SOURCE_ID, id: previousSelectedId.current },
        { selected: false },
      );
    }
    if (selectedRegion) {
      map.setFeatureState(
        { source: GEOMETRY_SOURCE_ID, id: selectedRegion.codigoDane },
        { selected: true },
      );
    }
    previousSelectedId.current = selectedRegion?.codigoDane ?? null;
  }, [map, selectedRegion, geometry]);

  // HU-1.04: el orden en que `regiones` y `departamentos-limite` terminan
  // de tilizar y montar su capa no está garantizado — Municipio es ~30x
  // más pesado que Departamento, así que el límite departamental puede
  // terminar añadido al estilo ANTES que `regiones` y quedar debajo suyo
  // (bug real reportado). Se reafirma al tope del stack de capas cada vez
  // que cualquiera de las dos geometrías cambia.
  useEffect(() => {
    if (!map || !departamentoGeometry) return;

    let cancelled = false;
    function bringToFront() {
      if (cancelled) return;
      if (map!.getLayer(DEPARTAMENTO_LIMITE_LAYER_ID)) {
        map!.moveLayer(DEPARTAMENTO_LIMITE_LAYER_ID);
      } else {
        requestAnimationFrame(bringToFront);
      }
    }
    bringToFront();

    return () => {
      cancelled = true;
    };
  }, [map, geometry, departamentoGeometry]);

  function handleClick(event: MapLayerMouseEvent) {
    const feature = event.features?.[0];
    if (!feature?.properties) return;
    const region = {
      codigoDane: feature.properties.codigo_dane,
      nombre: feature.properties.nombre_region,
    };
    // HU-3.04, modo "Por Región": mientras la comparación está activa, un
    // clic elige la Serie B en vez de reemplazar la región primaria.
    if (comparisonMode === "region") {
      setComparisonRegion(region);
    } else {
      setSelectedRegion(region);
    }
  }

  // `readChoroplethRamp`/`readBorderColor` leen `getComputedStyle`, que
  // cambia con `[data-theme]` — `theme` no se usa dentro del cuerpo, pero
  // sin él en las dependencias el mapa se queda pintado con los colores
  // del tema anterior tras un cambio Light/Dark que no también dispare un
  // refetch de estadísticas (exhaustive-deps no puede ver esta dependencia
  // indirecta vía DOM).
  const fillColorExpression = useMemo(() => {
    const breaks = computeQuantileBreaks(Object.values(mapStatsData));
    if (!breaks) return "transparent";
    return buildChoroplethExpression(breaks, readChoroplethRamp(), "transparent");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStatsData, theme]);

  const lineColor = useMemo(
    () => readBorderColor(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme],
  );

  const selectedLineColor = useMemo(
    () => readAccentColor(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme],
  );

  const limiteDepartamentalColor = useMemo(
    () => readLimiteDepartamentalColor(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme],
  );

  // Estilo estático (nunca se recalcula): un objeto `mapStyle` nuevo le
  // indica a MapLibre que llame `setStyle`, lo que recarga el estilo
  // completo y destruye (y recrea) la fuente `regiones` — exactamente lo
  // que HU-1.05 prohíbe ("cambiar de mapa base no debe afectar ni
  // recargar la capa de choropleth"). El basemap real se aplica de forma
  // imperativa vía `setTiles` en el efecto de abajo.
  const mapStyle = useMemo(
    () => ({
      version: 8 as const,
      sources: {
        [BASEMAP_SOURCE_ID]: {
          type: "raster" as const,
          tiles: BASEMAP_SOURCES.oscuro.tiles,
          tileSize: 256,
        },
      },
      layers: [{ id: BASEMAP_LAYER_ID, type: "raster" as const, source: BASEMAP_SOURCE_ID }],
    }),
    [],
  );

  // HU-1.05: cambiar de mapa base solo reemplaza las tiles de la fuente
  // raster existente — nunca recarga el estilo, así que `regiones` nunca
  // se ve afectada.
  useEffect(() => {
    if (!map) return;
    const basemapSource = map.getSource(BASEMAP_SOURCE_ID) as RasterTileSource | undefined;
    basemapSource?.setTiles(source.tiles);
  }, [map, source]);

  function handleMouseMove(event: MapLayerMouseEvent) {
    const feature = event.features?.[0];
    if (!feature) {
      setHovered(null);
      return;
    }
    const cantidad = feature.state.cantidad;
    setHovered({
      nombre: feature.properties?.nombre_region ?? "Región desconocida",
      cantidad: typeof cantidad === "number" ? cantidad : null,
      x: event.point.x,
      y: event.point.y,
    });
  }

  return (
    <div className="relative w-full h-full">
      <Map
        ref={(instance) => setMap(instance?.getMap() ?? null)}
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle={mapStyle}
        interactiveLayerIds={geometry ? [FILL_LAYER_ID] : []}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
        onClick={handleClick}
        attributionControl={false}
      >
        {geometry && (
          <Source
            id={GEOMETRY_SOURCE_ID}
            type="geojson"
            data={geometry}
            promoteId="codigo_dane"
          >
            <Layer
              id={FILL_LAYER_ID}
              type="fill"
              paint={{
                "fill-color": fillColorExpression as never,
                "fill-opacity": 0.85,
              }}
            />
            <Layer
              id={LINE_LAYER_ID}
              type="line"
              paint={{
                "line-color": [
                  "case",
                  ["boolean", ["feature-state", "selected"], false],
                  selectedLineColor,
                  lineColor,
                ] as never,
                "line-opacity": [
                  "case",
                  ["boolean", ["feature-state", "selected"], false],
                  1,
                  ["case", ["==", ["feature-state", "cantidad"], null], 0.4, 0.8],
                ] as never,
                "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 3, 1] as never,
              }}
            />
          </Source>
        )}

        {/* HU-1.04: límite departamental de referencia, siempre visible
            encima de la capa anterior sin importar la granularidad activa
            — sólida y de mayor grosor a propósito, para que se distinga
            con claridad incluso sobre el enjambre de límites municipales. */}
        {departamentoGeometry && (
          <Source
            id={DEPARTAMENTO_LIMITE_SOURCE_ID}
            type="geojson"
            data={departamentoGeometry}
          >
            <Layer
              id={DEPARTAMENTO_LIMITE_LAYER_ID}
              type="line"
              paint={{
                "line-color": limiteDepartamentalColor,
                "line-width": 2,
              }}
            />
          </Source>
        )}
      </Map>
      <BasemapSwitcher />
      <MapTooltip region={hovered} />
      <p className="absolute bottom-1 right-1 text-[10px] leading-none text-text-secondary bg-surface-panel/70 px-1.5 py-0.5 rounded">
        {source.attribution} | MapLibre
      </p>
    </div>
  );
}

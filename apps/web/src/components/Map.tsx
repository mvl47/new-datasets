import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { IControl, StyleSpecification } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer, PickingInfo } from '@deck.gl/core';
import { GERMANY_CENTER, GERMANY_ZOOM } from '../data/germany';
import { useAppStore } from '../state/appStore';
import type { Bbox } from '../state/appStore';
import { useLayersStore } from '../state/layersStore';
import { useThemeStore, type Theme } from '../state/themeStore';

const BLANK_FALLBACK = '/style-blank.json';

let pmtilesRegistered = false;
function registerPmtilesProtocol(): void {
  if (pmtilesRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);
  pmtilesRegistered = true;
}

function styleUrlForTheme(theme: Theme): string {
  const override = import.meta.env.VITE_BASEMAP_STYLE_URL;
  if (override) return override;
  return theme === 'dark' ? '/styles/ffe-dark.json' : '/styles/ffe-light.json';
}

async function resolveStyle(theme: Theme): Promise<string | StyleSpecification> {
  const primary = styleUrlForTheme(theme);
  try {
    const response = await fetch(primary, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as StyleSpecification;
  } catch {
    return BLANK_FALLBACK;
  }
}

function readBbox(map: maplibregl.Map): Bbox {
  const b = map.getBounds();
  return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
}

function defaultTooltip(info: PickingInfo): { html: string } | null {
  const tooltipFn = useLayersStore.getState().getTooltip;
  if (tooltipFn) return tooltipFn(info);
  return null;
}

function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const setBbox = useAppStore((s) => s.setBbox);
  const theme = useThemeStore((s) => s.theme);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    registerPmtilesProtocol();

    const map = new maplibregl.Map({
      container,
      style: BLANK_FALLBACK,
      center: GERMANY_CENTER,
      zoom: GERMANY_ZOOM,
    });
    mapRef.current = map;

    void resolveStyle(theme).then((style) => {
      if (mapRef.current === map) map.setStyle(style);
    });

    const overlay = new MapboxOverlay({
      interleaved: true,
      layers: [...useLayersStore.getState().layers] as Layer[],
      getTooltip: defaultTooltip,
    });
    map.addControl(overlay as unknown as IControl);

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    const handleMoveEnd = () => setBbox(readBbox(map));
    map.on('moveend', handleMoveEnd);
    map.once('load', handleMoveEnd);

    const unsubscribeLayers = useLayersStore.subscribe((state) => {
      overlay.setProps({ layers: [...state.layers] });
    });

    return () => {
      unsubscribeLayers();
      map.off('moveend', handleMoveEnd);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setBbox]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    void resolveStyle(theme).then((style) => {
      if (mapRef.current === map) map.setStyle(style);
    });
  }, [theme]);

  return <div ref={containerRef} className="h-full w-full" data-testid="maplibre-container" />;
}

export default MapView;

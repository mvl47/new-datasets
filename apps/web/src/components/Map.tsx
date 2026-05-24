import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { IControl } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer } from '@deck.gl/core';
import { GERMANY_CENTER, GERMANY_ZOOM } from '../data/germany';
import { useAppStore } from '../state/appStore';
import type { Bbox } from '../state/appStore';
import { useLayersStore } from '../state/layersStore';

const DEFAULT_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

let pmtilesRegistered = false;
function registerPmtilesProtocol(): void {
  if (pmtilesRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);
  pmtilesRegistered = true;
}

function getStyleUrl(): string {
  return import.meta.env.VITE_BASEMAP_STYLE_URL ?? DEFAULT_STYLE_URL;
}

function readBbox(map: maplibregl.Map): Bbox {
  const b = map.getBounds();
  return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
}

function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const setBbox = useAppStore((s) => s.setBbox);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    registerPmtilesProtocol();

    const map = new maplibregl.Map({
      container,
      style: getStyleUrl(),
      center: GERMANY_CENTER,
      zoom: GERMANY_ZOOM,
    });

    const overlay = new MapboxOverlay({
      interleaved: true,
      layers: [...useLayersStore.getState().layers] as Layer[],
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
    };
  }, [setBbox]);

  return <div ref={containerRef} className="h-full w-full" data-testid="maplibre-container" />;
}

export default MapView;

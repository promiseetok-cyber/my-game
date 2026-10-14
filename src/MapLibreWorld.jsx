import { useEffect, useRef, useState } from 'react';
import { Building2, Compass, Layers3, LocateFixed, MapPin, TriangleAlert } from 'lucide-react';
import { Map as MapLibreMap, Marker, NavigationControl, Popup, setWorkerUrl } from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl(mapWorkerUrl);

const MAP_STYLES = {
  liberty: { label: 'LIBERTY', url: 'https://tiles.openfreemap.org/styles/liberty' },
  bright: { label: 'BRIGHT', url: 'https://tiles.openfreemap.org/styles/bright' },
  positron: { label: 'POSITRON', url: 'https://tiles.openfreemap.org/styles/positron' },
  dark: { label: 'DARK', url: 'https://tiles.openfreemap.org/styles/dark' },
};
const NIGERIA_CENTER = [8.6753, 9.082];
const BUILDINGS_LAYER_ID = 'nigeria-2027-osm-buildings-3d';

function toggleBuildingExtrusions(map, enabled) {
  if (!map || !map.isStyleLoaded()) return;
  const existing = map.getLayer(BUILDINGS_LAYER_ID);
  if (!enabled) {
    if (existing) map.removeLayer(BUILDINGS_LAYER_ID);
    return;
  }
  if (existing) return;
  const style = map.getStyle();
  if (!style?.sources?.openmaptiles || !style.layers?.some((layer) => layer['source-layer'] === 'building')) return;
  const firstSymbolLayer = style.layers.find((layer) => layer.type === 'symbol' && layer.layout?.['text-field'])?.id;
  map.addLayer({
    id: BUILDINGS_LAYER_ID,
    type: 'fill-extrusion',
    source: 'openmaptiles',
    'source-layer': 'building',
    minzoom: 15,
    filter: ['!=', ['get', 'hide_3d'], true],
    paint: {
      'fill-extrusion-color': [
        'interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 8],
        0, '#aaa18d', 24, '#978c79', 90, '#64786d',
      ],
      'fill-extrusion-height': [
        'interpolate', ['linear'], ['zoom'],
        14.5, 0,
        16, ['coalesce', ['get', 'render_height'], ['get', 'height'], 8],
      ],
      'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
      'fill-extrusion-opacity': 0.84,
    },
  }, firstSymbolLayer);
}

function localityPopup(locality, stateInfo) {
  const wrapper = document.createElement('div');
  wrapper.className = 'geo-map-popup';
  const title = document.createElement('strong');
  const detail = document.createElement('span');
  title.textContent = locality?.ward || `${stateInfo.capital} district`;
  detail.textContent = `${locality?.lga ? `${locality.lga} LGA · ` : ''}${stateInfo.name} · representative point, approximate`;
  wrapper.append(title, detail);
  return wrapper;
}

export default function MapLibreWorld({ stateInfo, locality, locationKey }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapTimerRef = useRef(null);
  const activeStyleRef = useRef('liberty');
  const show3dRef = useRef(true);
  const [mapStyle, setMapStyle] = useState('liberty');
  const [show3d, setShow3d] = useState(true);
  const [mapStatus, setMapStatus] = useState('loading');
  const [mapError, setMapError] = useState('');

  const latitude = Number(locality?.lat);
  const longitude = Number(locality?.lon);
  const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= 4 && latitude <= 14 && longitude >= 2 && longitude <= 15;
  const locationLabel = locality
    ? `${locality.ward || 'Selected ward'} · ${locality.lga || stateInfo.capital}, ${stateInfo.name}`
    : `${stateInfo.capital}, ${stateInfo.name}`;

  useEffect(() => {
    show3dRef.current = show3d;
    toggleBuildingExtrusions(mapRef.current, show3d);
  }, [show3d]);

  useEffect(() => {
    if (!mapContainerRef.current) return undefined;
    setMapStatus('loading');
    setMapError('');
    let map;
    try {
      map = new MapLibreMap({
        container: mapContainerRef.current,
        style: MAP_STYLES.liberty.url,
        center: NIGERIA_CENTER,
        zoom: 6.15,
        pitch: 48,
        bearing: -16,
        maxPitch: 78,
        minZoom: 5,
        maxZoom: 19,
        attributionControl: { compact: false },
        canvasContextAttributes: { antialias: true },
      });
      mapRef.current = map;
      map.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right');

      map.on('style.load', () => {
        try {
          toggleBuildingExtrusions(map, show3dRef.current);
          setMapStatus('ready');
          setMapError('');
          if (mapTimerRef.current) window.clearTimeout(mapTimerRef.current);
        } catch (error) {
          console.warn('Could not add 3D building extrusions:', error);
        }
      });
      map.on('error', (event) => {
        if (event?.error) console.warn('OpenFreeMap tile/style request:', event.error.message || event.error);
      });
      mapTimerRef.current = window.setTimeout(() => {
        if (!map.isStyleLoaded()) {
          setMapStatus('error');
          setMapError('OpenFreeMap did not finish loading. Check the internet connection; the 3D Story World is still available.');
        }
      }, 18000);
      window.requestAnimationFrame(() => map.resize());
    } catch (error) {
      setMapStatus('error');
      setMapError(error?.message || 'This browser could not start the WebGL map. Return to the Story World and try a WebGL-capable browser.');
    }

    return () => {
      if (mapTimerRef.current) window.clearTimeout(mapTimerRef.current);
      markerRef.current?.remove();
      markerRef.current = null;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapStyle === activeStyleRef.current) return undefined;
    setMapStatus('loading');
    setMapError('');
    if (mapTimerRef.current) window.clearTimeout(mapTimerRef.current);
    mapTimerRef.current = window.setTimeout(() => {
      if (!map.isStyleLoaded()) {
        setMapStatus('error');
        setMapError('This map style is taking too long to load. You can choose another style or return to the Story World.');
      }
    }, 18000);
    try {
      map.setStyle(MAP_STYLES[mapStyle].url);
      activeStyleRef.current = mapStyle;
    } catch (error) {
      setMapStatus('error');
      setMapError(error?.message || 'The selected map style could not be loaded.');
    }
    return () => { if (mapTimerRef.current) window.clearTimeout(mapTimerRef.current); };
  }, [mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (hasLocation) {
      const markerElement = markerRef.current?.getElement() || document.createElement('div');
      markerElement.className = 'geo-map-location-marker';
      markerElement.setAttribute('role', 'img');
      markerElement.setAttribute('aria-label', `${locality?.ward || 'Selected ward'} representative point, approximate`);
      const popup = new Popup({ closeButton: false, offset: 20, maxWidth: '260px' }).setDOMContent(localityPopup(locality, stateInfo));
      if (!markerRef.current) markerRef.current = new Marker({ element: markerElement, anchor: 'bottom' });
      markerRef.current.setLngLat([longitude, latitude]).setPopup(popup).addTo(map);
      map.flyTo({ center: [longitude, latitude], zoom: 15.35, pitch: show3dRef.current ? 53 : 0, bearing: -18, duration: 1150, essential: true });
    } else {
      markerRef.current?.remove();
      markerRef.current = null;
      map.flyTo({ center: NIGERIA_CENTER, zoom: 6.15, pitch: show3dRef.current ? 48 : 0, bearing: -16, duration: 900, essential: true });
    }
  }, [locationKey, latitude, longitude, hasLocation, locality?.ward, locality?.lga, stateInfo.name, stateInfo.capital]);

  useEffect(() => {
    const map = mapRef.current;
    if (map) map.setPitch(show3d ? 53 : 0);
  }, [show3d]);

  const recenter = () => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: hasLocation ? [longitude, latitude] : NIGERIA_CENTER,
      zoom: hasLocation ? 15.35 : 6.15,
      pitch: show3d ? 53 : 0,
      bearing: hasLocation ? -18 : -16,
      duration: 900,
      essential: true,
    });
  };

  return <div className="maplibre-world" aria-label="Live 3D geographic map">
    <div className="maplibre-canvas" ref={mapContainerRef} />
    <div className="maplibre-location-badge">
      <span><MapPin size={12} /> OPENSTREETMAP · REPRESENTATIVE WARD POINT</span>
      <strong>{locationLabel}</strong>
      <small>{hasLocation ? 'Approximate electoral-ward point · mapped streets and places vary in detail.' : 'National view · ward directory is still loading.'}</small>
    </div>
    <div className="maplibre-tools" aria-label="Map controls">
      <label className="map-style-picker"><Layers3 size={13} /><span>STYLE</span><select value={mapStyle} onChange={(event) => setMapStyle(event.target.value)} aria-label="Choose map style">
        {Object.entries(MAP_STYLES).map(([value, style]) => <option key={value} value={value}>{style.label}</option>)}
      </select></label>
      <button type="button" className={show3d ? 'active' : ''} onClick={() => setShow3d((value) => !value)} aria-pressed={show3d} title={show3d ? 'Turn off 3D building extrusions' : 'Turn on 3D building extrusions'}><Building2 size={13} /><span>{show3d ? '3D ON' : '3D OFF'}</span></button>
      <button type="button" onClick={recenter} aria-label="Recenter map" title="Recenter on the selected ward"><LocateFixed size={14} /></button>
    </div>
    {mapStatus === 'loading' && <div className="maplibre-status"><span className="maplibre-spinner" /><span>Loading free vector map…</span></div>}
    {mapStatus === 'error' && <div className="maplibre-error" role="status"><TriangleAlert size={18} /><strong>LIVE MAP UNAVAILABLE</strong><span>{mapError}</span></div>}
    <div className="maplibre-footnote"><Compass size={11} /> MAPPED ROADS / PLACES · COVERAGE VARIES · NO LIVE TRAFFIC OR ROUTING</div>
  </div>;
}

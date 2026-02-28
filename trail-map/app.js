const MAPTILER_KEY = 'oenkzVJP4AUZcYIsm5xG';

const map = new maplibregl.Map({
  container: 'map',
  style: `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`,
  center: [-151.35, 59.60],
  zoom: 10,
  pitch: 45,
  bearing: 90,
  maxPitch: 85,
  antialias: true
});

map.addControl(new maplibregl.NavigationControl(), 'top-right');

map.on('load', () => {
  // Terrain DEM source
  map.addSource('terrain-dem', {
    type: 'raster-dem',
    url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`,
    tileSize: 256
  });

  // Enable 3D terrain with 1.5x exaggeration
  map.setTerrain({
    source: 'terrain-dem',
    exaggeration: 1.5
  });

  // Sky/atmosphere layer
  map.addLayer({
    id: 'sky',
    type: 'sky',
    paint: {
      'sky-type': 'atmosphere',
      'sky-atmosphere-sun': [0.0, 90.0],
      'sky-atmosphere-sun-intensity': 15
    }
  });
});

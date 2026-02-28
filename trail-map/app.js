const MAPTILER_KEY = 'oenkzVJP4AUZcYIsm5xG';

const TRAILS = {
  'grewingk-glacier': {
    name: 'Grewingk Glacier Lake Trail',
    color: '#3b82f6',
    distance: '6.6 mi round trip',
    elevation: '500 ft',
    time: '3-5 hours',
    difficulty: 'Easy to Moderate',
    description: 'The most popular trail in Kachemak Bay State Park. Hike through coastal spruce forest to a stunning glacial lake with floating electric-blue icebergs at the foot of Grewingk Glacier. Includes a hand-operated cable tram river crossing.',
    highlights: ['Glacial lake with icebergs', 'Hand-operated cable tram', 'Old-growth spruce forest', 'Optional Blue Ice Trail spur'],
    dropoff: 'Glacier Spit',
    image: 'grewingk-glacier.webp',
    camera: { center: [-151.17, 59.615], zoom: 13, pitch: 65, bearing: 200 }
  },
  'grace-ridge': {
    name: 'Grace Ridge Trail',
    color: '#ef4444',
    distance: '8.2 mi point-to-point',
    elevation: '3,145 ft',
    time: '6-8 hours',
    difficulty: 'Moderate to Difficult',
    description: 'A spectacular ridge hike climbing from sea level through old-growth spruce forest to expansive alpine meadows above 3,000 feet. 360-degree panoramic views of Cook Inlet volcanoes, glaciers, fjords, and islands.',
    highlights: ['360\u00b0 volcano panoramas', 'Alpine meadows & wildflowers', 'Mountain goat sightings', 'Old-growth spruce forest'],
    dropoff: 'Kayak Beach',
    image: 'grace-ridge.webp',
    camera: { center: [-151.15, 59.48], zoom: 13, pitch: 60, bearing: 45 }
  },
  'china-poot-lake': {
    name: 'China Poot Lake Trail',
    color: '#22c55e',
    distance: '2.6 mi one-way',
    elevation: '500 ft',
    time: '1.5-2 hours',
    difficulty: 'Moderate',
    description: 'A scenic forest trail from Halibut Cove Lagoon climbing through spruce to tranquil China Poot Lake. Passes two small lakes where loons nest. Blueberries abundant in August. Gateway to longer backcountry routes.',
    highlights: ['Tranquil alpine lake', 'Nesting loons', 'August blueberry picking', 'Gateway to Poot Peak & Moose Valley'],
    dropoff: 'Halibut Cove Lagoon',
    image: 'china-poot-lake.webp',
    camera: { center: [-151.16, 59.565], zoom: 13.5, pitch: 60, bearing: 160 }
  },
  'alpine-ridge': {
    name: 'Alpine Ridge Trail',
    color: '#f97316',
    distance: '2.5 mi one-way',
    elevation: '1,650 ft',
    time: '2-3 hours',
    difficulty: 'Moderate to Difficult',
    description: 'The quickest route to alpine terrain in the park. Steeply ascends a ridge through spruce and alder, breaking into open tundra with sweeping views of Grewingk Glacier and Kachemak Bay.',
    highlights: ['Fastest route to alpine', 'Grewingk Glacier views', 'Open alpine tundra', 'Connects to Sadie Knob'],
    dropoff: 'Halibut Cove',
    image: 'alpine-ridge.webp',
    camera: { center: [-151.155, 59.59], zoom: 14, pitch: 65, bearing: 130 }
  }
};

let activeTrail = null;

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

  map.setTerrain({
    source: 'terrain-dem',
    exaggeration: 1.5
  });

  map.addLayer({
    id: 'sky',
    type: 'sky',
    paint: {
      'sky-type': 'atmosphere',
      'sky-atmosphere-sun': [0.0, 90.0],
      'sky-atmosphere-sun-intensity': 15
    }
  });

  // Trail GeoJSON source
  map.addSource('trails', {
    type: 'geojson',
    data: 'trails.geojson'
  });

  // Trail casing (dark outline for visibility)
  map.addLayer({
    id: 'trail-casing',
    type: 'line',
    source: 'trails',
    filter: ['==', '$type', 'LineString'],
    paint: {
      'line-color': '#0f172a',
      'line-width': 7,
      'line-opacity': 0.4
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    }
  });

  // Trail line (colored per trail)
  map.addLayer({
    id: 'trail-line',
    type: 'line',
    source: 'trails',
    filter: ['==', '$type', 'LineString'],
    paint: {
      'line-color': [
        'match', ['get', 'name'],
        'Grewingk Glacier Lake Trail', '#3b82f6',
        'Grace Ridge Trail', '#ef4444',
        'China Poot Lake Trail', '#22c55e',
        'Alpine Ridge Trail', '#f97316',
        'Saddle Trail', '#a855f7',
        '#ffffff'
      ],
      'line-width': 4,
      'line-opacity': 0.9
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    }
  });

  // Trail highlight (white glow on hover/select)
  map.addLayer({
    id: 'trail-highlight',
    type: 'line',
    source: 'trails',
    filter: ['==', 'name', ''],
    paint: {
      'line-color': '#ffffff',
      'line-width': 8,
      'line-opacity': 0.5
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    }
  });

  // Trail point markers
  map.addLayer({
    id: 'trail-points',
    type: 'circle',
    source: 'trails',
    filter: ['==', '$type', 'Point'],
    paint: {
      'circle-radius': 5,
      'circle-color': '#ffffff',
      'circle-stroke-color': '#0f172a',
      'circle-stroke-width': 2
    }
  });

  // Trail labels
  map.addLayer({
    id: 'trail-labels',
    type: 'symbol',
    source: 'trails',
    filter: ['==', '$type', 'Point'],
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 12,
      'text-offset': [0, 1.5],
      'text-anchor': 'top',
      'text-font': ['Open Sans Bold']
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#0f172a',
      'text-halo-width': 1.5
    }
  });

  // Hover interactions
  map.on('mousemove', 'trail-line', (e) => {
    map.getCanvas().style.cursor = 'pointer';
    if (e.features.length > 0 && !activeTrail) {
      const trailName = e.features[0].properties.name;
      map.setFilter('trail-highlight', ['==', 'name', trailName]);
    }
  });

  map.on('mouseleave', 'trail-line', () => {
    map.getCanvas().style.cursor = '';
    if (!activeTrail) {
      map.setFilter('trail-highlight', ['==', 'name', '']);
    }
  });

  // Click trail line to select
  map.on('click', 'trail-line', (e) => {
    if (e.features.length > 0) {
      const trailName = e.features[0].properties.name;
      const trailId = Object.keys(TRAILS).find(id => TRAILS[id].name === trailName);
      if (trailId) selectTrail(trailId);
    }
  });

  // Click empty map area to deselect
  map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ['trail-line'] });
    if (features.length === 0 && activeTrail) {
      deselectTrail();
    }
  });
});

function selectTrail(trailId) {
  const trail = TRAILS[trailId];
  if (!trail) return;
  activeTrail = trailId;

  // Update card active states
  document.querySelectorAll('.trail-card').forEach(card => {
    card.classList.toggle('active', card.dataset.trailId === trailId);
  });

  // Dim other trails, brighten selected
  map.setPaintProperty('trail-line', 'line-opacity', [
    'case',
    ['==', ['get', 'name'], trail.name], 1,
    0.25
  ]);
  map.setPaintProperty('trail-casing', 'line-opacity', [
    'case',
    ['==', ['get', 'name'], trail.name], 0.6,
    0.1
  ]);

  // Fly to trail camera position
  map.flyTo({
    ...trail.camera,
    speed: 0.8,
    curve: 1.4,
    essential: true
  });

  // Animate trail drawing
  animateTrailPath(trail.name);
}

function animateTrailPath(trailName) {
  map.setFilter('trail-highlight', ['==', 'name', trailName]);
  map.setPaintProperty('trail-highlight', 'line-opacity', 0.6);
  map.setPaintProperty('trail-highlight', 'line-color', '#ffffff');
  map.setPaintProperty('trail-highlight', 'line-width', 8);

  let step = 0;
  const dashLength = 2;
  const gapLength = 100;

  function animate() {
    step += 0.5;
    const progress = Math.min(step, gapLength);
    map.setPaintProperty('trail-highlight', 'line-dasharray', [
      dashLength,
      gapLength - progress,
      progress,
      0
    ]);
    if (step < gapLength) {
      requestAnimationFrame(animate);
    }
  }

  animate();
}

function deselectTrail() {
  activeTrail = null;
  document.querySelectorAll('.trail-card').forEach(c => c.classList.remove('active'));
  map.setPaintProperty('trail-line', 'line-opacity', 0.9);
  map.setPaintProperty('trail-casing', 'line-opacity', 0.4);
  map.setFilter('trail-highlight', ['==', 'name', '']);
  hideInfoPanel();
  hideElevationProfile();
}

function showInfoPanel(trailId) {
  // Implemented in Task 6
}

function hideInfoPanel() {
  document.getElementById('info-panel').classList.remove('open');
}

function hideElevationProfile() {
  document.getElementById('elevation-profile').classList.remove('visible');
}

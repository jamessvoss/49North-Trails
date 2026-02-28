# 49North 3D Trail Explorer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an immersive 3D interactive trail page showcasing 4 popular Kachemak Bay hikes with animated trail drawing, fly-to camera animations, auto-tour mode, elevation profiles, and rich info panels.

**Architecture:** Single-page app using MapLibre GL JS with MapTiler satellite tiles and 3D terrain. Full-viewport map with bottom trail cards, slide-in info panel, and auto-tour mode. All client-side vanilla HTML/CSS/JS — no build tools.

**Tech Stack:** MapLibre GL JS 4.7.1, MapTiler (satellite + terrain-rgb DEM), Canvas 2D (elevation profiles), vanilla JS/CSS

---

## Existing Assets Reference

- **Existing trail map code:** `/Users/jvoss/Documents/LuxuryHomerAdventures/trail-map/` — has MapLibre setup, terrain, trail GeoJSON, info panels. Use as reference, but build fresh in `/Users/jvoss/Documents/49North/trail-map/`.
- **Trail images (webp):** `/Users/jvoss/Documents/LuxuryHomerAdventures/Website/`
  - Grewingk: `Grewingk Glacier.webp`
  - Alpine Ridge: `alpine ridge trail.webp`
  - China Poot: `kachemak-bay-glacier-lake-trail-outdoor-beginner7.webp`
  - Saddle/General: `SaddleTrail1920x1080.webp`
- **Existing GeoJSON:** `/Users/jvoss/Documents/LuxuryHomerAdventures/trail-map/trails.geojson` — has Grewingk, China Poot Lake, Alpine Ridge, Saddle Trail, Poot Peak. We need to add Grace Ridge and remove Poot Peak.
- **MapTiler API key:** `oenkzVJP4AUZcYIsm5xG`

---

### Task 1: Project Setup & Asset Preparation

**Files:**
- Create: `trail-map/index.html`
- Create: `trail-map/styles.css`
- Create: `trail-map/app.js`
- Create: `trail-map/trails.geojson`
- Copy images into: `trail-map/images/`

**Step 1: Create project directory structure**

```bash
mkdir -p /Users/jvoss/Documents/49North/trail-map/images
```

**Step 2: Copy trail images from existing project**

```bash
cp "/Users/jvoss/Documents/LuxuryHomerAdventures/Website/Grewingk Glacier.webp" /Users/jvoss/Documents/49North/trail-map/images/grewingk-glacier.webp
cp "/Users/jvoss/Documents/LuxuryHomerAdventures/Website/alpine ridge trail.webp" /Users/jvoss/Documents/49North/trail-map/images/alpine-ridge.webp
cp "/Users/jvoss/Documents/LuxuryHomerAdventures/Website/kachemak-bay-glacier-lake-trail-outdoor-beginner7.webp" /Users/jvoss/Documents/49North/trail-map/images/china-poot-lake.webp
cp "/Users/jvoss/Documents/LuxuryHomerAdventures/Website/SaddleTrail1920x1080.webp" /Users/jvoss/Documents/49North/trail-map/images/grace-ridge.webp
```

Note: `SaddleTrail1920x1080.webp` is used as a placeholder for Grace Ridge until a proper photo is available.

**Step 3: Create the GeoJSON file**

Copy the existing `trails.geojson` from `/Users/jvoss/Documents/LuxuryHomerAdventures/trail-map/trails.geojson` as a starting point. Then:
- Remove the Poot Peak Trail feature
- Keep: Grewingk Glacier Lake Trail, China Poot Lake Trail, Alpine Ridge Trail, Saddle Trail
- Add Grace Ridge Trail coordinates (see below)

Grace Ridge Trail must be sourced from OpenStreetMap Overpass API. Query for the trail way in the Kachemak Bay area:

```
[out:json];
way["name"="Grace Ridge Trail"](59.4,-151.5,59.7,-151.0);
out geom;
```

If OSM doesn't have it, create an approximate route from known waypoints:
- North trailhead (Kayak Beach): approximately [-151.125, 59.498]
- First alpine knob (1,745 ft): approximately [-151.147, 59.487]
- Summit (3,145 ft): approximately [-151.162, 59.478]
- South trailhead (South Grace): approximately [-151.178, 59.462]

Add curated camera positions to each trail feature's properties:

```json
{
  "camera": {
    "center": [-151.17, 59.61],
    "zoom": 13.5,
    "pitch": 65,
    "bearing": 150
  }
}
```

Each trail needs its own camera object tuned for the best viewing angle of that specific trail on the 3D terrain.

**Step 4: Create the HTML skeleton**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Trail Explorer — 49North Alaskan Adventures</title>
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <!-- Header overlay -->
  <div id="header">
    <div class="logo">49North</div>
    <button id="tour-btn">Take the Tour</button>
  </div>

  <!-- 3D Map -->
  <div id="map"></div>

  <!-- Trail Cards (bottom bar) -->
  <div id="trail-cards"></div>

  <!-- Trail Info Panel (right side) -->
  <div id="info-panel"></div>

  <!-- Elevation Profile (bottom overlay when trail selected) -->
  <canvas id="elevation-profile"></canvas>

  <!-- Tour overlay text -->
  <div id="tour-overlay"></div>

  <script src="app.js"></script>
</body>
</html>
```

**Step 5: Verify project structure**

```bash
ls -la /Users/jvoss/Documents/49North/trail-map/
ls -la /Users/jvoss/Documents/49North/trail-map/images/
```

Expected: index.html, styles.css, app.js, trails.geojson, images/ with 4 webp files.

**Step 6: Commit**

```bash
git add trail-map/
git commit -m "feat: scaffold 3D trail explorer project with assets and GeoJSON"
```

---

### Task 2: Base Map with 3D Terrain

**Files:**
- Modify: `trail-map/app.js`
- Modify: `trail-map/styles.css`

**Step 1: Write the map initialization code in app.js**

Set up MapLibre GL with:
- MapTiler satellite base layer
- Terrain DEM source with 1.5x exaggeration
- Sky/atmosphere layer
- Navigation controls
- Initial wide view of Kachemak Bay (center: [-151.35, 59.60], zoom: 10, pitch: 45, bearing: 90)

Reference existing code in `/Users/jvoss/Documents/LuxuryHomerAdventures/trail-map/trail-map.js` lines 1-79 for the pattern. Key constant:

```javascript
const MAPTILER_KEY = 'oenkzVJP4AUZcYIsm5xG';
```

**Step 2: Write base CSS in styles.css**

- Reset styles (margin/padding/box-sizing)
- `#map` full viewport (100vw x 100vh)
- Body font-family: system fonts
- Header overlay positioned fixed top with flex layout
- Semi-transparent dark header background with blur

**Step 3: Open in browser and verify**

```bash
open /Users/jvoss/Documents/49North/trail-map/index.html
```

Expected: Full-screen satellite map of Kachemak Bay area with 3D terrain, tilted view, sky layer visible.

**Step 4: Commit**

```bash
git add trail-map/app.js trail-map/styles.css
git commit -m "feat: base 3D terrain map with satellite imagery"
```

---

### Task 3: Trail Data Layer & Rendering

**Files:**
- Modify: `trail-map/app.js`

**Step 1: Define trail configuration data**

Create a `TRAILS` config object with all 4 trails. Each entry has:
- `id` (slug)
- `name`
- `color` (hex)
- `distance`, `elevation`, `time`, `difficulty`
- `description`
- `highlights` (array of strings)
- `dropoff` (water taxi location)
- `image` (filename in images/)
- `camera` (center, zoom, pitch, bearing for flyTo)

```javascript
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
    highlights: ['360° volcano panoramas', 'Alpine meadows & wildflowers', 'Mountain goat sightings', 'Old-growth spruce forest'],
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
```

**Step 2: Add GeoJSON source and trail layers to the map load handler**

Inside `map.on('load', ...)`, add:
- GeoJSON source from `trails.geojson`
- Trail casing layer (dark outline, 7px, 0.4 opacity)
- Trail line layer (colored per trail using match expression, 4px)
- Trail highlight layer (white glow, filtered to empty initially)
- Trail point markers (white circles with dark stroke)
- Trail labels (white text with black halo on points)

Use the same match expression pattern from the existing code to color each trail by its `name` property.

**Step 3: Add hover and click handlers**

- `mousemove` on `trail-line` → set highlight filter to hovered trail name
- `mouseleave` on `trail-line` → reset highlight filter
- `click` on `trail-line` → call `selectTrail(trailId)` (to be implemented in Task 5)
- Cursor changes on enter/leave

**Step 4: Verify in browser**

Expected: All 4 trail lines visible on the 3D terrain with correct colors, hoverable with white glow, clickable.

**Step 5: Commit**

```bash
git add trail-map/app.js
git commit -m "feat: trail data layer with colored lines and hover interaction"
```

---

### Task 4: Trail Cards (Bottom Bar)

**Files:**
- Modify: `trail-map/app.js`
- Modify: `trail-map/styles.css`

**Step 1: Write the trail cards CSS**

```css
#trail-cards {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 5;
  padding: 0 24px;
}

.trail-card {
  width: 220px;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 2px solid transparent;
  flex-shrink: 0;
}

.trail-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.trail-card.active {
  border-color: var(--trail-color);
  box-shadow: 0 0 20px color-mix(in srgb, var(--trail-color) 40%, transparent);
}

.trail-card-image {
  width: 100%;
  height: 100px;
  object-fit: cover;
}

.trail-card-body {
  padding: 10px 12px;
  color: #f8fafc;
}

.trail-card-name {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  line-height: 1.3;
}

.trail-card-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: #94a3b8;
}

.difficulty-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
```

Mobile override:
```css
@media (max-width: 768px) {
  #trail-cards {
    left: 0;
    transform: none;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    padding: 0 12px;
    bottom: 12px;
    width: 100%;
  }
  .trail-card {
    scroll-snap-align: start;
    min-width: 180px;
    width: 180px;
  }
}
```

**Step 2: Write JS to generate trail cards**

After map load, build the cards dynamically from the `TRAILS` config:

```javascript
function buildTrailCards() {
  const container = document.getElementById('trail-cards');
  Object.entries(TRAILS).forEach(([id, trail]) => {
    const card = document.createElement('div');
    card.className = 'trail-card';
    card.dataset.trailId = id;
    card.style.setProperty('--trail-color', trail.color);
    card.innerHTML = `
      <img class="trail-card-image" src="images/${trail.image}" alt="${trail.name}" />
      <div class="trail-card-body">
        <div class="trail-card-name">${trail.name}</div>
        <div class="trail-card-meta">
          <span class="difficulty-badge" style="background:${trail.color}20;color:${trail.color}">${trail.difficulty}</span>
          <span>${trail.distance}</span>
        </div>
      </div>
    `;
    card.addEventListener('click', () => selectTrail(id));
    container.appendChild(card);
  });
}
```

Call `buildTrailCards()` inside the map `load` handler.

**Step 3: Verify in browser**

Expected: 4 trail cards at the bottom of the screen with photos, names, difficulty badges. Hover lifts cards up. On mobile (resize window), cards scroll horizontally.

**Step 4: Commit**

```bash
git add trail-map/app.js trail-map/styles.css
git commit -m "feat: trail cards bottom bar with responsive layout"
```

---

### Task 5: Trail Selection & Fly-To Animation

**Files:**
- Modify: `trail-map/app.js`

**Step 1: Implement selectTrail() function**

This is the core interaction. When a trail is selected:

1. Update active card state (add/remove `.active` class)
2. Dim all other trails to 30% opacity, brighten selected trail
3. Animate the selected trail path drawing (line-dasharray)
4. Fly camera to the trail's curated camera position
5. Show the info panel (Task 6)
6. Show elevation profile (Task 7)

```javascript
let activeTrail = null;

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

  // Fly to trail's camera position
  map.flyTo({
    ...trail.camera,
    speed: 0.8,
    curve: 1.4,
    essential: true
  });

  // Animate trail drawing
  animateTrailPath(trail.name);

  // Show info panel
  showInfoPanel(trailId);
}
```

**Step 2: Implement animateTrailPath()**

Use `line-dasharray` animation to create a "drawing" effect:

```javascript
function animateTrailPath(trailName) {
  // Set highlight filter to selected trail
  map.setFilter('trail-highlight', ['==', 'name', trailName]);

  // Animate dash array for drawing effect
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

  // Reset and start
  map.setPaintProperty('trail-highlight', 'line-opacity', 0.6);
  map.setPaintProperty('trail-highlight', 'line-color', '#ffffff');
  map.setPaintProperty('trail-highlight', 'line-width', 8);
  animate();
}
```

**Step 3: Implement deselectTrail() for clicking the map background**

```javascript
function deselectTrail() {
  activeTrail = null;
  document.querySelectorAll('.trail-card').forEach(c => c.classList.remove('active'));
  map.setPaintProperty('trail-line', 'line-opacity', 0.9);
  map.setPaintProperty('trail-casing', 'line-opacity', 0.4);
  map.setFilter('trail-highlight', ['==', 'name', '']);
  hideInfoPanel();
  hideElevationProfile();
}

// Click on empty map area to deselect
map.on('click', (e) => {
  const features = map.queryRenderedFeatures(e.point, { layers: ['trail-line'] });
  if (features.length === 0 && activeTrail) {
    deselectTrail();
  }
});
```

**Step 4: Verify in browser**

Expected: Clicking a trail card flies the camera to that trail, dims other trails, animates the selected trail path drawing, highlights the active card.

**Step 5: Commit**

```bash
git add trail-map/app.js
git commit -m "feat: trail selection with fly-to camera and animated path drawing"
```

---

### Task 6: Info Panel

**Files:**
- Modify: `trail-map/app.js`
- Modify: `trail-map/styles.css`

**Step 1: Write info panel CSS**

Style the `#info-panel` as a right-side slide-in panel:
- Fixed position, right: -420px (hidden), width: 400px
- Dark semi-transparent background with blur
- Transition on right property for slide animation
- `.open` class sets right: 0
- Contains: close button, hero image, name, difficulty badge, stats grid, description, highlights list, drop-off info, CTA button
- Mobile: panel slides from bottom instead

Use the existing trail-panel CSS from `/Users/jvoss/Documents/LuxuryHomerAdventures/trail-map/trail-map.css` as a starting point but enhance it with:
- Highlights bullet list styling
- Drop-off location section
- Better stats grid layout (2x2 grid instead of flex row)

**Step 2: Write showInfoPanel() and hideInfoPanel()**

```javascript
function showInfoPanel(trailId) {
  const trail = TRAILS[trailId];
  const panel = document.getElementById('info-panel');

  panel.innerHTML = `
    <button class="panel-close" onclick="deselectTrail()">&times;</button>
    <img class="panel-image" src="images/${trail.image}" alt="${trail.name}" />
    <div class="panel-content">
      <h2>${trail.name}</h2>
      <span class="difficulty-badge" style="background:${trail.color}20;color:${trail.color}">${trail.difficulty}</span>
      <div class="panel-stats">
        <div class="stat"><span class="stat-value">${trail.distance}</span><span class="stat-label">Distance</span></div>
        <div class="stat"><span class="stat-value">${trail.elevation}</span><span class="stat-label">Elevation</span></div>
        <div class="stat"><span class="stat-value">${trail.time}</span><span class="stat-label">Time</span></div>
        <div class="stat"><span class="stat-value">${trail.dropoff}</span><span class="stat-label">Water Taxi</span></div>
      </div>
      <p class="panel-description">${trail.description}</p>
      <div class="panel-highlights">
        <h3>Highlights</h3>
        <ul>${trail.highlights.map(h => `<li>${h}</li>`).join('')}</ul>
      </div>
      <a href="https://49northalaskanadventures.com" class="panel-cta" target="_blank">Book This Adventure</a>
    </div>
  `;

  requestAnimationFrame(() => panel.classList.add('open'));
}

function hideInfoPanel() {
  document.getElementById('info-panel').classList.remove('open');
}
```

**Step 3: Verify in browser**

Expected: Selecting a trail slides in a rich info panel from the right with photo, stats, description, highlights, and CTA. Close button and clicking empty map dismisses it. On mobile (narrow viewport), panel slides up from bottom.

**Step 4: Commit**

```bash
git add trail-map/app.js trail-map/styles.css
git commit -m "feat: trail info panel with stats, highlights, and CTA"
```

---

### Task 7: Elevation Profile

**Files:**
- Modify: `trail-map/app.js`
- Modify: `trail-map/styles.css`

**Step 1: Write elevation profile CSS**

Position the `#elevation-profile` canvas:
- Fixed at bottom of viewport, centered, partially overlapping the trail cards area
- Semi-transparent dark background with rounded corners
- Hidden by default (`opacity: 0; pointer-events: none`)
- `.visible` class shows it
- Size: ~400px wide, 120px tall
- On mobile: full width with smaller height

**Step 2: Implement elevation profile rendering**

Use MapLibre's `map.queryTerrainElevation()` to sample elevation along trail coordinates:

```javascript
function showElevationProfile(trailId) {
  const trail = TRAILS[trailId];
  const canvas = document.getElementById('elevation-profile');
  const ctx = canvas.getContext('2d');

  // Get trail coordinates from GeoJSON source
  const source = map.getSource('trails');
  // Query the GeoJSON data for the matching trail
  // Sample elevation at each coordinate point using map.queryTerrainElevation()

  // Find min/max elevation for scaling
  // Draw filled area chart:
  //   - X axis = cumulative distance along trail
  //   - Y axis = elevation
  //   - Gradient fill from trail color to transparent
  //   - Thin line on top in trail color
  //   - Axis labels for start/end elevation and total distance

  canvas.classList.add('visible');
}

function hideElevationProfile() {
  document.getElementById('elevation-profile').classList.remove('visible');
}
```

Note: `queryTerrainElevation()` requires the terrain to be loaded. If it returns null for some points, fall back to a simulated profile based on the trail's known elevation gain. The function takes `[lng, lat]` and returns elevation in meters.

**Step 3: Verify in browser**

Expected: When a trail is selected, a small elevation profile chart appears showing the trail's elevation gain visually. The chart uses the trail's color.

**Step 4: Commit**

```bash
git add trail-map/app.js trail-map/styles.css
git commit -m "feat: elevation profile chart using terrain DEM data"
```

---

### Task 8: Auto-Tour Mode

**Files:**
- Modify: `trail-map/app.js`
- Modify: `trail-map/styles.css`

**Step 1: Write tour overlay CSS**

```css
#tour-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #ffffff;
  font-size: 32px;
  font-weight: 700;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.7);
  opacity: 0;
  transition: opacity 0.6s ease;
  pointer-events: none;
  z-index: 20;
  text-align: center;
}

#tour-overlay.visible {
  opacity: 1;
}
```

Also style the `#tour-btn`:
- Semi-transparent dark background, white text, rounded, hover effect
- When tour is active, button text changes to "Exit Tour" with a different color

**Step 2: Implement tour mode**

```javascript
let tourActive = false;
let tourAbortController = null;

async function startTour() {
  tourActive = true;
  const btn = document.getElementById('tour-btn');
  btn.textContent = 'Exit Tour';
  btn.classList.add('active');

  tourAbortController = new AbortController();
  const signal = tourAbortController.signal;

  const trailIds = Object.keys(TRAILS);

  // Start with overview
  deselectTrail();
  map.flyTo({
    center: [-151.20, 59.56],
    zoom: 11,
    pitch: 55,
    bearing: 90,
    speed: 0.6,
    essential: true
  });

  await waitForIdle(signal);
  await delay(2000, signal);

  for (const id of trailIds) {
    if (signal.aborted) break;

    const trail = TRAILS[id];

    // Show trail name overlay
    showTourOverlay(trail.name);
    await delay(1500, signal);

    // Select and fly to trail
    selectTrail(id);
    await waitForIdle(signal);
    await delay(4000, signal);

    hideTourOverlay();
    await delay(500, signal);
  }

  if (!signal.aborted) {
    endTour();
  }
}

function endTour() {
  tourActive = false;
  const btn = document.getElementById('tour-btn');
  btn.textContent = 'Take the Tour';
  btn.classList.remove('active');
  tourAbortController = null;
}

function stopTour() {
  if (tourAbortController) {
    tourAbortController.abort();
  }
  endTour();
  hideTourOverlay();
}

// Helper: wait for map moveend
function waitForIdle(signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const onEnd = () => { resolve(); };
    const onAbort = () => { map.off('moveend', onEnd); resolve(); };
    map.once('moveend', onEnd);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

// Helper: cancellable delay
function delay(ms, signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}

function showTourOverlay(text) {
  const el = document.getElementById('tour-overlay');
  el.textContent = text;
  el.classList.add('visible');
}

function hideTourOverlay() {
  document.getElementById('tour-overlay').classList.remove('visible');
}
```

Wire up the button:
```javascript
document.getElementById('tour-btn').addEventListener('click', () => {
  if (tourActive) stopTour();
  else startTour();
});
```

Also stop tour on Escape key and on any map click during tour.

**Step 3: Verify in browser**

Expected: Clicking "Take the Tour" starts a guided fly-through of all 4 trails. Trail name appears as overlay text, camera flies to each trail, path animates. Clicking "Exit Tour" or pressing Escape stops it.

**Step 4: Commit**

```bash
git add trail-map/app.js trail-map/styles.css
git commit -m "feat: auto-tour mode with sequential trail fly-through"
```

---

### Task 9: Opening Animation & Polish

**Files:**
- Modify: `trail-map/app.js`
- Modify: `trail-map/styles.css`

**Step 1: Opening fly-in animation**

On map load, after a short delay:
- Start with a wide view (zoom 10, low pitch)
- Fly in to overview position showing all trails (zoom 11.5, pitch 65, bearing 120)
- Fade in the trail cards and header after the fly-in completes

```javascript
// In map load handler, after all layers added:
setTimeout(() => {
  map.flyTo({
    center: [-151.20, 59.58],
    zoom: 11.5,
    pitch: 65,
    bearing: 120,
    speed: 0.4,
    curve: 1.5,
    essential: true
  });
  map.once('moveend', () => {
    document.getElementById('trail-cards').classList.add('visible');
    document.getElementById('header').classList.add('visible');
  });
}, 800);
```

**Step 2: Fade-in CSS for cards and header**

```css
#trail-cards, #header {
  opacity: 0;
  transition: opacity 0.8s ease;
}
#trail-cards.visible, #header.visible {
  opacity: 1;
}
```

**Step 3: Visual polish**

- Add subtle CSS transitions for all interactive elements
- Ensure smooth card hover animations
- Add a subtle gradient overlay at the bottom of the viewport (below cards) to help cards stand out against the map
- Fine-tune colors and spacing

**Step 4: Verify full experience end-to-end**

Test the complete flow:
1. Page loads → wide view of bay
2. Camera flies in → cards and header fade in
3. Click a card → camera flies to trail, path animates, info panel slides in
4. Click another card → smooth transition
5. Click empty map → deselects
6. "Take the Tour" → guided fly-through
7. Resize to mobile width → responsive layout

**Step 5: Commit**

```bash
git add trail-map/
git commit -m "feat: opening animation and visual polish"
```

---

### Task 10: Final Testing & Cleanup

**Files:**
- All files in `trail-map/`

**Step 1: Cross-browser check**

Open in Safari and Chrome. Verify:
- 3D terrain renders
- Animations are smooth
- Touch gestures work on mobile viewport
- No console errors

**Step 2: Performance check**

- Verify page loads in under 3 seconds on a reasonable connection
- Check that animations maintain 60fps
- Ensure images are reasonable size (webp, under 500KB each)

**Step 3: Clean up any TODO comments or debug code**

**Step 4: Final commit**

```bash
git add trail-map/
git commit -m "chore: final cleanup and polish"
```

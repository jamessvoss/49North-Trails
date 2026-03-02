# 49North Trail Explorer — Technical Reference

> **Last updated:** 2026-03-01
> **Live URL:** https://xnautical-8a296.web.app/trails
> **Local dev:** `cd trail-map && python3 -m http.server 8000` then open `http://localhost:8000`
> **Source of truth:** `/Users/jvoss/Documents/49North/trail-map/`
> **Deployed via:** Firebase Hosting on the XNautical project (`xnautical-8a296`)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Structure](#file-structure)
3. [Tech Stack & Dependencies](#tech-stack--dependencies)
4. [Map Configuration](#map-configuration)
5. [GeoJSON Data Schema](#geojson-data-schema)
6. [Trail Registry (TRAILS config)](#trail-registry-trails-config)
7. [Map Layers (render order)](#map-layers-render-order)
8. [Trail Color Registry](#trail-color-registry)
9. [All GeoJSON Features](#all-geojson-features)
10. [Water Taxi Route Conventions](#water-taxi-route-conventions)
11. [UI Components](#ui-components)
12. [Key Functions Reference](#key-functions-reference)
13. [Deployment](#deployment)
14. [Common Tasks (How-To)](#common-tasks-how-to)
15. [Data Sources](#data-sources)
16. [Known Limitations](#known-limitations)

---

## Architecture Overview

Single-page client-side app — no build tools, no frameworks. Three files (`index.html`, `styles.css`, `app.js`) plus a `trails.geojson` data file and trail images. Everything runs in the browser.

```
User loads page
  → MapLibre GL JS initializes with MapTiler satellite tiles
  → 3D terrain DEM loaded (1.2x exaggeration)
  → trails.geojson fetched → all layers rendered
  → Opening fly-in animation → UI fades in
  → User interacts (click cards, click trails, tour mode)
```

The app has two main data structures:
- **`TRAILS` object** in `app.js` — metadata for the 4 "featured" trails (cards + info panels)
- **`trails.geojson`** — all geographic data (7 hiking trails, 8 water taxi routes, 10 points)

Not every trail in the GeoJSON has a TRAILS entry. Trails without a TRAILS entry still render on the map with colored lines and labels but don't have cards or info panels.

---

## File Structure

```
49North/
├── trail-map/
│   ├── index.html          # HTML skeleton — all DOM elements
│   ├── styles.css          # All styling (responsive, dark theme)
│   ├── app.js              # All JavaScript (map, interactions, tour)
│   ├── trails.geojson      # All geographic data (trails, routes, points)
│   └── images/
│       ├── grewingk-glacier.webp
│       ├── grace-ridge.webp        # placeholder (SaddleTrail photo)
│       ├── china-poot-lake.webp
│       └── alpine-ridge.webp
└── docs/
    ├── plans/
    │   └── 2026-02-28-3d-trail-explorer-plan.md   # Original implementation plan
    └── TRAIL-MAP-TECHNICAL-REFERENCE.md            # This file
```

**Deployment target:** Files are copied to `/Users/jvoss/Documents/XNautical/website/trails/` and deployed via Firebase from the XNautical project.

---

## Tech Stack & Dependencies

| Dependency | Version | CDN | Purpose |
|---|---|---|---|
| MapLibre GL JS | 4.7.1 | `unpkg.com/maplibre-gl@4.7.1` | 3D map rendering, terrain, layers |
| MapTiler | — | API tiles | Satellite imagery + terrain DEM |

**MapTiler API Key:** `oenkzVJP4AUZcYIsm5xG`

**MapTiler tile sources used:**
- Satellite style: `https://api.maptiler.com/maps/satellite/style.json?key=...`
- Terrain DEM: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=...`

**Available fonts in MapTiler satellite style:**
- `Noto Sans Bold` — used for trail/taxi labels (confirmed working)
- `Open Sans Bold` — used for point labels (confirmed working)

**IMPORTANT:** Not all fonts work. `'Open Sans Bold'` works for point/symbol layers. `'Noto Sans Bold'` works for line-placement labels. If labels don't appear, the font is likely unavailable in the style.

---

## Map Configuration

```javascript
// Initial view (before fly-in animation)
center: [-151.35, 59.60]    // Wide view of Kachemak Bay
zoom: 10
pitch: 45
bearing: 90
maxPitch: 85

// Overview position (after fly-in, "All Trails" button, tour start)
center: [-151.30, 59.54]
zoom: 10.5
pitch: 55
bearing: 100

// Terrain
source: 'terrain-rgb-v2'
exaggeration: 1.2

// Sky
sky-color: '#87CEEB'
```

---

## GeoJSON Data Schema

All geographic data lives in `trails.geojson`. Three feature types:

### Hiking Trails (LineString, no `type` property)

```json
{
  "properties": {
    "name": "Grewingk Glacier Lake Trail",   // MUST match TRAILS config and color registry
    "distance_miles": 9.3,
    "distance_note": "through-hike via Saddle Trail",
    "difficulty": "moderate",
    "trailhead": "Glacier Spit",
    "source": "OpenStreetMap GPS trace",
    "label": "Grewingk Glacier Lake Trail | 3.1 mi"   // Displayed inline along trail
  },
  "geometry": { "type": "LineString", "coordinates": [[lng, lat], ...] }
}
```

**Key:** Hiking trails are identified by the **absence** of a `type` property. The filter `['!has', 'type']` separates them from water taxi routes.

### Water Taxi Routes (LineString, `type: "water-taxi"`)

```json
{
  "properties": {
    "name": "Water Taxi to Glacier Spit",
    "type": "water-taxi",                      // REQUIRED — distinguishes from hiking trails
    "trail": "Grewingk Glacier Lake Trail",    // Links to the trail this route serves
    "distance_nm": 6.6,
    "distance_mi": 7.6,
    "time_min_fast": 16,                       // At 25 knots
    "time_min_slow": 25,                       // At 16 knots
    "label": "7.6 mi | 16-25 min"             // Displayed at line center
  },
  "geometry": { "type": "LineString", "coordinates": [[lng, lat], ...] }
}
```

**Convention:** All water taxi routes start from Homer Spit `[-151.408300, 59.601300]`. Coordinates go Homer → destination. The `trail` property links to the hiking trail name it serves (used for dimming/highlighting on trail selection).

### Points (Point features)

```json
{
  "properties": {
    "name": "Glacier Spit Trailhead",
    "type": "trailhead"          // or "reference_point", "landmark"
  },
  "geometry": { "type": "Point", "coordinates": [lng, lat] }
}
```

---

## Trail Registry (TRAILS config)

The `TRAILS` object in `app.js` defines the 4 **featured** trails that get bottom cards and info panels. Not all trails on the map have entries here.

```javascript
const TRAILS = {
  'trail-slug': {
    name: 'Full Trail Name',           // MUST match GeoJSON feature name
    color: '#hex',                      // Trail color
    distance: '9.3 mi through-hike',   // Display string
    elevation: '1,269 ft',             // Display string
    time: '4-6 hours',                 // Display string
    difficulty: 'Moderate',            // Display string
    description: '...',                // Full description for info panel
    highlights: ['...', '...'],        // Bullet points for info panel
    dropoff: 'Location Name',          // Water taxi drop-off point
    pickup: 'Location Name',           // (optional) Water taxi pick-up point
    relatedTrails: ['Saddle Trail'],   // (optional) Trails to highlight together
    waterTaxiTrail: 'Other Trail',     // (optional) If taxi route is under another trail's name
    image: 'filename.webp',            // Image in images/ directory
    camera: {                          // Fly-to position when selected
      center: [lng, lat],
      zoom: 13,
      pitch: 65,
      bearing: 200
    }
  }
};
```

### Current Featured Trails

| Slug | Name | Color | Drop-off | Pick-up |
|---|---|---|---|---|
| `grewingk-glacier` | Grewingk Glacier Lake Trail | `#3b82f6` (blue) | Glacier Spit | Saddle Trailhead |
| `grace-ridge` | Grace Ridge Trail | `#ef4444` (red) | South Grace Ridge | Kayak Beach |
| `china-poot-lake` | China Poot Lake Trail | `#22c55e` (green) | Halibut Cove Lagoon | — |
| `alpine-ridge` | Alpine Ridge Trail | `#f97316` (orange) | Saddle Trailhead | — |

### Special Properties

- **`relatedTrails`**: When this trail is selected, related trails also stay bright (not dimmed). Used for Grewingk + Saddle Trail combo.
- **`waterTaxiTrail`**: If this trail shares a water taxi route with another trail. Alpine Ridge uses Grewingk's taxi route to Saddle Trailhead.
- **`pickup`**: If present, the info panel shows both "Drop-off" and "Pick-up" labels. If absent, shows "Water Taxi" label.

---

## Map Layers (render order)

Layers render bottom to top. Order matters for click/hover targeting.

| Layer ID | Type | Source Filter | Purpose |
|---|---|---|---|
| `water-taxi` | line | `type == "water-taxi"` | Dashed blue water taxi routes |
| `water-taxi-labels` | symbol | `type == "water-taxi"` | Distance/time labels at line center |
| `trail-line` | line | `LineString && !has type` | Colored hiking trail lines |
| `trail-line-labels` | symbol | `LineString && !has type` | Trail name + distance along line |
| `trail-points` | circle | `Point` | White dot markers at trailheads |
| `trail-labels` | symbol | `Point` | Text labels at trailhead points |

### Layer Style Details

**`trail-line`** uses a `match` expression on the `name` property for colors. When a trail is selected, `line-opacity` is set to a `case` expression (1 for active, 0.3 for others) and `line-width` changes (6 for active, 3 for others).

**`water-taxi`** is dashed (`line-dasharray: [4, 3]`), light blue (`#38bdf8`), 2.5px wide, 0.7 opacity. On trail selection, opacity dims to 0.15 for non-matching routes.

**`water-taxi-labels`** uses `symbol-placement: 'line-center'` — label appears at the midpoint of the route. Only shows when the line is long enough on screen.

**`trail-line-labels`** uses `symbol-placement: 'line'` with `symbol-spacing: 250` — labels repeat along the trail curve. Text size 14px. Only shows when zoomed in enough for the text to fit along the line geometry.

---

## Trail Color Registry

Colors are defined in TWO places that must stay in sync:
1. `TRAILS` config object (for featured trails)
2. `trail-line` layer `match` expression (for ALL trails)

| Trail Name | Hex Color | Tailwind Name |
|---|---|---|
| Grewingk Glacier Lake Trail | `#3b82f6` | blue-500 |
| Grace Ridge Trail | `#ef4444` | red-500 |
| China Poot Lake Trail | `#22c55e` | green-500 |
| Alpine Ridge Trail | `#f97316` | orange-500 |
| Saddle Trail | `#a855f7` | purple-500 |
| Sadie Knob Trail | `#ec4899` | pink-500 |
| Coalition Loop Trail | `#14b8a6` | teal-500 |

**To add a new trail color:** Update the `match` expression in the `trail-line` layer paint property. Add a new `'Trail Name', '#hexcolor'` pair before the fallback `'#ffffff'`.

---

## All GeoJSON Features

### Hiking Trails (7)

| Trail | GPS Distance | Points | Start → End |
|---|---|---|---|
| Grewingk Glacier Lake Trail | 3.1 mi | 123 | `[-151.197, 59.622]` → `[-151.139, 59.608]` |
| Alpine Ridge Trail | 2.6 mi | 103 | `[-151.164, 59.604]` → `[-151.108, 59.588]` |
| Saddle Trail | 1.3 mi | 63 | `[-151.153, 59.609]` → `[-151.164, 59.601]` |
| China Poot Lake Trail | 2.6 mi | 100 | `[-151.190, 59.536]` → `[-151.196, 59.560]` |
| Grace Ridge Trail | 8.1 mi | 277 | `[-151.471, 59.501]` → `[-151.366, 59.443]` |
| Sadie Knob Trail | 1.7 mi | 79 | `[-151.457, 59.513]` → `[-151.422, 59.525]` |
| Coalition Loop Trail | 5.3 mi | 648 | `[-151.201, 59.559]` → `[-151.189, 59.548]` |

### Water Taxi Routes (8)

| Route | Distance | Time (16-25 kts) | Serves Trail |
|---|---|---|---|
| Homer → Glacier Spit | 7.6 mi | 16-25 min | Grewingk Glacier Lake Trail |
| Homer → Saddle Trailhead | 8.8 mi | 18-29 min | Grewingk Glacier Lake Trail |
| Homer → Halibut Cove Lagoon | 10.7 mi | 22-35 min | China Poot Lake Trail |
| Homer → China Poot | 7.1 mi | 15-23 min | China Poot Lake Trail |
| Homer → Kayak Beach | 7.3 mi | 15-24 min | Grace Ridge Trail |
| Homer → South Grace Ridge | 13.8 mi | 29-45 min | Grace Ridge Trail |
| Homer → Bear Cove | 16.2 mi | 34-53 min | Bear Cove |
| Homer → Sadie Knob | 8.2 mi | 17-27 min | Sadie Knob Trail |

### Points (10)

| Name | Type | Coordinates |
|---|---|---|
| Homer Spit | reference_point | `[-151.4083, 59.6013]` |
| Glacier Spit Trailhead | trailhead | `[-151.1966, 59.6225]` |
| Saddle Trail Junction / Alpine Ridge Trailhead | trailhead | `[-151.1640, 59.6013]` |
| Halibut Cove Lagoon Trailhead | trailhead | `[-151.1951, 59.5614]` |
| Kayak Beach Trailhead | trailhead | `[-151.4710, 59.5011]` |
| South Grace Ridge Trailhead | trailhead | `[-151.3660, 59.4430]` |
| Sadie Knob Trailhead | trailhead | `[-151.4574, 59.5135]` |
| Grewingk Creek Tram | landmark | `[-151.1550, 59.6100]` |
| Bear Cove | reference_point | `[-151.0470, 59.7432]` |
| China Poot | reference_point | `[-151.2418, 59.5513]` |

---

## Water Taxi Route Conventions

1. **All routes start at Homer Spit** `[-151.408300, 59.601300]` — this is always `coordinates[0]`
2. **Coordinates go Homer → destination** (not reverse)
3. **Route coordinates were manually traced** following the actual water path — avoid crossing land
4. **The `trail` property** links the route to its hiking trail by name. This is used for highlighting/dimming when a trail is selected
5. **Distance/time calculations** use haversine formula. Speed range: 16-25 knots
6. **Routes that share paths** (e.g., Kayak Beach and South Grace Ridge share the initial segment from Homer) should have identical coordinates for the shared portion
7. **China Poot water taxi routes must stay east** (less negative longitude) of the Saddle Trail water taxi route — they should never cross

---

## UI Components

### Header (`#header`)
- Fixed top bar with logo and action buttons
- Buttons: "All Trails" (resets view) and "Take the Tour" (starts auto-tour)
- Fades in after opening fly-in animation

### Trail Cards (`#trail-cards`)
- Fixed bottom bar, horizontally centered
- 4 cards generated from `TRAILS` config via `buildTrailCards()`
- Each card: photo, name, difficulty badge, distance
- Click → `selectTrail(id)`
- Active card gets colored border glow via `--trail-color` CSS variable
- Mobile: horizontal scroll with snap

### Info Panel (`#info-panel`)
- Right-side slide-in panel (400px wide)
- Generated by `showInfoPanel(trailId)` — completely rebuilt each time
- Contains: close button, hero image, title, difficulty badge, 2x2 stats grid, description, highlights list, "Book This Adventure" CTA
- Mobile: slides up from bottom (70vh height)
- `--trail-color` CSS variable drives highlight bullet colors

### Elevation Profile (`#elevation-profile`)
- Canvas element, 400x120px, centered above trail cards
- Samples elevation from terrain DEM via `map.queryTerrainElevation()`
- Draws gradient-filled area chart with trail color
- Shows min/max elevation (ft) and total distance (mi)

### Tour Overlay (`#tour-overlay`)
- Centered text overlay showing trail name during auto-tour
- Large white text with heavy text-shadow
- Fades in/out with CSS transitions

### Controls Hint (`#controls-hint`)
- Shows "Scroll to zoom / Drag to pan / Right-drag to rotate / Ctrl+drag to tilt"
- Appears briefly after opening animation, then fades out after 5 seconds

### Coordinate Popup
- Clicking empty map area shows a popup with `lat, lng`
- Click the text to copy coordinates to clipboard
- Uses `maplibregl.Popup`

---

## Key Functions Reference

### `selectTrail(trailId)`
Core interaction. When called:
1. Updates card active states (`.active` class)
2. Dims non-selected trails to 0.3 opacity (including related trails logic)
3. Dims non-matching water taxi routes to 0.15 opacity
4. Flies camera to trail's `camera` position
5. Calls `animateTrailPath()` — widens selected trail line
6. Calls `showInfoPanel()` — builds and slides in the panel
7. Calls `showElevationProfile()` — renders canvas chart

### `deselectTrail()`
Resets everything: removes active card class, restores all opacities/widths, hides panel and elevation.

### `flyToOverview()`
Deselects and flies to the overview camera position.

### `startTour()` / `stopTour()` / `endTour()`
Auto-tour mode using `AbortController` for cancellation. Sequentially flies to each trail in `TRAILS` order, showing name overlay and selecting each trail. Stoppable via button, Escape key, or map click.

### `showElevationProfile(trailId)`
Fetches trail coordinates from cached GeoJSON, samples elevation via `map.queryTerrainElevation()`, draws Canvas 2D area chart with gradient fill. Uses `haversineDistance()` for cumulative distance along trail.

### `loadTrailGeoJSON()`
Fetches `trails.geojson` and caches it in `trailGeoJSON` variable. Called on map load for elevation profile use.

### `buildTrailCards()`
Generates trail card DOM elements from `TRAILS` config. Called once on map load.

---

## Deployment

### Prerequisites
- Firebase CLI installed (`npm i -g firebase-tools`)
- Logged in to Firebase (`firebase login`)
- Access to `xnautical-8a296` project

### Deploy Steps

```bash
# 1. Copy updated files to XNautical website
cp trail-map/app.js ~/Documents/XNautical/website/trails/app.js
cp trail-map/styles.css ~/Documents/XNautical/website/trails/styles.css
cp trail-map/index.html ~/Documents/XNautical/website/trails/index.html
cp trail-map/trails.geojson ~/Documents/XNautical/website/trails/trails.geojson
cp trail-map/images/* ~/Documents/XNautical/website/trails/images/

# 2. Deploy from XNautical directory
cd ~/Documents/XNautical
firebase deploy --only hosting:website

# Live at: https://xnautical-8a296.web.app/trails
```

### Firebase Config (in XNautical project)
- **Project ID:** `xnautical-8a296`
- **Hosting target:** `website`
- **Public directory:** `website/`
- **Site URL:** `https://xnautical-8a296.web.app`
- **Trail map path:** `/trails` (maps to `website/trails/`)

The XNautical `firebase.json` uses `"target": "website"` with `"public": "website"`. The trail map lives in the `website/trails/` subdirectory.

---

## Common Tasks (How-To)

### Add a New Hiking Trail

1. **Get coordinates:** Use OpenStreetMap Overpass API:
   ```
   curl -s 'https://overpass-api.de/api/interpreter' \
     --data-urlencode 'data=[out:json];way["name"~"Trail Name"](59.4,-151.5,59.7,-151.0);out geom;'
   ```
   Or use the coordinate popup on the map to trace manually.

2. **Add to `trails.geojson`:** Add a LineString feature WITHOUT a `type` property. Include `name`, `label` (for inline text), and other metadata.

3. **Add color to `app.js`:** In the `trail-line` layer's `match` expression, add `'Trail Name', '#hexcolor'` before the `'#ffffff'` fallback.

4. **(Optional) Add to TRAILS config:** If you want a bottom card and info panel, add an entry to the `TRAILS` object with all required fields.

### Add a New Water Taxi Route

1. **Trace the route:** Use the coordinate popup to collect waypoints from Homer Spit to the destination. Work from destination back to Homer, then reverse the points.

2. **Add to `trails.geojson`:** Add a LineString feature with `"type": "water-taxi"` and `"trail": "Trail Name"`. Start coordinates at Homer Spit `[-151.408300, 59.601300]`.

3. **Calculate distance/time:** Use haversine formula. Speed range 16-25 knots. Add `distance_mi`, `time_min_fast`, `time_min_slow`, and `label` properties.

### Modify an Existing Water Taxi Route

Edit the coordinates array in `trails.geojson` directly, or use Python:
```python
import json
with open('trail-map/trails.geojson') as f:
    data = json.load(f)
for feature in data['features']:
    if feature['properties'].get('name') == 'Water Taxi to Wherever':
        feature['geometry']['coordinates'] = [new_coords]
        break
with open('trail-map/trails.geojson', 'w') as f:
    json.dump(data, f, indent=2)
```

### Change a Trail's Camera Position

Update the `camera` object in the `TRAILS` config in `app.js`. Fields: `center` (lng/lat), `zoom`, `pitch`, `bearing`.

### Add a New Trailhead Point

Add a Point feature to `trails.geojson`:
```json
{
  "type": "Feature",
  "properties": { "name": "Trailhead Name", "type": "trailhead" },
  "geometry": { "type": "Point", "coordinates": [lng, lat] }
}
```

---

## Data Sources

| Data | Source | Notes |
|---|---|---|
| Grewingk, Alpine Ridge, Saddle, China Poot trails | OpenStreetMap (Overpass API) | Original GPS traces, OSM way IDs in properties |
| Grace Ridge Trail | Approximate waypoints | 277 points, needs GPS validation |
| Sadie Knob Trail | OpenStreetMap (way 271408767) | South segment only |
| Coalition Loop Trail | OpenStreetMap (ways 1102790647 + 1102887819) | Two segments combined |
| Water taxi routes | Manually traced | User-provided GPS waypoints for China Poot, South Grace Ridge; approximate for others |
| Trail images | `/Users/jvoss/Documents/LuxuryHomerAdventures/Website/` | WebP format, all under 300KB |
| Satellite imagery | MapTiler | API key required |
| Terrain DEM | MapTiler terrain-rgb-v2 | Raster-DEM tiles |

### OpenStreetMap Overpass Query Pattern
```
[out:json];way["name"~"SEARCH_TERM"](59.4,-151.5,59.7,-151.0);out geom;
```
This searches for ways with matching names in the Kachemak Bay area bounding box.

---

## Known Limitations

1. **File:// protocol doesn't work** — GeoJSON fetch fails due to CORS. Must use HTTP server for local dev.
2. **Grace Ridge coordinates are approximate** — Not from GPS traces. Should be validated against actual GPS data.
3. **`SaddleTrail1920x1080.webp` is used as Grace Ridge image** — Placeholder until a proper Grace Ridge photo is available.
4. **Trail line labels require zoom** — `symbol-placement: 'line'` needs the line to be long enough on screen to fit text. Short trails may not show labels until zoomed in.
5. **Water taxi label visibility** — `symbol-placement: 'line-center'` also requires sufficient line length on screen.
6. **`queryTerrainElevation()` may return null** — If terrain tiles haven't loaded yet. Elevation profile gracefully skips null samples.
7. **No offline support** — Requires internet for MapTiler tiles and MapLibre CDN.
8. **Single GeoJSON source** — All data in one file. If it grows very large, consider splitting.
9. **Browser caching** — After deploying updates, users may need hard refresh (Cmd+Shift+R). Firebase hosting has cache headers set.

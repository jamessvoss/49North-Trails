# 49North 3D Trail Explorer — Design

## Goal
A beautiful, immersive 3D interactive trail page showcasing the 4 most popular hikes accessible by water taxi across Kachemak Bay. Both a "wow factor" marketing piece and a practical trail guide.

## Tech Stack
- MapLibre GL JS + MapTiler (existing stack)
- Vanilla HTML/CSS/JS — no build tools
- Standalone full-screen page

## Trails
1. Grewingk Glacier Lake Trail (Glacier Spit drop-off)
2. Grace Ridge Trail (Kayak Beach drop-off)
3. China Poot Lake Trail (Halibut Cove Lagoon drop-off)
4. Alpine Ridge Trail (Halibut Cove drop-off)

## Layout
- Full-viewport 3D terrain map as background
- Trail cards docked at bottom (photo, name, difficulty, distance)
- "Take the Tour" button top-right
- Info panel slides in from right on trail selection
- 49North branding top-left

## Features

### Opening Animation
Wide Kachemak Bay view → fly-in to 65° pitch overview showing all 4 trails

### Animated Trail Drawing
Selected trail path "draws" itself via line-dasharray animation. Other trails dim to 30%.

### Fly-To Camera
Each trail has a curated camera position (bearing, pitch, zoom). Smooth flyTo on selection.

### Trail Info Panel (right slide-in)
- Hero photo
- Name + difficulty badge
- Stats: distance, elevation, time, difficulty
- Description + highlights
- Water taxi drop-off info
- "Book This Adventure" CTA

### Elevation Profile
Canvas 2D chart below info panel. Distance on X, elevation on Y. Generated from trail coordinates + terrain DEM.

### Auto-Tour Mode
Sequential fly-through of all 4 trails. 5s pause per trail with animated path + overlay text. Click/Escape to exit.

### Trail Cards (Bottom Bar)
4 horizontal cards. Active card highlights with trail color. Click → fly-to + info panel. Mobile: horizontally scrollable.

## Mobile
- Info panel slides from bottom (70vh)
- Trail cards horizontally scrollable
- Touch gestures for map interaction
- Tour mode unchanged

## Data Changes
- Add Grace Ridge Trail coordinates to GeoJSON
- Remove Poot Peak Trail
- Add curated camera positions per trail

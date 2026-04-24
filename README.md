# PartScope

PartScope is a small Three.js viewer for reviewing STL assemblies in the browser.
It is built for the tight loop: open the model, inspect the stack, cut a section, isolate a part, move on.

![PartScope overview](.github/screenshots/partscope-overview.png)

## Why It Exists

Most CAD review tools are either too heavy, too closed, or too tied to a larger system.
PartScope keeps the job narrow:

- inspect a mechanical assembly quickly
- compare parts in context
- check sections, edges, and exploded views
- keep the asset flow local and simple

## Features

- View presets for fast orientation
- Exploded view and adjustable spin
- Section cuts on X, Y, and Z
- Edge, wireframe, x-ray, and grid overlays
- Part selection, focus, and isolation
- Local sample assembly generator for first-run development

![PartScope section view](.github/screenshots/partscope-section.png)

## Quick Start

```bash
npm install
npm run generate:sample-assets
npm run dev
```

That generates a local sample assembly in `public/models/concept_puck_v3`, then starts the viewer.
The generated STL files are ignored by git so they do not replace production geometry in deployed builds.

## Use Your Own STL Export

Point the viewer at a local export folder:

```bash
npm run link:assets -- /absolute/path/to/export/folder
```

That replaces `public/models/concept_puck_v3` with a local symlink, so your real assembly loads without committing private geometry.

To restore the local sample assembly:

```bash
npm run generate:sample-assets
```

## Model Contract

The current viewer configuration expects these STL filenames:

- `concept_puck_v3_base.stl`
- `concept_puck_v3_battery_18650.stl`
- `concept_puck_v3_main_board.stl`
- `concept_puck_v3_mezz_connectors.stl`
- `concept_puck_v3_mic_capsules.stl`
- `concept_puck_v3_sensor_board.stl`
- `concept_puck_v3_top.stl`
- `concept_puck_v3_vibration_sensor.stl`

## Build

```bash
npm run build
```

## Notes

- The sample geometry is intentionally simple and local-only. It exists to make the repo runnable and document the expected part layout without shipping demo geometry in production.
- The viewer stays separate from hardware generation scripts so the review surface can evolve independently.
- The local symlink flow is still the intended path for real assemblies.

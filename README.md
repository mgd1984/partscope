# PartScope

Standalone Three.js CAD review app for mechanical assemblies and agentic CAD workflows.

## Development

```bash
npm install
npm run link:assets -- /absolute/path/to/export/folder
npm run dev
```

`link:assets` creates a local symlink at:

- `public/models/concept_puck_v3`

Point it at any compatible STL export folder that contains the expected STL part set.

Example:

```bash
npm run link:assets -- /path/to/concept_puck_v3
```

## Build

```bash
npm run build
```

## Notes

- The viewer is intentionally split from hardware generation scripts so UI and CAD review tooling can evolve independently.
- The asset symlink is generated locally and ignored by git, so the repo stays public-safe and machine-agnostic.
- If you want this repo to be fully self-contained for public users, replace the local symlink flow with committed sample assets or a download script.

## Expected asset names

The default viewer configuration looks for these STL files in the linked folder:

- `concept_puck_v3_base.stl`
- `concept_puck_v3_battery_18650.stl`
- `concept_puck_v3_main_board.stl`
- `concept_puck_v3_mezz_connectors.stl`
- `concept_puck_v3_mic_capsules.stl`
- `concept_puck_v3_sensor_board.stl`
- `concept_puck_v3_top.stl`
- `concept_puck_v3_vibration_sensor.stl`

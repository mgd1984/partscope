import fs from "node:fs";
import path from "node:path";

const outDir = path.resolve("public/models/concept_puck_v3");

const partFiles = [
  {
    name: "concept_puck_v3_base.stl",
    mesh: makeCylinder({
      radius: 34,
      height: 6,
      segments: 56,
      center: [0, 0, 3],
    }),
  },
  {
    name: "concept_puck_v3_battery_18650.stl",
    mesh: makeCylinder({
      radius: 9,
      height: 46,
      segments: 36,
      center: [0, 0, 14],
      axis: "x",
    }),
  },
  {
    name: "concept_puck_v3_main_board.stl",
    mesh: makeBox({
      min: [-26, -18, 7.4],
      max: [26, 18, 9],
    }),
  },
  {
    name: "concept_puck_v3_mezz_connectors.stl",
    mesh: combineMeshes([
      makeBox({ min: [-7, -7, 9], max: [7, 7, 13] }),
      makeBox({ min: [-15, -15, 9], max: [-11, -11, 13] }),
      makeBox({ min: [11, -15, 9], max: [15, -11, 13] }),
      makeBox({ min: [-15, 11, 9], max: [-11, 15, 13] }),
      makeBox({ min: [11, 11, 9], max: [15, 15, 13] }),
    ]),
  },
  {
    name: "concept_puck_v3_sensor_board.stl",
    mesh: makeBox({
      min: [-23, -16, 15.2],
      max: [23, 16, 16.8],
    }),
  },
  {
    name: "concept_puck_v3_mic_capsules.stl",
    mesh: combineMeshes([
      makeCylinder({ radius: 4.2, height: 6, segments: 28, center: [-18, 18, 19.8] }),
      makeCylinder({ radius: 4.2, height: 6, segments: 28, center: [18, 18, 19.8] }),
      makeCylinder({ radius: 4.2, height: 6, segments: 28, center: [-18, -18, 19.8] }),
      makeCylinder({ radius: 4.2, height: 6, segments: 28, center: [18, -18, 19.8] }),
    ]),
  },
  {
    name: "concept_puck_v3_vibration_sensor.stl",
    mesh: combineMeshes([
      makeBox({ min: [-18, -7, 10], max: [-10, 1, 15] }),
      makeCylinder({ radius: 3.5, height: 8, segments: 24, center: [-14, -3, 16] }),
    ]),
  },
  {
    name: "concept_puck_v3_top.stl",
    mesh: combineMeshes([
      makeCylinder({ radius: 34, height: 5.5, segments: 56, center: [0, 0, 25.75] }),
      makeCylinder({ radius: 11.5, height: 2.4, segments: 40, center: [0, 0, 29.7] }),
    ]),
  },
];

fs.mkdirSync(outDir, { recursive: true });

for (const part of partFiles) {
  fs.writeFileSync(path.join(outDir, part.name), toAsciiStl(part.name, part.mesh));
}

console.log(`Generated ${partFiles.length} sample STL files in ${outDir}`);

function combineMeshes(meshes) {
  return meshes.flat();
}

function makeBox({ min, max }) {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;

  const p000 = [x0, y0, z0];
  const p100 = [x1, y0, z0];
  const p110 = [x1, y1, z0];
  const p010 = [x0, y1, z0];
  const p001 = [x0, y0, z1];
  const p101 = [x1, y0, z1];
  const p111 = [x1, y1, z1];
  const p011 = [x0, y1, z1];

  return [
    tri(p000, p100, p110), tri(p000, p110, p010),
    tri(p001, p111, p101), tri(p001, p011, p111),
    tri(p000, p001, p101), tri(p000, p101, p100),
    tri(p100, p101, p111), tri(p100, p111, p110),
    tri(p110, p111, p011), tri(p110, p011, p010),
    tri(p010, p011, p001), tri(p010, p001, p000),
  ];
}

function makeCylinder({ radius, height, segments, center, axis = "z" }) {
  const [cx, cy, cz] = center;
  const half = height / 2;
  const bottom = [];
  const top = [];

  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    if (axis === "z") {
      bottom.push([cx + x, cy + y, cz - half]);
      top.push([cx + x, cy + y, cz + half]);
    } else if (axis === "x") {
      bottom.push([cx - half, cy + x, cz + y]);
      top.push([cx + half, cy + x, cz + y]);
    } else {
      bottom.push([cx + x, cy - half, cz + y]);
      top.push([cx + x, cy + half, cz + y]);
    }
  }

  const centerBottom = axis === "z" ? [cx, cy, cz - half] : axis === "x" ? [cx - half, cy, cz] : [cx, cy - half, cz];
  const centerTop = axis === "z" ? [cx, cy, cz + half] : axis === "x" ? [cx + half, cy, cz] : [cx, cy + half, cz];
  const triangles = [];

  for (let i = 0; i < segments; i += 1) {
    const next = (i + 1) % segments;
    triangles.push(tri(bottom[i], top[i], top[next]));
    triangles.push(tri(bottom[i], top[next], bottom[next]));
    triangles.push(tri(centerBottom, bottom[next], bottom[i]));
    triangles.push(tri(centerTop, top[i], top[next]));
  }

  return triangles;
}

function tri(a, b, c) {
  return [a, b, c];
}

function toAsciiStl(name, triangles) {
  const lines = [`solid ${name}`];

  for (const [a, b, c] of triangles) {
    const normal = normalize(cross(sub(b, a), sub(c, a)));
    lines.push(`  facet normal ${fmt(normal[0])} ${fmt(normal[1])} ${fmt(normal[2])}`);
    lines.push("    outer loop");
    lines.push(`      vertex ${fmt(a[0])} ${fmt(a[1])} ${fmt(a[2])}`);
    lines.push(`      vertex ${fmt(b[0])} ${fmt(b[1])} ${fmt(b[2])}`);
    lines.push(`      vertex ${fmt(c[0])} ${fmt(c[1])} ${fmt(c[2])}`);
    lines.push("    endloop");
    lines.push("  endfacet");
  }

  lines.push(`endsolid ${name}`);
  lines.push("");
  return lines.join("\n");
}

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function fmt(value) {
  return Number(value.toFixed(6)).toString();
}

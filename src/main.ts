import "./styles.css";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";

type PartDefinition = {
  id: string;
  label: string;
  file: string;
  color: number;
  metalness?: number;
  roughness?: number;
  explode: THREE.Vector3Tuple;
};

type LoadedPart = {
  definition: PartDefinition;
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  edges: THREE.LineSegments;
  assembled: THREE.Vector3;
  localBounds: THREE.Box3;
  triangles: number;
};

type ViewPreset = "iso" | "top" | "front" | "right" | "left" | "bottom";
type SectionAxis = "x" | "y" | "z";
type ThemeName = "light" | "dark";

const parts: PartDefinition[] = [
  {
    id: "base",
    label: "Base",
    file: "/models/concept_puck_v3/concept_puck_v3_base.stl",
    color: 0x32363d,
    metalness: 0.72,
    roughness: 0.32,
    explode: [0, 0, 0],
  },
  {
    id: "battery",
    label: "18650",
    file: "/models/concept_puck_v3/concept_puck_v3_battery_18650.stl",
    color: 0x6e7f38,
    metalness: 0.18,
    roughness: 0.5,
    explode: [8, -4, 5],
  },
  {
    id: "mainBoard",
    label: "Main board",
    file: "/models/concept_puck_v3/concept_puck_v3_main_board.stl",
    color: 0x17603c,
    roughness: 0.76,
    explode: [0, -1.6, 5],
  },
  {
    id: "vibration",
    label: "Vibe reserve",
    file: "/models/concept_puck_v3/concept_puck_v3_vibration_sensor.stl",
    color: 0xc07b28,
    metalness: 0.35,
    roughness: 0.34,
    explode: [-6, -1.8, 4.5],
  },
  {
    id: "mezz",
    label: "Mezzanine",
    file: "/models/concept_puck_v3/concept_puck_v3_mezz_connectors.stl",
    color: 0xd0b56c,
    metalness: 0.6,
    roughness: 0.34,
    explode: [0, -1, 8.5],
  },
  {
    id: "sensorBoard",
    label: "Sensor board",
    file: "/models/concept_puck_v3/concept_puck_v3_sensor_board.stl",
    color: 0x1c7a4a,
    roughness: 0.68,
    explode: [0, 2, 13],
  },
  {
    id: "mics",
    label: "Mic capsules",
    file: "/models/concept_puck_v3/concept_puck_v3_mic_capsules.stl",
    color: 0x1c2024,
    metalness: 0.65,
    roughness: 0.28,
    explode: [0, 2, 13],
  },
  {
    id: "top",
    label: "Cap",
    file: "/models/concept_puck_v3/concept_puck_v3_top.stl",
    color: 0xd9dee4,
    metalness: 0.04,
    roughness: 0.4,
    explode: [0, 1.8, 22],
  },
];

const canvas = mustQuery<HTMLCanvasElement>("#scene");
const statusEl = mustQuery<HTMLElement>("#status");
const modelMetricsEl = mustQuery<HTMLElement>("#modelMetrics");
const themeToggleEl = mustQuery<HTMLButtonElement>("#themeToggle");
const explodeRangeEl = mustQuery<HTMLInputElement>("#explodeRange");
const explodeValueEl = mustQuery<HTMLOutputElement>("#explodeValue");
const spinRangeEl = mustQuery<HTMLInputElement>("#spinRange");
const spinValueEl = mustQuery<HTMLOutputElement>("#spinValue");
const sectionRangeEl = mustQuery<HTMLInputElement>("#sectionRange");
const sectionValueEl = mustQuery<HTMLOutputElement>("#sectionValue");
const sectionAxisLabelEl = mustQuery<HTMLElement>("#sectionAxisLabel");
const toggleExplodeEl = mustQuery<HTMLButtonElement>("#toggleExplode");
const toggleSpinEl = mustQuery<HTMLButtonElement>("#toggleSpin");
const toggleSectionEl = mustQuery<HTMLButtonElement>("#toggleSection");
const toggleEdgesEl = mustQuery<HTMLButtonElement>("#toggleEdges");
const toggleWireframeEl = mustQuery<HTMLButtonElement>("#toggleWireframe");
const toggleXrayEl = mustQuery<HTMLButtonElement>("#toggleXray");
const toggleGridEl = mustQuery<HTMLButtonElement>("#toggleGrid");
const resetEl = mustQuery<HTMLButtonElement>("#resetCamera");
const focusSelectedEl = mustQuery<HTMLButtonElement>("#focusSelected");
const isolateSelectedEl = mustQuery<HTMLButtonElement>("#isolateSelected");
const showAllPartsEl = mustQuery<HTMLButtonElement>("#showAllParts");
const partListEl = mustQuery<HTMLElement>("#partList");
const selectedNameEl = mustQuery<HTMLElement>("#selectedName");
const selectedMetricsEl = mustQuery<HTMLElement>("#selectedMetrics");

const themePalette: Record<ThemeName, { scene: number; fog: number; floor: number; grid: number; gridSubtle: number }> = {
  light: {
    scene: 0xf4f2ee,
    fog: 0xf4f2ee,
    floor: 0xe2ded5,
    grid: 0x7f8588,
    gridSubtle: 0xc8c7c1,
  },
  dark: {
    scene: 0x101416,
    fog: 0x101416,
    floor: 0x161c1f,
    grid: 0x607078,
    gridSubtle: 0x2c363b,
  },
};

let theme: ThemeName = getInitialTheme();
document.documentElement.dataset.theme = theme;

const scene = new THREE.Scene();
scene.background = new THREE.Color(themePalette[theme].scene);
scene.fog = new THREE.Fog(themePalette[theme].fog, 180, 380);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
camera.up.set(0, 0, 1);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.localClippingEnabled = true;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 35;
controls.maxDistance = 260;
controls.target.set(0, 0, 15);

const assembly = new THREE.Group();
scene.add(assembly);

const selectionBox = new THREE.Box3Helper(new THREE.Box3(), 0xe05b2f);
selectionBox.visible = false;
scene.add(selectionBox);

const gridGroup = new THREE.Group();
scene.add(gridGroup);

const floorMaterial = new THREE.MeshStandardMaterial({ color: themePalette[theme].floor, roughness: 0.88 });
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(78, 128),
  floorMaterial,
);
floor.position.z = -0.08;
gridGroup.add(floor);

const grid = new THREE.GridHelper(160, 32, themePalette[theme].grid, themePalette[theme].gridSubtle);
grid.rotation.x = Math.PI / 2;
grid.position.z = 0.02;
gridGroup.add(grid);

const axisGroup = new THREE.Group();
axisGroup.add(makeAxis(42, 0xff4c3b, new THREE.Vector3(1, 0, 0)));
axisGroup.add(makeAxis(42, 0x2d8a57, new THREE.Vector3(0, 1, 0)));
axisGroup.add(makeAxis(34, 0x3266d6, new THREE.Vector3(0, 0, 1)));
gridGroup.add(axisGroup);

const sectionPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 100);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const loader = new STLLoader();
const loadedParts: LoadedPart[] = [];

let assemblyBounds = new THREE.Box3();
let selectedPart: LoadedPart | null = null;
let explodeTarget = 0;
let explodeValue = 0;
let spinEnabled = true;
let spinSpeed = Number(spinRangeEl.value) / 18000;
let sectionEnabled = false;
let sectionAxis: SectionAxis = "z";
let edgesEnabled = true;
let wireframeEnabled = false;
let xrayEnabled = false;
let dragStart: { x: number; y: number } | null = null;
let isolated = false;

addLights();
bindControls();
applyTheme(theme);
resize();

loadAssembly().catch((error: unknown) => {
  console.error(error);
  updateStatus("Failed to load geometry");
});
animate();

function mustQuery<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Viewer markup is missing ${selector}`);
  return element;
}

function updateStatus(text: string): void {
  statusEl.textContent = text;
}

function getInitialTheme(): ThemeName {
  const saved = window.localStorage.getItem("monaq-cad-theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(nextTheme: ThemeName): void {
  theme = nextTheme;
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("monaq-cad-theme", theme);
  themeToggleEl.setAttribute("aria-pressed", String(theme === "dark"));
  themeToggleEl.querySelector("span:last-child")!.textContent = theme === "dark" ? "Light" : "Dark";

  const palette = themePalette[theme];
  scene.background = new THREE.Color(palette.scene);
  scene.fog = new THREE.Fog(palette.fog, 180, 380);
  floorMaterial.color.setHex(palette.floor);
  updateGridColors(palette.grid, palette.gridSubtle);
}

function updateGridColors(primary: number, secondary: number): void {
  const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
  materials[0]?.color.setHex(primary);
  materials[1]?.color.setHex(secondary);
}

function addLights(): void {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x89806f, 2.15));

  const key = new THREE.DirectionalLight(0xffffff, 3.1);
  key.position.set(80, -105, 140);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x9eb8ff, 1.45);
  fill.position.set(-110, -60, 90);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xb7f1ff, 1.8);
  rim.position.set(-20, 130, 115);
  scene.add(rim);
}

function makeAxis(length: number, color: number, direction: THREE.Vector3): THREE.ArrowHelper {
  return new THREE.ArrowHelper(direction, new THREE.Vector3(0, 0, 0.12), length, color, 5, 2.2);
}

function createMaterial(part: PartDefinition): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: part.color,
    metalness: part.metalness ?? 0,
    roughness: part.roughness ?? 0.55,
    side: THREE.DoubleSide,
    clippingPlanes: [],
  });
}

async function loadAssembly(): Promise<void> {
  updateStatus(`Loading 0 / ${parts.length}`);

  for (const [index, part] of parts.entries()) {
    const geometry = await loader.loadAsync(part.file);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    const material = createMaterial(part);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.id;

    const edgeGeometry = new THREE.EdgesGeometry(geometry, 28);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: edgeColor(part.color),
      transparent: true,
      opacity: 0.42,
      depthTest: true,
    });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.name = `${part.id}-edges`;
    mesh.add(edges);

    const triangles = Math.floor(geometry.attributes.position.count / 3);
    const localBounds = geometry.boundingBox?.clone() ?? new THREE.Box3();
    assembly.add(mesh);
    loadedParts.push({
      definition: part,
      mesh,
      edges,
      assembled: mesh.position.clone(),
      localBounds,
      triangles,
    });
    updateStatus(`Loading ${index + 1} / ${parts.length}`);
  }

  const rawBounds = new THREE.Box3().setFromObject(assembly);
  const center = rawBounds.getCenter(new THREE.Vector3());
  assembly.position.sub(center);
  assembly.position.z += rawBounds.getSize(new THREE.Vector3()).z / 2;
  assemblyBounds = new THREE.Box3().setFromObject(assembly);

  configureSectionRange();
  buildPartToggles();
  selectPart(loadedParts.find((part) => part.definition.id === "top") ?? loadedParts[0] ?? null);
  setView("iso");
  updateModelMetrics();
  updateStatus("Ready");
}

function edgeColor(color: number): number {
  const c = new THREE.Color(color);
  c.offsetHSL(0, -0.18, c.getHSL({ h: 0, s: 0, l: 0 }).l > 0.55 ? -0.28 : 0.32);
  return c.getHex();
}

function configureSectionRange(): void {
  const axisBounds = getAxisBounds(sectionAxis);
  const padding = 3;
  sectionRangeEl.min = Math.floor(axisBounds.min - padding).toString();
  sectionRangeEl.max = Math.ceil(axisBounds.max + padding).toString();
  sectionRangeEl.value = (axisBounds.max + padding).toFixed(1);
  sectionAxisLabelEl.textContent = `Cut ${sectionAxis.toUpperCase()}`;
  sectionValueEl.textContent = sectionEnabled ? `${Number(sectionRangeEl.value).toFixed(1)} mm` : "off";
  updateSectionAxisButtons();
  applyRenderModes();
}

function updateModelMetrics(): void {
  const size = assemblyBounds.getSize(new THREE.Vector3());
  const triangles = loadedParts.reduce((total, part) => total + part.triangles, 0);
  modelMetricsEl.textContent = `${fmt(size.x)} x ${fmt(size.y)} x ${fmt(size.z)} mm | ${loadedParts.length} parts | ${triangles.toLocaleString()} tris`;
}

function buildPartToggles(): void {
  const fragment = document.createDocumentFragment();

  for (const part of loadedParts) {
    const row = document.createElement("div");
    row.className = "part-row";
    row.dataset.part = part.definition.id;
    row.style.setProperty("--part-color", `#${part.definition.color.toString(16).padStart(6, "0")}`);

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = true;
    input.ariaLabel = `Show ${part.definition.label}`;
    input.addEventListener("input", () => {
      part.mesh.visible = input.checked;
      if (!input.checked && selectedPart === part) selectPart(null);
    });

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "part-select";
    selectButton.title = `Select ${part.definition.label}`;
    selectButton.innerHTML = `<span class="swatch" aria-hidden="true"></span><span>${part.definition.label}</span>`;
    selectButton.addEventListener("click", () => {
      selectPart(part);
      framePart(part);
    });

    row.append(input, selectButton);
    fragment.append(row);
  }

  partListEl.replaceChildren(fragment);
}

function bindControls(): void {
  themeToggleEl.addEventListener("click", () => {
    applyTheme(theme === "dark" ? "light" : "dark");
  });

  explodeRangeEl.addEventListener("input", () => {
    explodeTarget = Number(explodeRangeEl.value);
    updateExplodeUi();
  });

  toggleExplodeEl.addEventListener("click", () => {
    explodeTarget = explodeTarget > 0.5 ? 0 : 1;
    updateExplodeUi();
  });

  toggleSpinEl.addEventListener("click", () => {
    spinEnabled = !spinEnabled;
    toggleSpinEl.setAttribute("aria-pressed", String(spinEnabled));
  });

  spinRangeEl.addEventListener("input", () => {
    spinSpeed = Number(spinRangeEl.value) / 18000;
    spinValueEl.textContent = `${spinRangeEl.value}%`;
  });

  toggleSectionEl.addEventListener("click", () => {
    sectionEnabled = !sectionEnabled;
    sectionRangeEl.disabled = !sectionEnabled;
    toggleSectionEl.setAttribute("aria-pressed", String(sectionEnabled));
    applyRenderModes();
  });

  sectionRangeEl.addEventListener("input", () => {
    applyRenderModes();
  });

  document.querySelectorAll<HTMLButtonElement>("[data-section-axis]").forEach((button) => {
    button.addEventListener("click", () => {
      sectionAxis = button.dataset.sectionAxis as SectionAxis;
      configureSectionRange();
    });
  });

  toggleEdgesEl.addEventListener("click", () => {
    edgesEnabled = !edgesEnabled;
    toggleEdgesEl.setAttribute("aria-pressed", String(edgesEnabled));
    applyRenderModes();
  });

  toggleWireframeEl.addEventListener("click", () => {
    wireframeEnabled = !wireframeEnabled;
    toggleWireframeEl.setAttribute("aria-pressed", String(wireframeEnabled));
    applyRenderModes();
  });

  toggleXrayEl.addEventListener("click", () => {
    xrayEnabled = !xrayEnabled;
    toggleXrayEl.setAttribute("aria-pressed", String(xrayEnabled));
    applyRenderModes();
  });

  toggleGridEl.addEventListener("click", () => {
    gridGroup.visible = !gridGroup.visible;
    toggleGridEl.setAttribute("aria-pressed", String(gridGroup.visible));
  });

  resetEl.addEventListener("click", () => setView("iso"));
  focusSelectedEl.addEventListener("click", () => selectedPart && framePart(selectedPart));
  isolateSelectedEl.addEventListener("click", toggleIsolateSelected);
  showAllPartsEl.addEventListener("click", showAllParts);

  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view as ViewPreset));
  });

  canvas.addEventListener("pointerdown", (event) => {
    dragStart = { x: event.clientX, y: event.clientY };
  });

  canvas.addEventListener("pointerup", (event) => {
    if (!dragStart) return;
    const moved = Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y);
    dragStart = null;
    if (moved < 4) pickPart(event);
  });

  window.addEventListener("resize", resize);
}

function updateExplodeUi(): void {
  explodeRangeEl.value = String(explodeTarget);
  explodeValueEl.textContent = `${Math.round(explodeTarget * 100)}%`;
  toggleExplodeEl.setAttribute("aria-pressed", String(explodeTarget > 0.5));
}

function applyExplode(value: number): void {
  for (const part of loadedParts) {
    const offset = new THREE.Vector3(...part.definition.explode).multiplyScalar(value);
    part.mesh.position.copy(part.assembled).add(offset);
  }
  updateSelectionBox();
}

function applyRenderModes(): void {
  sectionPlane.normal.copy(getSectionNormal(sectionAxis));
  sectionPlane.constant = Number(sectionRangeEl.value);
  sectionValueEl.textContent = sectionEnabled ? `${Number(sectionRangeEl.value).toFixed(1)} mm` : "off";

  for (const part of loadedParts) {
    const material = part.mesh.material;
    material.clippingPlanes = sectionEnabled ? [sectionPlane] : [];
    material.wireframe = wireframeEnabled;
    material.opacity = xrayEnabled ? (part === selectedPart ? 0.62 : 0.24) : 1;
    material.transparent = xrayEnabled;
    material.depthWrite = !xrayEnabled;
    material.needsUpdate = true;
    part.edges.visible = edgesEnabled || wireframeEnabled || xrayEnabled;
  }
}

function getSectionNormal(axis: SectionAxis): THREE.Vector3 {
  if (axis === "x") return new THREE.Vector3(-1, 0, 0);
  if (axis === "y") return new THREE.Vector3(0, -1, 0);
  return new THREE.Vector3(0, 0, -1);
}

function getAxisBounds(axis: SectionAxis): { min: number; max: number } {
  if (axis === "x") return { min: assemblyBounds.min.x, max: assemblyBounds.max.x };
  if (axis === "y") return { min: assemblyBounds.min.y, max: assemblyBounds.max.y };
  return { min: assemblyBounds.min.z, max: assemblyBounds.max.z };
}

function updateSectionAxisButtons(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-section-axis]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.sectionAxis === sectionAxis));
  });
}

function pickPart(event: PointerEvent): void {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(loadedParts.map((part) => part.mesh), false);
  selectPart(hits.length ? (loadedParts.find((part) => part.mesh === hits[0].object) ?? null) : null);
}

function selectPart(part: LoadedPart | null): void {
  selectedPart = part;
  selectionBox.visible = Boolean(part);
  partListEl.querySelectorAll(".part-row").forEach((row) => {
    row.classList.toggle("selected", row instanceof HTMLElement && row.dataset.part === part?.definition.id);
  });

  if (!part) {
    selectedNameEl.textContent = "No selection";
    selectedMetricsEl.innerHTML = metricHtml([["Selection", "Click a part"]]);
    return;
  }

  selectedNameEl.textContent = part.definition.label;
  const bounds = worldBoundsFor(part);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  selectedMetricsEl.innerHTML = metricHtml([
    ["Envelope", `${fmt(size.x)} x ${fmt(size.y)} x ${fmt(size.z)} mm`],
    ["Center", `${fmt(center.x)}, ${fmt(center.y)}, ${fmt(center.z)} mm`],
    ["Z range", `${fmt(bounds.min.z)} to ${fmt(bounds.max.z)} mm`],
    ["Triangles", part.triangles.toLocaleString()],
  ]);
  updateSelectionBox();
  applyRenderModes();
}

function metricHtml(rows: Array<[string, string]>): string {
  return rows.map(([term, value]) => `<div><dt>${term}</dt><dd>${value}</dd></div>`).join("");
}

function updateSelectionBox(): void {
  if (!selectedPart) return;
  selectionBox.box.copy(worldBoundsFor(selectedPart));
  selectionBox.updateMatrixWorld(true);
}

function worldBoundsFor(part: LoadedPart): THREE.Box3 {
  return new THREE.Box3().setFromObject(part.mesh);
}

function framePart(part: LoadedPart): void {
  const bounds = worldBoundsFor(part);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z, 14);
  const direction = camera.position.clone().sub(controls.target).normalize();
  controls.target.copy(center);
  camera.position.copy(center).add(direction.multiplyScalar(radius * 3.4));
  camera.near = Math.max(0.1, radius / 80);
  camera.far = 1000;
  camera.updateProjectionMatrix();
  controls.update();
}

function toggleIsolateSelected(): void {
  if (!selectedPart) return;
  isolated = !isolated;
  isolateSelectedEl.textContent = isolated ? "Unisolate" : "Isolate";
  for (const part of loadedParts) {
    part.mesh.visible = !isolated || part === selectedPart;
  }
  syncPartCheckboxes();
}

function showAllParts(): void {
  isolated = false;
  isolateSelectedEl.textContent = "Isolate";
  for (const part of loadedParts) part.mesh.visible = true;
  syncPartCheckboxes();
}

function syncPartCheckboxes(): void {
  for (const part of loadedParts) {
    const row = partListEl.querySelector<HTMLElement>(`.part-row[data-part="${part.definition.id}"]`);
    const checkbox = row?.querySelector<HTMLInputElement>("input");
    if (checkbox) checkbox.checked = part.mesh.visible;
  }
}

function setView(view: ViewPreset): void {
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.view === view));
  });

  const target = new THREE.Vector3(0, 0, 15);
  const distance = 150;
  const positions: Record<ViewPreset, THREE.Vector3> = {
    iso: new THREE.Vector3(104, -130, 82),
    top: new THREE.Vector3(0.01, -0.01, distance),
    front: new THREE.Vector3(0, -distance, 28),
    right: new THREE.Vector3(distance, 0, 28),
    left: new THREE.Vector3(-distance, 0, 28),
    bottom: new THREE.Vector3(0.01, -0.01, -distance),
  };

  controls.target.copy(target);
  camera.position.copy(positions[view]);
  camera.near = 0.1;
  camera.far = 1000;
  camera.updateProjectionMatrix();
  controls.update();
}

function resize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function fmt(value: number): string {
  return value.toFixed(1);
}

function animate(): void {
  requestAnimationFrame(animate);

  explodeValue += (explodeTarget - explodeValue) * 0.09;
  explodeRangeEl.value = explodeValue.toFixed(3);
  explodeValueEl.textContent = `${Math.round(explodeValue * 100)}%`;
  applyExplode(explodeValue);

  if (spinEnabled) assembly.rotation.z += spinSpeed;
  controls.update();
  renderer.render(scene, camera);
}

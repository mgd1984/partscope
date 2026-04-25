import "./styles.css";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";

type ImportFormat = "stl" | "obj" | "ply" | "glb" | "gltf" | "3mf";
type ExportFormat = "stl" | "obj" | "ply" | "glb";
type SourceUnit = "mm" | "cm" | "m" | "in" | "custom";

type PartDefinition = {
  id: string;
  label: string;
  source: string | ArrayBuffer;
  fileName: string;
  format?: ImportFormat;
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
  explodeOffset: THREE.Vector3;
  localBounds: THREE.Box3;
  triangles: number;
};

type ViewPreset = "iso" | "top" | "front" | "right" | "left" | "bottom";
type SectionAxis = "x" | "y" | "z";
type ThemeName = "light" | "dark";

const demoParts: PartDefinition[] = [
  {
    id: "base",
    label: "Base",
    fileName: "concept_puck_v3_base.stl",
    source: "/models/concept_puck_v3/concept_puck_v3_base.stl",
    color: 0x32363d,
    metalness: 0.72,
    roughness: 0.32,
    explode: [0, 0, 0],
  },
  {
    id: "battery",
    label: "18650",
    fileName: "concept_puck_v3_battery_18650.stl",
    source: "/models/concept_puck_v3/concept_puck_v3_battery_18650.stl",
    color: 0x6e7f38,
    metalness: 0.18,
    roughness: 0.5,
    explode: [0, 0, 5],
  },
  {
    id: "mainBoard",
    label: "Main board",
    fileName: "concept_puck_v3_main_board.stl",
    source: "/models/concept_puck_v3/concept_puck_v3_main_board.stl",
    color: 0x17603c,
    roughness: 0.76,
    explode: [0, 0, 5],
  },
  {
    id: "vibration",
    label: "Vibe reserve",
    fileName: "concept_puck_v3_vibration_sensor.stl",
    source: "/models/concept_puck_v3/concept_puck_v3_vibration_sensor.stl",
    color: 0xc07b28,
    metalness: 0.35,
    roughness: 0.34,
    explode: [0, 0, 4.5],
  },
  {
    id: "mezz",
    label: "Mezzanine",
    fileName: "concept_puck_v3_mezz_connectors.stl",
    source: "/models/concept_puck_v3/concept_puck_v3_mezz_connectors.stl",
    color: 0xd0b56c,
    metalness: 0.6,
    roughness: 0.34,
    explode: [0, 0, 8.5],
  },
  {
    id: "sensorBoard",
    label: "Sensor board",
    fileName: "concept_puck_v3_sensor_board.stl",
    source: "/models/concept_puck_v3/concept_puck_v3_sensor_board.stl",
    color: 0x1c7a4a,
    roughness: 0.68,
    explode: [0, 0, 13],
  },
  {
    id: "mics",
    label: "Mic capsules",
    fileName: "concept_puck_v3_mic_capsules.stl",
    source: "/models/concept_puck_v3/concept_puck_v3_mic_capsules.stl",
    color: 0x1c2024,
    metalness: 0.65,
    roughness: 0.28,
    explode: [0, 0, 13],
  },
  {
    id: "top",
    label: "Cap",
    fileName: "concept_puck_v3_top.stl",
    source: "/models/concept_puck_v3/concept_puck_v3_top.stl",
    color: 0xd9dee4,
    metalness: 0.04,
    roughness: 0.4,
    explode: [0, 0, 22],
  },
];

const canvas = mustQuery<HTMLCanvasElement>("#scene");
const statusEl = mustQuery<HTMLElement>("#status");
const modelMetricsEl = mustQuery<HTMLElement>("#modelMetrics");
const uploadTriggerEl = mustQuery<HTMLButtonElement>("#uploadTrigger");
const restoreDemoEl = mustQuery<HTMLButtonElement>("#restoreDemo");
const filePickerEl = mustQuery<HTMLInputElement>("#filePicker");
const themeToggleEl = mustQuery<HTMLButtonElement>("#themeToggle");
const fullscreenToggleEl = mustQuery<HTMLButtonElement>("#fullscreenToggle");
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
const assemblyCountEl = mustQuery<HTMLElement>("#assemblyCount");
const selectedNameEl = mustQuery<HTMLElement>("#selectedName");
const selectedMetricsEl = mustQuery<HTMLElement>("#selectedMetrics");
const footerControlsEl = mustQuery<HTMLElement>("#footerControls");
const sidecarEl = mustQuery<HTMLElement>("#sidecar");
const sidecarGripEl = mustQuery<HTMLElement>("#sidecarGrip");
const sidecarDockEl = mustQuery<HTMLButtonElement>("#sidecarDock");
const sidecarMinimizeEl = mustQuery<HTMLButtonElement>("#sidecarMinimize");
const dropOverlayEl = mustQuery<HTMLElement>("#dropOverlay");
const importFormatEl = mustQuery<HTMLElement>("#importFormat");
const exportFormatEl = mustQuery<HTMLSelectElement>("#exportFormat");
const sourceUnitEl = mustQuery<HTMLSelectElement>("#sourceUnit");
const scaleFactorEl = mustQuery<HTMLInputElement>("#scaleFactor");
const scaleReadoutEl = mustQuery<HTMLElement>("#scaleReadout");
const resetScaleEl = mustQuery<HTMLButtonElement>("#resetScale");
const exportAssemblyEl = mustQuery<HTMLButtonElement>("#exportAssembly");
const exportSelectedEl = mustQuery<HTMLButtonElement>("#exportSelected");
const layerHeightEl = mustQuery<HTMLInputElement>("#layerHeight");
const layerHeightValueEl = mustQuery<HTMLOutputElement>("#layerHeightValue");
const sliceLayerEl = mustQuery<HTMLInputElement>("#sliceLayer");
const sliceLayerValueEl = mustQuery<HTMLOutputElement>("#sliceLayerValue");
const toggleSlicerEl = mustQuery<HTMLButtonElement>("#toggleSlicer");
const exportGcodeEl = mustQuery<HTMLButtonElement>("#exportGcode");
const exportSliceSvgEl = mustQuery<HTMLButtonElement>("#exportSliceSvg");
const exportPrintPackageEl = mustQuery<HTMLButtonElement>("#exportPrintPackage");
const slicerStatsEl = mustQuery<HTMLElement>("#slicerStats");

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

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
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

const selectionBox = new THREE.Box3Helper(new THREE.Box3(), 0x6fc6d6);
selectionBox.visible = false;

const gridGroup = new THREE.Group();
scene.add(gridGroup);

const floorMaterial = new THREE.MeshStandardMaterial({
  color: themePalette[theme].floor,
  metalness: 0,
  roughness: 0.88,
  transparent: true,
  opacity: 0.92,
});
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
const stlLoader = new STLLoader();
const loadedParts: LoadedPart[] = [];
const EXPLODE_VERTICAL_GAP = 8;

let assemblyBounds = new THREE.Box3();
let sectionBounds = new THREE.Box3();
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
let activeAssemblyLabel = "Demo assembly";
let cameraTarget = new THREE.Vector3(0, 0, 15);
let assemblyViewDistance = 150;
let assemblyScaleFactor = 1;
let scaleControlsLocked = false;
let dragDepth = 0;
let slicerEnabled = false;
let sliceSegments: Array<[THREE.Vector3, THREE.Vector3]> = [];
let sliceLayerZ = 0;

const importFormats: ImportFormat[] = ["stl", "obj", "ply", "glb", "gltf", "3mf"];
const exportFormats: ExportFormat[] = ["stl", "obj", "ply", "glb"];
const unitScaleToMm: Record<Exclude<SourceUnit, "custom">, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4,
};
const slicePreviewGroup = new THREE.Group();
assembly.add(slicePreviewGroup);

type SliceLayer = {
  index: number;
  z: number;
  segments: Array<[THREE.Vector3, THREE.Vector3]>;
};

addLights();
bindControls();
restoreSidecarState();
applyTheme(theme);
resize();

loadAssembly(demoParts, "Demo assembly").catch((error: unknown) => {
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
  statusEl.dataset.status = text;
  statusEl.setAttribute("aria-label", text);
  statusEl.title = text;
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
  const themeLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  themeToggleEl.setAttribute("aria-label", themeLabel);
  themeToggleEl.title = themeLabel;

  const palette = themePalette[theme];
  scene.background = new THREE.Color(palette.scene);
  scene.fog = new THREE.Fog(palette.fog, 180, 380);
  floorMaterial.color.setHex(palette.floor);
  updateGridColors(palette.grid, palette.gridSubtle);
  updateSlicePreview();
}

function updateGridColors(primary: number, secondary: number): void {
  const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
  materials[0]?.color.setHex(primary);
  materials[1]?.color.setHex(secondary);
}

function addLights(): void {
  scene.add(new THREE.HemisphereLight(0xf7fbff, 0x6a7072, 2.05));

  const key = new THREE.DirectionalLight(0xffffff, 3.55);
  key.position.set(54, -116, 152);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xadc8d4, 1.15);
  fill.position.set(-120, -58, 72);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffcaa3, 1.45);
  rim.position.set(-28, 126, 105);
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

async function loadAssembly(parts: PartDefinition[], label: string): Promise<void> {
  clearAssembly();
  setScaleControlsLocked(true);
  resetScaleControls();
  activeAssemblyLabel = label;
  updateStatus(`Loading 0 / ${parts.length}`);

  try {
    for (const [index, part] of parts.entries()) {
      const geometry = await loadGeometry(part);
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
        explodeOffset: new THREE.Vector3(),
        localBounds,
        triangles,
      });
      updateStatus(`Loading ${index + 1} / ${parts.length}`);
    }

    refreshAssemblyLayout();

    configureSectionRange();
    configureSlicer();
    buildPartToggles();
    selectPart(loadedParts.find((part) => part.definition.id === "top") ?? loadedParts[0] ?? null);
    setView("iso");
    updateModelMetrics();
    updateFormatReadout();
    updateStatus("Ready");
  } finally {
    setScaleControlsLocked(false);
  }
}

async function loadGeometry(part: PartDefinition): Promise<THREE.BufferGeometry> {
  if (typeof part.source === "string") {
    return stlLoader.loadAsync(part.source);
  }

  const format = part.format ?? extensionFor(part.fileName);
  return loadGeometryFromBuffer(part.source.slice(0), format, part.fileName);
}

async function loadGeometryFromBuffer(buffer: ArrayBuffer, format: ImportFormat, fileName: string): Promise<THREE.BufferGeometry> {
  if (format === "stl") return stlLoader.parse(buffer);
  if (format === "ply") {
    const { PLYLoader } = await import("three/addons/loaders/PLYLoader.js");
    return new PLYLoader().parse(buffer);
  }
  if (format === "obj") {
    const { OBJLoader } = await import("three/addons/loaders/OBJLoader.js");
    const object = new OBJLoader().parse(new TextDecoder().decode(buffer));
    return mergedGeometryFromObject(object, fileName);
  }
  if (format === "glb" || format === "gltf") {
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const gltfLoader = new GLTFLoader();
    const gltf = await new Promise<{ scene: THREE.Object3D }>((resolve, reject) => {
      gltfLoader.parse(buffer, "", resolve, reject);
    });
    return mergedGeometryFromObject(gltf.scene, fileName);
  }
  if (format === "3mf") {
    const { ThreeMFLoader } = await import("three/addons/loaders/3MFLoader.js");
    return mergedGeometryFromObject(new ThreeMFLoader().parse(buffer), fileName);
  }

  throw new Error(`Unsupported import format: ${format}`);
}

async function mergedGeometryFromObject(object: THREE.Object3D, fileName: string): Promise<THREE.BufferGeometry> {
  const { mergeGeometries } = await import("three/addons/utils/BufferGeometryUtils.js");
  object.updateMatrixWorld(true);
  const geometries: THREE.BufferGeometry[] = [];

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.geometry) return;
    const geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);
    geometry.deleteAttribute("uv");
    geometries.push(geometry.toNonIndexed());
  });

  if (!geometries.length) throw new Error(`${fileName} contains no mesh geometry`);
  const merged = mergeGeometries(geometries, false);
  for (const geometry of geometries) geometry.dispose();
  if (!merged) throw new Error(`Could not merge geometry from ${fileName}`);
  merged.computeVertexNormals();
  return merged;
}

function clearAssembly(): void {
  selectedPart = null;
  isolated = false;
  setIconButtonState(isolateSelectedEl, false, "Isolate selected part");
  selectionBox.visible = false;
  selectionBox.removeFromParent();
  slicePreviewGroup.clear();
  sliceSegments = [];
  partListEl.replaceChildren();
  selectedNameEl.textContent = "No selection";
  selectedMetricsEl.innerHTML = metricHtml([["Selection", "Click a part"]]);

  for (const part of loadedParts.splice(0)) {
    part.mesh.remove(part.edges);
    part.mesh.geometry.dispose();
    part.edges.geometry.dispose();
    part.edges.material.dispose();
    part.mesh.material.dispose();
    assembly.remove(part.mesh);
  }

  assembly.rotation.set(0, 0, 0);
  assembly.position.set(0, 0, 0);
}

function resetScaleControls(): void {
  assemblyScaleFactor = 1;
  sourceUnitEl.value = "mm";
  scaleFactorEl.value = "1";
  updateScaleReadout();
}

function setScaleControlsLocked(locked: boolean): void {
  scaleControlsLocked = locked;
  sourceUnitEl.disabled = locked;
  scaleFactorEl.disabled = locked;
  updateScaleReadout();
}

function setAssemblyScale(factor: number, options: { syncInput?: boolean; reframe?: boolean } = {}): void {
  if (scaleControlsLocked) return;
  if (!Number.isFinite(factor) || factor <= 0) {
    scaleReadoutEl.textContent = "Enter a positive scale";
    return;
  }

  const nextScale = clamp(factor, 0.000001, 1000000);
  const ratio = nextScale / assemblyScaleFactor;
  if (options.syncInput !== false) scaleFactorEl.value = formatScaleInput(nextScale);

  if (Math.abs(ratio - 1) <= 0.0000001) {
    updateScaleReadout();
    return;
  }

  const currentSectionValue = Number(sectionRangeEl.value);
  if (Number.isFinite(currentSectionValue)) {
    sectionRangeEl.value = (currentSectionValue * ratio).toFixed(3);
  }

  scaleLoadedGeometry(ratio);
  assemblyScaleFactor = nextScale;
  refreshAssemblyLayout();
  syncSectionRange(false);
  configureSlicer();
  updateModelMetrics();
  if (selectedPart) selectPart(selectedPart);
  updateScaleReadout();
  updateStatus(`Scale ${formatScale(nextScale)}x`);
  if (options.reframe !== false) setView("iso");
}

function scaleLoadedGeometry(ratio: number): void {
  const scaleMatrix = new THREE.Matrix4().makeScale(ratio, ratio, ratio);
  for (const part of loadedParts) {
    part.mesh.position.copy(part.assembled);
    part.mesh.geometry.applyMatrix4(scaleMatrix);
    part.mesh.geometry.computeBoundingBox();
    part.mesh.geometry.computeBoundingSphere();
    part.localBounds.copy(part.mesh.geometry.boundingBox ?? new THREE.Box3());
    part.edges.geometry.applyMatrix4(scaleMatrix);
    part.edges.geometry.computeBoundingSphere();
  }
}

function refreshAssemblyLayout(): void {
  for (const part of loadedParts) {
    part.mesh.position.copy(part.assembled);
  }

  configureExplodeOffsets();
  assembly.position.set(0, 0, 0);

  const rawBounds = measureAssemblyBounds();
  if (rawBounds.isEmpty()) {
    assemblyBounds.makeEmpty();
    sectionBounds.makeEmpty();
    cameraTarget.set(0, 0, 0);
    assemblyViewDistance = 80;
    updateCameraControlLimits();
    return;
  }

  const rawSize = rawBounds.getSize(new THREE.Vector3());
  const center = rawBounds.getCenter(new THREE.Vector3());
  assembly.position.sub(center);
  assembly.position.z += rawSize.z / 2;

  assemblyBounds = measureAssemblyBounds();
  sectionBounds.copy(assemblyBounds);
  const size = assemblyBounds.getSize(new THREE.Vector3());
  const extent = Math.max(size.x, size.y, size.z, 1);
  cameraTarget = assemblyBounds.getCenter(new THREE.Vector3());
  assemblyViewDistance = Math.max(size.length() * 1.4, extent * 2.2, 8);
  updateCameraControlLimits();
  updateReferenceScale(size);
  applyExplode(explodeValue);
}

function updateCameraControlLimits(): void {
  const size = assemblyBounds.getSize(new THREE.Vector3());
  const radius = Math.max(size.length() / 2, 1);
  controls.minDistance = Math.max(radius / 200, 0.01);
  controls.maxDistance = Math.max(radius * 14, 260);
}

function updateReferenceScale(size: THREE.Vector3): void {
  const extent = Math.max(size.x, size.y, size.z, 1);
  gridGroup.scale.setScalar(clamp(extent / 80, 0.02, 10000));
}

function measureAssemblyBounds(): THREE.Box3 {
  const selectionParent = selectionBox.parent;
  const sliceParent = slicePreviewGroup.parent;
  const rotation = assembly.rotation.clone();
  selectionBox.removeFromParent();
  slicePreviewGroup.removeFromParent();
  assembly.rotation.set(0, 0, 0);

  try {
    return new THREE.Box3().setFromObject(assembly);
  } finally {
    assembly.rotation.copy(rotation);
    if (sliceParent) sliceParent.add(slicePreviewGroup);
    if (selectionParent) selectionParent.add(selectionBox);
  }
}

function edgeColor(color: number): number {
  const c = new THREE.Color(color);
  c.offsetHSL(0, -0.18, c.getHSL({ h: 0, s: 0, l: 0 }).l > 0.55 ? -0.28 : 0.32);
  return c.getHex();
}

function configureSectionRange(): void {
  updateSectionBounds();
  syncSectionRange(true);
}

function syncSectionRange(resetValue: boolean): void {
  const axisBounds = getAxisBounds(sectionAxis);
  const padding = 3;
  const min = Math.floor(axisBounds.min - padding);
  const max = Math.ceil(axisBounds.max + padding);
  const currentValue = Number(sectionRangeEl.value);

  sectionRangeEl.min = min.toString();
  sectionRangeEl.max = max.toString();
  sectionRangeEl.value = (resetValue || !Number.isFinite(currentValue))
    ? max.toFixed(1)
    : clamp(currentValue, min, max).toFixed(1);
  sectionAxisLabelEl.textContent = `Cut ${sectionAxis.toUpperCase()}`;
  sectionValueEl.textContent = sectionEnabled ? `${Number(sectionRangeEl.value).toFixed(1)} mm` : "off";
  updateSectionAxisButtons();
  applyRenderModes();
}

function updateModelMetrics(): void {
  const size = assemblyBounds.getSize(new THREE.Vector3());
  const triangles = loadedParts.reduce((total, part) => total + part.triangles, 0);
  const partLabel = loadedParts.length === 1 ? "part" : "parts";
  assemblyCountEl.textContent = `${loadedParts.length} ${partLabel}`;
  modelMetricsEl.textContent = `${activeAssemblyLabel} | ${fmt(size.x)} x ${fmt(size.y)} x ${fmt(size.z)} mm | ${formatScale(assemblyScaleFactor)}x | ${loadedParts.length} ${partLabel} | ${triangles.toLocaleString()} tris`;
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
  bindSidecarControls();
  bindFooterControls();

  uploadTriggerEl.addEventListener("click", () => filePickerEl.click());
  restoreDemoEl.addEventListener("click", () => {
    loadAssembly(demoParts, "Demo assembly").catch(handleLoadError);
  });
  filePickerEl.addEventListener("change", () => {
    void loadFilesFromPicker(filePickerEl.files);
  });

  themeToggleEl.addEventListener("click", () => {
    applyTheme(theme === "dark" ? "light" : "dark");
  });

  fullscreenToggleEl.addEventListener("click", () => {
    void toggleFullscreen();
  });
  document.addEventListener("fullscreenchange", updateFullscreenState);

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
  sourceUnitEl.addEventListener("change", () => {
    const unit = sourceUnitEl.value as SourceUnit;
    if (unit === "custom") return;
    setAssemblyScale(unitScaleToMm[unit], { syncInput: true });
  });
  scaleFactorEl.addEventListener("input", () => {
    sourceUnitEl.value = "custom";
    setAssemblyScale(Number(scaleFactorEl.value), { syncInput: false });
  });
  scaleFactorEl.addEventListener("blur", () => {
    if (!Number.isFinite(Number(scaleFactorEl.value)) || Number(scaleFactorEl.value) <= 0) {
      scaleFactorEl.value = formatScaleInput(assemblyScaleFactor);
      updateScaleReadout();
    }
  });
  resetScaleEl.addEventListener("click", () => {
    sourceUnitEl.value = "mm";
    setAssemblyScale(1, { syncInput: true });
  });
  exportAssemblyEl.addEventListener("click", () => void exportModel(false));
  exportSelectedEl.addEventListener("click", () => void exportModel(true));

  layerHeightEl.addEventListener("input", () => {
    layerHeightValueEl.textContent = `${Number(layerHeightEl.value).toFixed(2)} mm`;
    configureSlicer();
  });

  sliceLayerEl.addEventListener("input", () => {
    updateSlicePreview();
  });

  toggleSlicerEl.addEventListener("click", () => {
    slicerEnabled = !slicerEnabled;
    if (slicerEnabled) {
      explodeTarget = 0;
      updateExplodeUi();
    }
    toggleSlicerEl.setAttribute("aria-pressed", String(slicerEnabled));
    updateSlicePreview();
  });

  exportGcodeEl.addEventListener("click", () => downloadGcode());
  exportSliceSvgEl.addEventListener("click", () => downloadSliceSvg());
  exportPrintPackageEl.addEventListener("click", () => void downloadPrintPackage());

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

  window.addEventListener("dragenter", (event) => {
    if (!hasImportableDrop(event.dataTransfer)) return;
    dragDepth += 1;
    dropOverlayEl.hidden = false;
    event.preventDefault();
  });

  window.addEventListener("dragover", (event) => {
    if (!hasImportableDrop(event.dataTransfer)) return;
    dropOverlayEl.hidden = false;
    event.dataTransfer!.dropEffect = "copy";
    event.preventDefault();
  });

  window.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) dropOverlayEl.hidden = true;
  });

  window.addEventListener("drop", (event) => {
    if (!hasImportableDrop(event.dataTransfer)) return;
    event.preventDefault();
    dragDepth = 0;
    dropOverlayEl.hidden = true;
    void loadFilesFromPicker(event.dataTransfer?.files ?? null);
  });

  window.addEventListener("resize", resize);
}

function bindFooterControls(): void {
  footerControlsEl.querySelectorAll<HTMLDetailsElement>(".control-panel").forEach((panel) => {
    panel.addEventListener("toggle", syncFooterState);
  });
  syncFooterState();
}

function syncFooterState(): void {
  const hasOpenPanel = Boolean(footerControlsEl.querySelector(".control-panel[open]"));
  document.documentElement.classList.toggle("footer-controls-open", hasOpenPanel);
}

function bindSidecarControls(): void {
  let dragState: { dx: number; dy: number } | null = null;

  sidecarMinimizeEl.addEventListener("click", (event) => {
    event.stopPropagation();
    setSidecarCollapsed(!sidecarEl.classList.contains("is-collapsed"));
  });

  sidecarDockEl.addEventListener("click", (event) => {
    event.stopPropagation();
    sidecarEl.style.left = "";
    sidecarEl.style.top = "";
    sidecarEl.style.right = "";
    sidecarEl.style.bottom = "";
    sidecarEl.classList.remove("is-free");
    window.localStorage.removeItem("partscope-sidecar-position");
  });

  sidecarGripEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSidecarCollapsed(!sidecarEl.classList.contains("is-collapsed"));
    }
  });

  sidecarGripEl.addEventListener("pointerdown", (event) => {
    if (event.target instanceof Element && event.target.closest("button")) return;
    const rect = sidecarEl.getBoundingClientRect();
    dragState = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    sidecarGripEl.setPointerCapture(event.pointerId);
    sidecarEl.classList.add("is-dragging", "is-free");
    sidecarEl.style.right = "auto";
    sidecarEl.style.bottom = "auto";
    event.preventDefault();
  });

  sidecarGripEl.addEventListener("pointermove", (event) => {
    if (!dragState) return;
    const rect = sidecarEl.getBoundingClientRect();
    const left = clamp(event.clientX - dragState.dx, 12, window.innerWidth - rect.width - 12);
    const top = clamp(event.clientY - dragState.dy, 12, window.innerHeight - rect.height - 12);
    sidecarEl.style.left = `${left}px`;
    sidecarEl.style.top = `${top}px`;
  });

  sidecarGripEl.addEventListener("pointerup", (event) => {
    if (!dragState) return;
    dragState = null;
    sidecarGripEl.releasePointerCapture(event.pointerId);
    sidecarEl.classList.remove("is-dragging");
    window.localStorage.setItem("partscope-sidecar-position", JSON.stringify({
      left: sidecarEl.style.left,
      top: sidecarEl.style.top,
    }));
  });
}

function restoreSidecarState(): void {
  const collapsed = window.localStorage.getItem("partscope-sidecar-collapsed") === "true";
  setSidecarCollapsed(collapsed);

  const saved = window.localStorage.getItem("partscope-sidecar-position");
  if (!saved) return;

  try {
    const position = JSON.parse(saved) as { left?: string; top?: string };
    if (!position.left || !position.top) return;
    sidecarEl.style.left = position.left;
    sidecarEl.style.top = position.top;
    sidecarEl.style.right = "auto";
    sidecarEl.style.bottom = "auto";
    sidecarEl.classList.add("is-free");
  } catch {
    window.localStorage.removeItem("partscope-sidecar-position");
  }
}

function setSidecarCollapsed(collapsed: boolean): void {
  sidecarEl.classList.toggle("is-collapsed", collapsed);
  sidecarMinimizeEl.setAttribute("aria-pressed", String(collapsed));
  sidecarMinimizeEl.setAttribute("aria-label", collapsed ? "Expand inspector" : "Collapse inspector");
  sidecarMinimizeEl.title = collapsed ? "Expand inspector" : "Collapse inspector";
  window.localStorage.setItem("partscope-sidecar-collapsed", String(collapsed));
}

async function loadFilesFromPicker(files: FileList | null): Promise<void> {
  if (!files?.length) return;

  const modelFiles = Array.from(files).filter((file) => Boolean(extensionFor(file.name)));
  filePickerEl.value = "";
  if (!modelFiles.length) {
    updateStatus("No supported CAD files");
    return;
  }

  try {
    updateStatus(`Importing ${modelFiles.length} file${modelFiles.length === 1 ? "" : "s"}`);
    const uploadedParts = await buildUploadedParts(modelFiles);
    await loadAssembly(uploadedParts, "Uploaded assembly");
  } catch (error: unknown) {
    handleLoadError(error);
  }
}

async function buildUploadedParts(files: File[]): Promise<PartDefinition[]> {
  const knownParts = new Map(demoParts.map((part) => [part.fileName.toLowerCase(), part]));
  const sortedFiles = files.slice().sort((left, right) => {
    const leftIndex = demoParts.findIndex((part) => part.fileName.toLowerCase() === left.name.toLowerCase());
    const rightIndex = demoParts.findIndex((part) => part.fileName.toLowerCase() === right.name.toLowerCase());
    return normalizeSortIndex(leftIndex, left.name).localeCompare(normalizeSortIndex(rightIndex, right.name));
  });

  return Promise.all(sortedFiles.map(async (file, index) => {
    const template = knownParts.get(file.name.toLowerCase());
    const buffer = await file.arrayBuffer();
    return {
      id: template?.id ?? slugify(file.name, index),
      label: template?.label ?? labelFromFileName(file.name),
      fileName: file.name,
      source: buffer,
      format: extensionFor(file.name) ?? "stl",
      color: template?.color ?? fallbackColor(index),
      metalness: template?.metalness,
      roughness: template?.roughness ?? 0.48,
      explode: template?.explode ?? fallbackExplode(index),
    };
  }));
}

function normalizeSortIndex(index: number, fileName: string): string {
  const paddedIndex = index >= 0 ? index.toString().padStart(4, "0") : "9999";
  return `${paddedIndex}:${fileName.toLowerCase()}`;
}

function fallbackExplode(index: number): THREE.Vector3Tuple {
  const ring = Math.floor(index / 6) + 1;
  return [0, 0, 5 + ring * 4];
}

function fallbackColor(index: number): number {
  const palette = [0x3a4348, 0x8a5c34, 0x2d8a57, 0x3266d6, 0xc07b28, 0x6f566a];
  return palette[index % palette.length];
}

function labelFromFileName(fileName: string): string {
  return fileName
    .replace(/\.(stl|obj|ply|glb|gltf|3mf)$/i, "")
    .replace(/^concept_puck_v3_/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slugify(fileName: string, index: number): string {
  const base = fileName.toLowerCase().replace(/\.(stl|obj|ply|glb|gltf|3mf)$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return base || `part-${index + 1}`;
}

function extensionFor(fileName: string): ImportFormat | null {
  const extension = fileName.toLowerCase().split(".").pop();
  return importFormats.includes(extension as ImportFormat) ? extension as ImportFormat : null;
}

function hasImportableDrop(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  if (dataTransfer.files.length) {
    return Array.from(dataTransfer.files).some((file) => Boolean(extensionFor(file.name)));
  }
  return Array.from(dataTransfer.items).some((item) => item.kind === "file");
}

function handleLoadError(error: unknown): void {
  console.error(error);
  updateStatus("Failed to load geometry");
}

function updateExplodeUi(): void {
  explodeRangeEl.value = String(explodeTarget);
  explodeValueEl.textContent = `${Math.round(explodeTarget * 100)}%`;
  toggleExplodeEl.setAttribute("aria-pressed", String(explodeTarget > 0.5));
}

function configureExplodeOffsets(): void {
  if (!loadedParts.length) return;

  for (const part of loadedParts) {
    part.explodeOffset.set(0, 0, 0);
  }

  const anchorPart = loadedParts.find((part) => part.definition.id === "base")
    ?? loadedParts.slice().sort((left, right) => left.localBounds.min.z - right.localBounds.min.z)[0];

  if (!anchorPart) return;

  const orderedParts = loadedParts
    .filter((part) => part !== anchorPart)
    .slice()
    .sort((left, right) => left.definition.explode[2] - right.definition.explode[2]);

  const layers: LoadedPart[][] = [];
  for (const part of orderedParts) {
    const currentLayer = layers.at(-1);
    if (!currentLayer) {
      layers.push([part]);
      continue;
    }

    const previousLayerZ = currentLayer[0]?.definition.explode[2] ?? 0;
    if (Math.abs(part.definition.explode[2] - previousLayerZ) <= 1.5) {
      currentLayer.push(part);
      continue;
    }

    layers.push([part]);
  }

  let previousTop = anchorPart.localBounds.max.z;
  for (const layer of layers) {
    const layerMinZ = Math.min(...layer.map((part) => part.localBounds.min.z));
    const layerMaxZ = Math.max(...layer.map((part) => part.localBounds.max.z));
    const lift = Math.max(0, previousTop + EXPLODE_VERTICAL_GAP - layerMinZ);

    for (const part of layer) {
      part.explodeOffset.set(0, 0, lift);
    }

    previousTop = layerMaxZ + lift;
  }
}

function applyExplode(value: number): void {
  for (const part of loadedParts) {
    const offset = part.explodeOffset.clone().multiplyScalar(value);
    part.mesh.position.copy(part.assembled).add(offset);
  }
  updateSectionBounds();
  syncSectionRange(false);
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
  if (axis === "x") return { min: sectionBounds.min.x, max: sectionBounds.max.x };
  if (axis === "y") return { min: sectionBounds.min.y, max: sectionBounds.max.y };
  return { min: sectionBounds.min.z, max: sectionBounds.max.z };
}

function updateSectionBounds(): void {
  if (!loadedParts.length) {
    sectionBounds.makeEmpty();
    return;
  }

  sectionBounds.copy(measureAssemblyBounds());
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
    selectionBox.visible = false;
    selectionBox.removeFromParent();
    updateFormatReadout();
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
  updateFormatReadout();
}

function metricHtml(rows: Array<[string, string]>): string {
  return rows.map(([term, value]) => `<div><dt>${term}</dt><dd>${value}</dd></div>`).join("");
}

function updateSelectionBox(): void {
  if (!selectedPart) return;
  if (selectionBox.parent !== selectedPart.mesh) selectedPart.mesh.add(selectionBox);
  selectionBox.box.copy(selectedPart.localBounds);
  selectionBox.visible = true;
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
  setIconButtonState(isolateSelectedEl, isolated, isolated ? "Show isolated hidden parts" : "Isolate selected part");
  for (const part of loadedParts) {
    part.mesh.visible = !isolated || part === selectedPart;
  }
  syncPartCheckboxes();
}

function showAllParts(): void {
  isolated = false;
  setIconButtonState(isolateSelectedEl, false, "Isolate selected part");
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

function setIconButtonState(button: HTMLButtonElement, pressed: boolean, label: string): void {
  button.setAttribute("aria-pressed", String(pressed));
  button.setAttribute("aria-label", label);
  button.title = label;
}

async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else {
    await document.documentElement.requestFullscreen();
  }
}

function updateFullscreenState(): void {
  setIconButtonState(
    fullscreenToggleEl,
    Boolean(document.fullscreenElement),
    document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen",
  );
  resize();
}

function updateFormatReadout(): void {
  const imported = new Set(loadedParts.map((part) => part.definition.format ?? extensionFor(part.definition.fileName) ?? "stl"));
  importFormatEl.textContent = `Import: ${importFormats.map((format) => format.toUpperCase()).join(", ")}`;
  exportFormatEl.value = exportFormats.includes(exportFormatEl.value as ExportFormat) ? exportFormatEl.value : "stl";
  exportAssemblyEl.disabled = loadedParts.length === 0;
  exportSelectedEl.disabled = !selectedPart;
  exportAssemblyEl.title = `Export visible model from ${Array.from(imported).map((format) => format.toUpperCase()).join(" + ")}`;
}

async function exportModel(selectedOnly: boolean): Promise<void> {
  const parts = selectedOnly && selectedPart ? [selectedPart] : loadedParts.filter((part) => part.mesh.visible);
  if (!parts.length) {
    updateStatus("Nothing to export");
    return;
  }

  const format = exportFormatEl.value as ExportFormat;
  const object = buildExportObject(parts);
  const baseName = slugify(selectedOnly && selectedPart ? selectedPart.definition.label : activeAssemblyLabel, 0);

  try {
    if (format === "stl") {
      const { STLExporter } = await import("three/addons/exporters/STLExporter.js");
      const data = new STLExporter().parse(object, { binary: true });
      downloadBlob(`${baseName}.stl`, data, "model/stl");
    } else if (format === "obj") {
      const { OBJExporter } = await import("three/addons/exporters/OBJExporter.js");
      downloadBlob(`${baseName}.obj`, new OBJExporter().parse(object), "model/obj");
    } else if (format === "ply") {
      const { PLYExporter } = await import("three/addons/exporters/PLYExporter.js");
      const data = await new Promise<string | ArrayBuffer>((resolve) => {
        new PLYExporter().parse(object, resolve, { binary: true });
      });
      downloadBlob(`${baseName}.ply`, data, "application/octet-stream");
    } else if (format === "glb") {
      const { GLTFExporter } = await import("three/addons/exporters/GLTFExporter.js");
      const data = await new GLTFExporter().parseAsync(object, { binary: true });
      downloadBlob(`${baseName}.glb`, data as ArrayBuffer, "model/gltf-binary");
    }
    updateStatus(`Exported ${format.toUpperCase()}`);
  } catch (error: unknown) {
    console.error(error);
    updateStatus("Export failed");
  }
}

function buildExportObject(parts: LoadedPart[]): THREE.Group {
  const group = new THREE.Group();
  for (const part of parts) {
    part.mesh.updateMatrix();
    const geometry = part.mesh.geometry.clone();
    geometry.applyMatrix4(part.mesh.matrix);
    const mesh = new THREE.Mesh(geometry, part.mesh.material.clone());
    mesh.name = part.definition.label;
    group.add(mesh);
  }
  return group;
}

function downloadBlob(fileName: string, data: string | ArrayBuffer | Uint8Array | Blob, mimeType: string): void {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 250);
}

function configureSlicer(): void {
  const height = Number(layerHeightEl.value);
  const bounds = assemblyBounds.clone();
  const layerCount = Math.max(1, Math.ceil(bounds.getSize(new THREE.Vector3()).z / height));
  const currentLayer = Number(sliceLayerEl.value);
  sliceLayerEl.max = String(layerCount - 1);
  sliceLayerEl.value = String(currentLayer <= 0 ? Math.floor((layerCount - 1) / 2) : Math.min(currentLayer, layerCount - 1));
  layerHeightValueEl.textContent = `${height.toFixed(2)} mm`;
  updateSlicePreview();
}

function updateSlicePreview(): void {
  slicePreviewGroup.clear();
  const layer = Number(sliceLayerEl.value);
  const layerHeight = Number(layerHeightEl.value);
  sliceLayerZ = assemblyBounds.min.z + layer * layerHeight;
  sliceLayerValueEl.textContent = `${layer + 1} @ ${fmt(sliceLayerZ)} mm`;

  sliceSegments = slicerEnabled ? sliceAtZ(sliceLayerZ) : [];
  toggleSlicerEl.setAttribute("aria-pressed", String(slicerEnabled));
  slicerStatsEl.textContent = slicerEnabled
    ? `${sliceSegments.length} open contours on active layer`
    : "Preview off";

  if (!slicerEnabled || !sliceSegments.length) return;

  const positions = new Float32Array(sliceSegments.length * 6);
  sliceSegments.forEach(([a, b], index) => {
    positions.set([a.x, a.y, a.z, b.x, b.y, b.z], index * 6);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: theme === "dark" ? 0xf0c58e : 0x68411f,
    transparent: true,
    opacity: 0.92,
    depthTest: false,
  });
  slicePreviewGroup.add(new THREE.LineSegments(geometry, material));
}

function sliceAtZ(z: number): Array<[THREE.Vector3, THREE.Vector3]> {
  const segments: Array<[THREE.Vector3, THREE.Vector3]> = [];
  for (const part of loadedParts) {
    if (!part.mesh.visible) continue;
    part.mesh.updateMatrix();
    const position = part.mesh.geometry.getAttribute("position");
    const index = part.mesh.geometry.index;
    const triangleCount = index ? index.count / 3 : position.count / 3;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();

    for (let triangle = 0; triangle < triangleCount; triangle += 1) {
      if (index) {
        a.fromBufferAttribute(position, index.getX(triangle * 3)).applyMatrix4(part.mesh.matrix);
        b.fromBufferAttribute(position, index.getX(triangle * 3 + 1)).applyMatrix4(part.mesh.matrix);
        c.fromBufferAttribute(position, index.getX(triangle * 3 + 2)).applyMatrix4(part.mesh.matrix);
      } else {
        a.fromBufferAttribute(position, triangle * 3).applyMatrix4(part.mesh.matrix);
        b.fromBufferAttribute(position, triangle * 3 + 1).applyMatrix4(part.mesh.matrix);
        c.fromBufferAttribute(position, triangle * 3 + 2).applyMatrix4(part.mesh.matrix);
      }
      const hit = intersectTriangleWithZ(a, b, c, z);
      if (hit) segments.push(hit);
    }
  }
  return segments;
}

function intersectTriangleWithZ(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, z: number): [THREE.Vector3, THREE.Vector3] | null {
  const points: THREE.Vector3[] = [];
  addEdgeZIntersection(points, a, b, z);
  addEdgeZIntersection(points, b, c, z);
  addEdgeZIntersection(points, c, a, z);
  if (points.length < 2) return null;
  return [points[0], points[1]];
}

function addEdgeZIntersection(points: THREE.Vector3[], a: THREE.Vector3, b: THREE.Vector3, z: number): void {
  const da = a.z - z;
  const db = b.z - z;
  if (Math.abs(da) < 0.0001 && Math.abs(db) < 0.0001) return;
  if ((da > 0 && db > 0) || (da < 0 && db < 0)) return;
  const t = da / (da - db);
  if (t < -0.0001 || t > 1.0001) return;
  const point = new THREE.Vector3().lerpVectors(a, b, t);
  if (!points.some((existing) => existing.distanceToSquared(point) < 0.000001)) points.push(point);
}

function downloadGcode(): void {
  const layerHeight = Number(layerHeightEl.value);
  const layers = createSliceLayers(layerHeight);
  let e = 0;
  const lines = [
    "; PartScope CNC contour G-code",
    "; Draft open-contour toolpath for CAM review",
    "G21",
    "G90",
    "M82",
    "G92 E0",
  ];

  for (const layer of layers) {
    lines.push(`; layer ${layer.index + 1}/${layers.length} z=${layer.z.toFixed(3)}`);
    for (const [a, b] of layer.segments) {
      e += a.distanceTo(b) * 0.035;
      lines.push(`G0 X${a.x.toFixed(3)} Y${a.y.toFixed(3)} Z${Math.max(layer.z, 0).toFixed(3)}`);
      lines.push(`G1 X${b.x.toFixed(3)} Y${b.y.toFixed(3)} E${e.toFixed(5)} F1800`);
    }
  }

  downloadBlob(`${slugify(activeAssemblyLabel, 0)}-cnc-contours.gcode`, `${lines.join("\n")}\n`, "text/x-gcode");
  updateStatus("Exported CNC G-code");
}

function downloadSliceSvg(): void {
  const segments = sliceSegments.length ? sliceSegments : sliceAtZ(sliceLayerZ);
  if (!segments.length) {
    updateStatus("No slice to export");
    return;
  }
  const bounds = new THREE.Box2();
  for (const [a, b] of segments) {
    bounds.expandByPoint(new THREE.Vector2(a.x, a.y));
    bounds.expandByPoint(new THREE.Vector2(b.x, b.y));
  }
  const size = bounds.getSize(new THREE.Vector2());
  const padding = 4;
  const paths = segments.map(([a, b]) => {
    const x1 = a.x - bounds.min.x + padding;
    const y1 = size.y - (a.y - bounds.min.y) + padding;
    const x2 = b.x - bounds.min.x + padding;
    const y2 = size.y - (b.y - bounds.min.y) + padding;
    return `<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}" />`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${(size.x + padding * 2).toFixed(2)}mm" height="${(size.y + padding * 2).toFixed(2)}mm" viewBox="0 0 ${(size.x + padding * 2).toFixed(2)} ${(size.y + padding * 2).toFixed(2)}"><g fill="none" stroke="black" stroke-width="0.18">${paths.join("")}</g></svg>`;
  downloadBlob(`${slugify(activeAssemblyLabel, 0)}-layer-${Number(sliceLayerEl.value) + 1}.svg`, svg, "image/svg+xml");
  updateStatus("Exported layer SVG");
}

async function downloadPrintPackage(): Promise<void> {
  if (!loadedParts.length) {
    updateStatus("Nothing to package");
    return;
  }

  exportPrintPackageEl.disabled = true;
  updateStatus("Building print ZIP");

  try {
    const layerHeight = Number(layerHeightEl.value);
    const layers = createSliceLayers(layerHeight);
    const sliceBounds = sliceBoundsFor(layers);
    const baseName = slugify(activeAssemblyLabel, 0);
    const { zipSync, strToU8 } = await import("three/addons/libs/fflate.module.js");
    const files: Record<string, Uint8Array> = {};
    const sourceFormats = Array.from(new Set(loadedParts.map((part) => part.definition.format ?? extensionFor(part.definition.fileName) ?? "stl")));
    const modelSize = assemblyBounds.getSize(new THREE.Vector3());

    files["README.txt"] = strToU8([
      "PartScope additive print package",
      "",
      "This archive is a printer-agnostic slice stack for additive manufacturing review.",
      "It contains vector layer SVGs, matching contour JSON, a preview GIF, and a source STL.",
      "The layer files are intentionally open and inspectable; machine-specific exposure, resin, hatch, support, and scan strategies still belong in the target printer/build-prep software.",
      "",
      `Model: ${activeAssemblyLabel}`,
      `Layer height: ${layerHeight.toFixed(3)} mm`,
      `Layers: ${layers.length}`,
    ].join("\n"));

    files["manifest.json"] = strToU8(JSON.stringify({
      schema: "partscope.print-package.v1",
      process: "additive-slice-stack",
      units: "mm",
      createdAt: new Date().toISOString(),
      model: {
        label: activeAssemblyLabel,
        partCount: loadedParts.length,
        visiblePartCount: loadedParts.filter((part) => part.mesh.visible).length,
        triangles: loadedParts.reduce((total, part) => total + part.triangles, 0),
        size: { x: Number(fmt(modelSize.x)), y: Number(fmt(modelSize.y)), z: Number(fmt(modelSize.z)) },
        sourceFormats,
      },
      settings: {
        layerHeightMm: layerHeight,
        layerCount: layers.length,
        sliceBoundsMm: bounds2Json(sliceBounds),
      },
      contents: {
        sourceModel: "geometry/model.stl",
        previewGif: "preview.gif",
        layerSvgPattern: "layers/layer_000001.svg",
        contourJsonPattern: "contours/layer_000001.json",
      },
    }, null, 2));

    layers.forEach((layer) => {
      const name = `layer_${String(layer.index + 1).padStart(6, "0")}`;
      files[`layers/${name}.svg`] = strToU8(layerSvg(layer, sliceBounds));
      files[`contours/${name}.json`] = strToU8(JSON.stringify({
        index: layer.index,
        z: Number(layer.z.toFixed(4)),
        units: "mm",
        segments: layer.segments.map(([a, b]) => [
          [Number(a.x.toFixed(4)), Number(a.y.toFixed(4))],
          [Number(b.x.toFixed(4)), Number(b.y.toFixed(4))],
        ]),
      }));
    });

    files["preview.gif"] = buildSliceGif(layers, sliceBounds, 220, 160);

    const { STLExporter } = await import("three/addons/exporters/STLExporter.js");
    const stl = new STLExporter().parse(buildExportObject(loadedParts.filter((part) => part.mesh.visible)), { binary: true });
    files["geometry/model.stl"] = new Uint8Array(stl as ArrayBuffer);

    const zip = zipSync(files, { level: 6 });
    downloadBlob(`${baseName}-print-package.zip`, zip, "application/zip");
    updateStatus("Exported print ZIP");
  } catch (error: unknown) {
    console.error(error);
    updateStatus("Print ZIP failed");
  } finally {
    exportPrintPackageEl.disabled = false;
  }
}

function createSliceLayers(layerHeight: number): SliceLayer[] {
  const bounds = assemblyBounds.clone();
  const layerCount = Math.max(1, Math.ceil(bounds.getSize(new THREE.Vector3()).z / layerHeight));
  return Array.from({ length: layerCount }, (_, index) => {
    const z = bounds.min.z + index * layerHeight;
    return { index, z, segments: sliceAtZ(z) };
  });
}

function sliceBoundsFor(layers: SliceLayer[]): THREE.Box2 {
  const bounds = new THREE.Box2(
    new THREE.Vector2(assemblyBounds.min.x, assemblyBounds.min.y),
    new THREE.Vector2(assemblyBounds.max.x, assemblyBounds.max.y),
  );
  for (const layer of layers) {
    for (const [a, b] of layer.segments) {
      bounds.expandByPoint(new THREE.Vector2(a.x, a.y));
      bounds.expandByPoint(new THREE.Vector2(b.x, b.y));
    }
  }
  if (bounds.isEmpty()) bounds.set(new THREE.Vector2(-10, -10), new THREE.Vector2(10, 10));
  return bounds;
}

function bounds2Json(bounds: THREE.Box2): Record<string, number> {
  return {
    minX: Number(bounds.min.x.toFixed(4)),
    minY: Number(bounds.min.y.toFixed(4)),
    maxX: Number(bounds.max.x.toFixed(4)),
    maxY: Number(bounds.max.y.toFixed(4)),
  };
}

function layerSvg(layer: SliceLayer, bounds: THREE.Box2): string {
  const size = bounds.getSize(new THREE.Vector2());
  const padding = 4;
  const width = Math.max(size.x + padding * 2, 1);
  const height = Math.max(size.y + padding * 2, 1);
  const paths = layer.segments.map(([a, b]) => {
    const x1 = a.x - bounds.min.x + padding;
    const y1 = size.y - (a.y - bounds.min.y) + padding;
    const x2 = b.x - bounds.min.x + padding;
    const y2 = size.y - (b.y - bounds.min.y) + padding;
    return `<path d="M ${x1.toFixed(3)} ${y1.toFixed(3)} L ${x2.toFixed(3)} ${y2.toFixed(3)}" />`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width.toFixed(3)}mm" height="${height.toFixed(3)}mm" viewBox="0 0 ${width.toFixed(3)} ${height.toFixed(3)}"><title>PartScope layer ${layer.index + 1} z=${layer.z.toFixed(3)}mm</title><g fill="none" stroke="black" stroke-width="0.18">${paths}</g></svg>`;
}

function buildSliceGif(layers: SliceLayer[], bounds: THREE.Box2, size: number, maxFrames: number): Uint8Array {
  const frameStep = Math.max(1, Math.ceil(layers.length / maxFrames));
  const frames: Uint8Array[] = [];
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Could not create GIF canvas context");

  for (let index = 0; index < layers.length; index += frameStep) {
    drawSliceFrame(context, layers[index], bounds, size);
    frames.push(indexedCanvasFrame(context, size));
  }

  return encodeGif(frames, size, size, 8);
}

function drawSliceFrame(context: CanvasRenderingContext2D, layer: SliceLayer, bounds: THREE.Box2, size: number): void {
  const boundsSize = bounds.getSize(new THREE.Vector2());
  const extent = Math.max(boundsSize.x, boundsSize.y, 1);
  const padding = 16;
  const scale = (size - padding * 2) / extent;
  const xOffset = (extent - boundsSize.x) / 2;
  const yOffset = (extent - boundsSize.y) / 2;
  const toCanvas = (point: THREE.Vector3): [number, number] => [
    padding + (point.x - bounds.min.x + xOffset) * scale,
    size - padding - (point.y - bounds.min.y + yOffset) * scale,
  ];

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.strokeStyle = "#d8e0e2";
  context.lineWidth = 1;
  context.strokeRect(padding, padding, size - padding * 2, size - padding * 2);
  context.strokeStyle = "#20292d";
  context.lineWidth = 1.35;
  context.beginPath();
  for (const [a, b] of layer.segments) {
    const [x1, y1] = toCanvas(a);
    const [x2, y2] = toCanvas(b);
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
  }
  context.stroke();
  context.fillStyle = "#4d6f7c";
  context.font = "bold 11px system-ui, sans-serif";
  context.fillText(`L${layer.index + 1}  Z ${layer.z.toFixed(2)}mm`, 10, size - 10);
}

function indexedCanvasFrame(context: CanvasRenderingContext2D, size: number): Uint8Array {
  const rgba = context.getImageData(0, 0, size, size).data;
  const indexes = new Uint8Array(size * size);
  for (let index = 0; index < indexes.length; index += 1) {
    const offset = index * 4;
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    indexes[index] = r < 85 && g < 120 && b < 130 ? 1 : r < 120 && g < 150 && b < 160 ? 2 : r < 235 || g < 240 || b < 240 ? 3 : 0;
  }
  return indexes;
}

function encodeGif(frames: Uint8Array[], width: number, height: number, delayCs: number): Uint8Array {
  const bytes: number[] = [];
  const write = (...values: number[]) => bytes.push(...values);
  const writeAscii = (text: string) => [...text].forEach((char) => write(char.charCodeAt(0)));
  const writeU16 = (value: number) => write(value & 255, (value >> 8) & 255);
  const writeBlocks = (data: Uint8Array) => {
    for (let offset = 0; offset < data.length; offset += 255) {
      const block = data.subarray(offset, offset + 255);
      write(block.length, ...block);
    }
    write(0);
  };

  writeAscii("GIF89a");
  writeU16(width);
  writeU16(height);
  write(0xf1, 0, 0);
  write(255, 255, 255, 32, 41, 45, 77, 111, 124, 216, 224, 226);
  write(0x21, 0xff, 0x0b);
  writeAscii("NETSCAPE2.0");
  write(0x03, 0x01);
  writeU16(0);
  write(0);

  for (const frame of frames) {
    write(0x21, 0xf9, 0x04, 0x04);
    writeU16(delayCs);
    write(0, 0);
    write(0x2c);
    writeU16(0);
    writeU16(0);
    writeU16(width);
    writeU16(height);
    write(0);
    write(2);
    writeBlocks(packGifLiteralCodes(frame));
  }

  write(0x3b);
  return new Uint8Array(bytes);
}

function packGifLiteralCodes(indexes: Uint8Array): Uint8Array {
  const clearCode = 4;
  const endCode = 5;
  const output: number[] = [];
  let accumulator = 0;
  let bitCount = 0;
  const pushCode = (code: number) => {
    accumulator |= code << bitCount;
    bitCount += 3;
    while (bitCount >= 8) {
      output.push(accumulator & 255);
      accumulator >>= 8;
      bitCount -= 8;
    }
  };

  for (let index = 0; index < indexes.length; index += 2) {
    pushCode(clearCode);
    pushCode(indexes[index]);
    if (index + 1 < indexes.length) pushCode(indexes[index + 1]);
  }
  pushCode(endCode);
  if (bitCount > 0) output.push(accumulator & 255);
  return new Uint8Array(output);
}

function setView(view: ViewPreset): void {
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.view === view));
  });

  const target = cameraTarget.clone();
  const distance = assemblyViewDistance;
  const positions: Record<ViewPreset, THREE.Vector3> = {
    iso: new THREE.Vector3(distance * 0.74, -distance * 0.96, distance * 0.48),
    top: new THREE.Vector3(0.01, -0.01, distance),
    front: new THREE.Vector3(0, -distance, distance * 0.14),
    right: new THREE.Vector3(distance, 0, distance * 0.14),
    left: new THREE.Vector3(-distance, 0, distance * 0.14),
    bottom: new THREE.Vector3(0.01, -0.01, -distance),
  };

  controls.target.copy(target);
  camera.position.copy(target).add(positions[view]);
  camera.near = 0.1;
  camera.far = Math.max(1000, distance * 12);
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

function updateScaleReadout(): void {
  scaleReadoutEl.textContent = `1 unit = ${formatScale(assemblyScaleFactor)} mm`;
  resetScaleEl.disabled = scaleControlsLocked || loadedParts.length === 0 || Math.abs(assemblyScaleFactor - 1) <= 0.0000001;
}

function formatScaleInput(value: number): string {
  if (value >= 1000 || value < 0.001) return Number(value.toPrecision(6)).toString();
  return Number(value.toFixed(6)).toString();
}

function formatScale(value: number): string {
  if (value >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
  }
  if (value >= 1) {
    return Number(value.toFixed(4)).toString();
  }
  if (value >= 0.001) {
    return Number(value.toFixed(6)).toString();
  }
  return value.toExponential(2);
}

function fmt(value: number): string {
  return value.toFixed(1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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

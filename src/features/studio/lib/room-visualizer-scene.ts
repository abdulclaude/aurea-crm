import * as THREE from "three";

import {
  getRoomLayoutStats,
  INSTRUCTOR_ZONE_DEPTH,
  type RoomEquipmentType,
  type RoomLayoutPosition,
  type RoomVisualizerConfig,
  type StudioTheme,
} from "@/features/studio/lib/room-visualizer";

export type SpotState = "available" | "selected" | "booked" | "own";

export type InteractiveOptions = {
  spotStates: Map<number, SpotState>;
  onSpotClick: (spotIndex: number) => void;
};

export type RoomSceneAPI = {
  cleanup: () => void;
  setSpotStates: (states: Map<number, SpotState>) => void;
};

type MountRoomVisualizerSceneInput = {
  container: HTMLDivElement;
  config: RoomVisualizerConfig;
  interactive?: InteractiveOptions;
};

type ThemePalette = {
  background: number;
  floor: number;
  floorLine: number;
  wall: number;
  accentWall: number;
  trim: number;
  equipment: number;
  equipmentAccent: number;
  fabric: number;
  mirror: number;
};

const palettes: Record<StudioTheme, ThemePalette> = {
  WARM: {
    background: 0x171412,
    floor: 0xb98d62,
    floorLine: 0x8f673f,
    wall: 0xf0e8dd,
    accentWall: 0x2f2925,
    trim: 0x7a5a3b,
    equipment: 0x1d1d1f,
    equipmentAccent: 0xc9a36a,
    fabric: 0x1f6f68,
    mirror: 0xb8c7d4,
  },
  CHARCOAL: {
    background: 0x0f1215,
    floor: 0x3d3530,
    floorLine: 0x6e6155,
    wall: 0xded9d2,
    accentWall: 0x171b21,
    trim: 0xa17846,
    equipment: 0x111317,
    equipmentAccent: 0xc4b49b,
    fabric: 0x5b5f68,
    mirror: 0xaebdca,
  },
  LIGHT: {
    background: 0xe8ece8,
    floor: 0xd2b28b,
    floorLine: 0xad8c68,
    wall: 0xf5f1ea,
    accentWall: 0xd9ded8,
    trim: 0xb88d5a,
    equipment: 0x24252b,
    equipmentAccent: 0x8f9f8b,
    fabric: 0x7b9f96,
    mirror: 0xb6c8d7,
  },
};

const WALL_HEIGHT = 3.4;
const WALL_THICKNESS = 0.14;
const DOOR_WIDTH = 0.95;
const DOOR_HEIGHT = 2.35;

export function mountRoomVisualizerScene({
  container,
  config,
  interactive,
}: MountRoomVisualizerSceneInput): RoomSceneAPI {
  const width = container.clientWidth || 900;
  const height = container.clientHeight || 600;
  const palette = palettes[config.theme];
  const stats = getRoomLayoutStats(config);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.background);

  const camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 120);
  const camZ = -stats.roomDepth / 2 + 0.8;
  camera.position.set(0, 2.0, camZ);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.width = "100%";
  container.appendChild(renderer.domElement);

  addLighting(scene, stats.roomWidth, stats.roomDepth);
  addRoomShell(scene, stats.roomWidth, stats.roomDepth, palette, config);
  addStudioDetails(scene, stats.roomWidth, stats.roomDepth, palette, config);
  if (config.showInstructorZone) {
    addInstructorEquipment(scene, stats.roomDepth, config.equipment, palette);
  }

  const spotOverlays: Map<number, THREE.Mesh> = new Map();
  const spotMaterials: Map<number, THREE.MeshStandardMaterial> = new Map();

  stats.positions.forEach((position) => {
    addStation(scene, position, config.equipment, palette, config.showClearance);

    if (interactive) {
      const overlay = createSpotOverlay(position, config.equipment);
      const state = interactive.spotStates.get(position.index) ?? "available";
      const mat = overlay.material as THREE.MeshStandardMaterial;
      applySpotStateMaterial(mat, state);
      scene.add(overlay);
      spotOverlays.set(position.index, overlay);
      spotMaterials.set(position.index, mat);
    }
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let orbit = 0;
  let dragStart = 0;
  let dragStartY = 0;
  let isDragging = false;
  let dragMoved = false;
  const orbitClamp = Math.PI / 2.5;

  const updateCamera = () => {
    orbit = Math.max(-orbitClamp, Math.min(orbitClamp, orbit));
    const lookDist = stats.roomDepth * 0.6;
    camera.lookAt(
      Math.sin(orbit) * lookDist,
      0.2,
      camZ + Math.cos(orbit) * lookDist,
    );
  };

  const handlePointerDown = (event: PointerEvent) => {
    isDragging = true;
    dragMoved = false;
    dragStart = event.clientX;
    dragStartY = event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event: PointerEvent) => {
    if (!isDragging) return;
    const dx = event.clientX - dragStart;
    const dy = event.clientY - dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
    orbit += (event.clientX - dragStart) * 0.005;
    dragStart = event.clientX;
    dragStartY = event.clientY;
    updateCamera();
  };
  const handlePointerUp = (event: PointerEvent) => {
    const wasDrag = dragMoved;
    isDragging = false;
    dragMoved = false;
    if (renderer.domElement.hasPointerCapture(event.pointerId)) {
      renderer.domElement.releasePointerCapture(event.pointerId);
    }
    if (!wasDrag && interactive && spotOverlays.size > 0) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const overlayMeshes = Array.from(spotOverlays.values());
      const intersects = raycaster.intersectObjects(overlayMeshes);
      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        for (const [index, mesh] of spotOverlays) {
          if (mesh === hit) {
            interactive.onSpotClick(index);
            break;
          }
        }
      }
    }
  };
  let resizeFrame = 0;
  const resizeRenderer = () => {
    const nextWidth = container.clientWidth || width;
    const nextHeight = container.clientHeight || height;
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(nextWidth, nextHeight, false);
    renderer.render(scene, camera);
  };
  const handleResize = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resizeRenderer);
  };

  renderer.domElement.addEventListener("pointerdown", handlePointerDown);
  renderer.domElement.addEventListener("pointermove", handlePointerMove);
  renderer.domElement.addEventListener("pointerup", handlePointerUp);

  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(container);
  window.addEventListener("resize", handleResize);

  let frame = 0;
  const animate = () => {
    frame = requestAnimationFrame(animate);
    renderer.render(scene, camera);
  };
  updateCamera();
  animate();

  return {
    cleanup: () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      disposeScene(scene);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    },
    setSpotStates: (states: Map<number, SpotState>) => {
      for (const [index, mat] of spotMaterials) {
        const state = states.get(index) ?? "available";
        applySpotStateMaterial(mat, state);
      }
    },
  };
}

function addLighting(
  scene: THREE.Scene,
  roomWidth: number,
  roomDepth: number,
): void {
  scene.add(new THREE.AmbientLight(0xfaf7ef, 1.2));
  scene.add(new THREE.HemisphereLight(0xfaf7ef, 0x151515, 0.5));

  const lightCount = Math.max(2, Math.ceil(roomDepth / 5));
  for (let i = 0; i < lightCount; i++) {
    const z = -roomDepth / 2 + (roomDepth * (i + 0.5)) / lightCount;
    const light = new THREE.PointLight(0xfff6e8, 1.4, roomDepth);
    light.position.set(0, WALL_HEIGHT - 0.3, z);
    scene.add(light);
  }

  const keyLight = new THREE.DirectionalLight(0xfff2df, 0.8);
  keyLight.position.set(roomWidth * 0.3, WALL_HEIGHT - 0.2, -roomDepth * 0.2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = Math.max(roomWidth, roomDepth) * 1.5;
  keyLight.shadow.camera.left = -roomWidth / 2;
  keyLight.shadow.camera.right = roomWidth / 2;
  keyLight.shadow.camera.top = roomDepth / 2;
  keyLight.shadow.camera.bottom = -roomDepth / 2;
  scene.add(keyLight);
}

function addRoomShell(
  scene: THREE.Scene,
  roomWidth: number,
  roomDepth: number,
  palette: ThemePalette,
  config: RoomVisualizerConfig,
): void {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, roomDepth),
    new THREE.MeshStandardMaterial({
      color: palette.floor,
      roughness: 0.58,
      metalness: 0.03,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const plankMaterial = new THREE.MeshBasicMaterial({
    color: palette.floorLine,
    transparent: true,
    opacity: 0.32,
  });
  for (let x = -roomWidth / 2; x <= roomWidth / 2; x += 0.42) {
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.006, roomDepth),
      plankMaterial,
    );
    plank.position.set(x, 0.006, 0);
    scene.add(plank);
  }

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: palette.wall,
    roughness: 0.74,
  });
  const accentWallMaterial = new THREE.MeshStandardMaterial({
    color: palette.accentWall,
    roughness: 0.68,
  });

  const halfW = roomWidth / 2;
  const halfD = roomDepth / 2;

  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(roomWidth, WALL_HEIGHT, WALL_THICKNESS),
    config.theme === "LIGHT" ? wallMaterial : accentWallMaterial,
  );
  backWall.position.set(0, WALL_HEIGHT / 2, -halfD);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, roomDepth),
    wallMaterial,
  );
  leftWall.position.set(-halfW, WALL_HEIGHT / 2, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, roomDepth),
    wallMaterial,
  );
  rightWall.position.set(halfW, WALL_HEIGHT / 2, 0);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  const sectionWidth = (roomWidth - DOOR_WIDTH) / 2;

  const frontWallLeft = new THREE.Mesh(
    new THREE.BoxGeometry(sectionWidth, WALL_HEIGHT, WALL_THICKNESS),
    wallMaterial,
  );
  frontWallLeft.position.set(-halfW + sectionWidth / 2, WALL_HEIGHT / 2, halfD);
  frontWallLeft.receiveShadow = true;
  scene.add(frontWallLeft);

  const frontWallRight = new THREE.Mesh(
    new THREE.BoxGeometry(sectionWidth, WALL_HEIGHT, WALL_THICKNESS),
    wallMaterial,
  );
  frontWallRight.position.set(halfW - sectionWidth / 2, WALL_HEIGHT / 2, halfD);
  frontWallRight.receiveShadow = true;
  scene.add(frontWallRight);

  const transomHeight = WALL_HEIGHT - DOOR_HEIGHT;
  const transomMesh = new THREE.Mesh(
    new THREE.BoxGeometry(DOOR_WIDTH, transomHeight, WALL_THICKNESS),
    wallMaterial,
  );
  transomMesh.position.set(0, DOOR_HEIGHT + transomHeight / 2, halfD);
  scene.add(transomMesh);

  const frameMaterial = new THREE.MeshStandardMaterial({ color: palette.trim });
  [-1, 1].forEach((side) => {
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, DOOR_HEIGHT, WALL_THICKNESS + 0.02),
      frameMaterial,
    );
    frame.position.set(side * (DOOR_WIDTH / 2), DOOR_HEIGHT / 2, halfD);
    scene.add(frame);
  });
  const headerFrame = new THREE.Mesh(
    new THREE.BoxGeometry(DOOR_WIDTH + 0.12, 0.06, WALL_THICKNESS + 0.02),
    frameMaterial,
  );
  headerFrame.position.set(0, DOOR_HEIGHT, halfD);
  scene.add(headerFrame);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, roomDepth),
    new THREE.MeshStandardMaterial({
      color: palette.wall,
      roughness: 0.92,
    }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;
  scene.add(ceiling);

  const lightFixtureMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff8e8,
    emissive: 0xfff2df,
    emissiveIntensity: 0.5,
  });
  const fixtureCount = Math.max(2, Math.ceil(roomDepth / 5));
  for (let i = 0; i < fixtureCount; i++) {
    const z = -halfD + (roomDepth * (i + 0.5)) / fixtureCount;
    const fixture = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.03, 0.4),
      lightFixtureMaterial,
    );
    fixture.position.set(0, WALL_HEIGHT - 0.02, z);
    scene.add(fixture);
  }

  const trimMaterial = new THREE.MeshStandardMaterial({ color: palette.trim });
  [-halfD + 0.08, halfD - 0.08].forEach((z) => {
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(roomWidth, 0.08, 0.08),
      trimMaterial,
    );
    trim.position.set(0, 0.09, z);
    scene.add(trim);
  });
  [-halfW + 0.08, halfW - 0.08].forEach((x) => {
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, roomDepth),
      trimMaterial,
    );
    trim.position.set(x, 0.09, 0);
    scene.add(trim);
  });
}

function addStudioDetails(
  scene: THREE.Scene,
  roomWidth: number,
  roomDepth: number,
  palette: ThemePalette,
  config: RoomVisualizerConfig,
): void {
  if (config.showInstructorZone) {
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(Math.min(4.2, roomWidth * 0.55), 0.14, 2.0),
      new THREE.MeshStandardMaterial({ color: palette.trim, roughness: 0.55 }),
    );
    platform.position.set(0, 0.07, -roomDepth / 2 + 1.0);
    platform.castShadow = true;
    platform.receiveShadow = true;
    scene.add(platform);

    const speakerMaterial = new THREE.MeshStandardMaterial({ color: 0x101010 });
    [-1, 1].forEach((side) => {
      const speaker = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.78, 0.28),
        speakerMaterial,
      );
      speaker.position.set(
        side * (roomWidth / 2 - 0.55),
        0.54,
        -roomDepth / 2 + 0.42,
      );
      speaker.castShadow = true;
      scene.add(speaker);
    });
  }

  if (config.showMirrors) {
    const mirrorMaterial = new THREE.MeshStandardMaterial({
      color: palette.mirror,
      metalness: 0.25,
      roughness: 0.12,
      transparent: true,
      opacity: 0.62,
    });
    const sectionWidth = (roomWidth - DOOR_WIDTH) / 2;
    const panelWidth = Math.min(1.2, sectionWidth * 0.4);
    [-1, 1].forEach((side) => {
      const sectionCenter = side * (DOOR_WIDTH / 2 + sectionWidth / 2);
      [-0.5, 0.5].forEach((offset) => {
        const mirror = new THREE.Mesh(
          new THREE.BoxGeometry(panelWidth, 1.55, 0.025),
          mirrorMaterial,
        );
        mirror.position.set(
          sectionCenter + offset * (panelWidth + 0.12),
          1.62,
          roomDepth / 2 - 0.09,
        );
        scene.add(mirror);
      });
    });
  }

  if (config.showWindows) {
    const glass = new THREE.MeshStandardMaterial({
      color: 0xd8ecf4,
      metalness: 0.05,
      roughness: 0.08,
      transparent: true,
      opacity: 0.5,
    });
    const windowCount = Math.max(2, Math.floor(roomDepth / 3));
    const span = roomDepth * 0.6;
    for (let i = 0; i < windowCount; i++) {
      const z = -span / 2 + (span / (windowCount - 1)) * i;
      const windowPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 1.25, 1.25),
        glass,
      );
      windowPanel.position.set(roomWidth / 2 - 0.09, 1.86, z);
      scene.add(windowPanel);
    }
  }

  if (config.showStorage) {
    const shelfMaterial = new THREE.MeshStandardMaterial({
      color: palette.equipment,
      roughness: 0.64,
    });
    for (let i = 0; i < 4; i++) {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.3, 0.28),
        shelfMaterial,
      );
      shelf.position.set(
        -roomWidth / 2 + 0.18,
        0.24 + i * 0.34,
        roomDepth / 2 - 1.1,
      );
      shelf.castShadow = true;
      scene.add(shelf);
    }
  }
}

const SPOT_STATE_COLORS: Record<SpotState, number> = {
  available: 0x22c55e,
  selected: 0xeab308,
  booked: 0xef4444,
  own: 0x3b82f6,
};

function applySpotStateMaterial(
  mat: THREE.MeshStandardMaterial,
  state: SpotState,
): void {
  mat.color.setHex(SPOT_STATE_COLORS[state]);
  mat.emissive.setHex(SPOT_STATE_COLORS[state]);
  mat.emissiveIntensity = state === "available" ? 0.15 : 0.4;
  mat.opacity = state === "booked" ? 0.55 : 0.7;
}

function createSpotOverlay(
  position: RoomLayoutPosition,
  equipment: RoomEquipmentType,
): THREE.Mesh {
  const sizes: Record<RoomEquipmentType, [number, number]> = {
    MAT: [0.85, 2.0],
    REFORMER: [1.0, 2.6],
    BIKE: [0.9, 1.4],
    STRENGTH: [1.1, 1.8],
    OPEN: [1.0, 1.0],
  };
  const [w, d] = sizes[equipment];
  const mat = new THREE.MeshStandardMaterial({
    color: SPOT_STATE_COLORS.available,
    emissive: SPOT_STATE_COLORS.available,
    emissiveIntensity: 0.15,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(position.x, 0.005, position.z);
  mesh.rotation.z = position.rotation;
  return mesh;
}

function addInstructorEquipment(
  scene: THREE.Scene,
  roomDepth: number,
  equipment: RoomEquipmentType,
  palette: ThemePalette,
): void {
  const group = new THREE.Group();
  group.position.set(0, 0.14, -roomDepth / 2 + INSTRUCTOR_ZONE_DEPTH - 2);
  const facesForward = equipment === "REFORMER" || equipment === "BIKE";
  group.rotation.y = facesForward ? 0 : Math.PI;

  if (equipment === "MAT") addMat(group, palette);
  else if (equipment === "REFORMER") addReformer(group, palette);
  else if (equipment === "BIKE") addBike(group, palette);
  else if (equipment === "STRENGTH") addStrengthStation(group, palette);
  else addOpenSpot(group, palette);

  scene.add(group);
}

function addStation(
  scene: THREE.Scene,
  position: RoomLayoutPosition,
  equipment: RoomEquipmentType,
  palette: ThemePalette,
  showClearance: boolean,
): void {
  const group = new THREE.Group();
  group.position.set(position.x, 0, position.z);
  const faceInstructor = equipment === "REFORMER" || equipment === "BIKE";
  group.rotation.y = position.rotation + (faceInstructor ? Math.PI : 0);

  if (showClearance) {
    const clearance = createClearance(equipment);
    clearance.position.y = 0.012;
    group.add(clearance);
  }

  if (equipment === "REFORMER") addReformer(group, palette);
  if (equipment === "MAT") addMat(group, palette);
  if (equipment === "BIKE") addBike(group, palette);
  if (equipment === "STRENGTH") addStrengthStation(group, palette);
  if (equipment === "OPEN") addOpenSpot(group, palette);

  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.025, 18),
    new THREE.MeshStandardMaterial({
      color: palette.equipmentAccent,
      roughness: 0.45,
      metalness: 0.1,
    }),
  );
  marker.position.set(-0.55, 0.035, -0.55);
  marker.castShadow = true;
  group.add(marker);

  scene.add(group);
}

function createClearance(equipment: RoomEquipmentType): THREE.Mesh {
  const sizes: Record<RoomEquipmentType, [number, number]> = {
    MAT: [1.15, 2.35],
    REFORMER: [2.0, 3.35],
    BIKE: [1.25, 1.75],
    STRENGTH: [1.75, 2.2],
    OPEN: [1.35, 1.35],
  };
  const [width, depth] = sizes[equipment];
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.095,
      side: THREE.DoubleSide,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function addMat(group: THREE.Group, palette: ThemePalette): void {
  const fabricMat = new THREE.MeshStandardMaterial({
    color: palette.fabric,
    roughness: 0.78,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: palette.equipmentAccent,
    roughness: 0.5,
  });
  const corkMat = new THREE.MeshStandardMaterial({
    color: 0x8b6d4a,
    roughness: 0.7,
  });

  const mat = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.02, 1.82),
    fabricMat,
  );
  mat.position.y = 0.022;
  mat.castShadow = true;
  mat.receiveShadow = true;
  group.add(mat);

  const matBorder = new THREE.Mesh(
    new THREE.BoxGeometry(0.74, 0.008, 1.84),
    new THREE.MeshStandardMaterial({
      color: palette.fabric,
      roughness: 0.9,
      transparent: true,
      opacity: 0.5,
    }),
  );
  matBorder.position.y = 0.01;
  group.add(matBorder);

  const centerLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.005, 0.002, 1.6),
    new THREE.MeshStandardMaterial({
      color: palette.equipmentAccent,
      transparent: true,
      opacity: 0.25,
    }),
  );
  centerLine.position.y = 0.034;
  group.add(centerLine);

  const pillow = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.055, 0.34, 8, 12),
    accentMat,
  );
  pillow.rotation.z = Math.PI / 2;
  pillow.position.set(0, 0.075, -0.72);
  pillow.castShadow = true;
  group.add(pillow);

  [0.06, 0.17].forEach((yOff) => {
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.1, 0.23),
      corkMat,
    );
    block.position.set(-0.52, yOff, -0.55);
    block.castShadow = true;
    group.add(block);
  });

  const towel = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.025, 0.18),
    new THREE.MeshStandardMaterial({ color: 0xddd9d2, roughness: 0.82 }),
  );
  towel.position.set(0.18, 0.048, -0.78);
  towel.rotation.y = 0.15;
  group.add(towel);

  const bottleBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.035, 0.2, 12),
    new THREE.MeshStandardMaterial({
      color: palette.equipmentAccent,
      roughness: 0.3,
      metalness: 0.4,
    }),
  );
  bottleBody.position.set(-0.52, 0.1, 0.2);
  bottleBody.castShadow = true;
  group.add(bottleBody);

  const bottleCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.032, 0.035, 12),
    new THREE.MeshStandardMaterial({
      color: palette.equipment,
      roughness: 0.4,
    }),
  );
  bottleCap.position.set(-0.52, 0.22, 0.2);
  group.add(bottleCap);

  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.06, 0.007, 6, 24),
    new THREE.MeshStandardMaterial({
      color: palette.fabric,
      roughness: 0.7,
    }),
  );
  band.rotation.x = Math.PI / 2;
  band.position.set(0.22, 0.05, 0.5);
  group.add(band);
}

function addReformer(group: THREE.Group, palette: ThemePalette): void {
  const metal = new THREE.MeshStandardMaterial({
    color: palette.equipment,
    roughness: 0.3,
    metalness: 0.7,
  });
  const wood = new THREE.MeshStandardMaterial({
    color: palette.equipmentAccent,
    roughness: 0.4,
    metalness: 0.05,
  });
  const upholstery = new THREE.MeshStandardMaterial({
    color: palette.fabric,
    roughness: 0.65,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.85,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.1, 2.48), wood);
  base.position.y = 0.12;
  base.castShadow = true;
  group.add(base);

  [-0.42, 0.42].forEach((x) => {
    const sideRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.13, 2.48),
      wood,
    );
    sideRail.position.set(x, 0.19, 0);
    group.add(sideRail);
  });

  (
    [
      [-0.38, -1.1],
      [-0.38, 1.1],
      [0.38, -1.1],
      [0.38, 1.1],
    ] as [number, number][]
  ).forEach(([x, z]) => {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.028, 0.12, 8),
      metal,
    );
    leg.position.set(x, 0.06, z);
    group.add(leg);
    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.018, 8),
      rubber,
    );
    foot.position.set(x, 0.009, z);
    group.add(foot);
  });

  [-0.28, 0.28].forEach((x) => {
    const guideRail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 2.3, 12),
      metal,
    );
    guideRail.rotation.x = Math.PI / 2;
    guideRail.position.set(x, 0.28, 0);
    group.add(guideRail);
  });

  const carriagePad = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.055, 0.92),
    upholstery,
  );
  carriagePad.position.set(0, 0.32, 0.08);
  carriagePad.castShadow = true;
  group.add(carriagePad);

  const carriageFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.025, 0.96),
    metal,
  );
  carriageFrame.position.set(0, 0.285, 0.08);
  group.add(carriageFrame);

  (
    [
      [-0.28, -0.35],
      [-0.28, 0.5],
      [0.28, -0.35],
      [0.28, 0.5],
    ] as [number, number][]
  ).forEach(([x, z]) => {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.035, 12),
      metal,
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.28, z);
    group.add(wheel);
  });

  [-0.2, 0.2].forEach((x) => {
    const shoulderBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.11, 0.12),
      upholstery,
    );
    shoulderBlock.position.set(x, 0.4, -0.22);
    shoulderBlock.castShadow = true;
    group.add(shoulderBlock);
    const blockCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.11, 0.03),
      metal,
    );
    blockCore.position.set(x, 0.4, -0.16);
    group.add(blockCore);
  });

  const headrest = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.05, 0.22),
    upholstery,
  );
  headrest.position.set(0, 0.37, -0.44);
  headrest.rotation.x = -0.12;
  group.add(headrest);

  [-0.3, 0.3].forEach((x) => {
    const upright = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.32, 8),
      metal,
    );
    upright.position.set(x, 0.42, 1.08);
    group.add(upright);
  });

  const footBar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.64, 16),
    metal,
  );
  footBar.rotation.z = Math.PI / 2;
  footBar.position.set(0, 0.54, 1.08);
  group.add(footBar);

  const rubberGrip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.56, 12),
    rubber,
  );
  rubberGrip.rotation.z = Math.PI / 2;
  rubberGrip.position.set(0, 0.54, 1.08);
  group.add(rubberGrip);

  const standingPlatform = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.07, 0.32),
    wood,
  );
  standingPlatform.position.set(0, 0.2, 1.28);
  standingPlatform.castShadow = true;
  group.add(standingPlatform);

  const springColors = [0xcc3333, 0x3366cc, 0x33aa33, 0xcccc33];
  springColors.forEach((color, i) => {
    const spring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.28, 6),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.6,
      }),
    );
    spring.rotation.x = Math.PI / 2;
    spring.position.set(-0.12 + i * 0.08, 0.24, 0.68);
    group.add(spring);
  });

  const springAnchor = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.04, 0.04),
    metal,
  );
  springAnchor.position.set(0, 0.24, 0.84);
  group.add(springAnchor);

  [-0.16, 0.16].forEach((x) => {
    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.45, 6),
      new THREE.MeshStandardMaterial({ color: 0x404040 }),
    );
    rope.position.set(x, 0.35, -0.88);
    group.add(rope);
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.035, 0.008, 8, 16),
      upholstery,
    );
    handle.position.set(x, 0.13, -0.88);
    group.add(handle);
  });
}

function addBike(group: THREE.Group, palette: ThemePalette): void {
  const metal = new THREE.MeshStandardMaterial({
    color: palette.equipment,
    roughness: 0.3,
    metalness: 0.7,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: palette.equipmentAccent,
    roughness: 0.35,
    metalness: 0.15,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.85,
  });
  const seatMat = new THREE.MeshStandardMaterial({
    color: palette.equipment,
    roughness: 0.6,
  });

  const frontStab = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.035, 0.07),
    metal,
  );
  frontStab.position.set(0, 0.018, 0.38);
  group.add(frontStab);

  const rearStab = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.035, 0.07),
    metal,
  );
  rearStab.position.set(0, 0.018, -0.32);
  group.add(rearStab);

  (
    [
      [-0.24, 0.38],
      [0.24, 0.38],
      [-0.24, -0.32],
      [0.24, -0.32],
    ] as [number, number][]
  ).forEach(([x, z]) => {
    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.012, 8),
      rubber,
    );
    foot.position.set(x, 0.006, z);
    group.add(foot);
  });

  const mainFrame = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, 0.68, 12),
    metal,
  );
  mainFrame.position.set(0, 0.37, 0.03);
  mainFrame.rotation.x = 0.1;
  mainFrame.castShadow = true;
  group.add(mainFrame);

  const seatTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.42, 10),
    metal,
  );
  seatTube.position.set(0, 0.55, -0.18);
  group.add(seatTube);

  const seatClamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.025, 10),
    metal,
  );
  seatClamp.position.set(0, 0.76, -0.18);
  group.add(seatClamp);

  const saddle = new THREE.Mesh(
    new THREE.BoxGeometry(0.17, 0.045, 0.26),
    seatMat,
  );
  saddle.position.set(0, 0.79, -0.18);
  saddle.castShadow = true;
  group.add(saddle);

  const saddleNose = new THREE.Mesh(
    new THREE.ConeGeometry(0.055, 0.11, 8),
    seatMat,
  );
  saddleNose.rotation.x = Math.PI / 2;
  saddleNose.position.set(0, 0.79, -0.04);
  group.add(saddleNose);

  const handlePost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.028, 0.48, 10),
    metal,
  );
  handlePost.position.set(0, 0.56, 0.34);
  handlePost.rotation.x = -0.08;
  group.add(handlePost);

  const handlebar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.42, 10),
    metal,
  );
  handlebar.rotation.z = Math.PI / 2;
  handlebar.position.set(0, 0.82, 0.36);
  group.add(handlebar);

  [-0.18, 0.18].forEach((x) => {
    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.07, 10),
      rubber,
    );
    grip.rotation.z = Math.PI / 2;
    grip.position.set(x, 0.82, 0.36);
    group.add(grip);
  });

  const handleDrop = new THREE.Mesh(
    new THREE.TorusGeometry(0.06, 0.012, 8, 12, Math.PI),
    metal,
  );
  handleDrop.rotation.y = Math.PI / 2;
  handleDrop.position.set(0, 0.76, 0.36);
  group.add(handleDrop);

  const flywheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.05, 32),
    metal,
  );
  flywheel.rotation.z = Math.PI / 2;
  flywheel.position.set(0, 0.28, 0.26);
  flywheel.castShadow = true;
  group.add(flywheel);

  const flywheelHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.06, 16),
    accent,
  );
  flywheelHub.rotation.z = Math.PI / 2;
  flywheelHub.position.set(0, 0.28, 0.26);
  group.add(flywheelHub);

  const flywheelRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.012, 8, 32),
    accent,
  );
  flywheelRim.rotation.y = Math.PI / 2;
  flywheelRim.position.set(0, 0.28, 0.26);
  group.add(flywheelRim);

  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, 0.06), metal);
  guard.position.set(0, 0.28, 0.26);
  group.add(guard);

  (
    [
      [-0.13, 0.15],
      [0.13, -0.15],
    ] as [number, number][]
  ).forEach(([x, yOff]) => {
    const crank = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.16, 0.025),
      metal,
    );
    crank.position.set(x, 0.28 + yOff / 2, 0.26);
    group.add(crank);
    const pedal = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.018, 0.1),
      rubber,
    );
    pedal.position.set(x, 0.28 + yOff, 0.26);
    group.add(pedal);
    const pedalCage = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 0.035, 0.006),
      metal,
    );
    pedalCage.position.set(x, 0.28 + yOff + 0.018, 0.31);
    group.add(pedalCage);
  });

  const knob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.035, 12),
    accent,
  );
  knob.position.set(0, 0.7, 0.18);
  group.add(knob);

  const display = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.09, 0.015),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: 0x222222,
      emissiveIntensity: 0.3,
      roughness: 0.2,
    }),
  );
  display.position.set(0, 0.9, 0.38);
  display.rotation.x = -0.3;
  group.add(display);

  const displayBorder = new THREE.Mesh(
    new THREE.BoxGeometry(0.155, 0.105, 0.012),
    metal,
  );
  displayBorder.position.set(0, 0.9, 0.379);
  displayBorder.rotation.x = -0.3;
  group.add(displayBorder);

  const bottleHolder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, 0.09, 8, 1, true),
    new THREE.MeshStandardMaterial({
      color: palette.equipment,
      roughness: 0.4,
      metalness: 0.6,
      side: THREE.DoubleSide,
    }),
  );
  bottleHolder.position.set(0.12, 0.58, 0.12);
  group.add(bottleHolder);
}

function addStrengthStation(group: THREE.Group, palette: ThemePalette): void {
  const metal = new THREE.MeshStandardMaterial({
    color: palette.equipment,
    roughness: 0.35,
    metalness: 0.65,
  });
  const upholstery = new THREE.MeshStandardMaterial({
    color: palette.fabric,
    roughness: 0.65,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.85,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.15,
    metalness: 0.9,
  });

  const baseRail = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.055, 0.95),
    metal,
  );
  baseRail.position.set(0, 0.075, 0);
  baseRail.castShadow = true;
  group.add(baseRail);

  const frontBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.035, 0.055),
    metal,
  );
  frontBar.position.set(0, 0.055, 0.42);
  group.add(frontBar);

  const rearBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.035, 0.055),
    metal,
  );
  rearBar.position.set(0, 0.055, -0.42);
  group.add(rearBar);

  (
    [
      [-0.17, 0.42],
      [0.17, 0.42],
      [-0.17, -0.42],
      [0.17, -0.42],
    ] as [number, number][]
  ).forEach(([x, z]) => {
    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.012, 8),
      rubber,
    );
    foot.position.set(x, 0.006, z);
    group.add(foot);
  });

  const pillar = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.26, 0.055),
    metal,
  );
  pillar.position.set(0, 0.21, -0.12);
  group.add(pillar);

  const seatPivot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.08, 10),
    metal,
  );
  seatPivot.rotation.z = Math.PI / 2;
  seatPivot.position.set(0, 0.34, -0.12);
  group.add(seatPivot);

  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.065, 0.36),
    upholstery,
  );
  seat.position.set(0, 0.38, 0.18);
  seat.castShadow = true;
  group.add(seat);

  const back = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.065, 0.5),
    upholstery,
  );
  back.position.set(0, 0.46, -0.18);
  back.rotation.x = -0.32;
  back.castShadow = true;
  group.add(back);

  const backFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.03, 0.5),
    metal,
  );
  backFrame.position.set(0, 0.43, -0.18);
  backFrame.rotation.x = -0.32;
  group.add(backFrame);

  [-0.26, 0.26].forEach((x) => {
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.12, 10),
      chrome,
    );
    handle.rotation.z = Math.PI / 2;
    handle.position.set(x, 0.055, -0.68);
    group.add(handle);

    [-0.055, -0.035, 0.035, 0.055].forEach((offset) => {
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.015, 14),
        metal,
      );
      plate.rotation.z = Math.PI / 2;
      plate.position.set(x + offset, 0.055, -0.68);
      group.add(plate);
    });

    const endCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.014, 8, 8),
      chrome,
    );
    endCap.position.set(x + (x > 0 ? 0.07 : -0.07), 0.055, -0.68);
    group.add(endCap);
  });

  const kbBody = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), metal);
  kbBody.position.set(0.32, 0.065, -0.18);
  kbBody.castShadow = true;
  group.add(kbBody);

  const kbFlat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.005, 12),
    metal,
  );
  kbFlat.position.set(0.32, 0.003, -0.18);
  group.add(kbFlat);

  const kbHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.035, 0.01, 8, 16, Math.PI),
    metal,
  );
  kbHandle.position.set(0.32, 0.145, -0.18);
  group.add(kbHandle);

  const weightPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.022, 24),
    metal,
  );
  weightPlate.position.set(-0.3, 0.011, 0.42);
  group.add(weightPlate);

  const weightHole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.024, 12),
    rubber,
  );
  weightHole.position.set(-0.3, 0.012, 0.42);
  group.add(weightHole);
}

function addOpenSpot(group: THREE.Group, palette: ThemePalette): void {
  const accentMat = new THREE.MeshStandardMaterial({
    color: palette.equipmentAccent,
    roughness: 0.5,
  });

  const spot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.018, 36),
    new THREE.MeshStandardMaterial({
      color: palette.fabric,
      transparent: true,
      opacity: 0.88,
      roughness: 0.55,
    }),
  );
  spot.position.y = 0.012;
  spot.castShadow = true;
  group.add(spot);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.006, 8, 36),
    accentMat,
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.022;
  group.add(ring);

  const dot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.012, 16),
    accentMat,
  );
  dot.position.y = 0.02;
  group.add(dot);

  const roller = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.32, 16),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 }),
  );
  roller.rotation.z = Math.PI / 2;
  roller.position.set(-0.42, 0.06, -0.22);
  roller.castShadow = true;
  group.add(roller);

  const rollerEnd1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.062, 0.062, 0.015, 16),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 }),
  );
  rollerEnd1.rotation.z = Math.PI / 2;
  rollerEnd1.position.set(-0.58, 0.06, -0.22);
  group.add(rollerEnd1);

  const rollerEnd2 = rollerEnd1.clone();
  rollerEnd2.position.set(-0.26, 0.06, -0.22);
  group.add(rollerEnd2);

  const block = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.1, 0.23),
    new THREE.MeshStandardMaterial({ color: 0x8b6d4a, roughness: 0.7 }),
  );
  block.position.set(0.4, 0.05, -0.28);
  block.castShadow = true;
  group.add(block);

  const rope = new THREE.Mesh(
    new THREE.TorusGeometry(0.07, 0.004, 6, 32),
    new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 }),
  );
  rope.rotation.x = Math.PI / 2;
  rope.position.set(0.38, 0.015, 0.22);
  group.add(rope);
}

function disposeScene(scene: THREE.Scene): void {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    if (Array.isArray(object.material)) {
      object.material.forEach((material) => material.dispose());
    } else {
      object.material.dispose();
    }
  });
}

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

export type CameraPreset = 'ISOMETRIC' | 'TOP_DOWN' | 'FOCUS_NODE' | 'FREE';

export interface Trace3DNodeData {
  id: string;
  name: string;
  role: string;
  category: 'GATEWAY' | 'SERVICE' | 'DATA';
  status: 'HEALTHY' | 'WARNING' | 'FAILED';
  latency: string;
  rps: string;
  position: [number, number, number];
  color: string;
}

interface Trace3DTopologyCanvasProps {
  scenario?: 'NORMAL' | 'POSTGRES_DOWN' | 'STRIPE_LATENCY' | 'AUTH_DRIFT';
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
  className?: string;
  cameraPreset?: CameraPreset;
  onPresetChange?: (preset: CameraPreset) => void;
}

export const Trace3DTopologyCanvas: React.FC<Trace3DTopologyCanvasProps> = ({
  scenario = 'NORMAL',
  selectedNodeId,
  onSelectNode,
  className = '',
  cameraPreset = 'ISOMETRIC',
  onPresetChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // HUD Telemetry State
  const [hoveredNode, setHoveredNode] = useState<Trace3DNodeData | null>(null);
  const [fps, setFps] = useState<number>(60);
  const [camAngles, setCamAngles] = useState<{ yaw: number; pitch: number; zoom: number }>({ yaw: 35, pitch: 25, zoom: 32 });

  // Internal refs for Three.js state
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    nodeMeshes: Map<string, THREE.Group>;
    conduitLines: THREE.Line[];
    conduitPoints: Array<{ curve: THREE.CatmullRomCurve3; particleGroup: THREE.Points; progress: number[] }>;
    shockwaveMesh: THREE.Mesh | null;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    targetCamPos: THREE.Vector3;
    targetLookAt: THREE.Vector3;
    currentLookAt: THREE.Vector3;
    isDragging: boolean;
    previousMousePosition: { x: number; y: number };
    sphericalCoords: { radius: number; theta: number; phi: number };
  } | null>(null);

  // Architecture Nodes Definition
  const nodesData: Trace3DNodeData[] = [
    {
      id: 'SYS-AUTH',
      name: 'Auth0 Gateway',
      role: 'Identity & JWT Conduit',
      category: 'GATEWAY',
      status: scenario === 'AUTH_DRIFT' ? 'FAILED' : 'HEALTHY',
      latency: scenario === 'AUTH_DRIFT' ? '145ms' : '14ms',
      rps: '940 req/s',
      position: [0, 7.5, -5.5],
      color: scenario === 'AUTH_DRIFT' ? '#ef4444' : '#38bdf8',
    },
    {
      id: 'SYS-CORE',
      name: 'Phoenix Core API',
      role: 'Orchestration & Workflow',
      category: 'SERVICE',
      status: scenario === 'POSTGRES_DOWN' || scenario === 'STRIPE_LATENCY' ? 'WARNING' : 'HEALTHY',
      latency: scenario === 'POSTGRES_DOWN' ? '450ms' : scenario === 'STRIPE_LATENCY' ? '280ms' : '28ms',
      rps: '2,840 req/s',
      position: [0, 1.8, 0],
      color: scenario === 'POSTGRES_DOWN' ? '#f59e0b' : '#34d399',
    },
    {
      id: 'SYS-STRIPE',
      name: 'Stripe Billing',
      role: 'PCI Payment Gateway',
      category: 'SERVICE',
      status: scenario === 'STRIPE_LATENCY' ? 'WARNING' : 'HEALTHY',
      latency: scenario === 'STRIPE_LATENCY' ? '850ms' : '85ms',
      rps: '120 req/s',
      position: [10.5, 1.8, -2],
      color: scenario === 'STRIPE_LATENCY' ? '#f59e0b' : '#38bdf8',
    },
    {
      id: 'SYS-DB',
      name: 'Primary Postgres',
      role: 'ACID System of Record',
      category: 'DATA',
      status: scenario === 'POSTGRES_DOWN' ? 'FAILED' : 'WARNING',
      latency: scenario === 'POSTGRES_DOWN' ? 'TIMEOUT' : '8ms',
      rps: scenario === 'POSTGRES_DOWN' ? '0 req/s' : '1,850 req/s',
      position: [-8, -5.5, 5],
      color: scenario === 'POSTGRES_DOWN' ? '#ef4444' : '#38bdf8',
    },
    {
      id: 'SYS-REDIS',
      name: 'Redis Cache',
      role: 'L1 Fast In-Memory',
      category: 'DATA',
      status: 'HEALTHY',
      latency: '2ms',
      rps: '4,600 req/s',
      position: [2, -5.5, 6.5],
      color: '#34d399',
    },
    {
      id: 'SYS-KAFKA',
      name: 'Kafka Message Bus',
      role: 'Event Stream & Buffer',
      category: 'DATA',
      status: 'HEALTHY',
      latency: '5ms',
      rps: '8,200 msg/s',
      position: [10.5, -5.5, 4],
      color: '#34d399',
    },
  ];

  // Conduits connecting architecture
  const edgesData: Array<{ from: string; to: string; isSevered?: boolean; isHazard?: boolean }> = [
    { from: 'SYS-AUTH', to: 'SYS-CORE', isHazard: scenario === 'AUTH_DRIFT' },
    { from: 'SYS-CORE', to: 'SYS-STRIPE', isHazard: scenario === 'STRIPE_LATENCY' },
    { from: 'SYS-CORE', to: 'SYS-DB', isSevered: scenario === 'POSTGRES_DOWN' },
    { from: 'SYS-CORE', to: 'SYS-REDIS' },
    { from: 'SYS-CORE', to: 'SYS-KAFKA' },
    { from: 'SYS-STRIPE', to: 'SYS-DB', isSevered: scenario === 'POSTGRES_DOWN' },
  ];

  // Set Camera Preset function
  const applyCameraPreset = useCallback((preset: CameraPreset) => {
    if (!threeRef.current) return;
    const { sphericalCoords, targetLookAt } = threeRef.current;

    if (preset === 'ISOMETRIC') {
      sphericalCoords.radius = 32;
      sphericalCoords.theta = Math.PI / 4; // 45 deg
      sphericalCoords.phi = Math.PI / 3;   // 60 deg elevation
      targetLookAt.set(0, 0, 0);
    } else if (preset === 'TOP_DOWN') {
      sphericalCoords.radius = 34;
      sphericalCoords.theta = 0.001;
      sphericalCoords.phi = 0.05; // almost looking directly down
      targetLookAt.set(0, 0, 0);
    } else if (preset === 'FOCUS_NODE') {
      const activeNode = nodesData.find((n) => n.id === selectedNodeId) || nodesData[1];
      targetLookAt.set(...activeNode.position);
      sphericalCoords.radius = 18;
      sphericalCoords.theta = Math.PI / 3.5;
      sphericalCoords.phi = Math.PI / 2.8;
    }
  }, [selectedNodeId, nodesData]);

  // Handle Preset Change
  useEffect(() => {
    applyCameraPreset(cameraPreset);
  }, [cameraPreset, applyCameraPreset]);

  // Main Three.js Lifecycle
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let width = container.clientWidth || 800;
    let height = container.clientHeight || 520;

    // 1. Scene setup with Sci-Fi Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070c18); // OLED deep midnight navy
    scene.fog = new THREE.FogExp2(0x070c18, 0.015);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const sphericalCoords = { radius: 32, theta: Math.PI / 4, phi: Math.PI / 3 };
    camera.position.set(
      sphericalCoords.radius * Math.sin(sphericalCoords.phi) * Math.sin(sphericalCoords.theta),
      sphericalCoords.radius * Math.cos(sphericalCoords.phi),
      sphericalCoords.radius * Math.sin(sphericalCoords.phi) * Math.cos(sphericalCoords.theta)
    );
    const targetLookAt = new THREE.Vector3(0, 0, 0);
    const currentLookAt = new THREE.Vector3(0, 0, 0);
    const targetCamPos = camera.position.clone();
    camera.lookAt(targetLookAt);

    // 3. Renderer with antialiasing and device pixel ratio clamp
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // 4. Lighting (Sci-fi studio lighting)
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.4);
    scene.add(ambientLight);

    const primaryDirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    primaryDirLight.position.set(20, 40, 20);
    scene.add(primaryDirLight);

    const cyanRimLight = new THREE.PointLight(0x38bdf8, 2, 60);
    cyanRimLight.position.set(-15, 10, -15);
    scene.add(cyanRimLight);

    const emeraldFillLight = new THREE.PointLight(0x34d399, 1.5, 50);
    emeraldFillLight.position.set(15, -10, 15);
    scene.add(emeraldFillLight);

    // 5. Volumetric Cybernetic Ground Grid & Elevation Rings
    const gridHelper = new THREE.GridHelper(40, 40, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -10;
    scene.add(gridHelper);

    // Coordinate crosshair lines
    const axisGroup = new THREE.Group();
    const axisMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.15 });
    const xGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-20, -10, 0), new THREE.Vector3(20, -10, 0)]);
    const zGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -10, -20), new THREE.Vector3(0, -10, 20)]);
    axisGroup.add(new THREE.Line(xGeo, axisMat));
    axisGroup.add(new THREE.Line(zGeo, axisMat));
    scene.add(axisGroup);

    // 6. Build Volumetric 3D Service Meshes
    const nodeMeshes = new Map<string, THREE.Group>();

    nodesData.forEach((node) => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(...node.position);
      nodeGroup.userData = { id: node.id, nodeData: node };

      const baseColor = new THREE.Color(node.color);

      // Unique geometry per category/service
      let coreGeometry: THREE.BufferGeometry;
      if (node.category === 'GATEWAY') {
        coreGeometry = new THREE.OctahedronGeometry(1.6, 0);
      } else if (node.id === 'SYS-CORE') {
        coreGeometry = new THREE.CylinderGeometry(1.8, 1.8, 2.2, 6);
      } else if (node.id === 'SYS-STRIPE') {
        coreGeometry = new THREE.DodecahedronGeometry(1.5, 0);
      } else if (node.id === 'SYS-DB') {
        coreGeometry = new THREE.CylinderGeometry(1.6, 1.6, 2.0, 16);
      } else if (node.id === 'SYS-REDIS') {
        coreGeometry = new THREE.BoxGeometry(2.0, 2.0, 2.0);
      } else {
        coreGeometry = new THREE.TorusGeometry(1.3, 0.45, 12, 24);
      }

      // High-tech physical material
      const coreMaterial = new THREE.MeshPhysicalMaterial({
        color: baseColor,
        emissive: baseColor,
        emissiveIntensity: 0.25,
        roughness: 0.2,
        metalness: 0.8,
        transparent: true,
        opacity: 0.85,
        wireframe: false,
      });

      const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
      nodeGroup.add(coreMesh);

      // Wireframe exterior cage
      const wireGeo = new THREE.WireframeGeometry(coreGeometry);
      const wireMat = new THREE.LineBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.6,
      });
      const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
      wireMesh.scale.set(1.05, 1.05, 1.05);
      nodeGroup.add(wireMesh);

      // Glowing Orbit Ring
      const ringGeo = new THREE.RingGeometry(2.4, 2.5, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: baseColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      nodeGroup.add(ringMesh);

      // Hover glow sphere
      const glowGeo = new THREE.SphereGeometry(2.8, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.0,
        wireframe: true,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.name = 'hoverGlow';
      nodeGroup.add(glowMesh);

      // Selection Halo
      const haloGeo = new THREE.RingGeometry(3.0, 3.15, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: node.id === selectedNodeId ? 0.9 : 0.0,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.name = 'selectionHalo';
      haloMesh.rotation.x = Math.PI / 2;
      nodeGroup.add(haloMesh);

      // Elevation drop line down to ground plane
      const dropLineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, -10 - node.position[1], 0),
      ]);
      const dropLineMat = new THREE.LineDashedMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.2,
        dashSize: 0.5,
        gapSize: 0.5,
      });
      const dropLine = new THREE.Line(dropLineGeo, dropLineMat);
      dropLine.computeLineDistances();
      nodeGroup.add(dropLine);

      scene.add(nodeGroup);
      nodeMeshes.set(node.id, nodeGroup);
    });

    // 7. Build 3D Curved Catmull-Rom Conduits & Flowing Photon Particles
    const conduitLines: THREE.Line[] = [];
    const conduitPoints: Array<{ curve: THREE.CatmullRomCurve3; particleGroup: THREE.Points; progress: number[] }> = [];

    edgesData.forEach((edge) => {
      const fromNode = nodesData.find((n) => n.id === edge.from);
      const toNode = nodesData.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) return;

      const p1 = new THREE.Vector3(...fromNode.position);
      const p2 = new THREE.Vector3(...toNode.position);

      const mid = new THREE.Vector3()
        .addVectors(p1, p2)
        .multiplyScalar(0.5)
        .add(new THREE.Vector3(0, 1.8, 0));

      const curve = new THREE.CatmullRomCurve3([p1, mid, p2]);
      const points = curve.getPoints(50);
      const conduitGeo = new THREE.BufferGeometry().setFromPoints(points);

      const isSevered = edge.isSevered;
      const isHazard = edge.isHazard;

      const conduitColor = isSevered ? 0xef4444 : isHazard ? 0xf59e0b : 0x1e293b;

      const conduitMat = new THREE.LineBasicMaterial({
        color: conduitColor,
        transparent: true,
        opacity: isSevered ? 0.3 : 0.8,
        linewidth: 2,
      });

      const conduitLine = new THREE.Line(conduitGeo, conduitMat);
      scene.add(conduitLine);
      conduitLines.push(conduitLine);

      // Flowing Photon Particle Packets
      if (!isSevered) {
        const particleCount = 6;
        const particleGeo = new THREE.BufferGeometry();
        const posArray = new Float32Array(particleCount * 3);
        particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        const particleMat = new THREE.PointsMaterial({
          color: isHazard ? 0xf59e0b : 0x38bdf8,
          size: 0.45,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
        });

        const particles = new THREE.Points(particleGeo, particleMat);
        scene.add(particles);

        const progress = Array.from({ length: particleCount }, (_, i) => i / particleCount);
        conduitPoints.push({ curve, particleGroup: particles, progress });
      }
    });

    // 8. 3D Outage Shockwave Sphere
    let shockwaveMesh: THREE.Mesh | null = null;
    if (scenario === 'POSTGRES_DOWN' || scenario === 'STRIPE_LATENCY' || scenario === 'AUTH_DRIFT') {
      const epicentreNodeId = scenario === 'POSTGRES_DOWN' ? 'SYS-DB' : scenario === 'STRIPE_LATENCY' ? 'SYS-STRIPE' : 'SYS-AUTH';
      const epicentre = nodesData.find((n) => n.id === epicentreNodeId);

      if (epicentre) {
        const shockGeo = new THREE.SphereGeometry(1, 32, 32);
        const shockMat = new THREE.MeshBasicMaterial({
          color: scenario === 'POSTGRES_DOWN' ? 0xef4444 : 0xf59e0b,
          wireframe: true,
          transparent: true,
          opacity: 0.6,
        });
        shockwaveMesh = new THREE.Mesh(shockGeo, shockMat);
        shockwaveMesh.position.set(...epicentre.position);
        scene.add(shockwaveMesh);
      }
    }

    // 9. Interactive Mouse Drag & Raycasting Setup
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        sphericalCoords.theta -= deltaX * 0.006;
        sphericalCoords.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, sphericalCoords.phi - deltaY * 0.006));

        previousMousePosition = { x: e.clientX, y: e.clientY };

        if (onPresetChange) onPresetChange('FREE');
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      sphericalCoords.radius = Math.max(12, Math.min(60, sphericalCoords.radius + e.deltaY * 0.03));
      if (onPresetChange) onPresetChange('FREE');
    };

    const onClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const interactableObjects: THREE.Object3D[] = [];
      nodeMeshes.forEach((group) => {
        interactableObjects.push(...group.children);
      });

      const intersects = raycaster.intersectObjects(interactableObjects, false);
      if (intersects.length > 0) {
        let hitObj: THREE.Object3D | null = intersects[0].object;
        while (hitObj && !hitObj.userData.id) {
          hitObj = hitObj.parent;
        }
        if (hitObj && hitObj.userData.id) {
          onSelectNode(hitObj.userData.id);
        }
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('click', onClick);

    // Window Resize Observer
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      width = container.clientWidth;
      height = container.clientHeight || 520;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Save references
    threeRef.current = {
      scene,
      camera,
      renderer,
      nodeMeshes,
      conduitLines,
      conduitPoints,
      shockwaveMesh,
      raycaster,
      mouse,
      targetCamPos,
      targetLookAt,
      currentLookAt,
      isDragging,
      previousMousePosition,
      sphericalCoords,
    };

    // 10. Render Loop with Tab-Visibility Pause (ui-ux-pro-max Three.js Best Practice)
    let frameCount = 0;
    let fpsTimer = performance.now();
    let startTime = performance.now();
    let lastFrameTime = performance.now();
    let shockwaveScale = 1;

    const animate = () => {
      const now = performance.now();
      const delta = Math.min((now - lastFrameTime) / 1000, 0.1);
      lastFrameTime = now;
      const time = (now - startTime) / 1000;

      // FPS Calculation
      frameCount++;
      if (performance.now() - fpsTimer >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        fpsTimer = performance.now();
      }

      // Spring-smoothed Camera Movement
      targetCamPos.set(
        sphericalCoords.radius * Math.sin(sphericalCoords.phi) * Math.sin(sphericalCoords.theta),
        sphericalCoords.radius * Math.cos(sphericalCoords.phi),
        sphericalCoords.radius * Math.sin(sphericalCoords.phi) * Math.cos(sphericalCoords.theta)
      );

      camera.position.lerp(targetCamPos, 0.08);
      currentLookAt.lerp(targetLookAt, 0.08);
      camera.lookAt(currentLookAt);

      // Update HUD telemetry angles
      const yawDeg = Math.round((sphericalCoords.theta * 180) / Math.PI) % 360;
      const pitchDeg = Math.round((sphericalCoords.phi * 180) / Math.PI);
      const zoomVal = Math.round(sphericalCoords.radius);
      setCamAngles({ yaw: yawDeg, pitch: pitchDeg, zoom: zoomVal });

      // Node Perpetual Micro-Animations
      nodeMeshes.forEach((group, id) => {
        const offset = id.charCodeAt(id.length - 1) * 0.5;
        group.position.y = group.position.y + Math.sin(time * 1.5 + offset) * 0.003;

        const wire = group.children[1];
        if (wire) wire.rotation.y += 0.004;

        const ring = group.children[2];
        if (ring) {
          ring.rotation.z += 0.008;
        }

        const halo = group.getObjectByName('selectionHalo') as THREE.Mesh | undefined;
        if (halo) {
          const isSelected = id === selectedNodeId;
          halo.visible = isSelected;
          if (isSelected) {
            halo.rotation.z -= 0.015;
            const s = 1.0 + Math.sin(time * 4) * 0.05;
            halo.scale.set(s, s, s);
          }
        }
      });

      // Flowing Photon Particle Streams along Conduits
      conduitPoints.forEach(({ curve, particleGroup, progress }) => {
        const positions = (particleGroup.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        const count = progress.length;

        for (let i = 0; i < count; i++) {
          progress[i] = (progress[i] + delta * 0.45) % 1.0;
          const point = curve.getPointAt(progress[i]);
          positions[i * 3] = point.x;
          positions[i * 3 + 1] = point.y;
          positions[i * 3 + 2] = point.z;
        }
        particleGroup.geometry.attributes.position.needsUpdate = true;
      });

      // 3D Outage Blast Radius Pulsating Shockwave
      if (shockwaveMesh) {
        shockwaveScale += delta * 4.5;
        if (shockwaveScale > 11) {
          shockwaveScale = 1;
        }
        shockwaveMesh.scale.set(shockwaveScale, shockwaveScale, shockwaveScale);
        (shockwaveMesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 * (1 - shockwaveScale / 11));
        shockwaveMesh.rotation.y += delta * 0.5;
      }

      // Raycasting for Hover Highlights
      raycaster.setFromCamera(mouse, camera);
      const allObjects: THREE.Object3D[] = [];
      nodeMeshes.forEach((group) => {
        allObjects.push(...group.children);
      });

      const intersects = raycaster.intersectObjects(allObjects, false);
      let foundNode: Trace3DNodeData | null = null;

      // Reset hover glows
      nodeMeshes.forEach((group) => {
        const glow = group.getObjectByName('hoverGlow') as THREE.Mesh | undefined;
        if (glow) (glow.material as THREE.MeshBasicMaterial).opacity = 0;
      });

      if (intersects.length > 0) {
        let hitObj: THREE.Object3D | null = intersects[0].object;
        while (hitObj && !hitObj.userData.id) {
          hitObj = hitObj.parent;
        }
        if (hitObj && hitObj.userData.nodeData) {
          foundNode = hitObj.userData.nodeData;
          const group = nodeMeshes.get(hitObj.userData.id);
          const glow = group?.getObjectByName('hoverGlow') as THREE.Mesh | undefined;
          if (glow) {
            (glow.material as THREE.MeshBasicMaterial).opacity = 0.35;
          }
        }
      }
      setHoveredNode(foundNode);

      renderer.render(scene, camera);
    };

    // Use renderer.setAnimationLoop per ui-ux-pro-max Three.js stack guidelines
    renderer.setAnimationLoop(animate);

    // Pause on Tab Hidden to preserve user battery
    const onVisibilityChange = () => {
      if (document.hidden) {
        renderer.setAnimationLoop(null);
      } else {
        lastFrameTime = performance.now();
        renderer.setAnimationLoop(animate);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Cleanup and memory disposal
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();

      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('click', onClick);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [scenario, selectedNodeId, onSelectNode, onPresetChange]);

  return (
    <div ref={containerRef} className={`relative w-full h-[520px] bg-[#070c18] rounded-[3px] overflow-hidden border border-slate-800 ${className}`}>
      {/* Three.js Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing select-none" />

      {/* Top Left: Sci-Fi Spatial Coordinates & Orbit Telemetry */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none font-mono text-[10px]">
        <div className="px-2.5 py-1 rounded-[2px] bg-slate-900/90 border border-slate-800 text-slate-300 flex items-center gap-2 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-sky-400 font-bold">3D SPATIAL MESH</span>
          <span className="text-slate-600">|</span>
          <span>YAW: {camAngles.yaw}°</span>
          <span>PITCH: {camAngles.pitch}°</span>
          <span>DIST: {camAngles.zoom}m</span>
        </div>
        <div className="px-2 py-1 rounded-[2px] bg-slate-900/90 border border-slate-800 text-emerald-400 font-bold backdrop-blur-md">
          {fps} FPS
        </div>
      </div>

      {/* Top Right: Camera Presets Switcher */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-[3px] backdrop-blur-md">
        <button
          onClick={() => {
            applyCameraPreset('ISOMETRIC');
            if (onPresetChange) onPresetChange('ISOMETRIC');
          }}
          className={`px-2.5 py-1 rounded-[2px] text-[10px] font-mono font-semibold transition-all cursor-pointer ${
            cameraPreset === 'ISOMETRIC'
              ? 'bg-sky-500 text-black shadow-[0_0_8px_rgba(56,189,248,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Isometric 3D
        </button>
        <button
          onClick={() => {
            applyCameraPreset('TOP_DOWN');
            if (onPresetChange) onPresetChange('TOP_DOWN');
          }}
          className={`px-2.5 py-1 rounded-[2px] text-[10px] font-mono font-semibold transition-all cursor-pointer ${
            cameraPreset === 'TOP_DOWN'
              ? 'bg-sky-500 text-black shadow-[0_0_8px_rgba(56,189,248,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Top-Down
        </button>
        <button
          onClick={() => {
            applyCameraPreset('FOCUS_NODE');
            if (onPresetChange) onPresetChange('FOCUS_NODE');
          }}
          className={`px-2.5 py-1 rounded-[2px] text-[10px] font-mono font-semibold transition-all cursor-pointer ${
            cameraPreset === 'FOCUS_NODE'
              ? 'bg-sky-500 text-black shadow-[0_0_8px_rgba(56,189,248,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Focus Selected
        </button>
      </div>

      {/* Bottom Left: Interactive Hover Raycast HUD Card */}
      {hoveredNode && (
        <div className="absolute bottom-3 left-3 p-3 rounded-[3px] bg-slate-950/95 border border-sky-500/50 shadow-2xl backdrop-blur-md pointer-events-none max-w-xs animate-in fade-in duration-150 space-y-1 font-mono text-xs">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5">
            <span className="font-bold text-sky-400">{hoveredNode.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-[2px] ${
              hoveredNode.status === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-300' :
              hoveredNode.status === 'WARNING' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
            }`}>
              {hoveredNode.status}
            </span>
          </div>
          <div className="text-[11px] text-slate-300 font-sans">{hoveredNode.role}</div>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
            <div>Latency: <strong className="text-slate-100">{hoveredNode.latency}</strong></div>
            <div>Throughput: <strong className="text-slate-100">{hoveredNode.rps}</strong></div>
          </div>
          <div className="text-[9px] text-sky-400 pt-0.5">Click to inspect subsystem in dossier →</div>
        </div>
      )}

      {/* Bottom Right: Drag Orbit Hint & Blast Alert Badge */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2 pointer-events-none">
        {scenario !== 'NORMAL' && (
          <div className="px-3 py-1 rounded-[2px] bg-rose-500/20 border border-rose-500/60 text-rose-300 font-mono text-[10px] flex items-center gap-1.5 shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>3D BLAST RADIUS SHOCKWAVE ACTIVE</span>
          </div>
        )}
        <div className="px-2.5 py-1 rounded-[2px] bg-slate-900/80 border border-slate-800/80 text-slate-400 font-mono text-[10px] backdrop-blur-sm">
          Drag to Orbit • Scroll to Zoom
        </div>
      </div>
    </div>
  );
};

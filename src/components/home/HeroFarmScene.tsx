import React, { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface HeroFarmSceneProps {
  isReducedMotion?: boolean;
  mousePos?: { x: number; y: number };
  weatherCondition?: string;
}

// ─── FARMER MODEL ───────────────────────────────────────────────────────────
// Anatomically proportioned 3D Indian farmer inspecting crops
const FarmerFigure: React.FC<{ isReducedMotion?: boolean }> = ({ isReducedMotion }) => {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (isReducedMotion || !groupRef.current) return;
    const t = state.clock.getElapsedTime();
    // Subtle natural breathing
    if (torsoRef.current) {
      torsoRef.current.position.y = Math.sin(t * 1.5) * 0.008;
      torsoRef.current.rotation.z = Math.sin(t * 0.8) * 0.005;
    }
    // Subtle head tilt inspecting soybean plant
    if (headRef.current) {
      headRef.current.rotation.y = -0.35 + Math.sin(t * 1.2) * 0.04;
      headRef.current.rotation.x = 0.2 + Math.cos(t * 1.0) * 0.02;
    }
    // Subtle hand gesture inspecting crop leaf
    if (rightArmRef.current) {
      rightArmRef.current.rotation.z = -0.55 + Math.sin(t * 1.6) * 0.03;
      rightArmRef.current.rotation.x = 0.3 + Math.cos(t * 1.4) * 0.02;
    }
  });

  return (
    <group ref={groupRef} position={[0.45, -0.42, 0.4]} rotation={[0, -0.65, 0]}>
      {/* Torso & Upper Body */}
      <group ref={torsoRef}>
        {/* Shirt / Kurta (Natural cream / warm beige) */}
        <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.16, 0.18, 0.42, 12]} />
          <meshStandardMaterial color="#EFEBE9" roughness={0.8} />
        </mesh>

        {/* Gamcha / Folded shoulder cloth (AgriConnect green accent) */}
        <mesh position={[-0.08, 0.54, 0.02]} rotation={[0.2, 0.3, -0.4]} castShadow>
          <boxGeometry args={[0.08, 0.38, 0.14]} />
          <meshStandardMaterial color="#0F5132" roughness={0.7} />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 0.72, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.08, 8]} />
          <meshStandardMaterial color="#8D5B4C" roughness={0.7} />
        </mesh>

        {/* Head & Face */}
        <group ref={headRef} position={[0, 0.81, 0]}>
          {/* Head base */}
          <mesh castShadow>
            <sphereGeometry args={[0.082, 16, 16]} />
            <meshStandardMaterial color="#8D5B4C" roughness={0.65} />
          </mesh>
          {/* Hair / Turban cloth (Folded maroon/brown cloth) */}
          <mesh position={[0, 0.04, -0.01]} rotation={[-0.15, 0, 0]} castShadow>
            <sphereGeometry args={[0.086, 14, 12]} />
            <meshStandardMaterial color="#4A2E2B" roughness={0.85} />
          </mesh>
          {/* Turban wrap band */}
          <mesh position={[0, 0.05, 0.01]} rotation={[0.1, 0, 0]} castShadow>
            <torusGeometry args={[0.078, 0.02, 8, 16]} />
            <meshStandardMaterial color="#8C3A27" roughness={0.8} />
          </mesh>
        </group>

        {/* Left Arm (Relaxed at side) */}
        <group position={[-0.19, 0.58, 0]} rotation={[0.1, 0, 0.2]}>
          <mesh position={[0, -0.15, 0]} castShadow>
            <cylinderGeometry args={[0.042, 0.035, 0.3, 8]} />
            <meshStandardMaterial color="#EFEBE9" roughness={0.8} />
          </mesh>
          {/* Forearm & Hand */}
          <mesh position={[0, -0.32, 0.02]} rotation={[-0.2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.028, 0.24, 8]} />
            <meshStandardMaterial color="#8D5B4C" roughness={0.7} />
          </mesh>
        </group>

        {/* Right Arm (Extended forward inspecting crop) */}
        <group ref={rightArmRef} position={[0.19, 0.58, 0]} rotation={[0.4, -0.3, -0.4]}>
          <mesh position={[0, -0.14, 0]} castShadow>
            <cylinderGeometry args={[0.042, 0.035, 0.28, 8]} />
            <meshStandardMaterial color="#EFEBE9" roughness={0.8} />
          </mesh>
          {/* Forearm inspecting leaf */}
          <mesh position={[0, -0.3, 0.08]} rotation={[-0.5, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.026, 0.26, 8]} />
            <meshStandardMaterial color="#8D5B4C" roughness={0.7} />
          </mesh>
        </group>
      </group>

      {/* Legs & Trousers */}
      <group position={[0, 0.26, 0]}>
        {/* Left Leg */}
        <mesh position={[-0.08, -0.18, 0]} rotation={[0.05, 0, 0.05]} castShadow receiveShadow>
          <cylinderGeometry args={[0.065, 0.055, 0.38, 10]} />
          <meshStandardMaterial color="#374151" roughness={0.85} />
        </mesh>
        {/* Right Leg */}
        <mesh position={[0.08, -0.18, 0]} rotation={[-0.05, 0, -0.05]} castShadow receiveShadow>
          <cylinderGeometry args={[0.065, 0.055, 0.38, 10]} />
          <meshStandardMaterial color="#374151" roughness={0.85} />
        </mesh>
        {/* Footwear (Farm boots) */}
        <mesh position={[-0.08, -0.39, 0.04]} castShadow>
          <boxGeometry args={[0.07, 0.06, 0.16]} />
          <meshStandardMaterial color="#1F2937" roughness={0.9} />
        </mesh>
        <mesh position={[0.08, -0.39, 0.04]} castShadow>
          <boxGeometry args={[0.07, 0.06, 0.16]} />
          <meshStandardMaterial color="#1F2937" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
};

// ─── INSTANCED SOYBEAN CROP FIELD ────────────────────────────────────────────
// High density, performant instanced soybean plants with realistic leaf geometry
const SoybeanCropField: React.FC<{ isReducedMotion?: boolean }> = ({ isReducedMotion }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 180; // Total plant instances across rows

  // Generate plant instance matrices & colors
  const { matrices, colors } = useMemo(() => {
    const dummy = new THREE.Object3D();
    const mats: THREE.Matrix4[] = [];
    const cols: THREE.Color[] = [];

    const baseColors = [
      new THREE.Color("#22C55E"), // Saturated healthy leaf
      new THREE.Color("#16A34A"), // Deep green leaf
      new THREE.Color("#15803D"), // Forest green leaf
      new THREE.Color("#4ADE80"), // Fresh top sprout
      new THREE.Color("#166534"), // Lower canopy dark green
    ];

    const numRows = 7;
    const plantsPerRow = Math.floor(count / numRows);

    let idx = 0;
    for (let r = 0; r < numRows; r++) {
      const xRow = (r - (numRows - 1) / 2) * 0.42;
      for (let p = 0; p < plantsPerRow; p++) {
        if (idx >= count) break;

        // Position along field row with slight natural jitter
        const z = -2.2 + (p / (plantsPerRow - 1)) * 3.8 + (Math.random() - 0.5) * 0.08;
        const x = xRow + (Math.random() - 0.5) * 0.07;
        const scale = 0.75 + Math.random() * 0.45;
        const rotY = Math.random() * Math.PI * 2;

        // Don't place plant directly over the farmer's standing spot
        if (Math.abs(x - 0.45) < 0.15 && Math.abs(z - 0.4) < 0.25) {
          continue;
        }

        dummy.position.set(x, -0.48 + (scale - 1) * 0.1, z);
        dummy.rotation.set(
          (Math.random() - 0.5) * 0.1,
          rotY,
          (Math.random() - 0.5) * 0.1
        );
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();

        mats.push(dummy.matrix.clone());
        cols.push(baseColors[Math.floor(Math.random() * baseColors.length)]);
        idx++;
      }
    }
    return { matrices: mats, colors: cols };
  }, [count]);

  useEffect(() => {
    if (!meshRef.current) return;
    matrices.forEach((mat, i) => {
      meshRef.current?.setMatrixAt(i, mat);
      meshRef.current?.setColorAt(i, colors[i]);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [matrices, colors]);

  // Wind swaying animation loop
  useFrame((state) => {
    if (isReducedMotion || !meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const dummy = new THREE.Object3D();

    matrices.forEach((mat, i) => {
      mat.decompose(dummy.position, dummy.quaternion, dummy.scale);
      // Natural wind sway calculation based on position & time
      const windX = Math.sin(t * 1.8 + dummy.position.z * 2.5 + dummy.position.x * 1.2) * 0.05;
      const windZ = Math.cos(t * 1.4 + dummy.position.x * 3.0) * 0.03;

      dummy.rotation.z += windX * 0.15;
      dummy.rotation.x += windZ * 0.15;
      dummy.updateMatrix();
      meshRef.current?.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Composite single soybean plant geometry (stem + 3 compound leaves)
  const plantGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const stemGeom = new THREE.CylinderGeometry(0.012, 0.02, 0.35, 6);
    stemGeom.translate(0, 0.175, 0);

    // Leaf blade (pointed oval)
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.quadraticCurveTo(0.06, 0.08, 0, 0.18);
    leafShape.quadraticCurveTo(-0.06, 0.08, 0, 0);

    const extrudeSettings = { depth: 0.002, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.001, bevelThickness: 0.001 };
    const leafGeom = new THREE.ExtrudeGeometry(leafShape, extrudeSettings);

    const mergedGeometries: THREE.BufferGeometry[] = [stemGeom];

    // Add 5 clusters of tri-foliate soybean leaves
    const clusters = [
      { pos: [0, 0.32, 0], rot: [0.3, 0, 0] },
      { pos: [0.04, 0.26, 0.02], rot: [0.4, 0.8, -0.2] },
      { pos: [-0.04, 0.24, -0.02], rot: [0.4, -0.8, 0.2] },
      { pos: [0.02, 0.18, 0.04], rot: [0.5, 1.8, -0.3] },
      { pos: [-0.02, 0.15, -0.04], rot: [0.5, -1.8, 0.3] },
    ];

    clusters.forEach((c) => {
      const lg1 = leafGeom.clone();
      lg1.rotateX(c.rot[0]);
      lg1.rotateY(c.rot[1]);
      lg1.rotateZ(c.rot[2]);
      lg1.translate(c.pos[0], c.pos[1], c.pos[2]);
      mergedGeometries.push(lg1);
    });

    // Merge geometries
    let totalVerts = 0;
    mergedGeometries.forEach((g) => (totalVerts += g.attributes.position.count));

    const posArray = new Float32Array(totalVerts * 3);
    const normArray = new Float32Array(totalVerts * 3);
    let offset = 0;

    mergedGeometries.forEach((g) => {
      const pos = g.attributes.position;
      const norm = g.attributes.normal;
      for (let i = 0; i < pos.count; i++) {
        posArray[(offset + i) * 3] = pos.getX(i);
        posArray[(offset + i) * 3 + 1] = pos.getY(i);
        posArray[(offset + i) * 3 + 2] = pos.getZ(i);
        if (norm) {
          normArray[(offset + i) * 3] = norm.getX(i);
          normArray[(offset + i) * 3 + 1] = norm.getY(i);
          normArray[(offset + i) * 3 + 2] = norm.getZ(i);
        }
      }
      offset += pos.count;
    });

    geom.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
    geom.setAttribute("normal", new THREE.BufferAttribute(normArray, 3));
    return geom;
  }, []);

  return (
    <instancedMesh
      ref={meshRef}
      args={[plantGeometry, undefined, matrices.length]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial roughness={0.55} metalness={0.05} side={THREE.DoubleSide} />
    </instancedMesh>
  );
};

// ─── CULTIVATED SOIL TERRAIN ─────────────────────────────────────────────────
const CultivatedSoilTerrain: React.FC = () => {
  const geom = useMemo(() => {
    const plane = new THREE.PlaneGeometry(12, 10, 48, 48);
    const pos = plane.attributes.position;
    // Add realistic field row ridges (furrows) running along the Z axis
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Furrow sinusoidal wave along X
      const furrow = Math.sin(x * 14.0) * 0.045;
      // Slight organic soil elevation roughness
      const roughness = (Math.sin(x * 25.0) * Math.cos(y * 20.0)) * 0.015;
      pos.setZ(i, furrow + roughness);
    }
    plane.computeVertexNormals();
    return plane;
  }, []);

  return (
    <mesh position={[0, -0.52, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <primitive object={geom} attach="geometry" />
      <meshStandardMaterial
        color="#3E2723"
        roughness={0.94}
        metalness={0.02}
      />
    </mesh>
  );
};

// ─── BACKGROUND ENVIRONMENT & TREELINE ───────────────────────────────────────
const BackgroundTrees: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const treeCount = 18;

  const trees = useMemo(() => {
    return Array.from({ length: treeCount }).map((_, i) => ({
      x: -5 + (i / (treeCount - 1)) * 10 + (Math.random() - 0.5) * 0.3,
      z: -3.8 - Math.random() * 0.6,
      scale: 0.6 + Math.random() * 0.5,
    }));
  }, [treeCount]);

  return (
    <group ref={groupRef}>
      {trees.map((t, idx) => (
        <group key={idx} position={[t.x, -0.4, t.z]} scale={[t.scale, t.scale, t.scale]}>
          {/* Trunk */}
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.04, 0.07, 0.6, 6]} />
            <meshStandardMaterial color="#271C19" roughness={0.9} />
          </mesh>
          {/* Canopy (Layered soft foliage) */}
          <mesh position={[0, 0.75, 0]}>
            <sphereGeometry args={[0.32, 8, 8]} />
            <meshStandardMaterial color="#0F5132" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.95, 0]}>
            <sphereGeometry args={[0.24, 8, 8]} />
            <meshStandardMaterial color="#1B5E20" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ─── CAMERA CONTROLLER WITH LERP PARALLAX ───────────────────────────────────
const CameraController: React.FC<{
  mousePos?: { x: number; y: number };
  isReducedMotion?: boolean;
}> = ({ mousePos = { x: 0, y: 0 }, isReducedMotion = false }) => {
  const { camera } = useThree();
  const targetPos = useRef({ x: 0, y: 0.4, z: 2.8 });

  useFrame((state, delta) => {
    if (isReducedMotion) {
      camera.position.set(0, 0.4, 2.8);
      camera.lookAt(0, 0.05, 0);
      return;
    }

    // Slow ambient camera drift + cursor parallax
    const t = state.clock.getElapsedTime();
    const driftX = Math.sin(t * 0.4) * 0.04;
    const driftY = Math.cos(t * 0.3) * 0.02;

    const mouseParallaxX = mousePos.x * 0.25;
    const mouseParallaxY = -mousePos.y * 0.15;

    targetPos.current.x = THREE.MathUtils.lerp(targetPos.current.x, mouseParallaxX + driftX, delta * 3);
    targetPos.current.y = THREE.MathUtils.lerp(targetPos.current.y, 0.4 + mouseParallaxY + driftY, delta * 3);

    camera.position.x = targetPos.current.x;
    camera.position.y = targetPos.current.y;
    camera.lookAt(0, 0.05, 0);
  });

  return null;
};

// ─── MAIN HERO FARM SCENE COMPONENT ─────────────────────────────────────────
export const HeroFarmScene: React.FC<HeroFarmSceneProps> = ({
  isReducedMotion = false,
  mousePos = { x: 0, y: 0 },
  weatherCondition = "",
}) => {
  const isCloudyOrOvercast = useMemo(() => {
    const c = weatherCondition.toLowerCase();
    return c.includes("cloud") || c.includes("rain") || c.includes("overcast") || c.includes("mist");
  }, [weatherCondition]);

  return (
    <>
      {/* Lighting System — Warm daylight or soft overcast atmosphere */}
      <ambientLight intensity={isCloudyOrOvercast ? 0.75 : 0.95} color="#FEF3C7" />

      {/* Sun directional light with shadow mapping */}
      <directionalLight
        position={[3.5, 4.5, 2.5]}
        intensity={isCloudyOrOvercast ? 1.0 : 1.55}
        color={isCloudyOrOvercast ? "#E2E8F0" : "#FFF7ED"}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={12}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />

      {/* Bounce fill light from green crop canopy */}
      <pointLight position={[-2, 1, 1]} intensity={0.4} color="#22C55E" />

      {/* Scene Elements */}
      <CameraController mousePos={mousePos} isReducedMotion={isReducedMotion} />
      <BackgroundTrees />
      <CultivatedSoilTerrain />
      <SoybeanCropField isReducedMotion={isReducedMotion} />
      <FarmerFigure isReducedMotion={isReducedMotion} />
    </>
  );
};

export default HeroFarmScene;

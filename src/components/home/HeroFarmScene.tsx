import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface FieldRowsProps {
  count?: number;
  isReducedMotion?: boolean;
}

const FieldRows: React.FC<FieldRowsProps> = ({ count = 9, isReducedMotion = false }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current || isReducedMotion) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      mesh.rotation.z = Math.sin(t * 1.8 + i * 0.4) * 0.08;
      mesh.position.y = Math.cos(t * 1.2 + i * 0.3) * 0.02;
    });
  });

  const rowItems = Array.from({ length: count });

  return (
    <group ref={groupRef} position={[0, -0.6, 0]}>
      {rowItems.map((_, i) => {
        const x = (i - (count - 1) / 2) * 0.45;
        return (
          <mesh key={i} position={[x, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.04, 0.08, 1.4, 8]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? "#22c55e" : "#15803d"}
              roughness={0.6}
              metalness={0.1}
            />
          </mesh>
        );
      })}
    </group>
  );
};

const FarmTerrain: React.FC = () => {
  return (
    <mesh position={[0, -1.3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial color="#5c4033" roughness={0.9} />
    </mesh>
  );
};

interface HeroFarmSceneProps {
  isReducedMotion?: boolean;
}

export const HeroFarmScene: React.FC<HeroFarmSceneProps> = ({ isReducedMotion = false }) => {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useFrame((state) => {
    if (lightRef.current && !isReducedMotion) {
      const t = state.clock.getElapsedTime();
      lightRef.current.position.x = 3 + Math.sin(t * 0.5) * 0.5;
    }
  });

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight
        ref={lightRef}
        position={[3, 4, 3]}
        intensity={1.4}
        color="#fff7ed"
        castShadow
      />
      <pointLight position={[-2, 1, 2]} intensity={0.5} color="#22c55e" />
      <FarmTerrain />
      <FieldRows count={9} isReducedMotion={isReducedMotion} />
    </>
  );
};

export default HeroFarmScene;

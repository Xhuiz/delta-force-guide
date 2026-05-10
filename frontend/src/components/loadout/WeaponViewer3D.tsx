"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";

function WeaponModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.003;
    }
  });

  return <primitive ref={ref} object={scene} scale={1} />;
}

function FallbackModel() {
  return (
    <mesh>
      <boxGeometry args={[2, 0.5, 0.5]} />
      <meshStandardMaterial color="#888" />
    </mesh>
  );
}

interface WeaponViewer3DProps {
  modelUrl: string | null;
  fallbackImageUrl: string | null;
}

export default function WeaponViewer3D({ modelUrl, fallbackImageUrl }: WeaponViewer3DProps) {
  if (!modelUrl) {
    if (fallbackImageUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
          <img src={fallbackImageUrl} alt="Weapon" className="max-h-full object-contain" />
        </div>
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg text-gray-400">
        暂无模型
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden bg-gray-900">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Suspense fallback={<FallbackModel />}>
          <WeaponModel url={modelUrl} />
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls enableZoom={true} enablePan={false} minDistance={2} maxDistance={10} />
      </Canvas>
    </div>
  );
}

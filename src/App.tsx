import React, { useRef, useState } from 'react';
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import './App.css';

function Player({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((state, delta) => {
    meshRef.current.rotation.x += delta;
    meshRef.current.rotation.y += delta;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  );
}

function Collectible({ position, onCollect }: { position: [number, number, number], onCollect: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    meshRef.current.rotation.y += delta * 2;
    meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 3) * 0.01;
  });

  return (
    <mesh 
      ref={meshRef} 
      position={position}
      scale={hovered ? 1.2 : 1}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={onCollect}
    >
      <sphereGeometry args={[0.3]} />
      <meshStandardMaterial color="gold" />
    </mesh>
  );
}

function Game() {
  const [score, setScore] = useState(0);
  const [collectibles, setCollectibles] = useState([
    { id: 1, position: [2, 1, 0] as [number, number, number] },
    { id: 2, position: [-2, 1, 2] as [number, number, number] },
    { id: 3, position: [0, 1, -3] as [number, number, number] },
  ]);

  const handleCollect = (id: number) => {
    setCollectibles(prev => prev.filter(c => c.id !== id));
    setScore(prev => prev + 10);
  };

  return (
    <>
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 100, color: 'white', fontSize: '20px' }}>
        Score: {score}
      </div>
      <Canvas camera={{ position: [0, 5, 5], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        
        <Player position={[0, 0, 0]} />
        
        {collectibles.map(collectible => (
          <Collectible 
            key={collectible.id}
            position={collectible.position}
            onCollect={() => handleCollect(collectible.id)}
          />
        ))}
        
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="lightgreen" />
        </mesh>
        
        <Text
          position={[0, 3, -2]}
          fontSize={0.5}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          Simple 3D Game
        </Text>
        
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </>
  );
}

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: 'black' }}>
      <Game />
    </div>
  );
}

export default App;

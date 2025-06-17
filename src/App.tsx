import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import './App.css';

const GRID_SIZE = 10;
const CELL_SIZE = 1;

function GreenTubePlayer({ gridPosition, onMove }: { gridPosition: [number, number], onMove: (pos: [number, number]) => void }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [currentGridPos, setCurrentGridPos] = useState(gridPosition);
  const [worldPosition, setWorldPosition] = useState<[number, number, number]>([gridPosition[0] * CELL_SIZE, 5, gridPosition[1] * CELL_SIZE]);
  const [isFalling, setIsFalling] = useState(true);
  const [fallSpeed, setFallSpeed] = useState(0);

  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFalling) return;
      
      let newGridPos = [...currentGridPos] as [number, number];
      let moved = false;
      
      switch (event.code) {
        case 'KeyW':
          if (currentGridPos[1] > 0) {
            newGridPos[1] -= 1;
            moved = true;
          }
          break;
        case 'KeyS':
          if (currentGridPos[1] < GRID_SIZE - 1) {
            newGridPos[1] += 1;
            moved = true;
          }
          break;
        case 'KeyA':
          if (currentGridPos[0] > 0) {
            newGridPos[0] -= 1;
            moved = true;
          }
          break;
        case 'KeyD':
          if (currentGridPos[0] < GRID_SIZE - 1) {
            newGridPos[0] += 1;
            moved = true;
          }
          break;
      }
      
      if (moved) {
        setCurrentGridPos(newGridPos);
        onMove(newGridPos);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGridPos, isFalling, onMove]);

  useFrame((state, delta) => {
    if (isFalling) {
      const gravity = 8;
      const newFallSpeed = fallSpeed + gravity * delta;
      const newY = worldPosition[1] - newFallSpeed * delta;
      
      if (newY <= 0.5) {
        setWorldPosition([currentGridPos[0] * CELL_SIZE, 0.5, currentGridPos[1] * CELL_SIZE]);
        setIsFalling(false);
        setFallSpeed(0);
      } else {
        setWorldPosition([currentGridPos[0] * CELL_SIZE, newY, currentGridPos[1] * CELL_SIZE]);
        setFallSpeed(newFallSpeed);
      }
    } else {
      const targetX = currentGridPos[0] * CELL_SIZE;
      const targetZ = currentGridPos[1] * CELL_SIZE;
      const currentX = worldPosition[0];
      const currentZ = worldPosition[2];
      
      const speed = 5;
      const newX = currentX + (targetX - currentX) * speed * delta;
      const newZ = currentZ + (targetZ - currentZ) * speed * delta;
      
      setWorldPosition([newX, 0.5, newZ]);
    }
    
    if (meshRef.current) {
      meshRef.current.position.set(worldPosition[0], worldPosition[1], worldPosition[2]);
    }
  });

  return (
    <mesh ref={meshRef} position={worldPosition}>
      <cylinderGeometry args={[0.3, 0.3, 1, 8]} />
      <meshStandardMaterial color="#00ff00" />
    </mesh>
  );
}

function RedObstacle({ gridPosition }: { gridPosition: [number, number] }) {
  const worldX = gridPosition[0] * CELL_SIZE;
  const worldZ = gridPosition[1] * CELL_SIZE;
  
  return (
    <mesh position={[worldX, 0.25, worldZ]}>
      <boxGeometry args={[0.8, 0.5, 0.8]} />
      <meshStandardMaterial color="#ff0000" />
    </mesh>
  );
}

function Grid() {
  const gridLines = [];
  
  for (let i = 0; i <= GRID_SIZE; i++) {
    const pos = (i - GRID_SIZE / 2) * CELL_SIZE + CELL_SIZE / 2;
    
    gridLines.push(
      <mesh key={`h-${i}`} position={[0, 0.01, pos]}>
        <boxGeometry args={[GRID_SIZE * CELL_SIZE, 0.02, 0.05]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    );
    
    gridLines.push(
      <mesh key={`v-${i}`} position={[pos, 0.01, 0]}>
        <boxGeometry args={[0.05, 0.02, GRID_SIZE * CELL_SIZE]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    );
  }
  
  return (
    <>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[GRID_SIZE * CELL_SIZE, 0.1, GRID_SIZE * CELL_SIZE]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      {gridLines}
    </>
  );
}

function Game() {
  const [playerGridPos, setPlayerGridPos] = useState<[number, number]>([5, 5]);
  
  const obstacles = [
    [2, 3], [7, 1], [4, 6], [8, 8], [1, 7], [6, 2], [3, 9], [9, 4]
  ] as [number, number][];

  const handlePlayerMove = (newPos: [number, number]) => {
    setPlayerGridPos(newPos);
  };

  return (
    <>
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 100, color: 'white', fontSize: '20px' }}>
        Grid Game - Use WASD to move
      </div>
      <div style={{ position: 'absolute', top: 50, left: 20, zIndex: 100, color: 'white', fontSize: '16px' }}>
        Position: ({playerGridPos[0]}, {playerGridPos[1]})
      </div>
      <Canvas camera={{ position: [0, 8, 8], fov: 60 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 10]} intensity={0.8} />
        
        <Grid />
        
        <GreenTubePlayer gridPosition={playerGridPos} onMove={handlePlayerMove} />
        
        {obstacles.map((obstaclePos, index) => (
          <RedObstacle key={index} gridPosition={obstaclePos} />
        ))}
        
        <Text
          position={[0, 3, -6]}
          fontSize={0.5}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          Grid Game
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

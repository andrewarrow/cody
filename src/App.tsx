import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import './App.css';

const GRID_SIZE = 10;
const CELL_SIZE = 1;

function FirstPersonPlayer({ gridPosition, onMove, obstacles }: { gridPosition: [number, number], onMove: (pos: [number, number]) => void, obstacles: [number, number][] }) {
  const { camera } = useThree();
  const [currentGridPos, setCurrentGridPos] = useState(gridPosition);
  const [worldPosition, setWorldPosition] = useState<[number, number, number]>([gridPosition[0] * CELL_SIZE, 0.5, gridPosition[1] * CELL_SIZE]);
  const [isFalling, setIsFalling] = useState(false);
  const [fallSpeed, setFallSpeed] = useState(0);


  const isPositionBlocked = (pos: [number, number]) => {
    return obstacles.some(obstacle => obstacle[0] === pos[0] && obstacle[1] === pos[1]);
  };

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
      
      if (moved && !isPositionBlocked(newGridPos)) {
        setCurrentGridPos(newGridPos);
        onMove(newGridPos);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGridPos, isFalling, onMove, obstacles, isPositionBlocked]);

  useFrame((state, delta) => {
    const targetX = currentGridPos[0] * CELL_SIZE;
    const targetZ = currentGridPos[1] * CELL_SIZE;
    const currentX = worldPosition[0];
    const currentZ = worldPosition[2];
    
    const speed = 5;
    const newX = currentX + (targetX - currentX) * speed * delta;
    const newZ = currentZ + (targetZ - currentZ) * speed * delta;
    
    const newPosition: [number, number, number] = [newX, 0.5, newZ];
    setWorldPosition(newPosition);
    
    camera.position.set(newX, 0.5, newZ);
  });

  return null;
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
    <Canvas camera={{ position: [5, 0.5, 5], fov: 75 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 10]} intensity={0.8} />
      
      <Grid />
      
      <FirstPersonPlayer gridPosition={playerGridPos} onMove={handlePlayerMove} obstacles={obstacles} />
      
      {obstacles.map((obstaclePos, index) => (
        <RedObstacle key={index} gridPosition={obstaclePos} />
      ))}
      
    </Canvas>
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

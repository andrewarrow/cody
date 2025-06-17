import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
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
  const [facingDirection, setFacingDirection] = useState(0); // 0=north, 1=east, 2=south, 3=west

  const isPositionBlocked = (pos: [number, number]) => {
    if (pos[0] < 0 || pos[0] >= GRID_SIZE || pos[1] < 0 || pos[1] >= GRID_SIZE) {
      return true;
    }
    return obstacles.some(obstacle => obstacle[0] === pos[0] && obstacle[1] === pos[1]);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFalling) return;
      
      let newGridPos = [...currentGridPos] as [number, number];
      let moved = false;
      
      switch (event.code) {
        case 'ArrowUp': // Move forward in current facing direction
          const forwardDelta = getFacingDirectionDelta(facingDirection);
          newGridPos[0] += forwardDelta[0];
          newGridPos[1] += forwardDelta[1];
          moved = true;
          break;
        case 'ArrowDown': // Move backward from current facing direction
          const backwardDelta = getFacingDirectionDelta(facingDirection);
          newGridPos[0] -= backwardDelta[0];
          newGridPos[1] -= backwardDelta[1];
          moved = true;
          break;
        case 'ArrowLeft': // Turn left 90 degrees
          setFacingDirection(prev => (prev + 3) % 4);
          break;
        case 'ArrowRight': // Turn right 90 degrees
          setFacingDirection(prev => (prev + 1) % 4);
          break;
      }
      
      if (moved && !isPositionBlocked(newGridPos)) {
        setCurrentGridPos(newGridPos);
        onMove(newGridPos);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGridPos, isFalling, onMove, obstacles, facingDirection]);

  const getFacingDirectionDelta = (direction: number): [number, number] => {
    switch (direction) {
      case 0: return [0, -1]; // North (negative Z)
      case 1: return [1, 0];  // East (positive X)
      case 2: return [0, 1];  // South (positive Z)
      case 3: return [-1, 0]; // West (negative X)
      default: return [0, -1];
    }
  };

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
    camera.rotation.y = facingDirection * Math.PI / 2;
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
  const texture = useLoader(THREE.TextureLoader, './texture.png');
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  
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
  
  const wallHeight = 3;
  const wallThickness = 0.2;
  const halfGrid = GRID_SIZE * CELL_SIZE / 2;
  
  return (
    <>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[GRID_SIZE * CELL_SIZE, 0.1, GRID_SIZE * CELL_SIZE]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      {gridLines}
      
      <mesh position={[0, wallHeight/2, halfGrid]}>
        <boxGeometry args={[GRID_SIZE * CELL_SIZE, wallHeight, wallThickness]} />
        <meshStandardMaterial map={texture} />
      </mesh>
      
      <mesh position={[0, wallHeight/2, -halfGrid]}>
        <boxGeometry args={[GRID_SIZE * CELL_SIZE, wallHeight, wallThickness]} />
        <meshStandardMaterial map={texture} />
      </mesh>
      
      <mesh position={[halfGrid, wallHeight/2, 0]}>
        <boxGeometry args={[wallThickness, wallHeight, GRID_SIZE * CELL_SIZE]} />
        <meshStandardMaterial map={texture} />
      </mesh>
      
      <mesh position={[-halfGrid, wallHeight/2, 0]}>
        <boxGeometry args={[wallThickness, wallHeight, GRID_SIZE * CELL_SIZE]} />
        <meshStandardMaterial map={texture} />
      </mesh>
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

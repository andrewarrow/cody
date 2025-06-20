import React, { useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import './App.css';

const GRID_SIZE = 10;
const CELL_SIZE = 1;

function FirstPersonPlayer({ gridPosition, onMove, onRotate, obstacles, onHeightChange }: { gridPosition: [number, number], onMove: (pos: [number, number]) => void, onRotate: (direction: number) => void, obstacles: [number, number][], onHeightChange: (height: number) => void }) {
  const { camera } = useThree();
  const [currentGridPos, setCurrentGridPos] = useState(gridPosition);
  
  const gridToWorld = (gridPos: [number, number]): [number, number, number] => {
    const worldX = (gridPos[0] - (GRID_SIZE - 1) / 2) * CELL_SIZE;
    const worldZ = (gridPos[1] - (GRID_SIZE - 1) / 2) * CELL_SIZE;
    return [worldX, 0.5, worldZ];
  };
  
  const [worldPosition, setWorldPosition] = useState<[number, number, number]>(gridToWorld(gridPosition));
  const [isFalling, setIsFalling] = useState(false);
  const [fallSpeed, setFallSpeed] = useState(0);
  const [facingDirection, setFacingDirection] = useState(0); // 0=north, 1=east, 2=south, 3=west
  const [isJumping, setIsJumping] = useState(false);
  const [jumpVelocity, setJumpVelocity] = useState(0);
  const [playerHeight, setPlayerHeight] = useState(0.5);

  const isPositionBlocked = (pos: [number, number]) => {
    // Only block positions outside the grid boundaries (walls)
    // Allow movement onto mushroom positions since we can land on top of them
    if (pos[0] < 0 || pos[0] >= GRID_SIZE || pos[1] < 0 || pos[1] >= GRID_SIZE) {
      return true;
    }
    return false;
  };

  const isOnMushroom = useCallback((pos: [number, number]) => {
    return obstacles.some(obstacle => obstacle[0] === pos[0] && obstacle[1] === pos[1]);
  }, [obstacles]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Block movement only when falling (not when jumping)
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
          setFacingDirection(prev => {
            const newDirection = (prev + 3) % 4;
            onRotate(newDirection);
            return newDirection;
          });
          break;
        case 'ArrowRight': // Turn right 90 degrees
          setFacingDirection(prev => {
            const newDirection = (prev + 1) % 4;
            onRotate(newDirection);
            return newDirection;
          });
          break;
        case 'Space': // Jump
          const onMushroom = isOnMushroom(currentGridPos);
          const groundLevel = onMushroom ? 1.0 : 0.5;
          if (!isJumping && Math.abs(playerHeight - groundLevel) < 0.1) {
            setIsJumping(true);
            setJumpVelocity(8);
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
  }, [currentGridPos, isFalling, onMove, onRotate, obstacles, facingDirection, isJumping, playerHeight, fallSpeed, isOnMushroom]);

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
    const [targetX, , targetZ] = gridToWorld(currentGridPos);
    const currentX = worldPosition[0];
    const currentZ = worldPosition[2];
    
    const speed = 5;
    const newX = currentX + (targetX - currentX) * speed * delta;
    const newZ = currentZ + (targetZ - currentZ) * speed * delta;
    
    // Determine the correct ground level for current position
    const onMushroom = isOnMushroom(currentGridPos);
    const groundLevel = onMushroom ? 1.0 : 0.5; // Mushroom height is 0.5, so player stands at 1.0
    
    let newHeight = playerHeight;
    
    if (isJumping) {
      // Handle jumping physics
      newHeight += jumpVelocity * delta;
      setJumpVelocity(prev => prev - 20 * delta); // Gravity
      
      // Check if landing
      if (newHeight <= groundLevel) {
        newHeight = groundLevel;
        setIsJumping(false);
        setJumpVelocity(0);
      }
    } else {
      // Handle falling when not jumping (e.g., walking off a mushroom)
      if (newHeight > groundLevel) {
        // Player is above ground level, make them fall
        setIsFalling(true);
        newHeight += fallSpeed * delta;
        setFallSpeed(prev => prev - 20 * delta); // Gravity
        
        // Check if landed
        if (newHeight <= groundLevel) {
          newHeight = groundLevel;
          setIsFalling(false);
          setFallSpeed(0);
        }
      } else if (newHeight < groundLevel) {
        // Player is below ground level, lift them up (e.g., stepping onto mushroom)
        newHeight = groundLevel;
        setIsFalling(false);
        setFallSpeed(0);
      }
    }
    
    setPlayerHeight(newHeight);
    onHeightChange(newHeight);
    const newPosition: [number, number, number] = [newX, newHeight, newZ];
    setWorldPosition(newPosition);
    
    camera.position.set(newX, newHeight, newZ);
    camera.rotation.y = facingDirection * Math.PI / 2;
  });

  return null;
}

function MushroomObstacle({ gridPosition }: { gridPosition: [number, number] }) {
  const texture = useLoader(THREE.TextureLoader, './mush.png');
  const worldX = (gridPosition[0] - (GRID_SIZE - 1) / 2) * CELL_SIZE;
  const worldZ = (gridPosition[1] - (GRID_SIZE - 1) / 2) * CELL_SIZE;
  
  return (
    <mesh position={[worldX, 0.25, worldZ]}>
      <boxGeometry args={[0.8, 0.5, 0.8]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

function Grid({ playerHeight }: { playerHeight: number }) {
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
  
  // Calculate wall offset based on player height to create illusion of jumping higher
  const jumpHeightOffset = Math.max(0, (playerHeight - 0.5) * 0.3);
  const wallY = wallHeight / 2 - jumpHeightOffset;
  
  return (
    <>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[GRID_SIZE * CELL_SIZE, 0.1, GRID_SIZE * CELL_SIZE]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      {gridLines}
      
      <mesh position={[0, wallY, halfGrid]}>
        <boxGeometry args={[GRID_SIZE * CELL_SIZE, wallHeight, wallThickness]} />
        <meshStandardMaterial map={texture} />
      </mesh>
      
      <mesh position={[0, wallY, -halfGrid]}>
        <boxGeometry args={[GRID_SIZE * CELL_SIZE, wallHeight, wallThickness]} />
        <meshStandardMaterial map={texture} />
      </mesh>
      
      <mesh position={[halfGrid, wallY, 0]}>
        <boxGeometry args={[wallThickness, wallHeight, GRID_SIZE * CELL_SIZE]} />
        <meshStandardMaterial map={texture} />
      </mesh>
      
      <mesh position={[-halfGrid, wallY, 0]}>
        <boxGeometry args={[wallThickness, wallHeight, GRID_SIZE * CELL_SIZE]} />
        <meshStandardMaterial map={texture} />
      </mesh>
    </>
  );
}

function MiniMap({ playerPos, playerDirection, obstacles }: { playerPos: [number, number], playerDirection: number, obstacles: [number, number][] }) {
  const cellSize = 15;
  const mapSize = GRID_SIZE * cellSize;
  
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      width: `${mapSize}px`,
      height: `${mapSize}px`,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      border: '2px solid #fff',
      borderRadius: '8px',
      padding: '5px'
    }}>
      <svg width={mapSize} height={mapSize} style={{ display: 'block' }}>
        {/* Grid lines */}
        {Array.from({ length: GRID_SIZE + 1 }, (_, i) => (
          <g key={i}>
            <line
              x1={i * cellSize}
              y1={0}
              x2={i * cellSize}
              y2={mapSize}
              stroke="#333"
              strokeWidth={1}
            />
            <line
              x1={0}
              y1={i * cellSize}
              x2={mapSize}
              y2={i * cellSize}
              stroke="#333"
              strokeWidth={1}
            />
          </g>
        ))}
        
        {/* Walls */}
        <rect x={0} y={0} width={mapSize} height={3} fill="#8B4513" />
        <rect x={0} y={mapSize-3} width={mapSize} height={3} fill="#8B4513" />
        <rect x={0} y={0} width={3} height={mapSize} fill="#8B4513" />
        <rect x={mapSize-3} y={0} width={3} height={mapSize} fill="#8B4513" />
        
        {/* Obstacles */}
        {obstacles.map((obstacle, index) => (
          <rect
            key={index}
            x={obstacle[0] * cellSize + 2}
            y={obstacle[1] * cellSize + 2}
            width={cellSize - 4}
            height={cellSize - 4}
            fill="#ff0000"
          />
        ))}
        
        {/* Player */}
        <g>
          <circle
            cx={playerPos[0] * cellSize + cellSize / 2}
            cy={playerPos[1] * cellSize + cellSize / 2}
            r={6}
            fill="#00ff00"
          />
          {/* Direction indicator */}
          <line
            x1={playerPos[0] * cellSize + cellSize / 2}
            y1={playerPos[1] * cellSize + cellSize / 2}
            x2={playerPos[0] * cellSize + cellSize / 2 + Math.sin(playerDirection * Math.PI / 2) * 10}
            y2={playerPos[1] * cellSize + cellSize / 2 - Math.cos(playerDirection * Math.PI / 2) * 10}
            stroke="#00ff00"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}

function Game() {
  const [playerGridPos, setPlayerGridPos] = useState<[number, number]>([5, 5]);
  const [playerDirection, setPlayerDirection] = useState(0);
  const [playerHeight, setPlayerHeight] = useState(0.5);
  
  const obstacles = [
    [2, 3], [7, 1], [4, 6], [8, 8], [1, 7], [6, 2], [3, 9], [9, 4]
  ] as [number, number][];

  const handlePlayerMove = (newPos: [number, number]) => {
    setPlayerGridPos(newPos);
  };

  const handlePlayerRotate = (direction: number) => {
    setPlayerDirection(direction);
  };

  const handlePlayerHeightChange = (height: number) => {
    setPlayerHeight(height);
  };

  return (
    <>
      <Canvas camera={{ position: [5, 0.5, 5], fov: 75 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 10]} intensity={0.8} />
        
        <Grid playerHeight={playerHeight} />
        
        <FirstPersonPlayer 
          gridPosition={playerGridPos} 
          onMove={handlePlayerMove} 
          onRotate={handlePlayerRotate}
          onHeightChange={handlePlayerHeightChange}
          obstacles={obstacles} 
        />
        
        {obstacles.map((obstaclePos, index) => (
          <MushroomObstacle key={index} gridPosition={obstaclePos} />
        ))}
        
      </Canvas>
      <MiniMap playerPos={playerGridPos} playerDirection={playerDirection} obstacles={obstacles} />
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

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import './App.css';

function Player({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [playerPosition, setPlayerPosition] = useState<[number, number, number]>(position);
  const [velocity, setVelocity] = useState<[number, number, number]>([0, 0, 0]);
  const [isOnGround, setIsOnGround] = useState(true);
  
  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    space: false
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
          keys.current.w = true;
          break;
        case 'KeyA':
          keys.current.a = true;
          break;
        case 'KeyS':
          keys.current.s = true;
          break;
        case 'KeyD':
          keys.current.d = true;
          break;
        case 'Space':
          event.preventDefault();
          keys.current.space = true;
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
          keys.current.w = false;
          break;
        case 'KeyA':
          keys.current.a = false;
          break;
        case 'KeyS':
          keys.current.s = false;
          break;
        case 'KeyD':
          keys.current.d = false;
          break;
        case 'Space':
          keys.current.space = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    const speed = 5;
    const jumpForce = 8;
    const gravity = -20;
    const groundLevel = 0.5;

    let newVelocity = [...velocity] as [number, number, number];
    let newPosition = [...playerPosition] as [number, number, number];

    if (keys.current.w) {
      newPosition[2] -= speed * delta;
    }
    if (keys.current.s) {
      newPosition[2] += speed * delta;
    }
    if (keys.current.a) {
      newPosition[0] -= speed * delta;
    }
    if (keys.current.d) {
      newPosition[0] += speed * delta;
    }

    if (keys.current.space && isOnGround) {
      newVelocity[1] = jumpForce;
      setIsOnGround(false);
    }

    newVelocity[1] += gravity * delta;
    newPosition[1] += newVelocity[1] * delta;

    if (newPosition[1] <= groundLevel) {
      newPosition[1] = groundLevel;
      newVelocity[1] = 0;
      setIsOnGround(true);
    }

    setVelocity(newVelocity);
    setPlayerPosition(newPosition);
    
    if (meshRef.current) {
      meshRef.current.position.set(newPosition[0], newPosition[1], newPosition[2]);
    }
  });

  return (
    <mesh ref={meshRef} position={playerPosition}>
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
          <shaderMaterial
            vertexShader={`
              varying vec3 vWorldPosition;
              void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              varying vec3 vWorldPosition;
              void main() {
                float x = vWorldPosition.x;
                float z = vWorldPosition.z;
                
                // Normalize coordinates to 0-1 range for a 20x20 plane
                float normalizedX = (x + 10.0) / 20.0;
                float normalizedZ = (z + 10.0) / 20.0;
                
                // Create color gradients based on position
                vec3 color1 = vec3(0.8, 0.2, 0.2); // Red
                vec3 color2 = vec3(0.2, 0.8, 0.2); // Green
                vec3 color3 = vec3(0.2, 0.2, 0.8); // Blue
                vec3 color4 = vec3(0.8, 0.8, 0.2); // Yellow
                
                // Mix colors based on x and z coordinates
                vec3 mixX1 = mix(color1, color2, normalizedX);
                vec3 mixX2 = mix(color3, color4, normalizedX);
                vec3 finalColor = mix(mixX1, mixX2, normalizedZ);
                
                gl_FragColor = vec4(finalColor, 1.0);
              }
            `}
          />
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

import React, { useRef, useState, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider, useRevoluteJoint, RapierRigidBody } from '@react-three/rapier';
import { OrbitControls, Stars, Environment, PerspectiveCamera, Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';
import { GameEvent, GameStatus } from '../types';

// Constants rewritten for 3D units
const TABLE_WIDTH = 22;
const TABLE_HEIGHT = 38;
const BALL_RADIUS = 0.5;

interface GameSceneProps {
  status: GameStatus;
  onEvent: (event: GameEvent) => void;
  onScore: (points: number) => void;
  onBallLost: () => void;
}

// --- Materials ---
const neonBlueMaterial = new THREE.MeshStandardMaterial({
  color: "#00ffff",
  emissive: "#00ffff",
  emissiveIntensity: 2,
  roughness: 0.2,
  metalness: 0.8
});

const neonPinkMaterial = new THREE.MeshStandardMaterial({
  color: "#ff00ff",
  emissive: "#ff00ff",
  emissiveIntensity: 2,
  roughness: 0.2,
  metalness: 0.8
});

const floorMaterial = new THREE.MeshStandardMaterial({
  color: "#050505",
  roughness: 0.1,
  metalness: 0.9,
});

// --- Components ---

const Ball = ({ isPlaying, onLost }: { isPlaying: boolean; onLost: () => void }) => {
  const rigidBody = useRef<RapierRigidBody>(null);
  const resetPosition = useMemo(() => new THREE.Vector3(9, 0.5, 14), []);

  useFrame(() => {
    if (!rigidBody.current) return;
    const translation = rigidBody.current.translation();

    // Drain check
    if (translation.z > 20) {
      rigidBody.current.setTranslation(resetPosition, true);
      rigidBody.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rigidBody.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      setTimeout(() => onLost(), 0);
    }
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && rigidBody.current) {
        const pos = rigidBody.current.translation();
        if (pos.x > 7 && pos.z > 10) {
          rigidBody.current.applyImpulse({ x: 0, y: 0, z: -60 }, true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isPlaying) return null;

  return (
    <RigidBody
      ref={rigidBody}
      position={[9, 0.5, 14]}
      colliders="ball"
      restitution={0.7}
      friction={0.1}
      ccd={true}
      canSleep={false}
    >
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
        <meshStandardMaterial color="#ffffff" metalness={1} roughness={0} envMapIntensity={2} />
      </mesh>
      {/* Ball Glow */}
      <pointLight distance={3} intensity={0.8} color="#00ffff" />
    </RigidBody>
  );
};

const Flipper = ({ position, side }: { position: [number, number, number], side: 'left' | 'right' }) => {
  const body = useRef<RapierRigidBody>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const anchor = useRef<RapierRigidBody>(null);
  const sign = side === 'left' ? 1 : -1;
  const [active, setActive] = useState(false);

  useRevoluteJoint(anchor, body, [
    [0, 0, 0],
    [-sign * 1.8, 0, 0],
    [0, 1, 0]
  ]);

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if ((side === 'left' && (e.key === 'ArrowLeft' || e.key === 'a')) ||
        (side === 'right' && (e.key === 'ArrowRight' || e.key === 'd'))) {
        setActive(true);
        body.current?.wakeUp();
        body.current?.applyTorqueImpulse({ x: 0, y: sign * 300, z: 0 }, true);
      }
    };

    const handleUp = (e: KeyboardEvent) => {
      if ((side === 'left' && (e.key === 'ArrowLeft' || e.key === 'a')) ||
        (side === 'right' && (e.key === 'ArrowRight' || e.key === 'd'))) {
        setActive(false);
        body.current?.wakeUp();
        body.current?.applyTorqueImpulse({ x: 0, y: -sign * 200, z: 0 }, true);
      }
    };

    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, [side, sign]);

  return (
    <group position={position}>
      <RigidBody ref={anchor} type="fixed" colliders={false} />
      <RigidBody
        ref={body}
        colliders="hull"
        restitution={0.4}
        friction={0.1}
        density={2.0}
      >
        <mesh ref={mesh}>
          <boxGeometry args={[4, 0.8, 0.5]} />
          <meshStandardMaterial
            color={active ? "#ffaa00" : "#d97706"}
            emissive={active ? "#ffaa00" : "#d97706"}
            emissiveIntensity={active ? 2 : 0.5}
          />
        </mesh>
      </RigidBody>
    </group>
  );
};

const Bumper = ({ position, onHit }: { position: [number, number, number], onHit: () => void }) => {
  const [lit, setLit] = useState(false);

  return (
    <RigidBody
      type="fixed"
      position={position}
      restitution={1.8}
      onCollisionEnter={() => {
        setLit(true);
        onHit();
        setTimeout(() => setLit(false), 150);
      }}
    >
      <mesh>
        <cylinderGeometry args={[1.2, 1.4, 1, 32]} />
        <meshStandardMaterial
          color={lit ? "#ffffff" : "#ef4444"}
          emissive={lit ? "#ffffff" : "#991b1b"}
          emissiveIntensity={lit ? 4 : 1}
          metalness={0.8}
          roughness={0.1}
        />
      </mesh>
      {lit && <pointLight distance={10} intensity={2} color="red" />}
    </RigidBody>
  );
};

const Wall = ({ args, position, rotation = [0, 0, 0], color = "#334155", emissive = false }: any) => (
  <RigidBody type="fixed" position={position} rotation={rotation} restitution={0.5} friction={0}>
    <mesh>
      <boxGeometry args={args} />
      {emissive ? (
        <primitive object={neonBlueMaterial} />
      ) : (
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} transparent opacity={0.3} />
      )}
    </mesh>
  </RigidBody>
);

const PinballTable = ({ onEvent, onScore }: { onEvent: (e: GameEvent) => void, onScore: (s: number) => void }) => {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[TABLE_WIDTH, TABLE_HEIGHT]} />
        <primitive object={floorMaterial} />
      </mesh>

      {/* Grid Pattern on Floor */}
      <gridHelper args={[TABLE_WIDTH, TABLE_WIDTH, 0x00ffff, 0x111111]} position={[0, -0.48, 0]} />

      {/* Outer Walls */}
      <Wall args={[1, 2, TABLE_HEIGHT]} position={[-TABLE_WIDTH / 2 + 0.5, 0.5, 0]} />
      <Wall args={[1, 2, TABLE_HEIGHT]} position={[TABLE_WIDTH / 2 - 0.5, 0.5, 0]} />
      <Wall args={[TABLE_WIDTH, 2, 1]} position={[0, 0.5, -TABLE_HEIGHT / 2 + 0.5]} />

      {/* Plunger Lane Divider */}
      <Wall args={[0.5, 2, TABLE_HEIGHT - 6]} position={[7, 0.5, 2]} />

      {/* Neon Strips */}
      <Wall args={[0.2, 2.1, TABLE_HEIGHT]} position={[-TABLE_WIDTH / 2 + 0.5, 0.5, 0]} emissive={true} />
      <Wall args={[0.2, 2.1, TABLE_HEIGHT]} position={[TABLE_WIDTH / 2 - 0.5, 0.5, 0]} emissive={true} />

      {/* Top Corners */}
      <Wall args={[10, 2, 1]} position={[-6, 0.5, -15]} rotation={[0, Math.PI / 4, 0]} emissive={true} />
      <Wall args={[10, 2, 1]} position={[4, 0.5, -15]} rotation={[0, -Math.PI / 4, 0]} emissive={true} />

      {/* Bumpers */}
      <Bumper position={[0, 0.5, -8]} onHit={() => { onScore(500); onEvent(GameEvent.BUMPER_HIT); }} />
      <Bumper position={[-4, 0.5, -4]} onHit={() => { onScore(300); onEvent(GameEvent.BUMPER_HIT); }} />
      <Bumper position={[3, 0.5, -4]} onHit={() => { onScore(300); onEvent(GameEvent.BUMPER_HIT); }} />

      {/* Ramp/Loop Area (Visual) */}
      <mesh position={[0, 0.1, -12]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2, 2.2, 32]} />
        <primitive object={neonPinkMaterial} />
      </mesh>

      {/* Flippers */}
      <Flipper position={[-3, 0.5, 14]} side="left" />
      <Flipper position={[3, 0.5, 14]} side="right" />

      {/* Slopes to Flippers (Inlanes) */}
      <Wall args={[9, 2, 0.5]} position={[-8, 0.5, 10]} rotation={[0, Math.PI / 5, 0]} />
      <Wall args={[9, 2, 0.5]} position={[6, 0.5, 10]} rotation={[0, -Math.PI / 5, 0]} />

      {/* Triangle Slingshots (simplified as angled walls for now) */}
      <Wall args={[4, 2, 0.5]} position={[-5, 0.5, 8]} rotation={[0, -Math.PI / 6, 0]} emissive={true} />
      <Wall args={[4, 2, 0.5]} position={[5, 0.5, 8]} rotation={[0, Math.PI / 6, 0]} emissive={true} />

    </group>
  );
};

// --- Main Scene ---

const GameScene: React.FC<GameSceneProps> = ({ status, onEvent, onScore, onBallLost }) => {
  return (
    <div className="w-full h-full relative">
      <Canvas shadows dpr={[1, 2]}>
        {/* Camera now looks at the table center */}
        <PerspectiveCamera makeDefault position={[0, 45, 15]} fov={40} onUpdate={c => c.lookAt(0, 0, 0)} />
        <OrbitControls target={[0, 0, 0]} maxPolarAngle={Math.PI / 2} minDistance={20} maxDistance={100} enablePan={false} />

        {/* Atmosphere */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
        <Sparkles count={100} scale={20} size={2} speed={0.4} opacity={0.5} color="#00ffff" />
        <fog attach="fog" args={['#050505', 10, 80]} />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[0, 10, -5]} intensity={50} color="#00ffff" distance={30} decay={2} />
        <pointLight position={[0, 10, 10]} intensity={30} color="#ff00ff" distance={30} decay={2} />
        <spotLight
          position={[0, 50, 10]}
          angle={0.5}
          penumbra={0.5}
          intensity={50}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />

        {/* Physics World */}
        <Suspense fallback={
          <Html center>
            <div className="flex flex-col items-center justify-center pointer-events-none">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <div className="text-cyan-400 font-mono text-xs tracking-widest bg-black/80 px-2 py-1">
                LOADING PHYSICS...
              </div>
            </div>
          </Html>
        }>
          <Physics gravity={[0, -30, 20]} timeStep={1 / 60}>
            <PinballTable onEvent={onEvent} onScore={onScore} />
            <Ball isPlaying={status === GameStatus.PLAYING} onLost={onBallLost} />
            <CuboidCollider args={[100, 1, 100]} position={[0, -2, 0]} />
          </Physics>
        </Suspense>

        <Environment preset="city" blur={0.8} />
      </Canvas>
    </div>
  );
};

export default GameScene;
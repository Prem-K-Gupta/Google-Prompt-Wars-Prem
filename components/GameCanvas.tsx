import React, { useRef, useState, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider, useRevoluteJoint, RapierRigidBody, CylinderCollider } from '@react-three/rapier';
import { OrbitControls, Stars, Environment, PerspectiveCamera, Sparkles, Html, MeshTransmissionMaterial, Float, Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';
import { GameEvent, GameStatus } from '../types';

// Constants
const TABLE_WIDTH = 22;
const TABLE_HEIGHT = 38;
const BALL_RADIUS = 0.5;

export interface PhysicsState {
  gravity: number; // Default -30
  bumperBounce: number; // Default 2.5
  flipperStrength: number; // Default 1.0 (multiplier)
}

interface GameSceneProps {
  status: GameStatus;
  physics: PhysicsState;
  onEvent: (event: GameEvent) => void;
  onScore: (points: number) => void;
  onBallLost: () => void;
}

// --- Materials ---
const neonBlueMaterial = new THREE.MeshStandardMaterial({
  color: "#00ffff",
  emissive: "#00ffff",
  emissiveIntensity: 3,
  toneMapped: false
});

const neonPinkMaterial = new THREE.MeshStandardMaterial({
  color: "#ff00ff",
  emissive: "#ff00ff",
  emissiveIntensity: 3,
  toneMapped: false
});

const connectorMaterial = new THREE.MeshStandardMaterial({
  color: "#1a1a1a",
  metalness: 0.9,
  roughness: 0.1
});

// --- Components ---

const Ball = ({ isPlaying, onLost, resetTrigger }: { isPlaying: boolean; onLost: () => void, resetTrigger: number }) => {
  const rigidBody = useRef<RapierRigidBody>(null);
  const resetPosition = useMemo(() => new THREE.Vector3(9, 0.5, 14), []);

  useEffect(() => {
    if (rigidBody.current) {
      rigidBody.current.setTranslation(resetPosition, true);
      rigidBody.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rigidBody.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
  }, [resetTrigger, resetPosition]);

  useFrame(() => {
    if (!rigidBody.current) return;
    const translation = rigidBody.current.translation();

    // Drain check
    if (translation.z > 22) {
      rigidBody.current.setTranslation(resetPosition, true);
      rigidBody.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rigidBody.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      onLost();
    }
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && rigidBody.current) {
        const pos = rigidBody.current.translation();
        // Only launch if in plunger lane
        if (pos.x > 7 && pos.z > 10) {
          // Add some random variation to the launch for realism
          const power = -60 - Math.random() * 10;
          rigidBody.current.applyImpulse({ x: 0, y: 0, z: power }, true);
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
      name="ball"
    >
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
        <meshStandardMaterial color="#ffffff" metalness={1} roughness={0} />
      </mesh>
      <pointLight distance={3} intensity={0.8} color="#00ffff" />
    </RigidBody>
  );
};

const Flipper = ({ position, side, strengthMultiplier }: { position: [number, number, number], side: 'left' | 'right', strengthMultiplier: number }) => {
  const body = useRef<RapierRigidBody>(null);
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
        body.current?.applyTorqueImpulse({ x: 0, y: sign * 400 * strengthMultiplier, z: 0 }, true); // Stronger impulse
      }
    };

    const handleUp = (e: KeyboardEvent) => {
      if ((side === 'left' && (e.key === 'ArrowLeft' || e.key === 'a')) ||
        (side === 'right' && (e.key === 'ArrowRight' || e.key === 'd'))) {
        setActive(false);
        body.current?.wakeUp();
        body.current?.applyTorqueImpulse({ x: 0, y: -sign * 250 * strengthMultiplier, z: 0 }, true);
      }
    };

    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, [side, sign, strengthMultiplier]);

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
        <mesh>
          <boxGeometry args={[4, 0.8, 0.5]} />
          <meshStandardMaterial
            color={active ? "#ffecd1" : "#d97706"}
            emissive={active ? "#ffaa00" : "#b45309"}
            emissiveIntensity={active ? 3 : 0.5}
            toneMapped={false}
          />
        </mesh>
      </RigidBody>
    </group>
  );
};

const Bumper = ({ position, onHit, bounce }: { position: [number, number, number], onHit: () => void, bounce: number }) => {
  const [lit, setLit] = useState(false);
  const scale = lit ? 1.2 : 1;

  return (
    <RigidBody
      type="fixed"
      position={position}
      restitution={bounce} // Super bouncy
      onCollisionEnter={() => {
        setLit(true);
        onHit();
        setTimeout(() => setLit(false), 100);
      }}
    >
      <mesh scale={[scale, 1, scale]}>
        <cylinderGeometry args={[1.2, 1.4, 1, 32]} />
        <meshStandardMaterial
          color={lit ? "#ffffff" : "#ff0055"}
          emissive={lit ? "#ff0055" : "#550011"}
          emissiveIntensity={lit ? 5 : 1}
          metalness={0.8}
          roughness={0.1}
          toneMapped={false}
        />
      </mesh>
      {lit && <pointLight distance={10} intensity={5} color="#ff0055" />}
    </RigidBody>
  );
};

const Wall = ({ args, position, rotation = [0, 0, 0], visible = true }: any) => (
  <RigidBody type="fixed" position={position} rotation={rotation} restitution={0.5} friction={0}>
    {visible && (
      <mesh>
        <boxGeometry args={args} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} transparent opacity={0.3} />
      </mesh>
    )}
  </RigidBody>
);

// --- Functional Ramp ---
const Ramp = ({ position, rotation }: { position: [number, number, number], rotation: [number, number, number] }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Ramp Floor */}
      <RigidBody type="fixed" colliders="hull" friction={0} restitution={0}>
        <mesh position={[0, 1, 0]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[3, 0.2, 8]} />
          <primitive object={neonBlueMaterial} />
        </mesh>
      </RigidBody>
      {/* Invisible Guide Walls */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[1.6, 1.5, 0]} rotation={[0.2, 0, 0]} visible={false}>
          <boxGeometry args={[0.2, 2, 8]} />
        </mesh>
        <mesh position={[-1.6, 1.5, 0]} rotation={[0.2, 0, 0]} visible={false}>
          <boxGeometry args={[0.2, 2, 8]} />
        </mesh>
      </RigidBody>
    </group>
  )
}

// --- Wormhole (Sensor) ---
const Wormhole = ({ position, onEnter }: { position: [number, number, number], onEnter: () => void }) => {
  return (
    <group position={position}>
      <Float speed={5} rotationIntensity={2} floatIntensity={1}>
        <mesh>
          <torusGeometry args={[1.5, 0.2, 16, 32]} />
          <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={5} toneMapped={false} />
        </mesh>
        <Sparkles count={50} scale={4} size={4} speed={0.4} opacity={1} color="#d8b4fe" />
      </Float>
      <RigidBody type="fixed" sensor onIntersectionEnter={(e) => {
        if (e.other.rigidBodyObject?.name === 'ball') {
          onEnter();
        }
      }}>
        <CylinderCollider args={[0.5, 1.5]} />
      </RigidBody>
      <pointLight distance={5} intensity={5} color="#8b5cf6" />
    </group>
  )
}


const PinballTable = ({ onEvent, onScore, onWormhole, physics }: { onEvent: (e: GameEvent) => void, onScore: (s: number) => void, onWormhole: () => void, physics: PhysicsState }) => {
  return (
    <group>
      {/* --- Premium Glass Floor (The "Board") --- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <roundedPlaneGeometry args={[TABLE_WIDTH, TABLE_HEIGHT, 1]} />
        <MeshTransmissionMaterial
          backside
          backsideThickness={5}
          thickness={2}
          chromaticAberration={0.05}
          anisotropy={0.5}
          distortion={0.5}
          distortionScale={0.5}
          temporalDistortion={0.5}
          ior={1.5}
          color="#050505"
          background={new THREE.Color("#050505")}
        />
      </mesh>

      {/* Physics Floor (Invisible) */}
      <RigidBody type="fixed" position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]} friction={0.1}>
        <boxGeometry args={[TABLE_WIDTH, TABLE_HEIGHT, 1]} />
        <meshBasicMaterial visible={false} />
      </RigidBody>


      {/* --- Walls & Structures --- */}
      {/* Outer Walls */}
      <Wall args={[1, 3, TABLE_HEIGHT]} position={[-TABLE_WIDTH / 2 + 0.5, 1.5, 0]} visible={false} />
      <Wall args={[1, 3, TABLE_HEIGHT]} position={[TABLE_WIDTH / 2 - 0.5, 1.5, 0]} visible={false} />
      <Wall args={[TABLE_WIDTH, 3, 1]} position={[0, 1.5, -TABLE_HEIGHT / 2 + 0.5]} visible={false} />

      {/* Plunger Lane */}
      <Wall args={[0.5, 2, TABLE_HEIGHT - 6]} position={[7, 0.5, 2]} />

      {/* Visual Neon Borders (Non-Physics) */}
      <mesh position={[-TABLE_WIDTH / 2 + 0.5, 0.5, 0]}>
        <boxGeometry args={[0.2, 1, TABLE_HEIGHT]} />
        <primitive object={neonBlueMaterial} />
      </mesh>
      <mesh position={[TABLE_WIDTH / 2 - 0.5, 0.5, 0]}>
        <boxGeometry args={[0.2, 1, TABLE_HEIGHT]} />
        <primitive object={neonBlueMaterial} />
      </mesh>
      <mesh position={[0, 0.5, -TABLE_HEIGHT / 2 + 0.5]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.2, 1, TABLE_WIDTH]} />
        <primitive object={neonBlueMaterial} />
      </mesh>


      {/* --- Interactive Elements --- */}

      {/* Bumpers */}
      <Bumper position={[0, 0.5, -8]} onHit={() => { onScore(500); onEvent(GameEvent.BUMPER_HIT); }} bounce={physics.bumperBounce} />
      <Bumper position={[-4, 0.5, -4]} onHit={() => { onScore(300); onEvent(GameEvent.BUMPER_HIT); }} bounce={physics.bumperBounce} />
      <Bumper position={[3, 0.5, -4]} onHit={() => { onScore(300); onEvent(GameEvent.BUMPER_HIT); }} bounce={physics.bumperBounce} />

      {/* Ramp (Left Side) */}
      <Ramp position={[-7, 0, -5]} rotation={[0, 0.2, 0]} />

      {/* Wormhole (Top Right) */}
      <Wormhole position={[6, 1, -12]} onEnter={onWormhole} />

      {/* Flippers */}
      <Flipper position={[-3, 0.5, 14]} side="left" strengthMultiplier={physics.flipperStrength} />
      <Flipper position={[3, 0.5, 14]} side="right" strengthMultiplier={physics.flipperStrength} />

      {/* Inlanes/Slingshots */}
      <Wall args={[9, 2, 0.5]} position={[-8, 0.5, 10]} rotation={[0, Math.PI / 5, 0]} />
      <Wall args={[9, 2, 0.5]} position={[6, 0.5, 10]} rotation={[0, -Math.PI / 5, 0]} />

      {/* Neon Slingshot Accents */}
      <mesh position={[-5, 0.5, 8]} rotation={[0, -Math.PI / 6, 0]}>
        <boxGeometry args={[4, 0.5, 0.2]} />
        <primitive object={neonPinkMaterial} />
      </mesh>
      <mesh position={[5, 0.5, 8]} rotation={[0, Math.PI / 6, 0]}>
        <boxGeometry args={[4, 0.5, 0.2]} />
        <primitive object={neonPinkMaterial} />
      </mesh>

    </group>
  );
};

// --- Main Scene ---

const GameScene: React.FC<GameSceneProps> = ({ status, physics, onEvent, onScore, onBallLost }) => {
  // Wormhole logic: Teleport ball to plunger lane or somewhere chaotic
  const [wormholeTrigger, setWormholeTrigger] = useState(0);

  const handleWormhole = () => {
    onScore(5000);
    onEvent(GameEvent.RAMP_SHOT); // Reuse event for now to trigger audio
    setWormholeTrigger(prev => prev + 1); // Triggers ball reset logic
  }

  return (
    <div className="w-full h-full relative bg-black">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, stencil: false, alpha: false }}>
        {/* Camera Setup */}
        <PerspectiveCamera makeDefault position={[0, 45, 25]} fov={35} onUpdate={c => c.lookAt(0, -5, 0)} />
        {/* <OrbitControls target={[0, 0, 0]} maxPolarAngle={Math.PI / 2} minDistance={20} maxDistance={100} enablePan={false} /> */}

        {/* --- Post Processing / Environment --- */}
        <color attach="background" args={['#000000']} />

        {/* Volumetric-like Fog */}
        <fog attach="fog" args={['#050505', 20, 100]} />

        {/* Environment Map for Glass Reflections */}
        <Environment preset="city" blur={1} />

        {/* Stars / Particles */}
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
        <Sparkles count={200} scale={30} size={3} speed={0.4} opacity={0.4} color="#00ffff" />

        {/* --- Dynamic Lighting --- */}
        <ambientLight intensity={0.2} />

        {/* Main Table Light */}
        <spotLight
          position={[0, 50, 10]}
          angle={0.4}
          penumbra={1}
          intensity={40}
          castShadow
          shadow-mapSize={[2048, 2048]}
          color="#a5f3fc"
        />

        {/* Cyberpunk Accents */}
        <pointLight position={[-10, 10, -10]} intensity={20} color="#d946ef" distance={40} decay={2} />
        <pointLight position={[10, 10, 10]} intensity={20} color="#06b6d4" distance={40} decay={2} />


        {/* --- Physics World --- */}
        <Suspense fallback={null}>
          <Physics gravity={[0, physics.gravity, 0]} timeStep={1 / 60}>
            <PinballTable onEvent={onEvent} onScore={onScore} onWormhole={handleWormhole} physics={physics} />
            <Ball isPlaying={status === GameStatus.PLAYING} onLost={onBallLost} resetTrigger={wormholeTrigger} />
            {/* Catch-all Floor */}
            <CuboidCollider args={[100, 1, 100]} position={[0, -5, 0]} sensor onIntersectionEnter={onBallLost} />
          </Physics>
        </Suspense>

      </Canvas>
    </div>
  );
};

// Polyfill for roundedPlaneGeometry if needed, or just use regular plane
extend({ RoundedPlaneGeometry: THREE.PlaneGeometry });

export default GameScene;
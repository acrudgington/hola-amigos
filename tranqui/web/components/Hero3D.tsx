"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Lightformer, Sparkles } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/* ---------- Ocean: displaced plane with a sun-glint shader ---------- */
const oceanVertex = /* glsl */ `
  uniform float uTime;
  varying float vElev;
  varying vec3 vWorld;
  float wave(vec2 p, vec2 dir, float freq, float speed, float amp) {
    return sin(dot(p, dir) * freq + uTime * speed) * amp;
  }
  void main() {
    vec3 p = position;
    float e = wave(p.xy, vec2(1.0, 0.3), 0.35, 0.9, 0.22)
            + wave(p.xy, vec2(-0.4, 1.0), 0.6, 1.3, 0.12)
            + wave(p.xy, vec2(0.7, -0.8), 1.4, 1.9, 0.05);
    p.z += e;
    vElev = e;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const oceanFragment = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSun;
  varying float vElev;
  varying vec3 vWorld;
  void main() {
    float depth = smoothstep(-30.0, 4.0, vWorld.z);
    vec3 col = mix(uDeep, uShallow, depth * 0.55 + vElev * 0.9);
    // sun glint path down the middle of the screen
    float path = exp(-pow(vWorld.x * 0.22, 2.0)) * smoothstep(-40.0, 2.0, vWorld.z);
    float sparkle = smoothstep(0.12, 0.3, vElev) * path;
    col += uSun * (path * 0.35 + sparkle * 1.4);
    float fog = smoothstep(-45.0, -8.0, vWorld.z);
    col = mix(vec3(0.42, 0.22, 0.36), col, fog);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Ocean({ lite }: { lite: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color("#0a1238") },
      uShallow: { value: new THREE.Color("#1f4f8f") },
      uSun: { value: new THREE.Color("#ffb45e") },
    }),
    [],
  );
  useFrame((_, dt) => { if (mat.current) mat.current.uniforms.uTime.value += dt; });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, -18]}>
      <planeGeometry args={[120, 60, lite ? 90 : 220, lite ? 45 : 110]} />
      <shaderMaterial ref={mat} vertexShader={oceanVertex} fragmentShader={oceanFragment} uniforms={uniforms} />
    </mesh>
  );
}

/* ---------- Sun: gradient disc with scanline cut-outs + additive halo ---------- */
const sunFragment = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vec2 c = vUv - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float y = vUv.y;
    // retro horizontal bands that thicken toward the bottom
    float band = step(0.5, fract((y + uTime * 0.02) * 14.0)) ;
    float cut = (y < 0.45) ? band * smoothstep(0.45, 0.0, y) : 0.0;
    if (cut > 0.35) discard;
    vec3 top = vec3(1.0, 0.86, 0.42);
    vec3 bottom = vec3(1.0, 0.35, 0.45);
    gl_FragColor = vec4(mix(bottom, top, smoothstep(0.0, 1.0, y)), 1.0);
  }
`;
const haloFragment = /* glsl */ `
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5);
    float a = pow(smoothstep(0.5, 0.0, d), 2.4);
    gl_FragColor = vec4(vec3(1.0, 0.55, 0.38) * a, a);
  }
`;
const basicVertex = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

function Sun({ lite }: { lite: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((_, dt) => { if (mat.current) mat.current.uniforms.uTime.value += dt; });
  return (
    <group position={lite ? [0, -0.4, -40] : [0, 2.2, -40]} scale={lite ? 0.7 : 1}>
      <mesh scale={34}>
        <planeGeometry />
        <shaderMaterial vertexShader={basicVertex} fragmentShader={haloFragment} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh scale={13} position={[0, 0, 0.5]}>
        <planeGeometry />
        <shaderMaterial ref={mat} vertexShader={basicVertex} fragmentShader={sunFragment} uniforms={uniforms} />
      </mesh>
    </group>
  );
}

/* ---------- Floating glass "devices": the things we protect ---------- */
function Glass({ position, geometry, scale = 1, speed = 1, lite = false }: { position: [number, number, number]; geometry: "ico" | "torus" | "box"; scale?: number; speed?: number; lite?: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.x += dt * 0.15 * speed;
    ref.current.rotation.y += dt * 0.22 * speed;
  });
  return (
    <Float speed={1.4 * speed} rotationIntensity={0.4} floatIntensity={1.2}>
      <mesh ref={ref} position={position} scale={scale}>
        {geometry === "ico" && <icosahedronGeometry args={[1, 0]} />}
        {geometry === "torus" && <torusGeometry args={[0.8, 0.32, 32, 96]} />}
        {geometry === "box" && <boxGeometry args={[1.5, 1, 0.12]} />}
        {lite ? (
          <meshStandardMaterial color="#ffd2b8" metalness={0.6} roughness={0.15} emissive="#5a1f4a" emissiveIntensity={0.4} />
        ) : (
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={1}
          thickness={1.2}
          roughness={0.08}
          ior={1.45}
          iridescence={1}
          iridescenceIOR={1.3}
          clearcoat={1}
          attenuationColor="#ffb08a"
          attenuationDistance={2.5}
        />
        )}
      </mesh>
    </Float>
  );
}

function Rig() {
  const { camera, pointer } = useThree();
  useFrame(() => {
    camera.position.x += (pointer.x * 0.9 - camera.position.x) * 0.03;
    camera.position.y += (1.1 + pointer.y * 0.4 - camera.position.y) * 0.03;
    camera.lookAt(0, 0.6, -10);
  });
  return null;
}

export default function Hero3D() {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Phones and small tablets get a lighter scene: fewer ocean vertices, no transmission pass, lower DPR.
  const lite = typeof window !== "undefined" && window.innerWidth < 900;
  return (
    <Canvas
      camera={{ position: [0, 1.1, 6], fov: 50 }}
      dpr={lite ? [1, 1.25] : [1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={reduced ? "demand" : "always"}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[0, 3, -10]} intensity={3} color="#ffb45e" />
      <directionalLight position={[-5, 5, 5]} intensity={1.2} color="#8fb8ff" />
      <Sun lite={lite} />
      <Ocean lite={lite} />
      <Glass lite={lite} position={lite ? [-2.2, 2.6, -3] : [-5.4, 1.9, -3]} geometry="ico" scale={lite ? 0.45 : 0.7} />
      <Glass lite={lite} position={lite ? [2.3, -0.4, -2] : [5.6, 2.4, -4.5]} geometry="torus" scale={lite ? 0.45 : 0.75} speed={0.8} />
      {!lite && <Glass position={[-3.2, -0.5, -0.5]} geometry="ico" scale={0.32} speed={1.4} />}
      <Sparkles count={70} scale={[18, 6, 10]} position={[0, 3, -8]} size={2.2} speed={0.3} color="#ffd9a0" opacity={0.7} />
      {/* Local, procedural environment for glass reflections (no HDR download). */}
      <Environment resolution={256}>
        <Lightformer form="circle" intensity={6} color="#ffb45e" position={[0, 2, -12]} scale={8} />
        <Lightformer form="rect" intensity={2} color="#ff6f91" position={[-8, 4, -4]} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={2} color="#38e1c7" position={[8, 2, 2]} scale={[5, 3, 1]} />
        <Lightformer form="ring" intensity={1.5} color="#ffffff" position={[0, 8, 4]} scale={6} />
      </Environment>
      <Rig />
    </Canvas>
  );
}

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface NeuralShaderProps {
  className?: string;
}

/**
 * Living neural information network — flowing particles + connections.
 * Represents document intelligence: information flowing into understanding.
 * Falls back to CSS gradient if WebGL unavailable. Respects prefers-reduced-motion.
 */
export function NeuralShader({ className }: NeuralShaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    let width = container.clientWidth;
    let height = container.clientHeight;
    if (width === 0) width = window.innerWidth;
    if (height === 0) height = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 60;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Uniforms shared across all passes
    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uResolution: { value: new THREE.Vector2(width, height) },
    };

    // --- Background gradient plane ---
    const bgGeo = new THREE.PlaneGeometry(2, 2);
    const bgMat = new THREE.ShaderMaterial({
      uniforms,
      depthWrite: false,
      depthTest: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform vec2 uResolution;

        // Hash + noise
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0,0.0)), f.x),
                     mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), f.x), f.y);
        }
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec2 uv = vUv;
          vec2 p = uv * 3.0 - 1.5;
          p.x *= uResolution.x / uResolution.y;

          float t = uTime * 0.08;

          // Layered flow field
          float n1 = fbm(p + t);
          float n2 = fbm(p * 1.5 - t * 1.3 + n1);
          float n3 = fbm(p * 0.6 + n2 * 0.5 - t * 0.5);

          // Deep near-black base
          vec3 base = vec3(0.015, 0.022, 0.035);

          // Subtle blue/cyan glow following flow
          vec3 col = base;
          col += vec3(0.05, 0.18, 0.35) * smoothstep(0.4, 0.85, n2) * 0.55;
          col += vec3(0.02, 0.22, 0.30) * smoothstep(0.3, 0.9, n3) * 0.45;
          col += vec3(0.08, 0.12, 0.28) * smoothstep(0.5, 1.0, n1) * 0.35;

          // Mouse glow
          vec2 mp = uMouse * 2.0 - 1.0;
          mp.x *= uResolution.x / uResolution.y;
          float md = distance(p * 0.5, mp * 0.5);
          col += vec3(0.06, 0.16, 0.28) * smoothstep(0.8, 0.0, md) * 0.5;

          // Vignette
          float vig = smoothstep(1.4, 0.3, length(uv - 0.5));
          col *= 0.45 + 0.55 * vig;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const bgMesh = new THREE.Mesh(bgGeo, bgMat);
    scene.add(bgMesh);

    // --- Neural network particles ---
    const PARTICLE_COUNT = 280;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const seeds = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 70;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      velocities[i * 3] = (Math.random() - 0.5) * 0.04;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.04;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
      seeds[i] = Math.random();
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

    const particleMat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute float aSeed;
        varying float vSeed;
        uniform float uTime;
        void main() {
          vSeed = aSeed;
          vec3 pos = position;
          pos.x += sin(uTime * 0.5 + aSeed * 6.28) * 1.5;
          pos.y += cos(uTime * 0.4 + aSeed * 6.28) * 1.2;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (1.5 + aSeed * 2.5) * (180.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vSeed;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d);
          vec3 col = mix(vec3(0.22, 0.74, 0.97), vec3(0.13, 0.83, 0.93), vSeed);
          gl_FragColor = vec4(col, alpha * (0.5 + vSeed * 0.5));
        }
      `,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // --- Connection lines between near particles ---
    const maxLines = PARTICLE_COUNT * 4;
    const linePositions = new Float32Array(maxLines * 2 * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    // Mouse tracking
    const targetMouse = new THREE.Vector2(0.5, 0.5);
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      targetMouse.x = (e.clientX - rect.left) / rect.width;
      targetMouse.y = 1 - (e.clientY - rect.top) / rect.height;
    };
    window.addEventListener('mousemove', onMouseMove);

    // Resize
    const onResize = () => {
      let w = container.clientWidth;
      let h = container.clientHeight;
      if (w === 0) w = window.innerWidth;
      if (h === 0) h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      uniforms.uResolution.value.set(w, h);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      uniforms.uTime.value = elapsed;
      uniforms.uMouse.value.lerp(targetMouse, 0.04);

      // Update particle positions
      const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      const pos = posAttr.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        pos[i * 3] += velocities[i * 3];
        pos[i * 3 + 1] += velocities[i * 3 + 1];
        pos[i * 3 + 2] += velocities[i * 3 + 2];
        // Wrap
        if (pos[i * 3] > 60) pos[i * 3] = -60;
        if (pos[i * 3] < -60) pos[i * 3] = 60;
        if (pos[i * 3 + 1] > 35) pos[i * 3 + 1] = -35;
        if (pos[i * 3 + 1] < -35) pos[i * 3 + 1] = 35;
      }
      posAttr.needsUpdate = true;

      // Build connections
      const linePos = lineGeo.getAttribute('position') as THREE.BufferAttribute;
      const lp = linePos.array as Float32Array;
      const MAX_DIST = 12;
      let li = 0;
      for (let i = 0; i < PARTICLE_COUNT && li < maxLines * 2; i++) {
        const ix = pos[i * 3], iy = pos[i * 3 + 1], iz = pos[i * 3 + 2];
        for (let j = i + 1; j < PARTICLE_COUNT && li < maxLines * 2; j++) {
          const dx = ix - pos[j * 3];
          const dy = iy - pos[j * 3 + 1];
          const dz = iz - pos[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < MAX_DIST) {
            lp[li * 3] = ix;
            lp[li * 3 + 1] = iy;
            lp[li * 3 + 2] = iz;
            lp[(li + 1) * 3] = pos[j * 3];
            lp[(li + 1) * 3 + 1] = pos[j * 3 + 1];
            lp[(li + 1) * 3 + 2] = pos[j * 3 + 2];
            li += 2;
          }
        }
      }
      // Zero out remaining
      for (let k = li; k < maxLines * 2; k++) {
        lp[k * 3] = 0; lp[k * 3 + 1] = 0; lp[k * 3 + 2] = 0;
      }
      linePos.needsUpdate = true;
      lineGeo.setDrawRange(0, li);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      bgGeo.dispose();
      bgMat.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      aria-hidden="true"
    >
      {/* CSS fallback shown only if WebGL doesn't render */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#03060d] via-[#040810] to-[#020409]" />
      <div className="absolute inset-0 -z-10 grid-glow opacity-30" />
    </div>
  );
}

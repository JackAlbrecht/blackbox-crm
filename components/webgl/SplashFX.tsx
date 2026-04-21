'use client';

import { useEffect, useRef } from 'react';

/**
 * Blackbox splash WebGL FX — ported from the marketing site.
 * Cell-noise dot mask + cyan scan line + subtle bloom, purple/cyan palette.
 * Runs as a full-bleed background layer.
 */
export function SplashFX() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return;

    let destroyed = false;
    let stop: (() => void) | null = null;

    (async () => {
      const THREE = await import('three');
      const { EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js');
      const { RenderPass } = await import('three/addons/postprocessing/RenderPass.js');
      const { UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js');
      const { OutputPass } = await import('three/addons/postprocessing/OutputPass.js');
      if (destroyed) return;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const uniforms = {
        uTime: { value: 0 },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uProgress: { value: 0 },
        uScan: { value: 0 },
        uRes: {
          value: new THREE.Vector2(
            canvas.clientWidth || window.innerWidth,
            canvas.clientHeight || window.innerHeight,
          ),
        },
        uReveal: { value: 0 },
      };

      const material = new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          precision highp float;
          uniform float uTime;
          uniform vec2 uPointer;
          uniform float uProgress;
          uniform float uScan;
          uniform vec2 uRes;
          uniform float uReveal;
          varying vec2 vUv;

          vec2 hash2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return fract(sin(p)*43758.5453123);}
          float cellNoise(vec2 p){vec2 ip=floor(p);vec2 fp=fract(p);float d=1.0;for(int j=-1;j<=1;j++){for(int i=-1;i<=1;i++){vec2 g=vec2(float(i),float(j));vec2 o=hash2(ip+g);vec2 r=g+o-fp;d=min(d,dot(r,r));}}return sqrt(d);}
          vec3 screen(vec3 a, vec3 b){return 1.0 - (1.0-a)*(1.0-b);}

          void main(){
            vec2 uv = vUv;
            float aspect = uRes.x / max(uRes.y, 1.0);
            vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

            // Radial falloff so dots cluster toward the center
            float r = length(p);
            float falloff = smoothstep(0.9, 0.2, r);

            // Cell-noise dot field
            float tiling = 110.0;
            vec2 t = mod(uv * tiling, 2.0) - 1.0;
            float brightness = cellNoise(uv * tiling * 0.5);
            float dot = smoothstep(0.5, 0.48, length(t)) * brightness;

            // Sweep band moving top to bottom
            float band = 1.0 - smoothstep(0.0, 0.05, abs(uv.y - uProgress));

            vec3 purple = vec3(3.0, 0.8, 5.5);
            vec3 cyan = vec3(0.6, 3.4, 3.9);
            vec3 maskColor = mix(purple, cyan, 0.35) * dot * (0.5 + band * 0.5) * falloff;

            // Subtle horizontal scan
            float scanLine = smoothstep(0.0, 0.035, abs(uv.y - uScan));
            vec3 scanTint = vec3(0.13, 0.83, 0.93) * (1.0 - scanLine) * 0.35;

            vec3 col = maskColor + scanTint;
            float alpha = clamp(max(dot * 0.6, (1.0 - scanLine) * 0.22), 0.0, 1.0);
            col *= uReveal;
            alpha *= uReveal;
            gl_FragColor = vec4(col, alpha);
          }
        `,
      });

      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      scene.add(quad);

      const composer = new EffectComposer(renderer);
      composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      composer.setSize(uniforms.uRes.value.x, uniforms.uRes.value.y);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(uniforms.uRes.value.x, uniforms.uRes.value.y),
        0.85, 0.4, 0.2,
      );
      composer.addPass(bloom);
      composer.addPass(new OutputPass());

      const onMove = (e: PointerEvent) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -((e.clientY / window.innerHeight) * 2 - 1);
        uniforms.uPointer.value.lerp(new THREE.Vector2(x, y), 1.0);
      };
      window.addEventListener('pointermove', onMove, { passive: true });

      const resize = () => {
        const w = canvas.clientWidth || window.innerWidth;
        const h = canvas.clientHeight || window.innerHeight;
        renderer.setSize(w, h, false);
        composer.setSize(w, h);
        bloom.setSize(w, h);
        uniforms.uRes.value.set(w, h);
      };
      window.addEventListener('resize', resize);
      resize();

      // Fade in
      const start = performance.now();
      const fade = () => {
        const t = Math.min(1, (performance.now() - start) / 900);
        uniforms.uReveal.value = t * t * (3 - 2 * t);
        if (t < 1 && !destroyed) requestAnimationFrame(fade);
      };
      fade();

      const clock = new THREE.Clock();
      let raf = 0;
      let running = true;
      const tick = () => {
        if (!running || destroyed) return;
        const time = clock.getElapsedTime();
        uniforms.uTime.value = time;
        const wave = Math.sin(time * 0.5) * 0.5 + 0.5;
        uniforms.uProgress.value = wave;
        uniforms.uScan.value = (time * 0.12) % 1;
        composer.render();
        raf = requestAnimationFrame(tick);
      };
      tick();

      const onVis = () => {
        if (document.hidden) { running = false; cancelAnimationFrame(raf); }
        else if (!running) { running = true; clock.start(); tick(); }
      };
      document.addEventListener('visibilitychange', onVis);

      stop = () => {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', onVis);
        renderer.dispose();
      };
    })();

    return () => {
      destroyed = true;
      if (stop) stop();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10 h-screen w-screen"
      aria-hidden
    />
  );
}

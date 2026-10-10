import * as THREE from "three";

/**
 * HarvestWindow hero scene — a real-time, GPU-instanced wheat field at dusk
 * with a glowing "harvest window" arch on the horizon.
 *
 *  · ~15k instanced stalks animated entirely in the vertex shader (wind + gusts)
 *  · the pointer parts the wheat (raycast onto the ear plane)
 *  · scroll progress flies the camera across the field and through the window
 *  · rendering pauses when off-screen / tab hidden; adapts pixel ratio on slow GPUs
 */

export interface WheatFieldOptions {
  container: HTMLElement;
  getProgress?: () => number;
  reducedMotion?: boolean;
  onReady?: () => void;
}

function hex3(hex: string): THREE.Vector3 {
  const n = parseInt(hex.replace("#", ""), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const PALETTE = {
  skyTop: hex3("#020B06"),
  skyMid: hex3("#0B2416"),
  horizon: hex3("#5A3F19"),
  sun: hex3("#FFC266"),
  soil: hex3("#090F07"),
  stalkBase: hex3("#0A1309"),
  stalk: hex3("#4A4619"),
  ear: hex3("#D69E3C"),
  earGreen: hex3("#6C8C33"),
  rim: hex3("#FFD68C"),
  gold: hex3("#F2B54B"),
  dust: hex3("#FFE0A3"),
  star: hex3("#DCE9DD"),
};

/* ----------------------------------------------------------------- GLSL */

const WIND_CHUNK = /* glsl */ `
uniform float uTime;
uniform float uWind;
uniform vec3 uPointer;

vec3 applyWind(vec3 world, float h, float height, float phase) {
  float t = uTime;
  float wave = sin(world.x * 0.32 + t * 1.15) * 0.55
             + sin(world.z * 0.21 - t * 0.85 + phase * 2.0) * 0.45;
  float gust = smoothstep(-0.2, 1.0, sin(world.x * 0.08 + world.z * 0.05 - t * 0.6));
  float sway = (wave * (0.16 + gust * 0.24) + sin(t * 2.4 + phase * 11.0) * 0.035) * uWind;
  float bend = h * h;
  world.x += sway * bend * height;
  world.z += sway * 0.35 * bend * height;

  vec2 d = world.xz - uPointer.xy;
  float dist = length(d);
  float push = (1.0 - smoothstep(0.0, 1.9, dist)) * uPointer.z * bend * height;
  world.xz += (d / max(dist, 0.0001)) * push * 0.8;
  world.y -= push * 0.28;
  return world;
}
`;

const BLADE_VERT = /* glsl */ `
attribute vec3 aOffset;
attribute vec4 aParams;
varying float vH;
varying float vRipe;
varying float vDepth;
varying vec3 vWorld;
${WIND_CHUNK}
void main() {
  vec3 p = position;
  float h = clamp(p.y, 0.0, 1.0);
  float ear = smoothstep(0.6, 0.72, h) * (1.0 - smoothstep(0.92, 1.0, h));
  float width = mix(0.26, 1.0, ear);
  width *= 1.0 - smoothstep(0.96, 1.0, h) * 0.85;
  p.x *= width;
  float height = aParams.x;
  p.y *= height;
  float a = aParams.y * 6.28318;
  float c = cos(a);
  float s = sin(a);
  p.xz = vec2(c * p.x - s * p.z, s * p.x + c * p.z);
  vec3 world = applyWind(p + aOffset, h, height, aParams.z);
  vH = h;
  vRipe = aParams.w;
  vWorld = world;
  vec4 mv = viewMatrix * vec4(world, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const BLADE_FRAG = /* glsl */ `
uniform vec3 uStalkBase;
uniform vec3 uStalk;
uniform vec3 uEar;
uniform vec3 uEarGreen;
uniform vec3 uRim;
uniform vec3 uFog;
uniform vec3 uGold;
uniform vec3 uArch;
uniform float uGlow;
uniform float uFogNear;
uniform float uFogFar;
varying float vH;
varying float vRipe;
varying float vDepth;
varying vec3 vWorld;
void main() {
  float ear = smoothstep(0.56, 0.72, vH);
  vec3 stalk = mix(uStalkBase, uStalk, smoothstep(0.0, 0.62, vH));
  vec3 earCol = mix(uEar, uEarGreen, vRipe);
  vec3 col = mix(stalk, earCol, ear);
  col += uRim * pow(vH, 5.0) * 0.38;
  float dArch = distance(vWorld.xz, uArch.xz);
  float spill = exp(-dArch * 0.3) * uGlow;
  col += uGold * spill * (0.18 + ear * 0.85) * smoothstep(0.25, 1.0, vH);
  float fog = smoothstep(uFogNear, uFogFar, vDepth);
  col = mix(col, uFog, fog);
  gl_FragColor = vec4(col, 1.0);
}
`;

const GROUND_VERT = /* glsl */ `
varying float vDepth;
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mv = viewMatrix * wp;
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const GROUND_FRAG = /* glsl */ `
uniform vec3 uSoil;
uniform vec3 uFog;
uniform vec3 uGold;
uniform vec3 uArch;
uniform float uGlow;
uniform float uFogNear;
uniform float uFogFar;
varying float vDepth;
varying vec3 vWorld;
void main() {
  vec3 col = uSoil;
  float d = distance(vWorld.xz, uArch.xz);
  col += uGold * exp(-d * 0.45) * 0.25 * uGlow;
  col = mix(col, uFog, smoothstep(uFogNear, uFogFar, vDepth));
  gl_FragColor = vec4(col, 1.0);
}
`;

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = wp.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uSun;
uniform vec3 uSunDir;
uniform float uGlow;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uMid, smoothstep(-0.02, 0.2, h));
  col = mix(col, uTop, smoothstep(0.2, 0.7, h));
  float s = max(dot(d, normalize(uSunDir)), 0.0);
  float sunAmt = pow(s, 28.0) * 0.9 + pow(s, 6.0) * 0.22 + pow(s, 2.0) * 0.05;
  col += uSun * sunAmt * (0.45 + 0.55 * uGlow);
  col += uSun * 0.1 * exp(-abs(h) * 24.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

const BASIC_VERT = /* glsl */ `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const ARCH_CORE_FRAG = /* glsl */ `
uniform vec3 uGold;
uniform float uGlow;
void main() {
  vec3 hot = mix(uGold, vec3(1.0, 0.96, 0.84), 0.6);
  gl_FragColor = vec4(hot * (0.25 + 0.95 * uGlow), 1.0);
}
`;

const GLOW_VERT = /* glsl */ `
varying float vFacing;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normal);
  vec3 v = normalize(-mv.xyz);
  vFacing = abs(dot(n, v));
  gl_Position = projectionMatrix * mv;
}
`;

const GLOW_FRAG = /* glsl */ `
uniform vec3 uGold;
uniform float uGlow;
varying float vFacing;
void main() {
  float f = pow(vFacing, 2.4);
  gl_FragColor = vec4(uGold * f * 0.85 * uGlow, 1.0);
}
`;

const LIGHT_VERT = /* glsl */ `
varying vec2 vLocal;
void main() {
  vLocal = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const LIGHT_FRAG = /* glsl */ `
uniform vec3 uGold;
uniform float uGlow;
uniform float uTime;
uniform float uR;
uniform float uLegs;
varying vec2 vLocal;
float sdArch(vec2 p) {
  if (p.y < uLegs) return uR - abs(p.x);
  return uR - length(vec2(p.x, p.y - uLegs));
}
void main() {
  float inside = smoothstep(0.0, 0.45, sdArch(vLocal));
  float total = uLegs + uR;
  float vertical = 1.0 - vLocal.y / total;
  float core = exp(-vLocal.x * vLocal.x * 1.6);
  float streak = 0.82 + 0.18 * sin(vLocal.x * 16.0 + uTime * 0.7) * sin(vLocal.x * 5.0 - uTime * 0.45);
  float intensity = inside * (0.35 + 0.65 * vertical) * (0.55 + 0.45 * core) * streak;
  vec3 col = mix(uGold, vec3(1.0, 0.93, 0.75), core * 0.6) * intensity * 0.75 * uGlow;
  gl_FragColor = vec4(col, 1.0);
}
`;

const RAYS_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const RAYS_FRAG = /* glsl */ `
uniform vec3 uGold;
uniform float uGlow;
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - vec2(0.5, 0.22)) * vec2(2.0, 1.0);
  float ang = atan(p.x, p.y);
  float r = length(p);
  float rays = pow(0.5 + 0.5 * sin(ang * 13.0 + uTime * 0.12), 6.0) * 0.7
             + pow(0.5 + 0.5 * sin(ang * 6.0 - uTime * 0.08 + 1.3), 10.0) * 0.6;
  float fall = exp(-r * 2.6) * smoothstep(0.0, 0.08, r);
  float up = smoothstep(-0.25, 0.2, p.y);
  gl_FragColor = vec4(uGold * rays * fall * up * 0.42 * uGlow, 1.0);
}
`;

const DUST_VERT = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aSeed;
varying float vAlpha;
void main() {
  vec3 p = position;
  float speed = 0.12 + aSeed * 0.22;
  p.y = mod(p.y + uTime * speed, 4.6) + 0.15;
  p.x += sin(uTime * 0.35 + aSeed * 21.0) * 0.5;
  p.z += cos(uTime * 0.28 + aSeed * 13.0) * 0.4;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float depth = -mv.z;
  gl_PointSize = (1.6 + aSeed * 4.2) * uPixelRatio * (16.0 / max(depth, 0.5));
  float twinkle = 0.45 + 0.55 * sin(uTime * (1.2 + aSeed * 2.0) + aSeed * 40.0);
  float edge = (1.0 - smoothstep(3.6, 4.7, p.y)) * smoothstep(0.15, 0.6, p.y);
  vAlpha = twinkle * edge * smoothstep(0.8, 3.0, depth) * (1.0 - smoothstep(26.0, 40.0, depth));
  gl_Position = projectionMatrix * mv;
}
`;

const DUST_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uGlow;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = 1.0 - smoothstep(0.0, 0.5, d);
  a = a * a;
  gl_FragColor = vec4(uColor * a * vAlpha * (0.5 + 0.5 * uGlow), 1.0);
}
`;

const STAR_VERT = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aSeed;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = (1.0 + aSeed * 1.8) * uPixelRatio;
  float elev = normalize(position).y;
  vAlpha = (0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.6 + aSeed) + aSeed * 30.0)))
         * smoothstep(0.06, 0.32, elev);
  gl_Position = projectionMatrix * mv;
}
`;

const STAR_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = 1.0 - smoothstep(0.1, 0.5, d);
  gl_FragColor = vec4(uColor * a * vAlpha * 0.8, 1.0);
}
`;

/* ---------------------------------------------------------------- Scene */

export class WheatFieldScene {
  private readonly opts: WheatFieldOptions;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.05, 400);
  private readonly clock = new THREE.Clock();
  private readonly archGroup = new THREE.Group();
  private readonly shared = {
    uTime: { value: 0 },
    uWind: { value: 1 },
    uGlow: { value: 0 },
    uPointer: { value: new THREE.Vector3(0, -100, 0) },
    uArch: { value: new THREE.Vector3(3.4, 0, -15) },
    uFog: { value: new THREE.Vector3() },
    uFogNear: { value: 9 },
    uFogFar: { value: 46 },
    uSunDir: { value: new THREE.Vector3(0, 0.02, -1) },
    uPixelRatio: { value: 1 },
  };
  private readonly archZ = -15;
  private archX = 3.4;
  private readonly introFrom = new THREE.Vector3(-0.6, 2.9, 13.5);
  private readonly introTarget = new THREE.Vector3(0.6, 2.9, -12);
  private readonly basePos = new THREE.Vector3(0, 1.32, 8.6);
  private readonly baseTarget = new THREE.Vector3(1.4, 1.78, -12);
  private readonly tmpPos = new THREE.Vector3();
  private readonly tmpTarget = new THREE.Vector3();
  private readonly tmpEnd = new THREE.Vector3();
  private readonly hitPoint = new THREE.Vector3();
  private readonly pointerNdc = new THREE.Vector2();
  private readonly pointerTarget = new THREE.Vector2(0, -100);
  private readonly parallax = new THREE.Vector2();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1);
  private readonly isSmall: boolean;
  private readonly resizeObserver: ResizeObserver;
  private readonly intersection: IntersectionObserver;
  private pointerInside = false;
  private pointerHit = false;
  private introStarted = false;
  private intro = 0;
  private running = false;
  private inView = true;
  private pageVisible = true;
  private disposed = false;
  private readyFired = false;
  private frameId = 0;
  private frames = 0;
  private frameTime = 0;
  private adapted = false;

  constructor(opts: WheatFieldOptions) {
    this.opts = opts;
    this.isSmall =
      window.matchMedia("(max-width: 768px)").matches ||
      (navigator.hardwareConcurrency ?? 8) <= 4;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isSmall ? 1.25 : 1.6));
    this.renderer.setClearColor(0x020b06, 1);
    // Shaders output display-ready colours directly.
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    const canvas = this.renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    opts.container.appendChild(canvas);

    this.shared.uPixelRatio.value = this.renderer.getPixelRatio();
    this.shared.uFog.value.copy(PALETTE.horizon).addScaledVector(PALETTE.sun, 0.1);

    this.buildSky();
    this.buildGround();
    this.buildField(this.isSmall ? 6500 : 15000);
    this.buildArch();
    this.buildDust(this.isSmall ? 260 : 620);
    this.buildStars(this.isSmall ? 160 : 320);

    this.camera.position.copy(this.introFrom);
    this.camera.lookAt(this.introTarget);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(opts.container);
    this.intersection = new IntersectionObserver(
      ([entry]) => {
        this.inView = entry.isIntersecting;
        this.syncLoop();
      },
      { threshold: 0 }
    );
    this.intersection.observe(opts.container);

    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", this.onPointerLeave);
    document.addEventListener("visibilitychange", this.onVisibility);
    canvas.addEventListener("webglcontextlost", this.onContextLost, false);

    this.resize();

    if (opts.reducedMotion) {
      this.introStarted = true;
      this.intro = 1;
      this.shared.uTime.value = 7.5;
      this.renderStatic();
    } else {
      this.syncLoop();
    }
  }

  /** Called when the preloader lifts: the camera glides in and the window lights up. */
  startIntro() {
    this.introStarted = true;
  }

  /* -------------------------------------------------------------- build */

  private buildSky() {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: PALETTE.skyTop },
        uMid: { value: PALETTE.skyMid },
        uHorizon: { value: PALETTE.horizon },
        uSun: { value: PALETTE.sun },
        uSunDir: this.shared.uSunDir,
        uGlow: this.shared.uGlow,
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 20), mat);
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    this.scene.add(sky);
  }

  private buildGround() {
    const geo = new THREE.PlaneGeometry(260, 260, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uSoil: { value: PALETTE.soil },
        uGold: { value: PALETTE.gold },
        uFog: this.shared.uFog,
        uArch: this.shared.uArch,
        uGlow: this.shared.uGlow,
        uFogNear: this.shared.uFogNear,
        uFogFar: this.shared.uFogFar,
      },
      vertexShader: GROUND_VERT,
      fragmentShader: GROUND_FRAG,
    });
    this.scene.add(new THREE.Mesh(geo, mat));
  }

  private buildField(count: number) {
    const blade = new THREE.PlaneGeometry(0.085, 1, 1, 9);
    blade.translate(0, 0.5, 0);

    const geo = new THREE.InstancedBufferGeometry();
    geo.setIndex(blade.getIndex());
    geo.setAttribute("position", blade.getAttribute("position"));
    geo.setAttribute("uv", blade.getAttribute("uv"));

    const offsets = new Float32Array(count * 3);
    const params = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const t = Math.pow(Math.random(), 1.5);
      const z = 5.2 - t * 54;
      const half = 3.5 + (8.6 - z) * 0.95;
      const x = (Math.random() * 2 - 1) * half;
      offsets[i * 3] = x;
      offsets[i * 3 + 1] = 0;
      offsets[i * 3 + 2] = z;
      const patch = Math.sin(x * 0.19 + z * 0.13) * Math.cos(z * 0.17 - x * 0.07);
      const green = patch > 0.5 ? 0.9 : patch > 0.3 ? 0.4 : 0;
      params[i * 4] = 0.78 + Math.random() * 0.48;
      params[i * 4 + 1] = Math.random();
      params[i * 4 + 2] = Math.random();
      params[i * 4 + 3] = green * (0.55 + Math.random() * 0.45);
    }
    geo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 3));
    geo.setAttribute("aParams", new THREE.InstancedBufferAttribute(params, 4));
    geo.instanceCount = count;

    const mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: {
        uTime: this.shared.uTime,
        uWind: this.shared.uWind,
        uPointer: this.shared.uPointer,
        uArch: this.shared.uArch,
        uGlow: this.shared.uGlow,
        uFog: this.shared.uFog,
        uFogNear: this.shared.uFogNear,
        uFogFar: this.shared.uFogFar,
        uStalkBase: { value: PALETTE.stalkBase },
        uStalk: { value: PALETTE.stalk },
        uEar: { value: PALETTE.ear },
        uEarGreen: { value: PALETTE.earGreen },
        uRim: { value: PALETTE.rim },
        uGold: { value: PALETTE.gold },
      },
      vertexShader: BLADE_VERT,
      fragmentShader: BLADE_FRAG,
    });

    const field = new THREE.Mesh(geo, mat);
    field.frustumCulled = false;
    this.scene.add(field);
  }

  private buildArch() {
    const r = 1.45;
    const legs = 2.55;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 14; i++) pts.push(new THREE.Vector3(-r, (i / 14) * legs, 0));
    for (let i = 1; i < 48; i++) {
      const a = Math.PI - (i / 48) * Math.PI;
      pts.push(new THREE.Vector3(Math.cos(a) * r, legs + Math.sin(a) * r, 0));
    }
    for (let i = 0; i <= 14; i++) pts.push(new THREE.Vector3(r, legs - (i / 14) * legs, 0));
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");

    const glowUniforms = { uGold: { value: PALETTE.gold }, uGlow: this.shared.uGlow };

    const core = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 240, 0.042, 8, false),
      new THREE.ShaderMaterial({
        uniforms: glowUniforms,
        vertexShader: BASIC_VERT,
        fragmentShader: ARCH_CORE_FRAG,
      })
    );

    const halo = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 240, 0.24, 12, false),
      new THREE.ShaderMaterial({
        uniforms: glowUniforms,
        vertexShader: GLOW_VERT,
        fragmentShader: GLOW_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    const lightGeo = new THREE.PlaneGeometry(r * 2, legs + r, 1, 1);
    lightGeo.translate(0, (legs + r) / 2, -0.03);
    const light = new THREE.Mesh(
      lightGeo,
      new THREE.ShaderMaterial({
        uniforms: {
          uGold: { value: PALETTE.gold },
          uGlow: this.shared.uGlow,
          uTime: this.shared.uTime,
          uR: { value: r },
          uLegs: { value: legs },
        },
        vertexShader: LIGHT_VERT,
        fragmentShader: LIGHT_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    const rays = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 12, 1, 1),
      new THREE.ShaderMaterial({
        uniforms: {
          uGold: { value: PALETTE.gold },
          uGlow: this.shared.uGlow,
          uTime: this.shared.uTime,
        },
        vertexShader: RAYS_VERT,
        fragmentShader: RAYS_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    rays.position.set(0, 2.2 + (0.5 - 0.22) * 12, -0.4);

    this.archGroup.add(rays, light, halo, core);
    this.archGroup.position.set(this.archX, 0, this.archZ);
    this.scene.add(this.archGroup);
  }

  private buildDust(count: number) {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() * 2 - 1) * 15;
      positions[i * 3 + 1] = Math.random() * 4.6;
      positions[i * 3 + 2] = 5 - Math.random() * 30;
      seeds[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const points = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: this.shared.uTime,
          uPixelRatio: this.shared.uPixelRatio,
          uGlow: this.shared.uGlow,
          uColor: { value: PALETTE.dust },
        },
        vertexShader: DUST_VERT,
        fragmentShader: DUST_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    points.frustumCulled = false;
    this.scene.add(points);
  }

  private buildStars(count: number) {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.PI * (1.04 + Math.random() * 0.92);
      const y = 0.08 + Math.random() * 0.85;
      const rr = Math.sqrt(1 - y * y);
      positions[i * 3] = Math.cos(theta) * rr * 120;
      positions[i * 3 + 1] = y * 120;
      positions[i * 3 + 2] = Math.sin(theta) * rr * 120;
      seeds[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const stars = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: this.shared.uTime,
          uPixelRatio: this.shared.uPixelRatio,
          uColor: { value: PALETTE.star },
        },
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    stars.frustumCulled = false;
    this.scene.add(stars);
  }

  /* ------------------------------------------------------------- update */

  private update(dt: number) {
    const s = this.shared;
    s.uTime.value += dt;

    if (this.introStarted && this.intro < 1) this.intro = Math.min(1, this.intro + dt / 2.8);
    const ie = easeOutCubic(this.intro);
    const progress = this.opts.reducedMotion ? 0 : clamp01(this.opts.getProgress?.() ?? 0);
    const fe = easeInOutCubic(progress);

    // establishing shot → resting framing → flight through the window
    this.tmpPos.lerpVectors(this.introFrom, this.basePos, ie);
    this.tmpTarget.lerpVectors(this.introTarget, this.baseTarget, ie);
    this.tmpEnd.set(this.archX, 1.95, this.archZ - 3.2);
    this.tmpPos.lerp(this.tmpEnd, fe);
    this.tmpEnd.set(this.archX, 1.85, this.archZ - 40);
    this.tmpTarget.lerp(this.tmpEnd, fe);

    const k = 1 - Math.exp(-dt * 2.6);
    this.parallax.x += ((this.pointerInside ? this.pointerNdc.x : 0) - this.parallax.x) * k;
    this.parallax.y += ((this.pointerInside ? this.pointerNdc.y : 0) - this.parallax.y) * k;
    const pf = 1 - fe;
    this.camera.position.set(
      this.tmpPos.x + this.parallax.x * 0.55 * pf,
      this.tmpPos.y + this.parallax.y * 0.22 * pf,
      this.tmpPos.z
    );
    this.camera.lookAt(this.tmpTarget);

    // pointer parts the wheat
    this.pointerHit = false;
    if (this.pointerInside) {
      this.raycaster.setFromCamera(this.pointerNdc, this.camera);
      const hit = this.raycaster.ray.intersectPlane(this.pointerPlane, this.hitPoint);
      if (hit && hit.z > this.archZ - 30) {
        this.pointerHit = true;
        this.pointerTarget.set(hit.x, hit.z);
      }
    }
    const u = s.uPointer.value;
    if (u.z < 0.01) {
      u.x = this.pointerTarget.x;
      u.y = this.pointerTarget.y;
    } else {
      const pk = 1 - Math.exp(-dt * 9);
      u.x += (this.pointerTarget.x - u.x) * pk;
      u.y += (this.pointerTarget.y - u.y) * pk;
    }
    u.z += ((this.pointerHit ? pf : 0) - u.z) * (1 - Math.exp(-dt * 4));

    s.uGlow.value = ie * (1 + fe * 1.8) * (0.94 + 0.06 * Math.sin(s.uTime.value * 1.4));
  }

  private tick = () => {
    if (!this.running || this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.fireReady();
    this.adapt(dt);
    this.frameId = requestAnimationFrame(this.tick);
  };

  private renderStatic() {
    if (this.disposed) return;
    this.update(0);
    this.renderer.render(this.scene, this.camera);
    this.fireReady();
  }

  private fireReady() {
    if (this.readyFired) return;
    this.readyFired = true;
    this.opts.onReady?.();
  }

  /** Drop to 1× pixel ratio if the first ~90 frames are slow. */
  private adapt(dt: number) {
    if (this.adapted) return;
    this.frames += 1;
    this.frameTime += dt;
    if (this.frames >= 90) {
      this.adapted = true;
      if (this.frameTime / this.frames > 0.026 && this.renderer.getPixelRatio() > 1) {
        this.renderer.setPixelRatio(1);
        this.shared.uPixelRatio.value = 1;
        this.resize();
      }
    }
  }

  private syncLoop() {
    if (this.disposed || this.opts.reducedMotion) return;
    const should = this.inView && this.pageVisible;
    if (should && !this.running) {
      this.running = true;
      this.clock.getDelta();
      this.frameId = requestAnimationFrame(this.tick);
    } else if (!should && this.running) {
      this.running = false;
      cancelAnimationFrame(this.frameId);
    }
  }

  private resize() {
    if (this.disposed) return;
    const w = this.opts.container.clientWidth;
    const h = this.opts.container.clientHeight;
    if (!w || !h) return;
    const aspect = w / h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 0.75 ? 60 : aspect < 1.1 ? 50 : 42;
    this.camera.updateProjectionMatrix();

    this.archX = THREE.MathUtils.lerp(0.2, 3.6, clamp01((aspect - 0.7) / 1.1));
    this.archGroup.position.x = this.archX;
    this.shared.uArch.value.set(this.archX, 0, this.archZ);
    this.baseTarget.set(this.archX * 0.42, aspect < 0.75 ? 2.3 : 1.78, -12);
    this.introTarget.set(this.archX * 0.3, 2.9, -12);
    this.shared.uSunDir.value.set(this.archX + 1.2, 2.4, -60).sub(this.basePos).normalize();

    if (this.opts.reducedMotion) this.renderStatic();
  }

  /* ------------------------------------------------------------- events */

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    const rect = this.opts.container.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    this.pointerInside = inside;
    if (!inside) return;
    this.pointerNdc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    );
  };

  private onPointerLeave = () => {
    this.pointerInside = false;
  };

  private onVisibility = () => {
    this.pageVisible = !document.hidden;
    this.syncLoop();
  };

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.running = false;
    cancelAnimationFrame(this.frameId);
  };

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.intersection.disconnect();
    window.removeEventListener("pointermove", this.onPointerMove);
    document.documentElement.removeEventListener("pointerleave", this.onPointerLeave);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.renderer.domElement.removeEventListener("webglcontextlost", this.onContextLost);
    this.scene.traverse((obj) => {
      const item = obj as THREE.Mesh;
      if (item.geometry) item.geometry.dispose();
      const material = item.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

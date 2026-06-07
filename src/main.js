import * as THREE from "three";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { gsap } from "gsap";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { TrailCanvas } from "./trail.js";
import { TextCanvas } from "./text.js";
import { setupGuiControls } from "./gui-controls.js";
import {
  GHOST_CONFIG,
  REVEAL_CONFIG,
  LIQUID_TEXT_CONFIG,
  BIG_IMG_CONFIG,
} from "./config.js";
import { createGhostState, updateGhostMask } from "./effects/ghost-mask.js";
import { updateFlowField } from "./effects/liquid-flow.js";
import { setupScrollReveal } from "./effects/scroll-reveal.js";

// Basic Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.z = 3.9;

const canvas = document.querySelector("canvas");
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// OrbitControls
// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;

const raycaster = new THREE.Raycaster();

// Draco Loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
);
dracoLoader.setDecoderConfig({ type: "js" });

// Texture Loader
const textureLoader = new THREE.TextureLoader();
const plasterTexture = textureLoader.load("src/images/plaster.jpg");
plasterTexture.colorSpace = THREE.SRGBColorSpace;

const roughnessTexture = textureLoader.load("src/images/roughness.jpg");

const maskNoiseTexture = textureLoader.load("src/images/mask-noise.png");
maskNoiseTexture.wrapS = THREE.RepeatWrapping;
maskNoiseTexture.wrapT = THREE.RepeatWrapping;

// GLTF Loader
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const materials = [];
const aspectRatio = window.innerWidth / window.innerHeight;
const width = 512;
const height = Math.floor(width / aspectRatio);
const trail = new TrailCanvas(width, height);
let canv = trail.canvas;
canv.style.position = "absolute";
canv.style.top = "0";
canv.style.left = "0";
canv.style.zIndex = "1000";
canv.style.width = "200px";
canv.style.height = `${(200 * height) / width}px`;
document.body.appendChild(canv);

let trailTexture = trail.getTexture();
trailTexture.flipY = false;

const textContainer = document.querySelector(".text-container");
const textElement = document.querySelector(".text-container h1");
const headerBar = document.querySelector("#page1 .flex");
const bigImgCanvasElement = document.querySelector(".big-img-canvas");
const bigImgElement = bigImgCanvasElement?.querySelector("img");
const bigImgSrc = bigImgElement?.getAttribute("src")?.trim();
const liquidTextValue =
  textElement?.innerText?.trim() ||
  "Lorem ipsum dolor sit, amet adipisicing elit. Quos deserunt placeat, quo optio harum ad quidem. Sint delectus repudiandae vel?";

if (textContainer) {
  textContainer.style.opacity = "0";
  textContainer.style.pointerEvents = "none";
}

if (bigImgCanvasElement) {
  bigImgCanvasElement.style.opacity = "0";
}

const bigImgTexture = textureLoader.load(
  bigImgSrc || "src/images/marble-texture.webp",
);
bigImgTexture.colorSpace = THREE.SRGBColorSpace;

const textCanvas = new TextCanvas({
  width: LIQUID_TEXT_CONFIG.canvasWidth,
  height: LIQUID_TEXT_CONFIG.canvasHeight,
  fontSize: 56,
  lineHeight: 1.0,
  fontWeight: 100,
  paddingX: 0,
});
textCanvas.setText(liquidTextValue);
const textTexture = textCanvas.getTexture();

const flowSize = LIQUID_TEXT_CONFIG.flowSize;
function createFlowField() {
  const data = new Uint8Array(flowSize * flowSize * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 128;
    data[i + 1] = 128;
    data[i + 2] = 0;
    data[i + 3] = 255;
  }

  const texture = new THREE.DataTexture(
    data,
    flowSize,
    flowSize,
    THREE.RGBAFormat,
  );
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  return { data, texture };
}

const textFlow = createFlowField();
const bigImgFlow = createFlowField();

const ghostTrail = new TrailCanvas(width, height);
ghostTrail.setFadeAmount(0.025);
let ghostTrailTexture = ghostTrail.getTexture();
ghostTrailTexture.flipY = false;

const mouse = new THREE.Vector2();
const mouse2D = new THREE.Vector2();
const textUv = new THREE.Vector2(0.5, 0.5);
const bigImgUv = new THREE.Vector2(0.5, 0.5);
const previousMouse2D = new THREE.Vector2();
const pointerVelocity = new THREE.Vector2();
const smoothedPointerVelocity = new THREE.Vector2();
let hasPreviousMouse = false;
let isPointerOverText = false;
let isPointerOverBigImg = false;
let lastMouseTime = performance.now();
let textMesh;
let textMaterial;
let bigImgPlane;
let bigImgPlaneMaterial;
let gui;
let modelRoot;
let modelBaseY = 0;
const textPlaneZ = 1.4;
const bigImgPlaneZ = 1.3;
let bigImgAspectRatio = 1;
const ghostState = createGhostState(GHOST_CONFIG);

function screenToWorld(screenX, screenY, zPlane) {
  const ndc = new THREE.Vector3(
    (screenX / window.innerWidth) * 2 - 1,
    -(screenY / window.innerHeight) * 2 + 1,
    0.5,
  );
  ndc.unproject(camera);

  const rayDirection = ndc.sub(camera.position).normalize();
  const distance = (zPlane - camera.position.z) / rayDirection.z;
  return camera.position.clone().add(rayDirection.multiplyScalar(distance));
}

function syncTextCanvasFromDom() {
  if (!textElement) {
    return;
  }

  const rect = textElement.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  const targetCanvasWidth = Math.max(256, Math.round(rect.width * dpr));
  const targetCanvasHeight = Math.max(128, Math.round(rect.height * dpr));

  textCanvas.resize(targetCanvasWidth, targetCanvasHeight);
  textCanvas.setText(liquidTextValue);

  if (textMaterial) {
    textMaterial.uniforms.uTextTexelSize.value.set(
      1 / targetCanvasWidth,
      1 / targetCanvasHeight,
    );
  }
}

function updateLiquidTextLayout() {
  if (!textMesh) {
    return;
  }

  if (textElement) {
    const rect = textElement.getBoundingClientRect();

    const centerX = rect.left + rect.width * 0.5;
    const centerY = rect.top + rect.height * 0.5;

    const worldCenter = screenToWorld(centerX, centerY, textPlaneZ);
    const worldLeft = screenToWorld(rect.left, centerY, textPlaneZ);
    const worldRight = screenToWorld(rect.right, centerY, textPlaneZ);
    const worldTop = screenToWorld(centerX, rect.top, textPlaneZ);
    const worldBottom = screenToWorld(centerX, rect.bottom, textPlaneZ);

    textMesh.position.copy(worldCenter);
    textMesh.scale.set(
      Math.abs(worldRight.x - worldLeft.x),
      Math.abs(worldTop.y - worldBottom.y),
      1,
    );
    return;
  }

  const distanceFromCamera = camera.position.z - textMesh.position.z;
  const viewportHeight =
    2 *
    Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) *
    distanceFromCamera;
  const viewportWidth = viewportHeight * camera.aspect;

  const targetWidth = viewportWidth * LIQUID_TEXT_CONFIG.viewportWidthRatio;
  const textAspect =
    LIQUID_TEXT_CONFIG.canvasWidth / LIQUID_TEXT_CONFIG.canvasHeight;
  const targetHeight = targetWidth / textAspect;

  textMesh.scale.set(targetWidth, targetHeight, 1);
}

function updateBigImgPlaneLayout() {
  if (!bigImgPlane || !bigImgCanvasElement) {
    return;
  }

  const rect = bigImgCanvasElement.getBoundingClientRect();
  bigImgAspectRatio = rect.width / Math.max(1, rect.height);

  const centerX = rect.left + rect.width * 0.5;
  const centerY = rect.top + rect.height * 0.5;

  const worldCenter = screenToWorld(centerX, centerY, bigImgPlaneZ);
  const worldLeft = screenToWorld(rect.left, centerY, bigImgPlaneZ);
  const worldRight = screenToWorld(rect.right, centerY, bigImgPlaneZ);
  const worldTop = screenToWorld(centerX, rect.top, bigImgPlaneZ);
  const worldBottom = screenToWorld(centerX, rect.bottom, bigImgPlaneZ);

  bigImgPlane.position.copy(worldCenter);
  bigImgPlane.scale.set(
    Math.abs(worldRight.x - worldLeft.x),
    Math.abs(worldTop.y - worldBottom.y),
    1,
  );
}

function createBigImgPlane() {
  if (!bigImgCanvasElement) {
    return;
  }

  const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);
  const vertexShader = `
    uniform sampler2D uFlowTexture;
    uniform float uDisplacementAmount;
    varying vec2 vUv;

    void main() {
      vUv = uv;

      vec4 flowSample = texture2D(uFlowTexture, uv);
      vec2 flow = flowSample.rg * 2.0 - 1.0;
      float strength = flowSample.b;

      vec3 displaced = position;
      displaced.xy += flow * strength * uDisplacementAmount;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }
  `;

  const fragmentShader = `
    uniform sampler2D uTexture;
    uniform sampler2D uFlowTexture;
    uniform float uGlowBoost;
    uniform float uFlowInfluence;
    uniform float uHoverTransparency;
    varying vec2 vUv;

    void main() {
      vec4 base = texture2D(uTexture, vUv);
      float strength = texture2D(uFlowTexture, vUv).b;
      float flowMask = clamp(strength * uFlowInfluence, 0.0, 1.0);
      vec3 color = mix(base.rgb, base.rgb * uGlowBoost, flowMask);
      float alpha = 1.0 - flowMask * uHoverTransparency;

      gl_FragColor = vec4(color, alpha);
    }
  `;

  bigImgPlaneMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTexture: { value: bigImgTexture },
      uFlowTexture: { value: bigImgFlow.texture },
      uDisplacementAmount: { value: BIG_IMG_CONFIG.displacementAmount },
      uGlowBoost: { value: BIG_IMG_CONFIG.glowBoost },
      uFlowInfluence: { value: BIG_IMG_CONFIG.flowInfluence },
      uHoverTransparency: { value: BIG_IMG_CONFIG.hoverTransparency },
    },
  });

  bigImgPlane = new THREE.Mesh(geometry, bigImgPlaneMaterial);
  bigImgPlane.renderOrder = 5;
  scene.add(bigImgPlane);

  updateBigImgPlaneLayout();
}

function updateModelScrollPosition() {
  if (!modelRoot) {
    return;
  }

  const scrollableHeight = Math.max(
    1,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  const progress = window.scrollY / scrollableHeight;
  const targetY = modelBaseY - progress * 1.0;

  gsap.to(modelRoot.position, {
    y: -targetY,
    duration: 0.45,
    ease: "power2.out",
    overwrite: true,
  });
}

function createLiquidTextMesh() {
  const geometry = new THREE.PlaneGeometry(1, 1, 120, 48);

  const vertexShader = `
    uniform sampler2D uFlowTexture;
    uniform float uDisplacementAmount;
    varying vec2 vUv;

    void main() {
      vUv = uv;

      vec4 flowSample = texture2D(uFlowTexture, uv);
      vec2 flow = flowSample.rg * 2.0 - 1.0;
      float strength = flowSample.b;

      vec3 displaced = position;
      displaced.xy += flow * strength * uDisplacementAmount;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }
  `;

  const fragmentShader = `
    uniform sampler2D uTextTexture;
    uniform sampler2D uFlowTexture;
    uniform sampler2D uMaskTexture;
    uniform float uBlurAmount;
    uniform float uFadeByDisplacement;
    uniform float uRevealProgress;
    uniform float uRevealEdge;
    uniform vec2 uTextTexelSize;
    varying vec2 vUv;

    void main() {
      vec4 flowSample = texture2D(uFlowTexture, vUv);
      float strength = flowSample.b;

      vec2 blurStep = uTextTexelSize * (uBlurAmount + strength * uBlurAmount * 2.0);
      vec4 textSample = texture2D(uTextTexture, vUv) * 0.40;
      textSample += texture2D(uTextTexture, vUv + vec2(blurStep.x, 0.0)) * 0.15;
      textSample += texture2D(uTextTexture, vUv - vec2(blurStep.x, 0.0)) * 0.15;
      textSample += texture2D(uTextTexture, vUv + vec2(0.0, blurStep.y)) * 0.15;
      textSample += texture2D(uTextTexture, vUv - vec2(0.0, blurStep.y)) * 0.15;

      float fade = clamp(1.0 - strength * uFadeByDisplacement, 0.0, 1.0);
      float alpha = textSample.a * fade;

      float maskValue = texture2D(uMaskTexture, vUv).r;
      float revealMask = 1.0 - smoothstep(uRevealProgress - uRevealEdge, uRevealProgress + uRevealEdge, maskValue);
      alpha *= revealMask;

      if (alpha < 0.01) {
        discard;
      }

      gl_FragColor = vec4(textSample.rgb, alpha);
    }
  `;

  textMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    vertexShader,
    fragmentShader,
    uniforms: {
      uTextTexture: { value: textTexture },
      uFlowTexture: { value: textFlow.texture },
      uMaskTexture: { value: maskNoiseTexture },
      uRevealProgress: { value: 0.0 },
      uRevealEdge: { value: REVEAL_CONFIG.edge },
      uDisplacementAmount: { value: LIQUID_TEXT_CONFIG.displacementAmount },
      uBlurAmount: { value: LIQUID_TEXT_CONFIG.blurAmount },
      uFadeByDisplacement: { value: LIQUID_TEXT_CONFIG.fadeByDisplacement },
      uTextTexelSize: {
        value: new THREE.Vector2(
          1 / LIQUID_TEXT_CONFIG.canvasWidth,
          1 / LIQUID_TEXT_CONFIG.canvasHeight,
        ),
      },
    },
  });

  textMesh = new THREE.Mesh(geometry, textMaterial);
  textMesh.position.set(0, 0.1, textPlaneZ);
  textMesh.renderOrder = 6;
  scene.add(textMesh);

  syncTextCanvasFromDom();
  updateLiquidTextLayout();
}

createLiquidTextMesh();
createBigImgPlane();
gui = setupGuiControls({
  LIQUID_TEXT_CONFIG,
  GHOST_CONFIG,
  REVEAL_CONFIG,
  BIG_IMG_CONFIG,
  textCanvas,
  liquidTextValue,
  getTextMaterial: () => textMaterial,
  getBigImgMaterial: () => bigImgPlaneMaterial,
});

if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    syncTextCanvasFromDom();
    updateLiquidTextLayout();
  });
}

let dummy = new THREE.Mesh(
  new THREE.PlaneGeometry(19, 19),
  new THREE.MeshBasicMaterial({ color: "red" }),
);
// scene.add(dummy);

document.addEventListener("mousemove", (event) => {
  const now = performance.now();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  mouse2D.x = event.clientX / window.innerWidth;
  mouse2D.y = event.clientY / window.innerHeight; // Don't flip for canvas 2D

  if (hasPreviousMouse) {
    const delta = Math.max(0.001, (now - lastMouseTime) / 1000);
    pointerVelocity.set(
      (mouse2D.x - previousMouse2D.x) / delta,
      (mouse2D.y - previousMouse2D.y) / delta,
    );
  }

  previousMouse2D.copy(mouse2D);
  hasPreviousMouse = true;
  lastMouseTime = now;

  raycaster.setFromCamera(new THREE.Vector2(mouse.x, mouse.y), camera);
  const textIntersects = textMesh
    ? raycaster.intersectObject(textMesh, false)
    : [];
  const bigImgIntersects = bigImgPlane
    ? raycaster.intersectObject(bigImgPlane, false)
    : [];

  isPointerOverText = Boolean(textIntersects[0]);
  isPointerOverBigImg = Boolean(bigImgIntersects[0]);

  if (textIntersects[0]?.uv) {
    textUv.copy(textIntersects[0].uv);
  }

  if (bigImgIntersects[0]?.uv) {
    bigImgUv.copy(bigImgIntersects[0].uv);
  }
});

// Load GLTF Model (example)
gltfLoader.load(
  "src/models/reliefs_high_compressed.glb",
  (gltf) => {
    scene.add(gltf.scene);

    const model = gltf.scene;
    modelRoot = model;
    modelBaseY = model.position.y;
    updateModelScrollPosition();
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        let texture1 = child.material.map;
        let texture2 = child.material.emissiveMap;

        const vertexShader = `
          uniform sampler2D uTrailTexture;
          uniform sampler2D uGhostTrailTexture;
          uniform vec2 uResolution;
          varying vec2 vUv;
          varying vec2 vScreenUV;
          
          void main() {
            vUv = uv;
            
            // Calculate screen space UV
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vec4 projPosition = projectionMatrix * mvPosition;
            vec2 screenUV = (projPosition.xy / projPosition.w) * 0.5 + 0.5;
            
            // Flip Y for WebGL coordinates (canvas 2D has Y=0 at top)
            vScreenUV = vec2(screenUV.x, 1.0 - screenUV.y);
        
            // Get extrude value from trail texture
            float mouseExtrude = texture2D(uTrailTexture, vScreenUV).r;
            float ghostExtrude = texture2D(uGhostTrailTexture, vScreenUV).r;
            float extrude = max(mouseExtrude, ghostExtrude);
            
            // Extrude position
            vec3 pos = position;
            pos.z += extrude * 0.03;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `;

        const fragmentShader = `
          uniform sampler2D uTexture1;
          uniform sampler2D uTexture2;
          uniform sampler2D uTrailTexture;
          uniform sampler2D uGhostTrailTexture;
          uniform sampler2D uPlasterTexture;
          uniform sampler2D uRoughnessTexture;
          varying vec2 vUv;
          varying vec2 vScreenUV;
          
          // Manual gamma correction
          vec3 gammaCorrect(vec3 color, float gamma) {
            return pow(color, vec3(1.0 / gamma));
          }

          void main() {
            vec4 plaster = texture2D(uPlasterTexture, vUv);
            vec4 roughness = texture2D(uRoughnessTexture, vUv);
            vec4 tt1 = texture2D(uTexture1, vUv);
            vec4 tt2 = texture2D(uTexture2, vUv);
            float mouseExtrude = texture2D(uTrailTexture, vScreenUV).r;
            float ghostExtrude = texture2D(uGhostTrailTexture, vScreenUV).r;
            float extrude = max(mouseExtrude, ghostExtrude);
            
            float level0 = tt2.b;
            float level1 = tt2.g;
            float level2 = tt2.r;
            float level3 = tt1.b;
            float level4 = tt1.g;
            float level5 = tt1.r;
            
            float final = level0;
            final = mix(final, level1, smoothstep(0.0, 0.2, extrude));
            final = mix(final, level2, smoothstep(0.2, 0.4, extrude));
            final = mix(final, level3, smoothstep(0.4, 0.6, extrude));
            final = mix(final, level4, smoothstep(0.6, 0.8, extrude));
            final = mix(final, level5, smoothstep(0.8, 1.0, extrude));
            
            // Apply plaster texture with roughness
            vec3 color = plaster.rgb * final * roughness.r;
            
            // Apply gamma correction (2.2 is standard)
            color = gammaCorrect(color, 10.0);
            
            gl_FragColor = vec4(color, 1.0);
          }
        `;

        const material = new THREE.ShaderMaterial({
          vertexShader: vertexShader,
          fragmentShader: fragmentShader,
          uniforms: {
            uTexture1: { value: texture1 },
            uTexture2: { value: texture2 },
            uTrailTexture: { value: trailTexture },
            uGhostTrailTexture: { value: ghostTrailTexture },
            uPlasterTexture: { value: plasterTexture },
            uRoughnessTexture: { value: roughnessTexture },
            uResolution: {
              value: new THREE.Vector2(window.innerWidth, window.innerHeight),
            },
          },
        });

        child.material = material;
        materials.push(material);
      }
    });
  },
  (progress) => {
    console.log("Loading:", (progress.loaded / progress.total) * 100 + "%");
  },
  (error) => {
    console.error("Error loading model:", error);
  },
);

// Clock for Animation
const clock = new THREE.Clock();

// Animation Loop
function animate() {
  const deltaTime = clock.getDelta();

  smoothedPointerVelocity.lerp(
    pointerVelocity,
    LIQUID_TEXT_CONFIG.velocitySmoothing,
  );
  pointerVelocity.multiplyScalar(
    Math.exp(-LIQUID_TEXT_CONFIG.velocityDecay * deltaTime),
  );

  updateFlowField({
    deltaTime,
    flowData: textFlow.data,
    flowTexture: textFlow.texture,
    flowSize,
    textUv,
    smoothedPointerVelocity,
    isPointerOverText,
    config: LIQUID_TEXT_CONFIG,
  });

  updateFlowField({
    deltaTime,
    flowData: bigImgFlow.data,
    flowTexture: bigImgFlow.texture,
    flowSize,
    textUv: bigImgUv,
    smoothedPointerVelocity,
    isPointerOverText: isPointerOverBigImg,
    config: LIQUID_TEXT_CONFIG,
    fixedRadiusNorm: BIG_IMG_CONFIG.fixedMaskRadius,
    ignoreVelocityThreshold: true,
    aspectCompensation: bigImgAspectRatio,
  });
  updateGhostMask(ghostState, deltaTime, GHOST_CONFIG);
  trail.update(mouse2D);
  ghostTrail.update(ghostState.ghostMouse2D, {
    intensity: ghostState.ghostVisibility,
    radiusScale: GHOST_CONFIG.radiusScale,
  });
  // controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

setupScrollReveal({
  revealConfig: REVEAL_CONFIG,
  getTextMaterial: () => textMaterial,
  headerBar,
  onScrollFrame: () => {
    updateModelScrollPosition();
    updateLiquidTextLayout();
    updateBigImgPlaneLayout();
  },
});

// Responsive Resizing
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Resize trail canvas to match new aspect ratio
  const newAspectRatio = window.innerWidth / window.innerHeight;
  const newWidth = 512;
  const newHeight = Math.floor(newWidth / newAspectRatio);
  trail.resize(newWidth, newHeight);
  ghostTrail.resize(newWidth, newHeight);
  syncTextCanvasFromDom();
  updateLiquidTextLayout();
  updateBigImgPlaneLayout();

  // Update debug canvas display size
  canv.style.height = `${(200 * newHeight) / newWidth}px`;

  // Update resolution uniform for all materials
  materials.forEach((material) => {
    material.uniforms.uResolution.value.set(
      window.innerWidth,
      window.innerHeight,
    );
  });

  updateModelScrollPosition();
});

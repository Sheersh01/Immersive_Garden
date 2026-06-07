import * as THREE from "three";

export const GHOST_CONFIG = {
  driftSpeedMin: 0.1,
  driftSpeedMax: 1,
  jumpIntervalMin: 2,
  jumpIntervalMax: 4,
  blinkIntervalMin: 2,
  blinkIntervalMax: 4,
  fadeDuration: 0.3,
  edgePadding: 0.03,
  radiusScale: 0.9,
};

export const REVEAL_CONFIG = {
  scrollTrigger: 0.02,
  edge: 0.06,
  duration: 1.2,
};

export const LIQUID_TEXT_CONFIG = {
  canvasWidth: 2048,
  canvasHeight: 640,
  viewportWidthRatio: 0.72,
  flowSize: 128,
  baseRadius: 0.2,
  velocityRadiusBoost: 0.2,
  velocityThreshold: 0.08,
  flowForce: 1.5,
  vectorDamping: 3.8,
  strengthDamping: 2.4,
  displacementAmount: 0.08,
  blurAmount: 0.0,
  fadeByDisplacement: 0.5,
  velocitySmoothing: 0.18,
  velocityDecay: 8,
};

export const BIG_IMG_CONFIG = {
  displacementAmount: 0.085,
  glowBoost: 1.15,
  flowInfluence: 1.2,
  hoverTransparency: 0.28,
  fixedMaskRadius: 0.12,
};

export const randomRange = (min, max) => min + Math.random() * (max - min);
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const randomPoint = (edgePadding) =>
  new THREE.Vector2(
    randomRange(edgePadding, 1 - edgePadding),
    randomRange(edgePadding, 1 - edgePadding),
  );

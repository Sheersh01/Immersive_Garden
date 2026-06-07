import * as THREE from "three";
import { clamp, randomPoint, randomRange } from "../config.js";

export function createGhostState(config) {
  return {
    ghostMouse2D: randomPoint(config.edgePadding),
    ghostDriftTarget: randomPoint(config.edgePadding),
    ghostDriftSpeed: randomRange(config.driftSpeedMin, config.driftSpeedMax),
    ghostVisibility: 1,
    ghostTargetVisibility: 1,
    ghostBlinkTimer: randomRange(
      config.blinkIntervalMin,
      config.blinkIntervalMax,
    ),
    ghostJumpTimer: randomRange(config.jumpIntervalMin, config.jumpIntervalMax),
  };
}

export function updateGhostMask(state, deltaTime, config) {
  const moveDirection = new THREE.Vector2().subVectors(
    state.ghostDriftTarget,
    state.ghostMouse2D,
  );

  if (moveDirection.lengthSq() < 0.0006) {
    state.ghostDriftTarget.copy(randomPoint(config.edgePadding));
    state.ghostDriftSpeed = randomRange(
      config.driftSpeedMin,
      config.driftSpeedMax,
    );
  } else {
    moveDirection.normalize();
    state.ghostMouse2D.addScaledVector(
      moveDirection,
      state.ghostDriftSpeed * deltaTime,
    );
  }

  state.ghostJumpTimer -= deltaTime;
  if (state.ghostJumpTimer <= 0) {
    state.ghostMouse2D.copy(randomPoint(config.edgePadding));
    state.ghostDriftTarget.copy(randomPoint(config.edgePadding));
    state.ghostDriftSpeed = randomRange(
      config.driftSpeedMin,
      config.driftSpeedMax,
    );
    state.ghostJumpTimer = randomRange(
      config.jumpIntervalMin,
      config.jumpIntervalMax,
    );
  }

  state.ghostBlinkTimer -= deltaTime;
  if (state.ghostBlinkTimer <= 0) {
    state.ghostTargetVisibility = state.ghostTargetVisibility > 0.5 ? 0 : 1;
    state.ghostBlinkTimer = randomRange(
      config.blinkIntervalMin,
      config.blinkIntervalMax,
    );
  }

  const fadeStep = deltaTime / config.fadeDuration;
  if (state.ghostTargetVisibility > state.ghostVisibility) {
    state.ghostVisibility = Math.min(
      state.ghostTargetVisibility,
      state.ghostVisibility + fadeStep,
    );
  } else {
    state.ghostVisibility = Math.max(
      state.ghostTargetVisibility,
      state.ghostVisibility - fadeStep,
    );
  }

  state.ghostMouse2D.x = clamp(
    state.ghostMouse2D.x,
    config.edgePadding,
    1 - config.edgePadding,
  );
  state.ghostMouse2D.y = clamp(
    state.ghostMouse2D.y,
    config.edgePadding,
    1 - config.edgePadding,
  );
}

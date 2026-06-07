import { clamp } from "../config.js";

export function updateFlowField({
  deltaTime,
  flowData,
  flowTexture,
  flowSize,
  textUv,
  smoothedPointerVelocity,
  isPointerOverText,
  config,
  fixedRadiusNorm,
  ignoreVelocityThreshold = false,
  aspectCompensation = 1,
}) {
  const vectorDecay = Math.exp(-config.vectorDamping * deltaTime);
  const strengthDecay = Math.exp(-config.strengthDamping * deltaTime);

  for (let i = 0; i < flowData.length; i += 4) {
    const vx = ((flowData[i] - 128) / 127) * vectorDecay;
    const vy = ((flowData[i + 1] - 128) / 127) * vectorDecay;
    const strength = (flowData[i + 2] / 255) * strengthDecay;

    flowData[i] = Math.round(clamp(vx, -1, 1) * 127 + 128);
    flowData[i + 1] = Math.round(clamp(vy, -1, 1) * 127 + 128);
    flowData[i + 2] = Math.round(clamp(strength, 0, 1) * 255);
  }

  const speed = smoothedPointerVelocity.length();
  if (
    !isPointerOverText ||
    (!ignoreVelocityThreshold && speed < config.velocityThreshold)
  ) {
    flowTexture.needsUpdate = true;
    return;
  }

  const radiusNorm =
    fixedRadiusNorm ??
    config.baseRadius + Math.min(speed * config.velocityRadiusBoost, 0.12);
  const radiusPx = Math.max(2, Math.floor(radiusNorm * flowSize));
  const centerX = Math.floor(clamp(textUv.x, 0, 1) * (flowSize - 1));
  const centerY = Math.floor(clamp(textUv.y, 0, 1) * (flowSize - 1));
  const impulseX = smoothedPointerVelocity.x * config.flowForce;
  const impulseY = -smoothedPointerVelocity.y * config.flowForce;

  const minY = Math.max(0, centerY - radiusPx);
  const maxY = Math.min(flowSize - 1, centerY + radiusPx);
  const minX = Math.max(0, centerX - radiusPx);
  const maxX = Math.min(flowSize - 1, centerX + radiusPx);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(
        dx * dx * aspectCompensation * aspectCompensation + dy * dy,
      );
      if (distance > radiusPx) {
        continue;
      }

      const falloff = 1 - distance / radiusPx;
      const index = (y * flowSize + x) * 4;
      const currentVX = (flowData[index] - 128) / 127;
      const currentVY = (flowData[index + 1] - 128) / 127;
      const currentStrength = flowData[index + 2] / 255;

      const nextVX = clamp(currentVX + impulseX * falloff * deltaTime, -1, 1);
      const nextVY = clamp(currentVY + impulseY * falloff * deltaTime, -1, 1);
      const nextStrength = clamp(currentStrength + falloff * 0.7, 0, 1);

      flowData[index] = Math.round(nextVX * 127 + 128);
      flowData[index + 1] = Math.round(nextVY * 127 + 128);
      flowData[index + 2] = Math.round(nextStrength * 255);
    }
  }

  flowTexture.needsUpdate = true;
}

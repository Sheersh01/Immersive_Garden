import * as THREE from "three";

export class TrailCanvas {
  constructor(width = 512, height = 512) {
    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;

    // Get 2D context
    this.ctx = this.canvas.getContext("2d");

    // Initialize with black background
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, width, height);

    // Create texture for Three.js
    this.texture = new THREE.CanvasTexture(this.canvas);

    // Trail settings
    this.fadeAmount = 0.03; // How much to fade each frame (0-1)
    this.circleRadius = width * 0.08;
  }

  update(mouse, options = {}) {
    const intensity = Math.max(0, Math.min(1, options.intensity ?? 1));
    const radiusScale = Math.max(0.1, options.radiusScale ?? 1);
    // Apply threshold to ensure complete fade to black
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    const data = imageData.data;
    const threshold = 20; // Values below this get set to 0

    for (let i = 0; i < data.length; i += 4) {
      // Fade RGB channels
      data[i] = Math.max(0, data[i] - data[i] * this.fadeAmount); // R
      data[i + 1] = Math.max(0, data[i + 1] - data[i + 1] * this.fadeAmount); // G
      data[i + 2] = Math.max(0, data[i + 2] - data[i + 2] * this.fadeAmount); // B

      // Apply threshold - if all RGB values are below threshold, set to 0
      if (
        data[i] < threshold &&
        data[i + 1] < threshold &&
        data[i + 2] < threshold
      ) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
      }
    }

    this.ctx.putImageData(imageData, 0, 0);

    // Draw smooth gradient circle at mouse position if provided
    if (
      mouse &&
      mouse.x !== undefined &&
      mouse.y !== undefined &&
      intensity > 0
    ) {
      const x = mouse.x * this.canvas.width;
      const y = mouse.y * this.canvas.height;
      const radius = this.circleRadius * radiusScale;

      // Create radial gradient with more stops for ultra-smooth circle
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${1.0 * intensity})`);
      gradient.addColorStop(0.2, `rgba(255, 255, 255, ${0.8 * intensity})`);
      gradient.addColorStop(0.4, `rgba(255, 255, 255, ${0.5 * intensity})`);
      gradient.addColorStop(0.6, `rgba(255, 255, 255, ${0.25 * intensity})`);
      gradient.addColorStop(0.8, `rgba(255, 255, 255, ${0.1 * intensity})`);
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      // Apply soft shadow/blur effect
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = `rgba(255, 255, 255, ${0.5 * intensity})`;

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Reset shadow
      this.ctx.shadowBlur = 0;
    }

    // Update texture
    this.texture.needsUpdate = true;
  }

  getTexture() {
    return this.texture;
  }

  // Optional: Clear the canvas
  clear() {
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.texture.needsUpdate = true;
  }

  // Optional: Set fade amount (0-1)
  setFadeAmount(amount) {
    this.fadeAmount = Math.max(0, Math.min(1, amount));
  }

  // Optional: Set circle radius
  setCircleRadius(radius) {
    this.circleRadius = radius;
  }

  // Resize canvas to new dimensions
  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.circleRadius = width * 0.2;
    // Clear with black
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, width, height);
    this.texture.needsUpdate = true;
  }
}

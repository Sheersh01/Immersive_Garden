import * as THREE from "three";

export class TextCanvas {
  constructor(options = {}) {
    this.width = options.width ?? 1536;
    this.height = options.height ?? 512;
    this.paddingX = options.paddingX ?? 0;
    this.lineHeight = options.lineHeight ?? 1.25;
    this.fontSize = options.fontSize ?? 56;
    this.fontWeight = options.fontWeight ?? 100;
    this.fontFamily =
      options.fontFamily ?? '"ps", "Segoe UI", sans-serif';
    this.color = options.color ?? "black";
    this.background = options.background ?? "rgba(0, 0, 0, 0)";
    this.textAlign = options.textAlign ?? "left";

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext("2d");

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.needsUpdate = true;

    this.text = "";
  }

  setText(text) {
    this.text = `${text ?? ""}`.trim();
    this.redraw();
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.redraw();
  }

  getTexture() {
    return this.texture;
  }

  redraw() {
    if (!this.ctx) {
      return;
    }

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = this.color;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = "middle";
    ctx.font = `${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;

    const lines = this.wrapText(
      this.text,
      Math.max(200, this.width - this.paddingX * 2),
    );

    const linePixelHeight = this.fontSize * this.lineHeight;
    const blockHeight = lines.length * linePixelHeight;
    let y = (this.height - blockHeight) * 0.5 + linePixelHeight * 0.5;
    let x = this.width * 0.5;

    if (this.textAlign === "left") {
      x = this.paddingX;
    } else if (this.textAlign === "right") {
      x = this.width - this.paddingX;
    }

    for (const line of lines) {
      ctx.fillText(line, x, y);
      y += linePixelHeight;
    }

    this.texture.needsUpdate = true;
  }

  wrapText(sourceText, maxWidth) {
    if (!this.ctx) {
      return [""];
    }

    const ctx = this.ctx;
    const paragraphs = `${sourceText}`
      .split(/\n+/)
      .map((entry) => entry.trim());
    const lines = [];

    paragraphs.forEach((paragraph) => {
      if (!paragraph) {
        lines.push("");
        return;
      }

      const words = paragraph.split(/\s+/);
      let currentLine = words[0] ?? "";

      for (let i = 1; i < words.length; i += 1) {
        const next = `${currentLine} ${words[i]}`;
        if (ctx.measureText(next).width <= maxWidth) {
          currentLine = next;
        } else {
          lines.push(currentLine);
          currentLine = words[i];
        }
      }

      lines.push(currentLine);
    });

    return lines.length > 0 ? lines : [""];
  }
}

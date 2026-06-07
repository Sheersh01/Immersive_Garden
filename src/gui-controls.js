import GUI from "lil-gui";

export function setupGuiControls({
  LIQUID_TEXT_CONFIG,
  GHOST_CONFIG,
  REVEAL_CONFIG,
  BIG_IMG_CONFIG,
  textCanvas,
  liquidTextValue,
  getTextMaterial,
  getBigImgMaterial,
}) {
  const gui = new GUI({ title: "Liquid Text Controls" });

  const refreshTextCanvas = () => {
    const textMaterial = getTextMaterial();
    const safeWidth = Math.max(128, Math.round(textCanvas.width));
    const safeHeight = Math.max(64, Math.round(textCanvas.height));
    textCanvas.width = safeWidth;
    textCanvas.height = safeHeight;
    textCanvas.paddingX = Math.max(0, textCanvas.paddingX);
    textCanvas.lineHeight = Math.max(0.5, textCanvas.lineHeight);
    textCanvas.fontSize = Math.max(8, textCanvas.fontSize);
    textCanvas.fontWeight = Math.max(100, Math.min(900, textCanvas.fontWeight));
    textCanvas.resize(safeWidth, safeHeight);
    textCanvas.setText(liquidTextValue);

    if (textMaterial) {
      textMaterial.uniforms.uTextTexelSize.value.set(
        1 / safeWidth,
        1 / safeHeight,
      );
    }
  };

  const textCanvasFolder = gui.addFolder("Text Canvas");
  textCanvasFolder
    .add(textCanvas, "width", 256, 4096, 1)
    .name("Canvas Width")
    .onChange(refreshTextCanvas);
  textCanvasFolder
    .add(textCanvas, "height", 128, 2048, 1)
    .name("Canvas Height")
    .onChange(refreshTextCanvas);
  textCanvasFolder
    .add(textCanvas, "paddingX", 0, 400, 1)
    .name("Padding X")
    .onChange(refreshTextCanvas);
  textCanvasFolder
    .add(textCanvas, "lineHeight", 0.6, 2.5, 0.01)
    .name("Line Height")
    .onChange(refreshTextCanvas);
  textCanvasFolder
    .add(textCanvas, "fontSize", 8, 220, 1)
    .name("Font Size")
    .onChange(refreshTextCanvas);
  textCanvasFolder
    .add(textCanvas, "fontWeight", 100, 900, 1)
    .name("Font Weight")
    .onChange(refreshTextCanvas);
  textCanvasFolder
    .add(textCanvas, "fontFamily", {
      "Space Grotesk": '"Space Grotesk", "Segoe UI", sans-serif',
      "Segoe UI": '"Segoe UI", sans-serif',
      Georgia: "Georgia, serif",
      "Courier New": '"Courier New", monospace',
    })
    .name("Font Family")
    .onChange(refreshTextCanvas);
  textCanvasFolder
    .addColor(textCanvas, "color")
    .name("Text Color")
    .onChange(refreshTextCanvas);
  textCanvasFolder
    .addColor(textCanvas, "background")
    .name("Background")
    .onChange(refreshTextCanvas);

  const liquidFolder = gui.addFolder("Liquid Text");
  liquidFolder
    .add(LIQUID_TEXT_CONFIG, "displacementAmount", 0, 0.4, 0.005)
    .name("Displacement")
    .onChange((value) => {
      const textMaterial = getTextMaterial();
      if (textMaterial) {
        textMaterial.uniforms.uDisplacementAmount.value = value;
      }
    });

  liquidFolder
    .add(LIQUID_TEXT_CONFIG, "blurAmount", 0, 3, 0.01)
    .name("Blur Amount")
    .onChange((value) => {
      const textMaterial = getTextMaterial();
      if (textMaterial) {
        textMaterial.uniforms.uBlurAmount.value = value;
      }
    });

  liquidFolder
    .add(LIQUID_TEXT_CONFIG, "fadeByDisplacement", 0, 2, 0.01)
    .name("Fade By Push")
    .onChange((value) => {
      const textMaterial = getTextMaterial();
      if (textMaterial) {
        textMaterial.uniforms.uFadeByDisplacement.value = value;
      }
    });

  liquidFolder
    .add(LIQUID_TEXT_CONFIG, "baseRadius", 0.005, 0.2, 0.001)
    .name("Base Radius");
  liquidFolder
    .add(LIQUID_TEXT_CONFIG, "velocityRadiusBoost", 0.005, 0.2, 0.001)
    .name("Radius Boost");
  liquidFolder
    .add(LIQUID_TEXT_CONFIG, "velocityThreshold", 0.001, 0.3, 0.001)
    .name("Velocity Threshold");
  liquidFolder
    .add(LIQUID_TEXT_CONFIG, "flowForce", 0.5, 20, 0.1)
    .name("Flow Force");
  liquidFolder
    .add(LIQUID_TEXT_CONFIG, "vectorDamping", 0.5, 12, 0.1)
    .name("Vector Damping");
  liquidFolder
    .add(LIQUID_TEXT_CONFIG, "strengthDamping", 0.5, 12, 0.1)
    .name("Strength Damping");
  liquidFolder
    .add(LIQUID_TEXT_CONFIG, "velocitySmoothing", 0.01, 0.6, 0.01)
    .name("Velocity Smooth");
  liquidFolder
    .add(LIQUID_TEXT_CONFIG, "velocityDecay", 0.5, 20, 0.1)
    .name("Velocity Decay");

  const ghostFolder = gui.addFolder("Ghost Mask");
  ghostFolder
    .add(GHOST_CONFIG, "radiusScale", 0.3, 1.8, 0.01)
    .name("Radius Scale");
  ghostFolder
    .add(GHOST_CONFIG, "fadeDuration", 0.05, 1.2, 0.01)
    .name("Fade Duration");
  ghostFolder
    .add(GHOST_CONFIG, "driftSpeedMin", 0.01, 1, 0.01)
    .name("Drift Min");
  ghostFolder
    .add(GHOST_CONFIG, "driftSpeedMax", 0.05, 2, 0.01)
    .name("Drift Max");

  const revealFolder = gui.addFolder("Reveal Mask");
  revealFolder
    .add(REVEAL_CONFIG, "scrollTrigger", 0.1, 1.0, 0.01)
    .name("Scroll Trigger");
  revealFolder
    .add(REVEAL_CONFIG, "duration", 0.1, 4.0, 0.05)
    .name("Reveal Speed (s)");
  revealFolder
    .add(REVEAL_CONFIG, "edge", 0.01, 0.3, 0.005)
    .name("Edge Softness")
    .onChange((value) => {
      const textMaterial = getTextMaterial();
      if (textMaterial) {
        textMaterial.uniforms.uRevealEdge.value = value;
      }
    });

  const revealProxy = { progress: 0 };
  revealFolder
    .add(revealProxy, "progress", 0, 1, 0.01)
    .name("Preview Progress")
    .onChange((value) => {
      const textMaterial = getTextMaterial();
      if (textMaterial) {
        textMaterial.uniforms.uRevealProgress.value = value;
      }
    });

  const bigImageFolder = gui.addFolder("Big Image Distort");
  bigImageFolder
    .add(BIG_IMG_CONFIG, "displacementAmount", 0, 0.25, 0.001)
    .name("Displacement")
    .onChange((value) => {
      const material = getBigImgMaterial();
      if (material) {
        material.uniforms.uDisplacementAmount.value = value;
      }
    });
  bigImageFolder
    .add(BIG_IMG_CONFIG, "flowInfluence", 0, 3, 0.01)
    .name("Flow Influence")
    .onChange((value) => {
      const material = getBigImgMaterial();
      if (material) {
        material.uniforms.uFlowInfluence.value = value;
      }
    });
  bigImageFolder
    .add(BIG_IMG_CONFIG, "glowBoost", 1, 2.5, 0.01)
    .name("Glow Boost")
    .onChange((value) => {
      const material = getBigImgMaterial();
      if (material) {
        material.uniforms.uGlowBoost.value = value;
      }
    });
  bigImageFolder
    .add(BIG_IMG_CONFIG, "hoverTransparency", 0, 0.8, 0.01)
    .name("Hover Transparency")
    .onChange((value) => {
      const material = getBigImgMaterial();
      if (material) {
        material.uniforms.uHoverTransparency.value = value;
      }
    });
  bigImageFolder
    .add(BIG_IMG_CONFIG, "fixedMaskRadius", 0.04, 0.28, 0.001)
    .name("Fixed Mask Radius");
  bigImageFolder.open();
  revealFolder.open();

  liquidFolder.open();
  textCanvasFolder.open();

  return gui;
}

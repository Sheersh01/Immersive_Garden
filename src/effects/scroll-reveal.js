import { gsap } from "gsap";
import Lenis from "lenis";

export function setupScrollReveal({
  revealConfig,
  getTextMaterial,
  headerBar,
  onScrollFrame,
}) {
  const lenis = new Lenis();

  lenis.on("scroll", ({ progress }) => {
    const triggered = progress >= revealConfig.scrollTrigger;
    const textMaterial = getTextMaterial();

    if (textMaterial) {
      const target = triggered ? 1.0 : 0.0;
      gsap.to(textMaterial.uniforms.uRevealProgress, {
        value: target,
        duration: revealConfig.duration,
        ease: "power2.out",
        overwrite: true,
      });
    }

    if (headerBar) {
      gsap.to(headerBar, {
        opacity: triggered ? 0 : 1,
        duration: revealConfig.duration * 0.6,
        ease: "power2.out",
        overwrite: true,
      });
    }

    onScrollFrame();
  });

  function lenisRaf(time) {
    lenis.raf(time);
    requestAnimationFrame(lenisRaf);
  }
  requestAnimationFrame(lenisRaf);

  return lenis;
}

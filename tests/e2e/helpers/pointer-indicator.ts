/// <reference lib="dom" />

import type { Page } from "@playwright/test";

export async function installPointerIndicator(page: Page) {
  await page.addInitScript(() => {
    const install = () => {
      if (document.querySelector("[data-e2e-pointer]")) return;

      const pointer = document.createElement("div");
      pointer.dataset.e2ePointer = "true";
      pointer.style.cssText = [
        "position:fixed",
        "left:0",
        "top:0",
        "width:18px",
        "height:18px",
        "border:3px solid white",
        "border-radius:9999px",
        "background:#ef4444",
        "box-shadow:0 0 0 2px #ef4444,0 2px 8px rgba(0,0,0,.45)",
        "pointer-events:none",
        "z-index:2147483647",
        "opacity:0",
        "transform:translate(-50%,-50%)",
      ].join(";");
      document.documentElement.append(pointer);

      document.addEventListener(
        "pointermove",
        (event) => {
          pointer.style.left = `${event.clientX}px`;
          pointer.style.top = `${event.clientY}px`;
          pointer.style.opacity = "1";
        },
        true,
      );

      document.addEventListener(
        "pointerdown",
        (event) => {
          pointer.style.left = `${event.clientX}px`;
          pointer.style.top = `${event.clientY}px`;
          pointer.style.opacity = "1";

          const ripple = document.createElement("div");
          ripple.style.cssText = [
            "position:fixed",
            `left:${event.clientX}px`,
            `top:${event.clientY}px`,
            "width:24px",
            "height:24px",
            "border:4px solid #ef4444",
            "border-radius:9999px",
            "pointer-events:none",
            "z-index:2147483646",
            "transform:translate(-50%,-50%) scale(.4)",
          ].join(";");
          document.documentElement.append(ripple);
          const animation = ripple.animate(
            [
              { opacity: 1, transform: "translate(-50%,-50%) scale(.4)" },
              { opacity: 0, transform: "translate(-50%,-50%) scale(2.2)" },
            ],
            { duration: 500, easing: "ease-out" },
          );
          animation.addEventListener("finish", () => ripple.remove());
        },
        true,
      );
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", install, { once: true });
    } else {
      install();
    }
  });
}

import { html } from "../../_npm/htl@1.0.0/_esm.js";

export const palettes = {
  light: {
    base: "#2f4155",
    baselight: "#4f6882",
    basefaint: "#95a2b083",
    background: "#eff4f7",
    figures: "#8ab194",
    referencial: "rgb(95, 157, 190)",
    oficial: "rgb(50, 104, 231)",
    alerta: "#d0b8c6",
  },
  dark: {
    base: "#d7e7f7",
    baselight: "#afb8c1",
    basefaint: "#808991",
    background: "#22262b",
    figures: "#8ab194",
    referencial: "rgb(88, 137, 183)",
    oficial: "rgb(114, 156, 255)",
    alerta: "#754d65",
  },
};

export function getPalette(dark) {
  return dark ? palettes.dark : palettes.light;
}

export function sourceColor(palette, fuente) {
  return fuente === "oficial" ? palette.oficial : palette.referencial;
}

export function sourceColorVariable(fuente) {
  return fuente === "oficial" ? "var(--oficial)" : "var(--referencial)";
}

function variables(palette) {
  return Object.entries(palette)
    .map(([name, value]) => `--${name}: ${value};`)
    .join("\n");
}

export const paletteStyle = html`<style>
  :root {
    ${variables(palettes.light)}
  }

  @media (prefers-color-scheme: dark) {
    :root {
      ${variables(palettes.dark)}
    }
  }
</style>`;

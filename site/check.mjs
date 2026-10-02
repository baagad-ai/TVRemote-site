import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => readFileSync(path.join(root, name), "utf8");
const html = read("index.html");
const css = read("styles.css");
const js = read("site.js");
const config = read("config.js");
const build = read("build.mjs");
const buildImports = [...build.matchAll(/^\s*import\s+(?:[\w*{},\s]+\s+from\s+)?["\x27]([^"\x27]+)["\x27]/gm)];
const failures = [];
const requireText = (label, condition) => { if (!condition) failures.push(label); };

requireText("Semantic main landmark and skip link", /<main\b[^>]*id="main"/.test(html) && /class="skip-link"\s+href="#main"/.test(html));
requireText("Both top links target the document start", /<body\b(?=[^>]*\bid="top")/i.test(html) && (html.match(/href="#top"/g) || []).length >= 2);
requireText("Primary promise and genuine YouTube proof", /<h1[^>]*>Skip the<br\s*\/?\s*>\s*<span>TV keyboard\./.test(html) && /assets\/remote-demo-ltr\.png/.test(html) && /lofi beat/.test(html));
requireText("Real screenshot has an accurate accessible description", /alt="Current The Remote YouTube search editor/.test(html) && /The TV response is not shown/.test(html));
requireText("All persistent beta CTAs remain disabled until configured", (html.match(/data-beta-cta disabled/g) || []).length >= 4 && /betaOptInUrl:\s*""/.test(config));
requireText("Beta availability is stated without collecting sign-up details", /id="beta-status"[^>]*role="status"/.test(html) && /This page does not collect signup details/.test(html) && !/betaOptInUrl:\s*["']https?:/i.test(config));
requireText("No video or player is loaded by default", /data-video-placeholder[^>]*role="img"/.test(html) && /videoSrc:\s*""/.test(config) && /<video[^>]*data-beta-video[^>]*controls[^>]*playsinline[^>]*preload="metadata"[^>]*hidden/.test(html));
requireText("Video has no autoplay", !/<video[^>]*\bautoplay\b/i.test(html) && !/\.play\s*\(/.test(js));
requireText("New benefit copy is present", /APP-AWARE PROFILES/.test(html) && /Pin up to three actions/.test(html) && /Easy remote or larger controls/.test(html));
requireText("Compatibility limits and privacy route are clear", /compatible Android TV and Google TV devices/.test(html) && /support Android TV Remote Service v2/.test(html) && /href="privacy\/"/.test(html));
requireText("Native FAQ is available", (html.match(/<details>/g) || []).length >= 4 && /<summary>Which TVs/.test(html));
requireText("Responsive CSS includes required layout and safe-area support", /@media\s*\(max-width:\s*740px\)/.test(css) && /@media\s*\(max-width:\s*420px\)/.test(css) && /env\(safe-area-inset-bottom\)/.test(css) && /data-mobile-cta-bar/.test(html));
requireText("CTA space adjusts to its rendered height", /data-mobile-cta-bar/.test(js) && /ResizeObserver/.test(js) && /--mobile-cta-reserve/.test(js));
requireText("Reduced motion and visible keyboard focus", /prefers-reduced-motion:\s*reduce/.test(css) && /prefers-reduced-motion:\s*reduce/.test(js) && /:focus-visible\s*\{[^}]*outline:/.test(css));
requireText("GSAP and ScrollTrigger are self-hosted at the selected version", /vendor\/gsap\/gsap-3\.15\.0\.min\.js/.test(html) && /vendor\/gsap\/ScrollTrigger-3\.15\.0\.min\.js/.test(html));
requireText("Three.js browser modules and licenses are present", existsSync(path.join(root, "vendor/three/three.module.js")) && existsSync(path.join(root, "vendor/three/three.core.js")) && existsSync(path.join(root, "vendor/three/LICENSE")) && existsSync(path.join(root, "vendor/gsap/LICENSE-NOTICE.txt")));
requireText("Three.js, GSAP and ScrollTrigger licenses retain their upstream notice", /gsap\.com\/standard-license/.test(read("vendor/gsap/LICENSE-NOTICE.txt")) && /three\.js authors/.test(read("vendor/three/LICENSE")) && /@license Copyright 2026, GreenSock/.test(read("vendor/gsap/gsap-3.15.0.min.js")) && /@license Copyright 2026, GreenSock/.test(read("vendor/gsap/ScrollTrigger-3.15.0.min.js")));
requireText("Hashed static build is available and dependency-free", existsSync(path.join(root, "build.mjs")) && /createHash\("sha256"\)/.test(build) && buildImports.length === 3 && buildImports.every((item) => item[1].startsWith("node:")));
requireText("No external font or analytics host", !/(fonts\.googleapis\.com|fonts\.gstatic\.com|google-analytics|googletagmanager)/i.test(html + css + js));
requireText("No arbitrary continuous scroll animation", !/addEventListener\s*\(\s*["']scroll/i.test(js) && !/requestAnimationFrame/.test(js));

for (const [relativePath, minimum] of [["assets/remote-demo-ltr.png", 50000], ["assets/focus-key.svg", 100], ["assets/work-sans-variable.ttf", 100000], ["assets/outfit-variable.ttf", 50000], ["assets/licenses/WorkSans-OFL.txt", 500], ["assets/licenses/Outfit-OFL.txt", 500], ["vendor/gsap/gsap-3.15.0.min.js", 50000], ["vendor/gsap/ScrollTrigger-3.15.0.min.js", 30000], ["vendor/three/three.module.js", 400000]]) {
  const assetPath = path.join(root, relativePath);
  requireText("Required local asset: " + relativePath, existsSync(assetPath) && statSync(assetPath).size >= minimum);
}
requireText("Readable privacy policy", existsSync(path.join(root, "privacy/index.html")) && /<main\b/.test(read("privacy/index.html")) && /\.policy-section/.test(css));

if (failures.length) {
  console.error("Site check failed:\n- " + failures.join("\n- "));
  process.exitCode = 1;
} else {
  console.log("PASS: page structure, real app proof, honest beta/video states, responsive hooks, motion preferences, local libraries and licenses.");
}

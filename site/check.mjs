import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => readFileSync(path.join(root, name), "utf8");
const html = read("index.html");
const css = read("styles.css");
const js = read("site.js");
const config = read("config.js");
const build = read("build.mjs");
const sceneChunkPath = path.join(root, "vendor/signal-dock/scene-enhancement.js");
const sceneChunkBytes = existsSync(sceneChunkPath) ? readFileSync(sceneChunkPath) : Buffer.alloc(0);
const buildImports = [...build.matchAll(/^\s*import\s+(?:[\w*{},\s]+\s+from\s+)?["\x27]([^"\x27]+)["\x27]/gm)];
const failures = [];
const requireText = (label, condition) => { if (!condition) failures.push(label); };

requireText("Semantic main landmark and skip link", /<main\b[^>]*id="main"/.test(html) && /class="skip-link"\s+href="#main"/.test(html));
requireText("Both top links target the document start", /<body\b(?=[^>]*\bid="top")/i.test(html) && (html.match(/href="#top"/g) || []).length >= 2);
requireText("Primary promise and genuine YouTube proof", /<h1[^>]*>Skip the<br\s*\/?\s*>\s*<span>TV keyboard\./.test(html) && /assets\/remote-demo-ltr\.png/.test(html) && /lofi beat/.test(html));
requireText("Real screenshot has an accurate accessible description", /alt="Current The Remote YouTube search editor/.test(html) && /The TV response is not shown/.test(html));
requireText("All persistent beta CTAs remain disabled until configured", (html.match(/data-beta-cta disabled/g) || []).length >= 4 && /betaOptInUrl:\s*""/.test(config));
requireText("Mobile sticky CTA starts hidden and inert", /data-mobile-cta-bar[^>]*aria-hidden="true"[^>]*inert/.test(html) && /classList\.toggle\("is-visible", visible\)/.test(js) && /toggleAttribute\("inert", !visible\)/.test(js));
requireText("Mobile sticky CTA avoids every visible inline signup CTA", /querySelectorAll\("\[data-beta-cta\]"\)/.test(js) && /filter\(\(cta\) => mobileCtaBar && !mobileCtaBar\.contains\(cta\)\)/.test(js) && /inlineCtas\.forEach\(\(cta\) => ctaVisibilityObserver\.observe\(cta\)\)/.test(js) && /inlineCtas\.find\(ctaIntersectsViewport\)/.test(js) && /rect\.bottom > 0 && rect\.top < window\.innerHeight/.test(js));
requireText("Beta availability is stated without collecting sign-up details", /id="beta-status"[^>]*role="status"/.test(html) && /This page does not collect signup details/.test(html) && !/betaOptInUrl:\s*["']https?:/i.test(config));
requireText("No video or player is loaded by default", /data-video-placeholder[^>]*role="img"/.test(html) && /videoSrc:\s*""/.test(config) && /<video[^>]*data-beta-video[^>]*controls[^>]*playsinline[^>]*preload="metadata"[^>]*hidden/.test(html));
requireText("Video has no autoplay", !/<video[^>]*\bautoplay\b/i.test(html) && !/video\s*\.play\s*\(/.test(js));
requireText("New benefit copy is present", /APP-AWARE PROFILES/.test(html) && /Pin up to three actions/.test(html) && /Easy remote or larger controls/.test(html));
requireText("Compatibility limits and privacy route are clear", /compatible Android TV and Google TV devices/.test(html) && /support Android TV Remote Service v2/.test(html) && /href="privacy\/"/.test(html));
requireText("Native FAQ is available", (html.match(/<details>/g) || []).length >= 4 && /<summary>Which TVs/.test(html));
requireText("Expanded FAQ uses a horizontal minus", /faq-list details\[open\] summary:after\{content:"-"\}/.test(css) && !/faq-list details\[open\] summary::after\s*\{\s*transform:\s*rotate\(45deg\)/.test(css));
requireText("Responsive CSS includes required layout and safe-area support", /@media\s*\(max-width:\s*740px\)/.test(css) && /@media\s*\(max-width:\s*420px\)/.test(css) && /env\(safe-area-inset-bottom\)/.test(css) && /data-mobile-cta-bar/.test(html));
requireText("Mobile benefit cards size to their content and render the pin-count markup", /\.benefit-card,\.benefit-card:first-child\{min-height:0;grid-column:auto;justify-content:flex-start/.test(css) && /\.pin-count-number\{/.test(css) && /\.pin-count-label\{/.test(css) && /<span class="pin-count-number">3<\/span>/.test(html));
requireText("CTA space adjusts to its rendered height", /data-mobile-cta-bar/.test(js) && /ResizeObserver/.test(js) && /--mobile-cta-reserve/.test(js));
requireText("Reduced motion and visible keyboard focus", /prefers-reduced-motion:\s*reduce/.test(css) && /prefers-reduced-motion:\s*reduce/.test(js) && /:focus-visible\s*\{[^}]*outline:/.test(css));
requireText("Focusable controls stay visible during hero/section motion", /gsap\.fromTo\(heroActions, \{ y: 14, autoAlpha: 1 \}/.test(js) && /targets\.every\(\(target\) => target\.matches\("a, button, input, select, textarea, summary/.test(js) && /autoAlpha: keepVisible \? 1 : 0/.test(js));
requireText("Section motion is staggered, reversible, non-pinned, and keeps content available before entry", /gsap\.timeline\(\{ paused: true \}\)/.test(js) && /onEnter: \(\) =>/.test(js) && /onLeaveBack: \(\) => timeline\?\.reverse\(\)/.test(js) && /sequenceStart = \(\) => narrowMotion\.matches \? "top 70%" : "top 78%"/.test(js) && /revealSequence\(document\.querySelector\("\.search-proof"\)/.test(js) && /revealSequence\(document\.querySelector\("\.compatibility-section"\)/.test(js) && /revealSequence\(document\.querySelector\("\.film-section"\)/.test(js) && /revealSequence\(document\.querySelector\("\.closing-section"\)/.test(js) && /document\.querySelectorAll\("\.benefit-card"\)\.forEach\(\(card\) => \{\s*revealSequence\(card/.test(js) && /\.scene-phone/.test(js) && /\.search-shot-frame/.test(js) && !/ScrollTrigger\.create\(\{[^}]*\bonce\s*:/s.test(js) && !/scrollTrigger:\s*\{[^}]*\bpin\s*:/s.test(js));
requireText("GSAP and ScrollTrigger are self-hosted at the selected version", /vendor\/gsap\/gsap-3\.15\.0\.min\.js/.test(html) && /vendor\/gsap\/ScrollTrigger-3\.15\.0\.min\.js/.test(html));
requireText("Three.js browser modules and licenses are present", existsSync(path.join(root, "vendor/three/three.module.js")) && existsSync(path.join(root, "vendor/three/three.core.js")) && existsSync(path.join(root, "vendor/three/LICENSE")) && existsSync(path.join(root, "vendor/gsap/LICENSE-NOTICE.txt")));
requireText("Original Signal Dock source, license, posters, and sub-200 KB gzip chunk are present", existsSync(path.join(root, "vendor/signal-dock/focus-key-scene.js")) && existsSync(path.join(root, "vendor/signal-dock/LICENSE.txt")) && existsSync(path.join(root, "assets/signal-dock/focus-key-desktop.webp")) && existsSync(path.join(root, "assets/signal-dock/focus-key-mobile.webp")) && sceneChunkBytes.length > 0 && gzipSync(sceneChunkBytes, { level: 9 }).byteLength <= 200_000);
requireText("Three.js, GSAP and ScrollTrigger licenses retain their upstream notice", /gsap\.com\/standard-license/.test(read("vendor/gsap/LICENSE-NOTICE.txt")) && /three\.js authors/.test(read("vendor/three/LICENSE")) && /@license Copyright 2026, GreenSock/.test(read("vendor/gsap/gsap-3.15.0.min.js")) && /@license Copyright 2026, GreenSock/.test(read("vendor/gsap/ScrollTrigger-3.15.0.min.js")));
requireText("Hashed static build is available and dependency-free", existsSync(path.join(root, "build.mjs")) && /createHash\("sha256"\)/.test(build) && buildImports.length === 3 && buildImports.every((item) => item[1].startsWith("node:")));
requireText("No external font or analytics host", !/(fonts\.googleapis\.com|fonts\.gstatic\.com|google-analytics|googletagmanager)/i.test(html + css + js));
requireText("Scene enhancement is lazy, motion-aware, and renders on demand", /import\("\.\/vendor\/signal-dock\/scene-enhancement\.js"\)/.test(js) && /navigator\.connection\?\.saveData/.test(js) && /requestAnimationFrame/.test(js) && !/setAnimationLoop\s*\(|setInterval\s*\(/.test(js));

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

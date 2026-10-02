import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => readFileSync(path.join(root, name), "utf8");
const failures = [];
const requireText = (label, condition) => { if (!condition) failures.push(label); };
const html = read("index.html");
const css = read("styles.css");
const js = read("site.js");
const config = read("config.js");

requireText("Semantic main landmark", /<main\b[^>]*id="main"/.test(html));
requireText("Top anchor target stays at document start, outside sticky header", /<body\b(?=[^>]*\bid="top")/i.test(html) && !/<header\b[^>]*\bid="top"/i.test(html));
requireText("Skip link", /class="skip-link"\s+href="#main"/.test(html));
requireText("Beta CTA is explicitly unavailable until configured", /data-beta-cta[^>]*disabled/.test(html) && /betaOptInUrl:\s*""/.test(config));
requireText("Beta CTA explanation", /id="beta-status"[^>]*role="status"/.test(html));
requireText("No invented opt-in URL", !/betaOptInUrl:\s*["']https?:/i.test(config + read("README.md")));
requireText("Privacy route is linked", existsSync(path.join(root, "privacy", "index.html")) && /href="privacy\/"/.test(html));
requireText("No rejected or placeholder video URL", !/beta-(?:announcement|youtube)-.*\.mp4|rejected-film/i.test(html + js + config));
requireText("Video remains a static non-interactive placeholder by default", /data-video-placeholder[^>]*role="img"/.test(html) && /videoSrc:\s*""/.test(config));
requireText("Configured video uses native controls and no autoplay", /data-beta-video controls playsinline preload="metadata"/.test(html) && !/<video[^>]*\bautoplay\b/i.test(html) && !/\.play\s*\(/.test(js));
requireText("Reduced motion support", /prefers-reduced-motion:\s*reduce/.test(css) && /prefers-reduced-motion:\s*reduce/.test(js));
requireText("Responsive breakpoints include compact, phone, and tablet layouts", /min-width:\s*320px/.test(css) && /max-width:\s*360px/.test(css) && /max-width:\s*680px/.test(css) && /max-width:\s*900px/.test(css));
requireText("Mobile safe-area CTA", /env\(safe-area-inset-bottom\)/.test(css) && /class="mobile-cta-bar"/.test(html));
requireText("Keyboard focus is visible", /:focus-visible\s*\{[^}]*outline:/.test(css));
requireText("Dedicated YouTube route leads the features", /<h3>Straight to YouTube search<\/h3>/.test(html));
requireText("Supported app-aware, per-TV and comfort benefits", /App-aware profiles/.test(html) && /up to three pinned actions/.test(html) && /Easy remote/.test(html));
requireText("Privacy route has readable dedicated layout", /\.policy-main\s*\{/.test(css) && /\.policy-section p\s*\{/.test(css));
requireText("Motion preference changes clear active tilt", /reduceMotion\.addEventListener\("change", resetTilt\)/.test(js));
requireText("Privacy page does not invent support-inbox or Group practices", !/mailto:|Google Groups|support inbox|marketing list/i.test(read("privacy/index.html")));
requireText("No continuous scroll listener", !/addEventListener\s*\(\s*["']scroll/i.test(js));
requireText("No external font or analytics host", !/(fonts\.googleapis\.com|fonts\.gstatic\.com|google-analytics|googletagmanager)/i.test(html + css + js));

for (const [file, minimum] of [["assets/remote-demo-ltr.png", 50000], ["assets/focus-key.svg", 100], ["assets/work-sans-variable.ttf", 100000], ["assets/outfit-variable.ttf", 50000], ["assets/licenses/WorkSans-OFL.txt", 500], ["assets/licenses/Outfit-OFL.txt", 500]]) {
  const filePath = path.join(root, file);
  requireText(`Required asset: ${file}`, existsSync(filePath) && statSync(filePath).size >= minimum);
}

if (failures.length) {
  console.error("Site check failed:\n- " + failures.join("\n- "));
  process.exitCode = 1;
} else {
  console.log("Site structure, launch placeholders, accessibility hooks, motion preference, and local assets are ready.");
}

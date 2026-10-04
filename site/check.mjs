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
const privacy = read("privacy/index.html");
const betaRequestUrl = config.match(/betaRequestUrl:\s*"([^"]*)"/)?.[1] ?? "";
const turnstileSiteKey = config.match(/turnstileSiteKey:\s*"([^"]*)"/)?.[1] ?? "";
const linksUnset = betaRequestUrl === "" && turnstileSiteKey === "";
const linksReady = /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev\/beta-requests$/.test(betaRequestUrl) && /^0x4[A-Za-z0-9_-]{15,100}$/.test(turnstileSiteKey);
const build = read("build.mjs");
const sceneChunkPath = path.join(root, "vendor/signal-dock/scene-enhancement.js");
const sceneChunkBytes = existsSync(sceneChunkPath) ? readFileSync(sceneChunkPath) : Buffer.alloc(0);
const buildImports = [...build.matchAll(/^\s*import\s+(?:[\w*{},\s]+\s+from\s+)?["\x27]([^"\x27]+)["\x27]/gm)];
const sectionMotionStart = js.indexOf("const sequenceStart =");
const sectionMotionEnd = js.indexOf('revealSequence(document.querySelector(".search-proof")', sectionMotionStart);
const sectionMotion = js.slice(sectionMotionStart, sectionMotionEnd);
const failures = [];
const requireText = (label, condition) => { if (!condition) failures.push(label); };

requireText("Semantic main landmark and skip link", /<main\b[^>]*id="main"/.test(html) && /class="skip-link"\s+href="#main"/.test(html));
requireText("Both top links target the document start", /<body\b(?=[^>]*\bid="top")/i.test(html) && (html.match(/href="#top"/g) || []).length >= 2);
requireText("Primary promise and genuine YouTube proof", /<h1[^>]*>Skip the<br\s*\/?\s*>\s*<span>TV keyboard\./.test(html) && /assets\/remote-demo-ltr\.png/.test(html) && /lofi beat/.test(html));
requireText("Real screenshot has an accurate accessible description", /alt="The Remote YouTube search field contains/.test(html) && /No TV search result is shown/.test(html));
const betaButtons = [...html.matchAll(/<button\b[^>]*data-beta-cta[^>]*>/g)].map(([button]) => button);
requireText("Requests require both verified configuration values", linksUnset || linksReady);
requireText("Primary CTAs open the request form only when configuration is ready", /validRequestUrl && validSiteKey/.test(js) && /link\.href = "#beta-enrollment"/.test(js) && /aria-controls", "beta-enrollment"/.test(js));
requireText("Unconfigured form and four CTAs start disabled", betaButtons.length === 4 && betaButtons.every((button) => /\bdisabled\b/.test(button)) && /<fieldset disabled>/.test(html));
requireText("Email-only request form has clear consent and status", /type="email"/.test(html) && /Google Play account email/.test(html) && /name="consent" type="checkbox" required/.test(html) && /data-request-status role="status"/.test(html));
 requireText("Private requests are reviewed before manual Google Play invitations", /Requests are reviewed privately/.test(html) && /manually through Google Play/.test(html + js + privacy) && /does not enroll you/.test(html + js + privacy) && /accept the invitation/.test(html + js + privacy));
 requireText("Official Google Play beta signup link remains pending", /official Google Play beta sign-up link will be added when ready/.test(html + js));
requireText("Privacy accurately describes private requests and manual invites", /private Cloudflare D1 database/.test(privacy) && /Cloudflare Turnstile/.test(privacy) && /request removal/.test(privacy) && /manually invite/.test(privacy) && !/Google Groups|no signup form|does not collect or store your email/.test(privacy));
requireText("Legacy Group enrollment copy is removed", !/betaGroupJoinUrl|data-beta-group-join|groups\.google\.com|Google Groups|tester Group|join the Group/i.test(html + js + config + privacy));
requireText("Request script is local and referenced", existsSync(path.join(root, "beta-request.js")) && /src="beta-request\.js"/.test(html));
requireText("Mobile sticky CTA starts hidden and inert", /data-mobile-cta-bar[^>]*aria-hidden="true"[^>]*inert/.test(html) && /classList\.toggle\("is-visible", visible\)/.test(js) && /toggleAttribute\("inert", !visible\)/.test(js));
requireText("Mobile sticky CTA avoids every visible inline signup CTA", /querySelectorAll\("\[data-beta-cta\]"\)/.test(js) && /filter\(\(cta\) => mobileCtaBar && !mobileCtaBar\.contains\(cta\)\)/.test(js) && /inlineCtas\.forEach\(\(cta\) => ctaVisibilityObserver\.observe\(cta\)\)/.test(js) && /inlineCtas\.find\(ctaIntersectsViewport\)/.test(js) && /rect\.bottom > 0 && rect\.top < window\.innerHeight/.test(js));
requireText("Walkthrough section, anchor, and player references are removed", !/(?:film-section|film-placeholder|filmArtwork|id="film"|href="#film"|data-beta-video|data-video-|videoSrc|videoPoster|videoCaptions|<video\b)/i.test(html + css + js + config));
requireText("Three screenshot-led chapters match the approved viewer stories", (html.match(/<article class="story-chapter\b/g) || []).length === 3 && /Found it on your phone\?<br><span>Open it on your TV\./.test(html) && /Useful controls for<br><span>the app you[’']re using\./.test(html) && /Your TVs\.<br><span>Your shortcuts\./.test(html) && /id="inside"/.test(html));
requireText("Each story uses native screenshots with their visible demo labels intact", /assets\/showcase\/youtube-share-review\.png/.test(html) && /assets\/showcase\/spotify-controls-manual-demo\.png/.test(html) && /assets\/showcase\/saved-tv-room-list-demo\.png/.test(html) && /local-demo header says no TV is connected/.test(html) && /actions marked Local demo/.test(html) && /local demo mode/.test(html));
requireText("YouTube and Spotify profiles are described as manually selected", /youtube-manual-controls\.png/.test(html) && /YouTube · chosen by you/.test(html) && /Spotify · chosen by you/.test(html) && /Previous and Next actions marked Local demo/.test(html));
requireText("Landing copy keeps the phone search proof and TV limitations clear", /A FREE PHONE REMOTE FOR ANDROID TV/.test(html) && /Use your phone keyboard to enter a YouTube search/.test(html) && /compatible Android TV and Google TV devices/.test(html) && !/pin up to three actions/i.test(html));
requireText("Compatibility limits and privacy route are clear", /compatible Android TV and Google TV devices/.test(html) && /Android TV Remote Service v2 is required/.test(html) && /href="privacy\/"/.test(html));
requireText("Native FAQ is available", (html.match(/<details\b/g) || []).length >= 4 && /<summary>Which TVs/.test(html));
requireText("Expanded FAQ uses a horizontal minus", /faq-list details\[open\] summary:after\{content:"-"\}/.test(css) && !/faq-list details\[open\] summary::after\s*\{\s*transform:\s*rotate\(45deg\)/.test(css));
requireText("Responsive CSS includes required layout and safe-area support", /@media\s*\(max-width:\s*740px\)/.test(css) && /@media\s*\(max-width:\s*420px\)/.test(css) && /env\(safe-area-inset-bottom\)/.test(css) && /data-mobile-cta-bar/.test(html));
requireText("Story screenshots retain their full native proportions on mobile and desktop", /\.story-phone-frame img\{display:block;width:100%;height:auto/.test(css) && /\.story-controls-stage/.test(css) && /@media\(max-width:740px\)[\s\S]*?\.story-controls-stage,.story-rooms-stage\{display:flex;flex-direction:column/.test(css));
requireText("CTA space adjusts to its rendered height", /data-mobile-cta-bar/.test(js) && /ResizeObserver/.test(js) && /--mobile-cta-reserve/.test(js));
requireText("Reduced motion and visible keyboard focus", /prefers-reduced-motion:\s*reduce/.test(css) && /prefers-reduced-motion:\s*reduce/.test(js) && /:focus-visible\s*\{[^}]*outline:/.test(css));
requireText("Focusable hero controls stay visible during motion", /gsap\.fromTo\(heroActions, \{ y: 14, autoAlpha: 1 \}/.test(js));
requireText("Section content remains opaque and uses preinitialized transform motion", sectionMotion.includes("const timeline = gsap.timeline({ paused: true })") && sectionMotion.includes("immediateRender: false") && sectionMotion.includes("gsap.set(target, pose)") && sectionMotion.includes("timeline.progress(initialProgress, true)") && !sectionMotion.includes("autoAlpha") && !sectionMotion.includes("opacity"));
requireText("Story motion is visibly scrubbed, reversible, and non-pinned", /sequenceStart = \(\) => "top bottom"/.test(js) && /const sequenceEnd = \(trigger\) => trigger === document\.querySelector\("\.closing-section"\)/.test(js) && /: "top 66%"/.test(js) && /: narrowMotion\.matches \? "top 43%" : "top 52%"/.test(js) && /animation: timeline/.test(sectionMotion) && /scrub: 0\.45/.test(js) && /y: 68/.test(js) && /scale: 0\.98/.test(js) && /document\.querySelectorAll\("\.story-chapter"\)/.test(js) && /trigger: stage\.closest\("\.story-chapter"\)/.test(js) && /end: "bottom top"/.test(js) && /\.scene-phone/.test(js) && /\.search-shot-frame/.test(js) && !/ScrollTrigger\.create\(\{[^}]*\bonce\s*:/s.test(js) && !/scrollTrigger:\s*\{[^}]*\bpin\s*:/s.test(js));
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
for (const relativePath of ["assets/showcase/youtube-share-review.png", "assets/showcase/youtube-manual-controls.png", "assets/showcase/spotify-controls-manual-demo.png", "assets/showcase/saved-tv-room-list-demo.png", "assets/showcase/tv-details-edit-demo.png"]) {
  const assetPath = path.join(root, relativePath);
  const png = existsSync(assetPath) ? readFileSync(assetPath) : Buffer.alloc(0);
  const genuineCapture = png.length >= 24 && png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && png.readUInt32BE(16) === 1080 && png.readUInt32BE(20) === 2340;
  requireText("Full-size native screenshot: " + relativePath, genuineCapture);
}
requireText("Unverified pinned-action screenshot is excluded", !existsSync(path.join(root, "assets/showcase/tv-actions-pinned-untested.png")));
requireText("Readable privacy policy", existsSync(path.join(root, "privacy/index.html")) && /<main\b/.test(read("privacy/index.html")) && /\.policy-section/.test(css));

if (failures.length) {
  console.error("Site check failed:\n- " + failures.join("\n- "));
  process.exitCode = 1;
} else {
  console.log("PASS: page structure, real app proof, contextual copy, honest beta status, responsive hooks, motion preferences, local libraries and licenses.");
}


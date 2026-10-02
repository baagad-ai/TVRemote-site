import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "site.js"), "utf8");
class Element {
  constructor(text = "") {
    this.textContent = text; this.className = ""; this.hidden = false; this.children = [];
    this.attributes = {}; this.events = {}; this.classes = new Set(); this.styles = {};
    this.classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      contains: (name) => this.classes.has(name),
      toggle: (name, force) => {
        const enabled = force === undefined ? !this.classes.has(name) : force;
        if (enabled) this.classes.add(name); else this.classes.delete(name);
        return enabled;
      }
    };
    this.style = { setProperty: (key, value) => { this.styles[key] = value; } };
  }
  setAttribute(key, value) { this.attributes[key] = value; }
  replaceWith(node) { this.replacement = node; }
  append(...nodes) { this.children.push(...nodes); }
  addEventListener(key, fn) { this.events[key] = fn; }
  querySelector() { return null; }
  getBoundingClientRect() { return { height: 72 }; }
}
function run(config, { reduce = false, motion = false } = {}) {
  const ctas = Array.from({ length: 4 }, () => new Element("Beta access coming soon"));
  const nodes = {
    betaStatus: new Element("The official Play opt-in will appear here."),
    betaAnswer: new Element("Not yet from this page."),
    note: new Element("The Play opt-in will be added here."),
    video: new Element(), placeholder: new Element(), caption: new Element("Placeholder"),
    intro: new Element("The beta film is being prepared."), mobileBar: new Element(),
    cards: [new Element(), new Element(), new Element()],
    hero: new Element(), other: new Element(), faq: new Element()
  };
  nodes.video.hidden = true;
  nodes.betaStatus.querySelector = (selector) => selector === "[data-beta-status-label]" ? new Element("The official Play opt-in will appear here.") : null;
  const media = { matches: reduce, events: {}, addEventListener(key, fn) { this.events[key] = fn; } };
  const selectorMap = {
    "[data-beta-answer]": nodes.betaAnswer, "[data-beta-video]": nodes.video,
    "[data-video-placeholder]": nodes.placeholder, "[data-video-caption]": nodes.caption,
    "[data-video-intro]": nodes.intro, "[data-mobile-cta-bar]": nodes.mobileBar
  };
  const handlers = {};
  const triggers = [];
  const gsapCalls = [];
  let resizeCallback = null, slept = 0, woke = 0, refreshed = 0, cleared = 0;
  const ScrollTrigger = {
    create(options) { const item = { options, isActive: false, killed: false, kill() { this.killed = true; } }; triggers.push(item); return item; },
    getAll() { return triggers; }, refresh() { refreshed += 1; }
  };
  const gsap = {
    registerPlugin(plugin) { assert.equal(plugin, ScrollTrigger); },
    fromTo(...args) { gsapCalls.push(args); },
    ticker: { sleep() { slept += 1; }, wake() { woke += 1; } },
    globalTimeline: { clear() { cleared += 1; } }
  };
  const context = {
    window: {
      remoteSiteConfig: config,
      matchMedia: () => media,
      getComputedStyle: () => ({ display: "grid" }),
      addEventListener(key, fn) { handlers["window:" + key] = fn; },
      ...(motion ? { gsap, ScrollTrigger } : {}),
      ResizeObserver: class { constructor(fn) { resizeCallback = fn; } observe() {} }
    },
    document: {
      body: (nodes.body = { style: { setProperty(key, value) { this[key] = value; } } }),
      hidden: false,
      getElementById: () => nodes.betaStatus,
      querySelector: (selector) => selectorMap[selector] || null,
      querySelectorAll: (selector) => {
        if (selector === "[data-beta-cta]") return ctas;
        if (selector === ".mobile-cta-note") return [nodes.note];
        if (selector === ".benefit-card") return nodes.cards;
        if (selector === ".benefit-card.is-current") return nodes.cards.filter((card) => card.classList.contains("is-current"));
        if (selector === ".search-proof, .benefit-card, .compatibility-section, .film-section, .questions-section, .closing-section") return [nodes.other, ...nodes.cards, nodes.faq];
        return [];
      },
      createElement: () => new Element(),
      addEventListener(key, fn) { handlers["document:" + key] = fn; }
    },
    ResizeObserver: class { constructor(fn) { resizeCallback = fn; } observe() {} }
  };
  vm.runInNewContext(script, context);
  return { ctas, nodes, media, handlers, triggers, gsapCalls, resize: () => resizeCallback?.(), setHidden: (value) => { context.document.hidden = value; }, values: () => ({ slept, woke, refreshed, cleared }) };
}

const absent = run({});
assert(absent.ctas.every((button) => !button.replacement));
assert.equal(absent.nodes.video.hidden, true);
assert.equal(absent.nodes.placeholder.hidden, false);
assert.match(absent.nodes.betaAnswer.textContent, /Not yet/);
assert.match(absent.nodes.intro.textContent, /prepared/);
assert.equal(absent.nodes.body.style["--mobile-cta-reserve"], "96px");
absent.nodes.mobileBar.getBoundingClientRect = () => ({ height: 111 });
absent.resize();
assert.equal(absent.nodes.body.style["--mobile-cta-reserve"], "135px");

const supplied = run({
  betaOptInUrl: "https://play.google.com/apps/testing/example",
  betaCtaLabel: "Join the beta",
  betaStatus: "Open the official opt-in",
  videoSrc: "assets/test.mp4",
  videoPoster: "assets/test.webp",
  videoCaptions: "assets/test.vtt"
});
assert(supplied.ctas.every((button) => button.replacement?.href === "https://play.google.com/apps/testing/example"));
assert(supplied.ctas.every((button) => button.replacement?.children[0]?.textContent === "Join the beta"));
assert(supplied.ctas.every((button) => button.replacement?.children[1]?.attributes["aria-hidden"] === "true"));
assert.match(supplied.nodes.betaAnswer.textContent, /Eligibility/);
assert.equal(supplied.nodes.video.hidden, false);
assert.equal(supplied.nodes.placeholder.hidden, true);
assert.equal(supplied.nodes.video.children[0].src, "assets/test.vtt");
assert.equal(supplied.nodes.video.children[0].kind, "captions");
assert.equal(supplied.nodes.video.poster, "assets/test.webp");

const reduced = run({}, { reduce: true, motion: true });
assert.equal(reduced.gsapCalls.length, 0);
const animated = run({}, { motion: true });
assert(animated.gsapCalls.length >= 1);
assert(animated.triggers.length >= 4);
animated.triggers.at(-1).options.onToggle({ isActive: true });
assert(animated.nodes.cards[2].classList.contains("is-current"));
animated.setHidden(true); animated.handlers["document:visibilitychange"](); assert.equal(animated.values().slept, 1); animated.setHidden(false); animated.handlers["document:visibilitychange"](); assert.equal(animated.values().woke, 1); assert.equal(animated.values().refreshed, 1);
animated.media.matches = true;
animated.media.events.change({ matches: true });
assert.equal(animated.values().cleared, 1);
assert(animated.triggers.every((trigger) => trigger.killed));
assert(!animated.nodes.cards[2].classList.contains("is-current"));
console.log("PASS: beta/video states, CTA reserve resizing, GSAP scroll emphasis, and reduced-motion shutdown.");

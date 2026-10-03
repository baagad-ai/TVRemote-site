import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "site.js"), "utf8");
class Element {
  constructor(text = "") {
    this.textContent = text; this.className = ""; this.hidden = false; this.children = [];
    this.tagName = "DIV";
    this.attributes = {}; this.events = {}; this.classes = new Set(); this.styles = {};
    this.display = "block";
    this.rect = { height: 72, top: 100, bottom: 172, left: 20, right: 340 };
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
    this.style = { setProperty: (key, value) => { this.styles[key] = value; }, removeProperty: (key) => { delete this.styles[key]; } };
  }
  setAttribute(key, value) { this.attributes[key] = value; }
  removeAttribute(key) { delete this.attributes[key]; }
  toggleAttribute(key, force) { if (force) this.attributes[key] = ""; else delete this.attributes[key]; }
  matches(selector) {
    if (selector === ":disabled") return this.disabled === true;
    if (selector === "summary") return this.tagName === "SUMMARY";
    if (selector.includes("a, button")) return ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "SUMMARY"].includes(this.tagName) || this.tabIndex >= 0;
    return false;
  }
  contains(node) { return Boolean(node) && (node === this || this.children.some((child) => child === node || child.replacement === node)); }
  focus() { this.focused = true; }
  blur() { this.focused = false; }
  replaceWith(node) { node.rect = this.rect; node.display = this.display; node.tagName = "A"; this.replacement = node; }
  append(...nodes) { this.children.push(...nodes); }
  addEventListener(key, fn) { this.events[key] = fn; }
  querySelector() { return null; }
  getBoundingClientRect() { return this.rect; }
  querySelectorAll(selector) {
    this.descendants ||= new Map();
    if (!this.descendants.has(selector)) {
      const target = new Element();
      if (selector === "summary") target.tagName = "SUMMARY";
      if (selector.includes(".closing-cta")) target.tagName = "BUTTON";
      if (selector.includes(".text-link")) target.tagName = "A";
      this.descendants.set(selector, [target]);
    }
    return this.descendants.get(selector);
  }
}
function run(config, { reduce = false, motion = false, mobile = true } = {}) {
  const ctas = Array.from({ length: 4 }, () => new Element("Beta access coming soon"));
  ctas.forEach((cta) => { cta.disabled = true; });
  const nodes = {
    betaStatus: new Element("The official Play opt-in will appear here."),
    betaAnswer: new Element("Not yet from this page."),
    note: new Element("The Play opt-in will be added here."),
    video: new Element(), placeholder: new Element(), caption: new Element("Placeholder"),
    intro: new Element("The beta film is being prepared."), mobileBar: new Element(),
    headerCta: ctas[0], heroCta: ctas[1], closingCta: ctas[2], mobileCta: ctas[3],
    cards: [new Element(), new Element(), new Element()],
    hero: new Element(), search: new Element(), heading: new Element(), compatibility: new Element(),
    film: new Element(), questionsHeading: new Element(), closing: new Element(), other: new Element(), faq: new Element(),
    heroTargets: Array.from({ length: 5 }, () => new Element()),
    heroActions: [new Element(), new Element()], phone: new Element(), searchShot: new Element()
  };
  nodes.mobileBar.children = [nodes.mobileCta];
  nodes.headerCta.display = mobile ? "none" : "grid";
  nodes.heroCta.rect = { height: 58, top: 100, bottom: 158, left: 20, right: 340 };
  nodes.closingCta.rect = { height: 58, top: 1300, bottom: 1358, left: 20, right: 340 };
  nodes.video.hidden = true;
  nodes.betaStatus.querySelector = (selector) => selector === "[data-beta-status-label]" ? new Element("The official Play opt-in will appear here.") : null;
  const media = { matches: reduce, events: {}, addEventListener(key, fn) { this.events[key] = fn; } };
  const selectorMap = {
    "[data-beta-answer]": nodes.betaAnswer, "[data-beta-video]": nodes.video,
    "[data-video-placeholder]": nodes.placeholder, "[data-video-caption]": nodes.caption,
    "[data-video-intro]": nodes.intro, "[data-mobile-cta-bar]": nodes.mobileBar,
    ".hero-cta": nodes.heroCta.replacement || nodes.heroCta,
    ".search-proof": nodes.search, ".section-heading": nodes.heading,
    ".compatibility-section": nodes.compatibility, ".film-section": nodes.film,
    ".questions-heading": nodes.questionsHeading, ".closing-section": nodes.closing,
    ".hero": nodes.hero, ".scene-phone": nodes.phone, ".search-shot-frame": nodes.searchShot
  };
  const handlers = {};
  const triggers = [];
  const timelines = [];
  const gsapCalls = [];
  const observers = [];
  let resizeCallback = null, slept = 0, woke = 0, refreshed = 0, cleared = 0, rafId = 0;
  const rafCallbacks = [];
  const motionMedia = { matches: reduce, events: {}, addEventListener(key, fn) { this.events[key] = fn; } };
  const mobileMedia = { matches: mobile, events: {}, addEventListener(key, fn) { this.events[key] = fn; } };
  class MockIntersectionObserver {
    constructor(callback) { this.callback = callback; this.targets = []; observers.push(this); }
    observe(target) { this.targets.push(target); }
  }
  const ScrollTrigger = {
    create(options) { const item = { options, isActive: false, killed: false, kill() { this.killed = true; } }; triggers.push(item); return item; },
    getAll() { return triggers; }, refresh() { refreshed += 1; }
  };
  const gsap = {
    registerPlugin(plugin) { assert.equal(plugin, ScrollTrigger); },
    fromTo(...args) { gsapCalls.push(args); },
    timeline() { const timeline = { steps: [], played: false, reversed: false, fromTo(...args) { this.steps.push(args); gsapCalls.push(args); return this; }, play() { this.played = true; this.reversed = false; return this; }, reverse() { this.reversed = true; return this; }, kill() { this.killed = true; } }; timelines.push(timeline); return timeline; },
    set() {},
    ticker: { sleep() { slept += 1; }, wake() { woke += 1; } },
    globalTimeline: { clear() { cleared += 1; } }
  };
  const context = {
    window: {
      remoteSiteConfig: config,
      matchMedia: (query) => query.includes("max-width") ? mobileMedia : motionMedia,
      getComputedStyle: (element) => ({ display: element?.display || "grid" }),
      addEventListener(key, fn) { handlers["window:" + key] = fn; },
      IntersectionObserver: MockIntersectionObserver,
      requestAnimationFrame(callback) { rafCallbacks.push(callback); return ++rafId; },
      innerWidth: 390,
      innerHeight: 844,
      ...(motion ? { gsap, ScrollTrigger } : {}),
      ResizeObserver: class { constructor(fn) { resizeCallback = fn; } observe() {} }
    },
    document: {
      body: (nodes.body = { style: { setProperty(key, value) { this[key] = value; } } }),
      hidden: false,
      getElementById: () => nodes.betaStatus,
      querySelector: (selector) => selectorMap[selector] || null,
      querySelectorAll: (selector) => {
        if (selector === "[data-beta-cta]") return ctas.map((button) => button.replacement || button);
        if (selector === ".mobile-cta-note") return [nodes.note];
        if (selector === ".benefit-card") return nodes.cards;
        if (selector === ".benefit-card.is-current") return nodes.cards.filter((card) => card.classList.contains("is-current"));
        if (selector === ".hero-copy .eyebrow, .hero-copy h1, .hero-lede, .hero-facts, .availability") return nodes.heroTargets;
        if (selector === ".hero-actions > .hero-cta, .hero-actions > .text-link") return nodes.heroActions;
        if (selector === ".faq-list details") return [nodes.faq];
        return [];
      },
      activeElement: null,
      createElement: () => new Element(),
      addEventListener(key, fn) { handlers["document:" + key] = fn; }
    },
    ResizeObserver: class { constructor(fn) { resizeCallback = fn; } observe() {} },
    IntersectionObserver: MockIntersectionObserver
  };
  const tracked = [...ctas, ...nodes.heroActions];
  tracked.forEach((element) => {
    element.focus = function () { this.focused = true; context.document.activeElement = this; };
    element.blur = function () { this.focused = false; if (context.document.activeElement === this) context.document.activeElement = null; };
  });
  context.document.createElement = () => {
    const element = new Element();
    element.focus = function () { this.focused = true; context.document.activeElement = this; };
    element.blur = function () { this.focused = false; if (context.document.activeElement === this) context.document.activeElement = null; };
    return element;
  };
  vm.runInNewContext(script, context);
  const flushFrames = () => { while (rafCallbacks.length) rafCallbacks.shift()(0); };
  const setCtaVisible = (cta, visible) => {
    cta.rect = { height: 58, top: visible ? 100 : 1000, bottom: visible ? 158 : 1058, left: 20, right: 340 };
    observers.find((observer) => observer.targets.includes(cta))?.callback([{ target: cta, isIntersecting: visible, intersectionRatio: visible ? 1 : 0 }]);
    flushFrames();
  };
  return { ctas, nodes, document: context.document, media: motionMedia, mobileMedia, handlers, triggers, timelines, gsapCalls, observers,
    setCtaVisible,
    resize: () => resizeCallback?.(), setHidden: (value) => { context.document.hidden = value; }, values: () => ({ slept, woke, refreshed, cleared }) };
}

const absent = run({});
assert(absent.ctas.every((button) => !button.replacement));
assert.equal(absent.nodes.video.hidden, true);
assert.equal(absent.nodes.placeholder.hidden, false);
assert.match(absent.nodes.betaAnswer.textContent, /Not yet/);
assert.match(absent.nodes.intro.textContent, /prepared/);
assert.equal(absent.nodes.body.style["--mobile-cta-reserve"], "88px");
assert.equal(absent.nodes.mobileBar.attributes["aria-hidden"], "true");
assert.equal(absent.nodes.mobileBar.attributes.inert, "");
assert(!absent.nodes.mobileBar.classList.contains("is-visible"));
absent.setCtaVisible(absent.nodes.heroCta, false);
assert(absent.nodes.mobileBar.classList.contains("is-visible"));
assert.equal(absent.nodes.mobileBar.attributes["aria-hidden"], "false");
assert.equal(absent.nodes.mobileBar.attributes.inert, undefined);
absent.setCtaVisible(absent.nodes.closingCta, true);
assert(!absent.nodes.mobileBar.classList.contains("is-visible"));
assert.equal(absent.nodes.mobileBar.attributes.inert, "");
absent.setCtaVisible(absent.nodes.closingCta, false);
assert(absent.nodes.mobileBar.classList.contains("is-visible"));
absent.setCtaVisible(absent.nodes.heroCta, true);
assert(!absent.nodes.mobileBar.classList.contains("is-visible"));
absent.nodes.mobileBar.getBoundingClientRect = () => ({ height: 111 });
absent.resize();
assert.equal(absent.nodes.body.style["--mobile-cta-reserve"], "127px");

const supplied = run({
  betaOptInUrl: "https://play.google.com/apps/testing/example",
  betaCtaLabel: "Join the beta",
  betaStatus: "Open the official opt-in",
  videoSrc: "assets/test.mp4",
  videoPoster: "assets/test.webp",
  videoCaptions: "assets/test.vtt"
});
assert(supplied.ctas.every((button) => button.replacement?.href === "https://play.google.com/apps/testing/example"));
assert(supplied.ctas.every((button) => button.replacement?.attributes["data-beta-cta"] === ""));
assert(supplied.ctas.every((button) => button.replacement?.children[0]?.textContent === "Join the beta"));
assert(supplied.ctas.every((button) => button.replacement?.children[1]?.attributes["aria-hidden"] === "true"));
assert.match(supplied.nodes.betaAnswer.textContent, /Eligibility/);
assert.equal(supplied.nodes.video.hidden, false);
assert.equal(supplied.nodes.placeholder.hidden, true);
assert.equal(supplied.nodes.video.children[0].src, "assets/test.vtt");
assert.equal(supplied.nodes.video.children[0].kind, "captions");
assert.equal(supplied.nodes.video.poster, "assets/test.webp");
supplied.setCtaVisible(supplied.ctas[1].replacement, false);
const suppliedSticky = supplied.ctas[3].replacement;
const suppliedClosing = supplied.ctas[2].replacement;
supplied.document.activeElement = suppliedSticky;
supplied.setCtaVisible(suppliedClosing, true);
assert.equal(supplied.document.activeElement, suppliedClosing);
assert.equal(supplied.nodes.mobileBar.attributes.inert, "");

const reduced = run({}, { reduce: true, motion: true });
assert.equal(reduced.gsapCalls.length, 0);
const animated = run({}, { motion: true });
assert(animated.gsapCalls.length >= 1);
const revealTriggers = animated.triggers.filter((trigger) => trigger.options.onEnter);
assert(revealTriggers.length >= 10);
revealTriggers.forEach((trigger) => trigger.options.onEnter());
assert(animated.timelines.length >= 10);
assert(animated.timelines.every((timeline) => timeline.played && timeline.steps.length > 0));
revealTriggers.forEach((trigger) => trigger.options.onLeaveBack());
assert(animated.timelines.every((timeline) => timeline.reversed));
const closingReveal = animated.triggers.find((trigger) => trigger.options.trigger === animated.nodes.closing && trigger.options.onEnter);
assert.equal(animated.timelines[animated.triggers.filter((trigger) => trigger.options.onEnter).indexOf(closingReveal)].steps.at(-1)[1].autoAlpha, 1);
assert(animated.triggers.length >= 13);
animated.triggers.at(-1).options.onToggle({ isActive: true });
assert(animated.nodes.cards[2].classList.contains("is-current"));
animated.setHidden(true); animated.handlers["document:visibilitychange"](); assert.equal(animated.values().slept, 1); animated.setHidden(false); animated.handlers["document:visibilitychange"](); assert.equal(animated.values().woke, 1); assert.equal(animated.values().refreshed, 1);
animated.media.matches = true;
animated.media.events.change({ matches: true });
assert.equal(animated.values().cleared, 1);
assert(animated.triggers.every((trigger) => trigger.killed));
assert(!animated.nodes.cards[2].classList.contains("is-current"));
console.log("PASS: beta/video states, CTA reserve resizing, GSAP scroll emphasis, and reduced-motion shutdown.");

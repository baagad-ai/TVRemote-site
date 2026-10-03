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
    this.rect = { height: 72, top: 1000, bottom: 1072, left: 20, right: 340 };
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
function run(config, { reduce = false, motion = false, mobile = true, scrollY = 0, triggerTop = 1000 } = {}) {
  const ctas = Array.from({ length: 4 }, () => new Element("Join the beta"));
  ctas.forEach((cta) => { cta.disabled = true; });
  const nodes = {
    betaStatus: new Element("Google Play beta access is not open yet."),
    betaStatusLabel: new Element("Google Play beta access is not open yet."),
    betaAnswer: new Element("Not yet from this page."),
    note: new Element("Google Play beta access is not open yet."), mobileBar: new Element(),
    headerCta: ctas[0], heroCta: ctas[1], closingCta: ctas[2], mobileCta: ctas[3],
    cards: [new Element(), new Element(), new Element()],
    hero: new Element(), search: new Element(), heading: new Element(), compatibility: new Element(),
    questionsHeading: new Element(), closing: new Element(), other: new Element(), faq: new Element(),
    heroTargets: Array.from({ length: 5 }, () => new Element()),
    heroActions: [new Element(), new Element()], phone: new Element(), searchShot: new Element()
  };
  [nodes.search, nodes.heading, ...nodes.cards, nodes.compatibility, nodes.questionsHeading, nodes.faq, nodes.closing].forEach((node) => {
    node.rect = { ...node.rect, top: triggerTop, bottom: triggerTop + node.rect.height };
  });
  nodes.mobileBar.children = [nodes.mobileCta];
  nodes.headerCta.display = mobile ? "none" : "grid";
  nodes.heroCta.rect = { height: 58, top: 100, bottom: 158, left: 20, right: 340 };
  nodes.closingCta.rect = { height: 58, top: 1300, bottom: 1358, left: 20, right: 340 };
  nodes.betaStatus.querySelector = (selector) => selector === "[data-beta-status-label]" ? nodes.betaStatusLabel : null;
  const media = { matches: reduce, events: {}, addEventListener(key, fn) { this.events[key] = fn; } };
  const selectorMap = {
    "[data-beta-answer]": nodes.betaAnswer, "[data-mobile-cta-bar]": nodes.mobileBar,
    ".hero-cta": nodes.heroCta.replacement || nodes.heroCta,
    ".search-proof": nodes.search, ".section-heading": nodes.heading,
    ".compatibility-section": nodes.compatibility,
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
    timeline() { const timeline = { steps: [], progressValue: 0, fromTo(...args) { this.steps.push(args); gsapCalls.push(args); return this; }, progress(value) { if (value === undefined) return this.progressValue; this.progressValue = value; return this; }, kill() { this.killed = true; } }; timelines.push(timeline); return timeline; },
    set(...args) { gsapCalls.push(args); },
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
      scrollY,
      ...(motion ? { gsap, ScrollTrigger } : {}),
      ResizeObserver: class { constructor(fn) { resizeCallback = fn; } observe() {} }
    },
    document: {
      body: (nodes.body = { style: { setProperty(key, value) { this[key] = value; }, removeProperty(key) { delete this[key]; } } }),
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
assert.match(absent.nodes.betaAnswer.textContent, /Not yet/);
assert.match(absent.nodes.betaStatus.textContent, /not open yet/);
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
  betaStatus: "Google Play beta access is open."
});
assert(supplied.ctas.every((button) => button.replacement?.href === "https://play.google.com/apps/testing/example"));
assert(supplied.ctas.every((button) => button.replacement?.attributes["data-beta-cta"] === ""));
assert(supplied.ctas.every((button) => button.replacement?.children[0]?.textContent === "Join the beta"));
assert(supplied.ctas.every((button) => button.replacement?.children[1]?.attributes["aria-hidden"] === "true"));
assert.match(supplied.nodes.betaAnswer.textContent, /Eligibility/);
assert.match(supplied.nodes.betaStatusLabel.textContent, /is open/);
assert.match(supplied.nodes.note.textContent, /official Google Play beta opt-in/);
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
const revealTriggers = animated.triggers.filter((trigger) => trigger.options.animation);
assert(revealTriggers.length >= 9);
assert(animated.timelines.length >= 9);
assert(animated.timelines.every((timeline) => timeline.steps.length > 0));
assert(revealTriggers.every((trigger) => trigger.options.animation && trigger.options.scrub === 0.45 && trigger.options.start() === "top bottom" && typeof trigger.options.end === "function"));
assert(animated.timelines.every((timeline) => timeline.progressValue === 0));
const closingReveal = animated.triggers.find((trigger) => trigger.options.trigger === animated.nodes.closing && trigger.options.animation);
assert.equal(closingReveal.options.end(), "top 43%");
const closingTimeline = closingReveal.options.animation;
const closingCtaMotion = closingTimeline.steps.at(-1);
assert.equal(closingCtaMotion[1].immediateRender, false);
assert.equal(closingCtaMotion[1].y, 38);
assert.equal(closingCtaMotion[2].y, 0);
assert.equal("autoAlpha" in closingCtaMotion[1], false);
assert.equal("autoAlpha" in closingCtaMotion[2], false);
assert(animated.gsapCalls.some((call) => call[1]?.y === 44));
assert(animated.gsapCalls.some((call) => call[1]?.y === 46));
const sectionTimelinesOpaque = animated.timelines.every((timeline) => timeline.steps.every((step) => {
  return !("autoAlpha" in (step[1] || {})) && !("autoAlpha" in (step[2] || {}));
}));
assert(sectionTimelinesOpaque);
assert(animated.triggers.length >= 12);
animated.triggers.at(-1).options.onToggle({ isActive: true });
assert(animated.nodes.cards[2].classList.contains("is-current"));
animated.setHidden(true); animated.handlers["document:visibilitychange"](); assert.equal(animated.values().slept, 1); animated.setHidden(false); animated.handlers["document:visibilitychange"](); assert.equal(animated.values().woke, 1); assert.equal(animated.values().refreshed, 1);
animated.media.matches = true;
animated.media.events.change({ matches: true });
assert.equal(animated.values().cleared, 1);
assert(animated.triggers.every((trigger) => trigger.killed));
assert(!animated.nodes.cards[2].classList.contains("is-current"));
const restored = run({}, { motion: true, scrollY: 400, triggerTop: 600 });
assert(restored.timelines.every((timeline) => timeline.progressValue > 0.5 && timeline.progressValue < 0.6));
const desktopAnimated = run({}, { motion: true, mobile: false });
const desktopClosing = desktopAnimated.triggers.find((trigger) => trigger.options.trigger === desktopAnimated.nodes.closing && trigger.options.animation);
assert.equal(desktopClosing.options.end(), "top 66%");
assert(desktopAnimated.triggers.filter((trigger) => trigger.options.animation && trigger.options.trigger !== desktopAnimated.nodes.closing).every((trigger) => trigger.options.end() === "top 52%"));
console.log("PASS: beta states, CTA reserve resizing, GSAP scroll emphasis, and reduced-motion shutdown.");

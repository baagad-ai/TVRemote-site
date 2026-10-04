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
    this.open = false;
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
  setAttribute(key, value) { this.attributes[key] = value; if (key === "open") this.open = true; }
  removeAttribute(key) { delete this.attributes[key]; if (key === "open") this.open = false; }
  toggleAttribute(key, force) { if (force) this.attributes[key] = ""; else delete this.attributes[key]; }
  matches(selector) {
    if (selector === ":disabled") return this.disabled === true;
    if (selector === "summary") return this.tagName === "SUMMARY";
    if (selector.includes("a, button")) return ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "SUMMARY"].includes(this.tagName) || this.tabIndex >= 0;
    return false;
  }
  closest(selector) { return selector === ".story-chapter" ? this.storyChapter || null : null; }
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
  const ctas = Array.from({ length: 4 }, () => new Element("Request beta access"));
  ctas.forEach((cta) => { cta.disabled = true; });
  const nodes = {
    betaStatus: new Element("The Remote already has testers."),
    betaStatusLabel: new Element("The Remote already has testers."),
    betaAnswer: new Element("Request beta access with your Google Play account email. Requests are reviewed privately; approved accounts are invited manually through Google Play."),
    closingTitle: new Element("Request beta access with your Google Play account email."),
    closingCopy: new Element("Requests are reviewed privately. If approved, the developer will manually invite your Google Play account to the closed test; you must accept the invitation before installing."),
    betaEnrollment: new Element(), betaSummary: new Element("How do I request beta access?"),
    note: new Element("Requests are reviewed privately; approved accounts are invited manually through Google Play."), mobileBar: new Element(),
    headerCta: ctas[0], heroCta: ctas[1], closingCta: ctas[2], mobileCta: ctas[3],
    storyChapters: [new Element(), new Element(), new Element()],
    storyStages: [new Element(), new Element(), new Element()],
    hero: new Element(), search: new Element(), heading: new Element(), compatibility: new Element(),
    questionsHeading: new Element(), closing: new Element(), other: new Element(), faq: new Element(),
    heroTargets: Array.from({ length: 5 }, () => new Element()),
    heroActions: [new Element(), new Element()], phone: new Element(), searchShot: new Element()
  };
  nodes.betaEnrollment.open = true;
  nodes.betaEnrollment.querySelector = (selector) => selector === "summary" ? nodes.betaSummary : null;
  nodes.betaSummary.tagName = "SUMMARY";
  nodes.storyStages.forEach((stage, index) => { stage.storyChapter = nodes.storyChapters[index]; });
  [nodes.search, nodes.heading, ...nodes.storyChapters, nodes.compatibility, nodes.questionsHeading, nodes.faq, nodes.closing].forEach((node) => {
    node.rect = { ...node.rect, top: triggerTop, bottom: triggerTop + node.rect.height };
  });
  nodes.mobileBar.children = [nodes.mobileCta];
  nodes.headerCta.display = mobile ? "none" : "grid";
  nodes.heroCta.rect = { height: 58, top: 100, bottom: 158, left: 20, right: 340 };
  nodes.closingCta.rect = { height: 58, top: 1300, bottom: 1358, left: 20, right: 340 };
  nodes.betaStatus.querySelector = (selector) => selector === "[data-beta-status-label]" ? nodes.betaStatusLabel : null;
  const media = { matches: reduce, events: {}, addEventListener(key, fn) { this.events[key] = fn; } };
  const selectorMap = {
    "[data-beta-answer]": nodes.betaAnswer,
    "[data-beta-closing-title]": nodes.closingTitle, "[data-beta-closing-copy]": nodes.closingCopy,
    "[data-mobile-cta-bar]": nodes.mobileBar,
    ".hero-cta": nodes.heroCta.replacement || nodes.heroCta,
    ".search-proof": nodes.search,
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
      getElementById: (id) => id === "beta-enrollment" ? nodes.betaEnrollment : nodes.betaStatus,
      querySelector: (selector) => selectorMap[selector] || null,
      querySelectorAll: (selector) => {
        if (selector === "[data-beta-cta]") return ctas.map((button) => button.replacement || button);
        if (selector === ".mobile-cta-note") return [nodes.note];
        if (selector === ".story-chapter") return nodes.storyChapters;
        if (selector === ".story-stage") return nodes.storyStages;
        if (selector === ".story-chapter.is-current") return nodes.storyChapters.filter((chapter) => chapter.classList.contains("is-current"));
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
  const tracked = [...ctas, ...nodes.heroActions, nodes.betaSummary];
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
  const setGuideVisible = (visible, open = true) => {
    if (open) nodes.betaEnrollment.setAttribute("open", "");
    else nodes.betaEnrollment.removeAttribute("open");
    nodes.betaEnrollment.rect = { height: 500, top: visible ? 100 : 1000, bottom: visible ? 600 : 1500, left: 20, right: 370 };
    nodes.betaEnrollment.events.toggle?.();
    flushFrames();
  };
  return { ctas, nodes, document: context.document, media: motionMedia, mobileMedia, handlers, triggers, timelines, gsapCalls, observers,
    setCtaVisible, setGuideVisible,
    resize: () => resizeCallback?.(), setHidden: (value) => { context.document.hidden = value; }, values: () => ({ slept, woke, refreshed, cleared }) };
}

const absent = run({});
assert(absent.ctas.every((button) => !button.replacement));
assert.equal(absent.nodes.body.style["--mobile-cta-reserve"], "88px");
assert.equal(absent.nodes.mobileBar.attributes["aria-hidden"], "true");
assert.equal(absent.nodes.mobileBar.attributes.inert, "");
absent.setCtaVisible(absent.nodes.heroCta, false);
assert(absent.nodes.mobileBar.classList.contains("is-visible"));
absent.setCtaVisible(absent.nodes.closingCta, true);
assert(!absent.nodes.mobileBar.classList.contains("is-visible"));
absent.nodes.mobileBar.getBoundingClientRect = () => ({ height: 111 });
absent.resize();
assert.equal(absent.nodes.body.style["--mobile-cta-reserve"], "127px");
const endpoint = "https://the-remote-beta-requests.account.workers.dev/beta-requests";
const sitekey = "0x4AAAAAAAAAAAAAAAAAAAAAAAA";
for (const config of [{ betaRequestUrl: endpoint }, { turnstileSiteKey: sitekey },
  { betaRequestUrl: "https://evil.example/beta-requests", turnstileSiteKey: sitekey },
  { betaRequestUrl: endpoint + "?email=x", turnstileSiteKey: sitekey },
  { betaRequestUrl: endpoint, turnstileSiteKey: "1x00000000000000000000AA" }]) {
  assert(run(config).ctas.every((button) => !button.replacement));
}
const supplied = run({ betaRequestUrl: endpoint, turnstileSiteKey: sitekey });
assert(supplied.ctas.every((button) => button.replacement?.href === "#beta-enrollment"));
assert(supplied.ctas.every((button) => button.replacement?.attributes["aria-controls"] === "beta-enrollment"));
assert(supplied.ctas.every((button) => button.replacement?.children[0]?.textContent === "Request beta access"));
assert.match(supplied.nodes.betaStatusLabel.textContent, /official Google Play beta sign-up link will be added when ready/);
assert.match(supplied.nodes.betaAnswer.textContent, /does not enroll you/);
assert.match(supplied.nodes.closingCopy.textContent, /manually invite/);
assert.match(supplied.nodes.betaAnswer.textContent, /manually invite/);
supplied.ctas[1].replacement.events.click();
assert.equal(supplied.nodes.betaEnrollment.attributes.open, "");
supplied.setCtaVisible(supplied.ctas[1].replacement, false);
const suppliedSticky = supplied.ctas[3].replacement;
const suppliedClosing = supplied.ctas[2].replacement;
supplied.document.activeElement = suppliedSticky;
supplied.setGuideVisible(true);
assert(!supplied.nodes.mobileBar.classList.contains("is-visible"));
assert.equal(supplied.document.activeElement, supplied.nodes.betaSummary);
supplied.setGuideVisible(false);
assert(supplied.nodes.mobileBar.classList.contains("is-visible"));
supplied.document.activeElement = suppliedSticky;
supplied.setCtaVisible(suppliedClosing, true);
assert.equal(supplied.document.activeElement, suppliedClosing);
assert.equal(supplied.nodes.mobileBar.attributes.inert, "");

const reduced = run({}, { reduce: true, motion: true });
assert.equal(reduced.gsapCalls.length, 0);
const animated = run({}, { motion: true });
assert(animated.gsapCalls.length >= 1);
const revealTriggers = animated.triggers.filter((trigger) => trigger.options.animation);
assert(revealTriggers.length >= 8);
assert(animated.timelines.length >= 8);
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
assert(animated.gsapCalls.some((call) => call[1]?.y === 68));
assert(animated.gsapCalls.some((call) => call[1]?.y === 46));
assert(animated.gsapCalls.some((call) => call[1]?.y === 38 && call[2]?.y === -50));
const sectionTimelinesOpaque = animated.timelines.every((timeline) => timeline.steps.every((step) => {
  return !("autoAlpha" in (step[1] || {})) && !("autoAlpha" in (step[2] || {}));
}));
assert(sectionTimelinesOpaque);
assert(animated.triggers.length >= 11);
animated.triggers.at(-1).options.onToggle({ isActive: true });
assert(animated.nodes.storyChapters[2].classList.contains("is-current"));
animated.setHidden(true); animated.handlers["document:visibilitychange"](); assert.equal(animated.values().slept, 1); animated.setHidden(false); animated.handlers["document:visibilitychange"](); assert.equal(animated.values().woke, 1); assert.equal(animated.values().refreshed, 1);
animated.media.matches = true;
animated.media.events.change({ matches: true });
assert.equal(animated.values().cleared, 1);
assert(animated.triggers.every((trigger) => trigger.killed));
assert(!animated.nodes.storyChapters[2].classList.contains("is-current"));
const restored = run({}, { motion: true, scrollY: 400, triggerTop: 600 });
assert(restored.timelines.every((timeline) => timeline.progressValue > 0.5 && timeline.progressValue < 0.6));
const desktopAnimated = run({}, { motion: true, mobile: false });
const desktopClosing = desktopAnimated.triggers.find((trigger) => trigger.options.trigger === desktopAnimated.nodes.closing && trigger.options.animation);
assert.equal(desktopClosing.options.end(), "top 66%");
assert(desktopAnimated.triggers.filter((trigger) => trigger.options.animation && trigger.options.trigger !== desktopAnimated.nodes.closing).every((trigger) => trigger.options.end() === "top 52%"));
console.log("PASS: beta states, CTA reserve resizing, GSAP scroll emphasis, and reduced-motion shutdown.");


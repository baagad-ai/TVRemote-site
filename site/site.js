(() => {
  "use strict";

  const config = window.remoteSiteConfig || {};
  const betaStatus = document.getElementById("beta-status");
  const configuredUrl = typeof config.betaOptInUrl === "string" ? config.betaOptInUrl.trim() : "";
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (configuredUrl) {
    document.querySelectorAll("[data-beta-cta]").forEach((button) => {
      const link = document.createElement("a");
      link.className = button.className;
      link.href = configuredUrl;
      link.setAttribute("data-beta-cta", "");
      link.setAttribute("aria-describedby", "beta-status");

      const label = document.createElement("span");
      label.textContent = config.betaCtaLabel || "Join the beta";
      const arrow = document.createElement("span");
      arrow.className = "cta-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = String.fromCharCode(8594);
      link.append(label, arrow);
      button.replaceWith(link);
    });

    if (betaStatus) {
      const statusLabel = betaStatus.querySelector?.("[data-beta-status-label]");
      if (statusLabel) statusLabel.textContent = config.betaStatus || "The official Play opt-in is ready.";
      else betaStatus.textContent = config.betaStatus || "The official Play opt-in is ready.";
      betaStatus.classList.add("is-open");
    }

    const betaAnswer = document.querySelector("[data-beta-answer]");
    if (betaAnswer) betaAnswer.textContent = "Use the beta button to open the official Play opt-in. Eligibility and access details are shown there; no signup details are collected on this page.";
    document.querySelectorAll(".mobile-cta-note").forEach((note) => {
      note.textContent = "Opens the official Play beta opt-in.";
    });
  }

  const video = document.querySelector("[data-beta-video]");
  const videoPlaceholder = document.querySelector("[data-video-placeholder]");
  const videoCaption = document.querySelector("[data-video-caption]");
  const configuredVideo = typeof config.videoSrc === "string" ? config.videoSrc.trim() : "";
  if (video && videoPlaceholder && configuredVideo) {
    video.src = configuredVideo;
    if (typeof config.videoPoster === "string" && config.videoPoster.trim()) video.poster = config.videoPoster.trim();
    if (typeof config.videoCaptions === "string" && config.videoCaptions.trim()) {
      const track = document.createElement("track");
      track.kind = "captions";
      track.label = "English captions";
      track.srclang = "en";
      track.src = config.videoCaptions.trim();
      track.default = true;
      video.append(track);
    }
    const videoIntro = document.querySelector("[data-video-intro]");
    if (videoIntro) videoIntro.textContent = "See The Remote in use. Start the video when you are ready.";
    video.hidden = false;
    videoPlaceholder.hidden = true;
    if (videoCaption) videoCaption.textContent = "The Remote beta walkthrough. Use the player controls to watch.";
  }

  const mobileCtaBar = document.querySelector("[data-mobile-cta-bar]");
  const mobileCtaBreakpoint = window.matchMedia("(max-width: 740px)");
  const inlineCtas = Array.from(document.querySelectorAll("[data-beta-cta]"))
    .filter((cta) => mobileCtaBar && !mobileCtaBar.contains(cta));
  if (mobileCtaBar && inlineCtas.length && document.body) {
    const ctaIntersectsViewport = (cta) => {
      if (window.getComputedStyle(cta).display === "none") return false;
      const rect = cta.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
    };
    const updateCtaReserve = () => {
      if (!mobileCtaBreakpoint.matches) {
        document.body.style.removeProperty("--mobile-cta-reserve");
        return;
      }
      const reserve = Math.ceil(mobileCtaBar.getBoundingClientRect().height + 16);
      document.body.style.setProperty("--mobile-cta-reserve", reserve + "px");
    };
    const setMobileCtaVisible = (inlineCtaInView, focusTarget) => {
      const visible = mobileCtaBreakpoint.matches && !inlineCtaInView;
      const focusedCta = document.activeElement && mobileCtaBar.contains(document.activeElement)
        ? document.activeElement
        : null;
      if (!visible && focusedCta) {
        if (focusTarget && !focusTarget.matches(":disabled")) focusTarget.focus({ preventScroll: true });
        else focusedCta.blur();
      }
      mobileCtaBar.classList.toggle("is-visible", visible);
      mobileCtaBar.toggleAttribute("inert", !visible);
      mobileCtaBar.setAttribute("aria-hidden", String(!visible));
    };
    const syncCtaVisibility = () => {
      const visibleCta = inlineCtas.find(ctaIntersectsViewport);
      setMobileCtaVisible(Boolean(visibleCta), visibleCta);
    };
    let ctaSyncFrame = 0;
    const scheduleCtaSync = () => {
      if (ctaSyncFrame) return;
      ctaSyncFrame = window.requestAnimationFrame(() => {
        ctaSyncFrame = 0;
        syncCtaVisibility();
      });
    };

    updateCtaReserve();
    syncCtaVisibility();
    if ("IntersectionObserver" in window) {
      const ctaVisibilityObserver = new IntersectionObserver(scheduleCtaSync, { threshold: 0 });
      inlineCtas.forEach((cta) => ctaVisibilityObserver.observe(cta));
    }
    window.addEventListener("scroll", scheduleCtaSync, { passive: true });
    window.addEventListener("resize", () => {
      updateCtaReserve();
      syncCtaVisibility();
    }, { passive: true });
    mobileCtaBreakpoint.addEventListener("change", () => {
      updateCtaReserve();
      syncCtaVisibility();
    });
    if ("ResizeObserver" in window) {
      const ctaObserver = new ResizeObserver(() => {
        updateCtaReserve();
        syncCtaVisibility();
      });
      ctaObserver.observe(mobileCtaBar);
      inlineCtas.forEach((cta) => ctaObserver.observe(cta));
    }
  }

  const focusScene = document.querySelector("[data-focus-scene]");
  const sceneCanvas = document.querySelector("[data-scene-canvas]");
  if (focusScene && sceneCanvas && "IntersectionObserver" in window) {
    const saveData = navigator.connection?.saveData === true;
    const variantBreakpoint = window.matchMedia("(max-width: 740px)");
    let sceneModule = null;
    let scenePromise = null;
    let sceneMount = null;
    let sceneTween = null;
    let sceneObserver = null;
    let sceneSizeObserver = null;
    let sceneVisible = false;
    let sceneFailed = false;
    let sceneSettled = false;
    let sceneVariant = "";
    let animationFrame = 0;
    let lastRenderTime = 0;
    let renderWidth = 0;
    let renderHeight = 0;
    let renderPixelRatio = 0;

    const currentVariant = () => variantBreakpoint.matches ? "mobile" : "desktop";
    const canRenderScene = () => Boolean(sceneMount && sceneVisible && !document.hidden && !motionPreference.matches);
    const sizeAndRender = (force = false) => {
      if (!canRenderScene()) return;
      if (animationFrame) return;
      const now = performance.now();
      const mobile = variantBreakpoint.matches;
      if (!force && mobile && now - lastRenderTime < 32) return;
      animationFrame = requestAnimationFrame((timestamp) => {
        animationFrame = 0;
        if (!canRenderScene()) return;
        const rect = focusScene.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        const pixelBudget = Math.sqrt(600000 / (width * height));
        const pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5, pixelBudget);
        if (width !== renderWidth || height !== renderHeight || pixelRatio !== renderPixelRatio) {
          sceneMount.resize(width, height, pixelRatio);
          renderWidth = width;
          renderHeight = height;
          renderPixelRatio = pixelRatio;
        }
        sceneMount.render();
        lastRenderTime = timestamp;
      });
    };
    const cancelPendingRender = () => {
      if (!animationFrame) return;
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    };
    const retireScene = () => {
      sceneTween?.kill();
      sceneTween = null;
      cancelPendingRender();
      sceneMount?.dispose();
      sceneMount = null;
      sceneSettled = false;
      sceneVariant = "";
      renderWidth = 0;
      renderHeight = 0;
      renderPixelRatio = 0;
      focusScene.classList.remove("scene-ready");
    };
    const failScene = () => {
      sceneFailed = true;
      retireScene();
    };
    const renderInitialFrame = (width, height, pixelRatio) => {
      sceneMount.resize(width, height, pixelRatio);
      renderWidth = width;
      renderHeight = height;
      renderPixelRatio = pixelRatio;
      sceneMount.render();
      lastRenderTime = performance.now();
      focusScene.classList.add("scene-ready");
    };
    const createMountedScene = (variant) => {
      const rect = focusScene.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const pixelBudget = Math.sqrt(600000 / (width * height));
      const pixelRatio = Math.min(window.devicePixelRatio || 1, variant === "mobile" ? 1 : 1.5, pixelBudget);
      sceneMount = sceneModule.createSignalDock(sceneCanvas, variant);
      sceneVariant = variant;

      const key = sceneMount.asset.key;
      const television = sceneMount.asset.television;
      const keyTarget = key.position.clone();
      const televisionTargetY = television.rotation.y;
      key.position.x -= 0.035;
      key.position.y -= 0.035;
      television.rotation.y -= 0.028;
      renderInitialFrame(width, height, pixelRatio);

      if (window.gsap) {
        sceneTween = window.gsap.timeline({
          paused: true,
          onComplete: () => {
            sceneSettled = true;
            sizeAndRender(true);
          }
        });
        sceneTween.to(key.position, { x: keyTarget.x, y: keyTarget.y, duration: 0.78, ease: "power2.out", onUpdate: () => sizeAndRender() }, 0);
        sceneTween.to(television.rotation, { y: televisionTargetY, duration: 0.82, ease: "power2.out", onUpdate: () => sizeAndRender() }, 0);
        sceneTween.play();
      } else {
        key.position.copy(keyTarget);
        television.rotation.y = televisionTargetY;
        sceneSettled = true;
        sizeAndRender(true);
      }
    };
    const maybeLoadScene = async () => {
      if (sceneFailed || sceneMount || !sceneVisible || document.hidden || motionPreference.matches || saveData || scenePromise) return;
      scenePromise = import("./vendor/signal-dock/scene-enhancement.js");
      try {
        sceneModule = await scenePromise;
        if (!sceneFailed && sceneVisible && !document.hidden && !motionPreference.matches && !saveData) createMountedScene(currentVariant());
      } catch {
        failScene();
      } finally {
        scenePromise = null;
      }
    };
    const syncScene = () => {
      if (sceneMount && currentVariant() !== sceneVariant) {
        retireScene();
        if (sceneVisible) maybeLoadScene();
        return;
      }
      if (sceneMount) sizeAndRender(true);
    };
    const handleContextLoss = () => failScene();

    sceneCanvas.addEventListener("webglcontextlost", handleContextLoss, { once: true });
    sceneObserver = new IntersectionObserver(([entry]) => {
      sceneVisible = entry.isIntersecting && entry.intersectionRatio > 0;
      if (!sceneVisible) {
        sceneTween?.pause();
        cancelPendingRender();
      } else if (sceneMount) {
        if (!sceneSettled) sceneTween?.resume();
        else sizeAndRender(true);
      } else {
        maybeLoadScene();
      }
    }, { threshold: 0.05 });
    sceneObserver.observe(focusScene);
    window.addEventListener("resize", syncScene, { passive: true });
    variantBreakpoint.addEventListener("change", syncScene);
    if ("ResizeObserver" in window) {
      sceneSizeObserver = new ResizeObserver(syncScene);
      sceneSizeObserver.observe(focusScene);
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        sceneTween?.pause();
        cancelPendingRender();
      } else if (sceneVisible) {
        if (!sceneSettled) sceneTween?.resume();
        else sizeAndRender(true);
      }
    });
    motionPreference.addEventListener("change", (event) => {
      if (event.matches) retireScene();
      else if (sceneVisible) maybeLoadScene();
    });
  }

  if (!motionPreference.matches && window.gsap && window.ScrollTrigger) {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    const narrowMotion = window.matchMedia("(max-width: 740px)");
    const motionTargets = new Set();
    const revealTimelines = new Set();
    gsap.registerPlugin(ScrollTrigger);
    const heroTargets = Array.from(document.querySelectorAll(".hero-copy .eyebrow, .hero-copy h1, .hero-lede, .hero-facts, .availability"));
    heroTargets.forEach((target) => motionTargets.add(target));
    gsap.fromTo(heroTargets, { y: 20, autoAlpha: 0 }, {
      y: 0, autoAlpha: 1, duration: 0.68, ease: "power3.out", stagger: 0.075,
      clearProps: "transform,opacity,visibility"
    });
    const heroActions = Array.from(document.querySelectorAll(".hero-actions > .hero-cta, .hero-actions > .text-link"));
    heroActions.forEach((target) => motionTargets.add(target));
    gsap.fromTo(heroActions, { y: 14, autoAlpha: 1 }, {
      y: 0, autoAlpha: 1, duration: 0.58, ease: "power3.out", stagger: 0.08,
      clearProps: "transform,opacity,visibility"
    });

    const sequenceStart = () => narrowMotion.matches ? "top 70%" : "top 78%";
    const revealSequence = (trigger, steps) => {
      if (!trigger) return;
      let timeline = null;
      const createTimeline = () => {
        const sequence = gsap.timeline({ paused: true });
        let cursor = 0;
        steps.forEach((step) => {
          const targets = Array.from(trigger.querySelectorAll(step.selector));
          if (!targets.length) return;
          targets.forEach((target) => motionTargets.add(target));
          const duration = step.duration || 0.58;
          const stagger = step.stagger ?? 0.07;
          const position = cursor === 0 ? 0 : Math.max(0, cursor - 0.09);
          const keepVisible = targets.every((target) => target.matches("a, button, input, select, textarea, summary, [tabindex]:not([tabindex='-1'])"));
          sequence.fromTo(targets, {
            y: step.y ?? 22,
            autoAlpha: keepVisible ? 1 : 0,
            scale: step.scale ?? 1,
            rotation: step.rotation ?? 0
          }, {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            rotation: 0,
            duration,
            ease: step.ease || "power3.out",
            stagger
          }, position);
          cursor = position + duration + Math.max(0, targets.length - 1) * stagger;
        });
        revealTimelines.add(sequence);
        return sequence;
      };
      ScrollTrigger.create({
        trigger,
        start: sequenceStart,
        onEnter: () => {
          if (!timeline) timeline = createTimeline();
          timeline.play(0);
        },
        onLeaveBack: () => timeline?.reverse()
      });
    };

    revealSequence(document.querySelector(".search-proof"), [
      { selector: ".search-copy .eyebrow", y: 16, duration: 0.42 },
      { selector: ".search-copy h2", y: 28, duration: 0.64 },
      { selector: ".search-copy > p:not(.eyebrow)", y: 20, duration: 0.5, stagger: 0.09 },
      { selector: ".search-shot", y: 34, scale: 0.97, duration: 0.76 },
      { selector: ".search-shot figcaption", y: 12, duration: 0.38 }
    ]);

    const benefitHeading = document.querySelector(".section-heading");
    revealSequence(benefitHeading, [
      { selector: ".eyebrow", y: 16, duration: 0.42 },
      { selector: "h2", y: 28, duration: 0.64 },
      { selector: ":scope > p:last-child", y: 18, duration: 0.48 }
    ]);
    document.querySelectorAll(".benefit-card").forEach((card) => {
      revealSequence(card, [
        { selector: ".card-label", y: 14, duration: 0.38 },
        { selector: "h3", y: 23, duration: 0.56 },
        { selector: "p:not(.card-label)", y: 18, duration: 0.48 },
        { selector: ".profile-options, .pin-count, .comfort-words", y: 20, scale: 0.97, duration: 0.58 }
      ]);
    });

    revealSequence(document.querySelector(".compatibility-section"), [
      { selector: ".compatibility-heading .eyebrow", y: 16, duration: 0.42 },
      { selector: ".compatibility-heading h2", y: 26, duration: 0.6 },
      { selector: ".compatibility-copy p", y: 19, duration: 0.5, stagger: 0.1 },
      { selector: ".compatibility-copy .text-link", y: 16, duration: 0.46 }
    ]);

    revealSequence(document.querySelector(".film-section"), [
      { selector: ".film-copy .eyebrow", y: 16, duration: 0.42 },
      { selector: ".film-copy h2", y: 26, duration: 0.6 },
      { selector: ".film-copy > p:not(.eyebrow)", y: 18, duration: 0.48, stagger: 0.08 },
      { selector: ".film-placeholder-art", y: 18, scale: 0.88, rotation: -8, duration: 0.62 },
      { selector: ".film-state, .film-placeholder-copy, .film-caption", y: 16, duration: 0.5, stagger: 0.08 }
    ]);

    revealSequence(document.querySelector(".questions-heading"), [
      { selector: ".eyebrow", y: 16, duration: 0.42 },
      { selector: "h2", y: 26, duration: 0.6 }
    ]);
    document.querySelectorAll(".faq-list details").forEach((item) => {
      revealSequence(item, [{ selector: "summary", y: 18, duration: 0.52 }]);
    });

    revealSequence(document.querySelector(".closing-section"), [
      { selector: ".closing-mark", y: 16, scale: 0.88, rotation: -8, duration: 0.54 },
      { selector: ".closing-copy .eyebrow", y: 14, duration: 0.38 },
      { selector: ".closing-copy h2", y: 24, duration: 0.58 },
      { selector: ".closing-copy > p:last-child", y: 16, duration: 0.46 },
      { selector: ".closing-cta", y: 20, scale: 0.98, duration: 0.58 }
    ]);

    const heroArtwork = document.querySelector(".scene-phone");
    if (heroArtwork) {
      motionTargets.add(heroArtwork);
      gsap.fromTo(heroArtwork, { y: 0, scale: 1 }, {
        y: 18, scale: 0.985, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.45, invalidateOnRefresh: true }
      });
    }
    const searchArtwork = document.querySelector(".search-shot-frame");
    if (searchArtwork) {
      motionTargets.add(searchArtwork);
      gsap.fromTo(searchArtwork, { y: 0, scale: 1 }, {
        y: 16, scale: 0.985, ease: "none",
        scrollTrigger: { trigger: ".search-proof", start: "top 36%", end: "bottom top", scrub: 0.45, invalidateOnRefresh: true }
      });
    }

    document.querySelectorAll(".benefit-card").forEach((card) => {
      ScrollTrigger.create({
        trigger: card,
        start: "top 72%",
        end: "bottom 34%",
        onToggle: (trigger) => card.classList.toggle("is-current", trigger.isActive)
      });
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) gsap.ticker.sleep();
      else {
        gsap.ticker.wake();
        ScrollTrigger.refresh();
      }
    });

    motionPreference.addEventListener("change", (event) => {
      if (!event.matches) return;
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      revealTimelines.forEach((timeline) => timeline.kill());
      gsap.globalTimeline.clear();
      gsap.set(Array.from(motionTargets), { clearProps: "transform,opacity,visibility" });
      document.querySelectorAll(".benefit-card.is-current").forEach((card) => card.classList.remove("is-current"));
    });
  }
})();

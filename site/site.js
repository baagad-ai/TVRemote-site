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
  const heroCta = document.querySelector(".hero-cta");
  const mobileCtaBreakpoint = window.matchMedia("(max-width: 740px)");
  if (mobileCtaBar && heroCta && document.body) {
    const heroCtaIntersectsViewport = () => {
      const rect = heroCta.getBoundingClientRect();
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
    const setMobileCtaVisible = (heroVisible) => {
      const visible = mobileCtaBreakpoint.matches && !heroVisible;
      if (!visible && mobileCtaBar.contains(document.activeElement)) {
        if (heroCta.matches(":disabled")) document.activeElement.blur();
        else heroCta.focus({ preventScroll: true });
      }
      mobileCtaBar.classList.toggle("is-visible", visible);
      mobileCtaBar.toggleAttribute("inert", !visible);
      mobileCtaBar.setAttribute("aria-hidden", String(!visible));
    };
    const syncCtaVisibility = () => setMobileCtaVisible(heroCtaIntersectsViewport());

    updateCtaReserve();
    setMobileCtaVisible(true);
    if ("IntersectionObserver" in window) {
      const ctaVisibilityObserver = new IntersectionObserver(([entry]) => {
        setMobileCtaVisible(entry.isIntersecting && entry.intersectionRatio > 0);
      }, { threshold: 0 });
      ctaVisibilityObserver.observe(heroCta);
    } else {
      window.addEventListener("scroll", syncCtaVisibility, { passive: true });
    }
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
      ctaObserver.observe(heroCta);
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
    gsap.registerPlugin(ScrollTrigger);
    gsap.fromTo(
      [".hero-copy", ".hero-scene"],
      { y: 12, opacity: 0.97 },
      { y: 0, opacity: 1, duration: 0.55, ease: "power2.out", stagger: 0.06, clearProps: "transform,opacity" }
    );

    document.querySelectorAll(".search-proof, .benefit-card, .compatibility-section, .film-section, .questions-section, .closing-section").forEach((item) => {
      ScrollTrigger.create({
        trigger: item,
        start: "top 88%",
        once: true,
        onEnter: () => gsap.fromTo(item, { y: 10, opacity: 0.97 }, {
          y: 0, opacity: 1, duration: 0.42, ease: "power2.out", clearProps: "transform,opacity"
        })
      });
    });

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
      gsap.globalTimeline.clear();
      document.querySelectorAll(".benefit-card.is-current").forEach((card) => card.classList.remove("is-current"));
    });
  }
})();

(() => {
  "use strict";

  const config = window.remoteSiteConfig || {};
  const betaStatus = document.getElementById("beta-status");
  const configuredUrl = typeof config.betaOptInUrl === "string" ? config.betaOptInUrl.trim() : "";

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
  if (mobileCtaBar && document.body) {
    const updateCtaReserve = () => {
      if (window.getComputedStyle(mobileCtaBar).display === "none") return;
      const reserve = Math.ceil(mobileCtaBar.getBoundingClientRect().height + 24);
      document.body.style.setProperty("--mobile-cta-reserve", reserve + "px");
    };
    updateCtaReserve();
    if ("ResizeObserver" in window) {
      const ctaObserver = new ResizeObserver(updateCtaReserve);
      ctaObserver.observe(mobileCtaBar);
    }
    window.addEventListener("resize", updateCtaReserve, { passive: true });
  }

  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
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

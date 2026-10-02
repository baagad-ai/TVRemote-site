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
      link.textContent = config.betaCtaLabel || "Join the beta";
      link.setAttribute("aria-describedby", "beta-status");
      button.replaceWith(link);
    });
    if (betaStatus) {
      betaStatus.textContent = config.betaStatus || "The official Play opt-in is ready.";
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
    if (videoIntro) videoIntro.textContent = "See The Remote in use. Start the video when you’re ready.";
    video.hidden = false;
    videoPlaceholder.hidden = true;
    if (videoCaption) videoCaption.textContent = "The Remote beta walkthrough · Use the player controls to watch.";
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const revealItems = document.querySelectorAll("[data-reveal]");
  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -36px 0px" });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const tiltCard = document.querySelector("[data-tilt]");
  const finePointer = window.matchMedia("(pointer: fine)");
  if (tiltCard && finePointer.matches && !reduceMotion.matches) {
    let frame = 0;
    let point = null;
    const drawTilt = () => {
      frame = 0;
      if (!point || reduceMotion.matches) return;
      const rect = tiltCard.getBoundingClientRect();
      const x = (point.x - rect.left) / rect.width - 0.5;
      const y = (point.y - rect.top) / rect.height - 0.5;
      tiltCard.style.setProperty("--tilt-x", `${(-y * 3.5).toFixed(2)}deg`);
      tiltCard.style.setProperty("--tilt-y", `${(x * 4.5).toFixed(2)}deg`);
    };
    tiltCard.addEventListener("pointermove", (event) => {
      if (reduceMotion.matches) return;
      point = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(drawTilt);
    }, { passive: true });
    const resetTilt = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      point = null;
      tiltCard.style.setProperty("--tilt-x", "0deg");
      tiltCard.style.setProperty("--tilt-y", "0deg");
    };
    tiltCard.addEventListener("pointerleave", resetTilt, { passive: true });
    reduceMotion.addEventListener("change", resetTilt);
  }
})();

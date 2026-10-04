# Landing polish decisions

Applied the installed Final UI Polish skill to the existing vanilla HTML/CSS/GSAP landing page on 2026-10-04. The task is to help visitors inspect the app screenshots and find the beta request action, while preserving the approved hierarchy, screenshot pixels/crops, signup contract and mobile CTA behavior.

| Concept considered | Decision and placement |
| --- | --- |
| [React Bits Spotlight Card](https://reactbits.dev/components/spotlight-card) | Use the general surface-emphasis idea for screenshot frame borders and shadows. Independently authored CSS; no pointer tracking, hover affordance on noninteractive images, or vendor implementation. |
| [React Bits Animated Content](https://reactbits.dev/animations/animated-content) | Express the concept through the existing GSAP timelines: main/detail screenshot poses are gentler, with less stage travel. No second animation system. |
| [Magic UI Magic Card](https://magicui.design/docs/components/magic-card) | Rejected: its additional React integration does not improve this static page enough to justify new dependencies. |
| [Aceternity Hover Border Gradient](https://ui.aceternity.com/components/hover-border-gradient) | Rejected: an idle border loop adds motion without helping screenshot inspection or form completion. |

The source links identify concept provenance, not copied code. No React component source, third-party CSS, dependencies or assets were imported. Existing GSAP remains self-hosted with its repository license notice. The runtime adaptation is original and follows the page's lime, paper and charcoal tokens.

CTAs retain their labels, destinations and hit areas. Hover and press change contrast without moving the control; keyboard focus has a visible outline. Screenshot emphasis changes only frame color/shadows, not dimensions, padding, image proportions or crop positions. The reduced-motion/no-JS frame is static. Touch interaction does not depend on hover.

All landing animations and ScrollTriggers belong to one GSAP context. Reduced-motion shutdown reverts that context, restores only the landing pass's owned transform/opacity/visibility properties, removes its visibility listener and balances its ticker sleep. Other GSAP animations/triggers are preserved. Turning motion back on does not duplicate landing animations. No pointer listeners, render loops, network requests or dependencies were added for the polish.

Verification: all 34 frontend/Worker tests, both site checks, syntax checks, scene build and static allowlist/hash build pass. Fresh isolated Brave loopback fixtures check 320/390/768/1280 widths, doubled computed text sizes, keyboard focus/Enter, native mobile touch taps, stationary CTA feedback, mocked signup success/error/reset, close/reopen continuity, reduced-motion toggles (including hidden-page cleanup and subsequent scroll/refresh) and no-JS fallback. Before/after frame captures confirm unchanged dimensions and visible edge emphasis. Turnstile/Worker responses are mocked; no production signup or CAPTCHA is exercised. Native browser zoom, real screen-reader output and live signup persistence are outside this fixture verification.

Rollback base: e9d8e91. This is a local change; publication is separate.

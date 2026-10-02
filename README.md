# The Remote — landing page

This public repository contains the landing page and privacy policy for The Remote, a free Android phone remote for compatible Android TV and Google TV. The Android application is maintained separately; this repository contains no app source, build outputs, signing files, or release credentials.

- Website: https://baagad-ai.github.io/TVRemote-site/
- Privacy policy: https://baagad-ai.github.io/TVRemote-site/privacy/

The site uses static files only. It has no account system, analytics, signup form, or cloud relay. Beta access remains unavailable from this page until the official Google Play opt-in is approved for publication; the video remains a placeholder until the approved beta film is ready.

## GitHub Pages

This public repository is configured to deploy with GitHub Actions. Pushes to `main` run the dependency-free site checks and deploy the site. The `Validate and deploy landing page` workflow runs the checks before publishing. No secrets or deployment tokens are stored in the repository.

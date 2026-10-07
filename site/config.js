/* Set apkRelease only after verifying the signed APK's identity and checksum.
   Approved shape: { id, url, version, sha256 }; url must be a direct HTTPS APK. */
window.remoteSiteConfig = Object.freeze({
  apkRelease: null
});

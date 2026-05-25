/**
 * Central references for app imagery in `assets/images/`.
 * Update filenames here when replacing brand assets.
 */
export const brandImages = {
  /** Primary logo / brand mark for auth screens & empty states */
  logo: require("../assets/images/logo.png"),
  /** App / launcher mark (Expo `icon` + adaptive foreground) */
  appIcon: require("../assets/images/app-icon.png"),
  /** Expo splash & splash route */
  splashIcon: require("../assets/images/splash-icon.png"),
  /** Store listing / marketing (feature graphic) */
  featureGraphic: require("../assets/images/feature-graphic.png"),
  /** Secondary mark / vector-style asset */
  vectorIcon: require("../assets/images/Vector-icon.png"),
  /** Google Play — high-res icon (512×512). Generate: `python3 scripts/generate-google-play-assets.py` */
  playStoreIcon512: require("../assets/store/google-play/app-icon-512.png"),
  /** Google Play — feature graphic (1024×500). Same script as above */
  playStoreFeatureGraphic: require("../assets/store/google-play/feature-graphic-1024x500.png"),
} as const;

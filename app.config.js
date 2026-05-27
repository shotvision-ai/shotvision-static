const fs = require("fs");
const path = require("path");

/**
 * Read OAuth client IDs from android/app/google-services.json (Firebase Android app).
 * client_type: 1 = Android, 2 = iOS, 3 = Web (Google Services JSON format).
 *
 * Never use the Web client ID as androidClientId/iosClientId — Google rejects custom scheme
 * redirects (e.g. shotvision://) for WEB clients ("Custom scheme URIs are not allowed for WEB").
 * Android needs client_type 1 (add SHA-1 in Firebase → download refreshed google-services.json),
 * or set EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID from an Android OAuth client in Google Cloud Console.
 */
/** Prefer repo root (survives `expo prebuild --clean`); legacy path for older checkouts. */
function resolveGoogleServicesFilePath() {
  const candidates = [
    path.join(__dirname, "google-services.json"),
    path.join(__dirname, "android/app/google-services.json"),
  ];
  for (const absolute of candidates) {
    if (fs.existsSync(absolute)) {
      return path.relative(__dirname, absolute).split(path.sep).join("/");
    }
  }
  return undefined;
}

function readGoogleServicesOAuthIds() {
  try {
    const relative = resolveGoogleServicesFilePath();
    if (!relative) return { web: undefined, android: undefined, ios: undefined };
    const filePath = path.join(__dirname, relative);
    const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const oauthClients = json.client?.[0]?.oauth_client ?? [];
    let webId;
    let androidId;
    let iosId;
    for (const oc of oauthClients) {
      if (oc.client_type === 3) webId = oc.client_id;
      if (oc.client_type === 1) androidId = oc.client_id;
      if (oc.client_type === 2) iosId = oc.client_id;
    }
    const invite = json.client?.[0]?.services?.appinvite_service?.other_platform_oauth_client?.[0];
    if (!webId && invite?.client_id) {
      webId = invite.client_id;
    }
    return {
      web: webId,
      android: androidId,
      ios: iosId,
    };
  } catch (e) {
    console.warn("[app.config] Could not read google-services.json for Google OAuth defaults:", e?.message);
    return { web: undefined, android: undefined, ios: undefined };
  }
}

const gsOAuth = readGoogleServicesOAuthIds();
const googleServicesFile = resolveGoogleServicesFilePath();

/** iOS URL scheme for Google Sign-In when not using GoogleService-Info.plist (see RN Google Sign-In Expo plugin). */
function iosUrlSchemeFromWebClientId(webClientId) {
  if (!webClientId || typeof webClientId !== "string") return undefined;
  const idPart = webClientId.replace(/\.apps\.googleusercontent\.com\s*$/i, "");
  return `com.googleusercontent.apps.${idPart}`;
}

/** Android redirect URI scheme for in-app browser OAuth (reverse client id). */
function androidUrlSchemeFromAndroidClientId(androidClientId) {
  if (!androidClientId || typeof androidClientId !== "string") return undefined;
  const idPart = androidClientId.replace(/\.apps\.googleusercontent\.com\s*$/i, "");
  return `com.googleusercontent.apps.${idPart}`;
}

const webClientIdForPlugin =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || gsOAuth.web || "";
const googleSignInIosUrlScheme = iosUrlSchemeFromWebClientId(webClientIdForPlugin);
const androidBrowserOauthScheme = androidUrlSchemeFromAndroidClientId(
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || gsOAuth.android || ""
);

const plugins = [
  "expo-dev-client",
  "expo-font",
  "expo-asset",
  "expo-video",
  "expo-web-browser",
  "expo-secure-store",
];

if (googleSignInIosUrlScheme) {
  plugins.push([
    "@react-native-google-signin/google-signin",
    { iosUrlScheme: googleSignInIosUrlScheme },
  ]);
}

plugins.push(
  [
    "expo-router",
    {
      origin: "https://6bccff42e6.sandbox.draftbit.dev:5101",
      headOrigin: "https://6bccff42e6.sandbox.draftbit.dev:5100",
    },
  ],
  ["./plugins/draftbit-auto-launch-url-plugin"]
);

module.exports = {
  name: "ShotVision",
  slug: "shotvision",
  version: "5.0.10",
  scheme: "shotvision",

  /** Passed to the app at runtime (see src/config/googleOAuth.ts). Env overrides google-services defaults. */
  extra: {
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || gsOAuth.web,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || gsOAuth.ios,
    googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || gsOAuth.android,
  },

  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/images/Vector-icon.png",
  },

  plugins,

  experiments: {
    typedRoutes: true,
    tsconfigPaths: true,
  },

  orientation: "portrait",

  icon: "./assets/images/app-icon.png",

  userInterfaceStyle: "automatic",

  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },

  assetBundlePatterns: ["**/*"],

  ios: {
    supportsTablet: true,
    buildNumber: "10",
    bundleIdentifier: "com.shotvision.app",
  },

  android: {
    package: "com.shotvision.app",
    ...(googleServicesFile ? { googleServicesFile } : {}),
    versionCode: 10,

    intentFilters: [
      {
        action: "VIEW",
        autoVerify: false,
        data: [
          {
            scheme: "https",
            host: "shotvision-c677b.firebaseapp.com",
            pathPrefix: "/",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
      // Google browser OAuth redirect (AuthSession) on Android emulators.
      // Must match `com.googleusercontent.apps.<ANDROID_CLIENT_ID>:/oauthredirect`.
      ...(androidBrowserOauthScheme
        ? [
            {
              action: "VIEW",
              data: [
                {
                  scheme: androidBrowserOauthScheme,
                  pathPrefix: "/oauthredirect",
                },
              ],
              category: ["BROWSABLE", "DEFAULT"],
            },
          ]
        : []),
      {
        action: "VIEW",
        data: [
          {
            scheme: "shotvision",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],

    adaptiveIcon: {
      foregroundImage: "./assets/images/app-icon.png",
      backgroundColor: "#2664eb",
    },
  },

  platforms: ["ios", "android", "web"],
};
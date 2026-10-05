export interface SnackInfo {
  id: string;
  /** exp:// URL — encode in a QR code to open the app in Expo Go. */
  expoUrl: string;
  /** Embeddable player (code + preview); the UI crops it to the phone preview. */
  embedUrl: string;
  /** Full Snack editor on snack.expo.dev. */
  webUrl: string;
}

export function snackUrls(id: string, expoUrl: string): SnackInfo {
  const safeId = encodeURIComponent(id);
  return {
    id,
    expoUrl,
    embedUrl: `https://snack.expo.dev/embedded/${safeId}?preview=true&platform=web&theme=light&supportedPlatforms=web`,
    webUrl: `https://snack.expo.dev/${safeId}`,
  };
}

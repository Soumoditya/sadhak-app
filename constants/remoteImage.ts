// Wikimedia (and other public hosts) reject requests from Android's default
// HTTP client user-agent ("okhttp/x") with 403 Forbidden, which left deity
// paintings, wallpapers and food photos stuck on their blurred placeholder.
// Wikimedia's policy asks apps to identify themselves; send that header.
import { APP_VERSION, SUPPORT_EMAIL, WEBSITE_URL } from './appInfo';

export const IMAGE_HEADERS = {
  'User-Agent': `SadhakApp/${APP_VERSION} (${WEBSITE_URL}; ${SUPPORT_EMAIL})`,
};

/** expo-image / Image source for a remote URL, with an identifying user-agent. */
export const remote = (uri: string) => ({ uri, headers: IMAGE_HEADERS });

import mobileAppConfig from "../../apps/mobile/app.json" with { type: "json" };

export type PublicPage = "support" | "privacy" | "terms" | "about";

export const SUPPORT_EMAIL = "bferrell514@gmail.com";
export const IOS_APP_VERSION = mobileAppConfig.expo.version;
// Set this once App Store Connect assigns the public listing URL.
export const APP_STORE_URL: string | null = null;
export const POLICY_EFFECTIVE_DATE = "October 13, 2026";

export const PUBLIC_PAGE_PATHS: Record<PublicPage, string> = {
  support: "/support",
  privacy: "/privacy",
  terms: "/terms",
  about: "/about",
};

const PAGE_TITLES: Record<PublicPage, string> = {
  support: "Support · Chess Universe",
  privacy: "Privacy Policy · Chess Universe",
  terms: "Beta Terms · Chess Universe",
  about: "About · Chess Universe",
};

export const DEFAULT_DOCUMENT_TITLE = "Chess Universe";

export function isPublicPage(value: string): value is PublicPage {
  return value in PUBLIC_PAGE_PATHS;
}

export function publicPageFromPath(pathname: string): PublicPage | null {
  const normalized = pathname.replace(/\/+$/, "").toLowerCase() || "/";
  for (const [page, path] of Object.entries(PUBLIC_PAGE_PATHS) as Array<[PublicPage, string]>) {
    if (normalized === path) return page;
  }
  return null;
}

export function documentTitleFor(page: PublicPage | null) {
  return page ? PAGE_TITLES[page] : DEFAULT_DOCUMENT_TITLE;
}

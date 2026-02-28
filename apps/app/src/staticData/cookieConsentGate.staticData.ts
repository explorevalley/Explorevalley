export const cookieConsentData = {
  consentCookieKey: "ev_cookie_consent_v1",
  consentValue: "accepted",
  fallbackSlugs: {
    affiliate: "affiliate-program",
    contact: "contact-us",
    privacy: "privacy-policy",
    refund: "refund-policy",
    terms: "terms-and-conditions",
    emergency: "emergency",
  },
  title: "ExploreValley Cookie Consent",
  body:
    "We use cookies to keep the site secure, improve performance, and personalize your experience.\nBy continuing, you must accept cookie consent.",
  linkLabels: {
    affiliate: "Affiliate Program",
    contact: "Contact Us",
    privacy: "Privacy Policy",
    refund: "Refund Policy",
    terms: "Terms and Conditions",
    emergency: "Emergency",
  },
  dot: "\u2022",
  acceptLabel: "Accept Consent",
  htmlTemplate: (title: string, content: string) =>
    `<!doctype html><html><head><meta charset="utf-8" /><title>${title}</title></head><body>${content}</body></html>`,
  api: {
    meta: "/api/meta",
    pages: (slug: string) => `/api/pages/${slug}`,
  },
};

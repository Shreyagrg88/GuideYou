export const PLATFORM_TERMS_VERSION = "1.0";

export type PlatformTermsSection = {
  title: string;
  body: string;
};

export const PLATFORM_TERMS_SECTIONS: PlatformTermsSection[] = [
  {
    title: "About GuideYou",
    body:
      "GuideYou is an online marketplace that helps tourists discover local guides and book tours or activities. We provide tools to connect users, communicate, and process bookings — we are not a travel agency and we do not operate tours ourselves.",
  },
  {
    title: "Your Role",
    body:
      "Tourists and guides use GuideYou independently. Any agreement for a tour, activity, price, schedule, or meeting point is between the tourist and the guide. GuideYou is not a party to that arrangement.",
  },
  {
    title: "Safety & Conduct",
    body:
      "You are responsible for your own safety and decisions when meeting or traveling with another user. Verify guide credentials, read reviews, share plans with someone you trust, and follow local laws. Report suspicious or harmful behavior through the in-app report feature.",
  },
  {
    title: "Limitation of Liability",
    body:
      "To the fullest extent permitted by law, GuideYou and its operators are not liable for injuries, losses, theft, delays, cancellations, disputes, or any other harm arising from interactions, tours, or payments between users — whether on or off the platform.",
  },
  {
    title: "Guide Verification",
    body:
      "We may review guide licenses and profile information, but verification is not a guarantee of quality, safety, or suitability. You should still exercise your own judgment before booking or accepting a booking.",
  },
  {
    title: "Payments",
    body:
      "Payments may be processed through third-party providers (such as eSewa). GuideYou facilitates booking and payment flows but is not responsible for payment provider outages, chargebacks, or disputes between users about refunds outside our stated policies.",
  },
  {
    title: "Account Use",
    body:
      "Provide accurate information, keep your login secure, and do not misuse the platform (fraud, harassment, fake listings, or illegal activity). We may suspend or remove accounts that violate these rules or harm other users.",
  },
  {
    title: "Privacy",
    body:
      "We collect and use personal data needed to run the service (profile details, bookings, messages, and device tokens for notifications). Do not share sensitive information in chat unless necessary for your tour.",
  },
  {
    title: "Changes",
    body:
      "We may update these terms as the platform evolves. Continued use after an update means you accept the revised terms. Material changes may be communicated through the app.",
  },
];

export const PLATFORM_TERMS_INTRO =
  "Please read the following before using GuideYou. By continuing, you confirm that you understand and accept these terms.";

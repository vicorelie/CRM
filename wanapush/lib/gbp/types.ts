// Types Google Business Profile API. Documentations :
// - Account Management : https://developers.google.com/my-business/reference/accountmanagement
// - Business Information : https://developers.google.com/my-business/reference/businessinformation
// - Performance : https://developers.google.com/my-business/reference/performance
// - Reviews/Posts (v4 legacy actif) : https://developers.google.com/my-business/reference/rest

export type GbpAccountAPI = {
  name: string; // "accounts/{id}"
  accountName: string;
  type?: "PERSONAL" | "LOCATION_GROUP" | "USER_GROUP" | "ORGANIZATION";
  role?: string;
  state?: { status?: string };
};

export type GbpLocationAPI = {
  name: string; // "locations/{id}"
  title: string;
  phoneNumbers?: { primaryPhone?: string };
  websiteUri?: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    regionCode?: string;
  };
  latlng?: { latitude?: number; longitude?: number };
  categories?: { primaryCategory?: { displayName?: string; name?: string } };
  regularHours?: { periods?: Array<unknown> };
  metadata?: { mapsUri?: string; newReviewUri?: string };
};

export type GbpReviewAPI = {
  name: string; // "accounts/{a}/locations/{l}/reviews/{r}"
  reviewId: string;
  reviewer?: { profilePhotoUrl?: string; displayName?: string };
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment?: string;
  createTime: string; // ISO
  updateTime: string;
  reviewReply?: { comment: string; updateTime: string };
};

export type GbpLocalPostInput = {
  topicType: "STANDARD" | "EVENT" | "OFFER" | "ALERT";
  languageCode?: string; // défaut "fr"
  summary: string;
  callToAction?: {
    actionType: "LEARN_MORE" | "CALL" | "ORDER" | "BOOK" | "SHOP" | "SIGN_UP";
    url?: string;
  };
  event?: {
    title: string;
    schedule: {
      startDate: { year: number; month: number; day: number };
      endDate: { year: number; month: number; day: number };
    };
  };
  media?: Array<{ mediaFormat: "PHOTO"; sourceUrl: string }>;
};

export type GbpInsightMetric =
  | "BUSINESS_IMPRESSIONS_DESKTOP_MAPS"
  | "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH"
  | "BUSINESS_IMPRESSIONS_MOBILE_MAPS"
  | "BUSINESS_IMPRESSIONS_MOBILE_SEARCH"
  | "WEBSITE_CLICKS"
  | "CALL_CLICKS"
  | "BUSINESS_DIRECTION_REQUESTS"
  | "BUSINESS_BOOKINGS"
  | "BUSINESS_FOOD_ORDERS"
  | "BUSINESS_CONVERSATIONS";

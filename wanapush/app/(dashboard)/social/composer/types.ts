export type Platform = "FACEBOOK" | "INSTAGRAM" | "LINKEDIN" | "YOUTUBE" | "TIKTOK";

export type Account = {
  id: string;
  platform: Platform;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  status: string;
};

export type Media = { url: string; type: "image" | "video"; alt?: string };

export const PLATFORM_LABEL: Record<Platform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  YOUTUBE: "YouTube",
  TIKTOK: "TikTok",
};

export const PLATFORM_EMOJI: Record<Platform, string> = {
  FACEBOOK: "📘",
  INSTAGRAM: "📷",
  LINKEDIN: "💼",
  YOUTUBE: "▶️",
  TIKTOK: "🎵",
};

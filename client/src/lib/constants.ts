export const CONTENT_TYPES = [
  { value: "educational", label: "Educational Thread" },
  { value: "news", label: "News Commentary" },
  { value: "personal", label: "Personal Insight" },
  { value: "analysis", label: "Industry Analysis" },
  { value: "creative", label: "Creative Story" },
] as const;

export const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "humorous", label: "Humorous" },
] as const;

export const WALLET_CONNECT_PROJECT_ID = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "your_project_id";

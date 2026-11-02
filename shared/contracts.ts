export type User = {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "user";
};
export type Status = "Pending" | "In Progress" | "Completed" | "Rejected";
export type LocationSource =
  "device_capture" | "photo_exif" | "device_upload_confirmed";
export type LocationEvidence = {
  latitude: number;
  longitude: number;
  location_source: LocationSource;
  location_recorded_at: string | null;
  location_accuracy_m: number | null;
  confirmed?: boolean;
};
export const locationNames: Record<string, string> = {
  device_capture: "GPS saat pengambilan foto",
  photo_exif: "Metadata lokasi foto",
  device_upload_confirmed: "GPS saat unggah, dikonfirmasi pelapor",
  legacy_unknown: "Sumber lokasi belum diketahui",
};
export type Prediction = {
  category: string;
  confidence: number;
  probabilities: Record<string, number>;
  model_version: string;
};
export type PhotoDraft = {
  id: string;
  image_url: string;
  image_url_expires_at: string;
  prediction: Prediction | null;
  classification_state: "analysis_failed" | "needs_review" | "classified";
  expires_at: string;
  photo_source: "camera" | "gallery";
  captured_at: string | null;
  latitude: number | null;
  longitude: number | null;
  location_source: string;
  location_recorded_at: string | null;
  location_accuracy_m: number | null;
};
export type Report = {
  id: string;
  user_id: string;
  user_name: string;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  status: Status;
  image_url: string;
  thumbnail_url: string;
  image_url_expires_at: string;
  ai_predicted_category: string | null;
  ai_confidence: number | null;
  ai_model_version: string | null;
  created_at: string;
  updated_at: string;
  revision: number;
  classification_state: string;
  photo_source: string | null;
  captured_at: string | null;
  location_source: string;
  location_recorded_at: string | null;
  location_accuracy_m: number | null;
};
export type ReportEvent = {
  id: string;
  kind: string;
  actor_name: string | null;
  details: Record<string, string | boolean | null>;
  reason: string | null;
  created_at: string;
};
export type Pagination = {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
};
export type ReportsPage = { reports: Report[]; pagination: Pagination };
export type Summary = {
  total_reports: number;
  by_category: Record<string, number>;
  by_status: Record<Status, number>;
};
export type AdminDashboard = {
  generated_at: string;
  date_from: string;
  date_to: string;
  timezone: string;
  category: string | null;
  status: Status | null;
  cohort: {
    total: number;
    by_status: Record<Status, number>;
    by_category: Record<string, number>;
    needs_review: number;
  };
  previous_total: number;
  change_percent: number | null;
  backlog: { active: number; needs_review: number };
  queue: Report[];
  review_queue: Report[];
  trend: { date: string; count: number }[];
  median_response_hours: number | null;
  median_completion_hours: number | null;
};
export const transitions: Record<Status, Status[]> = {
  Pending: ["In Progress", "Rejected"],
  "In Progress": ["Completed", "Rejected"],
  Completed: ["Pending"],
  Rejected: ["Pending"],
};

export type User = {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "user";
};
export type Status = "Pending" | "In Progress" | "Completed" | "Rejected";
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
  image_url_expires_at: string;
  ai_predicted_category: string | null;
  ai_confidence: number | null;
  ai_model_version: string | null;
  created_at: string;
  updated_at: string;
};
export type Pagination = {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
};
export type ReportsPage = { reports: Report[]; pagination: Pagination };
export type Prediction = {
  category: string;
  confidence: number;
  probabilities: Record<string, number>;
  model_version: string;
};
export type Summary = {
  total_reports: number;
  by_category: Record<string, number>;
  by_status: Record<Status, number>;
};

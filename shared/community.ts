import type { Status } from "./contracts";
export type Region = {
  code: string;
  parent_code: string | null;
  level: number;
  name: string;
};
export type Post = {
  id: string;
  author_name: string;
  is_owner: boolean;
  caption: string;
  state: string;
  image_url: string | null;
  image_url_expires_at: string | null;
  category: string;
  classification_state: string;
  status: Status;
  latitude: number;
  longitude: number;
  location_source: string;
  location_accuracy_m: number | null;
  location_label: string | null;
  location_state: string;
  region_code: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  revision: number;
  created_at: string;
};
export type Feed = { posts: Post[]; next_cursor: string | null };
export type Comment = {
  id: string;
  body: string;
  author_name: string;
  is_owner: boolean;
  created_at: string;
};
export type Comments = { comments: Comment[]; next_cursor: string | null };
export type MapPoints = {
  features: {
    count: number;
    longitude: number;
    latitude: number;
    post_id: string | null;
  }[];
  truncated: boolean;
};
export const regionLevels = [
  "Provinsi",
  "Kabupaten / kota",
  "Kecamatan",
  "Kelurahan / desa",
];

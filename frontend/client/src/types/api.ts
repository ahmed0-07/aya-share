// Types matching backend Prisma models

export interface User {
  id: string;
  name: string;
  email: string;
  googleId: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  url: string;
  storageKey: string;
  duration?: number;
  fileSize?: number;
  status: VideoStatus;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type VideoStatus = "PROCESSING" | "COMPLETED" | "FAILED";

// API Response types
export interface ApiResponse<T> {
  status: "Success" | "Failed";
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthResponse {
  status: "Success" | "Failed";
  data?: {
    user: User;
    accessToken: string;
  };
  error?: string;
}

export interface VideosResponse {
  status: "Success" | "Failed";
  data?: {
    videos: Video[];
  };
  error?: string;
}

export interface VideoResponse {
  status: "Success" | "Failed";
  data?: {
    video: Video;
  };
  error?: string;
}

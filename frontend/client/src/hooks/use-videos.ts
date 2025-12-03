import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Video, VideosResponse, VideoResponse } from "@/types/api";

const API_URL = "/api/v1";

// Get all videos for current user
export function useVideos() {
  return useQuery({
    queryKey: ["videos"],
    queryFn: async (): Promise<Video[]> => {
      const res = await fetch(`${API_URL}/video/allVideos`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch videos");
      }

      const json: VideosResponse = await res.json();
      return json.data?.videos ?? [];
    },
  });
}

// Get single video by ID
export function useVideo(id: string) {
  return useQuery({
    queryKey: ["video", id],
    queryFn: async (): Promise<Video | null> => {
      const res = await fetch(`${API_URL}/video/video/${id}`, {
        credentials: "include",
      });

      if (!res.ok) {
        return null;
      }

      const json: VideoResponse = await res.json();
      return json.data?.video ?? null;
    },
    enabled: !!id,
  });
}

// Create video from audio file
export function useCreateVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (audioFile: File): Promise<Video> => {
      const formData = new FormData();
      formData.append("audio", audioFile);

      const res = await fetch(`${API_URL}/video/createVideo`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create video");
      }

      const json: VideoResponse = await res.json();
      if (!json.data?.video) {
        throw new Error("No video returned");
      }
      return json.data.video;
    },
    onSuccess: () => {
      // Refetch videos list after creating a new one
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    },
  });
}

// Delete video
export function useDeleteVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoId: string): Promise<void> => {
      const res = await fetch(`${API_URL}/video/deleteVideo/${videoId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete video");
      }
    },
    onSuccess: () => {
      // Refetch videos list after deletion
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    },
  });
}

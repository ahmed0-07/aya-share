import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User } from "@/types/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API base URL
const API_URL = "/api/v1";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Fetch current user
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/auth/me`, {
        credentials: "include",
      });
      
      if (res.status === 401) {
        return null;
      }
      
      if (!res.ok) {
        throw new Error("Failed to fetch user");
      }
      
      const json = await res.json();
      return json.data?.user as User | null;
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Redirect to Google OAuth
  const login = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  // Logout
  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
    
    // Clear user data
    queryClient.setQueryData(["user"], null);
    queryClient.invalidateQueries({ queryKey: ["videos"] });
  };

  const value: AuthContextType = {
    user: data ?? null,
    isLoading,
    isAuthenticated: !!data,
    login,
    logout,
    refetchUser: refetch,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

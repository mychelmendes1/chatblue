import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  isAI: boolean;
  company: {
    id: string;
    name: string;
    slug: string;
    logo?: string;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: true,

      login: async (email, password) => {
        const response = await api.post("/auth/login", { email, password });
        const { user, accessToken, refreshToken } = response.data;

        set({
          user,
          accessToken,
          refreshToken,
          isLoading: false,
        });
      },

      logout: async () => {
        try {
          await api.post("/auth/logout");
        } catch (error) {
          // Ignore errors
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
        });
      },

      checkAuth: async () => {
        const { accessToken } = get();

        if (!accessToken) {
          set({ isLoading: false });
          return;
        }

        try {
          const response = await api.get("/auth/me");
          set({ user: response.data, isLoading: false });
        } catch (error) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: "chatblue-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

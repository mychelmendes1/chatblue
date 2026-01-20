import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  role?: string;
  isPrimary?: boolean;
  unreadCount?: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  isAI: boolean;
  company: Company;
  activeCompany?: Company;
  companies?: Company[];
}

interface AuthState {
  user: User | null;
  companies: Company[];
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isSwitchingCompany: boolean;
  isCheckingAuth: boolean;
  login: (email: string, password: string, companyId?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      companies: [],
      accessToken: null,
      refreshToken: null,
      isLoading: true,
      isSwitchingCompany: false,
      isCheckingAuth: false,

      login: async (email, password, companyId) => {
        const response = await api.post<{
          user: User;
          companies: Company[];
          accessToken: string;
          refreshToken: string;
        }>("/auth/login", { 
          email, 
          password,
          ...(companyId && { companyId }),
        });
        const { user, companies, accessToken, refreshToken } = response.data;

        set({
          user,
          companies: companies || [],
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
          companies: [],
          accessToken: null,
          refreshToken: null,
        });
      },

      checkAuth: async () => {
        const { accessToken, isCheckingAuth } = get();

        // Prevent multiple simultaneous calls
        if (isCheckingAuth) {
          return;
        }

        if (!accessToken) {
          set({ isLoading: false });
          return;
        }

        set({ isCheckingAuth: true });

        try {
          const [userResponse, companiesResponse] = await Promise.all([
            api.get<{
              id: string;
              email: string;
              name: string;
              avatar?: string;
              role: string;
              isAI: boolean;
              company: Company;
              activeCompany?: Company;
              companies?: Company[];
            }>("/auth/me"),
            api.get<Company[]>("/user-access/my-companies"),
          ]);
          
          const { companies: userCompanies, activeCompany, ...userData } = userResponse.data;
          const companiesWithUnread = companiesResponse.data || [];
          
          set({ 
            user: {
              ...userData,
              company: activeCompany || userData.company,
              activeCompany,
              companies: companiesWithUnread,
            },
            companies: companiesWithUnread,
            isLoading: false,
            isCheckingAuth: false,
          });
        } catch (error: any) {
          // Handle 429 (Too Many Requests) - don't clear auth, just wait
          if (error?.message?.includes('429') || error?.message?.includes('Too Many Requests')) {
            console.warn('Rate limit reached, will retry later');
            set({ 
              isLoading: false,
              isCheckingAuth: false,
            });
            // Don't clear auth state on rate limit
            return;
          }

          // For other errors, clear auth state
          set({
            user: null,
            companies: [],
            accessToken: null,
            refreshToken: null,
            isLoading: false,
            isCheckingAuth: false,
          });
        }
      },

      switchCompany: async (companyId: string) => {
        const { user } = get();
        
        if (!user || user.company?.id === companyId) {
          return;
        }

        set({ isSwitchingCompany: true });

        try {
          console.log("Switching to company:", companyId);
          const response = await api.post<{
            company: Company;
            role: string;
            accessToken: string;
            refreshToken: string;
          }>("/user-access/switch-company", { companyId });
          const { company, role, accessToken, refreshToken } = response.data;

          console.log("Received new token for company:", company.name);

          // Update state - this will trigger persist to localStorage
          set({
            user: {
              ...user,
              role,
              company,
              activeCompany: company,
            },
            accessToken,
            refreshToken,
            isSwitchingCompany: false,
          });

          // Wait for localStorage to be updated before dispatching event
          // Zustand persist is async, so we need a small delay
          await new Promise(resolve => setTimeout(resolve, 100));

          // Verify token was saved
          const stored = localStorage.getItem("chatblue-auth");
          if (stored) {
            const parsed = JSON.parse(stored);
            console.log("Token saved to localStorage, companyId in token should match:", company.id);
          }

          // Dispatch custom event to notify all components to refresh their data
          if (typeof window !== 'undefined') {
            console.log("Dispatching company-switched event");
            window.dispatchEvent(new CustomEvent('company-switched', { 
              detail: { companyId: company.id, companyName: company.name } 
            }));
          }
        } catch (error) {
          set({ isSwitchingCompany: false });
          throw error;
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

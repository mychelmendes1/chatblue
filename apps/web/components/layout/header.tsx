"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { useAuthStore, type Company } from "@/stores/auth.store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function Header() {
  const { user, companies, switchCompany, isSwitchingCompany } = useAuthStore();
  const [companiesWithUnread, setCompaniesWithUnread] = useState(companies);
  const currentCompany = user?.activeCompany || user?.company;

  const fetchCompanies = async () => {
    if (!user) return;
    
    try {
      const response = await api.get<Company[]>("/user-access/my-companies");
      setCompaniesWithUnread(response.data || []);
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    }
  };

  // Fetch companies with unread counts periodically
  useEffect(() => {
    fetchCompanies();
    // Poll every 30 seconds for unread counts
    const interval = setInterval(fetchCompanies, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // Listen for company switch events to refresh unread counts
  useEffect(() => {
    const handleCompanySwitch = () => {
      console.log("Company switched, refreshing header...");
      // Small delay to allow the new token to be saved
      setTimeout(() => {
        fetchCompanies();
      }, 500);
    };

    window.addEventListener('company-switched', handleCompanySwitch);
    return () => {
      window.removeEventListener('company-switched', handleCompanySwitch);
    };
  }, [user]);

  if (!user) return null;

  const handleTabChange = async (companyId: string) => {
    if (companyId === currentCompany?.id || isSwitchingCompany) return;
    
    try {
      await switchCompany(companyId);
    } catch (error) {
      console.error("Failed to switch company:", error);
    }
  };

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {companiesWithUnread.length > 1 ? (
          <Tabs
            value={currentCompany?.id || ""}
            onValueChange={handleTabChange}
            className="flex-1"
          >
            <TabsList className="h-10 bg-transparent p-0">
              {companiesWithUnread.map((company) => (
                <TabsTrigger
                  key={company.id}
                  value={company.id}
                  className={cn(
                    "relative px-4 py-2 h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent",
                    "hover:bg-muted/50 transition-colors"
                  )}
                  disabled={isSwitchingCompany}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={company.logo} alt={company.name} />
                      <AvatarFallback className="text-xs">
                        <Building2 className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm truncate max-w-[120px]">
                      {company.name}
                    </span>
                    {company.unreadCount && company.unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="ml-1 h-5 min-w-5 px-1.5 text-[10px] flex items-center justify-center"
                      >
                        {company.unreadCount > 99 ? "99+" : company.unreadCount}
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={currentCompany?.logo} alt={currentCompany?.name} />
              <AvatarFallback className="text-xs">
                <Building2 className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm">{currentCompany?.name}</span>
            {currentCompany && companiesWithUnread.find(c => c.id === currentCompany.id)?.unreadCount && 
             companiesWithUnread.find(c => c.id === currentCompany.id)!.unreadCount! > 0 && (
              <Badge
                variant="destructive"
                className="h-5 min-w-5 px-1.5 text-[10px]"
              >
                {companiesWithUnread.find(c => c.id === currentCompany.id)!.unreadCount! > 99 
                  ? "99+" 
                  : companiesWithUnread.find(c => c.id === currentCompany.id)!.unreadCount}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="text-xs">
            {user.name?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <Badge variant="secondary" className="text-xs hidden md:inline-flex">
          {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 
           user.role === 'ADMIN' ? 'Admin' : 
           user.role === 'SUPERVISOR' ? 'Supervisor' : 'Agente'}
        </Badge>
      </div>
    </header>
  );
}


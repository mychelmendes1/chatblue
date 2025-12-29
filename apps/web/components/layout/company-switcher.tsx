"use client";

import { useState } from "react";
import { Check, ChevronDown, Building2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth.store";
import { useToast } from "@/components/ui/use-toast";

export function CompanySwitcher() {
  const { user, companies, switchCompany, isSwitchingCompany } = useAuthStore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  if (!user || companies.length <= 1) {
    // Don't show switcher if only one company
    return null;
  }

  const currentCompany = user.activeCompany || user.company;

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectCompany = async (companyId: string) => {
    if (companyId === currentCompany?.id) {
      setOpen(false);
      return;
    }

    try {
      await switchCompany(companyId);
      toast({
        title: "Empresa alterada",
        description: "Você foi redirecionado para a nova empresa.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao trocar empresa",
        description: error.message || "Não foi possível trocar de empresa.",
        variant: "destructive",
      });
    }
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
          disabled={isSwitchingCompany}
        >
          <div className="flex items-center gap-2 truncate">
            <Avatar className="h-5 w-5">
              <AvatarImage src={currentCompany?.logo} alt={currentCompany?.name} />
              <AvatarFallback className="text-xs">
                <Building2 className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{currentCompany?.name}</span>
          </div>
          {isSwitchingCompany ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[280px] p-0" align="start">
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Suas empresas</DropdownMenuLabel>
        <div className="max-h-[300px] overflow-y-auto">
          {filteredCompanies.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              Nenhuma empresa encontrada.
            </div>
          ) : (
            filteredCompanies.map((company) => (
              <DropdownMenuItem
                key={company.id}
                onSelect={() => handleSelectCompany(company.id)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2 flex-1 w-full">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={company.logo} alt={company.name} />
                    <AvatarFallback className="text-xs">
                      <Building2 className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{company.name}</span>
                      {currentCompany?.id === company.id && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {company.isPrimary && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          Principal
                        </Badge>
                      )}
                      {company.role && (
                        <span className="text-[10px] text-muted-foreground">
                          {company.role === 'ADMIN' ? 'Admin' : 'Usuário'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Shield,
  User,
  Check,
  X,
  MoreVertical,
  Loader2,
  Clock,
  Search,
  Building2,
  Plus,
  Trash2,
  Edit,
  Wifi,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { Textarea } from "@/components/ui/textarea";

interface UserAccess {
  id: string;
  userId: string;
  companyId: string;
  role: "ADMIN" | "USER";
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedAt?: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    isActive: boolean;
    createdAt: string;
  };
  approvedBy?: {
    id: string;
    name: string;
  };
}

interface InternalUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  isOnline: boolean;
  departments: {
    department: {
      id: string;
      name: string;
      color?: string;
    };
  }[];
  _count: {
    tickets: number;
  };
  companyAccess?: {
    id: string;
    companyId: string;
    role: "ADMIN" | "USER";
    status: string;
    company: {
      id: string;
      name: string;
      slug: string;
      logo?: string;
    };
  }[];
}

interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  plan: "BASIC" | "PRO" | "ENTERPRISE";
  isActive?: boolean;
  createdAt?: string;
  _count?: {
    users: number;
    connections: number;
    tickets: number;
  };
}

interface AvailableCompany {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  plan: "BASIC" | "PRO" | "ENTERPRISE";
}

export default function UsersPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("access");
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);
  const [internalUsers, setInternalUsers] = useState<InternalUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Company dialog states
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({
    name: "",
    slug: "",
    logo: "",
    plan: "BASIC" as "BASIC" | "PRO" | "ENTERPRISE",
  });

  // Dialog states
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState<UserAccess | null>(null);
  const [selectedRole, setSelectedRole] = useState<"ADMIN" | "USER">("USER");
  const [isProcessing, setIsProcessing] = useState(false);

  // Company access dialog states
  const [showCompanyAccessDialog, setShowCompanyAccessDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<InternalUser | null>(null);
  const [availableCompanies, setAvailableCompanies] = useState<AvailableCompany[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedCompanyRole, setSelectedCompanyRole] = useState<"ADMIN" | "USER">("USER");

  useEffect(() => {
    if (activeTab === "access") {
      fetchUserAccess();
    } else if (activeTab === "internal") {
      fetchInternalUsers();
    } else if (activeTab === "companies" && user?.role === "SUPER_ADMIN") {
      fetchCompanies();
    }
  }, [activeTab, statusFilter, user]);

  // Listen for company switch events to reload data
  useEffect(() => {
    const handleCompanySwitch = () => {
      console.log("Company switched, reloading users...");
      setUserAccess([]);
      setInternalUsers([]);
      if (activeTab === "access") {
        fetchUserAccess();
      } else if (activeTab === "internal") {
        fetchInternalUsers();
      }
    };

    window.addEventListener('company-switched', handleCompanySwitch);
    return () => {
      window.removeEventListener('company-switched', handleCompanySwitch);
    };
  }, [activeTab]);

  async function fetchUserAccess() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await api.get<UserAccess[]>(`/user-access?${params}`);
      setUserAccess(response.data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar acessos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchInternalUsers() {
    setIsLoading(true);
    try {
      const response = await api.get<InternalUser[]>("/users");
      // Fetch company access for each user
      const usersWithAccess = await Promise.all(
        response.data.map(async (user) => {
          try {
            const userResponse = await api.get<InternalUser>(`/users/${user.id}`);
            return userResponse.data;
          } catch {
            return user;
          }
        })
      );
      setInternalUsers(usersWithAccess);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar usuários",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchCompanies() {
    setIsLoading(true);
    try {
      const response = await api.get<Company[]>("/companies");
      setCompanies(response.data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar empresas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleCreateCompany() {
    setEditingCompany(null);
    setCompanyForm({
      name: "",
      slug: "",
      logo: "",
      plan: "BASIC",
    });
    setShowCompanyDialog(true);
  }

  function handleEditCompany(company: Company) {
    setEditingCompany(company);
    setCompanyForm({
      name: company.name,
      slug: company.slug,
      logo: company.logo || "",
      plan: company.plan,
    });
    setShowCompanyDialog(true);
  }

  async function handleSaveCompany() {
    if (!companyForm.name || !companyForm.slug) {
      toast({
        title: "Erro",
        description: "Nome e slug são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(companyForm.slug)) {
      toast({
        title: "Erro",
        description: "O slug deve conter apenas letras minúsculas, números e hífens",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Prepare payload - remove empty logo
      const payload: any = {
        name: companyForm.name,
        slug: companyForm.slug,
        plan: companyForm.plan,
      };
      
      if (companyForm.logo && companyForm.logo.trim()) {
        payload.logo = companyForm.logo;
      }

      if (editingCompany) {
        await api.put(`/companies/${editingCompany.id}`, payload);
        toast({ title: "Empresa atualizada com sucesso" });
      } else {
        await api.post("/companies", payload);
        toast({ title: "Empresa criada com sucesso" });
      }
      setShowCompanyDialog(false);
      fetchCompanies();
    } catch (error: any) {
      console.error("Error saving company:", error);
      const errorMessage = 
        error.response?.data?.error || 
        error.response?.data?.message ||
        error.message ||
        "Falha ao salvar empresa";
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDeleteCompany(companyId: string) {
    if (!confirm("Tem certeza que deseja desativar esta empresa?")) return;

    try {
      await api.delete(`/companies/${companyId}`);
      toast({ title: "Empresa desativada" });
      fetchCompanies();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Falha ao desativar empresa",
        variant: "destructive",
      });
    }
  }

  const filteredCompanies = companies.filter((company) => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        company.name.toLowerCase().includes(searchLower) ||
        company.slug.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  async function fetchAvailableCompanies() {
    setIsLoadingCompanies(true);
    try {
      const response = await api.get<AvailableCompany[]>("/companies/all/active");
      setAvailableCompanies(response.data || []);
    } catch (error: any) {
      console.error("Error fetching available companies:", {
        error,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      
      let errorMessage = "Falha ao carregar empresas";
      
      if (error.response?.status === 403) {
        errorMessage = "Você não tem permissão para acessar esta funcionalidade. É necessário ser ADMIN ou SUPER_ADMIN.";
      } else if (error.response?.status === 401) {
        errorMessage = "Sua sessão expirou. Por favor, faça login novamente.";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingCompanies(false);
    }
  }

  function handleManageCompanies(user: InternalUser) {
    setSelectedUser(user);
    setSelectedCompanyId("");
    setSelectedCompanyRole("USER");
    setShowCompanyAccessDialog(true);
    fetchAvailableCompanies();
  }

  async function handleAddCompanyAccess() {
    if (!selectedUser || !selectedCompanyId) return;

    setIsProcessing(true);
    try {
      await api.post(`/users/${selectedUser.id}/company-access`, {
        companyId: selectedCompanyId,
        role: selectedCompanyRole,
      });
      toast({ title: "Acesso à empresa adicionado com sucesso" });
      setSelectedCompanyId("");
      fetchInternalUsers();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Falha ao adicionar acesso",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRemoveCompanyAccess(companyId: string) {
    if (!selectedUser) return;

    try {
      await api.delete(`/users/${selectedUser.id}/company-access/${companyId}`);
      toast({ title: "Acesso à empresa removido" });
      fetchInternalUsers();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Falha ao remover acesso",
        variant: "destructive",
      });
    }
  }

  function handleApprove(access: UserAccess) {
    setSelectedAccess(access);
    setSelectedRole("USER");
    setShowApproveDialog(true);
  }

  async function confirmApprove() {
    if (!selectedAccess) return;
    setIsProcessing(true);

    try {
      await api.post(`/user-access/${selectedAccess.id}/approve`, {
        role: selectedRole,
      });
      toast({ title: "Acesso aprovado com sucesso" });
      setShowApproveDialog(false);
      fetchUserAccess();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao aprovar acesso",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleReject(access: UserAccess) {
    try {
      await api.post(`/user-access/${access.id}/reject`);
      toast({ title: "Acesso rejeitado" });
      fetchUserAccess();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao rejeitar acesso",
        variant: "destructive",
      });
    }
  }

  async function handleChangeRole(access: UserAccess, newRole: "ADMIN" | "USER") {
    try {
      await api.put(`/user-access/${access.id}/role`, { role: newRole });
      toast({ title: "Função atualizada" });
      fetchUserAccess();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao alterar função",
        variant: "destructive",
      });
    }
  }

  async function handleRevoke(access: UserAccess) {
    try {
      await api.delete(`/user-access/${access.id}`);
      toast({ title: "Acesso revogado" });
      fetchUserAccess();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao revogar acesso",
        variant: "destructive",
      });
    }
  }

  const filteredAccess = userAccess.filter((access) => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        access.user.name.toLowerCase().includes(searchLower) ||
        access.user.email.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const filteredUsers = internalUsers.filter((user) => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const pendingCount = userAccess.filter((a) => a.status === "PENDING").length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Usuários</h1>
          <p className="text-muted-foreground">
            Controle o acesso de usuários à empresa
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="access" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Controle de Acesso
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="internal" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Usuários Internos
            </TabsTrigger>
            {user?.role === "SUPER_ADMIN" && (
              <TabsTrigger value="companies" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Empresas
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <TabsContent value="access">
          {/* Status Filter */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              Todos
            </Button>
            <Button
              variant={statusFilter === "PENDING" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("PENDING")}
            >
              Pendentes
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingCount}
                </Badge>
              )}
            </Button>
            <Button
              variant={statusFilter === "APPROVED" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("APPROVED")}
            >
              Aprovados
            </Button>
            <Button
              variant={statusFilter === "REJECTED" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("REJECTED")}
            >
              Rejeitados
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userAccess.length}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {userAccess.filter((a) => a.status === "APPROVED").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Aprovados</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {userAccess.filter((a) => a.role === "ADMIN" && a.status === "APPROVED").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Admins</p>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aprovado por</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredAccess.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccess.map((access) => (
                    <TableRow key={access.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={access.user.avatar} />
                            <AvatarFallback>
                              {access.user.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{access.user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{access.user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={access.role === "ADMIN" ? "default" : "secondary"}
                        >
                          {access.role === "ADMIN" ? (
                            <>
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3 mr-1" />
                              Usuário
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            access.status === "APPROVED"
                              ? "default"
                              : access.status === "PENDING"
                              ? "secondary"
                              : "destructive"
                          }
                          className={cn(
                            access.status === "APPROVED" && "bg-green-500"
                          )}
                        >
                          {access.status === "APPROVED"
                            ? "Aprovado"
                            : access.status === "PENDING"
                            ? "Pendente"
                            : "Rejeitado"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {access.approvedBy?.name || "-"}
                      </TableCell>
                      <TableCell>
                        {new Date(access.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        {access.status === "PENDING" ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-700 hover:bg-green-100"
                              onClick={() => handleApprove(access)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700 hover:bg-red-100"
                              onClick={() => handleReject(access)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : access.status === "APPROVED" ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleChangeRole(
                                    access,
                                    access.role === "ADMIN" ? "USER" : "ADMIN"
                                  )
                                }
                              >
                                {access.role === "ADMIN"
                                  ? "Rebaixar para Usuário"
                                  : "Promover a Admin"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleRevoke(access)}
                              >
                                Revogar Acesso
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="internal">
          {/* Internal Users Table */}
          <div className="bg-card rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Departamentos</TableHead>
                  <TableHead>Empresas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tickets Ativos</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar>
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>
                                {user.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                                user.isOnline ? "bg-green-500" : "bg-gray-400"
                              )}
                            />
                          </div>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {user.departments.slice(0, 2).map((ud) => (
                            <Badge
                              key={ud.department.id}
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor: ud.department.color,
                                color: ud.department.color,
                              }}
                            >
                              {ud.department.name}
                            </Badge>
                          ))}
                          {user.departments.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.departments.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {user.companyAccess && user.companyAccess.length > 0 ? (
                            <>
                              {user.companyAccess.slice(0, 2).map((access) => (
                                <Badge
                                  key={access.id}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  <Building2 className="w-3 h-3 mr-1" />
                                  {access.company.name}
                                </Badge>
                              ))}
                              {user.companyAccess.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{user.companyAccess.length - 2}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">Apenas empresa principal</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.isActive ? "default" : "secondary"}
                          className={cn(user.isActive && "bg-green-500")}
                        >
                          {user.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user._count?.tickets ?? 0}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleManageCompanies(user)}
                          title="Gerenciar empresas"
                        >
                          <Building2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="companies">
          {user?.role !== "SUPER_ADMIN" ? (
            <div className="text-center py-12 text-muted-foreground">
              Apenas Super Admins podem gerenciar empresas
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <Button onClick={handleCreateCompany}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Empresa
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-card rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{companies.length}</p>
                      <p className="text-sm text-muted-foreground">Total</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {companies.filter((c) => c.isActive).length}
                      </p>
                      <p className="text-sm text-muted-foreground">Ativas</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {companies.reduce((acc, c) => acc + (c._count?.users ?? 0), 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Usuários</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Wifi className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {companies.reduce((acc, c) => acc + (c._count?.connections ?? 0), 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Conexões</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-card rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Usuários</TableHead>
                      <TableHead>Conexões</TableHead>
                      <TableHead>Tickets</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredCompanies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Nenhuma empresa encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCompanies.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={company.logo} />
                                <AvatarFallback>
                                  <Building2 className="w-4 h-4" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{company.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {company.slug}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{company.plan}</Badge>
                          </TableCell>
                          <TableCell>{company._count?.users ?? 0}</TableCell>
                          <TableCell>{company._count?.connections ?? 0}</TableCell>
                          <TableCell>{company._count?.tickets ?? 0}</TableCell>
                          <TableCell>
                            <Badge
                              variant={company.isActive ? "default" : "secondary"}
                              className={cn(company.isActive && "bg-green-500")}
                            >
                              {company.isActive ? "Ativa" : "Inativa"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditCompany(company)}
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              {company.isActive && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleDeleteCompany(company.id)}
                                  title="Desativar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Acesso</DialogTitle>
            <DialogDescription>
              Defina a função do usuário {selectedAccess?.user.name} na empresa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Função</Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as "ADMIN" | "USER")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Usuário - Acesso básico
                    </div>
                  </SelectItem>
                  <SelectItem value="ADMIN">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Admin - Acesso total
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedRole === "ADMIN"
                  ? "Admins podem gerenciar usuários, configurações e ter acesso total ao sistema."
                  : "Usuários têm acesso básico para atendimento e visualização."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmApprove} disabled={isProcessing}>
              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Access Dialog */}
      <Dialog open={showCompanyAccessDialog} onOpenChange={setShowCompanyAccessDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerenciar Acesso a Empresas</DialogTitle>
            <DialogDescription>
              Defina quais empresas o usuário {selectedUser?.name} terá acesso
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Current Access */}
            <div className="space-y-2">
              <Label>Empresas com Acesso</Label>
              {selectedUser?.companyAccess && selectedUser.companyAccess.length > 0 ? (
                <div className="space-y-2">
                  {selectedUser.companyAccess.map((access) => (
                    <div
                      key={access.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={access.company.logo} />
                          <AvatarFallback>
                            <Building2 className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{access.company.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {access.role === "ADMIN" ? "Admin" : "Usuário"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCompanyAccess(access.companyId)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Usuário tem acesso apenas à empresa principal
                </p>
              )}
            </div>

            {/* Add New Access */}
            <div className="space-y-2 border-t pt-4">
              <Label>Adicionar Acesso a Empresa</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedCompanyId}
                  onValueChange={setSelectedCompanyId}
                  disabled={isLoadingCompanies}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={isLoadingCompanies ? "Carregando empresas..." : "Selecione uma empresa"} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingCompanies ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : availableCompanies.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        Nenhuma empresa disponível
                      </div>
                    ) : (
                      availableCompanies
                        .filter(
                          (company) =>
                            !selectedUser?.companyAccess?.some(
                              (access) => access.companyId === company.id
                            )
                        )
                        .map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={company.logo} />
                                <AvatarFallback>
                                  <Building2 className="w-3 h-3" />
                                </AvatarFallback>
                              </Avatar>
                              {company.name}
                            </div>
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedCompanyRole}
                  onValueChange={(v) => setSelectedCompanyRole(v as "ADMIN" | "USER")}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">Usuário</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddCompanyAccess}
                  disabled={!selectedCompanyId || isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompanyAccessDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Dialog */}
      <Dialog open={showCompanyDialog} onOpenChange={setShowCompanyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? "Editar Empresa" : "Nova Empresa"}
            </DialogTitle>
            <DialogDescription>
              {editingCompany
                ? "Atualize as informações da empresa"
                : "Preencha os dados para criar uma nova empresa"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Nome *</Label>
              <Input
                id="company-name"
                value={companyForm.name}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nome da empresa"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-slug">Slug *</Label>
              <Input
                id="company-slug"
                value={companyForm.slug}
                onChange={(e) =>
                  setCompanyForm((prev) => ({
                    ...prev,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                  }))
                }
                placeholder="empresa-exemplo"
                required
              />
              <p className="text-xs text-muted-foreground">
                Identificador único (apenas letras, números e hífens)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-logo">Logo URL</Label>
              <Input
                id="company-logo"
                value={companyForm.logo}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, logo: e.target.value }))}
                placeholder="https://exemplo.com/logo.png"
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-plan">Plano</Label>
              <Select
                value={companyForm.plan}
                onValueChange={(v) =>
                  setCompanyForm((prev) => ({ ...prev, plan: v as "BASIC" | "PRO" | "ENTERPRISE" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BASIC">Basic</SelectItem>
                  <SelectItem value="PRO">Pro</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompanyDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCompany} disabled={isProcessing}>
              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCompany ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

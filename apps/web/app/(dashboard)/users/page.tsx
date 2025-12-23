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
}

export default function UsersPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("access");
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);
  const [internalUsers, setInternalUsers] = useState<InternalUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Dialog states
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState<UserAccess | null>(null);
  const [selectedRole, setSelectedRole] = useState<"ADMIN" | "USER">("USER");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (activeTab === "access") {
      fetchUserAccess();
    } else {
      fetchInternalUsers();
    }
  }, [activeTab, statusFilter]);

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
      setInternalUsers(response.data);
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
                  <TableHead>Status</TableHead>
                  <TableHead>Tickets Ativos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                        <Badge
                          variant={user.isActive ? "default" : "secondary"}
                          className={cn(user.isActive && "bg-green-500")}
                        >
                          {user.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user._count.tickets}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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
    </div>
  );
}

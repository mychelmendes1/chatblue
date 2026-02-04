"use client";

import { useEffect, useState } from "react";
import {
  Wifi,
  WifiOff,
  Plus,
  QrCode,
  RefreshCw,
  Trash2,
  MoreVertical,
  Smartphone,
  Cloud,
  CheckCircle,
  XCircle,
  Loader2,
  Building2,
  Edit,
  Bot,
  User,
  Settings2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { cn, formatPhone } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";

interface Connection {
  id: string;
  name: string;
  type: "BAILEYS" | "META_CLOUD" | "INSTAGRAM";
  phone?: string;
  status: "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "BANNED" | "ERROR";
  isDefault: boolean;
  isActive: boolean;
  lastConnected?: string;
  companyId?: string;
  instagramAccountId?: string;
  instagramUsername?: string;
  aiEnabled: boolean;
  defaultUserId?: string | null;
  defaultUser?: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
  company?: {
    id: string;
    name: string;
    logo?: string;
  };
  _count?: {
    tickets: number;
    messages: number;
  };
}

interface CompanyUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isAI: boolean;
}

export default function ConnectionsPage() {
  const { toast } = useToast();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [qrCode, setQRCode] = useState<string | null>(null);
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [selectedConnectionForCompany, setSelectedConnectionForCompany] = useState<Connection | null>(null);
  const [availableCompanies, setAvailableCompanies] = useState<Array<{ id: string; name: string; logo?: string }>>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const { user } = useAuthStore();
  
  // AI Settings dialog state
  const [showAISettingsDialog, setShowAISettingsDialog] = useState(false);
  const [selectedConnectionForAI, setSelectedConnectionForAI] = useState<Connection | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [selectedDefaultUserId, setSelectedDefaultUserId] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<CompanyUser[]>([]);
  const [isLoadingAISettings, setIsLoadingAISettings] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, []);

  // Listen for company switch events to reload data
  useEffect(() => {
    const handleCompanySwitch = () => {
      console.log("Company switched, reloading connections...");
      setConnections([]);
      fetchConnections();
    };

    window.addEventListener('company-switched', handleCompanySwitch);
    return () => {
      window.removeEventListener('company-switched', handleCompanySwitch);
    };
  }, []);

  // Poll for connection status when QR dialog is open
  useEffect(() => {
    if (!showQRDialog || !selectedConnection) return;

    const pollStatus = async () => {
      try {
        const response = await api.get<Connection[]>("/connections");
        const connection = response.data.find(c => c.id === selectedConnection.id);
        if (connection?.status === "CONNECTED") {
          setShowQRDialog(false);
          setQRCode(null);
          setSelectedConnection(null);
          toast({ title: "WhatsApp conectado com sucesso!" });
          fetchConnections();
        }
      } catch (error) {
        // Ignore polling errors
      }
    };

    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [showQRDialog, selectedConnection]);

  async function fetchConnections() {
    console.log("Fetching connections...");
    try {
      const response = await api.get<Connection[]>("/connections");
      console.log("Connections fetched:", response.data?.length, "connections", response.data);
      setConnections(response.data || []);
    } catch (error: any) {
      console.error("Error fetching connections:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || error.message || "Falha ao carregar conexões",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConnect(connection: Connection) {
    try {
      if (connection.type === "BAILEYS") {
        setSelectedConnection(connection);
        setShowQRDialog(true);
        await fetchQRCode(connection.id);
      } else {
        await api.post(`/connections/${connection.id}/connect`);
        const channelName = connection.type === "INSTAGRAM" ? "Instagram" : "WhatsApp";
        toast({ title: `Conectando ${channelName}...` });
        fetchConnections();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao conectar",
        variant: "destructive",
      });
    }
  }

  async function fetchQRCode(connectionId: string) {
    setIsLoadingQR(true);
    try {
      const response = await api.get<{ qrCode: string }>(`/connections/${connectionId}/qr`);
      setQRCode(response.data.qrCode);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao obter QR Code",
        variant: "destructive",
      });
    } finally {
      setIsLoadingQR(false);
    }
  }

  async function handleDisconnect(connectionId: string) {
    try {
      await api.post(`/connections/${connectionId}/disconnect`);
      toast({ title: "Desconectado" });
      fetchConnections();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao desconectar",
        variant: "destructive",
      });
    }
  }

  async function handleSetDefault(connectionId: string) {
    try {
      await api.post(`/connections/${connectionId}/default`);
      toast({ title: "Conexão padrão atualizada" });
      fetchConnections();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar",
        variant: "destructive",
      });
    }
  }

  async function handleDelete(connectionId: string) {
    if (!confirm("Tem certeza que deseja remover esta conexão? Todas as mensagens e conversas serão preservadas.")) return;

    try {
      const response = await api.delete(`/connections/${connectionId}`);
      toast({ 
        title: "Conexão removida",
        description: (response.data as any)?.message || "A conexão foi desativada e todas as mensagens foram preservadas."
      });
      fetchConnections();
    } catch (error: any) {
      console.error("Error deleting connection:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || error.message || "Falha ao remover conexão",
        variant: "destructive",
      });
    }
  }

  async function fetchAvailableCompanies() {
    try {
      const response = await api.get<Array<{ id: string; name: string; logo?: string }>>("/companies/all/active");
      setAvailableCompanies(response.data || []);
    } catch (error: any) {
      console.error("Error fetching available companies:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || error.message || "Falha ao carregar empresas",
        variant: "destructive",
      });
    }
  }

  function handleChangeCompany(connection: Connection) {
    setSelectedConnectionForCompany(connection);
    setSelectedCompanyId(connection.companyId || "");
    fetchAvailableCompanies();
    setShowCompanyDialog(true);
  }

  async function handleUpdateCompany() {
    if (!selectedConnectionForCompany || !selectedCompanyId) return;

    try {
      await api.put(`/connections/${selectedConnectionForCompany.id}/company`, {
        companyId: selectedCompanyId,
      });
      toast({ title: "Empresa da conexão atualizada" });
      setShowCompanyDialog(false);
      fetchConnections();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Falha ao atualizar empresa",
        variant: "destructive",
      });
    }
  }

  // AI Settings functions
  async function fetchAvailableUsers(companyId: string) {
    try {
      const response = await api.get<CompanyUser[]>(`/users?companyId=${companyId}`);
      // Filter out AI users - only show human users as default recipients
      const humanUsers = (response.data || []).filter(u => !u.isAI);
      setAvailableUsers(humanUsers);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar usuários",
        variant: "destructive",
      });
    }
  }

  function handleOpenAISettings(connection: Connection) {
    setSelectedConnectionForAI(connection);
    setAiEnabled(connection.aiEnabled !== false);
    setSelectedDefaultUserId(connection.defaultUserId || "");
    if (connection.companyId) {
      fetchAvailableUsers(connection.companyId);
    }
    setShowAISettingsDialog(true);
  }

  async function handleSaveAISettings() {
    if (!selectedConnectionForAI) return;

    // Validate: if AI is disabled, must select a default user
    if (!aiEnabled && !selectedDefaultUserId) {
      toast({
        title: "Usuário obrigatório",
        description: "Quando a IA está desabilitada, você deve selecionar um usuário padrão para receber as mensagens.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingAISettings(true);
    try {
      await api.patch(`/connections/${selectedConnectionForAI.id}/ai-settings`, {
        aiEnabled,
        defaultUserId: selectedDefaultUserId || null,
      });
      toast({ 
        title: "Configurações de IA atualizadas",
        description: aiEnabled 
          ? "A IA está habilitada para esta conexão." 
          : `Mensagens serão direcionadas para ${availableUsers.find(u => u.id === selectedDefaultUserId)?.name || 'o usuário selecionado'}.`
      });
      setShowAISettingsDialog(false);
      fetchConnections();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.response?.data?.message || error.response?.data?.error || "Falha ao salvar configurações",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAISettings(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "CONNECTED":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "CONNECTING":
        return <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />;
      case "DISCONNECTED":
        return <WifiOff className="w-5 h-5 text-gray-400" />;
      case "BANNED":
      case "ERROR":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <WifiOff className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "CONNECTED":
        return "Conectado";
      case "CONNECTING":
        return "Conectando...";
      case "DISCONNECTED":
        return "Desconectado";
      case "BANNED":
        return "Banido";
      case "ERROR":
        return "Erro";
      default:
        return status;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Conexões</h1>
          <p className="text-muted-foreground">
            Gerencie suas conexões com WhatsApp e Instagram
          </p>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conexão
            </Button>
          </DialogTrigger>
          <DialogContent>
            <NewConnectionDialog
              onSuccess={() => {
                console.log("onSuccess called, closing dialog and refreshing connections...");
                setShowNewDialog(false);
                // Small delay to ensure dialog closes before fetching
                setTimeout(() => {
                  fetchConnections();
                }, 100);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wifi className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma conexão</h3>
            <p className="text-muted-foreground text-center mb-4">
              Adicione uma conexão WhatsApp para começar a atender
            </p>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Conexão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connections.map((connection) => (
            <Card key={connection.id} className={cn(
              connection.isDefault && "ring-2 ring-primary"
            )}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  {connection.type === "BAILEYS" ? (
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Smartphone className="w-5 h-5 text-green-600" />
                    </div>
                  ) : connection.type === "INSTAGRAM" ? (
                    <div className="p-2 bg-gradient-to-br from-purple-100 via-pink-100 to-orange-100 rounded-lg">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-pink-600" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Cloud className="w-5 h-5 text-blue-600" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-base">{connection.name}</CardTitle>
                    <CardDescription>
                      {connection.type === "BAILEYS" ? "WhatsApp" : connection.type === "INSTAGRAM" ? "Instagram DM" : "API Oficial"}
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenAISettings(connection)}>
                      <Settings2 className="w-4 h-4 mr-2" />
                      Configurar IA
                    </DropdownMenuItem>
                    {user?.role === "SUPER_ADMIN" && (
                      <DropdownMenuItem onClick={() => handleChangeCompany(connection)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Alterar Empresa
                      </DropdownMenuItem>
                    )}
                    {!connection.isDefault && (
                      <DropdownMenuItem onClick={() => handleSetDefault(connection.id)}>
                        Definir como padrão
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(connection.id)}
                    >
                      Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(connection.status)}
                      <span className="text-sm">{getStatusLabel(connection.status)}</span>
                    </div>
                  </div>

                  {connection.company && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Empresa</span>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={connection.company.logo} />
                          <AvatarFallback className="text-[8px]">
                            <Building2 className="w-2 h-2" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{connection.company.name}</span>
                      </div>
                    </div>
                  )}

                  {connection.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Número</span>
                      <span className="text-sm font-mono">
                        {formatPhone(connection.phone)}
                      </span>
                    </div>
                  )}

                  {connection.instagramUsername && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Instagram</span>
                      <span className="text-sm font-mono text-pink-600">
                        @{connection.instagramUsername}
                      </span>
                    </div>
                  )}

                  {connection._count && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Tickets</span>
                      <span className="text-sm">{connection._count.tickets}</span>
                    </div>
                  )}

                  {connection.lastConnected && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Última conexão</span>
                      <span className="text-sm">
                        {new Date(connection.lastConnected).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}

                  {/* AI Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Atendimento IA</span>
                    <div className="flex items-center gap-2">
                      {connection.aiEnabled !== false ? (
                        <>
                          <Bot className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600">Ativo</span>
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4 text-orange-500" />
                          <span className="text-sm text-orange-600">
                            {connection.defaultUser?.name || "Humano"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {connection.isDefault && (
                    <div className="text-xs text-primary font-medium">
                      Conexão padrão
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {connection.status === "CONNECTED" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDisconnect(connection.id)}
                      >
                        <WifiOff className="w-4 h-4 mr-2" />
                        Desconectar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleConnect(connection)}
                      >
                        <Wifi className="w-4 h-4 mr-2" />
                        Conectar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escanear QR Code</DialogTitle>
            <DialogDescription>
              Abra o WhatsApp no seu celular e escaneie o QR Code abaixo
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            {isLoadingQR ? (
              <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : qrCode ? (
              <img src={qrCode} alt="QR Code" className="w-64 h-64" />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
                <p className="text-muted-foreground">QR Code não disponível</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => selectedConnection && fetchQRCode(selectedConnection.id)}
              disabled={isLoadingQR}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoadingQR && "animate-spin")} />
              Atualizar QR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Company Dialog */}
      <Dialog open={showCompanyDialog} onOpenChange={setShowCompanyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Empresa da Conexão</DialogTitle>
            <DialogDescription>
              Selecione a empresa para a conexão {selectedConnectionForCompany?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select
                value={selectedCompanyId}
                onValueChange={setSelectedCompanyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {availableCompanies.map((company) => (
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
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompanyDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateCompany} disabled={!selectedCompanyId}>
              Atualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Settings Dialog */}
      <Dialog open={showAISettingsDialog} onOpenChange={setShowAISettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações de IA</DialogTitle>
            <DialogDescription>
              Configure o atendimento de IA para a conexão {selectedConnectionForAI?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* AI Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ai-enabled" className="text-base">
                  Atendente de IA
                </Label>
                <p className="text-sm text-muted-foreground">
                  Quando ativado, a IA atende automaticamente as mensagens desta conexão
                </p>
              </div>
              <Switch
                id="ai-enabled"
                checked={aiEnabled}
                onCheckedChange={setAiEnabled}
              />
            </div>

            {/* Default User Selection - only shown when AI is disabled */}
            {!aiEnabled && (
              <div className="space-y-2 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-orange-600" />
                  <Label className="text-orange-800 dark:text-orange-200 font-medium">
                    Usuário Padrão (Obrigatório)
                  </Label>
                </div>
                <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                  Com a IA desabilitada, as mensagens serão direcionadas automaticamente para este usuário.
                </p>
                <Select
                  value={selectedDefaultUserId}
                  onValueChange={setSelectedDefaultUserId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>
                              <User className="w-3 h-3" />
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.name}</span>
                          <span className="text-muted-foreground text-xs">({user.email})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableUsers.length === 0 && (
                  <p className="text-sm text-orange-600 mt-2">
                    Nenhum usuário disponível. Adicione usuários à empresa primeiro.
                  </p>
                )}
              </div>
            )}

            {/* Info box when AI is enabled */}
            {aiEnabled && (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800 dark:text-green-200">
                    A IA atenderá automaticamente todas as mensagens desta conexão.
                    Quando necessário, a IA transferirá para um atendente humano.
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAISettingsDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveAISettings} 
              disabled={isLoadingAISettings || (!aiEnabled && !selectedDefaultUserId)}
            >
              {isLoadingAISettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewConnectionDialog({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [type, setType] = useState<"BAILEYS" | "META_CLOUD" | "INSTAGRAM">("BAILEYS");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [availableCompanies, setAvailableCompanies] = useState<Array<{ id: string; name: string; logo?: string }>>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  // Meta Cloud fields
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [webhookToken, setWebhookToken] = useState("");

  // Instagram fields
  const [instagramAccountId, setInstagramAccountId] = useState("");
  const [instagramAccessToken, setInstagramAccessToken] = useState("");
  const [instagramWebhookToken, setInstagramWebhookToken] = useState("");

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      fetchAvailableCompanies();
    }
  }, [user]);

  async function fetchAvailableCompanies() {
    try {
      const response = await api.get<Array<{ id: string; name: string; logo?: string }>>("/companies/all/active");
      setAvailableCompanies(response.data || []);
      // Set default to current company if available
      if (user?.company?.id) {
        setSelectedCompanyId(user.company.id);
      }
    } catch (error: any) {
      console.error("Error fetching available companies:", error);
      // Don't show toast here as it's called on mount and might be annoying
      // The error will be visible in console for debugging
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("Form submitted, type:", type, "name:", name);
    
    if (!name.trim()) {
      console.warn("Validation failed: name is empty");
      toast({
        title: "Erro",
        description: "O nome da conexão é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (type === "META_CLOUD") {
      if (!accessToken.trim() || !phoneNumberId.trim() || !businessId.trim() || !webhookToken.trim()) {
        console.warn("Validation failed: META_CLOUD fields incomplete");
        toast({
          title: "Erro",
          description: "Todos os campos da API Oficial são obrigatórios",
          variant: "destructive",
        });
        return;
      }
    }

    if (type === "INSTAGRAM") {
      if (!instagramAccessToken.trim() || !instagramAccountId.trim() || !instagramWebhookToken.trim()) {
        console.warn("Validation failed: INSTAGRAM fields incomplete");
        toast({
          title: "Erro",
          description: "Todos os campos do Instagram são obrigatórios",
          variant: "destructive",
        });
        return;
      }
    }

    if (isLoading) {
      console.warn("Already loading, ignoring submit");
      return;
    }

    setIsLoading(true);
    console.log("Starting connection creation...");

    try {
      const payload: any = {
        name: name.trim(),
        type,
      };

      // Add companyId if super admin and selected
      if (user?.role === "SUPER_ADMIN" && selectedCompanyId) {
        payload.companyId = selectedCompanyId;
        console.log("Adding companyId to payload:", selectedCompanyId);
      }

      console.log("Creating connection with payload:", JSON.stringify(payload, null, 2));
      
      let response;
      if (type === "BAILEYS") {
        console.log("Creating BAILEYS connection...");
        response = await api.post("/connections/baileys", payload);
        console.log("BAILEYS connection created successfully:", response.data);
      } else if (type === "INSTAGRAM") {
        console.log("Creating INSTAGRAM connection...");
        const instagramPayload = {
          ...payload,
          accessToken: instagramAccessToken.trim(),
          instagramAccountId: instagramAccountId.trim(),
          webhookToken: instagramWebhookToken.trim(),
        };
        console.log("INSTAGRAM payload (without token):", { ...instagramPayload, accessToken: "***" });
        response = await api.post("/connections/instagram", instagramPayload);
        console.log("INSTAGRAM connection created successfully:", response.data);
      } else {
        console.log("Creating META_CLOUD connection...");
        const metaPayload = {
          ...payload,
          accessToken: accessToken.trim(),
          phoneNumberId: phoneNumberId.trim(),
          businessId: businessId.trim(),
          webhookToken: webhookToken.trim(),
        };
        console.log("META_CLOUD payload (without token):", { ...metaPayload, accessToken: "***" });
        response = await api.post("/connections/meta-cloud", metaPayload);
        console.log("META_CLOUD connection created successfully:", response.data);
      }
      
      console.log("Connection created successfully, showing toast...");
      toast({ 
        title: "Conexão criada com sucesso",
        description: `A conexão "${name.trim()}" foi criada.`
      });
      
      console.log("Resetting form...");
      // Reset form
      setName("");
      setAccessToken("");
      setPhoneNumberId("");
      setBusinessId("");
      setWebhookToken("");
      setInstagramAccessToken("");
      setInstagramAccountId("");
      setInstagramWebhookToken("");
      setSelectedCompanyId("");
      setType("BAILEYS"); // Reset to default type
      
      console.log("Form reset, calling onSuccess callback...");
      // Call onSuccess after a small delay to ensure toast is shown
      setTimeout(() => {
        onSuccess();
        console.log("onSuccess callback completed");
      }, 500);
    } catch (error: any) {
      console.error("Error creating connection:", {
        error,
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data,
      });
      
      let errorMessage = "Falha ao criar conexão";
      
      if (error.response?.data?.details) {
        // Zod validation errors
        const details = error.response.data.details;
        errorMessage = details.map((d: any) => `${d.field}: ${d.message}`).join(", ");
        console.error("Validation errors:", details);
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro ao criar conexão",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      console.log("Setting isLoading to false");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Nova Conexão</DialogTitle>
        <DialogDescription>
          Escolha o tipo de conexão e configure os detalhes
        </DialogDescription>
      </DialogHeader>

      <div className="py-4 space-y-4">
        <Tabs value={type} onValueChange={(v) => setType(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="BAILEYS">
              <Smartphone className="w-4 h-4 mr-2" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="META_CLOUD">
              <Cloud className="w-4 h-4 mr-2" />
              API Oficial
            </TabsTrigger>
            <TabsTrigger value="INSTAGRAM" className="text-pink-600">
              <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              Instagram
            </TabsTrigger>
          </TabsList>

          <TabsContent value="BAILEYS" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da conexão</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: WhatsApp Principal"
                required
              />
            </div>
            {user?.role === "SUPER_ADMIN" && (
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select
                  value={selectedCompanyId}
                  onValueChange={setSelectedCompanyId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCompanies.map((company) => (
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
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Conexão via WhatsApp. Você precisará escanear um QR Code.
            </p>
          </TabsContent>

          <TabsContent value="META_CLOUD" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name-meta">Nome da conexão</Label>
              <Input
                id="name-meta"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: WhatsApp Business"
                required
              />
            </div>
            {user?.role === "SUPER_ADMIN" && (
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select
                  value={selectedCompanyId}
                  onValueChange={setSelectedCompanyId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCompanies.map((company) => (
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
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Input
                id="accessToken"
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Token de acesso da Meta"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumberId">Phone Number ID</Label>
              <Input
                id="phoneNumberId"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="ID do número de telefone"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessId">Business ID</Label>
              <Input
                id="businessId"
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                placeholder="ID do negócio"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhookToken">Webhook Verify Token</Label>
              <Input
                id="webhookToken"
                value={webhookToken}
                onChange={(e) => setWebhookToken(e.target.value)}
                placeholder="Token de verificação do webhook"
                required
              />
            </div>
          </TabsContent>

          <TabsContent value="INSTAGRAM" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name-instagram">Nome da conexão</Label>
              <Input
                id="name-instagram"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Instagram Loja"
                required
              />
            </div>
            {user?.role === "SUPER_ADMIN" && (
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select
                  value={selectedCompanyId}
                  onValueChange={setSelectedCompanyId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCompanies.map((company) => (
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
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="instagramAccountId">Instagram Account ID</Label>
              <Input
                id="instagramAccountId"
                value={instagramAccountId}
                onChange={(e) => setInstagramAccountId(e.target.value)}
                placeholder="ID da conta do Instagram"
                required
              />
              <p className="text-xs text-muted-foreground">
                O ID da conta profissional do Instagram (IGSID)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagramAccessToken">Access Token</Label>
              <Input
                id="instagramAccessToken"
                type="password"
                value={instagramAccessToken}
                onChange={(e) => setInstagramAccessToken(e.target.value)}
                placeholder="Token de acesso da Meta"
                required
              />
              <p className="text-xs text-muted-foreground">
                Token de acesso da API do Instagram (Meta Graph API)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagramWebhookToken">Webhook Verify Token</Label>
              <Input
                id="instagramWebhookToken"
                value={instagramWebhookToken}
                onChange={(e) => setInstagramWebhookToken(e.target.value)}
                placeholder="Token de verificação do webhook"
                required
              />
            </div>
            <div className="p-3 bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800 rounded-md">
              <p className="text-xs text-pink-800 dark:text-pink-200">
                <strong>Nota:</strong> Para usar Instagram DM, você precisa de uma conta profissional
                do Instagram conectada a uma página do Facebook. O token deve ter permissões de
                <code className="mx-1 px-1 bg-pink-100 dark:bg-pink-900 rounded">instagram_basic</code> e
                <code className="mx-1 px-1 bg-pink-100 dark:bg-pink-900 rounded">instagram_manage_messages</code>.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Criar Conexão
        </Button>
      </DialogFooter>
    </form>
  );
}

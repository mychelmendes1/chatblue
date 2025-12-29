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
} from "lucide-react";
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
  type: "BAILEYS" | "META_CLOUD";
  phone?: string;
  status: "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "BANNED" | "ERROR";
  isDefault: boolean;
  isActive: boolean;
  lastConnected?: string;
  companyId?: string;
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
        toast({ title: "Conectando..." });
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
          <h1 className="text-2xl font-bold">Conexões WhatsApp</h1>
          <p className="text-muted-foreground">
            Gerencie suas conexões com WhatsApp
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
                  ) : (
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Cloud className="w-5 h-5 text-blue-600" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-base">{connection.name}</CardTitle>
                    <CardDescription>
                      {connection.type === "BAILEYS" ? "WhatsApp" : "API Oficial"}
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
    </div>
  );
}

function NewConnectionDialog({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [type, setType] = useState<"BAILEYS" | "META_CLOUD">("BAILEYS");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [availableCompanies, setAvailableCompanies] = useState<Array<{ id: string; name: string; logo?: string }>>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  // Meta Cloud fields
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [webhookToken, setWebhookToken] = useState("");

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
        <DialogTitle>Nova Conexão WhatsApp</DialogTitle>
        <DialogDescription>
          Escolha o tipo de conexão e configure os detalhes
        </DialogDescription>
      </DialogHeader>

      <div className="py-4 space-y-4">
        <Tabs value={type} onValueChange={(v) => setType(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="BAILEYS">
              <Smartphone className="w-4 h-4 mr-2" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="META_CLOUD">
              <Cloud className="w-4 h-4 mr-2" />
              API Oficial
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

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Mail,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Wifi,
  WifiOff,
  TestTube,
  Eye,
  EyeOff,
  Settings2,
  Chrome,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";

interface EmailConnection {
  id: string;
  name: string;
  email: string;
  authType: "PLAIN" | "OAUTH2";
  oauthProvider?: string;
  status: "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapTls: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpTls: boolean;
  fromName?: string;
  pollIntervalSec: number;
  lastPollAt?: string;
  lastError?: string;
  isActive: boolean;
  createdAt: string;
}

const DEFAULT_FORM = {
  name: "",
  email: "",
  imapHost: "",
  imapPort: 993,
  imapUser: "",
  imapPassword: "",
  imapTls: true,
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPassword: "",
  smtpTls: true,
  fromName: "",
  pollIntervalSec: 60,
};

function statusBadge(status: string) {
  switch (status) {
    case "CONNECTED":
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Conectado</Badge>;
    case "CONNECTING":
      return <Badge className="bg-yellow-100 text-yellow-800"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Conectando</Badge>;
    case "ERROR":
      return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
    default:
      return <Badge variant="secondary"><WifiOff className="h-3 w-3 mr-1" />Desconectado</Badge>;
  }
}

export function EmailConnections() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<EmailConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [showGoogleDialog, setShowGoogleDialog] = useState(false);
  const [googleName, setGoogleName] = useState("Suporte");
  const [googleFromName, setGoogleFromName] = useState("");
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  useEffect(() => { fetchConnections(); }, []);

  // Handle OAuth redirect
  useEffect(() => {
    const oauthStatus = searchParams.get("oauth");
    const oauthEmail = searchParams.get("email");
    const oauthMessage = searchParams.get("message");
    if (oauthStatus === "success") {
      toast({ title: "Google conectado!", description: oauthEmail ? `Email: ${oauthEmail}` : undefined });
      fetchConnections();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (oauthStatus === "error") {
      toast({ title: "Erro na conexão Google", description: oauthMessage || "Tente novamente", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  async function fetchConnections() {
    setIsLoading(true);
    try {
      const res = await api.get<EmailConnection[]>("/email-connections");
      setConnections(res.data);
    } catch {
      toast({ title: "Erro", description: "Falha ao carregar conexões de email", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConnectGoogle() {
    if (!googleName.trim()) return;
    setIsConnectingGoogle(true);
    try {
      const params = new URLSearchParams({ name: googleName, ...(googleFromName ? { fromName: googleFromName } : {}) });
      const res = await api.get<{ url: string }>(`/email-connections/oauth/google/start?${params}`);
      window.location.href = res.data.url;
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.response?.data?.error || err?.response?.data?.message || "Falha ao iniciar conexão Google. Verifique se GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET estão configurados.",
        variant: "destructive",
      });
      setIsConnectingGoogle(false);
    }
  }

  function openNew() {
    setForm(DEFAULT_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(conn: EmailConnection) {
    setForm({
      name: conn.name,
      email: conn.email,
      imapHost: conn.imapHost,
      imapPort: conn.imapPort,
      imapUser: conn.imapUser,
      imapPassword: "",
      imapTls: conn.imapTls,
      smtpHost: conn.smtpHost,
      smtpPort: conn.smtpPort,
      smtpUser: conn.smtpUser,
      smtpPassword: "",
      smtpTls: conn.smtpTls,
      fromName: conn.fromName || "",
      pollIntervalSec: conn.pollIntervalSec,
    });
    setEditingId(conn.id);
    setShowForm(true);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const body = { ...form };
      if (editingId) {
        if (!body.imapPassword) delete (body as any).imapPassword;
        if (!body.smtpPassword) delete (body as any).smtpPassword;
        await api.put(`/email-connections/${editingId}`, body);
        toast({ title: "Conexão atualizada" });
      } else {
        await api.post("/email-connections", body);
        toast({ title: "Conexão criada" });
      }
      setShowForm(false);
      fetchConnections();
    } catch (err: any) {
      toast({ title: "Erro", description: err?.response?.data?.error || "Falha ao salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTest(id: string) {
    setIsTesting(true);
    try {
      const res = await api.post<{ imap: boolean; smtp: boolean; errors: string[] }>(`/email-connections/${id}/test`);
      const { imap, smtp, errors } = res.data;
      const status = imap && smtp ? "Sucesso" : "Atenção";
      toast({
        title: status,
        description: `IMAP: ${imap ? "OK" : "Falha"} | SMTP: ${smtp ? "OK" : "Falha"}${errors.length ? "\n" + errors.join("\n") : ""}`,
        variant: imap && smtp ? "default" : "destructive",
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err?.response?.data?.error || "Falha ao testar", variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  }

  async function handleToggle(conn: EmailConnection) {
    try {
      if (conn.isActive) {
        await api.post(`/email-connections/${conn.id}/disconnect`);
        toast({ title: "Polling desativado" });
      } else {
        await api.post(`/email-connections/${conn.id}/connect`);
        toast({ title: "Polling ativado" });
      }
      fetchConnections();
    } catch (err: any) {
      toast({ title: "Erro", description: err?.response?.data?.error || "Falha", variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta conexão de email?")) return;
    try {
      await api.delete(`/email-connections/${id}`);
      toast({ title: "Conexão removida" });
      fetchConnections();
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao remover", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Conexões de Email
          </h3>
          <p className="text-sm text-muted-foreground">Configure caixas de email como canal de atendimento</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowGoogleDialog(true)} size="sm" variant="outline" className="gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Conectar Gmail
          </Button>
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            IMAP/SMTP Manual
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-8 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma conexão de email configurada</p>
            <Button onClick={openNew} variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Email
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((conn) => (
            <Card key={conn.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{conn.name}</CardTitle>
                      <CardDescription>{conn.email}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {conn.authType === "OAUTH2" && (
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                        <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        Google
                      </Badge>
                    )}
                    {statusBadge(conn.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-3">
                  <span>IMAP: {conn.imapHost}:{conn.imapPort}</span>
                  <span>|</span>
                  <span>SMTP: {conn.smtpHost}:{conn.smtpPort}</span>
                  {conn.lastPollAt && (
                    <>
                      <span>|</span>
                      <span>Último poll: {new Date(conn.lastPollAt).toLocaleString("pt-BR")}</span>
                    </>
                  )}
                </div>
                {conn.lastError && (
                  <p className="text-xs text-red-500 mb-3">{conn.lastError}</p>
                )}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleTest(conn.id)} disabled={isTesting}>
                    <TestTube className="h-3.5 w-3.5 mr-1" />
                    Testar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleToggle(conn)}>
                    {conn.isActive ? <WifiOff className="h-3.5 w-3.5 mr-1" /> : <Wifi className="h-3.5 w-3.5 mr-1" />}
                    {conn.isActive ? "Desativar" : "Ativar"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(conn)} disabled={conn.authType === "OAUTH2"} title={conn.authType === "OAUTH2" ? "Conexão OAuth gerenciada pelo Google" : undefined}>
                    <Settings2 className="h-3.5 w-3.5 mr-1" />
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(conn.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Conexão de Email" : "Nova Conexão de Email"}</DialogTitle>
            <DialogDescription>Configure os servidores IMAP (receber) e SMTP (enviar)</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input placeholder="Suporte" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input placeholder="suporte@empresa.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nome do remetente (opcional)</Label>
              <Input placeholder="Equipe de Suporte" value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} />
            </div>

            {/* IMAP */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm">IMAP (Receber emails)</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Host</Label>
                  <Input placeholder="imap.gmail.com" value={form.imapHost} onChange={(e) => setForm({ ...form, imapHost: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Porta</Label>
                  <Input type="number" value={form.imapPort} onChange={(e) => setForm({ ...form, imapPort: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Usuário</Label>
                  <Input value={form.imapUser} onChange={(e) => setForm({ ...form, imapUser: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Senha</Label>
                  <div className="relative">
                    <Input
                      type={showPasswords ? "text" : "password"}
                      placeholder={editingId ? "(manter atual)" : ""}
                      value={form.imapPassword}
                      onChange={(e) => setForm({ ...form, imapPassword: e.target.value })}
                    />
                    <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.imapTls} onCheckedChange={(v) => setForm({ ...form, imapTls: v })} />
                <Label>TLS/SSL</Label>
              </div>
            </div>

            {/* SMTP */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm">SMTP (Enviar emails)</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Host</Label>
                  <Input placeholder="smtp.gmail.com" value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Porta</Label>
                  <Input type="number" value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Usuário</Label>
                  <Input value={form.smtpUser} onChange={(e) => setForm({ ...form, smtpUser: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Senha</Label>
                  <div className="relative">
                    <Input
                      type={showPasswords ? "text" : "password"}
                      placeholder={editingId ? "(manter atual)" : ""}
                      value={form.smtpPassword}
                      onChange={(e) => setForm({ ...form, smtpPassword: e.target.value })}
                    />
                    <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.smtpTls} onCheckedChange={(v) => setForm({ ...form, smtpTls: v })} />
                <Label>TLS/SSL</Label>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Intervalo de polling (segundos)</Label>
              <Input type="number" min={15} value={form.pollIntervalSec} onChange={(e) => setForm({ ...form, pollIntervalSec: Number(e.target.value) })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving || !form.name || !form.email || !form.imapHost || !form.smtpHost}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingId ? "Salvar" : "Criar Conexão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Google OAuth Dialog */}
      <Dialog open={showGoogleDialog} onOpenChange={setShowGoogleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Conectar Gmail / Google Workspace
            </DialogTitle>
            <DialogDescription>
              Conecte sua conta Google para receber e enviar emails via Gmail. Os servidores IMAP/SMTP serão configurados automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome da conexão</Label>
              <Input placeholder="Suporte" value={googleName} onChange={(e) => setGoogleName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nome do remetente (opcional)</Label>
              <Input placeholder="Equipe de Suporte" value={googleFromName} onChange={(e) => setGoogleFromName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGoogleDialog(false)}>Cancelar</Button>
            <Button onClick={handleConnectGoogle} disabled={isConnectingGoogle || !googleName.trim()}>
              {isConnectingGoogle ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : (
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              )}
              Conectar com Google
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Users,
  Phone,
  Mail,
  Tag,
  MoreVertical,
  ExternalLink,
  RefreshCw,
  MessageSquare,
  Loader2,
  CheckCircle,
  XCircle,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Plus,
  Send,
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { formatPhone } from "@/lib/utils";

interface Contact {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  avatar?: string;
  isClient: boolean;
  isExClient: boolean;
  clientSince?: string;
  tags: string[];
  notionPageId?: string;
  createdAt: string;
  _count?: {
    tickets: number;
  };
}

interface ImportResult {
  message: string;
  imported: number;
  skipped: number;
  errors: Array<{ phone: string; error: string }>;
}

export default function ContactsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isStartingConversation, setIsStartingConversation] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // Import states
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<Array<{ phone: string; name?: string; email?: string }>>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // New contact states
  const [showNewContactDialog, setShowNewContactDialog] = useState(false);
  const [newContactForm, setNewContactForm] = useState({ phone: "", name: "", email: "" });

  useEffect(() => {
    fetchContacts();
  }, [pagination.page, search]);

  // Listen for company switch events to reload data
  useEffect(() => {
    const handleCompanySwitch = () => {
      console.log("Company switched, reloading contacts...");
      setContacts([]);
      setPagination(p => ({ ...p, page: 1 }));
      fetchContacts();
    };

    window.addEventListener('company-switched', handleCompanySwitch);
    return () => {
      window.removeEventListener('company-switched', handleCompanySwitch);
    };
  }, []);

  async function fetchContacts() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.set("search", search);

      const response = await api.get<{
        contacts: Contact[];
        pagination: typeof pagination;
      }>(`/contacts?${params}`);

      setContacts(response.data.contacts);
      setPagination(response.data.pagination);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar contatos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleEdit(contact: Contact) {
    setSelectedContact(contact);
    setEditForm({
      name: contact.name || "",
      email: contact.email || "",
    });
    setShowEditDialog(true);
  }

  async function handleSave() {
    if (!selectedContact) return;
    setIsSaving(true);

    try {
      await api.put(`/contacts/${selectedContact.id}`, editForm);
      toast({ title: "Contato atualizado" });
      setShowEditDialog(false);
      fetchContacts();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar contato",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSyncNotion(contactId: string) {
    try {
      await api.post(`/contacts/${contactId}/sync-notion`);
      toast({ title: "Sincronizado com Notion" });
      fetchContacts();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao sincronizar com Notion",
        variant: "destructive",
      });
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchContacts();
  };

  function parseImportText(text: string) {
    const lines = text.trim().split("\n");
    const contacts: Array<{ phone: string; name?: string; email?: string }> = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      // Try to parse as CSV (phone, name, email) or (phone; name; email) or (phone\tname\temail)
      const parts = line.split(/[,;\t]/).map((p) => p.trim());

      if (parts.length >= 1 && parts[0]) {
        contacts.push({
          phone: parts[0],
          name: parts[1] || undefined,
          email: parts[2] || undefined,
        });
      }
    }

    return contacts;
  }

  function handleImportTextChange(text: string) {
    setImportText(text);
    setImportPreview(parseImportText(text).slice(0, 5));
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportText(text);
      setImportPreview(parseImportText(text).slice(0, 5));
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    const contacts = parseImportText(importText);
    if (contacts.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum contato válido encontrado",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const response = await api.post<ImportResult>("/contacts/import", {
        contacts,
        skipDuplicates,
      });

      setImportResult(response.data);
      fetchContacts();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao importar contatos",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  }

  function resetImportDialog() {
    setImportText("");
    setImportPreview([]);
    setImportResult(null);
    setShowImportDialog(false);
  }

  async function handleCreateContact() {
    if (!newContactForm.phone) {
      toast({
        title: "Erro",
        description: "Telefone é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await api.post("/contacts", {
        phone: newContactForm.phone,
        name: newContactForm.name || undefined,
        email: newContactForm.email || undefined,
      });
      toast({ title: "Contato criado com sucesso" });
      setShowNewContactDialog(false);
      setNewContactForm({ phone: "", name: "", email: "" });
      fetchContacts();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar contato",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStartConversation(contact: Contact) {
    setIsStartingConversation(contact.id);
    try {
      // Create or get existing ticket for this contact
      const response = await api.post<{ id: string; isNew: boolean }>("/tickets/start-conversation", {
        contactId: contact.id,
      });

      if (response.data.isNew) {
        toast({ title: "Nova conversa iniciada" });
      }

      // Navigate to chat with the ticket selected
      router.push(`/chat?ticket=${response.data.id}`);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao iniciar conversa. Verifique se há uma conexão WhatsApp ativa.",
        variant: "destructive",
      });
    } finally {
      setIsStartingConversation(null);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Contatos</h1>
          <p className="text-muted-foreground">
            Gerencie seus contatos e clientes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button onClick={() => setShowNewContactDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Contato
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit">Buscar</Button>
        </form>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
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
              <p className="text-2xl font-bold">{pagination.total}</p>
              <p className="text-sm text-muted-foreground">Total de Contatos</p>
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
                {contacts.filter((c) => c.isClient).length}
              </p>
              <p className="text-sm text-muted-foreground">Clientes Ativos</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <XCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {contacts.filter((c) => c.isExClient).length}
              </p>
              <p className="text-sm text-muted-foreground">Ex-Clientes</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {contacts.reduce((acc, c) => acc + (c._count?.tickets || 0), 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total de Tickets</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contato</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Tickets</TableHead>
              <TableHead>Notion</TableHead>
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
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum contato encontrado
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow 
                  key={contact.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleStartConversation(contact)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={contact.avatar} />
                        <AvatarFallback>
                          {(contact.name || contact.phone)
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {contact.name || "Sem nome"}
                        </span>
                        {isStartingConversation === contact.id && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Iniciando conversa...
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatPhone(contact.phone)}
                  </TableCell>
                  <TableCell>{contact.email || "-"}</TableCell>
                  <TableCell>
                    {contact.isClient ? (
                      <Badge variant="default" className="bg-green-500">
                        Cliente
                      </Badge>
                    ) : contact.isExClient ? (
                      <Badge variant="secondary">Ex-Cliente</Badge>
                    ) : (
                      <Badge variant="outline">Novo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {contact.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {contact.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{contact.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{contact._count?.tickets || 0}</TableCell>
                  <TableCell>
                    {contact.notionPageId ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-300" />
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartConversation(contact)}
                        disabled={isStartingConversation === contact.id}
                        title="Iniciar conversa"
                      >
                        {isStartingConversation === contact.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStartConversation(contact)}>
                            <Send className="w-4 h-4 mr-2" />
                            Iniciar Conversa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(contact)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSyncNotion(contact.id)}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Sincronizar Notion
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Ver Tickets
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Mostrando {(pagination.page - 1) * pagination.limit + 1} a{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} de{" "}
              {pagination.total} contatos
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.pages}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
            <DialogDescription>
              Atualize as informações do contato
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Nome do contato"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={selectedContact ? formatPhone(selectedContact.phone) : ""}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                O telefone não pode ser alterado
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => !open && resetImportDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Importar Contatos
            </DialogTitle>
            <DialogDescription>
              Cole ou carregue uma lista de contatos no formato: telefone, nome, email (um por linha)
            </DialogDescription>
          </DialogHeader>

          {!importResult ? (
            <>
              <div className="space-y-4 py-4">
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Carregar arquivo CSV
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Dados dos contatos</Label>
                  <Textarea
                    placeholder={"5511999999999, João Silva, joao@email.com\n5511888888888, Maria Santos\n5511777777777"}
                    value={importText}
                    onChange={(e) => handleImportTextChange(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Formato: telefone, nome, email (separados por vírgula, ponto-e-vírgula ou tab)
                  </p>
                </div>

                {importPreview.length > 0 && (
                  <div className="space-y-2">
                    <Label>Pré-visualização ({parseImportText(importText).length} contatos)</Label>
                    <div className="border rounded-md p-3 bg-muted/50 space-y-1 text-sm">
                      {importPreview.map((contact, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span className="font-mono">{contact.phone}</span>
                          {contact.name && <span>• {contact.name}</span>}
                          {contact.email && <span className="text-muted-foreground">• {contact.email}</span>}
                        </div>
                      ))}
                      {parseImportText(importText).length > 5 && (
                        <p className="text-muted-foreground">
                          ... e mais {parseImportText(importText).length - 5} contatos
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="skip-duplicates"
                    checked={skipDuplicates}
                    onCheckedChange={setSkipDuplicates}
                  />
                  <Label htmlFor="skip-duplicates">
                    Pular contatos duplicados (manter existentes)
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetImportDialog}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isImporting || parseImportText(importText).length === 0}
                >
                  {isImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Importar {parseImportText(importText).length} contatos
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="py-4 space-y-4">
                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">Importação concluída</p>
                    <p className="text-sm text-green-700">{importResult.message}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-card rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
                    <p className="text-sm text-muted-foreground">Importados</p>
                  </div>
                  <div className="bg-card rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{importResult.skipped}</p>
                    <p className="text-sm text-muted-foreground">Ignorados</p>
                  </div>
                  <div className="bg-card rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{importResult.errors.length}</p>
                    <p className="text-sm text-muted-foreground">Erros</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      Erros na importação
                    </Label>
                    <div className="border border-red-200 rounded-md p-3 bg-red-50 space-y-1 text-sm max-h-32 overflow-y-auto">
                      {importResult.errors.map((error, i) => (
                        <div key={i} className="flex items-center gap-2 text-red-700">
                          <span className="font-mono">{error.phone}</span>
                          <span>• {error.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button onClick={resetImportDialog}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Contact Dialog */}
      <Dialog open={showNewContactDialog} onOpenChange={setShowNewContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Contato</DialogTitle>
            <DialogDescription>
              Adicione um novo contato à sua lista
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-phone">Telefone *</Label>
              <Input
                id="new-phone"
                value={newContactForm.phone}
                onChange={(e) =>
                  setNewContactForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="5511999999999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-name">Nome</Label>
              <Input
                id="new-name"
                value={newContactForm.name}
                onChange={(e) =>
                  setNewContactForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Nome do contato"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newContactForm.email}
                onChange={(e) =>
                  setNewContactForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="email@exemplo.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewContactDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateContact} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Contato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

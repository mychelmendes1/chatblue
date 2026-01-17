"use client";

import { useEffect, useState } from "react";
import { Search, Filter, Bot, User, Clock, Plus, Loader2, Phone, Users, CheckSquare, FileText, AlertCircle, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { cn, formatDate, formatPhone, getStatusColor, formatSLATime } from "@/lib/utils";
import { useChatStore } from "@/stores/chat.store";
import { useAuthStore } from "@/stores/auth.store";
import { api } from "@/lib/api";
import { TemplateSelector } from "./template-selector";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Connection {
  id: string;
  name: string;
  type: string;
  phone?: string;
  status: string;
  instagramUsername?: string;
  instagramAccountId?: string;
}

interface ContactResult {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  avatar?: string;
  isClient: boolean;
}

export function ChatSidebar() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const {
    tickets,
    selectedTicket,
    setTickets,
    selectTicket,
    filters,
    setFilters,
    isLoadingTickets,
    setLoadingTickets,
    showResolved,
    setShowResolved,
    clearData,
  } = useChatStore();

  const [search, setSearch] = useState("");

  // New conversation states
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [newConvoTab, setNewConvoTab] = useState<"contact" | "manual" | "template">("contact");
  const [phoneInput, setPhoneInput] = useState("");
  const [contactNameInput, setContactNameInput] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ContactResult[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactResult | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Check if selected connection is Meta Cloud or Instagram
  const selectedConnection = connections.find(c => c.id === selectedConnectionId);
  const isMetaCloud = selectedConnection?.type === "META_CLOUD";
  const isInstagram = selectedConnection?.type === "INSTAGRAM";

  useEffect(() => {
    fetchTickets();
  }, [filters, showResolved]);

  // Listen for company switch events to reload data
  useEffect(() => {
    const handleCompanySwitch = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log("Company switched event received!", detail);
      clearData();
      // Small delay to ensure new token is saved before fetching
      setTimeout(() => {
        console.log("Fetching tickets for new company...");
        fetchTickets();
      }, 300);
    };

    window.addEventListener('company-switched', handleCompanySwitch);
    return () => {
      window.removeEventListener('company-switched', handleCompanySwitch);
    };
  }, [clearData]);

  async function fetchTickets() {
    setLoadingTickets(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.departmentId) params.set("departmentId", filters.departmentId);
      if (filters.assignedToId) params.set("assignedToId", filters.assignedToId);
      if (filters.isAIHandled !== undefined) params.set("isAIHandled", String(filters.isAIHandled));
      if (filters.mentionedUserId) params.set("mentionedUserId", filters.mentionedUserId);
      if (search) params.set("search", search);
      if (!showResolved) params.set("hideResolved", "true");

      const response = await api.get<{ tickets: any[] }>(`/tickets?${params}`);
      setTickets(response.data.tickets);
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setLoadingTickets(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  async function fetchConnections() {
    try {
      const response = await api.get<Connection[]>("/connections");
      const activeConnections = response.data.filter(
        (c) => c.status === "CONNECTED"
      );
      setConnections(activeConnections);
      if (activeConnections.length > 0 && !selectedConnectionId) {
        setSelectedConnectionId(activeConnections[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch connections:", error);
    }
  }

  async function searchContacts(query: string) {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get<ContactResult[]>(
        `/contacts/search?q=${encodeURIComponent(query)}`
      );
      setSearchResults(response.data);
    } catch (error) {
      console.error("Failed to search contacts:", error);
    } finally {
      setIsSearching(false);
    }
  }

  function handleOpenNewConversation() {
    setShowNewConversationDialog(true);
    fetchConnections();
  }

  function resetNewConversationDialog() {
    setPhoneInput("");
    setContactNameInput("");
    setContactSearch("");
    setSearchResults([]);
    setSelectedContact(null);
    setNewConvoTab("contact");
    setShowNewConversationDialog(false);
    setShowTemplateSelector(false);
  }

  async function handleSendTemplate(template: any, variables: Record<string, string>) {
    if (!selectedConnectionId) return;
    
    // First create the ticket/conversation
    let phone = "";
    let contactId: string | undefined;
    let contactName: string | undefined;

    if (selectedContact) {
      phone = selectedContact.phone;
      contactId = selectedContact.id;
    } else if (phoneInput) {
      phone = phoneInput.replace(/\D/g, "");
      contactName = contactNameInput || undefined;
    } else {
      toast({
        title: "Erro",
        description: "Selecione um contato ou digite um telefone primeiro",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Create ticket first
      const ticketResponse = await api.post<{ ticket: any; isExisting: boolean }>("/tickets", {
        phone,
        contactId,
        contactName,
        connectionId: selectedConnectionId,
      });

      const ticket = ticketResponse.data.ticket;

      // Build components array for the API
      const templateVars = Object.keys(variables);
      
      // Check if template uses named parameters (non-numeric variable names)
      const isNamedParams = templateVars.length > 0 && templateVars.some(v => isNaN(parseInt(v)));
      
      let bodyParameters;
      if (isNamedParams) {
        // Named parameters format for Meta API
        bodyParameters = templateVars.map(v => ({
          type: "text" as const,
          parameter_name: v,
          text: variables[v],
        }));
      } else {
        // Positional parameters format (sorted by number)
        const sortedVars = templateVars.sort((a, b) => parseInt(a) - parseInt(b));
        bodyParameters = sortedVars.map(v => ({
          type: "text" as const,
          text: variables[v],
        }));
      }

      const components = bodyParameters.length > 0 ? [{
        type: "body" as const,
        parameters: bodyParameters,
      }] : [];

      // Send template message
      await api.post("/messages/template", {
        ticketId: ticket.id,
        templateName: template.name,
        languageCode: template.language,
        components,
      });

      toast({ 
        title: "Template enviado",
        description: ticketResponse.data.isExisting ? "Mensagem enviada para conversa existente" : "Nova conversa iniciada com template",
      });

      resetNewConversationDialog();
      fetchTickets();
      selectTicket(ticket);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar template",
        description: error.message || "Falha ao enviar mensagem template",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCreateConversation() {
    if (!selectedConnectionId) {
      toast({
        title: "Erro",
        description: "Selecione uma conexão WhatsApp",
        variant: "destructive",
      });
      return;
    }

    let phone = "";
    let contactId: string | undefined;
    let contactName: string | undefined;

    if (newConvoTab === "contact" && selectedContact) {
      phone = selectedContact.phone;
      contactId = selectedContact.id;
    } else if (newConvoTab === "manual" && phoneInput) {
      phone = phoneInput.replace(/\D/g, "");
      contactName = contactNameInput || undefined;
    } else {
      toast({
        title: "Erro",
        description: "Selecione um contato ou digite um telefone",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.post<{ ticket: any; isExisting: boolean }>("/tickets", {
        phone,
        contactId,
        contactName,
        connectionId: selectedConnectionId,
      });

      if (response.data.isExisting) {
        toast({
          title: "Conversa existente",
          description: "Uma conversa já existe com este contato",
        });
      } else {
        toast({ title: "Nova conversa iniciada" });
      }

      resetNewConversationDialog();
      fetchTickets();
      selectTicket(response.data.ticket);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar conversa",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="w-full md:w-80 border-r flex flex-col bg-card h-full">
      {/* Header */}
      <div className="p-3 md:p-4 border-b">
        <div className="flex items-center justify-between mb-2 md:mb-3">
          <h2 className="text-base md:text-lg font-semibold">Conversas</h2>
          <Button
            size="icon"
            variant="outline"
            onClick={handleOpenNewConversation}
            title="Nova conversa"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </form>

        {/* Quick Filters */}
        <div className="flex gap-1.5 md:gap-2 mt-2 md:mt-3 flex-wrap">
          <Button
            variant={!filters.status && !filters.assignedToId && filters.isAIHandled === undefined && !filters.mentionedUserId ? "default" : "outline"}
            size="sm"
            className="text-xs md:text-sm px-2 md:px-3 h-7 md:h-8"
            onClick={() => setFilters({ status: undefined, assignedToId: undefined, isAIHandled: undefined, mentionedUserId: undefined })}
          >
            Todos
          </Button>
          <Button
            variant={filters.status === "PENDING" && !filters.assignedToId && filters.isAIHandled === undefined && !filters.mentionedUserId ? "default" : "outline"}
            size="sm"
            className="text-xs md:text-sm px-2 md:px-3 h-7 md:h-8"
            onClick={() => setFilters({ status: "PENDING", assignedToId: undefined, isAIHandled: undefined, mentionedUserId: undefined })}
          >
            Fila
          </Button>
          <Button
            variant={filters.assignedToId === user?.id && filters.isAIHandled === undefined && !filters.mentionedUserId ? "default" : "outline"}
            size="sm"
            className="text-xs md:text-sm px-2 md:px-3 h-7 md:h-8"
            onClick={() => setFilters({ status: undefined, assignedToId: user?.id, isAIHandled: undefined, mentionedUserId: undefined })}
          >
            Meus
          </Button>
          <Button
            variant={filters.isAIHandled === true ? "default" : "outline"}
            size="sm"
            className="text-xs md:text-sm px-2 md:px-3 h-7 md:h-8"
            onClick={() => setFilters({ status: undefined, assignedToId: undefined, isAIHandled: true, mentionedUserId: undefined })}
          >
            🤖 IA
          </Button>
          <Button
            variant={filters.mentionedUserId === user?.id ? "default" : "outline"}
            size="sm"
            className="text-xs md:text-sm px-2 md:px-3 h-7 md:h-8"
            onClick={() => setFilters({ status: undefined, assignedToId: undefined, isAIHandled: undefined, mentionedUserId: user?.id })}
          >
            @ Menções
          </Button>
        </div>

        {/* Show Resolved Toggle */}
        <div className="flex items-center justify-between mt-2 md:mt-3 pt-2 md:pt-3 border-t">
          <label
            htmlFor="showResolved"
            className="text-xs md:text-sm text-muted-foreground cursor-pointer select-none flex items-center gap-1.5 md:gap-2"
          >
            <CheckSquare className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Mostrar resolvidas
          </label>
          <Switch
            id="showResolved"
            checked={showResolved}
            onCheckedChange={setShowResolved}
          />
        </div>
      </div>

      {/* Ticket List */}
      <ScrollArea className="flex-1">
        {isLoadingTickets ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="divide-y">
            {tickets.map((ticket) => (
              <TicketItem
                key={ticket.id}
                ticket={ticket}
                isSelected={selectedTicket?.id === ticket.id}
                onSelect={() => selectTicket(ticket)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* New Conversation Dialog */}
      <Dialog
        open={showNewConversationDialog}
        onOpenChange={(open) => !open && resetNewConversationDialog()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nova Conversa
            </DialogTitle>
            <DialogDescription>
              Selecione um contato existente ou digite um número manualmente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Connection Selection */}
            <div className="space-y-2">
              <Label>Canal de Atendimento</Label>
              <Select
                value={selectedConnectionId}
                onValueChange={setSelectedConnectionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conexão" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      <span className="flex items-center gap-2">
                        {conn.type === "INSTAGRAM" ? (
                          <span className="text-pink-500">📷</span>
                        ) : (
                          <span className="text-green-500">📱</span>
                        )}
                        {conn.name}
                        {conn.type === "INSTAGRAM" && conn.instagramUsername && ` (@${conn.instagramUsername})`}
                        {conn.type !== "INSTAGRAM" && conn.phone && ` (${formatPhone(conn.phone)})`}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {connections.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma conexão ativa. Configure uma conexão primeiro.
                </p>
              )}
            </div>

            {/* Alert for Meta Cloud connections */}
            {isMetaCloud && !showTemplateSelector && (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs">
                  API Oficial do WhatsApp: Para iniciar conversas fora da janela de 24h, 
                  é necessário usar um template de mensagem pré-aprovado.
                </AlertDescription>
              </Alert>
            )}

            <Tabs value={newConvoTab} onValueChange={(v) => setNewConvoTab(v as "contact" | "manual" | "template")}>
              <TabsList className={cn("grid w-full", isMetaCloud ? "grid-cols-3" : "grid-cols-2")}>
                <TabsTrigger value="contact" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Contato
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Manual
                </TabsTrigger>
                {isMetaCloud && (
                  <TabsTrigger value="template" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Template
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="contact" className="space-y-3 mt-4">
                {isMetaCloud && (
                  <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 mb-3">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs">
                      <strong>API Oficial:</strong> Use a aba "Template" para iniciar a conversa. 
                      Templates são obrigatórios para a primeira mensagem.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label>Buscar contato</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Nome, telefone ou email..."
                      value={contactSearch}
                      onChange={(e) => {
                        setContactSearch(e.target.value);
                        searchContacts(e.target.value);
                      }}
                      className="pl-9"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>

                {searchResults.length > 0 && (
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {searchResults.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        className={cn(
                          "w-full p-3 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0",
                          selectedContact?.id === contact.id && "bg-muted"
                        )}
                        onClick={() => setSelectedContact(contact)}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={contact.avatar} />
                          <AvatarFallback>
                            {(contact.name || contact.phone).slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {contact.name || formatPhone(contact.phone)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {formatPhone(contact.phone)}
                            {contact.email && ` • ${contact.email}`}
                          </p>
                        </div>
                        {contact.isClient && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            Cliente
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {selectedContact && (
                  <div className="p-3 bg-muted rounded-md flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={selectedContact.avatar} />
                      <AvatarFallback>
                        {(selectedContact.name || selectedContact.phone).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedContact.name || "Sem nome"}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPhone(selectedContact.phone)}
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="manual" className="space-y-3 mt-4">
                {isMetaCloud && (
                  <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 mb-3">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs">
                      <strong>API Oficial:</strong> Use a aba "Template" para iniciar a conversa. 
                      Templates são obrigatórios para a primeira mensagem.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input
                    placeholder="5511999999999"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Digite o número com código do país e DDD
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Nome (opcional)</Label>
                  <Input
                    placeholder="Nome do contato"
                    value={contactNameInput}
                    onChange={(e) => setContactNameInput(e.target.value)}
                  />
                </div>
              </TabsContent>

              {isMetaCloud && (
                <TabsContent value="template" className="mt-4">
                  {showTemplateSelector ? (
                    <TemplateSelector
                      connectionId={selectedConnectionId}
                      onSelect={handleSendTemplate}
                      onCancel={() => setShowTemplateSelector(false)}
                    />
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Primeiro selecione ou digite o contato, depois escolha um template para enviar.
                      </p>
                      
                      {/* Contact selection for template */}
                      <div className="space-y-2">
                        <Label>Buscar contato</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Nome, telefone ou email..."
                            value={contactSearch}
                            onChange={(e) => {
                              setContactSearch(e.target.value);
                              searchContacts(e.target.value);
                            }}
                            className="pl-9"
                          />
                        </div>
                      </div>

                      {searchResults.length > 0 && !selectedContact && (
                        <div className="border rounded-md max-h-32 overflow-y-auto">
                          {searchResults.map((contact) => (
                            <button
                              key={contact.id}
                              type="button"
                              className="w-full p-2 flex items-center gap-2 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0 text-sm"
                              onClick={() => setSelectedContact(contact)}
                            >
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={contact.avatar} />
                                <AvatarFallback className="text-xs">
                                  {(contact.name || contact.phone).slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">
                                {contact.name || formatPhone(contact.phone)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {selectedContact && (
                        <div className="p-2 bg-muted rounded-md flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={selectedContact.avatar} />
                            <AvatarFallback>
                              {(selectedContact.name || selectedContact.phone).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{selectedContact.name || "Sem nome"}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatPhone(selectedContact.phone)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedContact(null)}
                          >
                            Trocar
                          </Button>
                        </div>
                      )}

                      {/* Manual phone input */}
                      {!selectedContact && (
                        <div className="space-y-2">
                          <Label className="text-xs">Ou digite o número manualmente</Label>
                          <Input
                            placeholder="5511999999999"
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      )}

                      <Button
                        className="w-full"
                        onClick={() => setShowTemplateSelector(true)}
                        disabled={!selectedContact && !phoneInput}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Escolher Template
                      </Button>
                    </div>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetNewConversationDialog}>
              Cancelar
            </Button>
            {/* For META_CLOUD connections, hide the regular "Iniciar Conversa" button 
                and force users to use the Template tab */}
            {isMetaCloud && newConvoTab !== "template" ? (
              <Button
                onClick={() => setNewConvoTab("template")}
                disabled={!selectedConnectionId}
              >
                <FileText className="w-4 h-4 mr-2" />
                Usar Template (obrigatório)
              </Button>
            ) : !isMetaCloud ? (
              <Button
                onClick={handleCreateConversation}
                disabled={
                  isCreating ||
                  !selectedConnectionId ||
                  (newConvoTab === "contact" && !selectedContact) ||
                  (newConvoTab === "manual" && !phoneInput)
                }
              >
                {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Iniciar Conversa
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TicketItemProps {
  ticket: any;
  isSelected: boolean;
  onSelect: () => void;
}

// Instagram icon component
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

// WhatsApp icon component
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function TicketItem({ ticket, isSelected, onSelect }: TicketItemProps) {
  const contactName = ticket.contact?.name || formatPhone(ticket.contact?.phone);
  const initials = contactName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const lastMessage = ticket.messages?.[0];
  const sla = ticket.slaDeadline ? formatSLATime(ticket.slaDeadline) : null;
  const unreadCount = ticket._count?.messages || 0;
  const hasUnread = unreadCount > 0;

  // Determine channel type
  const connectionType = ticket.connection?.type;
  const isInstagram = connectionType === 'INSTAGRAM';

  return (
    <button
      className={cn(
        "w-full p-2.5 md:p-3 flex items-start gap-2.5 md:gap-3 text-left hover:bg-muted/50 transition-colors active:bg-muted/70",
        isSelected && "bg-muted",
        hasUnread && !isSelected && "bg-primary/5 border-l-2 border-l-primary"
      )}
      onClick={onSelect}
    >
      <div className="relative flex-shrink-0">
        <Avatar className={cn("w-10 h-10 md:w-10 md:h-10", hasUnread && "ring-2 ring-primary ring-offset-2")}>
          <AvatarImage src={ticket.contact?.avatar} />
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>
        {/* Channel indicator - show Instagram or WhatsApp icon */}
        <div
          className={cn(
            "absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center",
            isInstagram
              ? "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500"
              : ticket.isAIHandled
                ? "bg-purple-500"
                : "bg-green-500"
          )}
          title={isInstagram ? "Instagram" : "WhatsApp"}
        >
          {ticket.isAIHandled && !isInstagram ? (
            <Bot className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
          ) : isInstagram ? (
            <InstagramIcon className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
          ) : (
            <WhatsAppIcon className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5 md:mb-1">
          <span className={cn("truncate text-sm md:text-base", hasUnread ? "font-bold" : "font-medium")}>
            {contactName}
          </span>
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            {hasUnread && (
              <span className="flex items-center justify-center min-w-4 md:min-w-5 h-4 md:h-5 px-1 md:px-1.5 text-[10px] md:text-xs font-bold text-white bg-primary rounded-full">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            <span className="text-[10px] md:text-xs text-muted-foreground">
              {formatDate(ticket.updatedAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1 flex-wrap">
          <span
            className={cn(
              "w-1.5 h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0",
              getStatusColor(ticket.status)
            )}
          />
          {ticket.department ? (
            <span
              className="text-[10px] md:text-xs px-1 md:px-1.5 py-0.5 rounded"
              style={{ backgroundColor: ticket.department.color + "20" }}
            >
              {ticket.department.name}
            </span>
          ) : (
            <span
              className="text-[10px] md:text-xs px-1 md:px-1.5 py-0.5 rounded bg-amber-100 text-amber-800"
            >
              Triagem
            </span>
          )}
          {ticket.assignedTo && (
            <span className="text-[10px] md:text-xs px-1 md:px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-0.5 md:gap-1">
              <User className="w-2.5 h-2.5 md:w-3 md:h-3" />
              {ticket.assignedTo.name?.split(" ")[0]}
            </span>
          )}
        </div>

        {lastMessage && (
          <p className={cn(
            "text-xs md:text-sm truncate",
            hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
          )}>
            {lastMessage.isFromMe && "Você: "}
            {lastMessage.content || `[${lastMessage.type}]`}
          </p>
        )}

        {sla && ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs mt-1",
              sla.status === "ok" && "text-green-600",
              sla.status === "warning" && "text-yellow-600",
              sla.status === "critical" && "text-red-600",
              sla.status === "breached" && "text-red-600 font-bold"
            )}
          >
            <Clock className="w-3 h-3" />
            <span>SLA: {sla.text}</span>
          </div>
        )}
      </div>
    </button>
  );
}

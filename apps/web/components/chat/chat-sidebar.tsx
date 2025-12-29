"use client";

import { useEffect, useState } from "react";
import { Search, Filter, Bot, User, Clock, Plus, Loader2, Phone, Users, CheckSquare } from "lucide-react";
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

interface Connection {
  id: string;
  name: string;
  type: string;
  phone?: string;
  status: string;
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
  const [newConvoTab, setNewConvoTab] = useState<"contact" | "manual">("contact");
  const [phoneInput, setPhoneInput] = useState("");
  const [contactNameInput, setContactNameInput] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ContactResult[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactResult | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

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
    <div className="w-80 border-r flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Conversas</h2>
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
        <div className="flex gap-2 mt-3">
          <Button
            variant={!filters.status && !filters.assignedToId ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters({ status: undefined, assignedToId: undefined })}
          >
            Todos
          </Button>
          <Button
            variant={filters.status === "PENDING" && !filters.assignedToId ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters({ status: "PENDING", assignedToId: undefined })}
          >
            Fila
          </Button>
          <Button
            variant={filters.assignedToId === user?.id ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters({ status: undefined, assignedToId: user?.id })}
          >
            Meus
          </Button>
        </div>

        {/* Show Resolved Toggle */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <label
            htmlFor="showResolved"
            className="text-sm text-muted-foreground cursor-pointer select-none flex items-center gap-2"
          >
            <CheckSquare className="w-4 h-4" />
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
              <Label>Conexão WhatsApp</Label>
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
                      {conn.name} {conn.phone && `(${formatPhone(conn.phone)})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {connections.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma conexão ativa. Configure uma conexão WhatsApp primeiro.
                </p>
              )}
            </div>

            <Tabs value={newConvoTab} onValueChange={(v) => setNewConvoTab(v as "contact" | "manual")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="contact" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Contato
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Manual
                </TabsTrigger>
              </TabsList>

              <TabsContent value="contact" className="space-y-3 mt-4">
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
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetNewConversationDialog}>
              Cancelar
            </Button>
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

  return (
    <button
      className={cn(
        "w-full p-3 flex items-start gap-3 text-left hover:bg-muted/50 transition-colors",
        isSelected && "bg-muted",
        hasUnread && !isSelected && "bg-primary/5 border-l-2 border-l-primary"
      )}
      onClick={onSelect}
    >
      <div className="relative">
        <Avatar className={cn(hasUnread && "ring-2 ring-primary ring-offset-2")}>
          <AvatarImage src={ticket.contact?.avatar} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {ticket.isAIHandled && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
            <Bot className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={cn("truncate", hasUnread ? "font-bold" : "font-medium")}>
            {contactName}
          </span>
          <div className="flex items-center gap-2">
            {hasUnread && (
              <span className="flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold text-white bg-primary rounded-full">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDate(ticket.updatedAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span
            className={cn(
              "w-2 h-2 rounded-full flex-shrink-0",
              getStatusColor(ticket.status)
            )}
          />
          {ticket.department ? (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: ticket.department.color + "20" }}
            >
              {ticket.department.name}
            </span>
          ) : (
            <span
              className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800"
            >
              Triagem
            </span>
          )}
          {ticket.assignedTo && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1">
              <User className="w-3 h-3" />
              {ticket.assignedTo.name?.split(" ")[0]}
            </span>
          )}
        </div>

        {lastMessage && (
          <p className={cn(
            "text-sm truncate",
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

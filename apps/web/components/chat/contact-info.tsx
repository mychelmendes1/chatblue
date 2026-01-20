"use client";

import { useState, useEffect } from "react";
import {
  X,
  Phone,
  Mail,
  Edit2,
  Check,
  Building,
  Calendar,
  Tag,
  MessageSquare,
  RefreshCw,
  ArrowRight,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatPhone } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContactInfoProps {
  ticket: any;
  onClose: () => void;
  onTicketUpdate?: (updatedTicket: any) => void;
}

export function ContactInfo({ ticket, onClose, onTicketUpdate }: ContactInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(ticket.contact?.name || "");
  const [email, setEmail] = useState(ticket.contact?.email || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [isTransferringUser, setIsTransferringUser] = useState(false);

  const contactName = ticket.contact?.name || formatPhone(ticket.contact?.phone);
  const initials = contactName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Update email when ticket.contact.email changes (from socket events)
  useEffect(() => {
    if (ticket.contact?.email) {
      setEmail(ticket.contact.email);
    }
  }, [ticket.contact?.email]);

  async function handleSave() {
    setIsSaving(true);
    try {
      await api.put(`/contacts/${ticket.contact.id}`, { name, email });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save contact:", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSyncNotion() {
    setIsSyncing(true);
    try {
      await api.post(`/contacts/${ticket.contact.id}/sync-notion`);
    } catch (error) {
      console.error("Failed to sync with Notion:", error);
    } finally {
      setIsSyncing(false);
    }
  }

  // Fetch departments
  useEffect(() => {
    async function fetchDepartments() {
      try {
        const response = await api.get<any[]>("/departments");
        setDepartments(response.data || []);
      } catch (error) {
        console.error("Failed to fetch departments:", error);
      }
    }
    fetchDepartments();
  }, []);

  // Fetch users
  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await api.get<any[]>("/users?isActive=true&isAI=false");
        setUsers(response.data || []);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    }
    fetchUsers();
  }, []);

  async function handleTransferDepartment() {
    if (!selectedDepartmentId || selectedDepartmentId === ticket.department?.id) {
      return;
    }

    setIsTransferring(true);
    try {
      const response = await api.post(`/tickets/${ticket.id}/transfer`, {
        toDepartmentId: selectedDepartmentId,
        reason: "Transferência manual de departamento",
      });
      
      // Reset selection first
      setSelectedDepartmentId("");
      
      // Update ticket if callback provided
      if (onTicketUpdate && response?.data) {
        try {
          // Ensure we have a valid ticket object
          const updatedTicket = response.data as any;
          if (updatedTicket && typeof updatedTicket === 'object' && 'id' in updatedTicket) {
            // Ensure the ticket ID matches to preserve messages
            if (updatedTicket.id === ticket.id) {
              onTicketUpdate(updatedTicket);
            } else {
              console.warn("Ticket ID mismatch, reloading page");
              window.location.reload();
            }
          } else {
            console.warn("Invalid ticket data received, reloading page");
            window.location.reload();
          }
        } catch (updateError) {
          console.error("Error updating ticket in store:", updateError);
          // Fallback to reload if update fails
          window.location.reload();
        }
      } else {
        // Fallback: reload page
        window.location.reload();
      }
    } catch (error: any) {
      console.error("Failed to transfer department:", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Erro ao transferir departamento";
      alert(errorMessage);
    } finally {
      setIsTransferring(false);
    }
  }

  async function handleTransferUser() {
    if (!selectedUserId || selectedUserId === ticket.assignedTo?.id) {
      return;
    }

    setIsTransferringUser(true);
    try {
      const response = await api.post(`/tickets/${ticket.id}/transfer`, {
        toUserId: selectedUserId,
        reason: "Transferência manual para outro atendente",
      });
      
      // Reset selection first
      setSelectedUserId("");
      
      // Update ticket if callback provided
      if (onTicketUpdate && response?.data) {
        try {
          // Ensure we have a valid ticket object
          const updatedTicket = response.data as any;
          if (updatedTicket && typeof updatedTicket === 'object' && 'id' in updatedTicket) {
            // Ensure the ticket ID matches to preserve messages
            if (updatedTicket.id === ticket.id) {
              onTicketUpdate(updatedTicket);
            } else {
              console.warn("Ticket ID mismatch, reloading page");
              window.location.reload();
            }
          } else {
            console.warn("Invalid ticket data received, reloading page");
            window.location.reload();
          }
        } catch (updateError) {
          console.error("Error updating ticket in store:", updateError);
          // Fallback to reload if update fails
          window.location.reload();
        }
      } else {
        // Fallback: reload page
        window.location.reload();
      }
    } catch (error: any) {
      console.error("Failed to transfer user:", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Erro ao transferir para atendente";
      alert(errorMessage);
    } finally {
      setIsTransferringUser(false);
    }
  }

  return (
    <div className="w-80 border-l flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Informações do Contato</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Avatar & Name */}
          <div className="flex flex-col items-center text-center">
            <Avatar className="w-20 h-20 mb-3">
              <AvatarImage src={ticket.contact?.avatar} />
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <h4 className="font-semibold text-lg">{contactName}</h4>
            {ticket.contact?.isClient && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded mt-1">
                Cliente
              </span>
            )}
            {ticket.contact?.isExClient && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded mt-1">
                Ex-Cliente
              </span>
            )}
          </div>

          {/* Edit Mode */}
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Nome</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do contato"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsEditing(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{formatPhone(ticket.contact?.phone)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{ticket.contact?.email || "-"}</span>
                </div>
                {ticket.contact?.clientSince && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>
                      Cliente desde{" "}
                      {new Date(ticket.contact.clientSince).toLocaleDateString(
                        "pt-BR"
                      )}
                    </span>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Editar Contato
              </Button>
            </>
          )}

          {/* Notion Sync */}
          <div className="border-t pt-4">
            <h5 className="font-medium mb-2">Notion</h5>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSyncNotion}
              disabled={isSyncing}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
              />
              {isSyncing ? "Sincronizando..." : "Sincronizar com Notion"}
            </Button>
            {ticket.contact?.notionPageId && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Vinculado ao Notion
              </p>
            )}
          </div>

          {/* Tags */}
          {ticket.contact?.tags?.length > 0 && (
            <div className="border-t pt-4">
              <h5 className="font-medium mb-2">Tags</h5>
              <div className="flex flex-wrap gap-2">
                {ticket.contact.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="text-xs bg-muted px-2 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Ticket Info */}
          <div className="border-t pt-4">
            <h5 className="font-medium mb-2">Atendimento Atual</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Protocolo</span>
                <span className="font-mono">{ticket.protocol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Departamento</span>
                <span>{ticket.department?.name || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atendente</span>
                <span>{ticket.assignedTo?.name || "Não atribuído"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado em</span>
                <span>
                  {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>
          </div>

          {/* Transfer Department */}
          <div className="border-t pt-4">
            <h5 className="font-medium mb-3">Transferir Departamento</h5>
            <div className="space-y-3">
              <Select
                value={selectedDepartmentId}
                onValueChange={setSelectedDepartmentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departments
                    .filter((dept) => dept.id !== ticket.department?.id)
                    .map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        <div className="flex items-center gap-2">
                          {dept.color && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: dept.color }}
                            />
                          )}
                          <span>{dept.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleTransferDepartment}
                disabled={!selectedDepartmentId || isTransferring || isTransferringUser}
              >
                {isTransferring ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Transferindo...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Transferir
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Transfer to User */}
          <div className="border-t pt-4">
            <h5 className="font-medium mb-3">Atribuir para Atendente</h5>
            <div className="space-y-3">
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um atendente" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((user) => user.id !== ticket.assignedTo?.id)
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="text-xs">
                              {user.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.name}</span>
                          {user.isOnline && (
                            <span className="text-xs text-green-600">●</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleTransferUser}
                disabled={!selectedUserId || isTransferringUser || isTransferring}
              >
                {isTransferringUser ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Transferindo...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Atribuir
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="border-t pt-4">
            <h5 className="font-medium mb-2">Histórico</h5>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted p-3 rounded text-center">
                <p className="text-2xl font-bold">
                  {ticket.contact?._count?.tickets || 0}
                </p>
                <p className="text-xs text-muted-foreground">Atendimentos</p>
              </div>
              <div className="bg-muted p-3 rounded text-center">
                <p className="text-2xl font-bold">{ticket._count?.messages || 0}</p>
                <p className="text-xs text-muted-foreground">Mensagens</p>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

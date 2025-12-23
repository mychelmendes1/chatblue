"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatPhone } from "@/lib/utils";
import { api } from "@/lib/api";

interface ContactInfoProps {
  ticket: any;
  onClose: () => void;
}

export function ContactInfo({ ticket, onClose }: ContactInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(ticket.contact?.name || "");
  const [email, setEmail] = useState(ticket.contact?.email || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const contactName = ticket.contact?.name || formatPhone(ticket.contact?.phone);
  const initials = contactName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
                {ticket.contact?.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{ticket.contact.email}</span>
                  </div>
                )}
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

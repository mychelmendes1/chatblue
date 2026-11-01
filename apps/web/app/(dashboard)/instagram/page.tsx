"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Edit,
  ExternalLink,
  Info,
  Instagram,
  Loader2,
  MessageCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { AutomationEditor } from "@/components/instagram/automation-editor";
import {
  CommentEventStatus,
  DepartmentOption,
  EVENT_STATUS_CLASSES,
  EVENT_STATUS_LABELS,
  InstagramAutomation,
  InstagramCommentEvent,
  InstagramConnectionOption,
  InstagramStats,
  Paginated,
} from "@/components/instagram/types";

const ALL = "__all__";
const EVENTS_PAGE_SIZE = 25;

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function StatusBadge({ status }: { status: CommentEventStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        EVENT_STATUS_CLASSES[status] || "bg-muted text-muted-foreground"
      )}
    >
      {EVENT_STATUS_LABELS[status] || status}
    </span>
  );
}

export default function InstagramPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const [connections, setConnections] = useState<InstagramConnectionOption[]>([]);
  const [connectionId, setConnectionId] = useState<string>("");
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [tab, setTab] = useState("automations");

  // Automations
  const [automations, setAutomations] = useState<InstagramAutomation[]>([]);
  const [isLoadingAutomations, setIsLoadingAutomations] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<InstagramAutomation | null>(null);
  const [toDelete, setToDelete] = useState<InstagramAutomation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Events
  const [events, setEvents] = useState<Paginated<InstagramCommentEvent> | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventStatus, setEventStatus] = useState<string>(ALL);
  const [eventAutomation, setEventAutomation] = useState<string>(ALL);
  const [eventPage, setEventPage] = useState(1);

  // Stats
  const [stats, setStats] = useState<InstagramStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<InstagramConnectionOption[]>("/connections");
        const ig = (data || []).filter((c) => c.type === "INSTAGRAM");
        setConnections(ig);
        if (ig.length > 0) setConnectionId(ig[0].id);
      } catch (error: any) {
        toast({ title: "Erro ao carregar conexões", description: error?.message, variant: "destructive" });
      } finally {
        setIsLoadingConnections(false);
      }
    })();
    (async () => {
      try {
        const { data } = await api.get<DepartmentOption[] | { departments: DepartmentOption[] }>("/departments");
        setDepartments(Array.isArray(data) ? data : data?.departments || []);
      } catch {
        // opcional
      }
    })();
  }, [toast]);

  const fetchAutomations = useCallback(async () => {
    if (!connectionId) return;
    setIsLoadingAutomations(true);
    try {
      const { data } = await api.get<InstagramAutomation[] | { items: InstagramAutomation[] }>(
        `/instagram/automations?connectionId=${encodeURIComponent(connectionId)}`
      );
      setAutomations(Array.isArray(data) ? data : data?.items || []);
    } catch (error: any) {
      toast({ title: "Erro ao carregar automações", description: error?.message, variant: "destructive" });
    } finally {
      setIsLoadingAutomations(false);
    }
  }, [connectionId, toast]);

  const fetchEvents = useCallback(async () => {
    if (!connectionId) return;
    setIsLoadingEvents(true);
    try {
      const qs = new URLSearchParams({ page: String(eventPage), limit: String(EVENTS_PAGE_SIZE) });
      if (eventStatus !== ALL) qs.set("status", eventStatus);
      let path: string;
      if (eventAutomation !== ALL) {
        path = `/instagram/automations/${eventAutomation}/events?${qs.toString()}`;
      } else {
        qs.set("connectionId", connectionId);
        path = `/instagram/events?${qs.toString()}`;
      }
      const { data } = await api.get<Paginated<InstagramCommentEvent>>(path);
      setEvents(data);
    } catch (error: any) {
      toast({ title: "Erro ao carregar eventos", description: error?.message, variant: "destructive" });
    } finally {
      setIsLoadingEvents(false);
    }
  }, [connectionId, eventAutomation, eventPage, eventStatus, toast]);

  const fetchStats = useCallback(async () => {
    if (!connectionId) return;
    setIsLoadingStats(true);
    try {
      const { data } = await api.get<InstagramStats>(`/instagram/stats?connectionId=${encodeURIComponent(connectionId)}`);
      setStats(data);
    } catch (error: any) {
      toast({ title: "Erro ao carregar estatísticas", description: error?.message, variant: "destructive" });
    } finally {
      setIsLoadingStats(false);
    }
  }, [connectionId, toast]);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  useEffect(() => {
    if (tab === "events") fetchEvents();
  }, [tab, fetchEvents]);

  useEffect(() => {
    if (tab === "overview") fetchStats();
  }, [tab, fetchStats]);

  // Reset filtros ao trocar de conexão
  useEffect(() => {
    setEventAutomation(ALL);
    setEventPage(1);
    setEvents(null);
    setStats(null);
  }, [connectionId]);

  async function handleToggle(a: InstagramAutomation, isActive: boolean) {
    setTogglingId(a.id);
    setAutomations((list) => list.map((x) => (x.id === a.id ? { ...x, isActive } : x)));
    try {
      const { data } = await api.post<InstagramAutomation>(`/instagram/automations/${a.id}/toggle`, { isActive });
      if (data && typeof data.isActive === "boolean") {
        setAutomations((list) => list.map((x) => (x.id === a.id ? { ...x, isActive: data.isActive } : x)));
      }
    } catch (error: any) {
      setAutomations((list) => list.map((x) => (x.id === a.id ? { ...x, isActive: a.isActive } : x)));
      toast({ title: "Erro ao alterar automação", description: error?.message, variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/instagram/automations/${toDelete.id}`);
      toast({ title: "Automação excluída" });
      setToDelete(null);
      fetchAutomations();
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error?.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  }

  const overview = useMemo(() => {
    if (!stats) return null;
    const s = stats.last30Days?.byStatus || {};
    const n = (k: CommentEventStatus) => s[k] || 0;
    const received = stats.last30Days?.total ?? 0;
    const userReplied = n("USER_REPLIED");
    // status é o estágio final de cada comentário: quem respondeu já recebeu DM, e quem recebeu DM já casou
    const privateSent = n("PRIVATE_SENT") + userReplied;
    const matched = n("MATCHED") + n("REPLIED") + privateSent + n("FAILED");
    const conversion = privateSent > 0 ? (userReplied / privateSent) * 100 : 0;
    return { received, matched, privateSent, userReplied, conversion };
  }, [stats]);

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Apenas administradores podem gerenciar o Instagram.
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedConnection = connections.find((c) => c.id === connectionId);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-white">
            <Instagram className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Instagram</h1>
            <p className="text-muted-foreground text-sm">Automação de comentários e mensagens no Direct</p>
          </div>
        </div>
        {connections.length > 1 && (
          <Select value={connectionId} onValueChange={setConnectionId}>
            <SelectTrigger className="w-full md:w-72">
              <SelectValue placeholder="Selecione a conta" />
            </SelectTrigger>
            <SelectContent>
              {connections.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.instagramUsername ? ` (@${c.instagramUsername})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {connections.length === 1 && selectedConnection && (
          <span className="text-sm text-pink-600 font-mono">
            {selectedConnection.instagramUsername ? `@${selectedConnection.instagramUsername}` : selectedConnection.name}
          </span>
        )}
      </div>

      {isLoadingConnections ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center gap-3">
            <Instagram className="w-12 h-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">Nenhuma conta do Instagram conectada</h3>
            <p className="text-muted-foreground text-sm">Conecte uma conta profissional para criar automações.</p>
            <Button asChild>
              <Link href="/connections">Ir para Conexões</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="automations">Automações</TabsTrigger>
            <TabsTrigger value="events">Eventos</TabsTrigger>
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
          </TabsList>

          {/* AUTOMAÇÕES */}
          <TabsContent value="automations" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setEditing(null);
                  setEditorOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova automação
              </Button>
            </div>

            {isLoadingAutomations && automations.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : automations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                  <MessageCircle className="w-10 h-10 mx-auto" />
                  <p>Nenhuma automação ainda.</p>
                  <p className="text-sm">
                    Crie uma para responder comentários automaticamente e levar a pessoa para o Direct.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {automations.map((a) => (
                  <Card key={a.id} className={cn(!a.isActive && "opacity-70")}>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{a.name}</CardTitle>
                        <CardDescription>
                          {a.mediaIds?.length ? `${a.mediaIds.length} post(s)` : "Todos os posts"}
                          {a.mediaTypes?.length ? ` · ${a.mediaTypes.join(", ")}` : ""}
                          {" · "}
                          {a.matchMode === "exact" ? "exato" : a.matchMode === "regex" ? "regex" : "contém"}
                        </CardDescription>
                      </div>
                      <Switch
                        checked={a.isActive}
                        disabled={togglingId === a.id}
                        onCheckedChange={(v) => handleToggle(a, v)}
                        title={a.isActive ? "Ativa" : "Inativa"}
                      />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-1">
                        {a.keywords?.length ? (
                          a.keywords.map((k) => (
                            <Badge key={k} variant="secondary">
                              {k}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">Qualquer comentário</span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { label: "Casou", value: a.matchedCount },
                          { label: "DMs enviadas", value: a.privateSentCount },
                          { label: "Responderam", value: a.userRepliedCount },
                        ].map((c) => (
                          <div key={c.label} className="rounded-md bg-muted/50 py-2">
                            <div className="text-lg font-semibold">{c.value ?? 0}</div>
                            <div className="text-[11px] text-muted-foreground">{c.label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEventAutomation(a.id);
                            setEventPage(1);
                            setTab("events");
                          }}
                        >
                          Eventos
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditing(a);
                            setEditorOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setToDelete(a)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* EVENTOS */}
          <TabsContent value="events" className="space-y-4 mt-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={eventStatus}
                onValueChange={(v) => {
                  setEventStatus(v);
                  setEventPage(1);
                }}
              >
                <SelectTrigger className="sm:w-52">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os status</SelectItem>
                  {(Object.keys(EVENT_STATUS_LABELS) as CommentEventStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {EVENT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={eventAutomation}
                onValueChange={(v) => {
                  setEventAutomation(v);
                  setEventPage(1);
                }}
              >
                <SelectTrigger className="sm:w-64">
                  <SelectValue placeholder="Automação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as automações</SelectItem>
                  {automations.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchEvents} disabled={isLoadingEvents} title="Atualizar">
                <RefreshCw className={cn("w-4 h-4", isLoadingEvents && "animate-spin")} />
              </Button>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Data/hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Comentário</TableHead>
                      <TableHead>Automação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Motivo / erro</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingEvents && !events ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : !events || events.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum evento encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      events.items.map((ev) => (
                        <TableRow key={ev.id}>
                          <TableCell className="whitespace-nowrap text-xs">{formatDateTime(ev.createdAt)}</TableCell>
                          <TableCell className="text-sm">
                            {ev.fromUsername ? `@${ev.fromUsername}` : <span className="font-mono text-xs">{ev.fromIgId}</span>}
                          </TableCell>
                          <TableCell className="max-w-[260px]">
                            <p className="text-sm line-clamp-2 break-words" title={ev.text}>
                              {ev.text}
                            </p>
                            {ev.parentId && <span className="text-[10px] text-muted-foreground">resposta</span>}
                          </TableCell>
                          <TableCell className="text-sm">{ev.automation?.name || "—"}</TableCell>
                          <TableCell>
                            <StatusBadge status={ev.status} />
                          </TableCell>
                          <TableCell className="max-w-[220px] text-xs">
                            {ev.error ? (
                              <span className="text-red-600 dark:text-red-400 break-words">{ev.error}</span>
                            ) : (
                              <span className="text-muted-foreground break-words">{ev.skipReason || ""}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {ev.ticketId && (
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/chat?ticket=${ev.ticketId}`} title="Abrir ticket">
                                  <ExternalLink className="w-4 h-4" />
                                </Link>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {events && events.totalPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Página {events.page} de {events.totalPages} · {events.total} eventos
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={eventPage <= 1 || isLoadingEvents}
                    onClick={() => setEventPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={eventPage >= events.totalPages || isLoadingEvents}
                    onClick={() => setEventPage((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* VISÃO GERAL */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {isLoadingStats && !overview ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : overview ? (
              <>
                <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                  {[
                    { label: "Comentários recebidos", value: overview.received, icon: MessageSquare },
                    { label: "Casaram", value: overview.matched, icon: Target },
                    { label: "DMs enviadas", value: overview.privateSent, icon: Send },
                    { label: "Responderam no Direct", value: overview.userReplied, icon: MessageCircle },
                    {
                      label: "Taxa de conversão",
                      value: `${overview.conversion.toFixed(1).replace(".", ",")}%`,
                      icon: TrendingUp,
                    },
                  ].map((c) => (
                    <Card key={c.label}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="text-xs">{c.label}</span>
                          <c.icon className="w-4 h-4" />
                        </div>
                        <div className="mt-2 text-2xl font-bold">{c.value}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {stats && stats.automations?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Por automação</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Automação</TableHead>
                            <TableHead className="text-right">Eventos</TableHead>
                            <TableHead className="text-right">Casou</TableHead>
                            <TableHead className="text-right">DMs</TableHead>
                            <TableHead className="text-right">Responderam</TableHead>
                            <TableHead className="text-right">Taxa</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stats.automations.map((a) => (
                            <TableRow key={a.id}>
                              <TableCell>
                                {a.name}
                                {!a.isActive && (
                                  <Badge variant="outline" className="ml-2 text-[10px]">
                                    inativa
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">{a.events}</TableCell>
                              <TableCell className="text-right">{a.matched}</TableCell>
                              <TableCell className="text-right">{a.privateSent}</TableCell>
                              <TableCell className="text-right">{a.userReplied}</TableCell>
                              <TableCell className="text-right">
                                {(a.replyRate <= 1 ? a.replyRate * 100 : a.replyRate).toFixed(1).replace(".", ",")}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Como funciona
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 text-muted-foreground">
                <p>
                  Quando alguém comenta em um post ou reel e o comentário casa com uma automação, o ChatBlue pode responder
                  em público e enviar <strong>uma mensagem privada</strong> (Direct) para a pessoa.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    O Instagram permite <strong>1 DM por comentário</strong>, e ela precisa ser enviada em até{" "}
                    <strong>7 dias</strong> após o comentário.
                  </li>
                  <li>
                    A <strong>janela de 24h</strong> do Direct só abre quando a pessoa <strong>responder</strong> a essa
                    mensagem. A partir daí a conversa segue normalmente (IA ou atendente) e vira um ticket.
                  </li>
                  <li>
                    Fora da janela, só atendentes humanos podem responder (até 7 dias, com a tag de agente humano). A IA
                    não envia mensagens fora da janela.
                  </li>
                  <li>Respostas públicas variadas evitam que o Instagram considere as respostas como spam.</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {connectionId && (
        <AutomationEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          connectionId={connectionId}
          automation={editing}
          departments={departments}
          onSaved={fetchAutomations}
        />
      )}

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir automação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir &quot;{toDelete?.name}&quot;? O histórico de eventos pode ser perdido. Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

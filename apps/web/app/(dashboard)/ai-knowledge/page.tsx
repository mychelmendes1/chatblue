"use client";

import { useEffect, useState } from "react";
import {
  Database,
  FileText,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Loader2,
  Search,
  Filter,
  MoreVertical,
  Check,
  X,
  AlertTriangle,
  Book,
  Globe,
  HardDrive,
  Cloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { cn, formatDistanceToNow } from "@/lib/utils";

interface DataSource {
  id: string;
  name: string;
  type: "NOTION" | "GOOGLE_DRIVE" | "CONFLUENCE" | "INTERNAL" | "WEBSITE";
  config: Record<string, any>;
  status: "ACTIVE" | "SYNCING" | "ERROR" | "DISABLED";
  lastSyncAt?: string;
  nextSyncAt?: string;
  errorMessage?: string;
  documentsCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  sourceName: string;
  sourceUrl?: string;
  status: "PENDING" | "INDEXED" | "ERROR" | "DELETED";
  errorMessage?: string;
  metadata?: Record<string, any>;
  lastIndexedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeGap {
  id: string;
  query: string;
  frequency: number;
  suggestedContent?: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "IGNORED";
  createdAt: string;
}

const SOURCE_TYPES = [
  { id: "NOTION", name: "Notion", icon: Book, color: "bg-gray-800" },
  { id: "GOOGLE_DRIVE", name: "Google Drive", icon: HardDrive, color: "bg-blue-600" },
  { id: "CONFLUENCE", name: "Confluence", icon: Cloud, color: "bg-blue-500" },
  { id: "INTERNAL", name: "Interno", icon: Database, color: "bg-purple-600" },
  { id: "WEBSITE", name: "Website", icon: Globe, color: "bg-green-600" },
];

export default function AIKnowledgePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("sources");
  const [isLoading, setIsLoading] = useState(true);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGap[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Dialog states
  const [showAddSourceDialog, setShowAddSourceDialog] = useState(false);
  const [showAddDocumentDialog, setShowAddDocumentDialog] = useState(false);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);

  // Form states
  const [newSourceForm, setNewSourceForm] = useState({
    name: "",
    type: "INTERNAL" as DataSource["type"],
    config: {} as Record<string, any>,
  });
  const [newDocumentForm, setNewDocumentForm] = useState({
    title: "",
    content: "",
    tags: "",
    category: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [sourcesRes, docsRes, gapsRes] = await Promise.all([
        api.get<DataSource[]>("/ai-assistant/data-sources"),
        api.get<{ documents: Document[] }>("/ai-assistant/documents?limit=100"),
        api.get<KnowledgeGap[]>("/ai-assistant/gaps"),
      ]);
      setDataSources(sourcesRes.data);
      setDocuments(docsRes.data.documents || []);
      setKnowledgeGaps(gapsRes.data);
    } catch (error) {
      console.error("Failed to fetch AI knowledge data:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados da base de conhecimento.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddSource() {
    try {
      await api.post("/ai-assistant/data-sources", newSourceForm);
      toast({
        title: "Sucesso",
        description: "Fonte de dados adicionada com sucesso.",
      });
      setShowAddSourceDialog(false);
      setNewSourceForm({ name: "", type: "INTERNAL", config: {} });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.response?.data?.error || "Falha ao adicionar fonte de dados.",
        variant: "destructive",
      });
    }
  }

  async function handleUpdateSource() {
    if (!editingSource) return;
    try {
      await api.put(`/ai-assistant/data-sources/${editingSource.id}`, {
        name: editingSource.name,
        config: editingSource.config,
      });
      toast({
        title: "Sucesso",
        description: "Fonte de dados atualizada com sucesso.",
      });
      setEditingSource(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.response?.data?.error || "Falha ao atualizar fonte de dados.",
        variant: "destructive",
      });
    }
  }

  async function handleDeleteSource(sourceId: string) {
    if (!confirm("Tem certeza que deseja excluir esta fonte de dados? Todos os documentos associados serão removidos.")) {
      return;
    }
    try {
      await api.delete(`/ai-assistant/data-sources/${sourceId}`);
      toast({
        title: "Sucesso",
        description: "Fonte de dados excluída com sucesso.",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.response?.data?.error || "Falha ao excluir fonte de dados.",
        variant: "destructive",
      });
    }
  }

  async function handleSyncSource(sourceId: string) {
    try {
      await api.post(`/ai-assistant/data-sources/${sourceId}/sync`);
      toast({
        title: "Sincronizacao iniciada",
        description: "A sincronizacao foi iniciada em segundo plano.",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.response?.data?.error || "Falha ao iniciar sincronizacao.",
        variant: "destructive",
      });
    }
  }

  async function handleAddDocument() {
    try {
      // Find or create internal data source for manual documents
      let internalSourceId = dataSources.find((s) => s.type === "INTERNAL")?.id;

      if (!internalSourceId) {
        // Create internal data source
        const sourceRes = await api.post<DataSource>("/ai-assistant/data-sources", {
          name: "Documentos Internos",
          type: "INTERNAL",
          config: {},
        });
        internalSourceId = sourceRes.data.id;
      }

      await api.post("/ai-assistant/documents", {
        title: newDocumentForm.title,
        content: newDocumentForm.content,
        dataSourceId: internalSourceId,
        category: newDocumentForm.category || undefined,
        tags: newDocumentForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      toast({
        title: "Sucesso",
        description: "Documento adicionado com sucesso. A indexacao sera feita em segundo plano.",
      });
      setShowAddDocumentDialog(false);
      setNewDocumentForm({ title: "", content: "", tags: "", category: "" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.response?.data?.error || "Falha ao adicionar documento.",
        variant: "destructive",
      });
    }
  }

  async function handleDeleteDocument(documentId: string) {
    if (!confirm("Tem certeza que deseja excluir este documento?")) {
      return;
    }
    try {
      await api.delete(`/ai-assistant/documents/${documentId}`);
      toast({
        title: "Sucesso",
        description: "Documento excluido com sucesso.",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.response?.data?.error || "Falha ao excluir documento.",
        variant: "destructive",
      });
    }
  }

  async function handleResolveGap(gapId: string, status: "RESOLVED" | "IGNORED") {
    try {
      await api.put(`/ai-assistant/gaps/${gapId}`, { status });
      toast({
        title: "Sucesso",
        description: status === "RESOLVED" ? "Lacuna marcada como resolvida." : "Lacuna ignorada.",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.response?.data?.error || "Falha ao atualizar lacuna.",
        variant: "destructive",
      });
    }
  }

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !selectedType || doc.sourceType === selectedType;
    return matchesSearch && matchesType;
  });

  const getSourceTypeInfo = (type: string) => {
    return SOURCE_TYPES.find((t) => t.id === type) || SOURCE_TYPES[3]; // Default to INTERNAL
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
      case "INDEXED":
        return <Badge className="bg-green-100 text-green-700">Ativo</Badge>;
      case "SYNCING":
      case "PENDING":
        return <Badge className="bg-blue-100 text-blue-700">Processando</Badge>;
      case "ERROR":
        return <Badge className="bg-red-100 text-red-700">Erro</Badge>;
      case "DISABLED":
      case "DELETED":
        return <Badge className="bg-gray-100 text-gray-700">Inativo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Base de Conhecimento IA</h1>
          <p className="text-muted-foreground">
            Gerencie as fontes de dados e documentos que a IA utiliza para responder perguntas.
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sources">
            <Database className="w-4 h-4 mr-2" />
            Fontes de Dados ({dataSources.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="w-4 h-4 mr-2" />
            Documentos ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="gaps">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Lacunas ({knowledgeGaps.filter((g) => g.status === "OPEN").length})
          </TabsTrigger>
        </TabsList>

        {/* Data Sources Tab */}
        <TabsContent value="sources" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddSourceDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Fonte
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dataSources.map((source) => {
              const typeInfo = getSourceTypeInfo(source.type);
              const Icon = typeInfo.icon;
              return (
                <Card key={source.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", typeInfo.color)}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{source.name}</CardTitle>
                          <CardDescription>{typeInfo.name}</CardDescription>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingSource(source)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSyncSource(source.id)}>
                            Sincronizar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteSource(source.id)}
                            className="text-red-600"
                          >
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        {getStatusBadge(source.status)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Documentos</span>
                        <span className="text-sm font-medium">{source.documentsCount}</span>
                      </div>
                      {source.lastSyncAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Ultima sinc.</span>
                          <span className="text-sm">
                            {formatDistanceToNow(new Date(source.lastSyncAt))}
                          </span>
                        </div>
                      )}
                      {source.errorMessage && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                          {source.errorMessage}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {dataSources.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <Database className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma fonte de dados</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Adicione fontes de dados para a IA consultar ao responder perguntas.
                  </p>
                  <Button onClick={() => setShowAddSourceDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Primeira Fonte
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedType || "all"} onValueChange={(v) => setSelectedType(v === "all" ? null : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas as fontes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as fontes</SelectItem>
                {SOURCE_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setShowAddDocumentDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Documento
            </Button>
          </div>

          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{doc.title}</h4>
                          {getStatusBadge(doc.status)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {doc.content.substring(0, 200)}...
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{doc.sourceName}</span>
                          {doc.lastIndexedAt && (
                            <span>Indexado {formatDistanceToNow(new Date(doc.lastIndexedAt))}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.sourceUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(doc.sourceUrl, "_blank")}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredDocuments.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum documento encontrado</h3>
                    <p className="text-muted-foreground text-center">
                      {searchQuery || selectedType
                        ? "Tente ajustar os filtros de busca."
                        : "Adicione documentos ou conecte fontes de dados."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Knowledge Gaps Tab */}
        <TabsContent value="gaps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lacunas de Conhecimento</CardTitle>
              <CardDescription>
                Perguntas frequentes que a IA nao conseguiu responder adequadamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {knowledgeGaps.filter((g) => g.status === "OPEN").map((gap) => (
                    <div
                      key={gap.id}
                      className="flex items-start justify-between gap-4 p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{gap.query}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>Perguntado {gap.frequency}x</span>
                          <span>{formatDistanceToNow(new Date(gap.createdAt))}</span>
                        </div>
                        {gap.suggestedContent && (
                          <div className="mt-2 p-2 bg-blue-50 text-blue-700 rounded text-sm">
                            <strong>Sugestao:</strong> {gap.suggestedContent}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolveGap(gap.id, "RESOLVED")}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Resolvido
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResolveGap(gap.id, "IGNORED")}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Ignorar
                        </Button>
                      </div>
                    </div>
                  ))}

                  {knowledgeGaps.filter((g) => g.status === "OPEN").length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10">
                      <Check className="w-12 h-12 text-green-500 mb-4" />
                      <h3 className="text-lg font-medium mb-2">Nenhuma lacuna aberta</h3>
                      <p className="text-muted-foreground text-center">
                        A base de conhecimento esta atendendo bem as perguntas dos usuarios.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Data Source Dialog */}
      <Dialog open={showAddSourceDialog} onOpenChange={setShowAddSourceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Fonte de Dados</DialogTitle>
            <DialogDescription>
              Conecte uma nova fonte de dados para a IA consultar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={newSourceForm.name}
                onChange={(e) => setNewSourceForm({ ...newSourceForm, name: e.target.value })}
                placeholder="Ex: Base de Conhecimento Principal"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={newSourceForm.type}
                onValueChange={(v) =>
                  setNewSourceForm({ ...newSourceForm, type: v as DataSource["type"], config: {} })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notion Config */}
            {newSourceForm.type === "NOTION" && (
              <>
                <div className="space-y-2">
                  <Label>API Key do Notion</Label>
                  <Input
                    type="password"
                    value={newSourceForm.config.apiKey || ""}
                    onChange={(e) =>
                      setNewSourceForm({
                        ...newSourceForm,
                        config: { ...newSourceForm.config, apiKey: e.target.value },
                      })
                    }
                    placeholder="secret_..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>ID do Database</Label>
                  <Input
                    value={newSourceForm.config.databaseId || ""}
                    onChange={(e) =>
                      setNewSourceForm({
                        ...newSourceForm,
                        config: { ...newSourceForm.config, databaseId: e.target.value },
                      })
                    }
                    placeholder="abc123..."
                  />
                </div>
              </>
            )}

            {/* Google Drive Config */}
            {newSourceForm.type === "GOOGLE_DRIVE" && (
              <>
                <div className="space-y-2">
                  <Label>ID da Pasta</Label>
                  <Input
                    value={newSourceForm.config.folderId || ""}
                    onChange={(e) =>
                      setNewSourceForm({
                        ...newSourceForm,
                        config: { ...newSourceForm.config, folderId: e.target.value },
                      })
                    }
                    placeholder="ID da pasta do Google Drive"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Credenciais (JSON)</Label>
                  <Textarea
                    value={newSourceForm.config.credentials || ""}
                    onChange={(e) =>
                      setNewSourceForm({
                        ...newSourceForm,
                        config: { ...newSourceForm.config, credentials: e.target.value },
                      })
                    }
                    placeholder='{"type": "service_account", ...}'
                    rows={4}
                  />
                </div>
              </>
            )}

            {/* Confluence Config */}
            {newSourceForm.type === "CONFLUENCE" && (
              <>
                <div className="space-y-2">
                  <Label>URL Base</Label>
                  <Input
                    value={newSourceForm.config.baseUrl || ""}
                    onChange={(e) =>
                      setNewSourceForm({
                        ...newSourceForm,
                        config: { ...newSourceForm.config, baseUrl: e.target.value },
                      })
                    }
                    placeholder="https://sua-empresa.atlassian.net"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={newSourceForm.config.email || ""}
                    onChange={(e) =>
                      setNewSourceForm({
                        ...newSourceForm,
                        config: { ...newSourceForm.config, email: e.target.value },
                      })
                    }
                    placeholder="seu@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Token</Label>
                  <Input
                    type="password"
                    value={newSourceForm.config.apiToken || ""}
                    onChange={(e) =>
                      setNewSourceForm({
                        ...newSourceForm,
                        config: { ...newSourceForm.config, apiToken: e.target.value },
                      })
                    }
                    placeholder="Token de API do Confluence"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chave do Espaco</Label>
                  <Input
                    value={newSourceForm.config.spaceKey || ""}
                    onChange={(e) =>
                      setNewSourceForm({
                        ...newSourceForm,
                        config: { ...newSourceForm.config, spaceKey: e.target.value },
                      })
                    }
                    placeholder="CHAVE"
                  />
                </div>
              </>
            )}

            {/* Website Config */}
            {newSourceForm.type === "WEBSITE" && (
              <div className="space-y-2">
                <Label>URL do Site</Label>
                <Input
                  value={newSourceForm.config.url || ""}
                  onChange={(e) =>
                    setNewSourceForm({
                      ...newSourceForm,
                      config: { ...newSourceForm.config, url: e.target.value },
                    })
                  }
                  placeholder="https://exemplo.com"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSourceDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddSource} disabled={!newSourceForm.name}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Data Source Dialog */}
      <Dialog open={!!editingSource} onOpenChange={(open) => !open && setEditingSource(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Fonte de Dados</DialogTitle>
          </DialogHeader>
          {editingSource && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editingSource.name}
                  onChange={(e) => setEditingSource({ ...editingSource, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Input value={getSourceTypeInfo(editingSource.type).name} disabled />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSource(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateSource}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Document Dialog */}
      <Dialog open={showAddDocumentDialog} onOpenChange={setShowAddDocumentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Documento Manual</DialogTitle>
            <DialogDescription>
              Adicione conteudo diretamente a base de conhecimento da IA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titulo</Label>
              <Input
                value={newDocumentForm.title}
                onChange={(e) => setNewDocumentForm({ ...newDocumentForm, title: e.target.value })}
                placeholder="Ex: Como fazer reembolso"
              />
            </div>
            <div className="space-y-2">
              <Label>Conteudo</Label>
              <Textarea
                value={newDocumentForm.content}
                onChange={(e) => setNewDocumentForm({ ...newDocumentForm, content: e.target.value })}
                placeholder="Descreva o procedimento ou informacao..."
                rows={10}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input
                  value={newDocumentForm.category}
                  onChange={(e) =>
                    setNewDocumentForm({ ...newDocumentForm, category: e.target.value })
                  }
                  placeholder="Ex: Financeiro"
                />
              </div>
              <div className="space-y-2">
                <Label>Tags (separadas por virgula)</Label>
                <Input
                  value={newDocumentForm.tags}
                  onChange={(e) => setNewDocumentForm({ ...newDocumentForm, tags: e.target.value })}
                  placeholder="Ex: reembolso, pagamento, devolucao"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDocumentDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddDocument}
              disabled={!newDocumentForm.title || !newDocumentForm.content}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

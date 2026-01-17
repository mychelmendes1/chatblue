"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Plus,
  Trash2,
  Settings,
  Loader2,
  MoreVertical,
  Pencil,
  Database,
  Sparkles,
  Check,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AIAgentConfig {
  id: string;
  category: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  provider: string;
  model: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  isDefault: boolean;
  priority: number;
  dataSources: { dataSource: { id: string; name: string; type: string } }[];
  createdAt: string;
  updatedAt: string;
}

interface DataSource {
  id: string;
  name: string;
  type: string;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

const CATEGORY_COLORS = [
  { id: "#6366f1", name: "Indigo" },
  { id: "#22c55e", name: "Verde" },
  { id: "#f59e0b", name: "Ambar" },
  { id: "#ef4444", name: "Vermelho" },
  { id: "#3b82f6", name: "Azul" },
  { id: "#8b5cf6", name: "Violeta" },
  { id: "#ec4899", name: "Rosa" },
  { id: "#14b8a6", name: "Teal" },
  { id: "#f97316", name: "Laranja" },
  { id: "#64748b", name: "Cinza" },
];

const AI_PROVIDERS = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "google", name: "Google" },
];

const AI_MODELS: Record<string, AIModel[]> = {
  openai: [
    { id: "gpt-4-turbo-preview", name: "GPT-4 Turbo", provider: "openai", description: "Modelo mais capaz" },
    { id: "gpt-4o", name: "GPT-4o", provider: "openai", description: "Multimodal otimizado" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", description: "Rapido e economico" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "openai", description: "Custo-beneficio" },
  ],
  anthropic: [
    { id: "claude-opus-4-20250514", name: "Claude Opus 4", provider: "anthropic", description: "Mais inteligente" },
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "anthropic", description: "Equilibrado" },
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "anthropic", description: "Versatil" },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", provider: "anthropic", description: "Rapido" },
  ],
  google: [
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "google", description: "Contexto longo" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "google", description: "Rapido" },
  ],
};

export default function AIAgentsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [agents, setAgents] = useState<AIAgentConfig[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgentConfig | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    category: "",
    name: "",
    description: "",
    icon: "Sparkles",
    color: "#8b5cf6",
    provider: "openai",
    model: "gpt-4o-mini",
    systemPrompt: "",
    temperature: 0.7,
    maxTokens: 2048,
    isDefault: false,
    priority: 0,
    dataSourceIds: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [agentsRes, sourcesRes] = await Promise.all([
        api.get<AIAgentConfig[]>("/ai-assistant/agent-configs"),
        api.get<DataSource[]>("/ai-assistant/data-sources"),
      ]);
      setAgents(agentsRes.data);
      setDataSources(sourcesRes.data);
    } catch (error) {
      console.error("Failed to fetch AI agents:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar configuracoes de IA.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      category: "",
      name: "",
      description: "",
      icon: "Sparkles",
      color: "#8b5cf6",
      provider: "openai",
      model: "gpt-4o-mini",
      systemPrompt: "",
      temperature: 0.7,
      maxTokens: 2048,
      isDefault: false,
      priority: 0,
      dataSourceIds: [],
    });
  }

  function openEditDialog(agent: AIAgentConfig) {
    setFormData({
      category: agent.category,
      name: agent.name,
      description: agent.description || "",
      icon: agent.icon || "Sparkles",
      color: agent.color || "#8b5cf6",
      provider: agent.provider,
      model: agent.model,
      systemPrompt: agent.systemPrompt || "",
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      isDefault: agent.isDefault || false,
      priority: agent.priority,
      dataSourceIds: agent.dataSources.map((ds) => ds.dataSource.id),
    });
    setEditingAgent(agent);
  }

  async function handleSave() {
    try {
      if (editingAgent) {
        await api.put(`/ai-assistant/agent-configs/${editingAgent.id}`, formData);
        toast({
          title: "Sucesso",
          description: "Configuracao de IA atualizada.",
        });
      } else {
        await api.post("/ai-assistant/agent-configs", formData);
        toast({
          title: "Sucesso",
          description: "Configuracao de IA criada.",
        });
      }
      setShowAddDialog(false);
      setEditingAgent(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.response?.data?.error || "Falha ao salvar configuracao.",
        variant: "destructive",
      });
    }
  }

  async function handleDelete(agentId: string) {
    if (!confirm("Tem certeza que deseja excluir esta configuracao de IA?")) {
      return;
    }
    try {
      await api.delete(`/ai-assistant/agent-configs/${agentId}`);
      toast({
        title: "Sucesso",
        description: "Configuracao de IA excluida.",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.response?.data?.error || "Falha ao excluir configuracao.",
        variant: "destructive",
      });
    }
  }

  async function handleToggleActive(agent: AIAgentConfig) {
    try {
      await api.put(`/ai-assistant/agent-configs/${agent.id}`, {
        isDefault: !agent.isDefault,
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.response?.data?.error || "Falha ao atualizar status.",
        variant: "destructive",
      });
    }
  }

  const availableModels = AI_MODELS[formData.provider] || [];

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
          <h1 className="text-2xl font-bold">Agentes de IA por Categoria</h1>
          <p className="text-muted-foreground">
            Configure quais modelos de IA sao usados para cada categoria de pergunta.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Agente
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Card key={agent.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: agent.color || "#8b5cf6" }}
                  >
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <CardDescription>{agent.category}</CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(agent)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleActive(agent)}>
                      {agent.isDefault ? (
                        <>
                          <X className="w-4 h-4 mr-2" />
                          Remover Padrao
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Definir como Padrao
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(agent.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {agent.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {agent.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Modelo</span>
                  <Badge variant="outline">
                    {AI_MODELS[agent.provider]?.find((m) => m.id === agent.model)?.name ||
                      agent.model}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Provider</span>
                  <span className="text-sm font-medium capitalize">{agent.provider}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Temperatura</span>
                  <span className="text-sm font-medium">{agent.temperature}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Fontes</span>
                  <span className="text-sm font-medium">{agent.dataSources.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {agent.isDefault ? (
                    <Badge className="bg-green-100 text-green-700">Padrao</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-700">Normal</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {agents.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Bot className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum agente configurado</h3>
              <p className="text-muted-foreground text-center mb-4">
                Configure agentes de IA especializados para diferentes categorias de perguntas.
              </p>
              <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Agente
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={showAddDialog || !!editingAgent}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingAgent(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAgent ? "Editar Agente de IA" : "Novo Agente de IA"}
            </DialogTitle>
            <DialogDescription>
              Configure um agente de IA especializado para uma categoria de perguntas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria (identificador)</Label>
                <Input
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value.toUpperCase().replace(/\s/g, "_") })
                  }
                  placeholder="Ex: FINANCEIRO"
                  disabled={!!editingAgent}
                />
                <p className="text-xs text-muted-foreground">
                  Identificador unico da categoria (sem espacos)
                </p>
              </div>
              <div className="space-y-2">
                <Label>Nome de Exibicao</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Atendimento Financeiro"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descricao</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva quando este agente deve ser usado..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.id })}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      formData.color === color.id ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color.id }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* AI Configuration */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Configuracao do Modelo
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        provider: v,
                        model: AI_MODELS[v]?.[0]?.id || "",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROVIDERS.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Select
                    value={formData.model}
                    onValueChange={(v) => setFormData({ ...formData, model: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div>
                            <span>{model.name}</span>
                            {model.description && (
                              <span className="text-muted-foreground ml-2 text-xs">
                                ({model.description})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>Temperatura: {formData.temperature}</Label>
                  <Slider
                    value={[formData.temperature]}
                    onValueChange={([v]) => setFormData({ ...formData, temperature: v })}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Menor = mais consistente, Maior = mais criativo
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) =>
                      setFormData({ ...formData, maxTokens: parseInt(e.target.value) || 2048 })
                    }
                    min={256}
                    max={8192}
                  />
                </div>
              </div>
            </div>

            {/* System Prompt */}
            <div className="space-y-2">
              <Label>Prompt de Sistema (opcional)</Label>
              <Textarea
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                placeholder="Instrucoes especificas para este agente. Ex: Voce e um especialista em financas..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Define o comportamento e especialidade do agente
              </p>
            </div>

            {/* Data Sources */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Fontes de Dados
              </Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                {dataSources.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhuma fonte de dados disponivel. Adicione na pagina Base de Conhecimento.
                  </p>
                ) : (
                  dataSources.map((source) => (
                    <label
                      key={source.id}
                      className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.dataSourceIds.includes(source.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              dataSourceIds: [...formData.dataSourceIds, source.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              dataSourceIds: formData.dataSourceIds.filter((id) => id !== source.id),
                            });
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{source.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {source.type}
                      </Badge>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Priority and Active */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                  }
                  className="w-24"
                  min={0}
                  max={100}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label>Agente Padrao</Label>
                <Switch
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEditingAgent(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.category || !formData.name}>
              {editingAgent ? "Salvar" : "Criar Agente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

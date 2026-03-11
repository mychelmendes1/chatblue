"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Plus,
  Settings,
  Trash2,
  Edit,
  Loader2,
  Power,
  PowerOff,
  MessageSquare,
  Zap,
  Brain,
  Sparkles,
  Shield,
  Globe,
  Copy,
  RefreshCw,
  Check,
  Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { FileText, Upload, X } from "lucide-react";

interface Department {
  id: string;
  name: string;
}

interface AIAgent {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  aiModel?: string;
  aiTemperature?: number;
  aiMaxTokens?: number;
  aiSystemPrompt?: string;
  transferKeywords?: string[];
  trainingData?: string;
  // Personality settings
  aiPersonalityTone?: string;
  aiPersonalityStyle?: string;
  aiUseEmojis?: boolean;
  aiUseClientName?: boolean;
  aiGuardrailsEnabled?: boolean;
  // External AI settings
  aiType?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  externalApiKey?: string;
  // External AI integration settings (bluetoken-ai)
  authType?: string;
  authToken?: string;
  payloadFormat?: string;
  empresa?: string;
  autoReply?: boolean;
  autoEscalate?: boolean;
  escalateDepartmentId?: string;
  departments: { department: Department }[];
  _count?: {
    assignedTickets: number;
  };
}

interface AIAgentForm {
  name: string;
  email: string;
  aiType: string; // "internal" or "external"
  aiModel: string;
  aiTemperature: number;
  aiMaxTokens: number;
  aiSystemPrompt: string;
  transferKeywords: string;
  departmentIds: string[];
  isActive: boolean;
  companyId?: string; // For SUPER_ADMIN to select company
  trainingData?: string; // PDF extracted text
  // Personality settings
  aiPersonalityTone: string;
  aiPersonalityStyle: string;
  aiUseEmojis: boolean;
  aiUseClientName: boolean;
  aiGuardrailsEnabled: boolean;
  // External AI settings
  webhookUrl: string;
  webhookSecret: string;
  externalApiKey: string;
  // External AI integration settings
  authType: string;
  authToken: string;
  payloadFormat: string;
  empresa: string;
  autoReply: boolean;
  autoEscalate: boolean;
  escalateDepartmentId: string;
}

const PERSONALITY_TONES = [
  { id: 'friendly', name: 'Amigável', description: 'Tom acolhedor e simpático' },
  { id: 'formal', name: 'Formal', description: 'Tom profissional e respeitoso' },
  { id: 'technical', name: 'Técnico', description: 'Tom objetivo e focado em soluções' },
  { id: 'empathetic', name: 'Empático', description: 'Tom compreensivo e atencioso' },
];

const PERSONALITY_STYLES = [
  { id: 'concise', name: 'Conciso', description: 'Respostas curtas e diretas' },
  { id: 'detailed', name: 'Detalhado', description: 'Respostas completas e explicativas' },
  { id: 'conversational', name: 'Conversacional', description: 'Respostas naturais como conversa' },
];

const AI_MODELS = [
  { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', provider: 'OpenAI' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { id: 'claude-opus-4-6', name: 'Claude Opus 4', provider: 'Anthropic' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4', provider: 'Anthropic' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'Anthropic' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'Anthropic' },
];

const defaultForm: AIAgentForm = {
  name: "",
  email: "",
  aiType: "internal",
  aiModel: "gpt-4-turbo-preview",
  aiTemperature: 0.7,
  aiMaxTokens: 1000,
  aiSystemPrompt: `Você é um assistente virtual de atendimento ao cliente.

Diretrizes:
- Entenda a necessidade antes de responder
- Forneça informações precisas e úteis
- Se não souber a resposta, informe que vai transferir para um atendente humano
- Use linguagem clara e acessível`,
  transferKeywords: "falar com humano, atendente, pessoa real, humano",
  departmentIds: [],
  isActive: true,
  trainingData: "",
  // Personality defaults
  aiPersonalityTone: "friendly",
  aiPersonalityStyle: "conversational",
  aiUseEmojis: true,
  aiUseClientName: true,
  aiGuardrailsEnabled: true,
  // External AI defaults
  webhookUrl: "",
  webhookSecret: "",
  externalApiKey: "",
  // External AI integration defaults
  authType: "bearer",
  authToken: "",
  payloadFormat: "bluechat",
  empresa: "",
  autoReply: true,
  autoEscalate: true,
  escalateDepartmentId: "",
};

interface Company {
  id: string;
  name: string;
}

export default function AIAgentPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [form, setForm] = useState<AIAgentForm>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    fetchData();
  }, [isSuperAdmin]);

  async function fetchData() {
    try {
      const promises: Promise<any>[] = [
        api.get<AIAgent[]>("/users/ai-agents"),
        api.get<Department[]>("/departments"),
      ];
      
      // Fetch companies if SUPER_ADMIN
      if (isSuperAdmin) {
        promises.push(api.get<Company[]>("/companies"));
      }
      
      const results = await Promise.all(promises);
      setAgents(Array.isArray(results[0].data) ? results[0].data : []);
      setDepartments(Array.isArray(results[1].data) ? results[1].data : []);
      
      if (isSuperAdmin && results[2]) {
        setCompanies(Array.isArray(results[2].data) ? results[2].data : []);
      }
    } catch (error: any) {
      console.error("Error loading AI agent data:", error);
      toast({
        title: "Erro",
        description: error?.message || "Falha ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingAgent(null);
    setForm(defaultForm);
    setSelectedPdfFile(null);
    setIsDialogOpen(true);
  }

  async function handlePdfUpload(file: File) {
    if (file.type !== "application/pdf") {
      toast({
        title: "Erro",
        description: "Apenas arquivos PDF são permitidos",
        variant: "destructive",
      });
      return;
    }

    setSelectedPdfFile(file);
    setIsProcessingPdf(true);

    try {
      const response = await api.uploadFile<{ text: string; pages: number }>(
        "/users/process-training-pdf",
        file
      );

      const extractedText = response.data.text;
      setForm((prev) => ({
        ...prev,
        trainingData: extractedText,
      }));

      toast({
        title: "PDF processado com sucesso",
        description: `Texto extraído de ${response.data.pages} página(s)`,
      });
    } catch (error: any) {
      console.error("PDF upload error:", error);
      toast({
        title: "Erro ao processar PDF",
        description: error?.message || error?.toString() || "Falha ao processar arquivo",
        variant: "destructive",
      });
      setSelectedPdfFile(null);
    } finally {
      setIsProcessingPdf(false);
    }
  }

  function openEditDialog(agent: AIAgent) {
    setEditingAgent(agent);
    setForm({
      name: agent.name,
      email: agent.email,
      aiType: agent.aiType || "internal",
      aiModel: agent.aiModel || "gpt-4-turbo-preview",
      aiTemperature: agent.aiTemperature || 0.7,
      aiMaxTokens: agent.aiMaxTokens || 1000,
      aiSystemPrompt: agent.aiSystemPrompt || "",
      transferKeywords: agent.transferKeywords?.join(", ") || "",
      departmentIds: agent.departments.map((d) => d.department.id),
      isActive: agent.isActive,
      trainingData: agent.trainingData || "",
      // Personality settings
      aiPersonalityTone: agent.aiPersonalityTone || "friendly",
      aiPersonalityStyle: agent.aiPersonalityStyle || "conversational",
      aiUseEmojis: agent.aiUseEmojis ?? true,
      aiUseClientName: agent.aiUseClientName ?? true,
      aiGuardrailsEnabled: agent.aiGuardrailsEnabled ?? true,
      // External AI settings
      webhookUrl: agent.webhookUrl || "",
      webhookSecret: agent.webhookSecret || "",
      externalApiKey: agent.externalApiKey || "",
      // External AI integration settings
      authType: agent.authType || "bearer",
      authToken: agent.authToken || "",
      payloadFormat: agent.payloadFormat || "bluechat",
      empresa: agent.empresa || "",
      autoReply: agent.autoReply ?? true,
      autoEscalate: agent.autoEscalate ?? true,
      escalateDepartmentId: agent.escalateDepartmentId || "",
    });
    setSelectedPdfFile(null);
    setCopiedKey(false);
    setIsDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.name || !form.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e email",
        variant: "destructive",
      });
      return;
    }

    // Validate external AI fields
    if (form.aiType === "external" && !form.webhookUrl) {
      toast({
        title: "Campos obrigatórios",
        description: "A URL do Webhook é obrigatória para IA externa",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: form.name,
        email: form.email,
        isAI: true, // Always true for AI agents
        aiType: form.aiType,
        departmentIds: form.departmentIds,
        isActive: form.isActive,
      };

      if (form.aiType === "external") {
        // External AI payload
        payload.webhookUrl = form.webhookUrl;
        payload.webhookSecret = form.webhookSecret;
        payload.externalApiKey = form.externalApiKey;
        // Integration settings
        payload.authType = form.authType;
        payload.authToken = form.authToken;
        payload.payloadFormat = form.payloadFormat;
        payload.empresa = form.empresa;
        payload.autoReply = form.autoReply;
        payload.autoEscalate = form.autoEscalate;
        payload.escalateDepartmentId = form.escalateDepartmentId;
      } else {
        // Internal AI payload
        payload.aiModel = form.aiModel;
        payload.aiTemperature = form.aiTemperature;
        payload.aiMaxTokens = form.aiMaxTokens;
        payload.aiSystemPrompt = form.aiSystemPrompt;
        payload.transferKeywords = form.transferKeywords
          .split(",")
          .map((k: string) => k.trim())
          .filter(Boolean);
        payload.trainingData = form.trainingData;
        payload.aiPersonalityTone = form.aiPersonalityTone;
        payload.aiPersonalityStyle = form.aiPersonalityStyle;
        payload.aiUseEmojis = form.aiUseEmojis;
        payload.aiUseClientName = form.aiUseClientName;
        payload.aiGuardrailsEnabled = form.aiGuardrailsEnabled;
      }

      // Add companyId if SUPER_ADMIN and provided
      if (isSuperAdmin && form.companyId) {
        payload.companyId = form.companyId;
      }

      if (editingAgent) {
        const response = await api.put(`/users/${editingAgent.id}`, payload);
        // Update externalApiKey if returned
        if ((response.data as any)?.externalApiKey) {
          setForm((prev) => ({ ...prev, externalApiKey: (response.data as any).externalApiKey }));
        }
        toast({ title: "Atendente IA atualizado" });
      } else {
        const response = await api.post("/users/ai-agent", payload);
        // Show the generated API key
        if ((response.data as any)?.externalApiKey) {
          setForm((prev) => ({ ...prev, externalApiKey: (response.data as any).externalApiKey }));
        }
        toast({ title: "Atendente IA criado" });
      }

      setIsDialogOpen(false);
      setSelectedPdfFile(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Falha ao salvar",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function copyApiKey() {
    if (form.externalApiKey) {
      navigator.clipboard.writeText(form.externalApiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      toast({ title: "API Key copiada!" });
    }
  }

  function generateNewApiKey() {
    // Generate a random hex key client-side for preview
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const newKey = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    setForm((prev) => ({ ...prev, externalApiKey: newKey }));
    toast({ title: "Nova API Key gerada", description: "Salve para confirmar a alteração" });
  }

  async function toggleAgentStatus(agent: AIAgent) {
    try {
      await api.put(`/users/${agent.id}`, {
        isActive: !agent.isActive,
      });
      toast({
        title: agent.isActive ? "Atendente desativado" : "Atendente ativado",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao alterar status",
        variant: "destructive",
      });
    }
  }

  async function deleteAgent(agent: AIAgent) {
    if (!confirm(`Deseja excluir o atendente "${agent.name}"?`)) return;

    try {
      await api.delete(`/users/${agent.id}`);
      toast({ title: "Atendente excluído" });
      fetchData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao excluir",
        variant: "destructive",
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6" />
            Atendentes IA
          </h1>
          <p className="text-muted-foreground">
            Configure atendentes virtuais com inteligência artificial
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Atendente IA
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de IAs</p>
                <p className="text-2xl font-bold">{agents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <Zap className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold">
                  {agents.filter((a) => a.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <MessageSquare className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Tickets em Atendimento
                </p>
                <p className="text-2xl font-bold">
                  {agents.reduce(
                    (sum, a) => sum + (a._count?.assignedTickets || 0),
                    0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Atendentes Configurados</CardTitle>
          <CardDescription>
            Gerencie seus atendentes de inteligência artificial
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Nenhum atendente IA configurado
              </h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro atendente virtual para automatizar o
                atendimento
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Atendente IA
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Setores</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{agent.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {agent.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {agent.aiType === "external" ? (
                        <Badge variant="outline" className="border-blue-500 text-blue-600">
                          <Globe className="w-3 h-3 mr-1" />
                          IA Externa
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {agent.aiModel || "gpt-4-turbo"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {agent.departments.length === 0 ? (
                          <span className="text-muted-foreground text-sm">
                            Todos
                          </span>
                        ) : (
                          agent.departments.slice(0, 2).map((d) => (
                            <Badge key={d.department.id} variant="secondary">
                              {d.department.name}
                            </Badge>
                          ))
                        )}
                        {agent.departments.length > 2 && (
                          <Badge variant="secondary">
                            +{agent.departments.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{agent._count?.assignedTickets || 0}</TableCell>
                    <TableCell>
                      <Badge
                        variant={agent.isActive ? "default" : "secondary"}
                        className={
                          agent.isActive ? "bg-green-500 hover:bg-green-600" : ""
                        }
                      >
                        {agent.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleAgentStatus(agent)}
                          title={agent.isActive ? "Desativar" : "Ativar"}
                        >
                          {agent.isActive ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(agent)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteAgent(agent)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAgent ? "Editar Atendente IA" : "Novo Atendente IA"}
            </DialogTitle>
            <DialogDescription>
              Configure o comportamento do atendente virtual
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Assistente Virtual"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (identificador)</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="ai@empresa.com"
                />
              </div>
            </div>

            {/* Company Selection (only for SUPER_ADMIN) */}
            {isSuperAdmin && !editingAgent && (
              <div className="space-y-2">
                <Label htmlFor="companyId">Empresa</Label>
                <Select
                  value={form.companyId || ""}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, companyId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecione qual empresa este agente IA vai atender
                </p>
              </div>
            )}

            {/* AI Type Selection */}
            <div className="space-y-2">
              <Label>Tipo de IA</Label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    form.aiType === "internal"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "hover:border-muted-foreground/50"
                  }`}
                  onClick={() => setForm((prev) => ({ ...prev, aiType: "internal" }))}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">IA Interna</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Usa nossa IA (OpenAI/Anthropic) para atendimento
                  </p>
                </div>
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    form.aiType === "external"
                      ? "border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20"
                      : "hover:border-muted-foreground/50"
                  }`}
                  onClick={() => setForm((prev) => ({ ...prev, aiType: "external" }))}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-sm">IA Externa</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Conecta com sistema externo via API e Webhook
                  </p>
                </div>
              </div>
            </div>

            {/* External AI Configuration */}
            {form.aiType === "external" && (
              <div className="space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
                <div className="flex items-center gap-2 mb-2">
                  <Webhook className="w-4 h-4 text-blue-500" />
                  <Label className="text-sm font-medium">Configuração da IA Externa</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">URL do Webhook *</Label>
                  <Input
                    id="webhookUrl"
                    type="url"
                    value={form.webhookUrl}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, webhookUrl: e.target.value }))
                    }
                    placeholder="https://seu-sistema.com/webhook/chatblue"
                  />
                  <p className="text-xs text-muted-foreground">
                    O ChatBlue enviará eventos (mensagens recebidas, atribuições) para esta URL
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhookSecret">Segredo do Webhook (opcional)</Label>
                  <Input
                    id="webhookSecret"
                    type="password"
                    value={form.webhookSecret}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, webhookSecret: e.target.value }))
                    }
                    placeholder="Segredo para assinatura HMAC-SHA256"
                  />
                  <p className="text-xs text-muted-foreground">
                    Usado para assinar os payloads (header X-Webhook-Signature)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="externalApiKey">API Key (para a IA chamar o ChatBlue)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="externalApiKey"
                      value={form.externalApiKey}
                      readOnly
                      className="font-mono text-xs bg-muted"
                      placeholder={editingAgent ? "Salvo no servidor" : "Será gerada automaticamente"}
                    />
                    {form.externalApiKey && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={copyApiKey}
                        title="Copiar API Key"
                      >
                        {copiedKey ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={generateNewApiKey}
                      title="Gerar nova API Key"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A IA externa usa esta chave no header X-API-Key para enviar mensagens via API
                  </p>
                </div>

                {/* Integration Settings */}
                <div className="pt-2 border-t border-blue-200 dark:border-blue-900">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4 text-blue-500" />
                    <Label className="text-sm font-medium">Configurações de Integração</Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Formato do Payload</Label>
                      <Select
                        value={form.payloadFormat}
                        onValueChange={(value) =>
                          setForm((prev) => ({ ...prev, payloadFormat: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chatblue">ChatBlue (genérico)</SelectItem>
                          <SelectItem value="bluechat">BlueChatPayload (bluetoken-ai)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Formato dos dados enviados ao webhook
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo de Autenticação</Label>
                      <Select
                        value={form.authType}
                        onValueChange={(value) =>
                          setForm((prev) => ({ ...prev, authType: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bearer">Bearer Token</SelectItem>
                          <SelectItem value="api-key">API Key (X-API-Key)</SelectItem>
                          <SelectItem value="hmac">HMAC-SHA256 (assinatura)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Como autenticar no webhook externo
                      </p>
                    </div>
                  </div>

                  {(form.authType === "bearer" || form.authType === "api-key") && (
                    <div className="space-y-2 mt-3">
                      <Label htmlFor="authToken">
                        {form.authType === "bearer" ? "Bearer Token" : "API Key do sistema externo"}
                      </Label>
                      <Input
                        id="authToken"
                        type="password"
                        value={form.authToken}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, authToken: e.target.value }))
                        }
                        placeholder={form.authType === "bearer" ? "Token de autenticação" : "Chave de API do webhook"}
                      />
                      <p className="text-xs text-muted-foreground">
                        Token usado para autenticar no sistema externo (Supabase, etc)
                      </p>
                    </div>
                  )}

                  {form.payloadFormat === "bluechat" && (
                    <div className="space-y-2 mt-3">
                      <Label>Empresa</Label>
                      <Select
                        value={form.empresa || undefined}
                        onValueChange={(value) =>
                          setForm((prev) => ({ ...prev, empresa: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TOKENIZA">Tokeniza</SelectItem>
                          <SelectItem value="BLUE">Blue</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Empresa no contexto do sistema externo (bluetoken-ai)
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Auto-Resposta</Label>
                        <p className="text-xs text-muted-foreground">
                          Envia a resposta da IA ao cliente automaticamente
                        </p>
                      </div>
                      <Switch
                        checked={form.autoReply}
                        onCheckedChange={(checked) =>
                          setForm((prev) => ({ ...prev, autoReply: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Auto-Escalação</Label>
                        <p className="text-xs text-muted-foreground">
                          Transfere quando a IA pede escalação
                        </p>
                      </div>
                      <Switch
                        checked={form.autoEscalate}
                        onCheckedChange={(checked) =>
                          setForm((prev) => ({ ...prev, autoEscalate: checked }))
                        }
                      />
                    </div>
                  </div>

                  {form.autoEscalate && (
                    <div className="space-y-2 mt-3">
                      <Label>Departamento Padrão para Escalação</Label>
                      <Select
                        value={form.escalateDepartmentId || "same"}
                        onValueChange={(value) =>
                          setForm((prev) => ({ ...prev, escalateDepartmentId: value === "same" ? "" : value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Manter no mesmo departamento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="same">Manter no mesmo departamento</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Quando a IA pede escalação, para qual departamento transferir
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-muted/50 rounded-md text-xs space-y-1 mt-3">
                  <p className="font-medium">Endpoints da API para a IA externa:</p>
                  <p className="font-mono text-muted-foreground">POST /api/external-ai/messages - Enviar mensagem</p>
                  <p className="font-mono text-muted-foreground">POST /api/external-ai/tickets/:id/transfer - Transferir</p>
                  <p className="font-mono text-muted-foreground">POST /api/external-ai/tickets/:id/resolve - Resolver</p>
                  <p className="font-mono text-muted-foreground">GET /api/external-ai/tickets/:id/messages - Histórico</p>
                </div>
              </div>
            )}

            {/* PDF Upload for Training (only for internal AI) */}
            {form.aiType === "internal" && (
            <div className="space-y-2">
              <Label>Documento de Treinamento (PDF)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handlePdfUpload(file);
                    }
                  }}
                  className="hidden"
                  id="pdf-upload"
                  disabled={isProcessingPdf}
                />
                <Label
                  htmlFor="pdf-upload"
                  className="flex-1 cursor-pointer border border-dashed rounded-md p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    {isProcessingPdf ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Processando PDF...
                        </span>
                      </>
                    ) : selectedPdfFile ? (
                      <>
                        <FileText className="w-6 h-6 text-primary" />
                        <span className="text-sm font-medium">
                          {selectedPdfFile.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedPdfFile(null);
                            setForm((prev) => ({ ...prev, trainingData: undefined }));
                            const input = document.getElementById("pdf-upload") as HTMLInputElement;
                            if (input) input.value = "";
                          }}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Remover
                        </Button>
                      </>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Clique para fazer upload de um PDF
                        </span>
                      </>
                    )}
                  </div>
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Faça upload de um PDF contendo informações sobre a empresa, departamentos e como o agente deve se comportar. O conteúdo será usado para treinar o agente IA.
              </p>
            </div>
            )}

            {/* AI Model Settings (only for internal AI) */}
            {form.aiType === "internal" && (<>
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-primary" />
                <Label className="text-sm font-medium">Modelo de IA</Label>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aiModel">Modelo</Label>
                  <Select
                    value={form.aiModel}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, aiModel: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center gap-2">
                            <span>{model.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({model.provider})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperature">
                    Temperatura ({form.aiTemperature})
                  </Label>
                  <Input
                    id="temperature"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={form.aiTemperature}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        aiTemperature: parseFloat(e.target.value),
                      }))
                    }
                    className="cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    min={100}
                    max={4000}
                    value={form.aiMaxTokens}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        aiMaxTokens: parseInt(e.target.value) || 1000,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Personality Settings */}
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <Label className="text-sm font-medium">Personalidade da IA</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tom de Voz</Label>
                  <Select
                    value={form.aiPersonalityTone}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, aiPersonalityTone: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERSONALITY_TONES.map((tone) => (
                        <SelectItem key={tone.id} value={tone.id}>
                          <div className="flex flex-col">
                            <span>{tone.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {tone.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estilo de Resposta</Label>
                  <Select
                    value={form.aiPersonalityStyle}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, aiPersonalityStyle: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERSONALITY_STYLES.map((style) => (
                        <SelectItem key={style.id} value={style.id}>
                          <div className="flex flex-col">
                            <span>{style.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {style.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Usar Emojis</Label>
                    <p className="text-xs text-muted-foreground">
                      Permite emojis nas respostas
                    </p>
                  </div>
                  <Switch
                    checked={form.aiUseEmojis}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, aiUseEmojis: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Usar Nome do Cliente</Label>
                    <p className="text-xs text-muted-foreground">
                      Personaliza respostas
                    </p>
                  </div>
                  <Switch
                    checked={form.aiUseClientName}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, aiUseClientName: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <Label className="text-sm font-medium">Segurança</Label>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Guardrails de Contexto</Label>
                  <p className="text-sm text-muted-foreground">
                    Impede que a IA responda sobre assuntos fora do escopo
                  </p>
                </div>
                <Switch
                  checked={form.aiGuardrailsEnabled}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, aiGuardrailsEnabled: checked }))
                  }
                />
              </div>
            </div>
            </>)}

            {/* Departments */}
            <div className="space-y-2">
              <Label>Setores (deixe vazio para todos)</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-md">
                {departments.map((dept) => (
                  <Badge
                    key={dept.id}
                    variant={
                      form.departmentIds.includes(dept.id)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        departmentIds: prev.departmentIds.includes(dept.id)
                          ? prev.departmentIds.filter((id) => id !== dept.id)
                          : [...prev.departmentIds, dept.id],
                      }));
                    }}
                  >
                    {dept.name}
                  </Badge>
                ))}
                {departments.length === 0 && (
                  <span className="text-muted-foreground text-sm">
                    Nenhum setor cadastrado
                  </span>
                )}
              </div>
            </div>

            {/* System Prompt (only for internal AI) */}
            {form.aiType === "internal" && (
            <>
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">Prompt do Sistema</Label>
              <Textarea
                id="systemPrompt"
                value={form.aiSystemPrompt}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    aiSystemPrompt: e.target.value,
                  }))
                }
                placeholder="Defina a personalidade e instruções do atendente..."
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                Este prompt define como o atendente IA se comporta e responde
              </p>
            </div>

            {/* Transfer Keywords */}
            <div className="space-y-2">
              <Label htmlFor="transferKeywords">
                Palavras-chave para Transferência
              </Label>
              <Input
                id="transferKeywords"
                value={form.transferKeywords}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    transferKeywords: e.target.value,
                  }))
                }
                placeholder="falar com humano, atendente, pessoa real"
              />
              <p className="text-xs text-muted-foreground">
                Separe por vírgula. Quando detectadas, o ticket é transferido
                automaticamente
              </p>
            </div>
            </>
            )}

            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Habilita este atendente para receber tickets
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingAgent ? "Salvar Alterações" : "Criar Atendente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
  departments: { department: Department }[];
  _count?: {
    assignedTickets: number;
  };
}

interface AIAgentForm {
  name: string;
  email: string;
  aiModel: string;
  aiTemperature: number;
  aiMaxTokens: number;
  aiSystemPrompt: string;
  transferKeywords: string;
  departmentIds: string[];
  isActive: boolean;
}

const defaultForm: AIAgentForm = {
  name: "",
  email: "",
  aiModel: "gpt-4-turbo-preview",
  aiTemperature: 0.7,
  aiMaxTokens: 1000,
  aiSystemPrompt: `Você é um assistente virtual de atendimento ao cliente. Seja sempre cordial, profissional e objetivo.

Diretrizes:
- Cumprimente o cliente de forma amigável
- Entenda a necessidade antes de responder
- Forneça informações precisas e úteis
- Se não souber a resposta, informe que vai transferir para um atendente humano
- Use linguagem clara e acessível

Palavras-chave para transferência automática: "falar com humano", "atendente", "pessoa real"`,
  transferKeywords: "falar com humano, atendente, pessoa real, humano",
  departmentIds: [],
  isActive: true,
};

export default function AIAgentPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [form, setForm] = useState<AIAgentForm>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [agentsRes, deptsRes] = await Promise.all([
        api.get<AIAgent[]>("/users/ai-agents"),
        api.get<Department[]>("/departments"),
      ]);
      setAgents(agentsRes.data);
      setDepartments(deptsRes.data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingAgent(null);
    setForm(defaultForm);
    setIsDialogOpen(true);
  }

  function openEditDialog(agent: AIAgent) {
    setEditingAgent(agent);
    setForm({
      name: agent.name,
      email: agent.email,
      aiModel: agent.aiModel || "gpt-4-turbo-preview",
      aiTemperature: agent.aiTemperature || 0.7,
      aiMaxTokens: agent.aiMaxTokens || 1000,
      aiSystemPrompt: agent.aiSystemPrompt || "",
      transferKeywords: agent.transferKeywords?.join(", ") || "",
      departmentIds: agent.departments.map((d) => d.department.id),
      isActive: agent.isActive,
    });
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

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        role: "ai" as const,
        transferKeywords: form.transferKeywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      };

      if (editingAgent) {
        await api.put(`/users/${editingAgent.id}`, payload);
        toast({ title: "Atendente IA atualizado" });
      } else {
        await api.post("/users/ai-agent", payload);
        toast({ title: "Atendente IA criado" });
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao salvar",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleAgentStatus(agent: AIAgent) {
    try {
      await api.patch(`/users/${agent.id}/status`, {
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
                      <Badge variant="outline">
                        {agent.aiModel || "gpt-4-turbo"}
                      </Badge>
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

            {/* AI Settings */}
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
                    <SelectItem value="gpt-4-turbo-preview">
                      GPT-4 Turbo
                    </SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                    <SelectItem value="claude-3-sonnet">
                      Claude 3 Sonnet
                    </SelectItem>
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

            {/* System Prompt */}
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

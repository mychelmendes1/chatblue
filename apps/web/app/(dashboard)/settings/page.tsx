"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Building,
  Bell,
  Shield,
  Globe,
  Loader2,
  Save,
  TestTube,
  Brain,
  Sparkles,
  Plus,
  MoreHorizontal,
  Users,
  Pencil,
  Trash2,
  Check,
  FolderTree,
  Mic,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";

interface CompanySettings {
  id: string;
  autoAssign: boolean;
  maxTicketsPerAgent: number;
  welcomeMessage?: string;
  awayMessage?: string;
  notionApiKey?: string;
  notionDatabaseId?: string;
  notionSyncEnabled: boolean;
  aiEnabled: boolean;
  aiProvider?: string;
  aiApiKey?: string;
  aiDefaultModel?: string;
  aiSystemPrompt?: string;
  // Whisper (Audio Transcription)
  whisperApiKey?: string;
  // New personality settings
  aiPersonalityTone?: string;
  aiPersonalityStyle?: string;
  aiUseEmojis?: boolean;
  aiUseClientName?: boolean;
  aiGuardrailsEnabled?: boolean;
  // Default transfer department
  defaultTransferDepartmentId?: string | null;
}

interface DepartmentUser {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
    isAI: boolean;
  };
  isManager: boolean;
}

interface Department {
  id: string;
  name: string;
  description?: string;
  color?: string;
  order: number;
  parentId?: string;
  parent?: { id: string; name: string };
  children?: { id: string; name: string; color?: string }[];
  users: DepartmentUser[];
  _count: { tickets: number };
  isActive: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  isAI: boolean;
  role: string;
  departments?: { department: { id: string; name: string } }[];
}

const DEPARTMENT_COLORS = [
  { id: '#6366f1', name: 'Indigo' },
  { id: '#22c55e', name: 'Verde' },
  { id: '#f59e0b', name: 'Âmbar' },
  { id: '#ef4444', name: 'Vermelho' },
  { id: '#3b82f6', name: 'Azul' },
  { id: '#8b5cf6', name: 'Violeta' },
  { id: '#ec4899', name: 'Rosa' },
  { id: '#14b8a6', name: 'Teal' },
  { id: '#f97316', name: 'Laranja' },
  { id: '#64748b', name: 'Cinza' },
];

// Available models per provider
const AI_MODELS = {
  openai: [
    { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', description: 'Modelo mais capaz da OpenAI' },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Modelo otimizado multimodal' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Versão mais rápida e econômica' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Modelo rápido e econômico' },
  ],
  anthropic: [
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Modelo mais inteligente e capaz da Anthropic' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Modelo equilibrado entre capacidade e velocidade' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Excelente equilíbrio entre capacidade e velocidade' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Modelo muito capaz (geração anterior)' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Modelo mais rápido e econômico' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Modelo versátil de alta performance' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Modelo rápido para respostas instantâneas' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Modelo com contexto expandido' },
  ],
};

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

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  // Form states
  const [generalForm, setGeneralForm] = useState({
    autoAssign: true,
    maxTicketsPerAgent: 10,
    welcomeMessage: "",
    awayMessage: "",
  });

  const [notionForm, setNotionForm] = useState({
    notionApiKey: "",
    notionDatabaseId: "",
    notionSyncEnabled: false,
  });

  const [aiForm, setAiForm] = useState({
    aiEnabled: false,
    aiProvider: "openai",
    aiApiKey: "",
    aiDefaultModel: "gpt-4-turbo-preview",
    aiSystemPrompt: "",
    // Whisper (Audio Transcription)
    whisperApiKey: "",
    // Personality settings
    aiPersonalityTone: "friendly",
    aiPersonalityStyle: "conversational",
    aiUseEmojis: true,
    aiUseClientName: true,
    aiGuardrailsEnabled: true,
  });

  // Department states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [isUsersDialogOpen, setIsUsersDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [managingDepartment, setManagingDepartment] = useState<Department | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    description: "",
    color: "#6366f1",
    parentId: "",
  });

  // Users management states
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "AGENT" as "ADMIN" | "SUPERVISOR" | "AGENT",
  });

  useEffect(() => {
    fetchSettings();
    fetchDepartments();
    fetchAllUsers();
  }, []);

  // Listen for company switch events to reload data
  useEffect(() => {
    const handleCompanySwitch = () => {
      console.log("Company switched, reloading settings...");
      setSettings(null);
      fetchSettings();
    };

    window.addEventListener('company-switched', handleCompanySwitch);
    return () => {
      window.removeEventListener('company-switched', handleCompanySwitch);
    };
  }, []);

  // Update default model when provider changes
  useEffect(() => {
    const models = AI_MODELS[aiForm.aiProvider as keyof typeof AI_MODELS];
    if (models && models.length > 0) {
      const currentModelExists = models.some(m => m.id === aiForm.aiDefaultModel);
      if (!currentModelExists) {
        setAiForm(prev => ({ ...prev, aiDefaultModel: models[0].id }));
      }
    }
  }, [aiForm.aiProvider]);

  async function fetchSettings() {
    try {
      const response = await api.get<CompanySettings>("/settings");
      const data = response.data;
      setSettings(data);

      setGeneralForm({
        autoAssign: data.autoAssign,
        maxTicketsPerAgent: data.maxTicketsPerAgent,
        welcomeMessage: data.welcomeMessage || "",
        awayMessage: data.awayMessage || "",
      });

      setNotionForm({
        notionApiKey: data.notionApiKey || "",
        notionDatabaseId: data.notionDatabaseId || "",
        notionSyncEnabled: data.notionSyncEnabled,
      });

      setAiForm({
        aiEnabled: data.aiEnabled,
        aiProvider: data.aiProvider || "openai",
        aiApiKey: data.aiApiKey || "",
        aiDefaultModel: data.aiDefaultModel || "gpt-4-turbo-preview",
        aiSystemPrompt: data.aiSystemPrompt || "",
        whisperApiKey: data.whisperApiKey || "",
        aiPersonalityTone: data.aiPersonalityTone || "friendly",
        aiPersonalityStyle: data.aiPersonalityStyle || "conversational",
        aiUseEmojis: data.aiUseEmojis ?? true,
        aiUseClientName: data.aiUseClientName ?? true,
        aiGuardrailsEnabled: data.aiGuardrailsEnabled ?? true,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar configurações",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchDepartments() {
    setIsLoadingDepartments(true);
    try {
      const response = await api.get<Department[]>("/departments");
      setDepartments(response.data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar departamentos",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDepartments(false);
    }
  }

  async function fetchAllUsers() {
    try {
      const response = await api.get<User[]>("/users");
      setAllUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  }

  function openCreateUserDialog() {
    setEditingUser(null);
    setUserForm({
      name: "",
      email: "",
      password: "",
      role: "AGENT",
    });
    setIsUserDialogOpen(true);
  }

  function openEditUserDialog(user: User) {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      password: "", // Don't show password
      role: user.role as "ADMIN" | "SUPERVISOR" | "AGENT",
    });
    setIsUserDialogOpen(true);
  }

  async function saveUser() {
    if (!userForm.name.trim() || !userForm.email.trim()) {
      toast({
        title: "Erro",
        description: "Nome e email são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (!editingUser && !userForm.password.trim()) {
      toast({
        title: "Erro",
        description: "Senha é obrigatória para novos usuários",
        variant: "destructive",
      });
      return;
    }

    if (!editingUser && userForm.password.trim().length < 6) {
      toast({
        title: "Erro",
        description: "Senha deve ter no mínimo 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingUser) {
        // For updates, only send fields that can be updated (password requires separate endpoint)
        const payload: any = {
          name: userForm.name,
          role: userForm.role,
        };
        
        // If password is provided, we need to handle it separately
        // For now, we'll update the user without password
        // TODO: Add password update endpoint if needed
        await api.put(`/users/${editingUser.id}`, payload);
        toast({ title: "Usuário atualizado" });
      } else {
        // For new users, include password
        const payload = {
          name: userForm.name,
          email: userForm.email,
          password: userForm.password,
          role: userForm.role,
        };
        await api.post("/users", payload);
        toast({ title: "Usuário criado" });
      }

      setIsUserDialogOpen(false);
      fetchAllUsers();
      fetchDepartments(); // Refresh to update user lists
    } catch (error: any) {
      console.error("Error saving user:", error);
      toast({
        title: "Erro",
        description: error?.response?.data?.error || error?.message || "Falha ao salvar usuário",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteUser(user: User) {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${user.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/users/${user.id}`);
      toast({ title: "Usuário excluído" });
      fetchAllUsers();
      fetchDepartments(); // Refresh to update user lists
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.response?.data?.error || error?.message || "Falha ao excluir usuário",
        variant: "destructive",
      });
    }
  }

  function openCreateDepartmentDialog() {
    setEditingDepartment(null);
    setDepartmentForm({
      name: "",
      description: "",
      color: "#6366f1",
      parentId: "",
    });
    setIsDepartmentDialogOpen(true);
  }

  function openEditDepartmentDialog(dept: Department) {
    setEditingDepartment(dept);
    setDepartmentForm({
      name: dept.name,
      description: dept.description || "",
      color: dept.color || "#6366f1",
      parentId: dept.parentId || "",
    });
    setIsDepartmentDialogOpen(true);
  }

  function openUsersDialog(dept: Department) {
    setManagingDepartment(dept);
    setSelectedUserIds(dept.users.map((u) => u.user.id));
    setIsUsersDialogOpen(true);
  }

  async function saveDepartment() {
    if (!departmentForm.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do departamento é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: departmentForm.name,
        description: departmentForm.description || undefined,
        color: departmentForm.color,
        parentId: departmentForm.parentId || null,
      };

      if (editingDepartment) {
        await api.put(`/departments/${editingDepartment.id}`, payload);
        toast({ title: "Departamento atualizado" });
      } else {
        await api.post("/departments", payload);
        toast({ title: "Departamento criado" });
      }

      setIsDepartmentDialogOpen(false);
      fetchDepartments();
    } catch (error: any) {
      console.error("Error saving department:", error);
      toast({
        title: "Erro",
        description: error?.message || "Falha ao salvar departamento",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteDepartment(dept: Department) {
    if (!confirm(`Tem certeza que deseja excluir o departamento "${dept.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/departments/${dept.id}`);
      toast({ title: "Departamento excluído" });
      fetchDepartments();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Falha ao excluir departamento",
        variant: "destructive",
      });
    }
  }

  async function saveUserAssignments() {
    if (!managingDepartment) return;

    setIsSaving(true);
    try {
      // Get current user IDs in department
      const currentUserIds = managingDepartment.users.map((u) => u.user.id);
      
      // Find users to add and remove
      const usersToAdd = selectedUserIds.filter((id) => !currentUserIds.includes(id));
      const usersToRemove = currentUserIds.filter((id) => !selectedUserIds.includes(id));

      // Add new users
      if (usersToAdd.length > 0) {
        await api.post(`/departments/${managingDepartment.id}/users`, {
          userIds: usersToAdd,
        });
      }

      // Remove users
      for (const userId of usersToRemove) {
        await api.delete(`/departments/${managingDepartment.id}/users/${userId}`);
      }

      toast({ title: "Usuários atualizados" });
      setIsUsersDialogOpen(false);
      fetchDepartments();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar usuários",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  // Organize departments into hierarchy for display
  function getDepartmentHierarchy(): (Department & { level: number })[] {
    const result: (Department & { level: number })[] = [];
    
    // First, add root departments (no parent)
    const rootDepts = departments.filter((d) => !d.parentId);
    
    function addWithChildren(dept: Department, level: number) {
      result.push({ ...dept, level });
      const children = departments.filter((d) => d.parentId === dept.id);
      children.forEach((child) => addWithChildren(child, level + 1));
    }
    
    rootDepts.forEach((dept) => addWithChildren(dept, 0));
    return result;
  }

  async function saveGeneralSettings() {
    setIsSaving(true);
    try {
      await api.put("/settings", generalForm);
      toast({ title: "Configurações salvas" });
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

  async function saveNotionSettings() {
    setIsSaving(true);
    try {
      await api.put("/settings/notion", notionForm);
      toast({ title: "Configurações do Notion salvas" });
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

  async function testNotionConnection() {
    try {
      const response = await api.post<{ success: boolean }>("/settings/notion/test", {
        notionApiKey: notionForm.notionApiKey,
        notionDatabaseId: notionForm.notionDatabaseId,
      });

      if (response.data.success) {
        toast({ title: "Conexão com Notion funcionando!" });
      } else {
        toast({
          title: "Falha na conexão",
          description: "Verifique as credenciais",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao testar conexão",
        variant: "destructive",
      });
    }
  }

  async function saveAiSettings() {
    setIsSaving(true);
    try {
      await api.put("/settings/ai", aiForm);
      toast({ title: "Configurações de IA salvas" });
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

  const currentModels = AI_MODELS[aiForm.aiProvider as keyof typeof AI_MODELS] || AI_MODELS.openai;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do seu sistema
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">
            <Settings className="w-4 h-4 mr-2" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="notion">
            <Globe className="w-4 h-4 mr-2" />
            Notion
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Brain className="w-4 h-4 mr-2" />
            IA
          </TabsTrigger>
          <TabsTrigger value="departments">
            <FolderTree className="w-4 h-4 mr-2" />
            Departamentos
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Usuários
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>
                Configure o comportamento básico do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Atribuição Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Distribui tickets automaticamente entre atendentes
                  </p>
                </div>
                <Switch
                  checked={generalForm.autoAssign}
                  onCheckedChange={(checked) =>
                    setGeneralForm((prev) => ({ ...prev, autoAssign: checked }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTickets">Máximo de Tickets por Atendente</Label>
                <Input
                  id="maxTickets"
                  type="number"
                  min={1}
                  max={100}
                  value={generalForm.maxTicketsPerAgent}
                  onChange={(e) =>
                    setGeneralForm((prev) => ({
                      ...prev,
                      maxTicketsPerAgent: parseInt(e.target.value) || 10,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Mensagem de Boas-vindas</Label>
                <Textarea
                  id="welcomeMessage"
                  value={generalForm.welcomeMessage}
                  onChange={(e) =>
                    setGeneralForm((prev) => ({
                      ...prev,
                      welcomeMessage: e.target.value,
                    }))
                  }
                  placeholder="Olá! Bem-vindo ao nosso atendimento..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="awayMessage">Mensagem de Ausência</Label>
                <Textarea
                  id="awayMessage"
                  value={generalForm.awayMessage}
                  onChange={(e) =>
                    setGeneralForm((prev) => ({
                      ...prev,
                      awayMessage: e.target.value,
                    }))
                  }
                  placeholder="No momento estamos fora do horário..."
                  rows={3}
                />
              </div>

              <Button onClick={saveGeneralSettings} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notion Settings */}
        <TabsContent value="notion">
          <Card>
            <CardHeader>
              <CardTitle>Integração com Notion</CardTitle>
              <CardDescription>
                Conecte com sua base de clientes no Notion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sincronização Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Verifica status de cliente automaticamente
                  </p>
                </div>
                <Switch
                  checked={notionForm.notionSyncEnabled}
                  onCheckedChange={(checked) =>
                    setNotionForm((prev) => ({
                      ...prev,
                      notionSyncEnabled: checked,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notionApiKey">API Key do Notion</Label>
                <Input
                  id="notionApiKey"
                  type="password"
                  value={notionForm.notionApiKey}
                  onChange={(e) =>
                    setNotionForm((prev) => ({
                      ...prev,
                      notionApiKey: e.target.value,
                    }))
                  }
                  placeholder="secret_..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notionDatabaseId">ID do Database</Label>
                <Input
                  id="notionDatabaseId"
                  value={notionForm.notionDatabaseId}
                  onChange={(e) =>
                    setNotionForm((prev) => ({
                      ...prev,
                      notionDatabaseId: e.target.value,
                    }))
                  }
                  placeholder="abc123..."
                />
                <p className="text-xs text-muted-foreground">
                  O ID pode ser encontrado na URL do database
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveNotionSettings} disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
                <Button
                  variant="outline"
                  onClick={testNotionConnection}
                  disabled={!notionForm.notionApiKey || !notionForm.notionDatabaseId}
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  Testar Conexão
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Settings */}
        <TabsContent value="ai">
          <div className="space-y-6">
            {/* Provider & API Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Provedor de IA
                </CardTitle>
                <CardDescription>
                  Configure o provedor e modelo de IA para atendimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>IA Habilitada</Label>
                    <p className="text-sm text-muted-foreground">
                      Permite atendentes de IA no sistema
                    </p>
                  </div>
                  <Switch
                    checked={aiForm.aiEnabled}
                    onCheckedChange={(checked) =>
                      setAiForm((prev) => ({ ...prev, aiEnabled: checked }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="aiProvider">Provedor</Label>
                    <Select
                      value={aiForm.aiProvider}
                      onValueChange={(value) =>
                        setAiForm((prev) => ({ ...prev, aiProvider: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o provedor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">OpenAI</span>
                            <span className="text-xs text-muted-foreground">GPT-4</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="anthropic">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Anthropic</span>
                            <span className="text-xs text-muted-foreground">Claude</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="groq">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Groq</span>
                            <span className="text-xs text-muted-foreground">Llama, Mixtral</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aiModel">Modelo</Label>
                    <Select
                      value={aiForm.aiDefaultModel}
                      onValueChange={(value) =>
                        setAiForm((prev) => ({ ...prev, aiDefaultModel: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{model.name}</span>
                              <span className="text-xs text-muted-foreground">{model.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aiApiKey">API Key ({aiForm.aiProvider === 'anthropic' ? 'Anthropic' : aiForm.aiProvider === 'groq' ? 'Groq' : 'OpenAI'})</Label>
                  <Input
                    id="aiApiKey"
                    type="password"
                    value={aiForm.aiApiKey}
                    onChange={(e) =>
                      setAiForm((prev) => ({ ...prev, aiApiKey: e.target.value }))
                    }
                    placeholder={aiForm.aiProvider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
                  />
                  <p className="text-xs text-muted-foreground">
                    {aiForm.aiProvider === 'anthropic' 
                      ? 'Obtenha sua chave em console.anthropic.com'
                      : aiForm.aiProvider === 'groq'
                      ? 'Obtenha sua chave em console.groq.com'
                      : 'Obtenha sua chave em platform.openai.com'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Whisper (Audio Transcription) Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Transcrição de Áudio (Whisper)
                </CardTitle>
                <CardDescription>
                  Configure a API do OpenAI Whisper para transcrever mensagens de áudio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="whisperApiKey">API Key OpenAI (Whisper)</Label>
                  <Input
                    id="whisperApiKey"
                    type="password"
                    value={aiForm.whisperApiKey}
                    onChange={(e) =>
                      setAiForm((prev) => ({ ...prev, whisperApiKey: e.target.value }))
                    }
                    placeholder="sk-..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Chave separada para transcrição de áudio. Obtenha em platform.openai.com
                  </p>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Dica:</strong> O Whisper é usado para transcrever áudios enviados pelos clientes. 
                    Você pode usar a mesma chave da OpenAI se seu provedor principal for OpenAI, ou uma chave separada 
                    se estiver usando Anthropic/Groq para conversação.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Personality Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Personalidade da IA
                </CardTitle>
                <CardDescription>
                  Configure como a IA deve se comportar e se comunicar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tom de Voz</Label>
                    <Select
                      value={aiForm.aiPersonalityTone}
                      onValueChange={(value) =>
                        setAiForm((prev) => ({ ...prev, aiPersonalityTone: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tom" />
                      </SelectTrigger>
                      <SelectContent>
                        {PERSONALITY_TONES.map((tone) => (
                          <SelectItem key={tone.id} value={tone.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{tone.name}</span>
                              <span className="text-xs text-muted-foreground">{tone.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estilo de Resposta</Label>
                    <Select
                      value={aiForm.aiPersonalityStyle}
                      onValueChange={(value) =>
                        setAiForm((prev) => ({ ...prev, aiPersonalityStyle: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estilo" />
                      </SelectTrigger>
                      <SelectContent>
                        {PERSONALITY_STYLES.map((style) => (
                          <SelectItem key={style.id} value={style.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{style.name}</span>
                              <span className="text-xs text-muted-foreground">{style.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Usar Emojis</Label>
                      <p className="text-sm text-muted-foreground">
                        Permite que a IA use emojis nas respostas
                      </p>
                    </div>
                    <Switch
                      checked={aiForm.aiUseEmojis}
                      onCheckedChange={(checked) =>
                        setAiForm((prev) => ({ ...prev, aiUseEmojis: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Personalização por Nome</Label>
                      <p className="text-sm text-muted-foreground">
                        Usa o nome do cliente para personalizar respostas
                      </p>
                    </div>
                    <Switch
                      checked={aiForm.aiUseClientName}
                      onCheckedChange={(checked) =>
                        setAiForm((prev) => ({ ...prev, aiUseClientName: checked }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Segurança e Guardrails
                </CardTitle>
                <CardDescription>
                  Configure limites e proteções para a IA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Guardrails de Contexto</Label>
                    <p className="text-sm text-muted-foreground">
                      Impede que a IA responda sobre assuntos fora do escopo da empresa
                    </p>
                  </div>
                  <Switch
                    checked={aiForm.aiGuardrailsEnabled}
                    onCheckedChange={(checked) =>
                      setAiForm((prev) => ({ ...prev, aiGuardrailsEnabled: checked }))
                    }
                  />
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Proteções Ativas</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Bloqueio de solicitações de dados sensíveis (CPF, cartão)</li>
                    <li>• Prevenção contra desvio de assunto</li>
                    <li>• Detecção de tentativas de manipulação</li>
                    <li>• Redirecionamento para atendente humano quando necessário</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aiPrompt">Prompt do Sistema (Personalizado)</Label>
                  <Textarea
                    id="aiPrompt"
                    value={aiForm.aiSystemPrompt}
                    onChange={(e) =>
                      setAiForm((prev) => ({
                        ...prev,
                        aiSystemPrompt: e.target.value,
                      }))
                    }
                    placeholder="Instruções adicionais para a IA... (opcional)"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Adicione instruções específicas que complementam a personalidade configurada
                  </p>
                </div>

                <Button onClick={saveAiSettings} disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações de IA
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Departments Settings */}
        <TabsContent value="departments">
          {/* Default Transfer Department Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Departamento Padrão para Transferências
              </CardTitle>
              <CardDescription>
                Quando a IA não identificar um setor específico, as transferências serão direcionadas para este departamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Select
                  value={settings?.defaultTransferDepartmentId || "_none"}
                  onValueChange={async (value) => {
                    try {
                      await api.put("/settings", {
                        defaultTransferDepartmentId: value === "_none" ? null : value,
                      });
                      fetchSettings();
                      toast({ title: "Departamento padrão atualizado!" });
                    } catch (error) {
                      toast({
                        title: "Erro",
                        description: "Falha ao atualizar departamento padrão",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Selecione um departamento padrão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhum (sem departamento)</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: dept.color || "#6366f1" }}
                          />
                          {dept.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {settings?.defaultTransferDepartmentId
                    ? `Transferências gerais irão para: ${departments.find(d => d.id === settings.defaultTransferDepartmentId)?.name || "Departamento"}`
                    : "Nenhum departamento padrão configurado"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FolderTree className="w-5 h-5" />
                    Departamentos / Setores
                  </CardTitle>
                  <CardDescription>
                    Gerencie os departamentos e defina quais usuários pertencem a cada setor
                  </CardDescription>
                </div>
                <Button onClick={openCreateDepartmentDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Departamento
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingDepartments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : departments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderTree className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum departamento criado</p>
                  <p className="text-sm">Crie departamentos para organizar seu atendimento</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {getDepartmentHierarchy().map((dept) => (
                    <div
                      key={dept.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      style={{ marginLeft: dept.level * 24 }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: dept.color || "#6366f1" }}
                        />
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {dept.name}
                            {dept.parent && (
                              <span className="text-xs text-muted-foreground">
                                (sub de {dept.parent.name})
                              </span>
                            )}
                          </div>
                          {dept.description && (
                            <p className="text-sm text-muted-foreground">{dept.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Users avatars */}
                        <div className="flex items-center gap-1">
                          <div className="flex -space-x-2">
                            {dept.users.slice(0, 3).map((u) => (
                              <Avatar
                                key={u.user.id}
                                className="w-7 h-7 border-2 border-background"
                              >
                                <AvatarImage src={u.user.avatar} />
                                <AvatarFallback className="text-xs">
                                  {u.user.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          {dept.users.length > 3 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              +{dept.users.length - 3}
                            </span>
                          )}
                          {dept.users.length === 0 && (
                            <span className="text-xs text-muted-foreground">
                              Sem usuários
                            </span>
                          )}
                        </div>

                        {/* Tickets count */}
                        <Badge variant="secondary" className="min-w-[60px] justify-center">
                          {dept._count.tickets} tickets
                        </Badge>

                        {/* Actions dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDepartmentDialog(dept)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openUsersDialog(dept)}>
                              <Users className="w-4 h-4 mr-2" />
                              Gerenciar Usuários
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteDepartment(dept)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Como funciona a visibilidade</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Administradores e Super Admins veem todas as conversas</li>
                  <li>• Supervisores e Agentes veem apenas conversas dos seus departamentos</li>
                  <li>• Usuários podem pertencer a múltiplos departamentos</li>
                  <li>• Subdepartamentos herdam acesso do departamento pai</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Settings */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Usuários Internos
                  </CardTitle>
                  <CardDescription>
                    Gerencie os usuários que podem acessar o sistema
                  </CardDescription>
                </div>
                <Button onClick={openCreateUserDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Usuário
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {allUsers.filter((u) => !u.isAI).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum usuário cadastrado</p>
                  <p className="text-sm">Crie usuários para acessar o sistema</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allUsers.filter((u) => !u.isAI).map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {user.name}
                            {user.isOnline && (
                              <span className="w-2 h-2 bg-green-500 rounded-full" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <Badge variant="outline">{user.role}</Badge>
                        {user.departments && user.departments.length > 0 && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <FolderTree className="w-4 h-4" />
                            <span>{user.departments.length} departamento(s)</span>
                          </div>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditUserDialog(user)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteUser(user)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Department Create/Edit Dialog */}
      <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? "Editar Departamento" : "Novo Departamento"}
            </DialogTitle>
            <DialogDescription>
              {editingDepartment
                ? "Altere as informações do departamento"
                : "Crie um novo departamento para organizar seu atendimento"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deptName">Nome *</Label>
              <Input
                id="deptName"
                value={departmentForm.name}
                onChange={(e) =>
                  setDepartmentForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ex: Comercial, Suporte, Financeiro..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deptDescription">Descrição</Label>
              <Textarea
                id="deptDescription"
                value={departmentForm.description}
                onChange={(e) =>
                  setDepartmentForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Descreva a função deste departamento..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {DEPARTMENT_COLORS.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() =>
                      setDepartmentForm((prev) => ({ ...prev, color: color.id }))
                    }
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      departmentForm.color === color.id
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.id }}
                    title={color.name}
                  >
                    {departmentForm.color === color.id && (
                      <Check className="w-4 h-4 text-white mx-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deptParent">Departamento Pai (opcional)</Label>
              <Select
                value={departmentForm.parentId || "_none"}
                onValueChange={(value) =>
                  setDepartmentForm((prev) => ({
                    ...prev,
                    parentId: value === "_none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum (departamento raiz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhum (departamento raiz)</SelectItem>
                  {departments
                    .filter((d) => d.id !== editingDepartment?.id)
                    .map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: dept.color || "#6366f1" }}
                          />
                          {dept.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Subdepartamentos aparecem aninhados na hierarquia
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDepartmentDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={saveDepartment} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingDepartment ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Users Management Dialog */}
      <Dialog open={isUsersDialogOpen} onOpenChange={setIsUsersDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Gerenciar Usuários - {managingDepartment?.name}
            </DialogTitle>
            <DialogDescription>
              Selecione os usuários que pertencem a este departamento
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-2 py-4">
              {allUsers.filter((u) => !u.isAI).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                >
                  <Checkbox
                    id={`user-${user.id}`}
                    checked={selectedUserIds.includes(user.id)}
                    onCheckedChange={(checked: boolean | "indeterminate") => {
                      if (checked === true) {
                        setSelectedUserIds((prev) => [...prev, user.id]);
                      } else {
                        setSelectedUserIds((prev) =>
                          prev.filter((id) => id !== user.id)
                        );
                      }
                    }}
                  />
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <label
                      htmlFor={`user-${user.id}`}
                      className="font-medium cursor-pointer"
                    >
                      {user.name}
                    </label>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {user.role}
                  </Badge>
                </div>
              ))}

              {allUsers.filter((u) => !u.isAI).length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum usuário disponível
                </p>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUsersDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={saveUserAssignments} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Create/Edit Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Altere as informações do usuário"
                : "Crie um novo usuário para acessar o sistema"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userName">Nome *</Label>
              <Input
                id="userName"
                value={userForm.name}
                onChange={(e) =>
                  setUserForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userEmail">Email *</Label>
              <Input
                id="userEmail"
                type="email"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="joao@exemplo.com"
                disabled={!!editingUser} // Don't allow email change when editing
              />
              {editingUser && (
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              )}
            </div>

            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="userPassword">Senha *</Label>
                <Input
                  id="userPassword"
                  type="password"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="userRole">Perfil *</Label>
              <Select
                value={userForm.role}
                onValueChange={(value: "ADMIN" | "SUPERVISOR" | "AGENT") =>
                  setUserForm((prev) => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                  <SelectItem value="AGENT">Atendente</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Administradores têm acesso completo. Supervisores gerenciam departamentos. Atendentes atendem clientes.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUserDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={saveUser} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingUser ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
}

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
  });

  useEffect(() => {
    fetchSettings();
  }, []);

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
            <Shield className="w-4 h-4 mr-2" />
            IA
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
          <Card>
            <CardHeader>
              <CardTitle>Configurações de IA</CardTitle>
              <CardDescription>
                Configure o provedor de IA e parâmetros padrão
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

              <div className="space-y-2">
                <Label htmlFor="aiProvider">Provedor</Label>
                <select
                  id="aiProvider"
                  value={aiForm.aiProvider}
                  onChange={(e) =>
                    setAiForm((prev) => ({ ...prev, aiProvider: e.target.value }))
                  }
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="groq">Groq</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aiApiKey">API Key</Label>
                <Input
                  id="aiApiKey"
                  type="password"
                  value={aiForm.aiApiKey}
                  onChange={(e) =>
                    setAiForm((prev) => ({ ...prev, aiApiKey: e.target.value }))
                  }
                  placeholder="sk-..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aiModel">Modelo Padrão</Label>
                <Input
                  id="aiModel"
                  value={aiForm.aiDefaultModel}
                  onChange={(e) =>
                    setAiForm((prev) => ({
                      ...prev,
                      aiDefaultModel: e.target.value,
                    }))
                  }
                  placeholder="gpt-4-turbo-preview"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aiPrompt">Prompt do Sistema (padrão)</Label>
                <Textarea
                  id="aiPrompt"
                  value={aiForm.aiSystemPrompt}
                  onChange={(e) =>
                    setAiForm((prev) => ({
                      ...prev,
                      aiSystemPrompt: e.target.value,
                    }))
                  }
                  placeholder="Você é um assistente virtual..."
                  rows={5}
                />
              </div>

              <Button onClick={saveAiSettings} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

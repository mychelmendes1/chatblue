"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Book,
  HelpCircle,
  Database,
  FileText,
  AlertTriangle,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Tag,
  X,
  Building,
  TrendingUp,
  BarChart3,
  MessageCircle,
  RefreshCw,
  ExternalLink,
  MoreVertical,
  Check,
  Globe,
  Cloud,
  HardDrive,
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
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// ========== Interfaces ==========

interface Department {
  id: string;
  name: string;
  color?: string;
}

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags: string[];
  departmentId?: string;
  department?: Department;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category?: string;
  departmentId?: string;
  department?: Department;
  useCount: number;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface FAQStats {
  total: number;
  totalUsage: number;
}

interface DataSource {
  id: string;
  name: string;
  type: "NOTION" | "GOOGLE_DRIVE" | "CONFLUENCE" | "INTERNAL" | "WEBSITE";
  config: Record<string, any>;
  status: "ACTIVE" | "SYNCING" | "ERROR" | "DISABLED";
  lastSyncAt?: string;
  lastSyncError?: string;
  documentsCount: number;
  createdAt: string;
}

interface AIDocument {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  sourceName: string;
  sourceUrl?: string;
  status: "PENDING" | "INDEXED" | "ERROR" | "DELETED";
  lastIndexedAt?: string;
  createdAt: string;
}

interface KnowledgeGap {
  id: string;
  query: string;
  topic?: string;
  description?: string;
  frequency: number;
  sampleQueries?: string[];
  suggestedContent?: string;
  status: string;
  createdAt: string;
}

// ========== Constants ==========

const SOURCE_TYPES = [
  { id: "NOTION", name: "Notion", icon: Book, color: "bg-gray-800" },
  { id: "GOOGLE_DRIVE", name: "Google Drive", icon: HardDrive, color: "bg-blue-600" },
  { id: "CONFLUENCE", name: "Confluence", icon: Cloud, color: "bg-blue-500" },
  { id: "INTERNAL", name: "Interno", icon: Database, color: "bg-purple-600" },
  { id: "WEBSITE", name: "Website", icon: Globe, color: "bg-green-600" },
];

// ========== Main Page ==========

export default function KnowledgePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("kb");
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  async function fetchDepartments() {
    try {
      const response = await api.get<{ departments: Department[] }>("/departments");
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Book className="w-6 h-6" />
          Conhecimento
        </h1>
        <p className="text-muted-foreground">
          Gerencie artigos, FAQs e fontes de dados que alimentam a IA
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="kb">
            <FileText className="w-4 h-4 mr-2" />
            Base de Conhecimento
          </TabsTrigger>
          <TabsTrigger value="faq">
            <HelpCircle className="w-4 h-4 mr-2" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="sources">
            <Database className="w-4 h-4 mr-2" />
            Fontes Externas
          </TabsTrigger>
          <TabsTrigger value="docs">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Documentos e Lacunas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kb">
          <KBTab departments={departments} toast={toast} />
        </TabsContent>

        <TabsContent value="faq">
          <FAQTab departments={departments} toast={toast} />
        </TabsContent>

        <TabsContent value="sources">
          <SourcesTab toast={toast} />
        </TabsContent>

        <TabsContent value="docs">
          <DocsAndGapsTab toast={toast} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ========== KB Tab ==========

function KBTab({ departments, toast }: { departments: Department[]; toast: any }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [form, setForm] = useState({ title: "", content: "", category: "", tags: "", departmentId: "", isActive: true });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<KnowledgeItem | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterDepartment) params.set("departmentId", filterDepartment);
      if (filterCategory) params.set("category", filterCategory);
      if (search) params.set("search", search);
      const response = await api.get<{ items: KnowledgeItem[]; categories: string[] }>(`/knowledge?${params}`);
      setItems(response.data.items || []);
      setCategories(response.data.categories || []);
    } catch {
      toast({ title: "Erro", description: "Falha ao carregar base de conhecimento", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [filterDepartment, filterCategory, search, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openCreate() {
    setEditingItem(null);
    setForm({ title: "", content: "", category: "", tags: "", departmentId: "", isActive: true });
    setIsDialogOpen(true);
  }

  function openEdit(item: KnowledgeItem) {
    setEditingItem(item);
    setForm({
      title: item.title, content: item.content, category: item.category || "",
      tags: item.tags?.join(", ") || "", departmentId: item.departmentId || "", isActive: item.isActive,
    });
    setIsDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.title || !form.content) {
      toast({ title: "Campos obrigatórios", description: "Preencha título e conteúdo", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        title: form.title, content: form.content, category: form.category || undefined,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        departmentId: form.departmentId || null, isActive: form.isActive,
      };
      if (editingItem) {
        await api.put(`/knowledge/${editingItem.id}`, payload);
        toast({ title: "Artigo atualizado com sucesso" });
      } else {
        await api.post("/knowledge", payload);
        toast({ title: "Artigo criado com sucesso" });
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error?.message || "Falha ao salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!itemToDelete) return;
    try {
      await api.delete(`/knowledge/${itemToDelete.id}`);
      toast({ title: "Artigo excluído" });
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error?.message || "Falha ao excluir", variant: "destructive" });
    }
  }

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Header + Filters */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar artigos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterDepartment || "_all"} onValueChange={(v) => setFilterDepartment(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-[180px]"><Building className="w-4 h-4 mr-2" /><SelectValue placeholder="Departamento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCategory || "_all"} onValueChange={(v) => setFilterCategory(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-[180px]"><Tag className="w-4 h-4 mr-2" /><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {(filterDepartment || filterCategory || search) && (
            <Button variant="ghost" size="icon" onClick={() => { setFilterDepartment(""); setFilterCategory(""); setSearch(""); }}><X className="w-4 h-4" /></Button>
          )}
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Novo Artigo</Button>
      </div>

      {/* Items Grid */}
      {items.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum artigo encontrado</h3>
          <p className="text-muted-foreground mb-4">Comece criando seu primeiro artigo de conhecimento</p>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Criar Artigo</Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className={cn("cursor-pointer hover:border-primary/50 transition-colors", !item.isActive && "opacity-60")} onClick={() => openEdit(item)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-1">{item.title}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(item); }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setItemToDelete(item); setIsDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                {item.category && <Badge variant="secondary" className="w-fit">{item.category}</Badge>}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">{item.content}</p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {item.department && <Badge variant="outline" style={{ borderColor: item.department.color, color: item.department.color }}>{item.department.name}</Badge>}
                  {item.tags?.slice(0, 3).map((tag) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                  {item.tags?.length > 3 && <Badge variant="outline" className="text-xs">+{item.tags.length - 3}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Artigo" : "Novo Artigo"}</DialogTitle>
            <DialogDescription>{editingItem ? "Atualize as informações do artigo" : "Adicione um novo artigo à base de conhecimento"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Como funciona o processo de devolução" /></div>
            <div className="space-y-2">
              <Label>Conteúdo *</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Descreva o conteúdo do artigo em detalhes..." rows={10} />
              <p className="text-xs text-muted-foreground">Use formatação Markdown para estruturar melhor o conteúdo</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex: Políticas" list="kb-cats" />
                <datalist id="kb-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select value={form.departmentId || "_all"} onValueChange={(v) => setForm({ ...form, departmentId: v === "_all" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos os departamentos</SelectItem>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Tags</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="devolução, prazo, reembolso (separadas por vírgula)" /><p className="text-xs text-muted-foreground">Tags ajudam a IA a encontrar conteúdo relevante</p></div>
            <div className="flex items-center justify-between">
              <div><Label>Ativo</Label><p className="text-sm text-muted-foreground">Artigos inativos não são usados pela IA</p></div>
              <Switch checked={form.isActive} onCheckedChange={(c) => setForm({ ...form, isActive: c })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>{isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editingItem ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir o artigo &quot;{itemToDelete?.title}&quot;? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== FAQ Tab ==========

function FAQTab({ departments, toast }: { departments: Department[]; toast: any }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState<FAQItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<FAQStats>({ total: 0, totalUsage: 0 });
  const [search, setSearch] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FAQItem | null>(null);
  const [form, setForm] = useState({ question: "", answer: "", keywords: "", category: "", departmentId: "", isActive: true });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FAQItem | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterDepartment) params.set("departmentId", filterDepartment);
      if (filterCategory) params.set("category", filterCategory);
      if (search) params.set("search", search);
      const response = await api.get<{ items: FAQItem[]; categories: string[]; stats: FAQStats }>(`/faq?${params}`);
      setItems(response.data.items || []);
      setCategories(response.data.categories || []);
      setStats(response.data.stats || { total: 0, totalUsage: 0 });
    } catch {
      toast({ title: "Erro", description: "Falha ao carregar FAQ", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [filterDepartment, filterCategory, search, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openCreate() {
    setEditingItem(null);
    setForm({ question: "", answer: "", keywords: "", category: "", departmentId: "", isActive: true });
    setIsDialogOpen(true);
  }

  function openEdit(item: FAQItem) {
    setEditingItem(item);
    setForm({
      question: item.question, answer: item.answer, keywords: item.keywords?.join(", ") || "",
      category: item.category || "", departmentId: item.departmentId || "", isActive: item.isActive,
    });
    setIsDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.question || !form.answer) {
      toast({ title: "Campos obrigatórios", description: "Preencha pergunta e resposta", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        question: form.question, answer: form.answer,
        keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        category: form.category || undefined, departmentId: form.departmentId || null, isActive: form.isActive,
      };
      if (editingItem) {
        await api.put(`/faq/${editingItem.id}`, payload);
        toast({ title: "FAQ atualizada" });
      } else {
        await api.post("/faq", payload);
        toast({ title: "FAQ criada" });
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error?.message || "Falha ao salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!itemToDelete) return;
    try {
      await api.delete(`/faq/${itemToDelete.id}`);
      toast({ title: "FAQ excluída" });
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error?.message || "Falha ao excluir", variant: "destructive" });
    }
  }

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de FAQs</CardTitle><MessageCircle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Usos</CardTitle><BarChart3 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalUsage}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Média de Uso</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total > 0 ? (stats.totalUsage / stats.total).toFixed(1) : 0}</div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar FAQs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterDepartment || "_all"} onValueChange={(v) => setFilterDepartment(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-[180px]"><Building className="w-4 h-4 mr-2" /><SelectValue placeholder="Departamento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCategory || "_all"} onValueChange={(v) => setFilterCategory(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-[180px]"><Tag className="w-4 h-4 mr-2" /><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {(filterDepartment || filterCategory || search) && (
            <Button variant="ghost" size="icon" onClick={() => { setFilterDepartment(""); setFilterCategory(""); setSearch(""); }}><X className="w-4 h-4" /></Button>
          )}
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Nova FAQ</Button>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma FAQ encontrada</h3>
          <p className="text-muted-foreground mb-4">Comece criando sua primeira pergunta frequente</p>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Criar FAQ</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className={cn("cursor-pointer hover:border-primary/50 transition-colors", !item.isActive && "opacity-60")} onClick={() => openEdit(item)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2"><MessageCircle className="w-4 h-4 text-primary" />{item.question}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      {item.category && <Badge variant="secondary">{item.category}</Badge>}
                      {item.department && <Badge variant="outline" style={{ borderColor: item.department.color, color: item.department.color }}>{item.department.name}</Badge>}
                      <Badge variant="outline" className="text-xs"><TrendingUp className="w-3 h-3 mr-1" />{item.useCount} usos</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(item); }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setItemToDelete(item); setIsDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{item.answer}</p>
                {item.keywords?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {item.keywords.slice(0, 5).map((kw) => <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>)}
                    {item.keywords.length > 5 && <Badge variant="outline" className="text-xs">+{item.keywords.length - 5}</Badge>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar FAQ" : "Nova FAQ"}</DialogTitle>
            <DialogDescription>{editingItem ? "Atualize as informações da FAQ" : "Adicione uma nova pergunta frequente"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Pergunta *</Label><Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Ex: Qual o prazo de entrega?" /></div>
            <div className="space-y-2"><Label>Resposta *</Label><Textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="Escreva a resposta completa..." rows={6} /></div>
            <div className="space-y-2"><Label>Palavras-chave</Label><Input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="entrega, prazo, dias (separadas por vírgula)" /><p className="text-xs text-muted-foreground">Palavras que ajudam a IA a identificar quando usar esta FAQ</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex: Entregas" list="faq-cats" />
                <datalist id="faq-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select value={form.departmentId || "_all"} onValueChange={(v) => setForm({ ...form, departmentId: v === "_all" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos os departamentos</SelectItem>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div><Label>Ativa</Label><p className="text-sm text-muted-foreground">FAQs inativas não são usadas pela IA</p></div>
              <Switch checked={form.isActive} onCheckedChange={(c) => setForm({ ...form, isActive: c })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>{isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editingItem ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle><DialogDescription>Tem certeza que deseja excluir a FAQ &quot;{itemToDelete?.question}&quot;? Esta ação não pode ser desfeita.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={handleDelete}>Excluir</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== Sources Tab ==========

function SourcesTab({ toast }: { toast: any }) {
  const [isLoading, setIsLoading] = useState(true);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", type: "INTERNAL" as DataSource["type"], config: {} as Record<string, any> });

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<DataSource[]>("/ai-assistant/data-sources");
      setDataSources(res.data);
    } catch {
      toast({ title: "Erro", description: "Falha ao carregar fontes de dados", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleAdd() {
    try {
      await api.post("/ai-assistant/data-sources", newForm);
      toast({ title: "Fonte adicionada com sucesso" });
      setShowAddDialog(false);
      setNewForm({ name: "", type: "INTERNAL", config: {} });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error?.response?.data?.error || "Falha ao adicionar fonte", variant: "destructive" });
    }
  }

  async function handleSync(id: string) {
    try {
      await api.post(`/ai-assistant/data-sources/${id}/sync`);
      toast({ title: "Sincronização iniciada" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error?.response?.data?.error || "Falha ao sincronizar", variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta fonte e todos os documentos associados?")) return;
    try {
      await api.delete(`/ai-assistant/data-sources/${id}`);
      toast({ title: "Fonte excluída" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error?.response?.data?.error || "Falha ao excluir", variant: "destructive" });
    }
  }

  const getTypeInfo = (type: string) => SOURCE_TYPES.find((t) => t.id === type) || SOURCE_TYPES[3];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE": return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Ativo</Badge>;
      case "SYNCING": return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Sincronizando</Badge>;
      case "ERROR": return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Erro</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowAddDialog(true)}><Plus className="w-4 h-4 mr-2" />Adicionar Fonte</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dataSources.map((source) => {
          const info = getTypeInfo(source.type);
          const Icon = info.icon;
          return (
            <Card key={source.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", info.color)}><Icon className="w-5 h-5 text-white" /></div>
                    <div><CardTitle className="text-lg">{source.name}</CardTitle><CardDescription>{info.name}</CardDescription></div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleSync(source.id)}>Sincronizar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(source.id)} className="text-red-600">Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Status</span>{getStatusBadge(source.status)}</div>
                  <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Documentos</span><span className="text-sm font-medium">{source.documentsCount}</span></div>
                  {source.lastSyncAt && <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Última sinc.</span><span className="text-sm">{formatDistanceToNow(new Date(source.lastSyncAt), { addSuffix: true, locale: ptBR })}</span></div>}
                  {source.lastSyncError && <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">{source.lastSyncError}</div>}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {dataSources.length === 0 && (
          <Card className="col-span-full"><CardContent className="flex flex-col items-center justify-center py-10">
            <Database className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma fonte de dados</h3>
            <p className="text-muted-foreground text-center mb-4">Adicione fontes para a IA consultar ao responder.</p>
            <Button onClick={() => setShowAddDialog(true)}><Plus className="w-4 h-4 mr-2" />Adicionar Fonte</Button>
          </CardContent></Card>
        )}
      </div>

      {/* Add Source Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Adicionar Fonte de Dados</DialogTitle><DialogDescription>Conecte uma nova fonte de dados para a IA consultar.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} placeholder="Ex: Base Principal" /></div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={newForm.type} onValueChange={(v) => setNewForm({ ...newForm, type: v as DataSource["type"], config: {} })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCE_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {newForm.type === "NOTION" && (<>
              <div className="space-y-2"><Label>API Key</Label><Input type="password" value={newForm.config.apiKey || ""} onChange={(e) => setNewForm({ ...newForm, config: { ...newForm.config, apiKey: e.target.value } })} placeholder="secret_..." /></div>
              <div className="space-y-2"><Label>ID do Database</Label><Input value={newForm.config.databaseId || ""} onChange={(e) => setNewForm({ ...newForm, config: { ...newForm.config, databaseId: e.target.value } })} placeholder="abc123..." /></div>
            </>)}
            {newForm.type === "WEBSITE" && (
              <div className="space-y-2"><Label>URL do Site</Label><Input value={newForm.config.url || ""} onChange={(e) => setNewForm({ ...newForm, config: { ...newForm.config, url: e.target.value } })} placeholder="https://exemplo.com" /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!newForm.name}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== Documents & Gaps Tab ==========

function DocsAndGapsTab({ toast }: { toast: any }) {
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<AIDocument[]>([]);
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [search, setSearch] = useState("");
  const [subTab, setSubTab] = useState("docs");

  const fetchData = useCallback(async () => {
    try {
      const [docsRes, gapsRes] = await Promise.all([
        api.get<{ documents: AIDocument[] }>("/ai-assistant/documents?limit=100"),
        api.get<KnowledgeGap[]>("/ai-assistant/gaps"),
      ]);
      setDocuments(docsRes.data.documents || []);
      setGaps(gapsRes.data || []);
    } catch {
      toast({ title: "Erro", description: "Falha ao carregar dados", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDeleteDoc(id: string) {
    if (!confirm("Excluir este documento?")) return;
    try {
      await api.delete(`/ai-assistant/documents/${id}`);
      toast({ title: "Documento excluído" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error?.response?.data?.error || "Falha ao excluir", variant: "destructive" });
    }
  }

  async function handleResolveGap(id: string, status: string) {
    try {
      await api.put(`/ai-assistant/gaps/${id}`, { status });
      toast({ title: status === "resolved" ? "Lacuna resolvida" : "Lacuna ignorada" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error?.response?.data?.error || "Falha ao atualizar", variant: "destructive" });
    }
  }

  const filteredDocs = documents.filter((d) => !search || d.title.toLowerCase().includes(search.toLowerCase()));
  const openGaps = gaps.filter((g) => g.status === "pending" || g.status === "OPEN");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "INDEXED": return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Indexado</Badge>;
      case "PENDING": return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Pendente</Badge>;
      case "ERROR": return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Erro</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={subTab === "docs" ? "default" : "outline"} onClick={() => setSubTab("docs")} size="sm">
          <FileText className="w-4 h-4 mr-2" />Documentos ({documents.length})
        </Button>
        <Button variant={subTab === "gaps" ? "default" : "outline"} onClick={() => setSubTab("gaps")} size="sm">
          <AlertTriangle className="w-4 h-4 mr-2" />Lacunas ({openGaps.length})
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4 mr-2" />Atualizar</Button>
      </div>

      {subTab === "docs" && (
        <div className="space-y-3">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar documentos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {filteredDocs.map((doc) => (
                <Card key={doc.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1"><h4 className="font-medium truncate">{doc.title}</h4>{getStatusBadge(doc.status)}</div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{doc.content.substring(0, 200)}...</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{doc.sourceName}</span>
                          {doc.lastIndexedAt && <span>Indexado {formatDistanceToNow(new Date(doc.lastIndexedAt), { addSuffix: true, locale: ptBR })}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {doc.sourceUrl && <Button variant="ghost" size="icon" onClick={() => window.open(doc.sourceUrl, "_blank")}><ExternalLink className="w-4 h-4" /></Button>}
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDoc(doc.id)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredDocs.length === 0 && (
                <Card><CardContent className="flex flex-col items-center py-10">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum documento</h3>
                  <p className="text-muted-foreground text-center">Documentos são criados automaticamente ao adicionar artigos ou sincronizar fontes.</p>
                </CardContent></Card>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {subTab === "gaps" && (
        <Card>
          <CardHeader><CardTitle>Lacunas de Conhecimento</CardTitle><CardDescription>Perguntas que a IA não conseguiu responder adequadamente.</CardDescription></CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {openGaps.map((gap) => (
                  <div key={gap.id} className="flex items-start justify-between gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{gap.topic || gap.query}</p>
                      {gap.description && <p className="text-sm text-muted-foreground mt-1">{gap.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>Detectada {gap.frequency}x</span>
                        <span>{formatDistanceToNow(new Date(gap.createdAt), { addSuffix: true, locale: ptBR })}</span>
                      </div>
                      {gap.sampleQueries && gap.sampleQueries.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">{gap.sampleQueries.slice(0, 3).map((q, i) => <Badge key={i} variant="outline" className="text-xs">{q}</Badge>)}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleResolveGap(gap.id, "resolved")}><Check className="w-4 h-4 mr-1" />Resolvido</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleResolveGap(gap.id, "dismissed")}><X className="w-4 h-4 mr-1" />Ignorar</Button>
                    </div>
                  </div>
                ))}
                {openGaps.length === 0 && (
                  <div className="flex flex-col items-center py-10">
                    <Check className="w-12 h-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma lacuna aberta</h3>
                    <p className="text-muted-foreground text-center">A base de conhecimento está atendendo bem as perguntas.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

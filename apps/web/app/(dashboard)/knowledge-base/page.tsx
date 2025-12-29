"use client";

import { useEffect, useState } from "react";
import {
  Book,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  FileText,
  Tag,
  Filter,
  Upload,
  X,
  Building,
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";

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

interface FormState {
  title: string;
  content: string;
  category: string;
  tags: string;
  departmentId: string;
  isActive: boolean;
}

const initialForm: FormState = {
  title: "",
  content: "",
  category: "",
  tags: "",
  departmentId: "",
  isActive: true,
};

export default function KnowledgeBasePage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<KnowledgeItem | null>(null);

  useEffect(() => {
    fetchData();
  }, [filterDepartment, filterCategory, search]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  async function fetchData() {
    try {
      const params = new URLSearchParams();
      if (filterDepartment) params.set("departmentId", filterDepartment);
      if (filterCategory) params.set("category", filterCategory);
      if (search) params.set("search", search);

      const response = await api.get<{ items: KnowledgeItem[]; categories: string[] }>(
        `/knowledge?${params}`
      );
      setItems(response.data.items || []);
      setCategories(response.data.categories || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar base de conhecimento",
        variant: "destructive",
      });
      setItems([]);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchDepartments() {
    try {
      const response = await api.get<{ departments: Department[] }>("/departments");
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
      setDepartments([]);
    }
  }

  function openCreateDialog() {
    setEditingItem(null);
    setForm(initialForm);
    setIsDialogOpen(true);
  }

  function openEditDialog(item: KnowledgeItem) {
    setEditingItem(item);
    setForm({
      title: item.title,
      content: item.content,
      category: item.category || "",
      tags: item.tags?.join(", ") || "",
      departmentId: item.departmentId || "",
      isActive: item.isActive,
    });
    setIsDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.title || !form.content) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha título e conteúdo",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: form.title,
        content: form.content,
        category: form.category || undefined,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        departmentId: form.departmentId || null,
        isActive: form.isActive,
      };

      if (editingItem) {
        await api.put(`/knowledge/${editingItem.id}`, payload);
        toast({ title: "Artigo atualizado" });
      } else {
        await api.post("/knowledge", payload);
        toast({ title: "Artigo criado" });
      }

      setIsDialogOpen(false);
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

  async function handleDelete() {
    if (!itemToDelete) return;

    try {
      await api.delete(`/knowledge/${itemToDelete.id}`);
      toast({ title: "Artigo excluído" });
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Falha ao excluir",
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Book className="w-6 h-6" />
            Base de Conhecimento
          </h1>
          <p className="text-muted-foreground">
            Gerencie os artigos de conhecimento para treinar a IA
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Artigo
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar artigos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filterDepartment || "_all"} onValueChange={(v) => setFilterDepartment(v === "_all" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
                <Building className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCategory || "_all"} onValueChange={(v) => setFilterCategory(v === "_all" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
                <Tag className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todas</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(filterDepartment || filterCategory || search) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFilterDepartment("");
                  setFilterCategory("");
                  setSearch("");
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum artigo encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Comece criando seu primeiro artigo de conhecimento
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Artigo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className={`cursor-pointer hover:border-primary/50 transition-colors ${
                !item.isActive ? "opacity-60" : ""
              }`}
              onClick={() => openEditDialog(item)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-1">{item.title}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(item);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToDelete(item);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {item.category && (
                  <Badge variant="secondary" className="w-fit">
                    {item.category}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {item.content}
                </p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {item.department && (
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: item.department.color || undefined,
                        color: item.department.color || undefined,
                      }}
                    >
                      {item.department.name}
                    </Badge>
                  )}
                  {item.tags?.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {item.tags?.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{item.tags.length - 3}
                    </Badge>
                  )}
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
            <DialogTitle>
              {editingItem ? "Editar Artigo" : "Novo Artigo"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Atualize as informações do artigo"
                : "Adicione um novo artigo à base de conhecimento"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Como funciona o processo de devolução"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo *</Label>
              <Textarea
                id="content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Descreva o conteúdo do artigo em detalhes..."
                rows={10}
              />
              <p className="text-xs text-muted-foreground">
                Use formatação Markdown para estruturar melhor o conteúdo
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Ex: Políticas"
                  list="categories"
                />
                <datalist id="categories">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Select
                  value={form.departmentId || "_all"}
                  onValueChange={(value) => setForm({ ...form, departmentId: value === "_all" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os departamentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos os departamentos</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="devolução, prazo, reembolso (separadas por vírgula)"
              />
              <p className="text-xs text-muted-foreground">
                Tags ajudam a IA a encontrar conteúdo relevante
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Artigos inativos não são usados pela IA
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingItem ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o artigo &quot;{itemToDelete?.title}&quot;?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


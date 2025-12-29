"use client";

import { useEffect, useState } from "react";
import {
  HelpCircle,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  MessageCircle,
  Tag,
  X,
  Building,
  TrendingUp,
  BarChart3,
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

interface FormState {
  question: string;
  answer: string;
  keywords: string;
  category: string;
  departmentId: string;
  isActive: boolean;
}

const initialForm: FormState = {
  question: "",
  answer: "",
  keywords: "",
  category: "",
  departmentId: "",
  isActive: true,
};

export default function FAQPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState<FAQItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<FAQStats>({ total: 0, totalUsage: 0 });
  const [search, setSearch] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FAQItem | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FAQItem | null>(null);

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

      const response = await api.get<{
        items: FAQItem[];
        categories: string[];
        stats: FAQStats;
      }>(`/faq?${params}`);
      setItems(response.data.items || []);
      setCategories(response.data.categories || []);
      setStats(response.data.stats || { total: 0, totalUsage: 0 });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar FAQ",
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

  function openEditDialog(item: FAQItem) {
    setEditingItem(item);
    setForm({
      question: item.question,
      answer: item.answer,
      keywords: item.keywords?.join(", ") || "",
      category: item.category || "",
      departmentId: item.departmentId || "",
      isActive: item.isActive,
    });
    setIsDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.question || !form.answer) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha pergunta e resposta",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        question: form.question,
        answer: form.answer,
        keywords: form.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        category: form.category || undefined,
        departmentId: form.departmentId || null,
        isActive: form.isActive,
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
      await api.delete(`/faq/${itemToDelete.id}`);
      toast({ title: "FAQ excluída" });
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
            <HelpCircle className="w-6 h-6" />
            Perguntas Frequentes (FAQ)
          </h1>
          <p className="text-muted-foreground">
            Gerencie as perguntas frequentes para treinar a IA
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Nova FAQ
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de FAQs</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsage}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média de Uso</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? (stats.totalUsage / stats.total).toFixed(1) : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar FAQs..."
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

      {/* Items List */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma FAQ encontrada</h3>
            <p className="text-muted-foreground mb-4">
              Comece criando sua primeira pergunta frequente
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Criar FAQ
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
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
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-primary" />
                      {item.question}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      {item.category && (
                        <Badge variant="secondary">{item.category}</Badge>
                      )}
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
                      <Badge variant="outline" className="text-xs">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {item.useCount} usos
                      </Badge>
                    </div>
                  </div>
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
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.answer}
                </p>
                {item.keywords && item.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {item.keywords.slice(0, 5).map((keyword) => (
                      <Badge key={keyword} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {item.keywords.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{item.keywords.length - 5}
                      </Badge>
                    )}
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
            <DialogDescription>
              {editingItem
                ? "Atualize as informações da FAQ"
                : "Adicione uma nova pergunta frequente"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question">Pergunta *</Label>
              <Input
                id="question"
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="Ex: Qual o prazo de entrega?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="answer">Resposta *</Label>
              <Textarea
                id="answer"
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                placeholder="Escreva a resposta completa para esta pergunta..."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Palavras-chave</Label>
              <Input
                id="keywords"
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                placeholder="entrega, prazo, dias (separadas por vírgula)"
              />
              <p className="text-xs text-muted-foreground">
                Palavras que ajudam a IA a identificar quando usar esta FAQ
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Ex: Entregas"
                  list="faq-categories"
                />
                <datalist id="faq-categories">
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

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ativa</Label>
                <p className="text-sm text-muted-foreground">
                  FAQs inativas não são usadas pela IA
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
              Tem certeza que deseja excluir a FAQ &quot;{itemToDelete?.question}&quot;?
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


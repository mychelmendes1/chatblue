"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Image as ImageIcon,
  Link2,
  Loader2,
  Plus,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  DepartmentOption,
  InstagramAutomation,
  InstagramAutomationInput,
  InstagramMedia,
  InstagramMediaPage,
  MatchMode,
  MEDIA_TYPE_OPTIONS,
  TestMatchResult,
} from "./types";

const PRIVATE_MESSAGE_MAX = 900;
const BUTTON_TITLE_MAX = 20;
const NO_DEPARTMENT = "__none__";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  automation: InstagramAutomation | null;
  departments: DepartmentOption[];
  onSaved: () => void;
}

function emptyForm(connectionId: string): InstagramAutomationInput {
  return {
    connectionId,
    name: "",
    isActive: true,
    mediaIds: [],
    mediaTypes: [],
    keywords: [],
    matchMode: "contains",
    excludeReplies: true,
    publicReplies: [""],
    privateMessage: { text: "", linkUrl: "", buttonTitle: "" },
    departmentId: null,
    aiEnabled: true,
    oncePerUser: true,
    dailyLimit: null,
  };
}

function fromAutomation(a: InstagramAutomation, connectionId: string): InstagramAutomationInput {
  return {
    connectionId: a.connection?.id || connectionId,
    name: a.name,
    isActive: a.isActive,
    mediaIds: a.mediaIds || [],
    mediaTypes: a.mediaTypes || [],
    keywords: a.keywords || [],
    matchMode: a.matchMode || "contains",
    excludeReplies: a.excludeReplies ?? true,
    publicReplies: a.publicReplies?.length ? a.publicReplies : [""],
    privateMessage: {
      text: a.privateMessage?.text || "",
      linkUrl: a.privateMessage?.linkUrl || "",
      buttonTitle: a.privateMessage?.buttonTitle || "",
      ...(a.privateMessage?.imageUrl ? { imageUrl: a.privateMessage.imageUrl } : {}),
    },
    departmentId: a.departmentId ?? null,
    aiEnabled: a.aiEnabled ?? true,
    oncePerUser: a.oncePerUser ?? true,
    dailyLimit: a.dailyLimit ?? null,
  };
}

function mediaTypeLabel(m: InstagramMedia): string {
  if (m.mediaProductType === "REELS") return "Reels";
  if (m.mediaProductType === "AD") return "Anúncio";
  if (m.mediaType === "VIDEO") return "Vídeo";
  if (m.mediaType === "CAROUSEL_ALBUM") return "Carrossel";
  return "Post";
}

export function AutomationEditor({ open, onOpenChange, connectionId, automation, departments, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<InstagramAutomationInput>(() => emptyForm(connectionId));
  const [targetAll, setTargetAll] = useState(true);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Media picker
  const [media, setMedia] = useState<InstagramMedia[]>([]);
  const [mediaAfter, setMediaAfter] = useState<string | null>(null);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  // Test
  const [testText, setTestText] = useState("");
  const [testIsReply, setTestIsReply] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestMatchResult | null>(null);

  useEffect(() => {
    if (!open) return;
    const initial = automation ? fromAutomation(automation, connectionId) : emptyForm(connectionId);
    setForm(initial);
    setTargetAll(initial.mediaIds.length === 0);
    setKeywordDraft("");
    setTestText("");
    setTestResult(null);
    setMedia([]);
    setMediaAfter(null);
    setMediaLoaded(false);
  }, [open, automation, connectionId]);

  useEffect(() => {
    if (open && !targetAll && !mediaLoaded && !isLoadingMedia) {
      loadMedia(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, targetAll, mediaLoaded]);

  async function loadMedia(after: string | null) {
    setIsLoadingMedia(true);
    try {
      const qs = new URLSearchParams({ connectionId: form.connectionId || connectionId });
      if (after) qs.set("after", after);
      const { data } = await api.get<InstagramMediaPage>(`/instagram/media?${qs.toString()}`);
      setMedia((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...(data.items || []).filter((m) => !seen.has(m.id))];
      });
      setMediaAfter(data.paging?.after || null);
      setMediaLoaded(true);
    } catch (error: any) {
      setMediaLoaded(true);
      toast({ title: "Erro ao carregar posts", description: error?.message, variant: "destructive" });
    } finally {
      setIsLoadingMedia(false);
    }
  }

  function update<K extends keyof InstagramAutomationInput>(key: K, value: InstagramAutomationInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updatePrivate(key: "text" | "linkUrl" | "buttonTitle", value: string) {
    setForm((f) => ({ ...f, privateMessage: { ...f.privateMessage, [key]: value } }));
  }

  function toggleMedia(id: string) {
    setForm((f) => ({
      ...f,
      mediaIds: f.mediaIds.includes(id) ? f.mediaIds.filter((m) => m !== id) : [...f.mediaIds, id],
    }));
  }

  function toggleMediaType(value: string, checked: boolean) {
    setForm((f) => ({
      ...f,
      mediaTypes: checked ? Array.from(new Set([...f.mediaTypes, value])) : f.mediaTypes.filter((t) => t !== value),
    }));
  }

  function addKeyword() {
    const parts = keywordDraft
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setForm((f) => ({ ...f, keywords: Array.from(new Set([...f.keywords, ...parts])) }));
    setKeywordDraft("");
  }

  function validate(): string | null {
    if (!form.name.trim()) return "Informe o nome da automação.";
    if (!targetAll && form.mediaIds.length === 0) return "Selecione ao menos um post ou escolha \"Todos os posts e reels\".";
    if (!form.privateMessage.text.trim()) return "A mensagem privada é obrigatória.";
    if (form.privateMessage.text.length > PRIVATE_MESSAGE_MAX)
      return `A mensagem privada deve ter no máximo ${PRIVATE_MESSAGE_MAX} caracteres.`;
    const link = form.privateMessage.linkUrl?.trim();
    if (link && !/^https?:\/\/\S+$/i.test(link)) return "O link deve começar com http:// ou https://.";
    if ((form.privateMessage.buttonTitle || "").length > BUTTON_TITLE_MAX)
      return `O título do botão deve ter no máximo ${BUTTON_TITLE_MAX} caracteres.`;
    if (form.matchMode === "regex") {
      for (const k of form.keywords) {
        try {
          new RegExp(k);
        } catch {
          return `Expressão regular inválida: ${k}`;
        }
      }
    }
    if (form.dailyLimit !== null && (!Number.isInteger(form.dailyLimit) || form.dailyLimit < 1))
      return "O limite diário deve ser um número inteiro maior que zero.";
    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) {
      toast({ title: "Verifique os campos", description: err, variant: "destructive" });
      return;
    }
    const pm = form.privateMessage;
    const payload: InstagramAutomationInput = {
      ...form,
      name: form.name.trim(),
      mediaIds: targetAll ? [] : form.mediaIds,
      publicReplies: form.publicReplies.map((r) => r.trim()).filter(Boolean),
      privateMessage: {
        text: pm.text.trim(),
        linkUrl: pm.linkUrl?.trim() || "",
        ...(pm.buttonTitle?.trim() ? { buttonTitle: pm.buttonTitle.trim() } : {}),
        ...(pm.imageUrl ? { imageUrl: pm.imageUrl } : {}),
      },
    };
    setIsSaving(true);
    try {
      if (automation) {
        await api.put(`/instagram/automations/${automation.id}`, payload);
        toast({ title: "Automação atualizada" });
      } else {
        await api.post(`/instagram/automations`, payload);
        toast({ title: "Automação criada" });
      }
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro ao salvar automação", description: error?.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTest() {
    if (!automation || !testText.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const { data } = await api.post<TestMatchResult>(`/instagram/automations/test-match`, {
        automationId: automation.id,
        text: testText,
        isReply: testIsReply,
      });
      setTestResult(data);
    } catch (error: any) {
      toast({ title: "Erro ao testar", description: error?.message, variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  }

  const pmText = form.privateMessage.text;
  const pmLink = form.privateMessage.linkUrl?.trim();
  const pmButton = form.privateMessage.buttonTitle?.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{automation ? "Editar automação" : "Nova automação de comentários"}</DialogTitle>
          <DialogDescription>
            Quando alguém comentar em um post ou reel, o ChatBlue responde em público e envia uma mensagem no Direct.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="ig-auto-name">Nome</Label>
            <Input
              id="ig-auto-name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Ex: Comentou EU QUERO → envia link do e-book"
            />
          </div>

          {/* Alvo */}
          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Onde a automação vale</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { all: true, title: "Todos os posts e reels", desc: "Inclusive os publicados depois" },
                { all: false, title: "Posts específicos", desc: "Escolha os posts na lista" },
              ].map((opt) => (
                <button
                  type="button"
                  key={String(opt.all)}
                  onClick={() => setTargetAll(opt.all)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    targetAll === opt.all ? "border-pink-500 bg-pink-50 dark:bg-pink-950/20" : "hover:bg-muted/50"
                  )}
                >
                  <div className="text-sm font-medium">{opt.title}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </button>
              ))}
            </div>

            {!targetAll && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{form.mediaIds.length} selecionado(s)</span>
                  {form.mediaIds.length > 0 && (
                    <button type="button" className="hover:text-foreground" onClick={() => update("mediaIds", [])}>
                      Limpar seleção
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-80 overflow-y-auto rounded-md border p-2">
                  {media.map((m) => {
                    const selected = form.mediaIds.includes(m.id);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggleMedia(m.id)}
                        className={cn(
                          "relative rounded-md overflow-hidden border-2 text-left bg-muted",
                          selected ? "border-pink-500" : "border-transparent hover:border-muted-foreground/30"
                        )}
                        title={m.caption || ""}
                      >
                        <div className="aspect-square w-full bg-muted flex items-center justify-center">
                          {m.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <span className="absolute top-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
                          {mediaTypeLabel(m)}
                        </span>
                        {selected && (
                          <CheckCircle2 className="absolute top-1 right-1 w-5 h-5 text-pink-500 bg-white rounded-full" />
                        )}
                        <p className="px-1 py-0.5 text-[10px] leading-tight line-clamp-2 bg-background">
                          {m.caption || <span className="text-muted-foreground">Sem legenda</span>}
                        </p>
                      </button>
                    );
                  })}
                  {isLoadingMedia && (
                    <div className="col-span-full flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!isLoadingMedia && mediaLoaded && media.length === 0 && (
                    <p className="col-span-full text-center text-xs text-muted-foreground py-4">
                      Nenhum post encontrado nesta conta.
                    </p>
                  )}
                </div>
                {form.mediaIds.some((id) => !media.find((m) => m.id === id)) && (
                  <p className="text-xs text-muted-foreground">
                    Alguns posts selecionados não estão na lista carregada (podem ser mais antigos).
                  </p>
                )}
                {mediaAfter && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isLoadingMedia}
                    onClick={() => loadMedia(mediaAfter)}
                  >
                    Carregar mais
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tipos de mídia (vazio = todos)</Label>
              <div className="flex flex-wrap gap-4">
                {MEDIA_TYPE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.mediaTypes.includes(opt.value)}
                      onCheckedChange={(c) => toggleMediaType(opt.value, c === true)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Gatilho */}
          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Gatilho</h4>
            <div className="space-y-2">
              <Label>Palavras-chave</Label>
              <div className="flex flex-wrap gap-1.5 rounded-md border p-2 min-h-[42px]">
                {form.keywords.map((k) => (
                  <Badge key={k} variant="secondary" className="gap-1 pr-1">
                    {k}
                    <button
                      type="button"
                      className="rounded-full hover:bg-muted-foreground/20"
                      onClick={() => update("keywords", form.keywords.filter((x) => x !== k))}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  className="flex-1 min-w-[140px] bg-transparent text-sm outline-none"
                  value={keywordDraft}
                  placeholder={form.keywords.length ? "" : "Digite e pressione Enter"}
                  onChange={(e) => setKeywordDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addKeyword();
                    } else if (e.key === "Backspace" && !keywordDraft && form.keywords.length) {
                      update("keywords", form.keywords.slice(0, -1));
                    }
                  }}
                  onBlur={addKeyword}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Sem palavras-chave, qualquer comentário dispara a automação. Acentos e maiúsculas são ignorados.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Modo de comparação</Label>
                <Select value={form.matchMode} onValueChange={(v) => update("matchMode", v as MatchMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contém a palavra</SelectItem>
                    <SelectItem value="exact">Comentário exato</SelectItem>
                    <SelectItem value="regex">Expressão regular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <Label>Ignorar respostas a comentários</Label>
                  <p className="text-xs text-muted-foreground">Só dispara em comentários principais</p>
                </div>
                <Switch checked={form.excludeReplies} onCheckedChange={(v) => update("excludeReplies", v)} />
              </div>
            </div>
          </section>

          {/* Respostas públicas */}
          <section className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold">Respostas públicas no comentário</h4>
              <p className="text-xs text-muted-foreground">
                Uma das variações é sorteada a cada comentário (evita respostas idênticas). Use{" "}
                <code className="px-1 rounded bg-muted">{"{{nome}}"}</code> para o nome da pessoa. Deixe vazio para não
                responder em público.
              </p>
            </div>
            {form.publicReplies.map((reply, idx) => (
              <div key={idx} className="flex gap-2">
                <Textarea
                  rows={2}
                  value={reply}
                  placeholder={idx === 0 ? "Ex: Oi {{nome}}! Te mandei no Direct 📩" : "Outra variação"}
                  onChange={(e) =>
                    update(
                      "publicReplies",
                      form.publicReplies.map((r, i) => (i === idx ? e.target.value : r))
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                  disabled={form.publicReplies.length === 1 && !reply}
                  onClick={() =>
                    update(
                      "publicReplies",
                      form.publicReplies.length === 1 ? [""] : form.publicReplies.filter((_, i) => i !== idx)
                    )
                  }
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => update("publicReplies", [...form.publicReplies, ""])}
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar variação
            </Button>
          </section>

          {/* Mensagem privada */}
          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Mensagem privada (Direct)</h4>
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/20 dark:text-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                O Instagram permite 1 mensagem por comentário e só continua a conversa quando a pessoa responder.
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_260px]">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Textarea
                    rows={5}
                    maxLength={PRIVATE_MESSAGE_MAX}
                    value={pmText}
                    placeholder="Ex: Oi! Aqui está o link do material que você pediu 👇"
                    onChange={(e) => updatePrivate("text", e.target.value)}
                  />
                  <div
                    className={cn(
                      "text-right text-xs",
                      pmText.length > PRIVATE_MESSAGE_MAX - 50 ? "text-amber-600" : "text-muted-foreground"
                    )}
                  >
                    {pmText.length}/{PRIVATE_MESSAGE_MAX}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ig-auto-link">Link (opcional)</Label>
                  <Input
                    id="ig-auto-link"
                    type="url"
                    value={form.privateMessage.linkUrl || ""}
                    placeholder="https://..."
                    onChange={(e) => updatePrivate("linkUrl", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ig-auto-btn">Título do botão (opcional)</Label>
                  <Input
                    id="ig-auto-btn"
                    maxLength={BUTTON_TITLE_MAX}
                    value={form.privateMessage.buttonTitle || ""}
                    placeholder="Ex: Baixar agora"
                    onChange={(e) => updatePrivate("buttonTitle", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Máx. {BUTTON_TITLE_MAX} caracteres. Se o botão não for suportado, o link vai no texto.
                  </p>
                </div>
              </div>

              {/* Preview DM */}
              <div className="rounded-xl border bg-background p-3 space-y-2">
                <div className="text-[11px] font-medium text-muted-foreground text-center">Prévia no Direct</div>
                <div className="flex justify-start">
                  <div className="max-w-[230px] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm whitespace-pre-wrap break-words">
                    {pmText || <span className="text-muted-foreground italic">Sua mensagem aparece aqui</span>}
                    {pmLink && !pmButton && <div className="mt-1 text-blue-600 underline break-all">{pmLink}</div>}
                  </div>
                </div>
                {pmLink && pmButton && (
                  <div className="max-w-[230px] rounded-xl border overflow-hidden text-sm">
                    <div className="flex items-center gap-1 px-3 py-2 text-xs text-muted-foreground break-all">
                      <Link2 className="w-3 h-3 flex-shrink-0" />
                      {pmLink.replace(/^https?:\/\//, "").split("/")[0]}
                    </div>
                    <div className="border-t px-3 py-2 text-center font-medium text-blue-600">{pmButton}</div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Depois que a pessoa responder */}
          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Quando a pessoa responder</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select
                  value={form.departmentId || NO_DEPARTMENT}
                  onValueChange={(v) => update("departmentId", v === NO_DEPARTMENT ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Padrão da conexão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_DEPARTMENT}>Padrão da conexão</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <Label>IA assume quando a pessoa responder</Label>
                <Switch checked={form.aiEnabled} onCheckedChange={(v) => update("aiEnabled", v)} />
              </div>
            </div>
          </section>

          {/* Limites */}
          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Limites</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <Label>1 vez por pessoa</Label>
                  <p className="text-xs text-muted-foreground">Não envia de novo para quem já recebeu</p>
                </div>
                <Switch checked={form.oncePerUser} onCheckedChange={(v) => update("oncePerUser", v)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ig-auto-limit">Limite diário de DMs (opcional)</Label>
                <Input
                  id="ig-auto-limit"
                  type="number"
                  min={1}
                  step={1}
                  value={form.dailyLimit ?? ""}
                  placeholder="Sem limite"
                  onChange={(e) => {
                    const v = e.target.value;
                    update("dailyLimit", v === "" ? null : Math.floor(Number(v)));
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3">
              <Label>Automação ativa</Label>
              <Switch checked={form.isActive} onCheckedChange={(v) => update("isActive", v)} />
            </div>
          </section>

          {/* Testar */}
          {automation && (
            <section className="space-y-3 rounded-lg border border-dashed p-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <FlaskConical className="w-4 h-4" />
                Testar
              </h4>
              <p className="text-xs text-muted-foreground">
                Digite um comentário de exemplo para ver se a automação (versão salva) seria disparada.
              </p>
              <Textarea
                rows={2}
                value={testText}
                placeholder="Ex: eu quero o link!"
                onChange={(e) => setTestText(e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={testIsReply} onCheckedChange={(c) => setTestIsReply(c === true)} />
                  É resposta a outro comentário
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isTesting || !testText.trim()}
                  onClick={handleTest}
                >
                  {isTesting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  Testar
                </Button>
              </div>
              {testResult && (
                <div
                  className={cn(
                    "flex items-start gap-2 rounded-md p-2 text-sm",
                    testResult.matched
                      ? "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300"
                      : "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300"
                  )}
                >
                  {testResult.matched ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <div className="font-medium">{testResult.matched ? "Casou!" : "Não casou"}</div>
                    {testResult.keyword && <div className="text-xs">Palavra-chave: {testResult.keyword}</div>}
                    {testResult.reason && <div className="text-xs">{testResult.reason}</div>}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


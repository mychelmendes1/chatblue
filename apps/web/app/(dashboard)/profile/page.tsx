"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Lock,
  Loader2,
  Check,
  Eye,
  EyeOff,
  BarChart3,
  Camera,
  Link2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/stores/auth.store";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { normalizeMediaUrl } from "@/utils/media-url.util";

// ============================================================================
// Schemas & helpers
// ============================================================================
const profileSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Senha atual é obrigatória"),
    newPassword: z.string().min(6, "Nova senha deve ter no mínimo 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ACCEPT_AVATAR = "image/jpeg,image/png,image/gif,image/webp";

function formatDurationSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`;
}

interface MetricsSummary {
  totalTickets: number;
  resolvedTickets: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  slaBreached: number;
  avgRating: number | null;
  totalRatings: number;
}

interface UserMetricsResponse {
  summary: MetricsSummary;
}

// ============================================================================
// Page
// ============================================================================
export default function ProfilePage() {
  const { user, checkAuth } = useAuthStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingAvatarUrl, setIsSavingAvatarUrl] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);

  const [statsPeriod, setStatsPeriod] = useState<7 | 30 | 90>(30);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Profile form
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfileForm,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || "" },
  });

  useEffect(() => {
    resetProfileForm({ name: user?.name || "" });
  }, [user?.name, user?.id, resetProfileForm]);

  useEffect(() => {
    setAvatarUrlInput(user?.avatar?.trim() && !user.avatar.startsWith("/uploads/") ? user.avatar : "");
  }, [user?.avatar]);

  // Password form
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const fetchMyMetrics = useCallback(async () => {
    if (!user?.id || user.isAI) return;
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const res = await api.get<UserMetricsResponse>(`/metrics/users/${user.id}?period=${statsPeriod}`);
      setMetrics(res.data.summary);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Não foi possível carregar as estatísticas";
      setMetricsError(msg);
      setMetrics(null);
    } finally {
      setMetricsLoading(false);
    }
  }, [user?.id, user?.isAI, statsPeriod]);

  useEffect(() => {
    fetchMyMetrics();
  }, [fetchMyMetrics]);

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avatarSrc = normalizeMediaUrl(user?.avatar);

  const onProfileSubmit = async (data: ProfileForm) => {
    setIsUpdatingProfile(true);
    try {
      await api.put("/auth/profile", { name: data.name });
      await checkAuth();
      toast({ title: "Perfil atualizado", description: "Seu nome foi atualizado com sucesso." });
    } catch (error: unknown) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    setIsChangingPassword(true);
    try {
      await api.put("/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      resetPasswordForm();
      toast({ title: "Senha alterada", description: "Sua senha foi alterada com sucesso." });
    } catch (error: unknown) {
      toast({
        title: "Erro ao alterar senha",
        description: error instanceof Error ? error.message : "Verifique a senha atual e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      toast({
        title: "Arquivo grande demais",
        description: "Use uma imagem de até 5 MB.",
        variant: "destructive",
      });
      return;
    }
    if (!ACCEPT_AVATAR.split(",").includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Use JPEG, PNG, GIF ou WebP.",
        variant: "destructive",
      });
      return;
    }
    setIsUploadingAvatar(true);
    try {
      await api.uploadAvatar(file);
      await checkAuth();
      toast({ title: "Foto atualizada", description: "Sua foto de perfil foi enviada." });
    } catch (error: unknown) {
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveAvatarUrl = async () => {
    const url = avatarUrlInput.trim();
    if (!url) {
      toast({ title: "URL vazia", description: "Informe uma URL válida.", variant: "destructive" });
      return;
    }
    setIsSavingAvatarUrl(true);
    try {
      await api.put("/auth/profile", { avatar: url });
      await checkAuth();
      toast({ title: "Foto atualizada", description: "URL da imagem salva no perfil." });
    } catch (error: unknown) {
      toast({
        title: "Erro ao salvar URL",
        description: error instanceof Error ? error.message : "Verifique se a URL é válida (https://...).",
        variant: "destructive",
      });
    } finally {
      setIsSavingAvatarUrl(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsRemovingAvatar(true);
    try {
      await api.put("/auth/profile", { avatar: "" });
      setAvatarUrlInput("");
      await checkAuth();
      toast({ title: "Foto removida", description: "Sua foto de perfil foi removida." });
    } catch (error: unknown) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-sm text-gray-500">Gerencie suas informações pessoais e segurança</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Informações Pessoais
          </CardTitle>
          <CardDescription>Atualize seu nome e foto de perfil</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
            <Avatar className="w-20 h-20 shrink-0">
              <AvatarImage src={avatarSrc} />
              <AvatarFallback className="bg-chatblue text-white text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <p className="font-medium text-gray-900">{user?.name}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role?.toLowerCase()}</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_AVATAR}
                className="hidden"
                onChange={handleAvatarFileChange}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="mr-2 h-4 w-4" />
                  )}
                  Enviar foto
                </Button>
                {user?.avatar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    disabled={isRemovingAvatar}
                    onClick={handleRemoveAvatar}
                  >
                    {isRemovingAvatar ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Remover foto
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">JPEG, PNG, GIF ou WebP — máx. 5 MB</p>
              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="avatar-url" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Link2 className="h-3.5 w-3.5" />
                  Ou use URL da imagem (ex.: Gravatar)
                </Label>
                <div className="flex gap-2 flex-col sm:flex-row">
                  <Input
                    id="avatar-url"
                    type="url"
                    placeholder="https://..."
                    value={avatarUrlInput}
                    onChange={(e) => setAvatarUrlInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    disabled={isSavingAvatarUrl}
                    onClick={handleSaveAvatarUrl}
                  >
                    {isSavingAvatarUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar URL"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" placeholder="Seu nome completo" {...registerProfile("name")} />
              {profileErrors.name && (
                <p className="text-sm text-destructive">{profileErrors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-display">Email</Label>
              <Input id="email-display" value={user?.email || ""} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-400">O email não pode ser alterado</p>
            </div>

            <Button type="submit" disabled={isUpdatingProfile}>
              {isUpdatingProfile ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Salvar nome
            </Button>
          </form>
        </CardContent>
      </Card>

      {!user?.isAI && user?.id && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Minhas estatísticas
              </CardTitle>
              <CardDescription>Tickets atribuídos a você no período</CardDescription>
            </div>
            <Tabs
              value={String(statsPeriod)}
              onValueChange={(v) => setStatsPeriod(Number(v) as 7 | 30 | 90)}
            >
              <TabsList className="h-8">
                <TabsTrigger value="7" className="text-xs px-2">
                  7 dias
                </TabsTrigger>
                <TabsTrigger value="30" className="text-xs px-2">
                  30 dias
                </TabsTrigger>
                <TabsTrigger value="90" className="text-xs px-2">
                  90 dias
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {metricsLoading && (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
            {!metricsLoading && metricsError && (
              <p className="text-sm text-destructive text-center py-6">{metricsError}</p>
            )}
            {!metricsLoading && !metricsError && metrics && metrics.totalTickets === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum ticket atribuído a você neste período.
              </p>
            )}
            {!metricsLoading && !metricsError && metrics && metrics.totalTickets > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">No período</p>
                  <p className="text-2xl font-semibold">{metrics.totalTickets}</p>
                  <p className="text-xs text-muted-foreground">tickets</p>
                </div>
                <div className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">Resolvidos</p>
                  <p className="text-2xl font-semibold">{metrics.resolvedTickets}</p>
                </div>
                <div className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">SLA violado</p>
                  <p className="text-2xl font-semibold">{metrics.slaBreached}</p>
                </div>
                <div className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">Tempo médio resposta</p>
                  <p className="text-lg font-semibold">{formatDurationSeconds(metrics.avgResponseTime)}</p>
                </div>
                <div className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">Tempo médio resolução</p>
                  <p className="text-lg font-semibold">{formatDurationSeconds(metrics.avgResolutionTime)}</p>
                </div>
                <div className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">Nota média (CSAT)</p>
                  <p className="text-2xl font-semibold">
                    {metrics.avgRating != null ? metrics.avgRating.toFixed(1) : "—"}
                  </p>
                  {metrics.totalRatings > 0 && (
                    <p className="text-xs text-muted-foreground">{metrics.totalRatings} avaliações</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {user?.isAI && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Minhas estatísticas
            </CardTitle>
            <CardDescription>Estatísticas de atendimento não se aplicam a contas de IA.</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Alterar Senha
          </CardTitle>
          <CardDescription>Atualize sua senha de acesso ao sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Digite sua senha atual"
                  {...registerPassword("currentPassword")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <p className="text-sm text-destructive">{passwordErrors.currentPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  {...registerPassword("newPassword")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordErrors.newPassword && (
                <p className="text-sm text-destructive">{passwordErrors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a nova senha"
                {...registerPassword("confirmPassword")}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-sm text-destructive">{passwordErrors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isChangingPassword} variant="outline">
              {isChangingPassword ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              Alterar Senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Star,
  Trophy,
  Medal,
  Target,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Download,
  Settings,
  Bell,
  RefreshCcw,
  FileText,
  PieChart,
  Activity,
  Zap,
  UserCheck,
  PhoneOff,
  RotateCcw,
} from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { cn, formatSLATime } from "@/lib/utils";

// ============================================
// INTERFACES
// ============================================

interface DashboardMetrics {
  summary: {
    totalTickets: number;
    pendingTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    slaBreached: number;
    aiHandled: number;
    slaCompliance: number;
    avgResponseTime: number;
    avgResolutionTime: number;
  };
  ticketsPerDay: { date: string; count: number }[];
}

interface NPSData {
  summary: {
    nps: number;
    promoters: number;
    passives: number;
    detractors: number;
    total: number;
  };
  byDepartment: {
    id: string;
    name: string;
    color: string;
    nps: number;
    total: number;
  }[];
  trend: { date: string; nps: number; responses: number }[];
  recentComments: {
    score: number;
    comment: string;
    date: string;
    category: string;
  }[];
}

interface ComparisonData {
  currentMonth: string;
  previousMonth: string;
  metrics: {
    [key: string]: {
      current: number;
      previous: number;
      value: number;
      percentage: number;
      trend: 'up' | 'down' | 'stable';
      isPositiveGood: boolean | null;
    };
  };
}

interface QualityData {
  summary: {
    totalTickets: number;
    resolvedTickets: number;
    fcrCount: number;
    fcrRate: number;
    reopenedCount: number;
    reopenRate: number;
    totalReopens: number;
    abandonedCount: number;
    abandonRate: number;
    avgWaitingTime: number;
  };
  byDepartment: {
    id: string;
    name: string;
    color: string;
    totalTickets: number;
    fcrRate: number;
    reopenRate: number;
    abandonRate: number;
  }[];
}

interface AIMetrics {
  summary: {
    totalTickets: number;
    aiHandled: number;
    aiHandledRate: number;
    aiResolved: number;
    aiResolutionRate: number;
    handoffToHuman: number;
    handoffRate: number;
    estimatedSavings: number;
  };
  comparison: {
    ai: { avgRating: number; nps: number; avgResponseTime: number; slaCompliance: number };
    human: { avgRating: number; nps: number; avgResponseTime: number; slaCompliance: number };
  };
}

interface ExecutiveData {
  realtime: {
    todayTickets: number;
    todayResolved: number;
    pendingTickets: number;
    activeAgents: number;
  };
  monthSummary: {
    totalTickets: number;
    resolvedTickets: number;
    slaCompliance: number;
    avgResponseTime: number;
    avgRating: number;
    nps: number;
    npsResponses: number;
    aiHandledRate: number;
    fcrRate: number;
    abandonRate: number;
  };
  variations: {
    tickets: { value: number; percentage: number; trend: string };
    resolved: { value: number; percentage: number; trend: string };
    slaCompliance: { value: number; percentage: number; trend: string };
  };
  npsBreakdown: { nps: number; promoters: number; passives: number; detractors: number; total: number };
}

interface Goal {
  id: string;
  name: string;
  metric: string;
  target: number;
  period: string;
  isActive: boolean;
  currentValue: number;
  progress: number;
  isAchieved: boolean;
  department?: { name: string; color: string };
  user?: { name: string; avatar: string };
}

interface Alert {
  id: string;
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  isActive: boolean;
  lastTriggeredAt?: string;
  triggerCount: number;
}

interface AgentMetrics {
  id: string;
  name: string;
  avatar?: string;
  isAI: boolean;
  isOnline: boolean;
  totalTickets: number;
  resolvedTickets: number;
  activeTickets: number;
  slaCompliance: number;
  avgResponseTime: number;
  avgResolutionTime: number;
}

interface DepartmentMetrics {
  id: string;
  name: string;
  color?: string;
  totalTickets: number;
  resolved: number;
  pending: number;
  inProgress: number;
  totalAgents: number;
  onlineAgents: number;
}

interface CriticalTicket {
  id: string;
  protocol: string;
  slaDeadline: string;
  contact: { name?: string; phone: string };
  assignedTo?: { name: string };
}

interface UserRanking {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  isOnline: boolean;
  lastSeen?: string;
  totalTickets: number;
  resolvedTickets: number;
  pendingTickets: number;
  inProgressTickets: number;
  messagesSent: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  slaBreached: number;
  slaCompliance: number;
  resolutionRate: number;
  avgRating: number | null;
  totalRatings: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

// ============================================
// HELPER COMPONENTS
// ============================================

function NPSGauge({ value, size = "large" }: { value: number; size?: "small" | "large" }) {
  const getColor = (nps: number) => {
    if (nps >= 50) return "text-green-500";
    if (nps >= 0) return "text-yellow-500";
    return "text-red-500";
  };

  const getLabel = (nps: number) => {
    if (nps >= 70) return "Excelente";
    if (nps >= 50) return "Muito Bom";
    if (nps >= 30) return "Bom";
    if (nps >= 0) return "Razoável";
    return "Crítico";
  };

  return (
    <div className={cn("text-center", size === "large" ? "space-y-2" : "space-y-1")}>
      <div className={cn("font-bold", getColor(value), size === "large" ? "text-5xl" : "text-2xl")}>
        {value}
      </div>
      <div className={cn("text-muted-foreground", size === "large" ? "text-sm" : "text-xs")}>
        {getLabel(value)}
      </div>
    </div>
  );
}

function VariationBadge({
  value,
  percentage,
  trend,
  isPositiveGood
}: {
  value: number;
  percentage: number;
  trend: string;
  isPositiveGood: boolean | null;
}) {
  const isPositive = trend === 'up';
  const isGood = isPositiveGood === null ? null : isPositiveGood ? isPositive : !isPositive;

  const colorClass = isGood === null
    ? "text-muted-foreground"
    : isGood
      ? "text-green-600"
      : "text-red-600";

  const bgClass = isGood === null
    ? "bg-muted"
    : isGood
      ? "bg-green-50"
      : "bg-red-50";

  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium", bgClass, colorClass)}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {percentage > 0 ? "+" : ""}{percentage.toFixed(1)}%
    </span>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variation,
  isPositiveGood
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  variation?: { value: number; percentage: number; trend: string };
  isPositiveGood?: boolean | null;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {variation && (
            <VariationBadge
              value={variation.value}
              percentage={variation.percentage}
              trend={variation.trend}
              isPositiveGood={isPositiveGood ?? null}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function MetricsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("executive");
  const [period, setPeriod] = useState("30");
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [dashboard, setDashboard] = useState<DashboardMetrics | null>(null);
  const [npsData, setNpsData] = useState<NPSData | null>(null);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [quality, setQuality] = useState<QualityData | null>(null);
  const [aiMetrics, setAiMetrics] = useState<AIMetrics | null>(null);
  const [executive, setExecutive] = useState<ExecutiveData | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [agents, setAgents] = useState<AgentMetrics[]>([]);
  const [departments, setDepartments] = useState<DepartmentMetrics[]>([]);
  const [criticalTickets, setCriticalTickets] = useState<CriticalTicket[]>([]);
  const [userRanking, setUserRanking] = useState<UserRanking[]>([]);
  const [sortBy, setSortBy] = useState("totalTickets");

  // Dialog states
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: "", metric: "slaCompliance", target: "95", period: "monthly" });
  const [newAlert, setNewAlert] = useState({ name: "", metric: "slaCompliance", condition: "below", threshold: "90" });

  useEffect(() => {
    fetchData();
  }, [period]);

  useEffect(() => {
    const handleCompanySwitch = () => {
      setDashboard(null);
      setNpsData(null);
      setComparison(null);
      setQuality(null);
      setAiMetrics(null);
      setExecutive(null);
      setGoals([]);
      setAlerts([]);
      fetchData();
    };

    window.addEventListener('company-switched', handleCompanySwitch);
    return () => window.removeEventListener('company-switched', handleCompanySwitch);
  }, []);

  useEffect(() => {
    if (activeTab === "ranking") {
      fetchUserRanking();
    }
  }, [activeTab, period, sortBy]);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [
        dashboardRes,
        agentsRes,
        deptsRes,
        slaRes,
        npsRes,
        comparisonRes,
        qualityRes,
        aiRes,
        executiveRes,
        goalsRes,
        alertsRes,
      ] = await Promise.all([
        api.get<DashboardMetrics>(`/metrics/dashboard?period=${period}`),
        api.get<AgentMetrics[]>(`/metrics/agents?period=${period}`),
        api.get<DepartmentMetrics[]>(`/metrics/departments?period=${period}`),
        api.get<{ criticalTickets: CriticalTicket[] }>(`/metrics/sla?period=${period}`),
        api.get<NPSData>(`/metrics/nps?period=${period}`).catch(() => ({ data: null })),
        api.get<ComparisonData>(`/metrics/comparison`).catch(() => ({ data: null })),
        api.get<QualityData>(`/metrics/quality?period=${period}`).catch(() => ({ data: null })),
        api.get<AIMetrics>(`/metrics/ai?period=${period}`).catch(() => ({ data: null })),
        api.get<ExecutiveData>(`/metrics/executive`).catch(() => ({ data: null })),
        api.get<Goal[]>(`/metrics/goals`).catch(() => ({ data: [] })),
        api.get<Alert[]>(`/metrics/alerts`).catch(() => ({ data: [] })),
      ]);

      setDashboard(dashboardRes.data);
      setAgents(agentsRes.data);
      setDepartments(deptsRes.data);
      setCriticalTickets(slaRes.data.criticalTickets || []);
      setNpsData(npsRes.data);
      setComparison(comparisonRes.data);
      setQuality(qualityRes.data);
      setAiMetrics(aiRes.data);
      setExecutive(executiveRes.data);
      setGoals(goalsRes.data || []);
      setAlerts(alertsRes.data || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar métricas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchUserRanking() {
    try {
      const response = await api.get<UserRanking[]>(
        `/metrics/users/ranking?period=${period}&sortBy=${sortBy}`
      );
      setUserRanking(response.data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar ranking de usuários",
        variant: "destructive",
      });
    }
  }

  async function handleExport(format: 'json' | 'csv') {
    try {
      // For file downloads, we need to use fetch directly to handle blobs
      const token = localStorage.getItem("chatblue-auth");
      let accessToken = null;
      if (token) {
        try {
          const { state } = JSON.parse(token);
          accessToken = state?.accessToken;
        } catch {}
      }

      const headers: Record<string, string> = {};
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/metrics/export?period=${period}&format=${format}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to export metrics');
      }

      if (format === 'csv') {
        const text = await response.text();
        const blob = new Blob([text], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `metricas_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `metricas_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      toast({ title: "Exportado", description: "Relatório exportado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao exportar relatório", variant: "destructive" });
    }
  }

  async function handleCreateGoal() {
    try {
      await api.post('/metrics/goals', newGoal);
      toast({ title: "Meta criada", description: "Meta criada com sucesso!" });
      setShowGoalDialog(false);
      setNewGoal({ name: "", metric: "slaCompliance", target: "95", period: "monthly" });
      fetchData();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao criar meta", variant: "destructive" });
    }
  }

  async function handleCreateAlert() {
    try {
      await api.post('/metrics/alerts', newAlert);
      toast({ title: "Alerta criado", description: "Alerta criado com sucesso!" });
      setShowAlertDialog(false);
      setNewAlert({ name: "", metric: "slaCompliance", condition: "below", threshold: "90" });
      fetchData();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao criar alerta", variant: "destructive" });
    }
  }

  async function handleDeleteGoal(id: string) {
    try {
      await api.delete(`/metrics/goals/${id}`);
      toast({ title: "Meta excluída" });
      fetchData();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao excluir meta", variant: "destructive" });
    }
  }

  async function handleDeleteAlert(id: string) {
    try {
      await api.delete(`/metrics/alerts/${id}`);
      toast({ title: "Alerta excluído" });
      fetchData();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao excluir alerta", variant: "destructive" });
    }
  }

  function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`;
  }

  function getMetricLabel(metric: string): string {
    const labels: Record<string, string> = {
      totalTickets: "Total de Tickets",
      slaCompliance: "SLA (%)",
      avgResponseTime: "Tempo de Resposta (s)",
      avgRating: "Avaliação Média",
      nps: "NPS",
      fcrRate: "FCR (%)",
      abandonRate: "Abandono (%)",
    };
    return labels[metric] || metric;
  }

  function renderStars(rating: number | null) {
    if (rating === null) return <span className="text-muted-foreground text-sm">-</span>;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "w-4 h-4",
              star <= Math.round(rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            )}
          />
        ))}
        <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  }

  function getRankBadge(index: number) {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 text-center font-bold text-muted-foreground">{index + 1}</span>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Métricas</h1>
          <p className="text-muted-foreground">
            Acompanhe o desempenho do seu atendimento
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData()}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Hoje</SelectItem>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full max-w-4xl">
          <TabsTrigger value="executive" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Executivo
          </TabsTrigger>
          <TabsTrigger value="nps" className="flex items-center gap-2">
            <ThumbsUp className="w-4 h-4" />
            NPS
          </TabsTrigger>
          <TabsTrigger value="quality" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Qualidade
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            IA
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Metas
          </TabsTrigger>
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Ranking
          </TabsTrigger>
        </TabsList>

        {/* ============================================ */}
        {/* TAB: EXECUTIVE DASHBOARD */}
        {/* ============================================ */}
        <TabsContent value="executive" className="space-y-6 mt-6">
          {executive && (
            <>
              {/* Realtime Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="Tickets Hoje"
                  value={executive.realtime.todayTickets}
                  subtitle={`${executive.realtime.todayResolved} resolvidos`}
                  icon={BarChart3}
                />
                <MetricCard
                  title="Aguardando"
                  value={executive.realtime.pendingTickets}
                  subtitle="na fila"
                  icon={Clock}
                />
                <MetricCard
                  title="Agentes Online"
                  value={executive.realtime.activeAgents}
                  subtitle="atendendo agora"
                  icon={Users}
                />
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">NPS do Mês</CardTitle>
                    <ThumbsUp className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <NPSGauge value={executive.monthSummary.nps} size="small" />
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      {executive.monthSummary.npsResponses} respostas
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Month Summary with Variations */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumo do Mês</CardTitle>
                  <CardDescription>Comparado com o mês anterior</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total de Tickets</p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold">{executive.monthSummary.totalTickets}</span>
                        <VariationBadge {...executive.variations.tickets} isPositiveGood={null} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Resolvidos</p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold">{executive.monthSummary.resolvedTickets}</span>
                        <VariationBadge {...executive.variations.resolved} isPositiveGood={true} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">SLA</p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold">{executive.monthSummary.slaCompliance}%</span>
                        <VariationBadge {...executive.variations.slaCompliance} isPositiveGood={true} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">FCR</p>
                      <span className="text-2xl font-bold">{executive.monthSummary.fcrRate}%</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">IA</p>
                      <span className="text-2xl font-bold">{executive.monthSummary.aiHandledRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* NPS Breakdown */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição NPS</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 flex-1">
                          <ThumbsUp className="w-5 h-5 text-green-500" />
                          <span className="text-sm">Promotores (9-10)</span>
                        </div>
                        <Progress value={(executive.npsBreakdown.promoters / (executive.npsBreakdown.total || 1)) * 100} className="flex-1 h-3" />
                        <span className="w-12 text-right font-medium">{executive.npsBreakdown.promoters}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 flex-1">
                          <Minus className="w-5 h-5 text-yellow-500" />
                          <span className="text-sm">Neutros (7-8)</span>
                        </div>
                        <Progress value={(executive.npsBreakdown.passives / (executive.npsBreakdown.total || 1)) * 100} className="flex-1 h-3" />
                        <span className="w-12 text-right font-medium">{executive.npsBreakdown.passives}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 flex-1">
                          <ThumbsDown className="w-5 h-5 text-red-500" />
                          <span className="text-sm">Detratores (0-6)</span>
                        </div>
                        <Progress value={(executive.npsBreakdown.detractors / (executive.npsBreakdown.total || 1)) * 100} className="flex-1 h-3" />
                        <span className="w-12 text-right font-medium">{executive.npsBreakdown.detractors}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Critical SLA */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      SLA Crítico
                    </CardTitle>
                    <CardDescription>
                      Tickets próximos do vencimento
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {criticalTickets.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        Nenhum ticket crítico
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {criticalTickets.slice(0, 5).map((ticket) => {
                          const sla = formatSLATime(ticket.slaDeadline);
                          return (
                            <div key={ticket.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  sla.status === "critical" ? "bg-red-500" : "bg-yellow-500"
                                )} />
                                <span className="font-medium">#{ticket.protocol}</span>
                              </div>
                              <Badge variant={sla.status === "critical" ? "destructive" : "secondary"}>
                                {sla.text}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ============================================ */}
        {/* TAB: NPS */}
        {/* ============================================ */}
        <TabsContent value="nps" className="space-y-6 mt-6">
          {npsData && (
            <>
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle>NPS Geral</CardTitle>
                    <CardDescription>Net Promoter Score</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <NPSGauge value={npsData.summary.nps} />
                    <p className="text-sm text-muted-foreground mt-4">
                      Baseado em {npsData.summary.total} respostas
                    </p>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Distribuição de Respostas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <ThumbsUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <div className="text-3xl font-bold text-green-600">{npsData.summary.promoters}</div>
                        <div className="text-sm text-green-700">Promotores</div>
                        <div className="text-xs text-muted-foreground">(9-10)</div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <Minus className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                        <div className="text-3xl font-bold text-yellow-600">{npsData.summary.passives}</div>
                        <div className="text-sm text-yellow-700">Neutros</div>
                        <div className="text-xs text-muted-foreground">(7-8)</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <ThumbsDown className="w-8 h-8 text-red-500 mx-auto mb-2" />
                        <div className="text-3xl font-bold text-red-600">{npsData.summary.detractors}</div>
                        <div className="text-sm text-red-700">Detratores</div>
                        <div className="text-xs text-muted-foreground">(0-6)</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>NPS por Departamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {npsData.byDepartment.map((dept) => (
                        <div key={dept.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color || '#6366f1' }} />
                            <span className="font-medium">{dept.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">{dept.total} respostas</span>
                            <span className={cn(
                              "font-bold text-lg",
                              dept.nps >= 50 ? "text-green-600" : dept.nps >= 0 ? "text-yellow-600" : "text-red-600"
                            )}>
                              {dept.nps}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Comentários Recentes</CardTitle>
                    <CardDescription>Últimos feedbacks dos clientes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-80 overflow-y-auto">
                      {npsData.recentComments.map((comment, i) => (
                        <div key={i} className="border-l-4 pl-3 py-2" style={{
                          borderColor: comment.category === 'promoter' ? '#22c55e' : comment.category === 'passive' ? '#eab308' : '#ef4444'
                        }}>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={comment.category === 'promoter' ? 'default' : comment.category === 'passive' ? 'secondary' : 'destructive'}>
                              {comment.score}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-sm">{comment.comment}</p>
                        </div>
                      ))}
                      {npsData.recentComments.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">Nenhum comentário ainda</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ============================================ */}
        {/* TAB: QUALITY (FCR, Reopen, Abandon) */}
        {/* ============================================ */}
        <TabsContent value="quality" className="space-y-6 mt-6">
          {quality && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">FCR (Primeira Resolução)</CardTitle>
                    <UserCheck className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{quality.summary.fcrRate}%</div>
                    <p className="text-xs text-muted-foreground">
                      {quality.summary.fcrCount} de {quality.summary.totalTickets} tickets
                    </p>
                    <Progress value={quality.summary.fcrRate} className="mt-2 h-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taxa de Reabertura</CardTitle>
                    <RotateCcw className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{quality.summary.reopenRate}%</div>
                    <p className="text-xs text-muted-foreground">
                      {quality.summary.reopenedCount} tickets ({quality.summary.totalReopens} reaberturas)
                    </p>
                    <Progress value={quality.summary.reopenRate} className="mt-2 h-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taxa de Abandono</CardTitle>
                    <PhoneOff className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{quality.summary.abandonRate}%</div>
                    <p className="text-xs text-muted-foreground">
                      {quality.summary.abandonedCount} abandonaram a fila
                    </p>
                    <Progress value={quality.summary.abandonRate} className="mt-2 h-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tempo Médio de Espera</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatTime(quality.summary.avgWaitingTime)}</div>
                    <p className="text-xs text-muted-foreground">na fila</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Qualidade por Departamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Departamento</th>
                          <th className="text-right py-3 px-4">Tickets</th>
                          <th className="text-right py-3 px-4">FCR</th>
                          <th className="text-right py-3 px-4">Reabertura</th>
                          <th className="text-right py-3 px-4">Abandono</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quality.byDepartment.map((dept) => (
                          <tr key={dept.id} className="border-b">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color || '#6366f1' }} />
                                {dept.name}
                              </div>
                            </td>
                            <td className="text-right py-3 px-4">{dept.totalTickets}</td>
                            <td className="text-right py-3 px-4">
                              <span className={cn(
                                "font-medium",
                                dept.fcrRate >= 70 ? "text-green-600" : dept.fcrRate >= 50 ? "text-yellow-600" : "text-red-600"
                              )}>
                                {dept.fcrRate}%
                              </span>
                            </td>
                            <td className="text-right py-3 px-4">
                              <span className={cn(
                                "font-medium",
                                dept.reopenRate <= 5 ? "text-green-600" : dept.reopenRate <= 15 ? "text-yellow-600" : "text-red-600"
                              )}>
                                {dept.reopenRate}%
                              </span>
                            </td>
                            <td className="text-right py-3 px-4">
                              <span className={cn(
                                "font-medium",
                                dept.abandonRate <= 5 ? "text-green-600" : dept.abandonRate <= 15 ? "text-yellow-600" : "text-red-600"
                              )}>
                                {dept.abandonRate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ============================================ */}
        {/* TAB: AI METRICS */}
        {/* ============================================ */}
        <TabsContent value="ai" className="space-y-6 mt-6">
          {aiMetrics && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Atendidos por IA</CardTitle>
                    <Bot className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{aiMetrics.summary.aiHandled}</div>
                    <p className="text-xs text-muted-foreground">
                      {aiMetrics.summary.aiHandledRate}% do total
                    </p>
                    <Progress value={aiMetrics.summary.aiHandledRate} className="mt-2 h-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Resolvidos pela IA</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{aiMetrics.summary.aiResolved}</div>
                    <p className="text-xs text-muted-foreground">
                      {aiMetrics.summary.aiResolutionRate}% de resolução
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Handoff para Humano</CardTitle>
                    <Users className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{aiMetrics.summary.handoffToHuman}</div>
                    <p className="text-xs text-muted-foreground">
                      {aiMetrics.summary.handoffRate}% de handoff
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Economia Estimada</CardTitle>
                    <Zap className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-700">
                      R$ {aiMetrics.summary.estimatedSavings.toLocaleString('pt-BR')}
                    </div>
                    <p className="text-xs text-green-600">
                      com atendimento automatizado
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Comparativo: IA vs Humano</CardTitle>
                  <CardDescription>Performance lado a lado</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-4">
                        <Bot className="w-6 h-6 text-purple-600" />
                        <span className="font-semibold text-purple-700">Inteligência Artificial</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Avaliação Média</span>
                          <span className="font-medium">{aiMetrics.comparison.ai.avgRating} / 5</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">NPS</span>
                          <span className="font-medium">{aiMetrics.comparison.ai.nps}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Tempo de Resposta</span>
                          <span className="font-medium">{formatTime(aiMetrics.comparison.ai.avgResponseTime)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">SLA</span>
                          <span className="font-medium">{aiMetrics.comparison.ai.slaCompliance}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="w-6 h-6 text-blue-600" />
                        <span className="font-semibold text-blue-700">Atendentes Humanos</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Avaliação Média</span>
                          <span className="font-medium">{aiMetrics.comparison.human.avgRating} / 5</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">NPS</span>
                          <span className="font-medium">{aiMetrics.comparison.human.nps}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Tempo de Resposta</span>
                          <span className="font-medium">{formatTime(aiMetrics.comparison.human.avgResponseTime)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">SLA</span>
                          <span className="font-medium">{aiMetrics.comparison.human.slaCompliance}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ============================================ */}
        {/* TAB: GOALS & ALERTS */}
        {/* ============================================ */}
        <TabsContent value="goals" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Goals Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Metas</CardTitle>
                  <CardDescription>Acompanhe o progresso das suas metas</CardDescription>
                </div>
                <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Target className="w-4 h-4 mr-2" />
                      Nova Meta
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Nova Meta</DialogTitle>
                      <DialogDescription>Defina uma meta para acompanhar</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome da Meta</Label>
                        <Input
                          placeholder="Ex: SLA acima de 95%"
                          value={newGoal.name}
                          onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Métrica</Label>
                          <Select value={newGoal.metric} onValueChange={(v) => setNewGoal({ ...newGoal, metric: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="slaCompliance">SLA (%)</SelectItem>
                              <SelectItem value="nps">NPS</SelectItem>
                              <SelectItem value="fcrRate">FCR (%)</SelectItem>
                              <SelectItem value="avgRating">Avaliação</SelectItem>
                              <SelectItem value="totalTickets">Total Tickets</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Valor Alvo</Label>
                          <Input
                            type="number"
                            value={newGoal.target}
                            onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Período</Label>
                        <Select value={newGoal.period} onValueChange={(v) => setNewGoal({ ...newGoal, period: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Diário</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="monthly">Mensal</SelectItem>
                            <SelectItem value="quarterly">Trimestral</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowGoalDialog(false)}>Cancelar</Button>
                      <Button onClick={handleCreateGoal}>Criar Meta</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {goals.map((goal) => (
                    <div key={goal.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {goal.isAchieved ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Target className="w-5 h-5 text-muted-foreground" />
                          )}
                          <span className="font-medium">{goal.name}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteGoal(goal.id)}>
                          <span className="text-red-500">Excluir</span>
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {getMetricLabel(goal.metric)} - Meta: {goal.target} ({goal.period})
                      </div>
                      <div className="flex items-center gap-4">
                        <Progress value={goal.progress} className="flex-1 h-2" />
                        <span className={cn(
                          "font-bold",
                          goal.isAchieved ? "text-green-600" : "text-muted-foreground"
                        )}>
                          {goal.currentValue} / {goal.target}
                        </span>
                      </div>
                    </div>
                  ))}
                  {goals.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">Nenhuma meta definida</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Alerts Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Alertas</CardTitle>
                  <CardDescription>Configure alertas para métricas críticas</CardDescription>
                </div>
                <Dialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Bell className="w-4 h-4 mr-2" />
                      Novo Alerta
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Novo Alerta</DialogTitle>
                      <DialogDescription>Seja notificado quando uma métrica ultrapassar o limite</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome do Alerta</Label>
                        <Input
                          placeholder="Ex: SLA crítico"
                          value={newAlert.name}
                          onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Métrica</Label>
                          <Select value={newAlert.metric} onValueChange={(v) => setNewAlert({ ...newAlert, metric: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="slaCompliance">SLA (%)</SelectItem>
                              <SelectItem value="nps">NPS</SelectItem>
                              <SelectItem value="fcrRate">FCR (%)</SelectItem>
                              <SelectItem value="abandonRate">Abandono (%)</SelectItem>
                              <SelectItem value="avgResponseTime">Tempo Resposta (s)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Condição</Label>
                          <Select value={newAlert.condition} onValueChange={(v) => setNewAlert({ ...newAlert, condition: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="below">Abaixo de</SelectItem>
                              <SelectItem value="above">Acima de</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Valor Limite</Label>
                        <Input
                          type="number"
                          value={newAlert.threshold}
                          onChange={(e) => setNewAlert({ ...newAlert, threshold: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAlertDialog(false)}>Cancelar</Button>
                      <Button onClick={handleCreateAlert}>Criar Alerta</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Bell className={cn("w-5 h-5", alert.isActive ? "text-yellow-500" : "text-muted-foreground")} />
                          <span className="font-medium">{alert.name}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteAlert(alert.id)}>
                          <span className="text-red-500">Excluir</span>
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getMetricLabel(alert.metric)} {alert.condition === 'below' ? 'abaixo de' : 'acima de'} {alert.threshold}
                      </div>
                      {alert.lastTriggeredAt && (
                        <div className="text-xs text-red-500 mt-1">
                          Disparado {alert.triggerCount}x - Último: {new Date(alert.lastTriggeredAt).toLocaleString('pt-BR')}
                        </div>
                      )}
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">Nenhum alerta configurado</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Comparison */}
          {comparison && (
            <Card>
              <CardHeader>
                <CardTitle>Comparação Mensal</CardTitle>
                <CardDescription>
                  {comparison.currentMonth} vs {comparison.previousMonth}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {Object.entries(comparison.metrics).map(([key, data]) => (
                    <div key={key} className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">
                        {getMetricLabel(key)}
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-xl font-bold">{data.current}</span>
                        <VariationBadge
                          value={data.value}
                          percentage={data.percentage}
                          trend={data.trend}
                          isPositiveGood={data.isPositiveGood}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Anterior: {data.previous}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============================================ */}
        {/* TAB: RANKING */}
        {/* ============================================ */}
        <TabsContent value="ranking" className="space-y-6 mt-6">
          {/* Sort Controls */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Ordenar por:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="totalTickets">Total de Tickets</SelectItem>
                <SelectItem value="resolvedTickets">Tickets Resolvidos</SelectItem>
                <SelectItem value="avgRating">Melhor Avaliação</SelectItem>
                <SelectItem value="slaCompliance">Melhor SLA</SelectItem>
                <SelectItem value="avgResponseTime">Menor Tempo Resposta</SelectItem>
                <SelectItem value="messagesSent">Mais Mensagens</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User Ranking Cards */}
          <div className="space-y-4">
            {userRanking.map((user, index) => (
              <Card key={user.id} className={cn(
                index === 0 && "border-yellow-400 bg-yellow-50/50",
                index === 1 && "border-gray-300",
                index === 2 && "border-amber-600/50"
              )}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    {/* Rank Badge */}
                    <div className="flex items-center justify-center w-10">
                      {getRankBadge(index)}
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {user.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white",
                            user.isOnline ? "bg-green-500" : "bg-gray-400"
                          )}
                        />
                      </div>
                      <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="flex-1 grid grid-cols-6 gap-4 ml-8">
                      <div className="text-center">
                        <p className="text-xl font-bold">{user.totalTickets}</p>
                        <p className="text-xs text-muted-foreground">Tickets</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold">{user.resolvedTickets}</p>
                        <p className="text-xs text-muted-foreground">Resolvidos</p>
                      </div>
                      <div className="text-center">
                        <p className={cn(
                          "text-xl font-bold",
                          user.resolutionRate >= 80 ? "text-green-600" :
                          user.resolutionRate >= 60 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {user.resolutionRate}%
                        </p>
                        <p className="text-xs text-muted-foreground">Taxa Resolução</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold">{formatTime(user.avgResponseTime)}</p>
                        <p className="text-xs text-muted-foreground">Tempo Resposta</p>
                      </div>
                      <div className="text-center">
                        <p className={cn(
                          "text-xl font-bold",
                          user.slaCompliance >= 90 ? "text-green-600" :
                          user.slaCompliance >= 70 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {user.slaCompliance}%
                        </p>
                        <p className="text-xs text-muted-foreground">SLA</p>
                      </div>
                      <div className="text-center">
                        {renderStars(user.avgRating)}
                        <p className="text-xs text-muted-foreground mt-1">
                          {user.totalRatings} avaliações
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rating Distribution */}
                  {user.totalRatings > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Distribuição de Avaliações</p>
                      <div className="flex items-center gap-4">
                        {[5, 4, 3, 2, 1].map((star) => (
                          <div key={star} className="flex items-center gap-2">
                            <span className="text-sm w-3">{star}</span>
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-yellow-400 rounded-full"
                                style={{
                                  width: `${(user.ratingDistribution[star as 1|2|3|4|5] / user.totalRatings) * 100}%`
                                }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-8">
                              {user.ratingDistribution[star as 1|2|3|4|5]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {userRanking.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhum usuário encontrado para o período selecionado
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

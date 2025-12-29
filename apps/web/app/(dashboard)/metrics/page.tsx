"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
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
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { cn, formatSLATime } from "@/lib/utils";

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

export default function MetricsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [period, setPeriod] = useState("7");
  const [isLoading, setIsLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardMetrics | null>(null);
  const [agents, setAgents] = useState<AgentMetrics[]>([]);
  const [departments, setDepartments] = useState<DepartmentMetrics[]>([]);
  const [criticalTickets, setCriticalTickets] = useState<CriticalTicket[]>([]);
  const [userRanking, setUserRanking] = useState<UserRanking[]>([]);
  const [sortBy, setSortBy] = useState("totalTickets");

  useEffect(() => {
    fetchData();
  }, [period]);

  // Listen for company switch events to reload data
  useEffect(() => {
    const handleCompanySwitch = () => {
      console.log("Company switched, reloading metrics...");
      setDashboard(null);
      setAgents([]);
      setDepartments([]);
      setCriticalTickets([]);
      setUserRanking([]);
      fetchData();
    };

    window.addEventListener('company-switched', handleCompanySwitch);
    return () => {
      window.removeEventListener('company-switched', handleCompanySwitch);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "ranking") {
      fetchUserRanking();
    }
  }, [activeTab, period, sortBy]);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [dashboardRes, agentsRes, deptsRes, slaRes] = await Promise.all([
        api.get<DashboardMetrics>(`/metrics/dashboard?period=${period}`),
        api.get<AgentMetrics[]>(`/metrics/agents?period=${period}`),
        api.get<DepartmentMetrics[]>(`/metrics/departments?period=${period}`),
        api.get<{ criticalTickets: CriticalTicket[] }>(`/metrics/sla?period=${period}`),
      ]);

      setDashboard(dashboardRes.data);
      setAgents(agentsRes.data);
      setDepartments(deptsRes.data);
      setCriticalTickets(slaRes.data.criticalTickets || []);
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

  function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Ranking de Usuários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tickets</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.summary.totalTickets || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.summary.pendingTickets || 0} pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio de Resposta</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(dashboard?.summary.avgResponseTime || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Primeira resposta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Cumprido</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.summary.slaCompliance || 0}%
            </div>
            <Progress
              value={dashboard?.summary.slaCompliance || 0}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atendidos por IA</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.summary.aiHandled || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.summary.totalTickets
                ? Math.round(
                    (dashboard.summary.aiHandled / dashboard.summary.totalTickets) * 100
                  )
                : 0}
              % do total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Critical SLA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              SLA Crítico
            </CardTitle>
            <CardDescription>
              Tickets próximos do vencimento do SLA
            </CardDescription>
          </CardHeader>
          <CardContent>
            {criticalTickets.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum ticket crítico
              </p>
            ) : (
              <div className="space-y-4">
                {criticalTickets.map((ticket) => {
                  const sla = formatSLATime(ticket.slaDeadline);
                  return (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full",
                            sla.status === "critical"
                              ? "bg-red-500"
                              : sla.status === "warning"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          )}
                        />
                        <div>
                          <p className="font-medium">
                            #{ticket.protocol}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {ticket.contact.name || ticket.contact.phone}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            sla.status === "critical"
                              ? "destructive"
                              : sla.status === "warning"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {sla.text}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {ticket.assignedTo?.name || "Não atribuído"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Departments */}
        <Card>
          <CardHeader>
            <CardTitle>Por Departamento</CardTitle>
            <CardDescription>Distribuição de tickets por setor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departments.map((dept) => (
                <div key={dept.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: dept.color || "#6366f1" }}
                      />
                      <span className="font-medium">{dept.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {dept.totalTickets} tickets
                    </span>
                  </div>
                  <Progress
                    value={
                      dept.totalTickets
                        ? (dept.resolved / dept.totalTickets) * 100
                        : 0
                    }
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{dept.resolved} resolvidos</span>
                    <span>{dept.onlineAgents}/{dept.totalAgents} online</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agents Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Performance dos Atendentes
          </CardTitle>
          <CardDescription>
            Métricas individuais de cada atendente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={agent.avatar} />
                      <AvatarFallback>
                        {agent.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {agent.isAI && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {!agent.isAI && (
                      <div
                        className={cn(
                          "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                          agent.isOnline ? "bg-green-500" : "bg-gray-400"
                        )}
                      />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {agent.activeTickets} ativos
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{agent.totalTickets}</p>
                    <p className="text-xs text-muted-foreground">Tickets</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {agent.resolvedTickets}
                    </p>
                    <p className="text-xs text-muted-foreground">Resolvidos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {formatTime(agent.avgResponseTime)}
                    </p>
                    <p className="text-xs text-muted-foreground">TMR</p>
                  </div>
                  <div className="text-center">
                    <p
                      className={cn(
                        "text-2xl font-bold",
                        agent.slaCompliance >= 90
                          ? "text-green-600"
                          : agent.slaCompliance >= 70
                          ? "text-yellow-600"
                          : "text-red-600"
                      )}
                    >
                      {Math.round(agent.slaCompliance)}%
                    </p>
                    <p className="text-xs text-muted-foreground">SLA</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

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

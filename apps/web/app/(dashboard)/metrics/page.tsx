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

export default function MetricsPage() {
  const { toast } = useToast();
  const [period, setPeriod] = useState("7");
  const [isLoading, setIsLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardMetrics | null>(null);
  const [agents, setAgents] = useState<AgentMetrics[]>([]);
  const [departments, setDepartments] = useState<DepartmentMetrics[]>([]);
  const [criticalTickets, setCriticalTickets] = useState<CriticalTicket[]>([]);

  useEffect(() => {
    fetchData();
  }, [period]);

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
    </div>
  );
}

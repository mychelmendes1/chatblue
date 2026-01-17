import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 13) {
    // +55 11 99999-0000
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  }

  if (cleaned.length === 11) {
    // 11 99999-0000
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }

  return phone;
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (days === 1) {
    return "Ontem";
  }

  if (days < 7) {
    return d.toLocaleDateString("pt-BR", { weekday: "short" });
  }

  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatSLATime(deadline: string): {
  text: string;
  status: "ok" | "warning" | "critical" | "breached";
} {
  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl.getTime() - now.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 0) {
    return { text: "Expirado", status: "breached" };
  }

  if (minutes < 5) {
    return { text: `${minutes}min`, status: "critical" };
  }

  if (minutes < 15) {
    return { text: `${minutes}min`, status: "warning" };
  }

  if (minutes < 60) {
    return { text: `${minutes}min`, status: "ok" };
  }

  const hours = Math.floor(minutes / 60);
  return { text: `${hours}h`, status: "ok" };
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "PENDING":
      return "bg-blue-500";
    case "IN_PROGRESS":
      return "bg-green-500";
    case "WAITING":
      return "bg-yellow-500";
    case "SNOOZED":
      return "bg-amber-500";
    case "RESOLVED":
      return "bg-emerald-500";
    case "CLOSED":
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "IN_PROGRESS":
      return "Em Atendimento";
    case "WAITING":
      return "Aguardando";
    case "SNOOZED":
      return "Adiado";
    case "RESOLVED":
      return "Resolvido";
    case "CLOSED":
      return "Fechado";
    default:
      return status;
  }
}

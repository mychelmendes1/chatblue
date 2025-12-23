"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Wifi,
  Bot,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth.store";

const navigation = [
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Contatos", href: "/contacts", icon: Users },
  { name: "Métricas", href: "/metrics", icon: BarChart3 },
  { name: "Usuários", href: "/users", icon: Shield, adminOnly: true },
  { name: "Conexões", href: "/connections", icon: Wifi },
  { name: "Atendente IA", href: "/ai-agent", icon: Bot },
  { name: "Configurações", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col w-16 bg-chatblue-dark">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 bg-chatblue">
        <MessageSquare className="w-8 h-8 text-white" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center py-4 space-y-2">
        {navigation
          .filter((item) => !item.adminOnly || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN")
          .map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "w-12 h-12 text-white/70 hover:text-white hover:bg-white/10",
                    isActive && "bg-white/20 text-white"
                  )}
                  title={item.name}
                >
                  <item.icon className="w-6 h-6" />
                </Button>
              </Link>
            );
          })}
      </nav>

      {/* User */}
      <div className="flex flex-col items-center py-4 space-y-2 border-t border-white/10">
        <Avatar className="w-10 h-10">
          <AvatarImage src={user?.avatar} />
          <AvatarFallback className="bg-chatblue text-white text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => logout()}
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

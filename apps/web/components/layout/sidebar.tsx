"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Wifi,
  Bot,
  Shield,
  Book,
  HelpCircle,
  Menu,
  X,
  Database,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth.store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navigation = [
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Contatos", href: "/contacts", icon: Users },
  { name: "Métricas", href: "/metrics", icon: BarChart3 },
  { name: "Usuários", href: "/users", icon: Shield, adminOnly: true },
  { name: "Conexões", href: "/connections", icon: Wifi },
  { name: "Atendente IA", href: "/ai-agent", icon: Bot },
  { name: "Base IA", href: "/ai-knowledge", icon: Database, adminOnly: true },
  { name: "Agentes IA", href: "/ai-agents", icon: Sparkles, adminOnly: true },
  { name: "Knowledge Base", href: "/knowledge-base", icon: Book, adminOnly: true },
  { name: "FAQ", href: "/faq", icon: HelpCircle, adminOnly: true },
  { name: "Configurações", href: "/settings", icon: Settings },
];

// Main navigation items for bottom nav (limited to 5)
const bottomNavItems = [
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Contatos", href: "/contacts", icon: Users },
  { name: "Métricas", href: "/metrics", icon: BarChart3 },
  { name: "Conexões", href: "/connections", icon: Wifi },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const filteredNavigation = navigation.filter(
    (item) => !item.adminOnly || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"
  );

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:flex flex-col w-16 bg-chatblue-dark">
        {/* Logo */}
        <div className="flex items-center justify-center h-16 bg-chatblue">
          <MessageSquare className="w-8 h-8 text-white" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col items-center py-4 space-y-2">
          {filteredNavigation.map((item) => {
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

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-chatblue-dark border-t border-white/10 safe-area-bottom">
        <nav className="flex items-center justify-around h-16">
          {bottomNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.name} href={item.href} className="flex-1">
                <div
                  className={cn(
                    "flex flex-col items-center justify-center py-2 text-white/60",
                    isActive && "text-white"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive && "text-white")} />
                  <span className="text-[10px] mt-1">{item.name}</span>
                </div>
              </Link>
            );
          })}
          
          {/* More menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button className="flex-1 flex flex-col items-center justify-center py-2 text-white/60">
                <Menu className="w-5 h-5" />
                <span className="text-[10px] mt-1">Mais</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-chatblue-dark border-white/10 rounded-t-2xl">
              <SheetHeader>
                <SheetTitle className="text-white text-left">Menu</SheetTitle>
              </SheetHeader>
              <nav className="grid grid-cols-4 gap-4 py-6">
                {filteredNavigation.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex flex-col items-center gap-2"
                    >
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          isActive ? "bg-white/20 text-white" : "bg-white/10 text-white/70"
                        )}
                      >
                        <item.icon className="w-6 h-6" />
                      </div>
                      <span className="text-xs text-white/80 text-center">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
              
              {/* User section */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-chatblue text-white text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-white">{user?.name}</p>
                    <p className="text-xs text-white/60">{user?.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
    </>
  );
}

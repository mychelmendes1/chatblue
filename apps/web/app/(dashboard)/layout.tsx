"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SocketProvider } from "@/components/providers/socket-provider";
import { BlueMascot } from "@/components/blue/blue-mascot";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-chatblue" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SocketProvider>
      <div className="flex h-screen h-screen-mobile overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16 md:pb-0 min-h-0">{children}</main>
        </div>
      </div>
      <BlueMascot />
    </SocketProvider>
  );
}

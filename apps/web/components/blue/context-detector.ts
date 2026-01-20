"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useChatStore } from "@/stores/chat.store";

export interface PageContext {
  route: string;
  routeParams?: Record<string, string>;
  searchParams?: Record<string, string>;
  ticketId?: string;
  contactId?: string;
  departmentId?: string;
  metadata?: Record<string, any>;
}

export function usePageContext(): PageContext | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [context, setContext] = useState<PageContext | null>(null);
  const selectedTicket = useChatStore((state) => state.selectedTicket);

  useEffect(() => {
    const contextData: PageContext = {
      route: pathname || "/",
      searchParams: searchParams
        ? Object.fromEntries(searchParams.entries())
        : undefined,
    };

    // Extract route params from pathname
    const routeMatch = pathname?.match(/\/chat\/?$/);
    if (routeMatch && selectedTicket) {
      // In chat page with selected ticket
      contextData.ticketId = selectedTicket.id;
      contextData.contactId = selectedTicket.contact?.id;
      contextData.departmentId = selectedTicket.department?.id;
      contextData.metadata = {
        ticketStatus: selectedTicket.status,
        ticketPriority: selectedTicket.priority,
        isAIHandled: selectedTicket.isAIHandled,
      };
    }

    // Extract IDs from search params
    if (searchParams) {
      const ticketIdParam = searchParams.get("ticketId");
      const contactIdParam = searchParams.get("contactId");
      const departmentIdParam = searchParams.get("departmentId");

      if (ticketIdParam) contextData.ticketId = ticketIdParam;
      if (contactIdParam) contextData.contactId = contactIdParam;
      if (departmentIdParam) contextData.departmentId = departmentIdParam;
    }

    setContext(contextData);
  }, [pathname, searchParams, selectedTicket]);

  return context;
}

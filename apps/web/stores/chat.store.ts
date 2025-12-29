import { create } from "zustand";
import { normalizeMediaUrl } from "@/utils/media-url.util";

interface Contact {
  id: string;
  name?: string;
  phone: string;
  avatar?: string;
  isClient?: boolean;
}

export interface Message {
  id: string;
  type: string;
  content?: string;
  mediaUrl?: string;
  caption?: string; // Caption for media messages (images, videos, documents)
  transcription?: string; // Audio transcription
  isFromMe: boolean;
  isAIGenerated: boolean;
  status: string;
  createdAt: string;
  ticketId?: string; // Ticket ID to filter messages
  sender?: {
    id: string;
    name: string;
    avatar?: string;
    isAI: boolean;
  };
  // Reply/Quoted message
  quoted?: {
    id: string;
    content?: string;
    type: string;
    isFromMe: boolean;
  };
  quotedId?: string;
  // Reactions
  reactions?: Array<{
    emoji: string;
    userId: string;
    userName: string;
    timestamp: string;
  }>;
  // Deleted
  deletedAt?: string;
  deletedBy?: string;
}

export interface Ticket {
  id: string;
  protocol: string;
  status: string;
  priority: string;
  isAIHandled: boolean;
  slaDeadline?: string;
  humanTakeoverAt?: string | null;
  createdAt: string;
  updatedAt: string;
  contact: Contact;
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string;
    isAI: boolean;
  };
  department?: {
    id: string;
    name: string;
    color?: string;
  };
  messages?: Message[];
  lastMessage?: Message;
  _count?: {
    messages: number;
  };
}

interface ChatState {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  messages: Message[];
  isLoadingTickets: boolean;
  isLoadingMessages: boolean;
  showResolved: boolean;
  filters: {
    status?: string;
    departmentId?: string;
    assignedToId?: string;
    search?: string;
  };
  setTickets: (tickets: Ticket[]) => void;
  addTicket: (ticket: Ticket) => void;
  removeTicket: (ticketId: string) => void;
  selectTicket: (ticket: Ticket | null) => void;
  updateSelectedTicket: (updates: Partial<Ticket>) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  updateTicket: (ticketId: string, updates: Partial<Ticket>) => void;
  updateTicketUnread: (ticketId: string) => void;
  markTicketAsRead: (ticketId: string) => void;
  setFilters: (filters: Partial<ChatState["filters"]>) => void;
  setShowResolved: (show: boolean) => void;
  setLoadingTickets: (loading: boolean) => void;
  setLoadingMessages: (loading: boolean) => void;
  clearData: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  tickets: [],
  selectedTicket: null,
  messages: [],
  isLoadingTickets: false,
  isLoadingMessages: false,
  showResolved: false,
  filters: {},

  setTickets: (tickets) => set({ tickets }),

  addTicket: (ticket) =>
    set((state) => {
      // Don't add if ticket already exists
      if (state.tickets.some((t) => t.id === ticket.id)) {
        return state;
      }
      // Add at the beginning of the list
      return { tickets: [ticket, ...state.tickets] };
    }),

  removeTicket: (ticketId) =>
    set((state) => ({
      tickets: state.tickets.filter((t) => t.id !== ticketId),
      // Clear selectedTicket if it's the one being removed
      selectedTicket:
        state.selectedTicket?.id === ticketId ? null : state.selectedTicket,
    })),

  selectTicket: (ticket) => {
    set({ selectedTicket: ticket, messages: [] });
  },

  updateSelectedTicket: (updates) => {
    set((state) => {
      if (!state.selectedTicket) return state;
      return {
        selectedTicket: { ...state.selectedTicket, ...updates },
      };
    });
  },

  setMessages: (messages) => {
    // Normalize media URLs for all messages
    const normalizedMessages = messages.map((msg) => ({
      ...msg,
      mediaUrl: normalizeMediaUrl(msg.mediaUrl),
    }));
    set({ messages: normalizedMessages });
  },

  addMessage: (message) =>
    set((state) => {
      // Avoid duplicates - check if message already exists
      if (state.messages.some((m) => m.id === message.id)) {
        console.log("[Store] addMessage - Message already exists, skipping:", message.id);
        return state;
      }
      console.log("[Store] addMessage - Adding message:", message.id, "Current count:", state.messages.length);
      const newMessages = [...state.messages, message];
      console.log("[Store] addMessage - New count:", newMessages.length);
      return { messages: newMessages };
    }),

  updateMessage: (messageId, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
      ),
    })),

  updateTicket: (ticketId, updates) =>
    set((state) => {
      // Check if ticket is being resolved/closed and showResolved is false
      const isBeingResolved = 
        (updates.status === 'RESOLVED' || updates.status === 'CLOSED') && 
        !state.showResolved;
      
      if (isBeingResolved) {
        // Remove the ticket from the list
        return {
          tickets: state.tickets.filter((t) => t.id !== ticketId),
          selectedTicket:
            state.selectedTicket?.id === ticketId ? null : state.selectedTicket,
        };
      }
      
      // Check if ticket exists in the list
      const ticketExists = state.tickets.some((t) => t.id === ticketId);
      
      // If ticket doesn't exist and it's being reopened (PENDING or IN_PROGRESS), add it
      if (!ticketExists) {
        const shouldAdd = updates.status === 'PENDING' || updates.status === 'IN_PROGRESS' || 
                          (updates.status !== 'RESOLVED' && updates.status !== 'CLOSED');
        
        if (shouldAdd && updates.id) {
          // Add the ticket to the list (updates contains the full ticket data from socket)
          console.log('[Store] Adding reopened ticket to list:', ticketId);
          const newTicket = { id: ticketId, ...updates } as any;
          return {
            tickets: [newTicket, ...state.tickets],
            selectedTicket: state.selectedTicket,
          };
        }
        // Ticket doesn't exist and shouldn't be added
        return state;
      }
      
      // Update the ticket (preserve _count if not explicitly updated)
      const updatedTickets = state.tickets.map((t) => {
        if (t.id !== ticketId) return t;
        // Preserve _count unless explicitly provided in updates
        const newCount = updates._count !== undefined ? updates._count : t._count;
        return { ...t, ...updates, _count: newCount };
      });

      // Sort tickets:
      // 1. Unread messages OR transferred from AI (needs human attention) - highest priority
      // 2. AI handled tickets (being processed by AI)
      // 3. Responded but still open
      const sortedTickets = updatedTickets.sort((a, b) => {
        const aUnread = a._count?.messages || 0;
        const bUnread = b._count?.messages || 0;
        const aIsAI = a.isAIHandled;
        const bIsAI = b.isAIHandled;
        const aLastMessageFromMe = a.lastMessage?.isFromMe ?? (a.messages?.[0]?.isFromMe ?? false);
        const bLastMessageFromMe = b.lastMessage?.isFromMe ?? (b.messages?.[0]?.isFromMe ?? false);
        
        // Check if ticket was transferred from AI (PENDING, not AI handled, has humanTakeoverAt)
        const aTransferredFromAI = !aIsAI && a.status === 'PENDING' && a.humanTakeoverAt !== null;
        const bTransferredFromAI = !bIsAI && b.status === 'PENDING' && b.humanTakeoverAt !== null;

        // Priority 1: Has unread client messages OR was transferred from AI (needs human attention)
        const aNeedsAttention = aUnread > 0 || aTransferredFromAI;
        const bNeedsAttention = bUnread > 0 || bTransferredFromAI;
        
        if (aNeedsAttention && !bNeedsAttention) return -1;
        if (bNeedsAttention && !aNeedsAttention) return 1;

        // If both need attention, sort by: transferred first, then unread count, then updatedAt
        if (aNeedsAttention && bNeedsAttention) {
          // Transferred from AI takes priority over just unread
          if (aTransferredFromAI && !bTransferredFromAI) return -1;
          if (bTransferredFromAI && !aTransferredFromAI) return 1;
          
          // Both transferred or both have unread - sort by unread count then updatedAt
          if (aUnread !== bUnread) return bUnread - aUnread;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }

        // Priority 2: AI handled tickets (waiting for AI response)
        if (aIsAI && !bIsAI) return -1;
        if (bIsAI && !aIsAI) return 1;

        // Priority 3: Last message is from client (waiting for response)
        if (!aLastMessageFromMe && bLastMessageFromMe) return -1;
        if (!bLastMessageFromMe && aLastMessageFromMe) return 1;

        // Finally, sort by updatedAt desc
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      return {
        tickets: sortedTickets,
        selectedTicket:
          state.selectedTicket?.id === ticketId
            ? { ...state.selectedTicket, ...updates }
            : state.selectedTicket,
      };
    }),

  updateTicketUnread: (ticketId) =>
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId
          ? { ...t, _count: { messages: (t._count?.messages || 0) + 1 } }
          : t
      ),
    })),

  markTicketAsRead: (ticketId) =>
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, _count: { messages: 0 } } : t
      ),
      selectedTicket:
        state.selectedTicket?.id === ticketId
          ? { ...state.selectedTicket, _count: { messages: 0 } }
          : state.selectedTicket,
    })),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  setShowResolved: (show) => set({ showResolved: show }),

  setLoadingTickets: (loading) => set({ isLoadingTickets: loading }),
  setLoadingMessages: (loading) => set({ isLoadingMessages: loading }),
  
  clearData: () => set({
    tickets: [],
    selectedTicket: null,
    messages: [],
    filters: {},
  }),
}));

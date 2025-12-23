import { create } from "zustand";

interface Contact {
  id: string;
  name?: string;
  phone: string;
  avatar?: string;
  isClient?: boolean;
}

interface Message {
  id: string;
  type: string;
  content?: string;
  mediaUrl?: string;
  isFromMe: boolean;
  isAIGenerated: boolean;
  status: string;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
    isAI: boolean;
  };
}

interface Ticket {
  id: string;
  protocol: string;
  status: string;
  priority: string;
  isAIHandled: boolean;
  slaDeadline?: string;
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
  filters: {
    status?: string;
    departmentId?: string;
    assignedToId?: string;
    search?: string;
  };
  setTickets: (tickets: Ticket[]) => void;
  selectTicket: (ticket: Ticket | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  updateTicket: (ticketId: string, updates: Partial<Ticket>) => void;
  setFilters: (filters: Partial<ChatState["filters"]>) => void;
  setLoadingTickets: (loading: boolean) => void;
  setLoadingMessages: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  tickets: [],
  selectedTicket: null,
  messages: [],
  isLoadingTickets: false,
  isLoadingMessages: false,
  filters: {},

  setTickets: (tickets) => set({ tickets }),

  selectTicket: (ticket) => {
    set({ selectedTicket: ticket, messages: [] });
  },

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessage: (messageId, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
      ),
    })),

  updateTicket: (ticketId, updates) =>
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, ...updates } : t
      ),
      selectedTicket:
        state.selectedTicket?.id === ticketId
          ? { ...state.selectedTicket, ...updates }
          : state.selectedTicket,
    })),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  setLoadingTickets: (loading) => set({ isLoadingTickets: loading }),
  setLoadingMessages: (loading) => set({ isLoadingMessages: loading }),
}));

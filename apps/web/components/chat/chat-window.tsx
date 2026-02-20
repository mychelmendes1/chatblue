"use client";

import React, { useEffect, useRef, useState, Component, ErrorInfo, ReactNode, useCallback } from "react";
import {
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Send,
  Smile,
  Bot,
  UserPlus,
  Check,
  CheckCheck,
  AtSign,
  MessageSquare,
  CheckCircle,
  Loader2,
  Clock,
  AlertCircle,
  X,
  FileIcon,
  Image as ImageIcon,
  Film,
  Music,
  Reply,
  CornerDownRight,
  RotateCcw,
  Trash2,
  Heart,
  ThumbsUp,
  Mic,
  Square,
  FileText,
  ArrowLeft,
  CalendarClock,
  Calendar,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn, formatPhone, getStatusLabel } from "@/lib/utils";
import { useChatStore } from "@/stores/chat.store";
import { useSocket } from "@/components/providers/socket-provider";
import { api } from "@/lib/api";
import { TemplateSelector } from "@/components/chat/template-selector";
import { useToast } from "@/components/ui/use-toast";

/** Retorna chave YYYY-MM-DD para comparar se duas datas são do mesmo dia */
function getDayKey(createdAt: string): string {
  const d = new Date(createdAt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Rótulo de data para separador (Hoje, Ontem, ou data formatada) */
function getMessageDateLabel(createdAt: string): string {
  const d = new Date(createdAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

/** Data + hora para exibir na bolha (ex.: "Hoje, 14:32" ou "20/02/2025 14:32") */
function getMessageDateTime(createdAt: string): string {
  const d = new Date(createdAt);
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const label = getMessageDateLabel(createdAt);
  if (label === "Hoje" || label === "Ontem") return `${label}, ${time}`;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })} ${time}`;
}

interface User {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
}

interface ChatWindowProps {
  ticket: any;
  onShowContactInfo: () => void;
  onMobileBack?: () => void;
}

// Error boundary for message rendering
interface MessageErrorBoundaryState {
  hasError: boolean;
}

class MessageErrorBoundary extends Component<
  { children: ReactNode; messageId?: string },
  MessageErrorBoundaryState
> {
  constructor(props: { children: ReactNode; messageId?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): MessageErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[MessageErrorBoundary] Error rendering message:", {
      messageId: this.props.messageId,
      error: error.message,
      stack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex justify-center my-2">
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs px-3 py-1 rounded">
            Erro ao carregar mensagem
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ChatWindow({ ticket, onShowContactInfo, onMobileBack }: ChatWindowProps) {
  // Subscribe to messages - show current ticket or full contact history when historyTicketIds is set
  const allMessages = useChatStore((state) => state.messages);
  const messages = allMessages.filter((m) => {
    if (!m.ticketId) return true;
    if (historyTicketIds.length > 0) return historyTicketIds.includes(m.ticketId);
    return m.ticketId === ticket.id;
  });
  const { setMessages, addMessage, setLoadingMessages, markTicketAsRead } = useChatStore();
  const store = useChatStore.getState();
  const { socket } = useSocket();
  
  // Debug: log when messages change
  useEffect(() => {
    console.log("[ChatWindow] Messages updated, count:", messages.length, "ticketId:", ticket.id);
  }, [messages.length, ticket.id]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // Mention states
  const [users, setUsers] = useState<User[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [selectedMentions, setSelectedMentions] = useState<User[]>([]);
  const [isInternalMode, setIsInternalMode] = useState(false);

  // File upload states
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<any>(null);

  // Mensagens pré-definidas (atalhos /xxx)
  const [predefinedMessages, setPredefinedMessages] = useState<Array<{ id: string; shortcut: string; name: string | null; content: string }>>([]);
  const [showPredefinedList, setShowPredefinedList] = useState(false);
  const [predefinedFilter, setPredefinedFilter] = useState("");
  const [selectedPredefinedIndex, setSelectedPredefinedIndex] = useState(0);
  const [showPredefinedCreateForm, setShowPredefinedCreateForm] = useState(false);
  const [predefinedCreateForm, setPredefinedCreateForm] = useState({ shortcut: "", name: "", content: "" });
  const [isCreatingPredefined, setIsCreatingPredefined] = useState(false);

  // Messaging window state (for Meta Cloud API 24h rule)
  const [messagingWindow, setMessagingWindow] = useState<{
    isOpen: boolean;
    hoursRemaining: number | null;
    requiresTemplate: boolean;
  } | null>(null);

  // Template selector in chat (for Meta Cloud - send template without closing conversation)
  const [showTemplateSelectorInChat, setShowTemplateSelectorInChat] = useState(false);
  const { toast } = useToast();

  const contactName = ticket.contact?.name || formatPhone(ticket.contact?.phone);

  // Fetch users for mentions
  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await api.get<User[]>("/users?isActive=true");
        setUsers(response.data);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    }
    fetchUsers();
  }, []);

  // Fetch messaging window status for Meta Cloud connections
  useEffect(() => {
    async function fetchMessagingWindow() {
      if (!ticket.contact?.id) return;
      
      try {
        const response = await api.get<{
          isOpen: boolean;
          hoursRemaining: number | null;
          requiresTemplate: boolean;
        }>(`/contacts/${ticket.contact.id}/messaging-window`);
        setMessagingWindow(response.data);
      } catch (error) {
        // Silently fail - not critical
        console.debug("Could not fetch messaging window:", error);
      }
    }
    
    fetchMessagingWindow();
    // Refresh every 5 minutes
    const interval = setInterval(fetchMessagingWindow, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [ticket.contact?.id]);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [messagePage, setMessagePage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [historyTicketIds, setHistoryTicketIds] = useState<string[]>([]);
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom function - improved version
  const scrollToBottom = useCallback((force = false) => {
    // Use multiple attempts with delays to ensure it works
    const attemptScroll = (attempt = 0) => {
      if (attempt > 3) return; // Max 3 attempts
      
      requestAnimationFrame(() => {
        // Try scrolling the scroll area container directly (most reliable for Radix UI)
        if (scrollAreaRef.current) {
          const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
          if (scrollContainer) {
            const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
            // Force immediate scroll to bottom
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
            
            // Verify it scrolled (if not, try again)
            if (scrollContainer.scrollTop < maxScroll - 10 && attempt < 3) {
              setTimeout(() => attemptScroll(attempt + 1), 50);
              return;
            }
            
            // If force=false, also apply smooth scroll
            if (!force && attempt === 0) {
              scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: "smooth" });
            }
          }
        }
        
        // Also try scrollIntoView as backup
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: force ? "auto" : "smooth", block: "end", inline: "nearest" });
        }
      });
    };
    
    attemptScroll();
  }, []);

  useEffect(() => {
    setHistoryTicketIds([]);
    fetchMessages();

    // Join ticket room for real-time updates
    if (socket) {
      console.log("[ChatWindow] Joining ticket room:", ticket.id);
      socket.emit("ticket:join", ticket.id);
      // Verify join after a short delay
      setTimeout(() => {
        console.log("[ChatWindow] Socket connected?", socket?.connected, "Ticket ID:", ticket.id);
      }, 500);
    }

    // Focus on input when opening a conversation
    setTimeout(() => {
      inputRef.current?.focus();
      // Scroll to bottom after initial load - use force to ensure it goes to bottom
      setTimeout(() => scrollToBottom(true), 400);
    }, 100);

    return () => {
      if (socket) {
        socket.emit("ticket:leave", ticket.id);
      }
    };
  }, [ticket.id, socket]);
  
  // Cleanup recording when component unmounts or recording stops
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Track previous message count and last message ID to detect new messages
  const prevMessageCountRef = useRef(messages.length);
  const lastMessageIdRef = useRef(messages.length > 0 ? messages[messages.length - 1]?.id : null);
  
  useEffect(() => {
    // Check if a new message was added (count increased OR last message ID changed)
    const currentLastMessageId = messages.length > 0 ? messages[messages.length - 1]?.id : null;
    const messageCountIncreased = messages.length > prevMessageCountRef.current;
    const lastMessageChanged = currentLastMessageId !== lastMessageIdRef.current;
    
    prevMessageCountRef.current = messages.length;
    lastMessageIdRef.current = currentLastMessageId;
    
    // Scroll to bottom on new messages (only if not loading older messages)
    if (!isLoadingOlderMessages && messages.length > 0 && (messageCountIncreased || lastMessageChanged)) {
      // Use multiple timeouts to ensure DOM is fully updated
      const timeoutId1 = setTimeout(() => {
        scrollToBottom(false);
      }, 100);
      const timeoutId2 = setTimeout(() => {
        scrollToBottom(false);
      }, 300);
      const timeoutId3 = setTimeout(() => {
        scrollToBottom(true); // Force scroll on last attempt
      }, 500);
      
      return () => {
        clearTimeout(timeoutId1);
        clearTimeout(timeoutId2);
        clearTimeout(timeoutId3);
      };
    }
  }, [messages.length, isLoadingOlderMessages, scrollToBottom]);

  // Reset pagination when ticket changes
  useEffect(() => {
    setMessagePage(1);
    setHasMoreMessages(false);
  }, [ticket.id]);

  // Carregar mensagens pré-definidas (atalhos /xxx)
  useEffect(() => {
    api.get<Array<{ id: string; shortcut: string; name: string | null; content: string }>>("/predefined-messages")
      .then((res) => setPredefinedMessages(res.data || []))
      .catch(() => setPredefinedMessages([]));
  }, []);

  async function fetchMessages(resetPage = true) {
    console.log("[ChatWindow] fetchMessages called for ticket:", ticket.id);
    const pageToFetch = resetPage ? 1 : messagePage + 1;
    
    if (!resetPage) {
      setIsLoadingOlderMessages(true);
    } else {
      setLoadingMessages(true);
    }
    
    try {
      const [response] = await Promise.all([
        api.get<{ messages: any[]; pagination: any; ticketIds?: string[] }>(
          `/messages/ticket/${ticket.id}?page=${pageToFetch}&limit=100&includeHistory=contact`
        ),
        resetPage ? api.post(`/messages/ticket/${ticket.id}/read`) : Promise.resolve(),
      ]);
      
      console.log("[ChatWindow] fetchMessages got", response.data.messages.length, "messages, page:", pageToFetch);
      
      const rawMessages = response.data.messages || [];
      const messagesWithTicketId = rawMessages.map((msg: any) => ({
        ...msg,
        ticketId: msg.ticketId ?? msg.ticket?.id ?? ticket.id,
      }));
      
      if (resetPage) {
        setMessages(messagesWithTicketId);
        setMessagePage(1);
        setHasMoreMessages(response.data.pagination?.hasMore || false);
        if (Array.isArray(response.data.ticketIds) && response.data.ticketIds.length > 0) {
          setHistoryTicketIds(response.data.ticketIds);
        }
      } else {
        const currentMessages = store.messages;
        setMessages([...messagesWithTicketId, ...currentMessages]);
        setMessagePage(pageToFetch);
        setHasMoreMessages(response.data.pagination?.hasMore || false);
      }
      
      // Update the unread counter in the sidebar (only on first load)
      if (resetPage) {
        markTicketAsRead(ticket.id);
      }
    } catch (error) {
      console.error("[ChatWindow] Failed to fetch messages:", error);
    } finally {
      setLoadingMessages(false);
      setIsLoadingOlderMessages(false);
    }
  }

  async function loadOlderMessages() {
    if (!hasMoreMessages || isLoadingOlderMessages) return;
    await fetchMessages(false); // Don't reset page, load next page
  }

  // Handle message input change
  function handleMessageChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setNewMessage(value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 160; // max-h-40 in pixels (10rem = 160px)
    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;

    // Check for / predefined message trigger
    const lastSlashAt = value.lastIndexOf("/");
    if (lastSlashAt !== -1) {
      const textAfterSlash = value.substring(lastSlashAt + 1);
      if (!textAfterSlash.includes(" ") && !textAfterSlash.includes("\n")) {
        setPredefinedFilter(textAfterSlash.toLowerCase());
        setShowPredefinedList(true);
        setSelectedPredefinedIndex(0);
      } else {
        setShowPredefinedList(false);
      }
    } else {
      setShowPredefinedList(false);
    }

    // Check for @ mention trigger (only when @ is at start or preceded by space, e.g. not in "email@domain.com")
    const lastAtIndex = value.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const isMentionTrigger = lastAtIndex === 0 || value[lastAtIndex - 1] === " ";
      const textAfterAt = value.substring(lastAtIndex + 1);
      if (isMentionTrigger && !textAfterAt.includes(" ")) {
        setMentionFilter(textAfterAt.toLowerCase());
        setShowMentions(true);
        setIsInternalMode(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
      if (selectedMentions.length === 0) {
        setIsInternalMode(false);
      }
    }
  }

  // Mensagens pré-definidas filtradas por atalho
  const filteredPredefined = predefinedMessages.filter((msg) =>
    msg.shortcut.toLowerCase().startsWith(predefinedFilter)
  );

  // Manter índice selecionado dentro do range quando a lista filtrada mudar
  useEffect(() => {
    if (showPredefinedList && filteredPredefined.length > 0 && selectedPredefinedIndex >= filteredPredefined.length) {
      setSelectedPredefinedIndex(0);
    }
  }, [showPredefinedList, filteredPredefined.length, selectedPredefinedIndex]);

  function handleSelectPredefined(msg: { shortcut: string; content: string }) {
    const lastSlashAt = newMessage.lastIndexOf("/");
    const before = newMessage.substring(0, lastSlashAt);
    setNewMessage(before + msg.content);
    setShowPredefinedList(false);
    setPredefinedFilter("");
    inputRef.current?.focus();
  }

  function handleClosePredefinedList() {
    setShowPredefinedList(false);
    setPredefinedFilter("");
  }

  const shortcutRegex = /^[a-z0-9_-]+$/i;
  async function handleCreatePredefinedMessage() {
    const shortcut = predefinedCreateForm.shortcut.trim().toLowerCase();
    const name = predefinedCreateForm.name.trim() || null;
    const content = predefinedCreateForm.content.trim();
    if (!shortcut || !content) {
      toast({ title: "Preencha atalho e conteúdo", variant: "destructive" });
      return;
    }
    if (!shortcutRegex.test(shortcut)) {
      toast({ title: "Atalho só pode conter letras, números, _ e -", variant: "destructive" });
      return;
    }
    setIsCreatingPredefined(true);
    try {
      const res = await api.post<{ id: string; shortcut: string; name: string | null; content: string }>("/predefined-messages", {
        shortcut,
        name,
        content,
      });
      setPredefinedMessages((prev) => [...prev, res.data].sort((a, b) => a.shortcut.localeCompare(b.shortcut)));
      setPredefinedCreateForm({ shortcut: "", name: "", content: "" });
      setShowPredefinedCreateForm(false);
      toast({ title: "Mensagem pré-definida criada" });
    } catch (error: any) {
      const status = error?.response?.status;
      const msg = error?.response?.data?.message ?? error?.response?.data?.error ?? error?.message;
      if (status === 403) {
        toast({ title: "Apenas administradores podem criar mensagens pré-definidas.", variant: "destructive" });
      } else {
        toast({ title: msg || "Erro ao criar mensagem pré-definida", variant: "destructive" });
      }
    } finally {
      setIsCreatingPredefined(false);
    }
  }

  // Handle Enter key: send message if Enter alone, new line if Shift+Enter
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showPredefinedList && filteredPredefined.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedPredefinedIndex((i) => Math.min(i + 1, filteredPredefined.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedPredefinedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSelectPredefined(filteredPredefined[selectedPredefinedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowPredefinedList(false);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
      // Reset textarea height after sending
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    }
    // Shift+Enter will default to new line (default behavior)
  }

  // Select a user mention
  function handleSelectMention(user: User) {
    const lastAtIndex = newMessage.lastIndexOf("@");
    const newText = newMessage.substring(0, lastAtIndex) + `@${user.name} `;
    setNewMessage(newText);
    setSelectedMentions([...selectedMentions, user]);
    setShowMentions(false);
    setMentionFilter("");
    inputRef.current?.focus();
  }

  // Filter users for mention dropdown
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(mentionFilter) &&
      !selectedMentions.some((m) => m.id === user.id)
  );

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    
    // If there's a file selected, send it
    if (selectedFile) {
      await handleSendFile();
      return;
    }
    
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const response = await api.post<any>(`/messages/ticket/${ticket.id}`, {
        content: newMessage.trim(),
        type: "TEXT",
        isInternal: isInternalMode,
        mentionedUserIds: selectedMentions.map((u) => u.id),
        quotedId: replyingTo?.id,
      });
      // Ensure message has ticketId before adding
      const messageWithTicketId = {
        ...response.data,
        ticketId: ticket.id,
      };
      addMessage(messageWithTicketId);
      setNewMessage("");
      setSelectedMentions([]);
      setIsInternalMode(false);
      setReplyingTo(null);
      // Scroll after sending
      setTimeout(() => scrollToBottom(false), 150);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  }

  // Handle file selection
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  // Process selected file
  function processFile(file: File) {
    // Validate file size (max 16MB)
    if (file.size > 16 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo 16MB.");
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  }

  // Handle drag events
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  // Handle paste - detect clipboard images
  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // Check if the pasted item is an image
      if (item.type.startsWith("image/")) {
        e.preventDefault(); // Prevent pasting as text
        const file = item.getAsFile();
        if (file) {
          // Create a named file since clipboard images come as "image.png"
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const extension = item.type.split("/")[1] || "png";
          const namedFile = new File([file], `imagem-colada-${timestamp}.${extension}`, {
            type: item.type,
          });
          processFile(namedFile);
          inputRef.current?.focus();
        }
        return; // Only process the first image
      }
    }
    // If no image found, let the default paste behavior handle text
  }

  // Cancel file selection
  function handleCancelFile() {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Get media type from file
  function getMediaType(file: File): string {
    if (file.type.startsWith("image/")) return "IMAGE";
    if (file.type.startsWith("video/")) return "VIDEO";
    if (file.type.startsWith("audio/")) return "AUDIO";
    return "DOCUMENT";
  }

  // Send file — accepts optional `fileOverride` so callers (e.g. audio recorder)
  // don't depend on the async React state update of `selectedFile`.
  async function handleSendFile(fileOverride?: File) {
    const fileToSend = fileOverride || selectedFile;
    if (!fileToSend || isUploading) return;

    setIsUploading(true);
    try {
      // Create FormData
      const formData = new FormData();
      formData.append("file", fileToSend);
      formData.append("ticketId", ticket.id);
      formData.append("mediaType", getMediaType(fileToSend));
      if (newMessage.trim()) {
        formData.append("caption", newMessage.trim());
      }

      // Upload file
      const token = localStorage.getItem("chatblue-auth");
      const accessToken = token ? JSON.parse(token).state?.accessToken : null;
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/upload/message`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const data = await response.json();
      console.log("[handleSendFile] Response from API:", { mediaUrl: data.mediaUrl, type: data.type, id: data.id });
      // Ensure message has ticketId before adding
      const messageWithTicketId = {
        ...data,
        ticketId: ticket.id,
      };
      console.log("[handleSendFile] Adding message with mediaUrl:", messageWithTicketId.mediaUrl);
      addMessage(messageWithTicketId);
      
      // Clear file and message
      handleCancelFile();
      setNewMessage("");
      setTimeout(() => scrollToBottom(false), 150);
    } catch (error) {
      console.error("Failed to send file:", error);
      alert("Erro ao enviar arquivo. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  }

  // Send template from open conversation (Meta Cloud API - 24h window)
  async function handleSendTemplateFromChat(template: any, variables: Record<string, string>) {
    if (!ticket.connection?.id) return;
    const templateVars = Object.keys(variables);
    const isNamedParams = templateVars.length > 0 && templateVars.some((v) => isNaN(parseInt(v)));
    let bodyParameters: Array<{ type: "text"; text: string; parameter_name?: string }>;
    if (isNamedParams) {
      bodyParameters = templateVars.map((v) => ({
        type: "text" as const,
        parameter_name: v,
        text: variables[v],
      }));
    } else {
      const sortedVars = [...templateVars].sort((a, b) => parseInt(a) - parseInt(b));
      bodyParameters = sortedVars.map((v) => ({
        type: "text" as const,
        text: variables[v],
      }));
    }
    const components = bodyParameters.length > 0 ? [{ type: "body" as const, parameters: bodyParameters }] : [];
    try {
      const response = await api.post<any>("/messages/template", {
        ticketId: ticket.id,
        templateName: template.name,
        languageCode: template.language,
        components,
      });
      const messageWithTicketId = { ...response.data, ticketId: ticket.id };
      addMessage(messageWithTicketId);
      setShowTemplateSelectorInChat(false);
      toast({ title: "Template enviado" });
      setTimeout(() => scrollToBottom(false), 150);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar template",
        description: error?.response?.data?.error || error?.message || "Falha ao enviar template",
        variant: "destructive",
      });
    }
  }

  // Start audio recording
  async function handleStartRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Try to use OGG/Opus format for better WhatsApp compatibility
      // Fallback to WebM if OGG is not supported
      const options = {
        mimeType: MediaRecorder.isTypeSupported('audio/ogg; codecs=opus') 
          ? 'audio/ogg; codecs=opus' 
          : MediaRecorder.isTypeSupported('audio/webm; codecs=opus')
          ? 'audio/webm; codecs=opus'
          : undefined
      };
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Determine file extension based on mimeType
      const fileExtension = options.mimeType?.includes('ogg') ? 'ogg' : 'webm';
      const mimeType = options.mimeType || 'audio/webm';
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        // Use OGG extension if available, otherwise WebM
        const audioFile = new File([audioBlob], `audio-${Date.now()}.${fileExtension}`, { type: mimeType });
        setSelectedFile(audioFile);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Auto send after recording stops — pass file directly to avoid
        // React state race condition (setSelectedFile is async)
        if (audioChunksRef.current.length > 0) {
          await handleSendFile(audioFile);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Erro ao acessar o microfone. Verifique as permissões.");
    }
  }
  
  // Stop audio recording
  function handleStopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingTime(0);
    }
  }
  
  // Format recording time
  function formatRecordingTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Common emojis
  const commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
    '🤧', '🥵', '🥶', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐',
    '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧',
    '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓',
    '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀',
    '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺',
    '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '❤️', '🧡',
    '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
    '💞', '💓', '💗', '💖', '💘', '💝', '💟', '👍', '👎', '👊',
    '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏',
    '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖',
    '👏', '🙌', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵',
    '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅',
    '👄', '💋', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔',
    '👩', '🧓', '👴', '👵', '🙍', '🙎', '🙅', '🙆', '💁', '🙋',
    '🧏', '🤦', '🤷', '🙇', '🤦‍♂️', '🤦‍♀️', '🙎‍♂️', '🙎‍♀️', '🙍‍♂️', '🙍‍♀️',
  ];
  
  // Insert emoji into message
  function handleEmojiSelect(emoji: string) {
    setNewMessage(newMessage + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  }
  
  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showEmojiPicker]);

  async function handleTakeover() {
    try {
      await api.post(`/tickets/${ticket.id}/takeover`);
    } catch (error) {
      console.error("Failed to takeover:", error);
    }
  }

  const [isClosing, setIsClosing] = useState(false);

  // Modal states for resolve and snooze
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [snoozeReason, setSnoozeReason] = useState("");
  const [snoozeDate, setSnoozeDate] = useState("");

  function handleResolve() {
    setShowResolveModal(true);
  }

  async function handleConfirmResolve() {
    if (isClosing) return;
    setIsClosing(true);
    try {
      await api.post(`/tickets/${ticket.id}/resolve`, {
        resolutionNote: resolutionNote.trim() || undefined,
      });
      // The server will generate the AI summary and emit socket events
      setShowResolveModal(false);
      setResolutionNote("");
    } catch (error) {
      console.error("Failed to resolve ticket:", error);
    } finally {
      setIsClosing(false);
    }
  }

  function handleSnooze() {
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    setSnoozeDate(tomorrow.toISOString().slice(0, 16));
    setShowSnoozeModal(true);
  }

  async function handleConfirmSnooze() {
    if (isClosing || !snoozeReason.trim() || !snoozeDate) return;
    setIsClosing(true);
    try {
      await api.post(`/tickets/${ticket.id}/snooze`, {
        reason: snoozeReason.trim(),
        snoozedUntil: new Date(snoozeDate).toISOString(),
      });
      setShowSnoozeModal(false);
      setSnoozeReason("");
      setSnoozeDate("");
    } catch (error) {
      console.error("Failed to snooze ticket:", error);
    } finally {
      setIsClosing(false);
    }
  }

  async function handleReopen() {
    if (isClosing) return;
    setIsClosing(true);
    try {
      await api.post(`/tickets/${ticket.id}/reopen`);
      // The server will emit socket events
    } catch (error) {
      console.error("Failed to reopen ticket:", error);
    } finally {
      setIsClosing(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header - fixed height */}
      <div className="flex items-center justify-between px-2 md:px-4 py-2 md:py-3 border-b bg-card flex-shrink-0 h-14 md:h-16">
        <div className="flex items-center gap-2 md:gap-3">
          {/* Mobile back button */}
          {onMobileBack && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-10 w-10 -ml-1"
              onClick={onMobileBack}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <Avatar className="w-9 h-9 md:w-10 md:h-10 cursor-pointer" onClick={onShowContactInfo}>
            <AvatarImage src={ticket.contact?.avatar} />
            <AvatarFallback>
              {contactName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 md:gap-2 flex-wrap">
              <h3 className="font-medium text-sm md:text-base truncate max-w-[120px] md:max-w-none">{contactName}</h3>
              {ticket.isAIHandled && (
                <span className="flex items-center gap-1 text-[10px] md:text-xs bg-purple-100 text-purple-700 px-1.5 md:px-2 py-0.5 rounded">
                  <Bot className="w-3 h-3" />
                  <span className="hidden md:inline">IA</span>
                </span>
              )}
              {messagingWindow && (
                messagingWindow.isOpen ? (
                  <span className="flex items-center gap-1 text-[10px] md:text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 md:px-2 py-0.5 rounded" title={`Janela de 24h aberta - ${messagingWindow.hoursRemaining}h restantes`}>
                    <Clock className="w-3 h-3" />
                    <span className="hidden md:inline">{messagingWindow.hoursRemaining}h</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] md:text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 md:px-2 py-0.5 rounded" title="Janela de 24h fechada - Use templates">
                    <AlertCircle className="w-3 h-3" />
                    <span className="hidden md:inline">Template</span>
                  </span>
                )
              )}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground truncate">
              <span className="font-mono text-primary" title="Número do ticket para busca">#{ticket.protocol}</span>
              <span className="mx-1">•</span>
              {ticket.contact?.phone} • {getStatusLabel(ticket.status)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {ticket.connection?.name && (
            <span
              className="text-[10px] md:text-xs text-muted-foreground bg-muted/80 dark:bg-muted/50 px-1.5 md:px-2 py-0.5 rounded truncate max-w-[80px] md:max-w-[140px]"
              title={ticket.connection.name}
            >
              {ticket.connection.name}
            </span>
          )}
          {ticket.isAIHandled && (
            <Button onClick={handleTakeover} variant="default" size="sm" className="h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm">
              <UserPlus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Assumir</span>
              <span className="md:hidden">IA</span>
            </Button>
          )}
          {ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? (
            <Button 
              onClick={handleReopen} 
              variant="outline" 
              size="sm"
              disabled={isClosing}
              className="text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700 h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm"
            >
              {isClosing ? (
                <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              )}
              <span className="hidden md:inline">Reabrir</span>
              <span className="md:hidden">Abrir</span>
            </Button>
          ) : (
            <>
              <Button
                onClick={handleResolve}
                variant="outline"
                size="sm"
                disabled={isClosing}
                className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700 h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm"
              >
                {isClosing ? (
                  <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                )}
                <span className="hidden md:inline">Resolver</span>
                <span className="md:hidden">OK</span>
              </Button>
              {/* Adiar - hidden on mobile */}
              <Button
                onClick={handleSnooze}
                variant="outline"
                size="sm"
                disabled={isClosing}
                className="hidden md:inline-flex text-amber-600 border-amber-600 hover:bg-amber-50 hover:text-amber-700"
              >
                {isClosing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CalendarClock className="w-4 h-4 mr-2" />
                )}
                Adiar
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="hidden md:inline-flex">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={onShowContactInfo}>
            <MoreVertical className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea 
        ref={scrollAreaRef}
        className={cn(
          "flex-1 min-h-0 p-2 md:p-4 bg-muted/30 relative overflow-x-hidden",
          isDragging && "bg-primary/5"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-card px-4 md:px-6 py-3 md:py-4 rounded-lg shadow-lg flex items-center gap-2 md:gap-3">
              <Paperclip className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              <span className="text-base md:text-lg font-medium">Solte o arquivo aqui</span>
            </div>
          </div>
        )}
        <div className="space-y-3 md:space-y-4 max-w-full md:max-w-3xl mx-auto">
          {/* Load older messages button */}
          {hasMoreMessages && (
            <div className="flex justify-center py-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadOlderMessages}
                disabled={isLoadingOlderMessages}
                className="text-xs"
                title="Carregar mensagens antigas"
              >
                {isLoadingOlderMessages ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  "Expandir"
                )}
              </Button>
            </div>
          )}
          
          {messages.map((message, index) => {
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const prevTicketId = prevMessage?.ticketId ?? null;
            const showSeparator = index > 0 && message?.ticketId && prevTicketId && message.ticketId !== prevTicketId;
            const protocol = (message as any)?.ticket?.protocol;
            const showDateSeparator =
              !prevMessage || getDayKey(prevMessage.createdAt) !== getDayKey(message.createdAt);
            return (
              <React.Fragment key={message?.id || index}>
                {showDateSeparator && (
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex-1 border-t border-border" />
                    <span className="text-[10px] md:text-xs text-muted-foreground px-2 font-medium">
                      {getMessageDateLabel(message.createdAt)}
                    </span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                )}
                {showSeparator && (
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex-1 border-t border-border" />
                    <span className="text-[10px] md:text-xs text-muted-foreground px-2">
                      Conversa anterior #{protocol || message.ticketId}
                    </span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                )}
                <MessageErrorBoundary key={message?.id || Math.random()} messageId={message?.id}>
                  <MessageBubble 
                    message={message} 
                    onReply={() => {
                      setReplyingTo(message);
                      inputRef.current?.focus();
                    }}
                  />
                </MessageErrorBoundary>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input - Fixed at bottom with explicit height */}
      <div className="relative flex-shrink-0 bg-card border-t">
        {/* Mention dropdown */}
        {showMentions && filteredUsers.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mx-4 mb-2 bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
            <div className="p-2 text-xs text-muted-foreground border-b">
              Mencionar usuário (mensagem interna)
            </div>
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelectMention(user)}
                className="w-full flex items-center gap-3 p-2 hover:bg-muted transition-colors text-left"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>
                    {user.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{user.name}</p>
                </div>
                {user.isOnline && (
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Reply preview */}
        {replyingTo && (
          <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-l-4 border-l-blue-500 border-blue-200 dark:border-blue-800">
            <Reply className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                Respondendo a {replyingTo.isFromMe ? "você" : (replyingTo.sender?.name || contactName)}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {replyingTo.type === "TEXT" 
                  ? replyingTo.content 
                  : replyingTo.type === "IMAGE" 
                    ? "📷 Imagem" 
                    : replyingTo.type === "AUDIO" 
                      ? "🎵 Áudio" 
                      : replyingTo.type === "VIDEO" 
                        ? "🎬 Vídeo" 
                        : "📄 Documento"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setReplyingTo(null)}
              className="text-muted-foreground hover:text-destructive h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Internal mode indicator */}
        {isInternalMode && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm">
            <MessageSquare className="w-4 h-4" />
            <span>Mensagem interna - não será enviada ao cliente</span>
            <button
              type="button"
              onClick={() => {
                setIsInternalMode(false);
                setSelectedMentions([]);
              }}
              className="ml-auto text-xs underline"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* File preview */}
        {selectedFile && (
          <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-t">
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
            ) : (
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                {getMediaType(selectedFile) === "VIDEO" && <Film className="w-8 h-8 text-muted-foreground" />}
                {getMediaType(selectedFile) === "AUDIO" && <Music className="w-8 h-8 text-muted-foreground" />}
                {getMediaType(selectedFile) === "DOCUMENT" && <FileIcon className="w-8 h-8 text-muted-foreground" />}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCancelFile}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          className="hidden"
        />

        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-1.5 md:gap-2 p-2 md:p-3 bg-card relative"
        >
          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-full left-0 mb-2 bg-background border rounded-lg shadow-lg p-3 w-64 md:w-80 h-64 overflow-y-auto z-50"
            >
              <div className="grid grid-cols-8 gap-1">
                {commonEmojis.slice(0, 200).map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleEmojiSelect(emoji)}
                    className="text-2xl hover:bg-muted rounded p-1 transition-colors"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <Button 
            type="button" 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          
          {/* Audio recording button */}
          {!isRecording ? (
            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0 hidden md:flex"
              onClick={handleStartRecording}
              title="Gravar áudio"
            >
              <Mic className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          ) : (
            <Button 
              type="button" 
              variant="destructive" 
              size="icon"
              className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0"
              onClick={handleStopRecording}
              title="Parar gravação"
            >
              <Square className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          )}
          
          {/* Recording time indicator */}
          {isRecording && (
            <span className="text-xs md:text-sm text-muted-foreground">
              {formatRecordingTime(recordingTime)}
            </span>
          )}
          <Button 
            type="button" 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          {ticket.connection?.type === "META_CLOUD" && ticket.connection?.id && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0"
              onClick={() => setShowTemplateSelectorInChat(true)}
              title="Enviar template (API oficial)"
            >
              <FileText className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          )}
          <Button 
            type="button" 
            variant={isInternalMode ? "default" : "ghost"} 
            size="icon"
            className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0 hidden md:flex"
            onClick={() => {
              setIsInternalMode(!isInternalMode);
              if (!isInternalMode) {
                setNewMessage(newMessage + "@");
                setShowMentions(true);
                setMentionFilter("");
                inputRef.current?.focus();
              }
            }}
            title="Mensagem interna com menção"
          >
            <AtSign className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <div className="flex-1 min-w-0 relative">
            <Textarea
              ref={inputRef}
              placeholder={isInternalMode ? "Interna... @mencione" : "Mensagem... (digite / para atalhos)"}
              value={newMessage}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              rows={1}
              className={cn("flex-1 min-w-0 min-h-[32px] md:min-h-[40px] max-h-32 md:max-h-40 text-sm md:text-base resize-none", isInternalMode && "border-amber-400 focus-visible:ring-amber-400")}
            />
            {showPredefinedList && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-background border rounded-lg shadow-lg max-h-[320px] overflow-y-auto z-50 py-1 flex flex-col">
                <div className="flex items-center justify-between px-3 py-1.5 text-xs text-muted-foreground border-b flex-shrink-0">
                  <span>Mensagens pré-definidas</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 -mr-1"
                    onClick={handleClosePredefinedList}
                    title="Fechar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="min-h-0 overflow-y-auto">
                  {filteredPredefined.length === 0 && !showPredefinedCreateForm ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum atalho encontrado</p>
                  ) : (
                    filteredPredefined.map((msg, i) => (
                      <button
                        key={msg.id}
                        type="button"
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex flex-col gap-0.5",
                          i === selectedPredefinedIndex && "bg-muted"
                        )}
                        onClick={() => handleSelectPredefined(msg)}
                      >
                        <span className="font-medium">
                          <code className="text-primary">/{msg.shortcut}</code>
                          {msg.name && <span className="text-muted-foreground ml-1">— {msg.name}</span>}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">{msg.content}</span>
                      </button>
                    ))
                  )}
                </div>
                <div className="border-t px-3 py-2 flex-shrink-0 space-y-2">
                  {showPredefinedCreateForm ? (
                    <>
                      <div className="space-y-1.5">
                        <Input
                          placeholder="ex: ola"
                          value={predefinedCreateForm.shortcut}
                          onChange={(e) => setPredefinedCreateForm((f) => ({ ...f, shortcut: e.target.value }))}
                          className="h-8 text-sm"
                        />
                        <Input
                          placeholder="Ex: Boas-vindas"
                          value={predefinedCreateForm.name}
                          onChange={(e) => setPredefinedCreateForm((f) => ({ ...f, name: e.target.value }))}
                          className="h-8 text-sm"
                        />
                        <Textarea
                          placeholder="Texto que será enviado ao usar /atalho"
                          value={predefinedCreateForm.content}
                          onChange={(e) => setPredefinedCreateForm((f) => ({ ...f, content: e.target.value }))}
                          rows={2}
                          className="text-sm min-h-[52px] resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => {
                            setShowPredefinedCreateForm(false);
                            setPredefinedCreateForm({ shortcut: "", name: "", content: "" });
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          disabled={isCreatingPredefined}
                          onClick={handleCreatePredefinedMessage}
                        >
                          {isCreatingPredefined ? <Loader2 className="w-3 h-3 animate-spin" /> : "Criar"}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => setShowPredefinedCreateForm(true)}
                    >
                      <Plus className="w-3 h-3 mr-1.5" />
                      Nova mensagem pré-definida
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
          <Button 
            type="submit" 
            size="icon" 
            className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0"
            disabled={(!newMessage.trim() && !selectedFile) || isSending || isUploading}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            ) : (
              <Send className="w-4 h-4 md:w-5 md:h-5" />
            )}
          </Button>
        </form>
      </div>

      {/* Template selector dialog (Meta Cloud - send template from open conversation) */}
      <Dialog open={showTemplateSelectorInChat} onOpenChange={setShowTemplateSelectorInChat}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Enviar template</DialogTitle>
            <DialogDescription>
              Escolha um template aprovado para enviar ao cliente. Use quando a janela de 24h estiver fechada.
            </DialogDescription>
          </DialogHeader>
          {ticket.connection?.id && (
            <TemplateSelector
              connectionId={ticket.connection.id}
              onSelect={handleSendTemplateFromChat}
              onCancel={() => setShowTemplateSelectorInChat(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Modal */}
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Resolver Conversa
            </DialogTitle>
            <DialogDescription>
              Adicione uma observação sobre a resolução desta conversa. Esta informação ficará salva como registro.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="resolution-note">Observação da Resolução</Label>
              <Textarea
                id="resolution-note"
                placeholder="Descreva como foi resolvido o atendimento..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowResolveModal(false);
                setResolutionNote("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmResolve}
              disabled={isClosing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isClosing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Resolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Snooze Modal */}
      <Dialog open={showSnoozeModal} onOpenChange={setShowSnoozeModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-amber-600" />
              Adiar Conversa
            </DialogTitle>
            <DialogDescription>
              Informe o motivo do adiamento e quando deseja que a conversa volte ao topo da lista.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="snooze-reason">Motivo do Adiamento *</Label>
              <Textarea
                id="snooze-reason"
                placeholder="Por que está adiando esta conversa?"
                value={snoozeReason}
                onChange={(e) => setSnoozeReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="snooze-date">Data de Retorno *</Label>
              <Input
                id="snooze-date"
                type="datetime-local"
                value={snoozeDate}
                onChange={(e) => setSnoozeDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-muted-foreground">
                A conversa voltará ao topo da lista nesta data e você será notificado.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSnoozeModal(false);
                setSnoozeReason("");
                setSnoozeDate("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSnooze}
              disabled={isClosing || !snoozeReason.trim() || !snoozeDate}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isClosing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CalendarClock className="w-4 h-4 mr-2" />
              )}
              Adiar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageBubble({ message, onReply }: { message: any; onReply: () => void }) {
  // Guard against undefined or malformed messages
  if (!message || !message.id) {
    console.warn("[MessageBubble] Invalid message received:", message);
    return null;
  }

  const isFromMe = message.isFromMe ?? false;
  const messageType = message.type || "TEXT";
  const isDeleted = !!message.deletedAt;
  const isAudioMessage =
    messageType === "AUDIO" ||
    /\.(ogg|mp3|m4a|webm)(\?|$)/i.test(message.mediaUrl || "");
  
  // Data e hora para exibição (estilo WhatsApp)
  let dateTime = "";
  try {
    dateTime = getMessageDateTime(message.createdAt);
  } catch (e) {
    dateTime = "--/-- ---- --:--";
  }

  // Handle delete message
  async function handleDeleteMessage() {
    if (!confirm("Tem certeza que deseja deletar esta mensagem? Ela será removida para todos.")) {
      return;
    }

    try {
      await api.delete(`/messages/${message.id}`);
      // The socket event will update the message
    } catch (error: any) {
      console.error("Failed to delete message:", error);
      alert(error?.response?.data?.error || "Erro ao deletar mensagem");
    }
  }

  // System messages have a special style
  if (messageType === "SYSTEM") {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-muted/80 text-muted-foreground text-xs px-4 py-2 rounded-full max-w-[80%] text-center">
          <span>{message.content || ""}</span>
          <span className="ml-2 opacity-70">{dateTime}</span>
        </div>
      </div>
    );
  }

  // Internal messages have a special style (yellow/amber background)
  if (message.isInternal) {
    return (
      <div className="flex justify-end my-2 group">
        <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 rounded-lg px-4 py-2 max-w-[80%]">
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 mb-1">
            <MessageSquare className="w-3 h-3" />
            <span>Mensagem interna</span>
            {message.sender && (
              <span className="font-medium">• {message.sender.name}</span>
            )}
          </div>
          <p className="whitespace-pre-wrap">{message.content}</p>
          <div className="flex justify-end mt-1">
            <span className="text-xs text-amber-600 dark:text-amber-400">{dateTime}</span>
          </div>
        </div>
      </div>
    );
  }

  // Quoted message display
  const QuotedMessage = () => {
    if (!message.quoted) return null;
    
    return (
      <div 
        className={cn(
          "mb-2 p-2 rounded border-l-2 text-sm",
          isFromMe 
            ? "bg-primary/10 border-l-primary/50" 
            : "bg-muted/50 border-l-muted-foreground/50"
        )}
      >
        <p className="text-xs font-medium text-muted-foreground mb-1">
          {message.quoted.isFromMe ? "Você" : "Contato"}
        </p>
        <p className="text-muted-foreground truncate">
          {message.quoted.type === "TEXT" 
            ? message.quoted.content 
            : message.quoted.type === "IMAGE" 
              ? "📷 Imagem" 
              : message.quoted.type === "AUDIO" 
                ? "🎵 Áudio" 
                : message.quoted.type === "VIDEO" 
                  ? "🎬 Vídeo" 
                  : "📄 Documento"}
        </p>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex group",
        isFromMe ? "justify-end" : "justify-start"
      )}
    >
      {/* Reply button for received messages (left side) */}
      {!isFromMe && (
        <button
          onClick={onReply}
          className="opacity-0 group-hover:opacity-100 transition-opacity self-center mr-2 p-1.5 rounded-full hover:bg-muted"
          title="Responder"
        >
          <Reply className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      <div
        className={cn(
          "message-bubble relative",
          isFromMe ? "message-bubble-sent" : "message-bubble-received",
          isDeleted && "opacity-60"
        )}
      >
        {message.isAIGenerated && (
          <div className="flex items-center gap-1 text-xs text-purple-600 mb-1">
            <Bot className="w-3 h-3" />
            <span>IA</span>
          </div>
        )}

        {/* Quoted message */}
        <QuotedMessage />

        {/* Deleted message indicator */}
        {isDeleted && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground italic mb-2">
            <AlertCircle className="w-3 h-3" />
            <span>Esta mensagem foi apagada</span>
          </div>
        )}

        {messageType === "TEXT" && (
          <div>
            <p className={cn("whitespace-pre-wrap", isDeleted && "line-through text-muted-foreground")}>
              {isDeleted ? "Esta mensagem foi apagada" : (message.content || "")}
            </p>
            {message.status === "FAILED" && message.failedReason && (
              <div className="flex items-center gap-2 text-xs text-destructive mt-2 p-2 bg-destructive/10 rounded">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{(message as any).translatedError || message.failedReason}</span>
              </div>
            )}
          </div>
        )}

        {!isDeleted && messageType === "IMAGE" && message.mediaUrl && (
          <div className="space-y-2">
            <img
              src={message.mediaUrl}
              alt=""
              className="max-w-[200px] md:max-w-[300px] rounded-md"
              crossOrigin="anonymous"
            />
            {(message.caption || message.content) && (
              <p className="text-sm whitespace-pre-wrap">{message.caption || message.content}</p>
            )}
          </div>
        )}

        {!isDeleted && messageType === "IMAGE" && !message.mediaUrl && (
          <div className="flex items-center gap-2 text-muted-foreground p-3 bg-muted/50 rounded-md">
            🖼️ Imagem (não disponível)
          </div>
        )}

        {!isDeleted && isAudioMessage && message.mediaUrl && (
          <div className="space-y-2">
            <audio controls src={message.mediaUrl} className="min-w-[250px] max-w-[360px] w-full h-10" crossOrigin="anonymous" preload="metadata" />
            {message.transcription && (
              <div className="text-sm bg-muted/30 p-2 rounded-md border-l-2 border-primary/50">
                <span className="text-xs text-muted-foreground block mb-1">Transcrição:</span>
                <p className="italic">{message.transcription}</p>
              </div>
            )}
          </div>
        )}

        {!isDeleted && messageType === "AUDIO" && !message.mediaUrl && (
          <div className="flex items-center gap-2 text-muted-foreground p-3 bg-muted/50 rounded-md">
            🎵 Áudio (não disponível)
            {message.transcription && (
              <div className="mt-2 text-sm">
                <span className="text-xs block mb-1">Transcrição:</span>
                <p className="italic">{message.transcription}</p>
              </div>
            )}
          </div>
        )}

        {!isDeleted && messageType === "VIDEO" && message.mediaUrl && (
          <div className="space-y-2">
            <video 
              controls 
              src={message.mediaUrl} 
              className="max-w-[200px] md:max-w-[300px] rounded-md"
              crossOrigin="anonymous"
            />
            {(message.caption || message.content) && (
              <p className="text-sm whitespace-pre-wrap">{message.caption || message.content}</p>
            )}
          </div>
        )}

        {!isDeleted && messageType === "VIDEO" && !message.mediaUrl && (
          <div className="flex items-center gap-2 text-muted-foreground p-3 bg-muted/50 rounded-md">
            🎬 Vídeo (não disponível)
          </div>
        )}

        {!isDeleted && messageType === "DOCUMENT" && message.mediaUrl && (
          <a
            href={message.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            📄 {message.content || "Documento"}
          </a>
        )}

        {!isDeleted && messageType === "DOCUMENT" && !message.mediaUrl && (
          <div className="flex items-center gap-2 text-muted-foreground p-3 bg-muted/50 rounded-md">
            📄 Documento (não disponível)
          </div>
        )}

        {/* Template messages */}
        {!isDeleted && messageType === "TEMPLATE" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <FileText className="w-3 h-3" />
              <span>Mensagem de template</span>
            </div>
            <p className="whitespace-pre-wrap">{message.content || "[Template enviado]"}</p>
            {message.status === "FAILED" && message.failedReason && (
              <div className="flex items-center gap-2 text-xs text-destructive mt-2 p-2 bg-destructive/10 rounded">
                <AlertCircle className="w-3 h-3" />
                <span>{message.failedReason}</span>
              </div>
            )}
          </div>
        )}

        {/* Reactions */}
        {message.reactions && Array.isArray(message.reactions) && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.reactions.map((reaction: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs"
                title={`${reaction.userName}: ${reaction.emoji}`}
              >
                <span>{reaction.emoji}</span>
                {message.reactions!.filter((r: any) => r.emoji === reaction.emoji).length > 1 && (
                  <span className="text-[10px]">
                    {message.reactions!.filter((r: any) => r.emoji === reaction.emoji).length}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <div
          className={cn(
            "flex items-center gap-1 mt-1",
            isFromMe ? "justify-end" : "justify-start"
          )}
        >
          <span className="text-xs text-muted-foreground">{dateTime}</span>
          {isFromMe && <MessageStatus status={message.status} />}
        </div>
      </div>

      {/* Delete button for sent messages */}
      {isFromMe && !isDeleted && (
        <button
          onClick={handleDeleteMessage}
          className="opacity-0 group-hover:opacity-100 transition-opacity self-center ml-2 p-1.5 rounded-full hover:bg-destructive/10 text-destructive"
          title="Deletar mensagem"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {/* Reply button for sent messages (right side) */}
      {isFromMe && (
        <button
          onClick={onReply}
          className="opacity-0 group-hover:opacity-100 transition-opacity self-center ml-2 p-1.5 rounded-full hover:bg-muted"
          title="Responder"
        >
          <Reply className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

// Message status indicator component
function MessageStatus({ status }: { status: string }) {
  switch (status) {
    case "PENDING":
      return (
        <span className="text-muted-foreground" title="Enviando...">
          <Clock className="w-4 h-4" />
        </span>
      );
    case "SENT":
      return (
        <span className="text-muted-foreground" title="Enviada">
          <Check className="w-4 h-4" />
        </span>
      );
    case "DELIVERED":
      return (
        <span className="text-muted-foreground" title="Entregue">
          <CheckCheck className="w-4 h-4" />
        </span>
      );
    case "READ":
      return (
        <span className="text-blue-500" title="Lida">
          <CheckCheck className="w-4 h-4" />
        </span>
      );
    case "FAILED":
      return (
        <span className="text-red-500" title="Falha no envio">
          <AlertCircle className="w-4 h-4" />
        </span>
      );
    default:
      return (
        <span className="text-muted-foreground" title={status}>
          <Check className="w-4 h-4" />
        </span>
      );
  }
}

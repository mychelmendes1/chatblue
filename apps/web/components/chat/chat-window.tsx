"use client";

import { useEffect, useRef, useState, Component, ErrorInfo, ReactNode, useCallback } from "react";
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
  XCircle,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatPhone, getStatusLabel } from "@/lib/utils";
import { useChatStore } from "@/stores/chat.store";
import { useSocket } from "@/components/providers/socket-provider";
import { api } from "@/lib/api";

interface User {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
}

interface ChatWindowProps {
  ticket: any;
  onShowContactInfo: () => void;
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

export function ChatWindow({ ticket, onShowContactInfo }: ChatWindowProps) {
  // Subscribe to messages to ensure re-renders on changes - filter by current ticket
  const allMessages = useChatStore((state) => state.messages);
  const messages = allMessages.filter((m) => !m.ticketId || m.ticketId === ticket.id);
  const { setMessages, addMessage, setLoadingMessages, markTicketAsRead } = useChatStore();
  const store = useChatStore.getState();
  const { socket } = useSocket();
  
  // Debug: log when messages change
  useEffect(() => {
    console.log("[ChatWindow] Messages updated, count:", messages.length, "ticketId:", ticket.id);
  }, [messages.length, ticket.id]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [messagePage, setMessagePage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  
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

  async function fetchMessages(resetPage = true) {
    console.log("[ChatWindow] fetchMessages called for ticket:", ticket.id);
    const pageToFetch = resetPage ? 1 : messagePage + 1;
    
    if (!resetPage) {
      setIsLoadingOlderMessages(true);
    } else {
      setLoadingMessages(true);
    }
    
    try {
      // Fetch messages and mark as read in parallel (only on first load)
      const [response] = await Promise.all([
        api.get<{ messages: any[]; pagination: any }>(`/messages/ticket/${ticket.id}?page=${pageToFetch}&limit=100`),
        resetPage ? api.post(`/messages/ticket/${ticket.id}/read`) : Promise.resolve(), // Mark as read only on first load
      ]);
      
      console.log("[ChatWindow] fetchMessages got", response.data.messages.length, "messages, page:", pageToFetch);
      
      // Ensure all messages have ticketId
      const messagesWithTicketId = response.data.messages.map((msg: any) => ({
        ...msg,
        ticketId: ticket.id,
      }));
      
      if (resetPage) {
        // First load: replace all messages
        setMessages(messagesWithTicketId);
        setMessagePage(1);
        setHasMoreMessages(response.data.pagination?.hasMore || false);
      } else {
        // Loading older messages: prepend to existing messages
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
  function handleMessageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setNewMessage(value);

    // Check for @ mention trigger
    const lastAtIndex = value.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const textAfterAt = value.substring(lastAtIndex + 1);
      // Check if there's no space after @, meaning user is typing a mention
      if (!textAfterAt.includes(" ")) {
        setMentionFilter(textAfterAt.toLowerCase());
        setShowMentions(true);
        setIsInternalMode(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
      // If no @ and no selected mentions, exit internal mode
      if (selectedMentions.length === 0) {
        setIsInternalMode(false);
      }
    }
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

  // Send file
  async function handleSendFile() {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    try {
      // Create FormData
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("ticketId", ticket.id);
      formData.append("mediaType", getMediaType(selectedFile));
      if (newMessage.trim()) {
        formData.append("caption", newMessage.trim());
      }

      // Upload file
      const token = localStorage.getItem("chatblue-auth");
      const accessToken = token ? JSON.parse(token).state?.accessToken : null;
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/upload/message`,
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
        
        // Auto send after recording stops
        if (audioChunksRef.current.length > 0) {
          await handleSendFile();
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

  async function handleResolve() {
    if (isClosing) return;
    setIsClosing(true);
    try {
      await api.post(`/tickets/${ticket.id}/resolve`);
      // The server will generate the AI summary and emit socket events
    } catch (error) {
      console.error("Failed to resolve ticket:", error);
    } finally {
      setIsClosing(false);
    }
  }

  async function handleClose() {
    if (isClosing) return;
    setIsClosing(true);
    try {
      await api.post(`/tickets/${ticket.id}/close`);
      // The server will generate the AI summary and emit socket events
    } catch (error) {
      console.error("Failed to close ticket:", error);
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 cursor-pointer" onClick={onShowContactInfo}>
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
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{contactName}</h3>
              {ticket.isAIHandled && (
                <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                  <Bot className="w-3 h-3" />
                  IA
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {ticket.contact?.phone} • {getStatusLabel(ticket.status)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ticket.isAIHandled && (
            <Button onClick={handleTakeover} variant="default" size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Assumir
            </Button>
          )}
          {ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? (
            <Button 
              onClick={handleReopen} 
              variant="outline" 
              size="sm"
              disabled={isClosing}
              className="text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700"
            >
              {isClosing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Reabrir
            </Button>
          ) : (
            <>
              <Button 
                onClick={handleResolve} 
                variant="outline" 
                size="sm"
                disabled={isClosing}
                className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
              >
                {isClosing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Resolver
              </Button>
              <Button 
                onClick={handleClose} 
                variant="outline" 
                size="sm"
                disabled={isClosing}
                className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
              >
                {isClosing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Encerrar
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onShowContactInfo}>
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea 
        ref={scrollAreaRef}
        className={cn(
          "flex-1 p-4 bg-muted/30 relative",
          isDragging && "bg-primary/5"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-card px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
              <Paperclip className="w-6 h-6 text-primary" />
              <span className="text-lg font-medium">Solte o arquivo aqui</span>
            </div>
          </div>
        )}
        <div className="space-y-4 max-w-3xl mx-auto">
          {/* Load older messages button */}
          {hasMoreMessages && (
            <div className="flex justify-center py-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadOlderMessages}
                disabled={isLoadingOlderMessages}
                className="text-xs"
              >
                {isLoadingOlderMessages ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  "Carregar mensagens antigas"
                )}
              </Button>
            </div>
          )}
          
          {messages
            .map((message) => (
              <MessageErrorBoundary key={message?.id || Math.random()} messageId={message?.id}>
                <MessageBubble 
                  message={message} 
                  onReply={() => {
                    setReplyingTo(message);
                    inputRef.current?.focus();
                  }}
                />
              </MessageErrorBoundary>
            ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="relative">
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
          className="flex items-center gap-2 p-4 border-t bg-card relative"
        >
          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-full left-0 mb-2 bg-background border rounded-lg shadow-lg p-3 w-80 h-64 overflow-y-auto z-50"
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
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile className="w-5 h-5" />
          </Button>
          
          {/* Audio recording button */}
          {!isRecording ? (
            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              onClick={handleStartRecording}
              title="Gravar áudio"
            >
              <Mic className="w-5 h-5" />
            </Button>
          ) : (
            <Button 
              type="button" 
              variant="destructive" 
              size="icon"
              onClick={handleStopRecording}
              title="Parar gravação"
              className="animate-pulse"
            >
              <Square className="w-5 h-5" />
            </Button>
          )}
          
          {/* Recording time indicator */}
          {isRecording && (
            <span className="text-sm text-muted-foreground">
              {formatRecordingTime(recordingTime)}
            </span>
          )}
          <Button 
            type="button" 
            variant="ghost" 
            size="icon"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <Button 
            type="button" 
            variant={isInternalMode ? "default" : "ghost"} 
            size="icon"
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
            <AtSign className="w-5 h-5" />
          </Button>
          <Input
            ref={inputRef}
            placeholder={isInternalMode ? "Mensagem interna... @mencione alguém" : "Digite uma mensagem..."}
            value={newMessage}
            onChange={handleMessageChange}
            className={cn("flex-1", isInternalMode && "border-amber-400 focus-visible:ring-amber-400")}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={(!newMessage.trim() && !selectedFile) || isSending || isUploading}
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </form>
      </div>
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
  
  // Safe date formatting
  let time = "";
  try {
    time = new Date(message.createdAt).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    time = "--:--";
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
          <span className="ml-2 opacity-70">{time}</span>
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
            <span className="text-xs text-amber-600 dark:text-amber-400">{time}</span>
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
          <p className={cn("whitespace-pre-wrap", isDeleted && "line-through text-muted-foreground")}>
            {isDeleted ? "Esta mensagem foi apagada" : (message.content || "")}
          </p>
        )}

        {!isDeleted && messageType === "IMAGE" && message.mediaUrl && (
          <div className="space-y-2">
            <img
              src={message.mediaUrl}
              alt=""
              className="max-w-[300px] rounded-md"
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

        {!isDeleted && messageType === "AUDIO" && message.mediaUrl && (
          <div className="space-y-2">
            <audio controls src={message.mediaUrl} className="max-w-[300px]" crossOrigin="anonymous" />
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
              className="max-w-[300px] rounded-md"
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
          <span className="text-xs text-muted-foreground">{time}</span>
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

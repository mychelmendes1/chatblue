export type MatchMode = "contains" | "exact" | "regex";

export type CommentEventStatus =
  | "RECEIVED"
  | "MATCHED"
  | "REPLIED"
  | "PRIVATE_SENT"
  | "USER_REPLIED"
  | "SKIPPED"
  | "FAILED";

export interface PrivateMessage {
  text: string;
  linkUrl?: string;
  buttonTitle?: string;
  imageUrl?: string;
}

export interface InstagramAutomation {
  id: string;
  name: string;
  isActive: boolean;
  mediaIds: string[];
  mediaTypes: string[];
  keywords: string[];
  matchMode: MatchMode;
  excludeReplies: boolean;
  publicReplies: string[];
  privateMessage: PrivateMessage;
  departmentId?: string | null;
  aiEnabled: boolean;
  oncePerUser: boolean;
  dailyLimit?: number | null;
  matchedCount: number;
  privateSentCount: number;
  userRepliedCount: number;
  createdAt: string;
  connection?: { id: string; name: string; instagramUsername?: string | null };
  _count?: { events: number };
}

export interface InstagramAutomationInput {
  connectionId: string;
  name: string;
  isActive: boolean;
  mediaIds: string[];
  mediaTypes: string[];
  keywords: string[];
  matchMode: MatchMode;
  excludeReplies: boolean;
  publicReplies: string[];
  privateMessage: PrivateMessage;
  departmentId: string | null;
  aiEnabled: boolean;
  oncePerUser: boolean;
  dailyLimit: number | null;
}

export interface InstagramCommentEvent {
  id: string;
  commentId: string;
  mediaId: string;
  mediaType?: string | null;
  fromIgId: string;
  fromUsername?: string | null;
  text: string;
  parentId?: string | null;
  status: CommentEventStatus;
  skipReason?: string | null;
  error?: string | null;
  publicReplyId?: string | null;
  privateReplyMessageId?: string | null;
  privateSentAt?: string | null;
  userRepliedAt?: string | null;
  ticketId?: string | null;
  createdAt: string;
  automation?: { id: string; name: string } | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InstagramMedia {
  id: string;
  caption?: string | null;
  mediaType?: string | null;
  mediaProductType?: string | null;
  thumbnailUrl?: string | null;
  permalink?: string | null;
  timestamp?: string | null;
}

export interface InstagramMediaPage {
  items: InstagramMedia[];
  paging?: { after: string | null } | null;
}

export interface InstagramStats {
  since?: string;
  last30Days: {
    total: number;
    byStatus: Partial<Record<CommentEventStatus, number>>;
  };
  automations: Array<{
    id: string;
    name: string;
    isActive: boolean;
    events: number;
    matched: number;
    privateSent: number;
    userReplied: number;
    replyRate: number;
  }>;
}

export interface TestMatchResult {
  matched: boolean;
  reason?: string | null;
  keyword?: string | null;
}

export interface InstagramConnectionOption {
  id: string;
  name: string;
  type: string;
  instagramUsername?: string | null;
  status?: string;
}

export interface DepartmentOption {
  id: string;
  name: string;
}

export const EVENT_STATUS_LABELS: Record<CommentEventStatus, string> = {
  RECEIVED: "Recebido",
  MATCHED: "Casou",
  REPLIED: "Respondido",
  PRIVATE_SENT: "DM enviada",
  USER_REPLIED: "Respondeu no Direct",
  SKIPPED: "Ignorado",
  FAILED: "Falhou",
};

export const EVENT_STATUS_CLASSES: Record<CommentEventStatus, string> = {
  RECEIVED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  MATCHED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  REPLIED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  PRIVATE_SENT: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  USER_REPLIED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  SKIPPED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export const MEDIA_TYPE_OPTIONS = [
  { value: "FEED", label: "Feed" },
  { value: "REELS", label: "Reels" },
  { value: "AD", label: "Anúncios" },
  { value: "LIVE", label: "Lives" },
];

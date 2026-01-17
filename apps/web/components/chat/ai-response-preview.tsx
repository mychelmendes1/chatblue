"use client";

import { useState } from "react";
import {
  Bot,
  Send,
  Edit3,
  X,
  Star,
  ExternalLink,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  AlertTriangle,
  FileText,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface Source {
  id: string;
  title: string;
  excerpt: string;
  score: number;
  sourceType: string;
  sourceName: string;
  url?: string;
}

interface AIResponsePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  queryId: string;
  response: string;
  category: string;
  confidence: number;
  sources: Source[];
  processingTime: number;
  hasKnowledgeGap: boolean;
  gapDescription?: string;
  onSend: (message: string, wasEdited: boolean) => void;
  onDiscard: () => void;
}

export function AIResponsePreview({
  isOpen,
  onClose,
  queryId,
  response,
  category,
  confidence,
  sources,
  processingTime,
  hasKnowledgeGap,
  gapDescription,
  onSend,
  onDiscard,
}: AIResponsePreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedResponse, setEditedResponse] = useState(response);
  const [rating, setRating] = useState<number | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [ratingComment, setRatingComment] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSend = async () => {
    const wasEdited = editedResponse !== response;

    // Send feedback in background
    try {
      await api.post(`/ai-assistant/query/${queryId}/feedback`, {
        wasUsed: true,
        wasEdited,
        editedResponse: wasEdited ? editedResponse : undefined,
        rating,
        ratingComment: ratingComment || undefined,
      });
    } catch (error) {
      console.error("Failed to send feedback:", error);
    }

    onSend(editedResponse, wasEdited);
    onClose();
  };

  const handleDiscard = async () => {
    // Send feedback that it was not used
    try {
      await api.post(`/ai-assistant/query/${queryId}/feedback`, {
        wasUsed: false,
        wasEdited: false,
        rating,
        ratingComment: ratingComment || undefined,
      });
    } catch (error) {
      console.error("Failed to send feedback:", error);
    }

    onDiscard();
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRating = async (value: number) => {
    setRating(value);
    setIsSendingFeedback(true);

    try {
      await api.post(`/ai-assistant/query/${queryId}/feedback`, {
        wasUsed: false, // Will be updated when actually sent
        wasEdited: false,
        rating: value,
      });
    } catch (error) {
      console.error("Failed to send rating:", error);
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const confidenceColor =
    confidence >= 0.8
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : confidence >= 0.5
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-600" />
            <span>Sugestão da IA</span>
            <Badge variant="outline" className="ml-2">
              {category}
            </Badge>
            <Badge className={cn("ml-1", confidenceColor)}>
              {Math.round(confidence * 100)}% confiança
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Knowledge Gap Warning */}
          {hasKnowledgeGap && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Possível lacuna no conhecimento
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  {gapDescription || "A IA pode não ter informações suficientes para responder com precisão."}
                </p>
              </div>
            </div>
          )}

          {/* Response Content */}
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Resposta sugerida
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 px-2"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="h-7 px-2"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {isEditing ? (
              <Textarea
                value={editedResponse}
                onChange={(e) => setEditedResponse(e.target.value)}
                className="min-h-[200px] resize-none"
                placeholder="Edite a resposta..."
              />
            ) : (
              <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                {editedResponse}
              </div>
            )}

            {editedResponse !== response && (
              <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                <Sparkles className="w-3 h-3" />
                <span>Resposta editada</span>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setEditedResponse(response)}
                  className="h-auto p-0 text-xs"
                >
                  Restaurar original
                </Button>
              </div>
            )}
          </div>

          {/* Sources */}
          {sources.length > 0 && (
            <div>
              <span className="text-sm font-medium text-muted-foreground mb-2 block">
                Fontes consultadas ({sources.length})
              </span>
              <div className="space-y-2">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-start gap-2 p-2 bg-background border rounded-lg"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {source.title}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {source.sourceName}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="text-xs"
                        >
                          {Math.round(source.score * 100)}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {source.excerpt}
                      </p>
                    </div>
                    {source.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(source.url, "_blank")}
                        className="h-7 w-7 p-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rating */}
          <div>
            <span className="text-sm font-medium text-muted-foreground mb-2 block">
              Avalie esta resposta
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleRating(value)}
                    disabled={isSendingFeedback}
                    className={cn(
                      "p-1 rounded transition-colors",
                      rating && rating >= value
                        ? "text-yellow-500"
                        : "text-muted-foreground hover:text-yellow-400"
                    )}
                  >
                    <Star
                      className={cn(
                        "w-5 h-5",
                        rating && rating >= value ? "fill-current" : ""
                      )}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {rating
                  ? rating === 5
                    ? "Excelente!"
                    : rating === 4
                    ? "Muito boa"
                    : rating === 3
                    ? "Boa"
                    : rating === 2
                    ? "Regular"
                    : "Ruim"
                  : "Clique para avaliar"}
              </span>
            </div>

            {rating && rating <= 2 && (
              <div className="mt-2">
                <Textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="O que poderia melhorar? (opcional)"
                  className="min-h-[60px] text-sm"
                />
              </div>
            )}
          </div>

          {/* Processing Info */}
          <div className="text-xs text-muted-foreground">
            Processado em {processingTime}ms
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <div className="flex items-center gap-2 w-full justify-between">
            <Button
              variant="outline"
              onClick={handleDiscard}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-2" />
              Descartar
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {isEditing ? "Visualizar" : "Editar"}
              </Button>
              <Button onClick={handleSend} className="bg-green-600 hover:bg-green-700">
                <Send className="w-4 h-4 mr-2" />
                Enviar ao Cliente
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Loading state component for when AI is processing
export function AIProcessingIndicator({
  isVisible,
  onCancel,
}: {
  isVisible: boolean;
  onCancel: () => void;
}) {
  if (!isVisible) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 border-t border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Bot className="w-5 h-5 text-purple-600" />
          <Loader2 className="w-3 h-3 absolute -bottom-1 -right-1 animate-spin text-purple-600" />
        </div>
        <span className="text-sm text-purple-700 dark:text-purple-300">
          IA processando sua pergunta...
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="ml-auto text-purple-600 hover:text-purple-700 hover:bg-purple-100"
      >
        Cancelar
      </Button>
    </div>
  );
}

// Category selector component
export function AICategorySelector({
  categories,
  selectedCategory,
  onSelect,
  isVisible,
  onClose,
}: {
  categories: Array<{
    category: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
  }>;
  selectedCategory: string | null;
  onSelect: (category: string | null) => void;
  isVisible: boolean;
  onClose: () => void;
}) {
  if (!isVisible) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mx-4 mb-2 bg-card border rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
      <div className="p-2 text-xs text-muted-foreground border-b flex items-center justify-between">
        <span>Selecione uma categoria (opcional)</span>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="p-1">
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            onClose();
          }}
          className={cn(
            "w-full flex items-center gap-3 p-2 hover:bg-muted transition-colors text-left rounded",
            selectedCategory === null && "bg-purple-50 dark:bg-purple-900/20"
          )}
        >
          <Sparkles className="w-4 h-4 text-purple-600" />
          <div className="flex-1">
            <p className="text-sm font-medium">Automático</p>
            <p className="text-xs text-muted-foreground">IA detecta a categoria</p>
          </div>
        </button>
        {categories.map((cat) => (
          <button
            key={cat.category}
            type="button"
            onClick={() => {
              onSelect(cat.category);
              onClose();
            }}
            className={cn(
              "w-full flex items-center gap-3 p-2 hover:bg-muted transition-colors text-left rounded",
              selectedCategory === cat.category && "bg-purple-50 dark:bg-purple-900/20"
            )}
          >
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: cat.color || "#8b5cf6" }}
            />
            <div className="flex-1">
              <p className="text-sm font-medium">{cat.name}</p>
              {cat.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {cat.description}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

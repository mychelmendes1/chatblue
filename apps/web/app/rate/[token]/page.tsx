"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingInfo {
  alreadyRated: boolean;
  rating?: number;
  protocol: string;
  companyName: string;
  companyLogo?: string;
  contactName?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function RatePage({ params }: { params: { token: string } }) {
  const [info, setInfo] = useState<RatingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadRatingInfo() {
      try {
        const response = await fetch(`${API_URL}/api/public/rate/${params.token}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Avaliacao nao encontrada");
        }
        const data = await response.json();
        setInfo(data);
        if (data.alreadyRated) {
          setSelectedRating(data.rating);
        }
      } catch (err: any) {
        setError(err.message || "Erro ao carregar avaliacao");
      } finally {
        setLoading(false);
      }
    }
    loadRatingInfo();
  }, [params.token]);

  async function handleSubmit() {
    if (selectedRating === null) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/public/rate/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: selectedRating, comment: comment || undefined }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Erro ao enviar avaliacao");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar avaliacao");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-red-600">Erro</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!info) return null;

  // Already rated or just submitted
  if (info.alreadyRated || submitted) {
    const rating = submitted ? selectedRating : info.rating;
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-xl">
              {submitted ? "Obrigado pela sua avaliacao!" : "Avaliacao ja registrada"}
            </CardTitle>
            <CardDescription>
              Protocolo: {info.protocol}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-8 w-8",
                    star <= (rating || 0)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  )}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Voce avaliou nosso atendimento com {rating} {rating === 1 ? "estrela" : "estrelas"}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Agradecemos seu feedback!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Rating form
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {info.companyLogo && (
            <div className="flex justify-center mb-4">
              <img
                src={info.companyLogo}
                alt={info.companyName}
                className="h-12 object-contain"
              />
            </div>
          )}
          <CardTitle className="text-xl">{info.companyName}</CardTitle>
          <CardDescription>
            {info.contactName && `Ola, ${info.contactName}! `}
            Como voce avalia nosso atendimento?
          </CardDescription>
          <p className="text-xs text-muted-foreground mt-1">
            Protocolo: {info.protocol}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Star Rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setSelectedRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(null)}
                className="p-1 transition-transform hover:scale-110 focus:outline-none"
              >
                <Star
                  className={cn(
                    "h-10 w-10 transition-colors",
                    star <= (hoveredRating ?? selectedRating ?? 0)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300 hover:text-yellow-200"
                  )}
                />
              </button>
            ))}
          </div>

          {/* Rating Label */}
          {selectedRating && (
            <p className="text-center text-sm font-medium">
              {selectedRating === 1 && "Muito ruim"}
              {selectedRating === 2 && "Ruim"}
              {selectedRating === 3 && "Regular"}
              {selectedRating === 4 && "Bom"}
              {selectedRating === 5 && "Excelente"}
            </p>
          )}

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Comentario (opcional)
            </label>
            <Textarea
              placeholder="Deixe um comentario sobre o atendimento..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={selectedRating === null || submitting}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Avaliacao"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

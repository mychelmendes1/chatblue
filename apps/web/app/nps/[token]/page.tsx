"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NPSPage() {
  const params = useParams();
  const token = params?.token as string;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const [surveyData, setSurveyData] = useState<{ valid: boolean; ticket?: any; alreadyAnswered?: boolean } | null>(null);

  useEffect(() => {
    if (!token) return;

    // Check NPS status
    api
      .get(`/public/nps/${token}`)
      .then((response) => {
        const data = response.data as { valid: boolean; ticket?: any; alreadyAnswered?: boolean };
        setSurveyData(data);
        
        if (data.alreadyAnswered) {
          setAlreadyAnswered(true);
          if (data.ticket?.npsScore !== null && data.ticket?.npsScore !== undefined) {
            setScore(data.ticket.npsScore);
            setComment(data.ticket.npsComment || "");
            setSubmitted(true);
          }
        }
      })
      .catch((err) => {
        console.error("Error loading NPS:", err);
        setError("Pesquisa não encontrada ou inválida");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async () => {
    if (score === null) {
      setError("Por favor, selecione uma nota de 0 a 10");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await api.post(`/public/nps/${token}`, {
        score,
        comment: comment.trim() || undefined,
      });

      if (response.data.success) {
        setSubmitted(true);
      } else {
        setError(response.data.message || "Erro ao enviar resposta");
      }
    } catch (err: any) {
      console.error("Error submitting NPS:", err);
      setError(err.response?.data?.message || "Erro ao enviar resposta. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando pesquisa...</p>
        </div>
      </div>
    );
  }

  if (error && !alreadyAnswered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertCircle className="w-5 h-5" />
              <CardTitle>Erro</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted || alreadyAnswered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle2 className="w-5 h-5" />
              <CardTitle>Obrigado!</CardTitle>
            </div>
            <CardDescription>
              Sua avaliação foi registrada com sucesso. Agradecemos o seu feedback!
            </CardDescription>
          </CardHeader>
          {score !== null && (
            <CardContent>
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Sua avaliação:</p>
                <div className="flex gap-1">
                  {Array.from({ length: 11 }, (_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded flex items-center justify-center text-sm font-medium ${
                        i <= score
                          ? score >= 9
                            ? "bg-green-500 text-white"
                            : score >= 7
                            ? "bg-yellow-500 text-white"
                            : "bg-red-500 text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {i}
                    </div>
                  ))}
                </div>
                {comment && (
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-700">{comment}</p>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Como você avalia nosso atendimento?</CardTitle>
          <CardDescription>
            De 0 a 10, o quanto você recomendaria nossos serviços para um amigo ou colega?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score selection */}
          <div>
            <label className="block text-sm font-medium mb-4 text-gray-700">
              Selecione sua nota:
            </label>
            <div className="flex flex-wrap gap-2 justify-center">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setScore(i)}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-semibold transition-all ${
                    score === i
                      ? i >= 9
                        ? "bg-green-600 text-white scale-110 shadow-lg"
                        : i >= 7
                        ? "bg-yellow-500 text-white scale-110 shadow-lg"
                        : "bg-red-600 text-white scale-110 shadow-lg"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-between text-xs text-gray-500">
              <span>Muito insatisfeito</span>
              <span>Neutro</span>
              <span>Muito satisfeito</span>
            </div>
            
            {score !== null && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  {score >= 9
                    ? "✨ Obrigado! Você é um Promotor - adoramos trabalhar com você!"
                    : score >= 7
                    ? "👍 Obrigado! Você é Neutro - estamos aqui para melhorar!"
                    : "💪 Obrigado pelo feedback! Você é um Detrator - sua opinião nos ajuda a melhorar."}
                </p>
              </div>
            )}
          </div>

          {/* Comment field */}
          <div>
            <label htmlFor="comment" className="block text-sm font-medium mb-2 text-gray-700">
              Comentário (opcional):
            </label>
            <Textarea
              id="comment"
              placeholder="Conte-nos mais sobre sua experiência..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={score === null || submitting}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Avaliação"
            )}
          </Button>

          <p className="text-xs text-center text-gray-500">
            Sua resposta será registrada de forma anônima e usada apenas para melhorar nossos serviços.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

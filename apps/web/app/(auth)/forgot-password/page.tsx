"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { MessageSquare, Loader2, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

const forgotSchema = z.object({
  email: z.string().email("Email inválido"),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotForm) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await api.post("/auth/forgot-password", { email: data.email });
      setEmailSent(true);
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message ?? error?.message ?? "Tente novamente mais tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-chatblue to-chatblue-dark">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-chatblue rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Esqueci a Senha</h1>
          <p className="text-gray-500 text-center text-sm mt-1">
            {emailSent
              ? "Verifique sua caixa de entrada"
              : "Informe seu email para receber o link de redefinição"}
          </p>
        </div>

        {emailSent ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-gray-600 text-sm">
              Se o email estiver cadastrado, você receberá um link para redefinir sua senha.
              Verifique também sua pasta de spam.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {errorMessage && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{errorMessage}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Link de Redefinição
            </Button>

            <div className="text-center">
              <Link href="/login" className="text-sm text-chatblue hover:underline">
                <ArrowLeft className="inline mr-1 h-3 w-3" />
                Voltar ao Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

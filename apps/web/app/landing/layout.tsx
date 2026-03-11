import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LP com IA — Crie landing pages que convertem em minutos",
  description:
    "A ferramenta LP com IA vai guiar você do zero até a sua página publicada, pronta para captar leads ou vender.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

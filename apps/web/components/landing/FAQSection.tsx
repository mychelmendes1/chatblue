"use client";

import { useState } from "react";
import Image from "next/image";

const faqs = [
  [
    { num: "01", q: "Preciso saber programar?" },
    { num: "02", q: "O plano grátis publica a página?" },
    { num: "03", q: "O que conta como contato armazenado?" },
    { num: "04", q: "Posso usar meu domínio?" },
  ],
  [
    { num: "05", q: "Tem testes A/B?" },
    { num: "06", q: "Integra com meu CRM?" },
    { num: "07", q: "Posso cancelar quando quiser?" },
  ],
];

const answers: Record<string, string> = {
  "01": "Não! A LP com IA foi criada para que qualquer pessoa consiga criar e publicar uma landing page profissional sem precisar de conhecimentos técnicos.",
  "02": "Sim, o plano gratuito permite publicar sua página em um subdomínio gratuito com SSL automático.",
  "03": "Contato armazenado é cada novo contato salvo na ferramenta durante o mês, seja via formulário, captura de lead ou integração com CRM.",
  "04": "Sim! A partir do plano Starter você pode conectar seu próprio domínio personalizado.",
  "05": "Sim, testes A/B estão disponíveis a partir do plano Starter.",
  "06": "Sim! A LP com IA integra com os principais CRMs do mercado em poucos cliques.",
  "07": "Sim, você pode cancelar a qualquer momento sem multas ou taxas adicionais.",
};

export default function FAQSection() {
  const [openItem, setOpenItem] = useState<string | null>(null);

  const toggle = (num: string) => setOpenItem(openItem === num ? null : num);

  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-[1216px] mx-auto flex flex-col gap-16">
        {/* Heading */}
        <div className="flex flex-col gap-4">
          <span
            className="font-jakarta text-lp-primary uppercase"
            style={{ fontSize: "16px", fontWeight: 500, letterSpacing: "1.6px" }}
          >
            TIRE SUAS DÚVIDAS
          </span>
          <h2
            className="font-jakarta"
            style={{ fontSize: "40px", fontWeight: 500, letterSpacing: "-0.8px", lineHeight: "48px", color: "#13061e" }}
          >
            Perguntas frequentes
          </h2>
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-2 gap-x-16">
          {faqs.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {col.map((item) => (
                <div
                  key={item.num}
                  className="border-b border-[#d8d8d8]"
                >
                  <button
                    className="w-full flex items-center justify-between py-6 text-left hover:bg-gray-50/50 transition-colors"
                    onClick={() => toggle(item.num)}
                  >
                    <div className="flex items-center gap-6">
                      <span
                        className="font-jakarta font-normal shrink-0"
                        style={{ fontSize: "24px", letterSpacing: "-0.48px", lineHeight: "30px", color: "#9d4edd" }}
                      >
                        {item.num}
                      </span>
                      <span
                        className="font-jakarta font-normal"
                        style={{ fontSize: "20px", letterSpacing: "-0.4px", color: "#4c4c4c" }}
                      >
                        {item.q}
                      </span>
                    </div>
                    <Image
                      src="/landing/faq-plus-icon.svg"
                      alt=""
                      width={16}
                      height={16}
                      className={`shrink-0 transition-transform duration-200 ${openItem === item.num ? "rotate-45" : ""}`}
                    />
                  </button>
                  {openItem === item.num && (
                    <div className="pb-6 pl-[calc(24px+24px)]">
                      <p
                        className="font-jakarta"
                        style={{ fontSize: "16px", fontWeight: 400, letterSpacing: "-0.32px", lineHeight: "24px", color: "#4c4c4c" }}
                      >
                        {answers[item.num]}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

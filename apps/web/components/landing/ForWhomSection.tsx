"use client";

import { useState } from "react";
import Image from "next/image";

const audiences = [
  {
    title: "Empreendedores e microempresas…",
    body: "Que precisam colocar uma página no ar rapidamente para captar contatos ou vender, sem gastar com agência ou perder tempo aprendendo ferramentas.\nVocê cria. A IA orienta. Sua página converte.",
  },
  {
    title: "Freelancers…",
    body: "Que precisam escalar entregas, validar ideias e criar landing pages profissionais para clientes em minutos, com qualidade e alta conversão.\nMais velocidade. Mais projetos entregues com a mesma qualidade.",
  },
  {
    title: "Startups e equipes enxutas…",
    body: "Que desejam testar hipóteses, validar campanhas e publicar páginas rapidamente, sem travar o time com processos longos.\nDo teste à publicação no mesmo dia. Velocidade que acompanha seus MVP's.",
  },
];

export default function ForWhomSection() {
  const [activeIdx] = useState(0);

  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-[1216px] mx-auto flex flex-col gap-14">
        {/* Header row */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-4 max-w-[488px]">
            <h2
              className="font-jakarta"
              style={{ fontSize: "40px", fontWeight: 500, letterSpacing: "-0.8px", lineHeight: "48px", color: "#13061e" }}
            >
              Para quem é a LP com IA?
            </h2>
            <p
              className="font-jakarta"
              style={{ fontSize: "22px", fontWeight: 400, letterSpacing: "-0.44px", lineHeight: "30.8px", color: "#4c4c4c" }}
            >
              Feita para quem precisa de resultado, não de complexidade.
            </p>
          </div>
          <button
            className="font-jakarta font-semibold text-white text-base tracking-[-0.32px] px-6 py-3 rounded-lg shrink-0"
            style={{ background: "linear-gradient(44.96deg, #9d4edd 0%, #3c096c 97.43%)" }}
          >
            Criar minha primeira LP
          </button>
        </div>

        {/* Content row */}
        <div className="flex gap-8 items-start">
          {/* Left: accordion */}
          <div className="flex flex-col gap-0 flex-1 max-w-[488px]">
            {audiences.map((a, i) => (
              <div
                key={i}
                className={`flex flex-col gap-5 p-9 rounded-lg transition-all ${
                  i === activeIdx
                    ? "border border-[#f5f5f5] shadow-[0px_10px_20px_rgba(0,0,0,0.25)]"
                    : "border-0"
                }`}
              >
                <div className="flex flex-col gap-5">
                  <h3
                    className="font-jakarta font-medium"
                    style={{ fontSize: "24px", letterSpacing: "-0.48px", lineHeight: "30px", color: "#13061e" }}
                  >
                    {a.title}
                  </h3>
                  <p
                    className="font-jakarta whitespace-pre-line"
                    style={{ fontSize: "16px", fontWeight: 400, letterSpacing: "-0.32px", lineHeight: "24px", color: "#4c4c4c" }}
                  >
                    {a.body}
                  </p>
                </div>
                {i === activeIdx && (
                  <Image src="/landing/progress-bar.svg" alt="" width={420} height={3} className="w-full" />
                )}
              </div>
            ))}
          </div>

          {/* Right: decorative image group */}
          <div className="relative flex-1 min-h-[500px]">
            {/* Decorative vectors */}
            <Image
              src="/landing/deco-vector-1.svg"
              alt=""
              width={425}
              height={109}
              className="absolute left-0 bottom-0 opacity-70"
            />

            {/* Purple gradient background box */}
            <div
              className="absolute right-0 top-16 rounded-[11px]"
              style={{
                width: "332px",
                height: "477px",
                background: "linear-gradient(44.96deg, #7b2cbf 0%, #c77dff 97.43%)",
              }}
            />

            {/* Person photo */}
            <div className="absolute right-0 top-0 rounded-[11px] overflow-hidden" style={{ width: "332px", height: "477px" }}>
              <Image
                src="/landing/person-coffee.png"
                alt="Pessoa trabalhando"
                fill
                className="object-cover object-center"
              />
            </div>

            {/* Mais conversão badge */}
            <div
              className="absolute top-8 right-[290px] flex items-center gap-2 px-3 py-2 rounded-full bg-white shadow-lg"
              style={{ border: "1px solid #f0e6ff" }}
            >
              <Image src="/landing/more-conversion-icon.svg" alt="" width={21} height={21} />
              <span className="font-jakarta text-sm font-medium" style={{ color: "#413e52" }}>
                Mais conversão
              </span>
            </div>

            {/* Stats card */}
            <div
              className="absolute bottom-8 left-4 rounded-[11px] p-4 bg-white"
              style={{
                width: "274px",
                border: "1.06px solid #d8d8d8",
                boxShadow: "0px 15.86px 31.73px rgba(76,74,94,0.10)",
              }}
            >
              <p className="font-jakarta text-[#4c4c4c] mb-2" style={{ fontSize: "13.75px" }}>
                Taxa de Conversão
              </p>
              <div className="flex items-end justify-between gap-2 mb-1">
                <div>
                  <p className="font-jakarta font-semibold" style={{ fontSize: "14.81px", color: "#240046" }}>
                    87
                  </p>
                  <p className="font-jakarta opacity-70" style={{ fontSize: "11.63px", color: "#4c4c4c" }}>
                    15 conversões
                  </p>
                </div>
                <Image src="/landing/trend-up-icon.svg" alt="" width={15} height={8} />
              </div>
              <Image src="/landing/graph-green.svg" alt="" width={200} height={60} className="w-full" />
            </div>

            {/* Side dots decoration */}
            <Image
              src="/landing/deco-vector-2.svg"
              alt=""
              width={41}
              height={197}
              className="absolute right-[-20px] top-40"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

import Image from "next/image";

export default function WhyItWorksSection() {
  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-[1216px] mx-auto flex flex-col gap-16">
        {/* Heading */}
        <div className="flex flex-col items-center gap-4">
          <h2
            className="font-jakarta text-center"
            style={{ fontSize: "40px", fontWeight: 500, letterSpacing: "-0.8px", lineHeight: "48px", color: "#13061e" }}
          >
            Por que a LP com IA funciona?
          </h2>
          <p
            className="font-jakarta text-center"
            style={{ fontSize: "22px", fontWeight: 400, letterSpacing: "-0.44px", lineHeight: "30.8px", color: "#4c4c4c" }}
          >
            Porque ela pensa junto com você!
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-3 gap-5">
          {/* Row 1 */}
          {/* Card 1: woman photo + text */}
          <div
            className="rounded-lg overflow-hidden flex flex-col"
            style={{ boxShadow: "0px 15px 30px rgba(76,74,94,0.10)" }}
          >
            <div className="relative h-[222px] overflow-hidden">
              {/* 75% overlay */}
              <div
                className="absolute top-4 left-4 z-10 flex items-center justify-center rounded-[4px] w-20 h-20"
                style={{
                  border: "1px solid #f5f5f5",
                  boxShadow: "20px 20px 30px rgba(0,0,0,0.30)",
                  background: "rgba(255,255,255,0.9)",
                }}
              >
                <Image src="/landing/deco-75-bg.svg" alt="" width={56} height={29} />
              </div>
              <Image
                src="/landing/person-thinking.png"
                alt="Mulher pensando"
                fill
                className="object-cover object-center"
              />
            </div>
            <div className="p-6 bg-white flex-1">
              <p
                className="font-jakarta"
                style={{ fontSize: "20px", fontWeight: 400, letterSpacing: "-0.4px", lineHeight: "30px", color: "#13061e" }}
              >
                A IA escreve textos persuasivos com a sua oferta, benefícios, prova social e chamada para ação.
              </p>
            </div>
          </div>

          {/* Card 2 (tall): phone mockup */}
          <div
            className="rounded-lg overflow-hidden flex flex-col row-span-2"
            style={{ boxShadow: "0px 15px 30px rgba(76,74,94,0.10)" }}
          >
            <div className="p-6 bg-white">
              <p
                className="font-jakarta"
                style={{ fontSize: "20px", fontWeight: 400, letterSpacing: "-0.4px", lineHeight: "30px", color: "#13061e" }}
              >
                Toda estrutura de landing page tem um propósito. Nada de página bonita que não converte.
              </p>
            </div>
            <div className="flex-1 bg-white px-4 pb-4 flex items-center justify-center">
              <Image
                src="/landing/phone-mockup.svg"
                alt="Mockup do app no celular"
                width={336}
                height={634}
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Card 3: publish UI mockup + text */}
          <div
            className="rounded-lg overflow-hidden flex flex-col"
            style={{ boxShadow: "0px 15px 30px rgba(76,74,94,0.10)" }}
          >
            <div
              className="relative overflow-hidden rounded-t-lg"
              style={{
                background: "linear-gradient(207.31deg, #e0aaff 113.62%, rgba(255,255,255,0.38) 115.3%)",
                padding: "16px",
                minHeight: "251px",
              }}
            >
              {/* Mini dashboard card */}
              <div
                className="rounded-[4px] p-3 flex flex-col gap-2"
                style={{
                  background: "rgba(255,255,255,0.85)",
                  boxShadow: "0px 8.56px 17.13px rgba(76,74,94,0.10)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Image src="/landing/manual-marca-icon.svg" alt="" width={30} height={30} />
                  <div className="flex items-center justify-between flex-1">
                    <span className="font-jakarta font-medium" style={{ fontSize: "9.73px", color: "#13061e" }}>
                      Criar um Manual da Marca
                    </span>
                    <Image src="/landing/arrow-right-icon.svg" alt="" width={5} height={8} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Image src="/landing/dollar-icon.svg" alt="" width={25} height={25} />
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="h-[3.5px] w-full rounded bg-[#d8d8d8]" />
                    <div className="flex items-center justify-between">
                      <span className="font-jakarta font-medium opacity-80" style={{ fontSize: "10.23px", color: "#13061e" }}>
                        R$ 4.981,77
                      </span>
                      <Image src="/landing/trend-icon.svg" alt="" width={15} height={8} />
                    </div>
                  </div>
                </div>
              </div>

              {/* LP empty state */}
              <div
                className="rounded-[3px] p-3 flex gap-2 items-start mt-3"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  boxShadow: "0px 7.88px 15.76px rgba(76,74,94,0.10)",
                }}
              >
                <Image src="/landing/add-lp-icon.svg" alt="" width={21} height={21} />
                <div>
                  <p className="font-jakarta font-medium" style={{ fontSize: "10.01px", color: "#13061e" }}>
                    Nenhuma landing page ainda
                  </p>
                  <p className="font-jakarta" style={{ fontSize: "7.91px", color: "#4c4c4c", lineHeight: "11.86px" }}>
                    Crie sua primeira landing page com IA. Certifique-se de ter um Manual da Marca e uma Persona configurados.
                  </p>
                  <span
                    className="font-jakarta font-semibold mt-1 inline-block"
                    style={{ fontSize: "6.13px", color: "#f5f5f5", background: "#9d4edd", padding: "2px 6px", borderRadius: "3px" }}
                  >
                    Criar Landing Page
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6 bg-white flex-1">
              <p
                className="font-jakarta"
                style={{ fontSize: "20px", fontWeight: 400, letterSpacing: "-0.4px", lineHeight: "30px", color: "#13061e" }}
              >
                Publicação rápida e sem dor de cabeça.
              </p>
            </div>
          </div>

          {/* Row 2 */}
          {/* Card 4: flows mockup */}
          <div
            className="rounded-lg overflow-hidden flex flex-col"
            style={{ boxShadow: "0px 15px 30px rgba(76,74,94,0.10)" }}
          >
            <div
              className="relative overflow-hidden rounded-t-lg flex-1"
              style={{
                background: "linear-gradient(79.86deg, #3c096c 5.04%, rgba(60,9,108,0.56) 148.94%)",
                padding: "16px",
                minHeight: "222px",
              }}
            >
              {/* Flows UI mini */}
              <div
                className="rounded-[3px] p-3 flex gap-2 items-start"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  boxShadow: "0px 7.83px 15.67px rgba(76,74,94,0.10)",
                }}
              >
                <Image src="/landing/add-flow-icon.svg" alt="" width={21} height={21} />
                <div>
                  <p className="font-jakarta font-medium" style={{ fontSize: "9.95px", color: "#13061e" }}>
                    Nenhum fluxo criado
                  </p>
                  <p className="font-jakarta" style={{ fontSize: "7.86px", color: "#4c4c4c", lineHeight: "11.79px" }}>
                    Crie fluxos visuais para conectar suas landing pages, formulários, páginas de obrigado e automações
                  </p>
                  <span
                    className="font-jakarta font-semibold mt-1 inline-block"
                    style={{ fontSize: "6.1px", color: "#f5f5f5", background: "#9d4edd", padding: "2px 6px", borderRadius: "3px" }}
                  >
                    Criar Primeiro Fluxo
                  </span>
                </div>
              </div>
              {/* Avatars + graph */}
              <div className="mt-3 flex items-center gap-3">
                <Image src="/landing/avatars.svg" alt="" width={35} height={35} />
              </div>
              <Image
                src="/landing/flows-mockup.svg"
                alt=""
                width={223}
                height={72}
                className="absolute bottom-0 right-0"
              />
            </div>
            <div className="p-6 bg-white">
              <p
                className="font-jakarta"
                style={{ fontSize: "20px", fontWeight: 400, letterSpacing: "-0.4px", lineHeight: "30px", color: "#13061e" }}
              >
                Integração com CRM, Analytics, automações e pagamentos prontos para aplicar.
              </p>
            </div>
          </div>

          {/* Card 5: ease of use */}
          <div
            className="rounded-lg overflow-hidden flex flex-col"
            style={{ boxShadow: "0px 15px 30px rgba(76,74,94,0.10)" }}
          >
            <div className="p-6 bg-white">
              <p
                className="font-jakarta"
                style={{ fontSize: "20px", fontWeight: 400, letterSpacing: "-0.4px", lineHeight: "30px", color: "#13061e" }}
              >
                Facilidade real de uso e interface intuitiva, sem curva de aprendizado.
              </p>
            </div>
            <div className="flex-1 overflow-hidden">
              <Image
                src="/landing/person-laptop-2.svg"
                alt="Pessoa usando laptop"
                width={334}
                height={252}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

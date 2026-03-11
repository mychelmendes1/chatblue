const steps = [
  {
    num: "1",
    text: "Descreva o que você vende, para quem você vende e tom da sua marca.",
  },
  {
    num: "2",
    text: "A LP com IA cria layout e textos orientados à conversão.",
  },
  {
    num: "3",
    text: "Conecte seu CRM, Analytics e meios de pagamento em poucos cliques.",
  },
  {
    num: "4",
    text: "Publique no subdomínio grátis ou no seu próprio domínio.",
  },
];

export default function HowDoesItWorkSection() {
  return (
    <section className="relative py-24 px-6 overflow-hidden">
      {/* Purple gradient background */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(44.96deg, #9d4edd 0%, #3c096c 97.43%)" }}
      />

      <div className="relative z-10 max-w-[1216px] mx-auto flex flex-col gap-16">
        {/* Heading */}
        <div className="flex flex-col items-center gap-4">
          <span
            className="font-jakarta text-white/70 uppercase"
            style={{ fontSize: "16px", fontWeight: 500, letterSpacing: "1.6px" }}
          >
            4 PASSOS SIMPLES
          </span>
          <h2
            className="font-jakarta text-white text-center"
            style={{ fontSize: "40px", fontWeight: 500, letterSpacing: "-0.8px", lineHeight: "48px" }}
          >
            Como funciona?
          </h2>
        </div>

        {/* Step cards */}
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-4 gap-5">
            {steps.map((step) => (
              <div
                key={step.num}
                className="flex flex-col gap-8 p-8 rounded-lg"
                style={{
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "rgba(255,255,255,0.06)",
                  boxShadow: "0px 15px 30px rgba(76,74,94,0.10)",
                  backdropFilter: "blur(4px)",
                }}
              >
                {/* Number badge */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)" }}
                >
                  <span
                    className="font-jakarta font-semibold text-white"
                    style={{ fontSize: "24px", lineHeight: "30px" }}
                  >
                    {step.num}
                  </span>
                </div>
                <p
                  className="font-jakarta text-white font-medium text-center"
                  style={{ fontSize: "20px", letterSpacing: "-0.4px", lineHeight: "30px" }}
                >
                  {step.text}
                </p>
              </div>
            ))}
          </div>

          <p
            className="font-jakarta text-center text-white/70"
            style={{ fontSize: "18px", fontWeight: 400, letterSpacing: "-0.36px" }}
          >
            Você pode ajustar texto e design quando quiser.
          </p>
        </div>
      </div>
    </section>
  );
}

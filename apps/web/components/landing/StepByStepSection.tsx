import Image from "next/image";

const steps = [
  { num: "01", label: "Capturou", icon: "/landing/flow-icon-1.svg" },
  { num: "02", label: "Armazenou", icon: "/landing/flow-icon-2.svg" },
  { num: "03", label: "Enviou para o\nCRM", icon: "/landing/flow-icon-3.svg" },
  { num: "04", label: "Mediu no\nAnalytics", icon: "/landing/flow-icon-4.svg" },
  { num: "05", label: "Vendeu!", icon: "/landing/flow-icon-5.svg", highlight: true },
];

export default function StepByStepSection() {
  return (
    <section className="bg-white py-24 px-6 relative">
      {/* Decorative rect pattern */}
      <Image
        src="/landing/step-rects.svg"
        alt=""
        width={1440}
        height={14}
        className="absolute top-0 left-0 w-full"
      />

      <div className="max-w-[1216px] mx-auto flex flex-col gap-16 pt-8">
        {/* Heading */}
        <div className="flex flex-col items-center gap-4">
          <span
            className="font-jakarta text-lp-primary uppercase"
            style={{ fontSize: "16px", fontWeight: 500, letterSpacing: "1.6px" }}
          >
            PASSO A PASSO
          </span>
          <h2
            className="font-jakarta text-center"
            style={{
              fontSize: "40px",
              fontWeight: 500,
              letterSpacing: "-0.8px",
              lineHeight: "48px",
              color: "#13061e",
              maxWidth: "524px",
            }}
          >
            Sua landing page conectada ao seu negócio
          </h2>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-10">
          {/* Step items */}
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute top-5 left-0 right-0 h-[1px] bg-[#dedede]" />

            <div className="grid grid-cols-5 gap-4 relative">
              {steps.map((step) => (
                <div key={step.num} className="flex flex-col gap-2 items-start">
                  {/* Icon box */}
                  <div
                    className="w-10 h-10 flex items-center justify-center rounded-lg mb-4 z-10 relative bg-white border border-[#dedede]"
                    style={
                      step.highlight
                        ? { background: "linear-gradient(44.96deg, #9d4edd 0%, #3c096c 97.43%)", border: "1px solid #9d4edd" }
                        : {}
                    }
                  >
                    <Image src={step.icon} alt="" width={20} height={20} />
                  </div>
                  <span
                    className="font-jakarta font-semibold"
                    style={{
                      fontSize: "32px",
                      lineHeight: "40px",
                      color: step.highlight ? "#9d4edd" : "#9d4edd",
                    }}
                  >
                    {step.num}
                  </span>
                  <span
                    className="font-jakarta font-medium whitespace-pre-line"
                    style={{
                      fontSize: "24px",
                      lineHeight: step.label.includes("\n") ? "33.6px" : "36px",
                      color: step.highlight ? "#7b2cbf" : "#13061e",
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Banner */}
          <div
            className="rounded-lg p-8 flex items-center justify-between"
            style={{
              background: "linear-gradient(44.96deg, #9d4edd 0%, #3c096c 97.43%)",
              maxWidth: "471px",
              margin: "0 auto",
              width: "100%",
            }}
          >
            <p
              className="font-jakarta font-medium text-white"
              style={{ fontSize: "18px", letterSpacing: "-0.36px", lineHeight: "25.2px", maxWidth: "200px" }}
            >
              Crie sua primeira Landing Page agora!
            </p>
            <button
              className="font-jakarta font-semibold text-white text-base tracking-[-0.32px] px-6 py-3 rounded-lg bg-white/20 border border-white/40 hover:bg-white/30 transition-colors shrink-0"
            >
              Começar a criar
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

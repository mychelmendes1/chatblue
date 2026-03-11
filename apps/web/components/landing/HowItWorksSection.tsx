import Image from "next/image";

const steps = [
  { num: "01", label: "Gerar", icon: "/landing/step-icon-1.svg" },
  { num: "02", label: "Editar", icon: "/landing/step-icon-2.svg" },
  { num: "03", label: "Integrar", icon: "/landing/step-icon-3.svg" },
  { num: "04", label: "Publicar", icon: "/landing/step-icon-4.svg" },
  { num: "05", label: "Pronto!", icon: null },
];

export default function HowItWorksSection() {
  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-[1216px] mx-auto flex flex-col gap-14">
        {/* Top row: heading + image */}
        <div className="flex items-start justify-between gap-8">
          <div className="flex flex-col gap-4">
            <span
              className="font-jakarta uppercase text-lp-primary"
              style={{ fontSize: "16px", fontWeight: 500, letterSpacing: "1.6px" }}
            >
              Como funciona
            </span>
            <h2
              className="font-jakarta"
              style={{
                fontSize: "40px",
                fontWeight: 500,
                letterSpacing: "-0.8px",
                lineHeight: "48px",
                color: "#13061e",
                maxWidth: "481px",
              }}
            >
              Passo a passo para a criação da sua página
            </h2>
          </div>

          {/* Person image card */}
          <div
            className="relative rounded-xl overflow-hidden flex-shrink-0"
            style={{ width: "322px", height: "148px", background: "linear-gradient(44.96deg, #9d4edd 0%, #3c096c 97.43%)" }}
          >
            <Image
              src="/landing/person-laptop.png"
              alt="Empresário com laptop"
              fill
              className="object-cover object-center"
            />
            <div className="absolute bottom-4 left-4 right-4">
              <p
                className="font-jakarta text-white"
                style={{ fontSize: "18px", fontWeight: 500, letterSpacing: "-0.36px", lineHeight: "21.6px" }}
              >
                Crie sua conta gratuitamente!
              </p>
            </div>
          </div>
        </div>

        {/* Progress dots + steps */}
        <div className="flex flex-col gap-8">
          {/* Progress line */}
          <Image src="/landing/step-progress.svg" alt="" width={1219} height={10} className="w-full" />

          {/* Step cards */}
          <div className="grid grid-cols-5 gap-4">
            {steps.map((step) => (
              <div
                key={step.num}
                className={`relative flex flex-col justify-between p-5 rounded-lg min-h-[136px] ${
                  step.num === "05"
                    ? "text-white"
                    : "border border-[#dedede] bg-white"
                }`}
                style={
                  step.num === "05"
                    ? { background: "linear-gradient(44.96deg, #9d4edd 0%, #3c096c 97.43%)", border: "1px solid #9d4edd" }
                    : {}
                }
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`font-jakarta font-semibold`}
                    style={{
                      fontSize: "32px",
                      lineHeight: "40px",
                      color: step.num === "05" ? "#ffffff" : "#9d4edd",
                    }}
                  >
                    {step.num}
                  </span>
                  {step.icon && (
                    <Image src={step.icon} alt="" width={20} height={20} />
                  )}
                </div>
                <span
                  className="font-jakarta font-medium"
                  style={{
                    fontSize: "24px",
                    color: step.num === "05" ? "#ffffff" : "#13061e",
                  }}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

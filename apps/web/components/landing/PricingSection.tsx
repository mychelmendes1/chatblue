import Image from "next/image";

const plans = [
  {
    name: "Gratuito",
    price: "R$ 0",
    period: "/mês",
    subtitle: "Para publicar e validar",
    cta: "Começar grátis",
    ctaStyle: "dark",
    popular: false,
    gradient: false,
    features: [
      "3 Landing Pages",
      "100 contatos/mês",
      "10 gerações de IA",
      "Subdomínio + SSL",
    ],
  },
  {
    name: "Starter",
    price: "R$ 49",
    period: "/mês",
    subtitle: "Domínio + A/B",
    cta: "Assinar Starter",
    ctaStyle: "white",
    popular: true,
    gradient: true,
    features: [
      "10 Landing Pages",
      "1.000 contatos/mês",
      "50 gerações de IA",
      "Domínio personalizado",
      "Testes A/B",
    ],
  },
  {
    name: "Profissional",
    price: "R$ 149",
    period: "/mês",
    subtitle: "Escala + prioridade",
    cta: "Assinar profissional",
    ctaStyle: "dark",
    popular: false,
    gradient: false,
    features: [
      "50 Landing Pages",
      "10.000 contatos/mês",
      "200 gerações de IA",
      "Domínio personalizado",
      "Testes A/B",
      "Suporte prioritário",
    ],
  },
  {
    name: "Enterprise",
    price: "R$ 499",
    period: "/mês",
    subtitle: "Ilimitado",
    cta: "Falar com vendas",
    ctaStyle: "dark",
    popular: false,
    gradient: false,
    features: [
      "Ilimitado LPs",
      "Ilimitado contatos",
      "Ilimitado IA",
      "Domínio personalizado",
      "Testes A/B",
      "Suporte prioritário",
    ],
  },
];

export default function PricingSection() {
  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-[1216px] mx-auto flex flex-col gap-16">
        {/* Heading */}
        <div className="flex flex-col items-center gap-4">
          <span
            className="font-jakarta text-lp-primary uppercase"
            style={{ fontSize: "16px", fontWeight: 500, letterSpacing: "1.6px" }}
          >
            PLANOS
          </span>
          <h2
            className="font-jakarta text-center"
            style={{ fontSize: "40px", fontWeight: 500, letterSpacing: "-0.8px", lineHeight: "48px", color: "#13061e" }}
          >
            Comece grátis
          </h2>
          <p
            className="font-jakarta text-center"
            style={{ fontSize: "22px", fontWeight: 400, letterSpacing: "-0.44px", color: "#4c4c4c" }}
          >
            Faça upgrade quando sua operação crescer.
          </p>
        </div>

        {/* Plan cards */}
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-4 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="rounded-lg overflow-hidden flex flex-col"
                style={{ boxShadow: "0px 15px 30px rgba(76,74,94,0.10)" }}
              >
                {/* Header */}
                <div
                  className="p-6 flex flex-col gap-3"
                  style={
                    plan.gradient
                      ? { background: "radial-gradient(110.77% 114.82% at 100% 1.16%, #c77dff 0%, #5a189a 100%)" }
                      : { background: "#f7f7f7" }
                  }
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="font-jakarta font-medium"
                      style={{ fontSize: "24px", letterSpacing: "-0.48px", color: plan.gradient ? "#ffffff" : "#13061e" }}
                    >
                      {plan.name}
                    </span>
                    {plan.popular && (
                      <span
                        className="font-jakarta font-medium text-sm px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(255,255,255,0.25)",
                          color: "#ffffff",
                          letterSpacing: "-0.28px",
                          border: "1px solid rgba(255,255,255,0.4)",
                        }}
                      >
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className="font-jakarta font-medium"
                      style={{ fontSize: "48px", letterSpacing: "-0.96px", lineHeight: "52.8px", color: plan.gradient ? "#ffffff" : "#13061e" }}
                    >
                      {plan.price}
                    </span>
                    <span
                      className="font-jakarta"
                      style={{ fontSize: "18px", color: plan.gradient ? "rgba(255,255,255,0.8)" : "#4c4c4c" }}
                    >
                      {plan.period}
                    </span>
                  </div>
                  <p
                    className="font-jakarta"
                    style={{ fontSize: "18px", fontWeight: 400, letterSpacing: "-0.36px", color: plan.gradient ? "#f5f5f5" : "#4c4c4c" }}
                  >
                    {plan.subtitle}
                  </p>
                  <button
                    className="font-jakarta font-semibold text-base tracking-[-0.32px] px-4 py-3 rounded-lg transition-colors mt-2"
                    style={
                      plan.ctaStyle === "white"
                        ? { background: "rgba(255,255,255,0.9)", color: "#13061e" }
                        : { background: "#13061e", color: "#ffffff" }
                    }
                  >
                    {plan.cta}
                  </button>
                </div>

                {/* Features */}
                <div className="p-6 bg-white flex-1">
                  <ul className="flex flex-col gap-3">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-3">
                        <Image src="/landing/check-icon.svg" alt="✓" width={14} height={14} className="shrink-0" />
                        <span
                          className="font-jakarta"
                          style={{ fontSize: "12px", fontWeight: 400, letterSpacing: "-0.24px", color: "#4c4c4c" }}
                        >
                          {feat}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Note */}
          <p
            className="font-jakarta text-center"
            style={{ fontSize: "18px", fontWeight: 400, letterSpacing: "-0.36px", color: "#4c4c4c" }}
          >
            Contato armazenado = cada novo contato salvo na ferramenta durante o mês.
          </p>
        </div>
      </div>
    </section>
  );
}

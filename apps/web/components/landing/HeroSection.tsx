import Image from "next/image";

export default function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(180deg, #13061e 0%, #1a0530 60%, #0d0118 100%)" }}
    >
      {/* Fullscreen background wave */}
      <Image
        src="/landing/hero-bg.svg"
        alt=""
        fill
        className="object-cover object-center opacity-80"
        priority
      />

      {/* Gradient fade at bottom */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[830px] h-[564px] rounded-[20px] pointer-events-none z-10"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0) 63.83%, rgba(255,255,255,1) 95.12%)" }}
      />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center pt-[200px] pb-20 px-6">
        {/* Headline */}
        <h1
          className="font-jakarta text-center max-w-[800px] mb-8"
          style={{
            fontSize: "52px",
            fontWeight: 500,
            letterSpacing: "-1.04px",
            lineHeight: "62.4px",
            color: "#fbfff7",
          }}
        >
          Crie uma landing page que{" "}
          <span className="text-lp-light">converte em minutos</span>, mesmo sem
          dominar copy ou design
        </h1>

        {/* Subtext */}
        <p
          className="font-jakarta text-center max-w-[592px] mb-10"
          style={{
            fontSize: "22px",
            fontWeight: 400,
            letterSpacing: "-0.44px",
            lineHeight: "30.8px",
            color: "#d8d8d8",
          }}
        >
          A ferramenta LP com IA{" "}
          <strong className="text-white font-medium">
            vai guiar você do zero até a sua página publicada
          </strong>
          , pronta para captar leads ou vender.
          <br />
          Muito menos esforço. Muito mais conversão.
        </p>

        {/* CTAs */}
        <div className="flex items-center gap-5 mb-6">
          <button
            className="font-jakarta font-semibold text-white text-base tracking-[-0.32px] px-8 py-4 rounded-lg transition-colors"
            style={{ background: "linear-gradient(44.96deg, #9d4edd 0%, #3c096c 97.43%)" }}
          >
            Começar grátis
          </button>
          <button className="font-jakarta font-semibold text-white text-base tracking-[-0.32px] px-8 py-4 rounded-lg border border-white/40 hover:bg-white/10 transition-colors">
            Ver demo
          </button>
        </div>

        {/* Trust strip */}
        <p
          className="font-jakarta text-center mb-16"
          style={{ fontSize: "12px", fontWeight: 400, letterSpacing: "-0.24px", color: "#d8d8d8" }}
        >
          Sem cartão &nbsp;|&nbsp; Publicação no subdomínio grátis &nbsp;|&nbsp; SSL automático
        </p>

        {/* Dashboard mockup */}
        <div className="w-full max-w-[830px] mx-auto rounded-2xl overflow-hidden shadow-2xl border border-white/20">
          <div className="bg-white/95 rounded-2xl overflow-hidden">
            {/* Browser chrome */}
            <div className="bg-[#f0f0f0] px-4 py-3 flex items-center gap-2 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-4 bg-white rounded px-3 py-1 text-xs text-gray-500 font-jakarta">
                LP com IA
              </div>
            </div>

            {/* Dashboard content */}
            <div className="flex h-[480px]">
              {/* Sidebar */}
              <div className="w-[200px] border-r border-gray-100 bg-white p-4 flex flex-col gap-4 shrink-0">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                  <Image src="/landing/logo-symbol.svg" alt="LP com IA" width={24} height={18} />
                  <div>
                    <p className="text-xs font-semibold font-jakarta text-lp-darker">LP com IA</p>
                    <p className="text-[10px] font-jakarta text-gray-400">2 empresas</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-jakarta text-gray-400 mb-2 uppercase tracking-wide">Menu</p>
                  <nav className="flex flex-col gap-1">
                    {["Dashboard", "Landing Pages", "+ Criar Nova LP", "Fluxos", "Formulários", "Páginas Obrigado"].map(
                      (item, i) => (
                        <div
                          key={item}
                          className={`px-2 py-1.5 rounded text-xs font-jakarta ${
                            i === 0
                              ? "bg-lp-primary/10 text-lp-primary font-semibold"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {item}
                        </div>
                      )
                    )}
                  </nav>
                </div>
                <div className="mt-auto">
                  <p className="text-[10px] font-jakarta text-gray-400 mb-2 uppercase tracking-wide">Configurações</p>
                  <div className="text-xs font-jakarta text-gray-600 px-2 py-1.5">Manual da Marca</div>
                  <div className="text-[10px] font-jakarta text-gray-400 px-2 py-1 truncate">joaovvigarani@gmail.com</div>
                </div>
              </div>

              {/* Main */}
              <div className="flex-1 p-6 bg-[#fafafa] overflow-auto">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-semibold font-jakarta text-lp-darker">Dashboard</h2>
                    <p className="text-xs font-jakarta text-gray-400">Gerencie suas landing pages e configurações</p>
                  </div>
                  <button className="bg-lp-primary text-white text-xs font-semibold font-jakarta px-3 py-1.5 rounded-lg">
                    + Nova Landing Page
                  </button>
                </div>

                {/* Setup banner */}
                <div className="bg-lp-primary/5 border border-lp-primary/20 rounded-lg p-4 mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold font-jakarta text-lp-primary">⚙ Complete a configuração</span>
                  </div>
                  <p className="text-[11px] font-jakarta text-gray-500 mb-3">Para criar landing pages com IA, você precisa configurar:</p>
                  <div className="flex gap-2">
                    <span className="bg-lp-primary/10 text-lp-primary text-[11px] font-jakarta font-medium px-3 py-1 rounded-full">
                      ✦ Manual da Marca
                    </span>
                    <span className="bg-lp-primary/10 text-lp-primary text-[11px] font-jakarta font-medium px-3 py-1 rounded-full">
                      ✦ Persona
                    </span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {[
                    { label: "Total de LPs", value: "0", sub: "0 publicadas" },
                    { label: "Visualizações", value: "0", sub: "Total de acessos" },
                    { label: "Taxa de Conversão", value: "--", sub: "0 conversões" },
                    { label: "Assinatura", value: "Pro Ativo", sub: "Fazer Upgrade", special: true },
                  ].map((m) => (
                    <div key={m.label} className={`p-3 rounded-lg border ${m.special ? "bg-lp-primary/5 border-lp-primary/20" : "bg-white border-gray-100"}`}>
                      <p className="text-[10px] font-jakarta text-gray-400 mb-1">{m.label}</p>
                      <p className={`text-lg font-semibold font-jakarta ${m.special ? "text-lp-primary" : "text-lp-darker"}`}>{m.value}</p>
                      <p className="text-[10px] font-jakarta text-gray-400">{m.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Recent LPs */}
                <div className="bg-white rounded-lg border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold font-jakarta text-lp-darker">Landing Pages Recentes</p>
                    <button className="text-xs font-jakarta text-lp-primary hover:underline">Ver todas →</button>
                  </div>
                  <div className="flex flex-col items-center py-8 text-gray-300">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <p className="text-xs font-jakarta mt-2 text-gray-400">Nenhuma landing page ainda</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

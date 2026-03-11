import Image from "next/image";

export default function LandingFooter() {
  return (
    <footer className="bg-white pt-8 pb-0">
      <div className="max-w-[1216px] mx-auto px-0">
        <div className="flex items-center justify-between py-6 px-0">
          {/* Logo + copyright */}
          <div className="flex items-center gap-5">
            <Image src="/landing/logo-symbol-footer.svg" alt="LP com IA" width={35} height={31} />
            <span
              className="font-jakarta"
              style={{ fontSize: "14px", fontWeight: 400, letterSpacing: "-0.28px", color: "#4c4c4c" }}
            >
              © 2026 LP com IA. Todos os direitos reservados
            </span>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-4">
            <a href="#" className="hover:opacity-70 transition-opacity">
              <Image src="/landing/social-twitter.svg" alt="Twitter" width={20} height={17} style={{ filter: "invert(29%) sepia(87%) saturate(1352%) hue-rotate(259deg) brightness(77%) contrast(98%)" }} />
            </a>
            <a href="#" className="hover:opacity-70 transition-opacity">
              <Image src="/landing/social-linkedin.svg" alt="LinkedIn" width={18} height={18} style={{ filter: "invert(29%) sepia(87%) saturate(1352%) hue-rotate(259deg) brightness(77%) contrast(98%)" }} />
            </a>
            <a href="#" className="hover:opacity-70 transition-opacity">
              <Image src="/landing/social-instagram.svg" alt="Instagram" width={17} height={17} style={{ filter: "invert(29%) sepia(87%) saturate(1352%) hue-rotate(259deg) brightness(77%) contrast(98%)" }} />
            </a>
            <a href="#" className="hover:opacity-70 transition-opacity">
              <Image src="/landing/social-facebook.svg" alt="Facebook" width={8} height={16} style={{ filter: "invert(29%) sepia(87%) saturate(1352%) hue-rotate(259deg) brightness(77%) contrast(98%)" }} />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom lines */}
      <div className="flex">
        <div className="h-1 flex-1" style={{ background: "#9d4edd" }} />
        <div className="h-1 flex-1" style={{ background: "rgba(199,125,255,0.80)" }} />
      </div>
    </footer>
  );
}

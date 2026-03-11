import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import ForWhomSection from "@/components/landing/ForWhomSection";
import HowDoesItWorkSection from "@/components/landing/HowDoesItWorkSection";
import WhyItWorksSection from "@/components/landing/WhyItWorksSection";
import StepByStepSection from "@/components/landing/StepByStepSection";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <main className="font-jakarta">
      <LandingNavbar />
      <HeroSection />
      <HowItWorksSection />
      <ForWhomSection />
      <HowDoesItWorkSection />
      <WhyItWorksSection />
      <StepByStepSection />
      <PricingSection />
      <FAQSection />
      <LandingFooter />
    </main>
  );
}

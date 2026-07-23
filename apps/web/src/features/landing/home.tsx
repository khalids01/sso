import { Hero } from "./components/hero";
import { Features } from "./components/features";
import { SecurityCompliance } from "./components/security-compliance";
import { FAQ } from "./components/faq";
import { CTA } from "./components/cta";
import { Footer } from "./components/footer";
import { LandingNav } from "./components/landing-nav";

export const Home = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased selection:bg-primary selection:text-primary-foreground">
      <LandingNav />
      <main className="flex-grow">
        <Hero />
        <Features />
        <SecurityCompliance />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Agents } from "@/components/landing/Agents";
import { Timeline } from "@/components/landing/Timeline";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/layout/Footer";

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <Hero />
      <Features />
      <Agents />
      <Timeline />
      <CTA />
      <Footer />
    </main>
  );
}


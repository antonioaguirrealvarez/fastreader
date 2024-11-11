import React from 'react';
import { DynamicHero } from './components/DynamicHero';
import { DemoReader } from './components/DemoReader';
import { Features } from './components/Features';
import { CustomerLogos } from './components/CustomerLogos';
import { TestimonialCarousel } from './components/TestimonialCarousel';
import { ScienceSection } from './components/ScienceSection';
import { PricingSection } from './components/PricingSection';
import { Reader } from './pages/Reader';
import { Library } from './pages/Library';
import { AddBook } from './pages/AddBook';
import { SupabaseTest } from './test/SupabaseTest';
import { ApiTest } from './test/ApiTest';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

export default function App() {
  const currentPath = window.location.pathname;

  if (currentPath === '/reader') {
    return <Reader />;
  }

  if (currentPath === '/library') {
    return <Library />;
  }

  if (currentPath === '/add-book') {
    return <AddBook />;
  }

  if (currentPath === '/test/supabase') {
    return <SupabaseTest />;
  }

  if (currentPath === '/test/api') {
    return <ApiTest />;
  }

  return (
    <div className="min-h-screen graph-paper flex flex-col">
      <Header />
      <main className="flex-1">
        <DynamicHero />
        <DemoReader />
        <Features />
        <CustomerLogos />
        <TestimonialCarousel />
        <ScienceSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
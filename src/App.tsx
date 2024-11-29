import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
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
import { UploadTest } from './test/UploadTest';
import { SpritzTest } from './test/SpritzTest';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PageBackground } from './components/ui/PageBackground';
import { ErrorBoundary } from './components/ErrorBoundary';
import { authService } from './services/auth/authService';
import { supabase } from './services/supabase/config';
import { FileConversionTest } from './test/FileConversionTest';
import { SupabaseTableTest } from './test/SupabaseTableTest';

function HomePage() {
  return (
    <PageBackground>
      <div className="flex flex-col">
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
    </PageBackground>
  );
}

function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log('Auth callback location:', location);
    const handleAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/library', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    };
    handleAuth();
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/reader" element={
              <ProtectedRoute>
                <Reader />
              </ProtectedRoute>
            } />
            <Route path="/library" element={
              <ProtectedRoute>
                <Library />
              </ProtectedRoute>
            } />
            <Route path="/add-book" element={
              <ProtectedRoute>
                <AddBook />
              </ProtectedRoute>
            } />
            <Route path="/test/supabase" element={<SupabaseTest />} />
            <Route path="/test/api" element={<ApiTest />} />
            <Route path="/test/upload" element={<UploadTest />} />
            <Route path="/test/spritz" element={<SpritzTest />} />
            <Route path="/test/file-conversion" element={<FileConversionTest />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/supabase-test" element={<SupabaseTableTest />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
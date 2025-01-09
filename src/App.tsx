import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { DynamicHero } from './components/DynamicHero';
import { DemoReader } from './components/DemoReader';
import { Header } from './components/Header';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PageBackground } from './components/ui/PageBackground';
import { ErrorBoundary } from './components/ErrorBoundary';
import { supabase } from './services/supabase/config';
import { FileConversionTest } from './test/FileConversionTest';
import { SupabaseTableTest } from './test/SupabaseTableTest';
import { GroqTest } from './test/GroqTest';
import { Reader } from './pages/Reader';
import { Library } from './pages/Library';
import { AddBook } from './pages/AddBook';
import { SupabaseTest } from './test/SupabaseTest';
import { ApiTest } from './test/ApiTest';
import { UploadTest } from './test/UploadTest';
import { SpritzTest } from './test/SpritzTest';
import FullTextDemo from './pages/FullTextDemo';
import { TestFullText } from './pages/TestFullText';

function HomePage() {
  return (
    <PageBackground>
      <div className="flex flex-col">
        <Header />
        <main className="flex-1">
          <DynamicHero />
          <DemoReader />
          {/* Commented out sections for future use */}
          {/* <Features /> */}
          {/* <CustomerLogos /> */}
          {/* <TestimonialCarousel /> */}
          {/* <ScienceSection /> */}
          {/* <PricingSection /> */}
        </main>
        {/* <Footer /> */}
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
            <Route path="/test/groq" element={process.env.NODE_ENV === 'development' ? <GroqTest /> : <Navigate to="/" />} />
            <Route path="/test/full-text" element={<FullTextDemo />} />
            <Route path="/test/full-text-reader" element={<TestFullText />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DynamicHero } from './components/DynamicHero';
import { DemoReader } from './components/DemoReader';
import { Header } from './components/Header';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PageBackground } from './components/ui/PageBackground';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Reader } from './pages/Reader';
import { Library } from './pages/Library';
import { AddBook } from './pages/AddBook';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { testRoutes } from './routes/test';
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
        </main>
      </div>
    </PageBackground>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Suspense fallback={<LoadingSpinner />}>
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
              {testRoutes}
              <Route path="/test/full-text" element={<FullTextDemo />} />
              <Route path="/test/full-text-reader" element={<TestFullText />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
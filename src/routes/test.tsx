import { lazy } from 'react';
import { Route } from 'react-router-dom';

const SupabaseTest = lazy(() => import('../test/SupabaseTest').then(module => ({ default: module.SupabaseTest })));
const UploadTest = lazy(() => import('../test/UploadTest').then(module => ({ default: module.UploadTest })));
const SupabaseTableTest = lazy(() => import('../test/SupabaseTableTest').then(module => ({ default: module.SupabaseTableTest })));
const FileConversionTest = lazy(() => import('../test/FileConversionTest').then(module => ({ default: module.FileConversionTest })));
const GroqTest = lazy(() => import('../test/GroqTest').then(module => ({ default: module.GroqTest })));
const SpritzTest = lazy(() => import('../test/SpritzTest').then(module => ({ default: module.SpritzTest })));
const ApiTest = lazy(() => import('../test/ApiTest').then(module => ({ default: module.ApiTest })));
const SpritzMethodsTest = lazy(() => import('../test/SpritzMethodsTest').then(module => ({ default: module.SpritzMethodsTest })));
const ChunkingTest = lazy(() => import('../test/ChunkingTest').then(module => ({ default: module.ChunkingTest })));
const ReadingModesTest = lazy(() => import('../test/ReadingModesTest').then(module => ({ default: module.ReadingModesTest })));

export const testRoutes = [
  <Route key="supabase-test" path="/test/supabase" element={<SupabaseTest />} />,
  <Route key="upload-test" path="/test/upload" element={<UploadTest />} />,
  <Route key="supabase-table-test" path="/test/table" element={<SupabaseTableTest />} />,
  <Route key="file-conversion-test" path="/test/conversion" element={<FileConversionTest />} />,
  <Route key="groq-test" path="/test/groq" element={<GroqTest />} />,
  <Route key="spritz-test" path="/test/spritz" element={<SpritzTest />} />,
  <Route key="api-test" path="/test/api" element={<ApiTest />} />,
  <Route key="spritz-methods-test" path="/test/spritz-methods" element={<SpritzMethodsTest />} />,
  <Route key="chunking-test" path="/test/chunking" element={<ChunkingTest />} />,
  <Route key="reading-modes-test" path="/test/reading-modes" element={<ReadingModesTest />} />
]; 
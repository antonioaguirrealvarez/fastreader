import React, { useState } from 'react';
import { Search, Filter, Plus, BookOpen, Clock, Star, Trash2, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Banner } from '../components/ui/Banner';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import { useLibraryStore } from '../stores/libraryStore';
import { useNavigate } from 'react-router-dom';
import { PageBackground } from '../components/ui/PageBackground';

export function Library() {
  const { user } = useAuth();
  const files = useLibraryStore(state => state.files);
  const removeFile = useLibraryStore(state => state.removeFile);
  const lastReadFileId = useLibraryStore(state => state.lastReadFileId);
  const setLastReadFile = useLibraryStore(state => state.setLastReadFile);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState<string>('');
  const [showNoBookError, setShowNoBookError] = useState(false);
  const navigate = useNavigate();

  const handleDeleteFile = (fileId: string) => {
    setShowDeleteConfirm(fileId);
  };

  const confirmDelete = (fileId: string) => {
    const fileName = files.find(f => f.id === fileId)?.name;
    removeFile(fileId);
    setShowDeleteConfirm(null);
    setShowDeleteSuccess(fileName || 'File');
    setTimeout(() => setShowDeleteSuccess(''), 3000);
  };

  const handleStartReading = (file: { id: string; content: string; name: string }) => {
    // Set this as the last read file
    setLastReadFile(file.id);
    
    // Navigate to reader with this specific file
    navigate('/reader', { 
      state: { 
        fileId: file.id,
        fileName: file.name,
        content: file.content 
      } 
    });
  };

  const handleGoToReader = () => {
    if (lastReadFileId) {
      const lastReadFile = files.find(f => f.id === lastReadFileId);
      if (lastReadFile) {
        handleStartReading(lastReadFile);
        return;
      }
    }

    // If no last read file, try the most recently added file
    if (files.length > 0) {
      const mostRecentFile = files.reduce((latest, current) => 
        latest.timestamp > current.timestamp ? latest : current
      );
      handleStartReading(mostRecentFile);
      return;
    }

    // If no files at all, show error
    setShowNoBookError(true);
    setTimeout(() => setShowNoBookError(false), 3000);
  };

  return (
    <PageBackground>
      <Header />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-7xl mx-auto">
          {showDeleteSuccess && (
            <Banner
              variant="success"
              title={`${showDeleteSuccess} deleted successfully`}
              className="mb-6"
              onClose={() => setShowDeleteSuccess('')}
            />
          )}

          {showNoBookError && (
            <Banner
              variant="warning"
              title="No books in your library. Add some books first!"
              className="mb-6"
              onClose={() => setShowNoBookError(false)}
            />
          )}

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-semibold text-gray-900">Your Library</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="primary" 
                onClick={handleGoToReader}
                className="flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Go to Reader
              </Button>
            </div>
          </div>
          
          {/* Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4 flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Total Books</p>
                <p className="text-2xl font-semibold text-gray-900">{files.length}</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <Clock className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-semibold text-gray-900">{files.filter(f => f.progress > 0 && f.progress < 100).length}</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <Star className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-500">Average Progress</p>
                <p className="text-2xl font-semibold text-gray-900">{Math.round(files.reduce((acc, f) => acc + f.progress, 0) / files.length)}%</p>
              </div>
            </Card>
          </div>
          
          {/* Search and Filter */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search your library..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <Button variant="secondary" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            <Button variant="primary" onClick={() => window.location.href = '/add-book'} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Book
            </Button>
          </div>

          {/* Book Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {files.map((file) => (
              <Card key={file.id} className="group cursor-pointer overflow-hidden">
                <div className="aspect-[2/3] relative overflow-hidden bg-gray-100">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="h-12 w-12 text-gray-400" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <h3 className="text-sm font-semibold mb-0.5 line-clamp-1">{file.name}</h3>
                    <p className="text-xs opacity-90 line-clamp-1">
                      Added {new Date(file.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFile(file.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4 text-white" />
                  </Button>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Text File</span>
                  </div>
                  <div className="space-y-1">
                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${file.progress || 0}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{file.progress ? `${file.progress}% complete` : 'Not started'}</span>
                      <span>{Math.round(file.content.length / 200)} min read</span>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full mt-2 flex items-center justify-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartReading(file);
                    }}
                  >
                    <BookOpen className="h-4 w-4" />
                    Start Reading
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />

      <ConfirmDialog
        isOpen={showDeleteConfirm !== null}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => showDeleteConfirm !== null && confirmDelete(showDeleteConfirm)}
        title="Delete File"
        message="Are you sure you want to delete this file? This action cannot be undone."
      />
    </PageBackground>
  );
}
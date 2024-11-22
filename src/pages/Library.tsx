import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, BookOpen, Clock, Star, Trash2, FileText, CheckSquare, Square } from 'lucide-react';
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
  const loadFiles = useLibraryStore(state => state.loadFiles);
  const lastReadFileId = useLibraryStore(state => state.lastReadFileId);
  const setLastReadFile = useLibraryStore(state => state.setLastReadFile);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState<string>('');
  const [showNoBookError, setShowNoBookError] = useState(false);
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadFiles(user.id);
    }
  }, [user, loadFiles]);

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteFile = async (fileId: string) => {
    if (!user) return;
    await removeFile(fileId, user.id);
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

  const toggleFileSelection = (id: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click when clicking checkbox
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAllSelection = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)));
    }
  };

  const deleteSelected = () => {
    selectedFiles.forEach(id => removeFile(id));
    setSelectedFiles(new Set());
  };

  // Calculate statistics
  const inProgressCount = files.filter(f => 
    f.metadata?.progress && f.metadata.progress > 0 && f.metadata.progress < 100
  ).length;

  const averageProgress = files.length > 0
    ? Math.round(
        files.reduce((acc, f) => acc + (f.metadata?.progress || 0), 0) / files.length
      )
    : 0;

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
                <p className="text-2xl font-semibold text-gray-900">{inProgressCount}</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <Star className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-500">Average Progress</p>
                <p className="text-2xl font-semibold text-gray-900">{averageProgress}%</p>
              </div>
            </Card>
          </div>
          
          {/* Search, Filter, and Selection Controls */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search your library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Selection Controls */}
            <div className="flex items-center gap-2">
              {selectedFiles.size > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAllSelection}
                    className="flex items-center gap-2"
                  >
                    {selectedFiles.size === files.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {selectedFiles.size === files.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deleteSelected}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Selected ({selectedFiles.size})
                  </Button>
                </>
              )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFiles.map(file => (
              <Card
                key={file.id}
                className={`overflow-hidden transition-all duration-200 hover:shadow-lg group ${
                  selectedFiles.has(file.id) ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleStartReading(file)}
              >
                <div className="p-4 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => toggleFileSelection(file.id, e)}
                      className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {selectedFiles.has(file.id) ? (
                        <CheckSquare className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                    <div>
                      <h3 className="font-medium text-gray-900">{file.name}</h3>
                      <p className="text-sm text-gray-500">
                        Added {new Date(file.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 hover:bg-red-50 -mt-1 -mr-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Keep existing progress bar and Start Reading button */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Text File</span>
                  </div>
                  <div className="space-y-1">
                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${file.metadata?.progress || 0}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {file.metadata?.progress 
                          ? `${file.metadata.progress}% complete` 
                          : 'Not started'}
                      </span>
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
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
import { readingProgressService } from '../services/readingProgressService';
import { supabase } from '../lib/supabase';
import { logger, LogCategory } from '../utils/logger';
import { Skeleton } from '../components/ui/Skeleton';
import { useSettingsStore } from '../stores/settingsStore';

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
  const [readingProgress, setReadingProgress] = useState<Record<string, number>>({});
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Single effect for initial data loading
  useEffect(() => {
    let mounted = true;

    const loadInitialData = async () => {
      if (!user?.id) return;

      try {
        setIsLoadingFiles(true);
        setIsLoadingProgress(true);

        // Load files
        await loadFiles(user.id);

        // Load progress
        logger.debug(LogCategory.LIBRARY, 'Loading initial library data');
        const progress = await readingProgressService.getAllProgress(user.id);
        
        if (!mounted) return;

        // Create a map of fileId -> progress percentage
        const progressMap = progress.reduce<Record<string, number>>((acc, curr) => {
          const percentage = Math.round((curr.current_word / curr.total_words) * 100);
          return {
            ...acc,
            [curr.file_id]: percentage
          };
        }, {});
        
        setReadingProgress(progressMap);
        setIsLoadingProgress(false);

        // Preload settings
        const { loadSettings } = useSettingsStore.getState();
        await loadSettings(user.id);

      } catch (error) {
        if (!mounted) return;
        logger.error(LogCategory.LIBRARY, 'Error loading library data', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load library data');
      } finally {
        if (mounted) {
          setIsLoadingFiles(false);
          setIsLoadingProgress(false);
        }
      }
    };

    loadInitialData();

    return () => {
      mounted = false;
    };
  }, [user?.id, loadFiles]);

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteFile = async (fileId: string) => {
    if (!user) return;
    try {
      console.log('Deleting file:', { fileId, userId: user.id });
      
      // Delete file from files table
      await removeFile(fileId, user.id);
      
      // Delete reading progress
      const { error: progressError } = await supabase
        .from('reading_progress')
        .delete()
        .match({ file_id: fileId, user_id: user.id });

      if (progressError) {
        console.error('Error deleting reading progress:', progressError);
      }

      // Refresh progress data
      loadAllProgress();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const confirmDelete = async (fileId: string) => {
    if (!user) return;

    const fileName = files.find(f => f.id === fileId)?.name;
    
    try {
      await handleDeleteFile(fileId);
      setShowDeleteConfirm(null);
      setShowDeleteSuccess(fileName || 'File');
      setTimeout(() => setShowDeleteSuccess(''), 3000);
    } catch (error) {
      console.error('Error in confirmDelete:', error);
    }
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

  const deleteSelected = async () => {
    if (!user) return;
    
    try {
      console.log('Deleting selected files:', { 
        selectedCount: selectedFiles.size, 
        fileIds: Array.from(selectedFiles) 
      });

      // Delete each file and its progress
      await Promise.all(
        Array.from(selectedFiles).map(async (fileId) => {
          await removeFile(fileId, user.id);
          
          const { error: progressError } = await supabase
            .from('reading_progress')
            .delete()
            .match({ file_id: fileId, user_id: user.id });

          if (progressError) {
            console.error('Error deleting reading progress:', progressError);
          }
        })
      );

      setSelectedFiles(new Set());
      await loadFiles(user.id);
      loadAllProgress(); // Refresh progress data
    } catch (error) {
      console.error('Error in bulk delete:', error);
    }
  };

  // Calculate statistics
  const calculateStatistics = () => {
    // Count books in progress (between 0 and 100%)
    const inProgressCount = Object.values(readingProgress).filter(progress => 
      progress > 0 && progress < 100
    ).length;

    // Calculate true average progress
    const averageProgress = Object.values(readingProgress).length > 0
      ? Math.round(
          Object.values(readingProgress).reduce((acc, curr) => acc + curr, 0) / 
          Object.values(readingProgress).length
        )
      : 0;

    return { inProgressCount, averageProgress };
  };

  const { inProgressCount, averageProgress } = calculateStatistics();

  // Parallel loading of files and progress
  useEffect(() => {
    if (!user) return;

    const loadLibraryData = async () => {
      setIsLoadingFiles(true);
      setIsLoadingProgress(true);
      setLoadError(null);

      // Load files and progress in parallel
      try {
        const [filesResult, progressResult] = await Promise.allSettled([
          // Load files with retry
          (async () => {
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                await loadFiles(user.id);
                return true;
              } catch (error) {
                if (attempt === 3) throw error;
                await new Promise(r => setTimeout(r, 1000 * attempt));
              }
            }
          })(),

          // Load progress with retry
          (async () => {
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                const progress = await readingProgressService.getAllProgress(user.id);
                const progressMap = progress.reduce<Record<string, number>>((acc, curr) => ({
                  ...acc,
                  [curr.file_id]: Math.round((curr.current_word / curr.total_words) * 100)
                }), {});
                setReadingProgress(progressMap);
                return true;
              } catch (error) {
                if (attempt === 3) {
                  logger.error(LogCategory.LIBRARY, 'Failed to load progress', error);
                  return false; // Don't throw, just continue without progress
                }
                await new Promise(r => setTimeout(r, 1000 * attempt));
              }
            }
          })()
        ]);

        // Handle results
        if (filesResult.status === 'rejected') {
          throw new Error('Failed to load library files');
        }

        // Progress failure doesn't block the library
        if (progressResult.status === 'rejected') {
          logger.warn(LogCategory.LIBRARY, 'Failed to load reading progress, continuing without it');
        }

      } catch (error) {
        setLoadError('Failed to load library. Please try again.');
        logger.error(LogCategory.LIBRARY, 'Library load failed', error);
      } finally {
        setIsLoadingFiles(false);
        setIsLoadingProgress(false);
      }
    };

    loadLibraryData();
  }, [user, loadFiles]);

  // Loading UI Components
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="border rounded-lg p-4">
          <Skeleton className="h-6 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-2 w-full mb-4" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  );

  // Error UI Component
  const ErrorMessage = () => (
    <div className="text-center py-8">
      <p className="text-red-600 mb-4">{loadError}</p>
      <Button 
        variant="secondary" 
        onClick={() => window.location.reload()}
      >
        Retry
      </Button>
    </div>
  );

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
            {isLoadingFiles ? (
              [...Array(3)].map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-8 w-8 mb-2" />
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-6 w-12" />
                </Card>
              ))
            ) : (
              <>
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
              </>
            )}
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
          {loadError ? (
            <ErrorMessage />
          ) : isLoadingFiles ? (
            <LoadingSkeleton />
          ) : (
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
                        handleDeleteFile(file.id);
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
                          style={{ width: `${readingProgress[file.id] || 0}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {readingProgress[file.id] 
                            ? `${readingProgress[file.id]}% complete` 
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
          )}
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
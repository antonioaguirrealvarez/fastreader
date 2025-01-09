import React, { useEffect } from 'react';
import { FileText, BookOpen } from 'lucide-react';
import { Button } from '../ui/Button';
import { useLibraryStore } from '../../stores/libraryStore';
import { Skeleton } from '../ui/Skeleton';
import { useAuth } from '../../contexts/AuthContext';
import { useReaderStore } from '../../stores/readerStore';

interface LibrarySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  hideHeader: boolean;
}

export function LibrarySidebar({ isOpen, onClose, darkMode, hideHeader }: LibrarySidebarProps) {
  const { user } = useAuth();
  const files = useLibraryStore(state => state.files);
  const isLoading = useLibraryStore(state => state.isLoading);
  const error = useLibraryStore(state => state.error);
  const loadFiles = useLibraryStore(state => state.loadFiles);
  const storeMode = useReaderStore(state => state.currentMode);
  const currentMode = (storeMode === 'rsvp' || storeMode === 'full-text') ? storeMode : 'rsvp';

  useEffect(() => {
    if (user?.id && isOpen) {
      loadFiles(user.id);
    }
  }, [user?.id, isOpen, loadFiles]);

  const handleStartReading = (file: { id: string; content: string; name: string }) => {
    // Update readerStore with file info
    useReaderStore.getState().setFileInfo({
      fileId: file.id,
      fileName: file.name,
      content: file.content,
      mode: currentMode // Keep current mode when switching files
    });

    // Close sidebar
    onClose();
  };

  const renderSkeletons = () => (
    Array(3).fill(0).map((_, index) => (
      <div 
        key={index} 
        className={`rounded-lg ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-sm`}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className={`h-12 w-12 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
            <div className="flex-1">
              <Skeleton className={`h-5 w-3/4 mb-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
              <Skeleton className={`h-4 w-1/2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <Skeleton className={`h-1.5 w-full rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
            <div className="flex justify-between items-center">
              <Skeleton className={`h-4 w-24 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
              <Skeleton className={`h-8 w-8 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
            </div>
          </div>
        </div>
      </div>
    ))
  );

  return (
    <div 
      className={`fixed left-0 ${hideHeader ? 'top-0' : 'top-16'} bottom-16 w-80 transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } ${darkMode ? 'bg-gray-900/95' : 'bg-gray-50/95'} backdrop-blur-sm shadow-2xl overflow-hidden flex flex-col`}
    >
      {/* Header */}
      <div className={`sticky top-0 z-10 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border-b p-4`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Your Library</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-gray-200 ${darkMode ? 'hover:bg-gray-800' : ''}`}
          >
            ×
          </button>
        </div>
      </div>

      {/* Book List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-red-900/20 text-red-200' : 'bg-red-50 text-red-600'}`}>
            {error}
          </div>
        )}
        
        {isLoading ? (
          renderSkeletons()
        ) : (
          files.map((file) => (
            <div 
              key={file.id} 
              className={`rounded-lg ${
                darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
              } transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium truncate ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      {file.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {Math.round(file.content.length / 200)} min read
                      </span>
                      <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>•</span>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(file.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 space-y-2">
                  <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                      style={{ width: `${file.metadata?.progress || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {file.metadata?.progress ? `${file.metadata.progress}% complete` : 'Not started'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartReading(file)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 p-2"
                    >
                      <BookOpen className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
import React from 'react';
import { useLibraryStore } from '../../stores/libraryStore';
import { FileText, BookOpen } from 'lucide-react';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

interface LibrarySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  hideHeader: boolean;
}

export function LibrarySidebar({ isOpen, onClose, darkMode, hideHeader }: LibrarySidebarProps) {
  const files = useLibraryStore(state => state.files);
  const navigate = useNavigate();

  const handleStartReading = (file: { id: string; content: string; name: string }) => {
    navigate('/reader', { 
      state: { 
        fileId: file.id,
        fileName: file.name,
        content: file.content 
      } 
    });
    onClose();
  };

  return (
    <div 
      className={`fixed left-0 ${hideHeader ? 'top-0' : 'top-16'} bottom-16 w-80 transform transition-transform duration-300 ease-in-out ${
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
        {files.map((file) => (
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
                    style={{ width: `${file.progress || 0}%` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {file.progress ? `${file.progress}% complete` : 'Not started'}
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
        ))}
      </div>
    </div>
  );
}
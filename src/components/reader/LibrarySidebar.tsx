import React from 'react';
import { BookOpen, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { CloseButton } from '../ui/CloseButton';
import { BookCard } from './BookCard';

interface LibrarySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

const books = [
  {
    id: 1,
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    progress: 30,
    totalPages: 180,
    currentPage: 54,
    timeLeft: '2h 15m',
    cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop',
  },
  {
    id: 2,
    title: '1984',
    author: 'George Orwell',
    progress: 75,
    totalPages: 328,
    currentPage: 246,
    timeLeft: '3h 20m',
    cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&h=600&fit=crop',
  },
  {
    id: 3,
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    progress: 45,
    totalPages: 281,
    currentPage: 126,
    timeLeft: '4h 10m',
    cover: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&h=600&fit=crop',
  },
  {
    id: 4,
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    progress: 90,
    totalPages: 432,
    currentPage: 389,
    timeLeft: '1h 30m',
    cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop',
  }
];

export function LibrarySidebar({ isOpen, onClose, darkMode = false }: LibrarySidebarProps) {
  const navigate = (path: string) => {
    window.location.href = path;
  };

  return (
    <div
      className={`fixed inset-y-0 left-0 w-80 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } z-40 ${darkMode ? 'bg-gray-900/95 text-gray-100' : 'bg-gray-50/95 text-gray-900'}`}
    >
      <div className="h-full flex flex-col">
        <div className={`sticky top-0 z-10 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Library</h2>
            </div>
            <CloseButton onClick={onClose} />
          </div>
        </div>
        
        <div className={`px-4 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1 flex items-center justify-between text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => navigate('/library')}
            >
              See Full Library
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="flex items-center justify-between text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => navigate('/add-book')}
            >
              Add Book
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20">
          <div className="p-4 space-y-4">
            {books.map((book) => (
              <BookCard key={book.id} book={book} darkMode={darkMode} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
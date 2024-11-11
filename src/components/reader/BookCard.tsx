import React from 'react';
import { Card } from '../ui/Card';
import { Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface Book {
  id: number;
  title: string;
  author: string;
  progress: number;
  totalPages: number;
  currentPage: number;
  timeLeft: string;
  cover: string;
}

interface BookCardProps {
  book: Book;
  darkMode?: boolean;
  onDelete?: (id: number) => void;
}

export function BookCard({ book, darkMode = false, onDelete }: BookCardProps) {
  return (
    <Card className={`p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl ${
      darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
    }`}>
      <div className="flex gap-4">
        <img
          src={book.cover}
          alt={book.title}
          className="w-16 h-24 object-cover rounded-md"
        />
        <div className="flex flex-col justify-between flex-1">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{book.title}</h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{book.author}</p>
              </div>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(book.id);
                  }}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 -mt-1 -mr-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className={`mt-1 flex items-center gap-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <span>{book.currentPage}/{book.totalPages} pages</span>
              <span>•</span>
              <span>{book.timeLeft} left</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${book.progress}%` }}
              />
            </div>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} text-right`}>
              {book.progress}% complete
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
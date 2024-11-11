import React, { useState } from 'react';
import { Search, Filter, BookOpen, Clock, Star, Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Banner } from '../components/ui/Banner';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const initialBooks = [
  {
    id: 1,
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    progress: 30,
    totalPages: 180,
    currentPage: 54,
    timeLeft: '2h 15m',
    cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop',
    category: 'Fiction',
    rating: 4.5,
    lastRead: '2 days ago',
  },
  // ... rest of the initial books
];

export function Library() {
  const [books, setBooks] = useState(initialBooks);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState<string>('');

  const totalBooks = books.length;
  const booksInProgress = books.filter(b => b.progress > 0 && b.progress < 100).length;
  const averageProgress = Math.round(books.reduce((acc, b) => acc + b.progress, 0) / totalBooks);

  const handleAddBook = () => {
    window.location.href = '/add-book';
  };

  const handleDeleteBook = (bookId: number) => {
    setShowDeleteConfirm(bookId);
  };

  const confirmDelete = (bookId: number) => {
    const bookTitle = books.find(b => b.id === bookId)?.title;
    setBooks(books.filter(b => b.id !== bookId));
    setShowDeleteConfirm(null);
    setShowDeleteSuccess(bookTitle || 'Book');
    setTimeout(() => setShowDeleteSuccess(''), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
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

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-semibold text-gray-900">Your Library</h1>
            </div>
            <Button variant="primary" onClick={handleAddBook} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Book
            </Button>
          </div>
          
          {/* Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4 flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Total Books</p>
                <p className="text-2xl font-semibold text-gray-900">{totalBooks}</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <Clock className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-semibold text-gray-900">{booksInProgress}</p>
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
          </div>

          {/* Book Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {books.map((book) => (
              <Card key={book.id} className="group cursor-pointer overflow-hidden">
                <div className="aspect-[2/3] relative overflow-hidden">
                  <img
                    src={book.cover}
                    alt={book.title}
                    className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <h3 className="text-sm font-semibold mb-0.5 line-clamp-1">{book.title}</h3>
                    <p className="text-xs opacity-90 line-clamp-1">{book.author}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBook(book.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4 text-white" />
                  </Button>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{book.category}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">★</span>
                      <span className="text-xs text-gray-700">{book.rating}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${book.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{book.progress}%</span>
                      <span>{book.timeLeft} left</span>
                    </div>
                  </div>
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
        title="Delete Book"
        message="Are you sure you want to delete this book? This action cannot be undone."
      />
    </div>
  );
}
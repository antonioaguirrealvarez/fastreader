export interface Database {
  public: {
    Tables: {
      reading_progress: {
        Row: ProgressData;
        Insert: ProgressData;
        Update: Partial<ProgressData>;
      };
      user_settings: {
        Row: SettingsData;
        Insert: SettingsData;
        Update: Partial<SettingsData>;
      };
      book_metadata: {
        Row: StoredFile;
        Insert: StoredFile;
        Update: Partial<StoredFile>;
      };
      library_files: {
        Row: LibraryFile;
        Insert: LibraryFile;
        Update: Partial<LibraryFile>;
      };
      test_table: {
        Row: {
          id: number;
          created_at: string;
          name: string;
          description: string;
        };
        Insert: Omit<TestItem, 'id' | 'created_at'>;
        Update: Partial<Omit<TestItem, 'id' | 'created_at'>>;
      };
      protected_table: {
        Row: {
          id: number;
          created_at: string;
          user_id: string;
          content: string;
        };
        Insert: Omit<ProtectedItem, 'id' | 'created_at'>;
        Update: Partial<Omit<ProtectedItem, 'id' | 'created_at'>>;
      };
    };
  };
}

export interface ProgressData {
  id?: string;
  user_id: string;
  file_id: string;
  position: number;
  total_words: number;
  reading_speed: number;
  created_at?: string;
  updated_at?: string;
}

export interface SettingsData {
  id?: string;
  user_id: string;
  dark_mode: boolean;
  hide_header: boolean;
  display_mode: 'spritz' | 'scroll';
  font_size: 'small' | 'medium' | 'large';
  record_analytics: boolean;
  pause_on_punctuation: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FileMetadata {
  title: string;
  author?: string;
  description?: string;
  tags?: string[];
  word_count?: number;
  reading_time?: number;
  last_read_position?: number;
  size?: number;
  mime_type?: string;
}

export interface StoredFile {
  id: string;
  user_id: string;
  file_path: string;
  title: string;
  author?: string;
  description?: string;
  word_count?: number;
  reading_time?: number;
  last_read_position?: number;
  tags?: string[];
  size: number;
  mime_type: string;
  created_at?: string;
  updated_at?: string;
}

export interface LibraryFile {
  id: string;
  name: string;
  content: string;
  timestamp: string;
  metadata: StoredFile;
  url: string;
}

export interface TestItem {
  id: number;
  created_at: string;
  name: string;
  description: string;
}

export interface ProtectedItem {
  id: number;
  created_at: string;
  user_id: string;
  content: string;
} 
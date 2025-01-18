export interface Database {
  public: {
    Tables: {
      book_metadata: {
        Row: {
          id: string;
          user_id: string;
          file_path: string;
          title: string;
          word_count: number;
          reading_time: number;
          size: number;
          mime_type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Row, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Row, 'id' | 'created_at' | 'updated_at'>>;
      };
      reading_progress: {
        Row: {
          id: number;
          user_id: string;
          file_id: string;
          current_word: number;
          total_words: number;
          updated_at: string;
        };
        Insert: Omit<Row, 'id' | 'updated_at'>;
        Update: Partial<Omit<Row, 'id' | 'updated_at'>>;
      };
      user_settings: {
        Row: {
          id: number;
          user_id: string;
          dark_mode: boolean;
          hide_header: boolean;
          display_mode: 'highlight' | 'spritz';
          font_size: string;
          record_analytics: boolean;
          pause_on_punctuation: boolean;
          words_per_minute: number;
          updated_at: string;
        };
        Insert: Omit<Row, 'id' | 'updated_at'>;
        Update: Partial<Omit<Row, 'id' | 'updated_at'>>;
      };
    };
  };
}

export type ProgressData = Database['public']['Tables']['reading_progress']['Insert'];
export interface ReaderSettings {
  darkMode: boolean;
  hideHeader: boolean;
  displayMode: 'highlight' | 'spritz';
  fontSize: string;
  recordAnalytics: boolean;
  pauseOnPunctuation: boolean;
  wordsPerMinute: number;
}

export interface SettingsData {
  id: number;
  user_id: string;
  dark_mode: boolean;
  hide_header: boolean;
  display_mode: 'highlight' | 'spritz';
  font_size: string;
  record_analytics: boolean;
  pause_on_punctuation: boolean;
  words_per_minute: number;
}

// Add a utility type for converting between camelCase and snake_case
export type CamelToSnakeCase<T> = {
  [K in keyof T as K extends string 
    ? K extends `${infer F}${infer R}`
      ? F extends Uppercase<F>
        ? `${lowercase<F>}_${CamelToSnakeCase<R>}`
        : F
      : never
    : never]: T[K];
}; 

export interface FileMetadata {
  title: string;
  word_count: number;
  reading_time: number;
  size: number;
  mime_type: string;
  file_path?: string;
}

export interface StoredFile {
  id: string;
  path: string;
  name: string;
  metadata: FileMetadata;
  url?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface FileUploadResponse {
  success: boolean;
  data?: StoredFile;
  error?: string;
} 

export interface BookMetadata {
  id: string;
  user_id: string;
  file_path: string;
  title: string;
  word_count: number;
  reading_time: number;
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
  metadata: BookMetadata;
  url?: string;
} 
export interface Database {
  public: {
    Tables: {
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
        Update: Partial<Insert>;
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
}

export interface SettingsData {
  user_id: string;
  dark_mode: boolean;
  hide_header: boolean;
  display_mode: 'highlight' | 'spritz';
  font_size: string;
  record_analytics: boolean;
  pause_on_punctuation: boolean;
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
export interface EPUBMetadata {
  title: string;
  creator: string;
  publisher: string;
  language: string;
  rights: string;
  identifier: string;
  pubdate: string;
  description: string;
}

export interface EPUBChapter {
  id: string;
  href: string;
  title: string;
  content: string;
  order: number;
}

export interface EPUBDocument {
  id: string;
  metadata: EPUBMetadata;
  chapters: EPUBChapter[];
  lastRead?: {
    chapterId: string;
    position: number;
    timestamp: number;
  };
  createdAt: number;
  updatedAt: number;
} 
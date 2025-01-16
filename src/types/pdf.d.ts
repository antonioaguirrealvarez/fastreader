declare module 'pdfjs-dist/build/pdf' {
  export * from 'pdfjs-dist';
  export const GlobalWorkerOptions: {
    workerSrc: string;
  };
}

declare module 'pdfjs-dist' {
  export interface TextItem {
    str: string;
    transform: number[];
    width: number;
    height: number;
    dir: string;
  }

  export interface TextMarkedContent {
    type: string;
    items: TextItem[];
  }

  export interface TextContent {
    items: (TextItem | TextMarkedContent)[];
  }
} 
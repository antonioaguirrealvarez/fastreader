declare module 'pdfjs-dist/build/pdf.mjs' {
  export * from 'pdfjs-dist';
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
  const workerUrl: string;
  export default workerUrl;
}

// Extend LogOptions interface to include operationId
declare module '../../logging/core' {
  interface LogOptions {
    operationId?: string;
  }
} 
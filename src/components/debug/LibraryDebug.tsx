import { useLibraryStore } from '../../stores/libraryStore';
import { loggingCore, LogCategory } from '../../services/logging/core';

export function LibraryDebug() {
  const files = useLibraryStore(state => state.files);

  const debugStore = () => {
    loggingCore.log(LogCategory.DEBUG, 'library_store_state', {
      fileCount: files.length,
      fileIds: files.map(f => f.id),
      fileNames: files.map(f => f.name)
    });
  };

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white rounded-lg shadow-lg">
      <button
        onClick={debugStore}
        className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
      >
        Debug Library Store
      </button>
      <pre className="mt-2 text-xs">
        Files in store: {files.length}
      </pre>
    </div>
  );
} 
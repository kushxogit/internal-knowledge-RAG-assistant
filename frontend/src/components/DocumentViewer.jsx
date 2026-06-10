import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

// Simple UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function DocumentViewer({ documentUuid, onClose }) {
  const [docData, setDocData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isValidUuid = documentUuid && UUID_REGEX.test(documentUuid);

  useEffect(() => {
    if (!isValidUuid) {
      setDocData(null);
      return;
    }

    const fetchDocumentText = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/v1/documents/${documentUuid}/text`);
        if (!response.ok) {
          throw new Error('Failed to load document text');
        }
        const data = await response.json();
        setDocData(data);
      } catch (err) {
        console.error('Error fetching document metadata:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentText();
  }, [documentUuid, isValidUuid]);

  // If not a valid UUID (e.g. "recent" or "session-1" global chat)
  if (!isValidUuid) {
    return (
      <section className="flex-1 hidden lg:flex flex-col h-full bg-slate-950/10 backdrop-blur-md relative justify-center items-center p-8 border-l border-white/5">
        <div className="text-center max-w-md z-10 font-extralight text-slate-300 tracking-tight">
          <div className="w-16 h-16 rounded-full bg-slate-900/20 border border-white/5 flex items-center justify-center mb-6 mx-auto shadow-sm">
            <span className="material-symbols-outlined text-[32px] text-primary font-extralight">hub</span>
          </div>
          <h3 className="text-lg font-extralight tracking-tight text-white mb-2">Global Knowledge Context</h3>
          <p className="text-[13px] text-on-surface-variant leading-relaxed">
            You are in a global session. The assistant will retrieve and synthesize answers across all indexed documents in your Knowledge Library.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 hidden lg:flex flex-col h-full bg-slate-950/10 backdrop-blur-md relative border-l border-white/5">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 bg-slate-950/30 backdrop-blur-lg flex justify-between items-center h-16 shrink-0 relative">
        <div className="flex items-center gap-3 min-w-0 pr-12">
          <span className="material-symbols-outlined text-primary text-[20px] font-extralight flex-shrink-0">description</span>
          <h3 className="text-[13px] font-extralight tracking-tight text-white/90 truncate cursor-default">
            {loading ? 'Loading...' : docData?.file_name || 'Document Viewer'}
          </h3>
          {docData && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/20 border border-primary/20 text-primary text-[10px] font-mono font-medium ml-2">
              {docData.status === 'processed' ? 'Indexed' : docData.status}
            </span>
          )}
        </div>
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/50 hover:text-white transition-all absolute right-4 top-1/2 -translate-y-1/2"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex justify-center items-center relative bg-black/20">
        {loading ? (
          <div className="flex flex-col justify-center items-center gap-4 text-on-surface-variant font-mono text-xs">
            <span className="material-symbols-outlined text-[32px] text-primary animate-spin">sync</span>
            Retrieving document...
          </div>
        ) : error ? (
          <div className="flex flex-col justify-center items-center gap-3 text-red-400 font-mono text-xs">
            <span className="material-symbols-outlined text-[32px]">error</span>
            {error}
          </div>
        ) : (
          <iframe 
            src={`/api/v1/documents/${documentUuid}/file`} 
            className="w-full h-full border-none bg-white rounded-lg shadow-2xl m-4"
            title="Document Viewer"
          />
        )}
      </div>
    </section>
  );
}

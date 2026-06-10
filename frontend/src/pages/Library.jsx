import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Library() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeUploadId, setActiveUploadId] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  
  const fileInputRef = useRef(null);

  // Fetch documents list
  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/v1/documents/');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Poll for document status if any are still vectorizing
  useEffect(() => {
    const isProcessing = documents.some(
      (doc) => doc.status === 'uploaded' || doc.status === 'processing'
    );
    
    if (isProcessing) {
      const interval = setInterval(() => {
        fetchDocuments();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [documents]);

  // Handle file upload
  const handleUpload = async (file) => {
    if (!file) return;
    
    // Optimistic UI entry
    const tempUuid = 'temp-' + Date.now();
    const tempDoc = {
      uuid: tempUuid,
      file_name: file.name,
      size_in_bytes: file.size,
      status: 'uploading_to_server'
    };
    
    setDocuments((prev) => [tempDoc, ...prev]);
    setUploading(true);
    setActiveUploadId(tempUuid);
    setUploadError(null);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/v1/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Upload failed');
      }

      const data = await response.json();
      setActiveUploadId(data.uuid);

      await fetchDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.message);
      setActiveUploadId(null);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files[0]);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle document deletion
  const handleDelete = async (e, docUuid, fileName) => {
    e.stopPropagation(); // Avoid navigating to chat when deleting
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      const response = await fetch(`/api/v1/documents/${docUuid}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDocuments((prev) => prev.filter((d) => d.uuid !== docUuid));
      } else {
        const errData = await response.json();
        alert(`Failed to delete: ${errData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Network error while deleting document');
    }
  };

  // Format bytes helper
  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 flex flex-col p-8 h-screen overflow-y-auto relative w-full pt-20">
      <div className="max-w-4xl mx-auto w-full z-10 font-extralight text-slate-350">
        
        {/* Title Section */}
        <h1 className="text-3xl font-extralight tracking-tight text-white mb-2 leading-tight">Knowledge Library</h1>
        <p className="text-xs font-extralight tracking-tight text-white/50 mb-10">
          Upload documents to expand Salt & Pepper's context window. Supported formats: PDF, DOCX, TXT, MD.
        </p>

        {/* Drag and Drop Zone */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="bg-transparent rounded-xl p-8 border border-white/10 hover:border-white/30 transition-all flex flex-col items-center justify-center min-h-[200px] mb-10 group cursor-pointer relative overflow-hidden"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".pdf,.docx,.txt,.md" 
            className="hidden" 
          />
          
          <div className="w-16 h-16 rounded-full bg-slate-900/40 border border-white/5 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300 shadow-sm relative z-10">
            {uploading ? (
              <span className="material-symbols-outlined text-[32px] text-primary animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined text-[32px] text-slate-400 group-hover:text-white transition-colors">cloud_upload</span>
            )}
          </div>
          
          <h3 className="text-base font-semibold text-white mb-1 relative z-10">
            {uploading ? 'Uploading and Chunking...' : 'Drag & Drop Documents'}
          </h3>
          <p className="text-xs text-on-surface-variant text-center max-w-sm relative z-10 leading-relaxed mt-1">
            {uploading 
              ? 'Your file is being parsed, chunked, and vectorized locally.' 
              : 'or click to browse local files. Files will be automatically processed, chunked, and vectorized for retrieval.'
            }
          </p>
          
          {!uploading && (
            <button className="mt-6 px-6 py-2 rounded-lg bg-white text-slate-950 hover:bg-slate-100 font-semibold transition-all shadow-md active:scale-95 relative z-10 flex items-center gap-2 text-xs uppercase tracking-wider">
              <span className="material-symbols-outlined text-[15px]">add</span> Select File
            </button>
          )}

          {uploadError && (
            <div className="mt-4 text-xs text-red-400 font-medium px-4 py-2 bg-red-950/20 border border-red-500/20 rounded-md">
              Error: {uploadError}
            </div>
          )}
        </div>

        {/* Recent Indexes Table */}
        <div>
          <div className="flex justify-between items-end mb-4 border-b border-white/5 pb-3">
            <h2 className="text-sm font-extralight text-white tracking-tight">Recent Indexes</h2>
            <span className="font-mono text-[9px] font-extralight text-white/50 tracking-widest uppercase">
              {documents.length} {documents.length === 1 ? 'FILE' : 'FILES'} INDEXED
            </span>
          </div>
          
          <div className="bg-transparent rounded-xl overflow-hidden border border-white/5">
            {loading ? (
              <div className="p-8 text-center text-on-surface-variant text-xs font-mono">
                Loading indexed library...
              </div>
            ) : documents.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant text-sm">
                No documents found in your library. Upload a file above to begin.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-slate-950/20 text-on-surface-variant uppercase tracking-wider text-[10px] font-semibold">
                    <th className="p-4 w-1/2">Filename</th>
                    <th className="p-4 w-1/4">Size</th>
                    <th className="p-4 w-1/4">Status</th>
                    <th className="p-4 w-12 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr 
                      key={doc.uuid} 
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group" 
                      onClick={() => navigate(`/chat/${doc.uuid}`)}
                    >
                      <td className="p-4 text-white flex items-center gap-2 font-light">
                        <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-white transition-colors">description</span>
                        <span className="truncate max-w-[280px] md:max-w-[360px]">{doc.file_name}</span>
                      </td>
                      <td className="p-4 font-mono text-on-surface-variant text-xs">
                        {formatBytes(doc.size_in_bytes)}
                      </td>
                      <td className="p-4">
                        {doc.status === 'uploading_to_server' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/20 border border-blue-500/25 text-blue-400 text-[10px] font-mono font-medium">
                            <span className="material-symbols-outlined text-[12px] animate-spin">sync</span> Uploading...
                          </span>
                        )}
                        {doc.status === 'processed' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/20 border border-emerald-500/25 text-emerald-400 text-[10px] font-mono font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Ready
                          </span>
                        )}
                        {(doc.status === 'uploaded' || doc.status === 'processing') && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/20 border border-primary/20 text-primary text-[10px] font-mono font-medium">
                            <span className="material-symbols-outlined text-[12px] animate-spin">sync</span> Chunking & Indexing...
                          </span>
                        )}
                        {doc.status === 'error' && (
                          <span 
                            title={doc.error_message}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950/20 border border-red-500/25 text-red-400 text-[10px] font-mono font-medium"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> Failed
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={(e) => handleDelete(e, doc.uuid, doc.file_name)}
                          className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-950/25 transition-all cursor-pointer"
                          title="Delete document"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Full Screen Uploading/Processing Overlay */}
      {activeUploadId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-10 flex flex-col items-center shadow-2xl max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-300 relative">
            
            {(() => {
              const activeDoc = documents.find(d => d.uuid === activeUploadId);
              if (!activeDoc && uploading) {
                return (
                  <>
                    <span className="material-symbols-outlined text-[48px] text-blue-400 animate-spin mb-6" style={{fontVariationSettings: "'wght' 200"}}>sync</span>
                    <h2 className="text-xl font-extralight text-white mb-2 tracking-tight">Uploading Document...</h2>
                    <p className="text-xs text-slate-400 text-center leading-relaxed font-light">
                      Transferring file to the server.
                    </p>
                  </>
                );
              }
              if (!activeDoc) return null;

              if (activeDoc.status === 'uploading_to_server') {
                return (
                  <>
                    <span className="material-symbols-outlined text-[48px] text-blue-400 animate-spin mb-6" style={{fontVariationSettings: "'wght' 200"}}>sync</span>
                    <h2 className="text-xl font-extralight text-white mb-2 tracking-tight">Uploading...</h2>
                    <p className="text-xs text-slate-400 text-center leading-relaxed font-light">
                      Transferring "{activeDoc.file_name}" to the server.
                    </p>
                  </>
                );
              }
              
              if (activeDoc.status === 'uploaded' || activeDoc.status === 'processing') {
                return (
                  <>
                    <span className="material-symbols-outlined text-[48px] text-primary animate-spin mb-6" style={{fontVariationSettings: "'wght' 200"}}>sync</span>
                    <h2 className="text-xl font-extralight text-white mb-2 tracking-tight">Chunking & Indexing...</h2>
                    <p className="text-xs text-slate-400 text-center leading-relaxed font-light mb-6">
                      Extracting text and generating vector embeddings for "{activeDoc.file_name}".
                    </p>
                    <button 
                      onClick={() => setActiveUploadId(null)}
                      className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 hover:text-white px-4 py-2 rounded border border-white/10 hover:bg-white/5 transition-all"
                    >
                      Run in Background
                    </button>
                  </>
                );
              }

              if (activeDoc.status === 'processed') {
                // Auto-dismiss after 2 seconds
                setTimeout(() => setActiveUploadId(null), 2000);
                return (
                  <>
                    <span className="material-symbols-outlined text-[48px] text-emerald-400 mb-6" style={{fontVariationSettings: "'wght' 200"}}>check_circle</span>
                    <h2 className="text-xl font-extralight text-white mb-2 tracking-tight">Ready!</h2>
                    <p className="text-xs text-slate-400 text-center leading-relaxed font-light">
                      "{activeDoc.file_name}" is indexed and ready to query.
                    </p>
                  </>
                );
              }
              
              if (activeDoc.status === 'error') {
                return (
                  <>
                    <span className="material-symbols-outlined text-[48px] text-red-400 mb-6" style={{fontVariationSettings: "'wght' 200"}}>error</span>
                    <h2 className="text-xl font-extralight text-white mb-2 tracking-tight">Processing Failed</h2>
                    <p className="text-xs text-red-400/80 text-center leading-relaxed font-light mb-6">
                      {activeDoc.error_message || 'An unknown error occurred.'}
                    </p>
                    <button 
                      onClick={() => setActiveUploadId(null)}
                      className="text-[10px] uppercase tracking-wider font-semibold text-white bg-red-500/20 hover:bg-red-500/30 px-4 py-2 rounded border border-red-500/50 transition-all"
                    >
                      Dismiss
                    </button>
                  </>
                );
              }
              
              return null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

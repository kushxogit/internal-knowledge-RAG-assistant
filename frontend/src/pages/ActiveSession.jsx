import React, { useState } from 'react';
import ChatInterface from '../components/ChatInterface';
import DocumentViewer from '../components/DocumentViewer';

export default function ActiveSession() {
  const [openDocumentId, setOpenDocumentId] = useState(null);

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10 w-full pt-16 md:pt-0">
      {/* Chat interface takes full width until DocumentViewer is opened */}
      <ChatInterface onOpenDoc={setOpenDocumentId} />
      {openDocumentId && (
        <DocumentViewer documentUuid={openDocumentId} onClose={() => setOpenDocumentId(null)} />
      )}
    </div>
  );
}

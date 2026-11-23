import { useCallback, useEffect, useState } from 'react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { getUserId, listDocuments } from './services/documentsApi.js';

export default function App() {
  const [userId] = useState(getUserId);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const refreshDocuments = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      setDocuments(await listDocuments(userId));
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Document Management System</h1>
      <UploadComponent userId={userId} onUploaded={refreshDocuments} />
      <section>
        <h2>Meus documentos</h2>
        <DocumentList userId={userId} documents={documents} isLoading={isLoading} error={loadError} />
      </section>
      <footer>
        <small>Identificador do usuário: {userId}</small>
      </footer>
    </main>
  );
}

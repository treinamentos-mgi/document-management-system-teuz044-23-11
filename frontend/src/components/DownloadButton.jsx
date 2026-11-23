import { useState } from 'react';
import { downloadDocument } from '../services/documentsApi.js';
import StatusMessage from './StatusMessage.jsx';

function saveBlobAsFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DownloadButton({ userId, item }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);

  async function handleClick() {
    setIsDownloading(true);
    setError(null);

    try {
      const blob = await downloadDocument({ id: item.id, userId });
      saveBlobAsFile(blob, item.originalName);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={handleClick} disabled={isDownloading}>
        {isDownloading ? 'Baixando...' : 'Baixar'}
      </button>
      {error && <StatusMessage type="error">{error}</StatusMessage>}
    </>
  );
}

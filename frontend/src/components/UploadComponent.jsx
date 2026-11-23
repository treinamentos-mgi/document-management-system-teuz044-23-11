import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentsApi.js';
import StatusMessage from './StatusMessage.jsx';

export default function UploadComponent({ userId, onUploaded }) {
  const formRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      setFeedback({ type: 'error', message: 'Selecione um arquivo para enviar.' });
      return;
    }

    setIsUploading(true);
    setFeedback(null);

    try {
      const uploaded = await uploadDocument({ file, userId });
      setFeedback({ type: 'success', message: `Documento "${uploaded.originalName}" enviado com sucesso.` });
      setFile(null);
      formRef.current?.reset();
      onUploaded();
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section>
      <h2>Enviar documento</h2>
      <form ref={formRef} onSubmit={handleSubmit}>
        <input
          type="file"
          onChange={(event) => setFile(event.target.files[0] ?? null)}
          disabled={isUploading}
        />
        <button type="submit" disabled={isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
      {feedback && <StatusMessage type={feedback.type}>{feedback.message}</StatusMessage>}
    </section>
  );
}

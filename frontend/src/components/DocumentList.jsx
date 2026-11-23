import DownloadButton from './DownloadButton.jsx';
import StatusMessage from './StatusMessage.jsx';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString('pt-BR');
}

export default function DocumentList({ userId, documents, isLoading, error }) {
  if (error) {
    return <StatusMessage type="error">{error}</StatusMessage>;
  }

  if (isLoading && documents.length === 0) {
    return <p>Carregando documentos...</p>;
  }

  if (documents.length === 0) {
    return <p>Nenhum documento enviado até o momento.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Tamanho</th>
          <th>Enviado em</th>
          <th>Ação</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((item) => (
          <tr key={item.id}>
            <td>{item.originalName}</td>
            <td>{formatFileSize(item.size)}</td>
            <td>{formatDate(item.uploadedAt)}</td>
            <td>
              <DownloadButton userId={userId} item={item} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

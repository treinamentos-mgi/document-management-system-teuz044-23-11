const API_BASE_URL = '/api';
const USER_ID_STORAGE_KEY = 'dms.userId';

export class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export function getUserId() {
  let userId = localStorage.getItem(USER_ID_STORAGE_KEY);

  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_STORAGE_KEY, userId);
  }

  return userId;
}

async function toApiError(response) {
  const body = await response.json().catch(() => null);
  const error = body?.error;

  return new ApiError(
    error?.message ?? 'Erro inesperado ao comunicar com o servidor.',
    error?.code ?? 'UNKNOWN_ERROR',
  );
}

async function request(path, { userId, headers, ...options } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { 'X-User-Id': userId, ...headers },
    });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor.', 'NETWORK_ERROR');
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  return response;
}

export async function uploadDocument({ file, userId }) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', { userId, method: 'POST', body: formData });
  return response.json();
}

export async function listDocuments(userId) {
  const response = await request('/documents', { userId });
  const { items } = await response.json();
  return items;
}

export async function downloadDocument({ id, userId }) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`, { userId });
  return response.blob();
}

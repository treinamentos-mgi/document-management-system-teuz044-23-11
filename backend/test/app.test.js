const { describe, test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// A configuração é lida na carga do módulo, então o diretório temporário precisa
// ser definido antes de require('../src/app').
const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
process.env.STORAGE_DIR = storageDir;

const app = require('../src/app');

let server;
let baseUrl;

before(() => new Promise((resolve) => {
  server = app.listen(0, () => {
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
}));

after(() => new Promise((resolve) => {
  server.close(() => {
    fs.rmSync(storageDir, { recursive: true, force: true });
    resolve();
  });
}));

function uploadFile(owner, { name = 'contrato.txt', type = 'text/plain', content = 'conteúdo' } = {}) {
  const body = new FormData();
  body.append('file', new Blob([content], { type }), name);
  return fetch(`${baseUrl}/upload`, { method: 'POST', headers: { 'X-User-Id': owner }, body });
}

async function readErrorCode(response) {
  const { error } = await response.json();
  return error.code;
}

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

describe('API de documentos', () => {
  test('upload grava o arquivo e devolve metadados sem o caminho interno', async () => {
    const response = await uploadFile('ana', { name: 'contrato.txt' });
    const body = await response.json();

    assert.strictEqual(response.status, 201);
    assert.strictEqual(response.headers.get('location'), `/documents/${body.id}`);
    assert.strictEqual(body.originalName, 'contrato.txt');
    assert.strictEqual(body.owner, 'ana');
    assert.strictEqual(body.storagePath, undefined);
  });

  test('upload sem arquivo retorna 400 MISSING_FILE', async () => {
    const response = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': 'ana' },
      body: new FormData(),
    });

    assert.strictEqual(response.status, 400);
    assert.strictEqual(await readErrorCode(response), 'MISSING_FILE');
  });

  test('upload de tipo não permitido retorna 415 UNSUPPORTED_MEDIA_TYPE', async () => {
    const response = await uploadFile('ana', { name: 'app.exe', type: 'application/x-msdownload' });

    assert.strictEqual(response.status, 415);
    assert.strictEqual(await readErrorCode(response), 'UNSUPPORTED_MEDIA_TYPE');
  });

  test('requisição sem X-User-Id retorna 400 MISSING_USER_ID', async () => {
    const response = await fetch(`${baseUrl}/documents`);

    assert.strictEqual(response.status, 400);
    assert.strictEqual(await readErrorCode(response), 'MISSING_USER_ID');
  });

  test('listagem mostra só os documentos do dono, do mais recente ao mais antigo', async () => {
    const owner = 'usuario-listagem';
    await uploadFile(owner, { name: 'primeiro.txt' });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await uploadFile(owner, { name: 'segundo.txt' });
    await uploadFile('outro-usuario', { name: 'alheio.txt' });

    const response = await fetch(`${baseUrl}/documents`, { headers: { 'X-User-Id': owner } });
    const { items } = await response.json();

    assert.deepStrictEqual(items.map((item) => item.originalName), ['segundo.txt', 'primeiro.txt']);
  });

  test('download só é permitido ao dono e entrega o conteúdo original', async () => {
    const { id } = await (await uploadFile('dono', { name: 'privado.txt', content: 'segredo' })).json();

    const intruso = await fetch(`${baseUrl}/documents/${id}/download`, { headers: { 'X-User-Id': 'intruso' } });
    assert.strictEqual(intruso.status, 404);
    assert.strictEqual(await readErrorCode(intruso), 'DOCUMENT_NOT_FOUND');

    const dono = await fetch(`${baseUrl}/documents/${id}/download`, { headers: { 'X-User-Id': 'dono' } });
    assert.strictEqual(dono.status, 200);
    assert.match(dono.headers.get('content-disposition'), /^attachment; filename="privado\.txt"/);
    assert.strictEqual(await dono.text(), 'segredo');
  });

  test('download de documento cujo arquivo foi removido retorna 500 STORAGE_ERROR', async () => {
    const filesBefore = new Set(fs.readdirSync(storageDir));
    const { id } = await (await uploadFile('dono-sem-arquivo')).json();
    const [storedFile] = fs.readdirSync(storageDir).filter((name) => !filesBefore.has(name));
    fs.rmSync(path.join(storageDir, storedFile));

    const response = await fetch(`${baseUrl}/documents/${id}/download`, {
      headers: { 'X-User-Id': 'dono-sem-arquivo' },
    });

    assert.strictEqual(response.status, 500);
    assert.strictEqual(await readErrorCode(response), 'STORAGE_ERROR');
  });
});

# Especificação - Document Management System

> Especificação derivada de [spec-template.md](./spec-template.md), para
> desenvolvimento guiado por especificação (Spec Driven Development).

## 1. Objetivo

Entregar um sistema web que permita a usuários enviar, listar e baixar
documentos, com armazenamento local no filesystem da aplicação e metadados em
memória nesta fase inicial.

## 2. Escopo

### Dentro do escopo

- Upload de documentos (um arquivo por requisição)
- Listagem dos documentos enviados
- Download de documentos pelo identificador
- Gestão simples por usuário: cada documento pertence a um dono e cada usuário
  vê apenas os próprios documentos
- Interface web mínima em React para as três operações acima

### Fora do escopo

- Armazenamento externo ou em nuvem (S3, GCS, Azure Blob etc.)
- Serviços de upload de terceiros
- Versionamento de documentos
- Persistência em banco de dados (metadados ficam em memória)
- Autenticação e autorização completas (JWT, OAuth, sessões)
- Edição, exclusão ou compartilhamento de documentos
- Pré-visualização de conteúdo e busca textual
- TypeScript (projeto em JavaScript puro nesta fase)

## 3. Requisitos funcionais

| ID    | Requisito                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------------ |
| RF-01 | O usuário pode enviar um documento via multipart/form-data, informando o arquivo                        |
| RF-02 | Ao enviar, o sistema registra os metadados (id, nome original, tamanho, data de envio e dono)          |
| RF-03 | O usuário pode listar os documentos de sua propriedade                                                 |
| RF-04 | O usuário pode baixar um documento pelo seu identificador, recebendo o conteúdo original com o nome    |
| RF-05 | Ao baixar um documento de outro dono, o sistema responde 404 (não revela a existência do recurso)      |
| RF-06 | Uploads sem arquivo, com tamanho acima do limite ou com tipo não permitido são rejeitados com erro claro |
| RF-07 | A interface permite enviar um documento, ver a lista e baixar um item da lista                         |
| RF-08 | A interface exibe mensagens de erro e de sucesso ao usuário em português                               |

### Premissas de identificação do usuário

Nesta fase não há autenticação. O dono do documento é identificado pelo cabeçalho
HTTP `X-User-Id` enviado pelo cliente. Se o cabeçalho estiver ausente, a
requisição é rejeitada com 400. Essa identificação é simples e não deve ser
tratada como mecanismo de segurança.

### Regras de negócio

- O identificador do documento é gerado pelo sistema (UUID v4); o nome enviado
  pelo cliente nunca é usado como caminho no disco.
- O nome original é preservado apenas como metadado e no cabeçalho
  `Content-Disposition` do download, com sanitização.
- Tamanho máximo e tipos de arquivo permitidos são configuráveis por variáveis
  de ambiente (ver seção 4).

## 4. Requisitos não funcionais

| ID      | Requisito                                                                                                  |
| ------- | ---------------------------------------------------------------------------------------------------------- |
| RNF-01  | Arquivos gravados no filesystem local via `multer` com `diskStorage`, na pasta `backend/storage`           |
| RNF-02  | Metadados mantidos em memória nesta fase (perda ao reiniciar o processo é aceita)                          |
| RNF-03  | Configuração via variáveis de ambiente (12-Factor), com valores padrão documentados                        |
| RNF-04  | Limite de tamanho por arquivo configurável (`MAX_UPLOAD_SIZE_BYTES`, padrão 10 MB)                         |
| RNF-05  | Lista de tipos MIME permitidos configurável (`ALLOWED_MIME_TYPES`)                                         |
| RNF-06  | Erros tratados nos limites do sistema: entrada HTTP e leitura/escrita de arquivos                          |
| RNF-07  | Respostas de erro em JSON no formato `{ "error": { "code": string, "message": string } }`                  |
| RNF-08  | Testes do backend com o runner nativo do Node (`node:test`)                                                |
| RNF-09  | Dependências preferencialmente já presentes no `package.json`                                              |
| RNF-10  | Código e símbolos em inglês; mensagens ao usuário e comentários em português                               |
| RNF-11  | Limpeza do arquivo em disco quando a gravação dos metadados falhar                                         |

### Variáveis de ambiente

| Variável                 | Padrão                                | Descrição                                      |
| ------------------------ | ------------------------------------- | ---------------------------------------------- |
| `PORT`                   | `3000`                                | Porta HTTP do backend                          |
| `STORAGE_DIR`            | `backend/storage`                     | Pasta de gravação dos arquivos                 |
| `MAX_UPLOAD_SIZE_BYTES`  | `10485760` (10 MB)                    | Tamanho máximo por arquivo                     |
| `ALLOWED_MIME_TYPES`     | `application/pdf,image/png,image/jpeg,text/plain` | Tipos MIME aceitos, separados por vírgula |

## 5. Modelo de dados (metadados do documento)

Entidade única `Document`, mantida em memória (`Map` por `id`) no repositório.

| Campo        | Tipo   | Obrigatório | Descrição                                                        |
| ------------ | ------ | ----------- | ---------------------------------------------------------------- |
| id           | string | sim         | Identificador único (UUID v4) gerado pelo sistema                |
| originalName | string | sim         | Nome original do arquivo enviado                                 |
| mimeType     | string | sim         | Tipo MIME informado no upload                                    |
| size         | number | sim         | Tamanho em bytes                                                 |
| storagePath  | string | sim         | Caminho interno do arquivo em `STORAGE_DIR` (não exposto na API) |
| uploadedAt   | string | sim         | Data/hora do upload (ISO 8601, UTC)                              |
| owner        | string | sim         | Valor de `X-User-Id` no momento do upload                        |

Na API, `storagePath` não é retornado.

## 6. Contratos de API

Todas as rotas da API ficam sob o prefixo `/api` no front-end (proxy do Vite).
No backend, as rotas são servidas diretamente, como abaixo.

Cabeçalho obrigatório em todas as rotas: `X-User-Id: <string não vazia>`.

### Formato de metadados (resposta)

```json
{
  "id": "5f0c2a1e-8d2b-4c59-9a43-2f1d7e6b8c10",
  "originalName": "contrato.pdf",
  "mimeType": "application/pdf",
  "size": 245760,
  "uploadedAt": "2026-11-23T13:30:00.000Z",
  "owner": "user-123"
}
```

### POST /upload

- Entrada: `multipart/form-data` com campo `file` (um arquivo)
- Sucesso: `201 Created`, corpo com os metadados do documento criado e
  cabeçalho `Location: /documents/:id`
- Erros:
  - `400 MISSING_USER_ID` - cabeçalho `X-User-Id` ausente ou vazio
  - `400 MISSING_FILE` - campo `file` ausente
  - `413 FILE_TOO_LARGE` - arquivo acima de `MAX_UPLOAD_SIZE_BYTES`
  - `415 UNSUPPORTED_MEDIA_TYPE` - tipo MIME não permitido
  - `500 STORAGE_ERROR` - falha ao gravar o arquivo ou os metadados

### GET /documents

- Sucesso: `200 OK`, corpo `{ "items": [ <metadados>, ... ] }` contendo apenas
  documentos do dono informado em `X-User-Id`, ordenados por `uploadedAt`
  decrescente
- Erros:
  - `400 MISSING_USER_ID`

### GET /documents/:id/download

- Sucesso: `200 OK`, corpo com o conteúdo binário; cabeçalhos `Content-Type`
  com o MIME original, `Content-Length` com o tamanho e
  `Content-Disposition: attachment; filename="<nome sanitizado>"`
- Erros:
  - `400 MISSING_USER_ID`
  - `404 DOCUMENT_NOT_FOUND` - id inexistente ou pertencente a outro dono
  - `500 STORAGE_ERROR` - arquivo registrado mas ausente ou ilegível no disco

### GET /health

- Sucesso: `200 OK`, corpo `{ "status": "ok" }`. Usado para verificação de
  disponibilidade.

## 7. Decisões arquiteturais

### Backend (Clean Architecture simples)

Estrutura em `backend/src`:

```
backend/src/
├── routes/        # define endpoints e delega para controllers
├── controllers/   # entrada/saída HTTP e validação básica
├── services/      # regras de negócio (upload, listagem, download)
├── repositories/  # persistência: metadados em memória e arquivos no disco
└── config/        # leitura das variáveis de ambiente
```

Fluxo de dependência: `routes -> controllers -> services -> repositories`.
Camadas internas não importam camadas externas. O `multer` fica na borda HTTP
(configurado no nível de rota/middleware) e a camada de repositório recebe
apenas o caminho já gravado.

### Frontend (React + Vite)

- Componentes funcionais com hooks
- Organização em `components/`, `pages/` e `services/`
- Comunicação via `fetch` com prefixo `/api`, com proxy para o backend no Vite
- Componentes reutilizáveis; evitar duplicação

### Outras decisões

- Armazenamento exclusivamente local
- Sem TypeScript nesta fase
- Sem overengineering: sem ORM, sem filas, sem cache, sem camadas adicionais

## 8. Plano de execução

Plano em etapas, na ordem de implementação. Cada etapa deve deixar o sistema
funcional e testável antes da seguinte.

1. **Configuração e esqueleto do backend**: estrutura de pastas em
   `backend/src`, leitura de variáveis de ambiente (`config/`), servidor
   Express e rota `GET /health`.
2. **Repositório de documentos**: repositório em memória para metadados e
   gravação/leitura de arquivos em `STORAGE_DIR`.
3. **Upload**: configuração do `multer` com `diskStorage`, validação de
   tamanho e de tipo MIME, serviço de upload e rota `POST /upload`, com a
   regra de limpeza do arquivo em caso de falha (RNF-11).
4. **Listagem**: serviço e rota `GET /documents` filtrando por `X-User-Id`.
5. **Download**: serviço e rota `GET /documents/:id/download` com regra de
   propriedade (RF-05) e cabeçalhos de arquivo.
6. **Tratamento de erros e validação de cabeçalho**: middleware comum de erro
   no formato `{ error: { code, message } }` (RNF-07) e validação de
   `X-User-Id`.
7. **Testes do backend**: testes com `node:test` cobrindo upload válido e
   inválido, listagem por dono, download e isolamento entre donos.
8. **Esqueleto do frontend**: projeto React + Vite, proxy `/api` para o
   backend e estrutura de `components/`, `pages/` e `services/`.
9. **Serviço de API no frontend**: módulo em `services/` com as chamadas
   `fetch` para upload, listagem e download, enviando `X-User-Id`.
10. **Telas e componentes**: formulário de upload, lista de documentos e botão
    de download, com mensagens de erro e sucesso em português (RF-07, RF-08).
11. **Revisão final**: conferência dos requisitos RF-01 a RF-08 e RNF-01 a
    RNF-11, atualização do README com instruções de execução e variáveis de
    ambiente.

### Critérios de aceite por etapa

- Etapas 1 a 7: `node --test` no backend passa sem falhas.
- Etapas 8 a 10: fluxo completo de upload, listagem e download funciona no
  navegador com o backend em execução.
- Etapa 11: todos os requisitos marcados como atendidos.

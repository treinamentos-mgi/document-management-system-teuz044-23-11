class DocumentError extends Error {
  constructor(errorCode, message) {
    super(message);
    this.name = 'DocumentError';
    this.errorCode = errorCode;
  }
}

module.exports = { DocumentError };

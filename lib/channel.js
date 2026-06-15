const MIME = {
  html: 'text/html; charset=utf-8',
  json: 'application/json; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  ico: 'image/x-icon',
};

class Channel {
  constructor(req, res) {
    this.req = req;
    this.res = res;
  }

  static contentType(filePath) {
    const dot = filePath.lastIndexOf('.');
    const ext = dot === -1 ? 'html' : filePath.slice(dot + 1);
    return MIME[ext] || 'application/octet-stream';
  }

  write(status, type, body) {
    this.res.writeHead(status, { 'Content-Type': MIME[type] || type });
    this.res.end(body);
  }

  json(status, data) {
    this.write(status, 'json', JSON.stringify(data));
  }

  html(status, body) {
    this.write(status, 'html', body);
  }

  notFound() {
    this.html(404, 'Not found');
  }

  badRequest(message = 'Bad request') {
    this.html(400, message);
  }

  methodNotAllowed() {
    this.html(405, 'Method not allowed');
  }

  serverError(error) {
    console.error(error);
    const errors = { general: 'Unexpected server error' };
    this.json(500, { ok: false, errors });
  }

  async receiveBody() {
    const chunks = [];
    for await (const chunk of this.req) chunks.push(chunk);
    return Buffer.concat(chunks).toString();
  }
}

export default Channel;

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function criarServidorEstatico() {
  return http.createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch (_) {
      res.writeHead(400);
      return res.end('Bad Request');
    }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); return res.end(); }
      res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'})[path.extname(file)] || 'application/octet-stream');
      res.end(data);
    });
  });
}

if (require.main === module) {
  criarServidorEstatico().listen(8040, '127.0.0.1', () => console.log('SATIC: http://127.0.0.1:8040'));
}

module.exports = { criarServidorEstatico };

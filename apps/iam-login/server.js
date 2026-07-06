/**
 * iam-login 静态文件服务（零依赖），默认 http://127.0.0.1:3100
 * 注意：Windows Hyper-V/Docker 常保留 4126–4225，4180 会 EACCES，勿改回该段端口。
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(3100);
const HOST = process.env.IAM_LOGIN_HOST || '127.0.0.1';
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url?.split('?')[0] || '/';
  if (urlPath === '/') {
    urlPath = '/index.html';
  }
  const filePath = path.join(ROOT, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end(err.code === 'ENOENT' ? 'Not Found' : 'Error');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.on('error', (err) => {
  if (err.code === 'EACCES') {
    // eslint-disable-next-line no-console
    console.error(
      `iam-login: 无法绑定 ${HOST}:${PORT}（EACCES）。` +
        ' Windows 可能保留了该端口段（netsh interface ipv4 show excludedportrange protocol=tcp）。' +
        ' 请设置环境变量 IAM_LOGIN_PORT 为未保留端口（如 3100），并同步 deploy/nginx/conf.d/iam.conf。',
    );
  } else if (err.code === 'EADDRINUSE') {
    // eslint-disable-next-line no-console
    console.error(`iam-login: 端口 ${PORT} 已被占用，请更换 IAM_LOGIN_PORT。`);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`iam-login: http://${HOST}:${PORT}`);
});

import { createServer } from 'node:http';
import { readFileSync, createReadStream } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addBrowserFilter } from './browser-filter.mjs';
import { readRuns, renderPage, safeFile } from './data.mjs';
const root = resolve(process.env.REPORT_RUNS_DIR || 'test-runs');
const template = readFileSync(fileURLToPath(new URL('./index.html', import.meta.url)), 'utf8');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml', '.zip':'application/zip', '.webm':'video/webm', '.md':'text/plain; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.woff2':'font/woff2' };
createServer((req,res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400); return res.end(); }
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if (path === '/report-browser-filter.js') {
    res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    return res.end(req.method === 'HEAD' ? undefined : readFileSync(new URL('./browser-filter.js', import.meta.url)));
  }
  if (path === '/api/runs') {
    try { res.setHeader('Content-Type', 'application/json; charset=utf-8'); return res.end(req.method === 'HEAD' ? undefined : JSON.stringify(readRuns(root))); }
    catch { res.writeHead(500); return res.end(JSON.stringify({ error: 'Resultaten konden niet worden gelezen.' })); }
  }
  if (path === '/') {
    try { const html = renderPage(template, readRuns(root)); res.setHeader('Content-Type','text/html; charset=utf-8'); return res.end(req.method === 'HEAD' ? undefined : html); }
    catch { res.writeHead(500); return res.end('Het overzicht kon niet worden geladen.'); }
  }
  const file = path.startsWith('/runs/') && safeFile(root, path.slice(6));
  if (!file) { res.writeHead(404); return res.end('Bestand niet beschikbaar.'); }
  res.setHeader('Content-Type',types[extname(file)] || 'application/octet-stream');
  if (/^\/runs\/[^/]+\/html\/index\.html$/.test(path)) {
    const runId = path.split('/')[2];
    const run = readRuns(root).find(r => r.id === runId);
    const html = addBrowserFilter(readFileSync(file, 'utf8'), (run?.tests || []).map(t => t.browser));
    return res.end(req.method === 'HEAD' ? undefined : html);
  }
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).on('error', () => res.destroy()).pipe(res);
}).listen(Number(process.env.PORT || 8070), process.env.REPORT_HOST || '127.0.0.1', () => console.log('Resultatenoverzicht: http://localhost:' + (process.env.PORT || 8070)));

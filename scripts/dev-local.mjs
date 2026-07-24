import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const envFile = '.env.local';
const envText = existsSync(envFile) ? readFileSync(envFile, 'utf8') : '';

if (!/^\s*VILAO_API_KEY\s*=\s*\S+/m.test(envText)) {
  console.warn('\n[Geo3D] VILAO_API_KEY is not configured in .env.local.');
  console.warn('[Geo3D] The UI and local demos will work, but AI Draw/Solve will return an error.');
  console.warn('[Geo3D] Copy .env.example to .env.local and provide the key before testing AI features.\n');
}

const commands = [
  { label: 'API', args: ['server.js'] },
  { label: 'Vite', args: ['node_modules/vite/bin/vite.js'] },
];

const children = commands.map(({ label, args }) => {
  const child = spawn(process.execPath, args, { stdio: 'inherit' });
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`[Geo3D] ${label} exited with code ${code}.`);
  });
  return child;
});

const stop = () => {
  children.forEach((child) => child.kill('SIGTERM'));
  process.exit();
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const ENV_PATH = join(ROOT, '.env.local');

function fail(message) {
  console.error(`\nERROR: ${message}`);
  process.exit(1);
}

function maskToken(token) {
  if (!token || token.length < 12) return '***';
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

function readEnvFile() {
  if (!existsSync(ENV_PATH)) {
    fail('No se encontro .env.local en la raiz del proyecto.');
  }

  return readFileSync(ENV_PATH, 'utf-8');
}

function readEnvValue(content, key) {
  const regex = new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`, 'm');
  const match = content.match(regex);
  if (!match) return '';

  const raw = match[1].trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }

  return raw;
}

function setEnvValue(content, key, value) {
  const line = `${key}=${value}`;
  const regex = new RegExp(`^\\s*${key}\\s*=.*$`, 'm');

  if (regex.test(content)) {
    return content.replace(regex, line);
  }

  const separator = content.endsWith('\n') || content.length === 0 ? '' : '\n';
  return `${content}${separator}${line}\n`;
}

async function refreshInstagramToken(currentToken) {
  const url = new URL('https://graph.instagram.com/refresh_access_token');
  url.searchParams.set('grant_type', 'ig_refresh_token');
  url.searchParams.set('access_token', currentToken);

  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.access_token) {
    const err = data?.error?.message || 'Respuesta invalida al renovar el token.';
    fail(`No se pudo renovar el token de Instagram. ${err}`);
  }

  return {
    token: data.access_token,
    expiresIn: Number(data.expires_in || 0),
  };
}

async function main() {
  console.log('\nRenovando token largo de Instagram...');
  const envContent = readEnvFile();

  const existingInstafeed = readEnvValue(envContent, 'INSTAFEED_ACCESS_TOKEN');
  const existingInstagram = readEnvValue(envContent, 'INSTAGRAM_ACCESS_TOKEN');
  const currentToken = existingInstafeed || existingInstagram;

  if (!currentToken) {
    fail('No existe INSTAFEED_ACCESS_TOKEN ni INSTAGRAM_ACCESS_TOKEN en .env.local.');
  }

  console.log(`Token actual: ${maskToken(currentToken)}`);
  const refreshed = await refreshInstagramToken(currentToken);

  let nextEnvContent = envContent;
  nextEnvContent = setEnvValue(nextEnvContent, 'INSTAFEED_ACCESS_TOKEN', refreshed.token);

  if (existingInstagram) {
    nextEnvContent = setEnvValue(nextEnvContent, 'INSTAGRAM_ACCESS_TOKEN', refreshed.token);
  }

  writeFileSync(ENV_PATH, nextEnvContent, 'utf-8');

  const expiresDays = refreshed.expiresIn > 0
    ? Math.round(refreshed.expiresIn / 86400)
    : 0;

  console.log(`Token renovado: ${maskToken(refreshed.token)}`);
  if (expiresDays > 0) {
    console.log(`Caducidad aproximada: ${expiresDays} dias.`);
  }
  console.log('Actualizado .env.local correctamente.');
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});

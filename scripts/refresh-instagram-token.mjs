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

/**
 * Extrae y limpia de forma estricta únicamente el token alfanumérico.
 * Elimina prefijos repetidos, nombres de variables, signos "=" y comillas.
 */
function cleanToken(rawToken) {
  if (!rawToken) return '';

  // 1. Convertir a string y eliminar comillas y espacios en los extremos
  let clean = String(rawToken).replace(/['"]/g, '').trim();

  // 2. Eliminar de forma iterativa cualquier prefijo de variable seguido de "=" 
  // (por si se ha duplicado como "INSTAFEED_ACCESS_TOKEN=INSTAFEED_ACCESS_TOKEN=token")
  const prefixRegex = /(INSTAFEED_ACCESS_TOKEN|INSTAGRAM_ACCESS_TOKEN|PUBLIC_INSTAGRAM_ACCESS_TOKEN)\s*=\s*/gi;
  while (prefixRegex.test(clean)) {
    clean = clean.replace(prefixRegex, '');
  }

  // 3. Eliminar cualquier signo "=" huérfano al inicio que haya podido quedar
  clean = clean.replace(/^=+/, '');

  // 4. Extraer el segmento alfanumérico más largo (los tokens de Instagram contienen letras, números, puntos, guiones y guiones bajos)
  // Esto descarta cualquier texto restante o duplicación separada por espacios o caracteres inválidos.
  const match = clean.match(/[a-zA-Z0-9_\-\.]+/g);
  if (!match) return '';

  // Si hay múltiples segmentos debido a una mala concatenación, nos quedamos con el segmento largo (el token real)
  return match.reduce((longest, current) => current.length > longest.length ? current : longest, '');
}

function readEnvFile() {
  if (!existsSync(ENV_PATH)) {
    fail(`No se encontró el archivo .env.local en la ruta: ${ENV_PATH}`);
  }
  return readFileSync(ENV_PATH, 'utf-8');
}

function readEnvValue(content, key) {
  const regex = new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`, 'm');
  const match = content.match(regex);
  if (!match) return '';

  return cleanToken(match[1]);
}

function setEnvValue(content, key, value) {
  const cleanedValue = cleanToken(value);
  const line = `${key}=${cleanedValue}`;
  const regex = new RegExp(`^\\s*${key}\\s*=.*$`, 'm');

  if (regex.test(content)) {
    return content.replace(regex, line);
  }

  const separator = content.endsWith('\n') || content.length === 0 ? '' : '\n';
  return `${content}${separator}${line}\n`;
}

async function refreshInstagramToken(currentToken) {
  // Aseguramos una limpieza absoluta del token antes de meterlo en la URL de consulta
  const sanitizedToken = cleanToken(currentToken);
  
  if (!sanitizedToken) {
    fail('El token de origen está vacío o no es válido tras la limpieza.');
  }

  const url = new URL('https://graph.instagram.com/refresh_access_token');
  url.searchParams.set('grant_type', 'ig_refresh_token');
  url.searchParams.set('access_token', sanitizedToken); // Solo se envía la cadena alfanumérica limpia

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data?.access_token) {
      const err = data?.error?.message || 'Respuesta inválida al renovar el token.';
      fail(`La API de Instagram rechazó la solicitud.\nDetalle: ${err}`);
    }

    return {
      token: cleanToken(data.access_token),
      expiresIn: Number(data.expires_in || 0),
    };
  } catch (error) {
    fail(`Error de red al intentar conectar con la API de Instagram: ${error.message}`);
  }
}

async function main() {
  console.log('\nRenovando token de Instagram (Saneamiento Estricto)...');
  const envContent = readEnvFile();

  const existingInstafeed = readEnvValue(envContent, 'INSTAFEED_ACCESS_TOKEN');
  const existingInstagram = readEnvValue(envContent, 'INSTAGRAM_ACCESS_TOKEN');
  const existingPublicInstafeed = readEnvValue(envContent, 'PUBLIC_INSTAGRAM_ACCESS_TOKEN');
  
  const rawCurrentToken = existingInstafeed || existingInstagram || existingPublicInstafeed;
  const currentToken = cleanToken(rawCurrentToken);

  if (!currentToken) {
    fail('No se encontró ningún token de Instagram válido en su .env.local.');
  }

  console.log(`Token actual saneado: ${maskToken(currentToken)}`);
  const refreshed = await refreshInstagramToken(currentToken);

  let nextEnvContent = envContent;
  let actualizados = [];

  if (existingInstafeed) {
    nextEnvContent = setEnvValue(nextEnvContent, 'INSTAFEED_ACCESS_TOKEN', refreshed.token);
    actualizados.push('INSTAFEED_ACCESS_TOKEN');
  }
  if (existingInstagram) {
    nextEnvContent = setEnvValue(nextEnvContent, 'INSTAGRAM_ACCESS_TOKEN', refreshed.token);
    actualizados.push('INSTAGRAM_ACCESS_TOKEN');
  }
  if (existingPublicInstafeed) {
    nextEnvContent = setEnvValue(nextEnvContent, 'PUBLIC_INSTAGRAM_ACCESS_TOKEN', refreshed.token);
    actualizados.push('PUBLIC_INSTAGRAM_ACCESS_TOKEN');
  }

  writeFileSync(ENV_PATH, nextEnvContent, 'utf-8');

  const expiresDays = refreshed.expiresIn > 0
    ? Math.round(refreshed.expiresIn / 86400)
    : 0;

  console.log(`Nuevo token saneado y guardado: ${maskToken(refreshed.token)}`);
  if (expiresDays > 0) {
    console.log(`Caducidad aproximada del nuevo token: ${expiresDays} días.`);
  }
  console.log(`Se ha sobrescrito el archivo .env.local de forma segura. Variables actualizadas: ${actualizados.join(', ')}`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
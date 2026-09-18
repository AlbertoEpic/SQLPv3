#!/usr/bin/env node
// Removes public/_headers and public/_redirects before `astro build`.
// Vite/Rolldown can crash trying to parse these as build entries if they're
// left in public/ from a previous run; generate-deployment-config.js
// regenerates them (into dist/) after the build finishes.
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const files = ['_headers', '_redirects'].map((name) => path.join(projectRoot, 'public', name));

for (const file of files) {
  try {
    await fs.unlink(file);
    console.log(`🧹 Removed public/${path.basename(file)} before build`);
  } catch {
    // File doesn't exist, nothing to clean up
  }
}

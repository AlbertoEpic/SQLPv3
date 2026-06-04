import { promises as fs } from 'node:fs';
import path from 'node:path';

const STRAVA_DIR = path.join(process.cwd(), 'public', 'gpx', 'strava');
const INDEX_PATH = path.join(STRAVA_DIR, 'index.json');
const MANUAL_LINKS_PATH = path.join(STRAVA_DIR, 'manual-links.json');
const IS_STRICT_MODE = process.argv.includes('--strict');

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function decodeXmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractFirstTag(xml, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? decodeXmlEntities(match[1].trim()) : null;
}

function basenameWithoutExt(fileName) {
  return fileName.replace(/\.[^.]+$/, '');
}

function candidateSlugFromFileName(fileName) {
  const base = basenameWithoutExt(fileName);
  const withoutDatePrefix = base.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  const withoutNumericSuffix = withoutDatePrefix.replace(/-\d+$/, '');
  return slugify(withoutNumericSuffix || base);
}

async function readJsonOrDefault(filePath, fallbackValue) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

async function main() {
  await fs.mkdir(STRAVA_DIR, { recursive: true });

  const entries = await fs.readdir(STRAVA_DIR, { withFileTypes: true });
  const gpxFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.gpx'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const indexItems = [];
  const generatedLinks = {};

  for (let i = 0; i < gpxFiles.length; i += 1) {
    const file = gpxFiles[i];
    const filePath = path.join(STRAVA_DIR, file);
    const xml = await fs.readFile(filePath, 'utf8');

    const name = extractFirstTag(xml, 'name') || basenameWithoutExt(file);
    const startDate = extractFirstTag(xml, 'time');

    indexItems.push({
      id: `gpx-${String(i + 1).padStart(4, '0')}`,
      name,
      file,
      start_date: startDate || null,
      status: 'ok',
    });

    const manualSlug = candidateSlugFromFileName(file);
    if (manualSlug && !generatedLinks[manualSlug]) {
      generatedLinks[manualSlug] = file;
    }
  }

  const existingManualLinks = await readJsonOrDefault(MANUAL_LINKS_PATH, {});
  const mergedManualLinks = {
    ...generatedLinks,
    ...(existingManualLinks && typeof existingManualLinks === 'object' ? existingManualLinks : {}),
  };

  const existingKeys = new Set(
    Object.keys(existingManualLinks && typeof existingManualLinks === 'object' ? existingManualLinks : {})
  );
  const suggestedOnly = Object.entries(generatedLinks)
    .filter(([slug]) => !existingKeys.has(slug))
    .map(([slug, file]) => ({ slug, file }));

  await fs.writeFile(INDEX_PATH, `${JSON.stringify(indexItems, null, 2)}\n`, 'utf8');

  if (IS_STRICT_MODE) {
    process.stdout.write(
      `Generated ${indexItems.length} GPX entries in public/gpx/strava/index.json. Strict mode enabled: manual-links.json was not modified.\n`
    );

    if (suggestedOnly.length === 0) {
      process.stdout.write('No new manual-link suggestions.\n');
    } else {
      process.stdout.write('Suggested manual links (not written):\n');
      for (const suggestion of suggestedOnly) {
        process.stdout.write(`  "${suggestion.slug}": "${suggestion.file}"\n`);
      }
    }

    return;
  }

  await fs.writeFile(MANUAL_LINKS_PATH, `${JSON.stringify(mergedManualLinks, null, 2)}\n`, 'utf8');

  process.stdout.write(
    `Generated ${indexItems.length} GPX entries in public/gpx/strava/index.json and ${Object.keys(mergedManualLinks).length} manual links.\n`
  );
}

main().catch((error) => {
  process.stderr.write(`generate-strava-gpx-index failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

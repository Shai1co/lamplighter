#!/usr/bin/env node
/**
 * Picture Quest — new-story scaffolder.
 *
 *   node tools/new-story.mjs <id> "Title"
 *
 * Copies stories/_template/* into stories/<id>/, creates the asset folders,
 * rewrites the id/title in manifest.json and the story.pq header, and prints
 * the exact next steps. Refuses to overwrite an existing story.
 *
 * If stories/_template is absent, a built-in minimal template is written so the
 * tool works standalone.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STORIES = path.join(ROOT, 'stories');
const TEMPLATE_DIR = path.join(STORIES, '_template');

const TEXT_EXT = new Set(['.pq', '.json', '.jsonc', '.md', '.txt', '.csv']);
const ASSET_SUBDIRS = ['backgrounds', 'characters', 'cg', 'audio'];

function die(msg) {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
  process.exit(1);
}

function isValidId(id) {
  return /^[a-z0-9][a-z0-9_-]*$/.test(id);
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Built-in fallback template (used only when stories/_template is missing). */
function embeddedTemplate(id, title) {
  const manifest = {
    id,
    title,
    subtitle: 'A one-line subtitle',
    author: 'Your Name',
    synopsis: 'A short synopsis shown on the title screen.',
    entry: 'start',
    credits: [`Written by Your Name`, 'Made with Picture Quest'],
    cover: 'title_key',
    artStyle:
      'painterly cinematic still, muted Pacific-Northwest palette, soft volumetric light, ' +
      'filmic grain, shallow depth of field, no text, no watermark, no UI, no border',
    theme: {
      key: '#7db4c8',
      accent: '#e0a46b',
      ink: '#e8eef2',
      paper: '#0d1418',
      grade: { splitTone: 0.25, contrast: 1.05, saturation: 0.95 },
      bloom: 0.6,
      vignette: 0.35,
      grain: 0.5,
    },
    characters: {
      you: {
        name: 'You',
        color: '#e0a46b',
        description: 'the player, seen only in reflection',
        home: 'center',
        defaultPose: 'neutral',
        poses: {
          neutral: {
            prompt:
              'a quiet figure at a desk, seen from behind, warm lamp light, portrait framing',
          },
        },
      },
    },
    backgrounds: {
      room: {
        prompt: 'a small room at night, one window, rain outside, a desk lamp glowing',
        parallax: 0.04,
        focus: 0.5,
        layers: ['far', 'near'],
      },
    },
    cg: {
      title_key: {
        prompt: 'moody establishing shot for a title screen, negative space at top for a logo',
      },
    },
    music: {
      night_theme: { synth: 'pad', loop: true, volume: 0.7 },
    },
    ambience: {
      room_tone: { synth: 'hum', loop: true, volume: 0.5 },
      rain: { synth: 'rain', loop: true, volume: 0.5 },
    },
    sfx: {
      chime: { synth: 'chime', volume: 0.8 },
      click: { synth: 'click', volume: 0.7 },
    },
    vars: { trust: 0, coherence: 3 },
  };

  const story = `# ${title}  (id: ${id})
# Picture Quest story script — see docs/AUTHORING.md for the full reference.
# Everything after '#' is a comment. One statement per line.

:: start
@chapter "${title}" "Chapter One"
@bg room mood:night
@ambience room_tone fade:2
@music night_theme fade:3
@weather rain intensity:0.5

| The rain has not stopped since you sat down.
you: Okay. I'm listening.

@enter you from:center pose:neutral
you: Where should we begin?

> "Tell me what happened tonight." -> listen
>! "You don't have to explain anything." -> reassure

:: listen
@set trust += 1
you: Take your time.
-> END

:: reassure
@set trust += 1
@set coherence -= 1
you: We can just sit here a while.
-> END
`;

  return { manifestText: JSON.stringify(manifest, null, 2) + '\n', storyText: story };
}

async function copyTree(src, dst, replace) {
  const entries = await fs.readdir(src, { withFileTypes: true });
  await fs.mkdir(dst, { recursive: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      await copyTree(s, d, replace);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (TEXT_EXT.has(ext)) {
        let text = await fs.readFile(s, 'utf8');
        text = replace(text);
        await fs.writeFile(d, text, 'utf8');
      } else {
        await fs.copyFile(s, d);
      }
    }
  }
}

function applyReplacements(text, subs) {
  let out = text;
  for (const [from, to] of subs) {
    if (!from) continue;
    out = out.split(from).join(to);
  }
  return out;
}

async function main() {
  const [, , rawId, rawTitle] = process.argv;
  if (!rawId || !rawTitle) {
    console.log('Usage: node tools/new-story.mjs <id> "Title"');
    console.log('Example: node tools/new-story.mjs harbor "Harbor Lights"');
    process.exit(rawId || rawTitle ? 1 : 0);
  }

  const id = rawId.trim();
  const title = rawTitle.trim();
  if (!isValidId(id)) {
    die(`Invalid id "${id}". Use lowercase letters, numbers, "-" and "_" (must start alphanumeric).`);
  }
  if (id === '_template') die('"_template" is reserved.');

  const target = path.join(STORIES, id);
  if (await exists(target)) {
    die(`stories/${id}/ already exists. Choose a different id or delete it first.`);
  }

  await fs.mkdir(STORIES, { recursive: true });

  const hasTemplate = await exists(TEMPLATE_DIR);
  if (hasTemplate) {
    // Learn the template's own id/title so we can substitute them verbatim.
    let oldId = '';
    let oldTitle = '';
    const tmplManifest = path.join(TEMPLATE_DIR, 'manifest.json');
    if (await exists(tmplManifest)) {
      try {
        const m = JSON.parse(await fs.readFile(tmplManifest, 'utf8'));
        oldId = typeof m.id === 'string' ? m.id : '';
        oldTitle = typeof m.title === 'string' ? m.title : '';
      } catch {
        /* tolerate a non-JSON/placeholder template manifest */
      }
    }
    const subs = [
      ['__ID__', id],
      ['__TITLE__', title],
      [oldId, id],
      [oldTitle, title],
    ];
    await copyTree(TEMPLATE_DIR, target, (t) => applyReplacements(t, subs));

    // Authoritatively fix manifest id/title regardless of template contents.
    const manifestPath = path.join(target, 'manifest.json');
    if (await exists(manifestPath)) {
      try {
        const m = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
        m.id = id;
        m.title = title;
        await fs.writeFile(manifestPath, JSON.stringify(m, null, 2) + '\n', 'utf8');
      } catch {
        console.warn('  (note) manifest.json is not valid JSON yet — edit it by hand.');
      }
    }
  } else {
    console.warn('  (note) stories/_template not found — writing a built-in starter template.');
    const { manifestText, storyText } = embeddedTemplate(id, title);
    await fs.mkdir(target, { recursive: true });
    await fs.writeFile(path.join(target, 'manifest.json'), manifestText, 'utf8');
    await fs.writeFile(path.join(target, 'story.pq'), storyText, 'utf8');
  }

  // Ensure the asset folders exist (with a .gitkeep so empty dirs survive).
  for (const sub of ASSET_SUBDIRS) {
    const dir = path.join(target, 'assets', sub);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, '.gitkeep'), '', 'utf8');
  }

  const rel = path.relative(ROOT, target).replace(/\\/g, '/');
  console.log(`\x1b[32m✓ Created story "${title}" at ${rel}/\x1b[0m`);
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Write your scene:      ${rel}/story.pq`);
  console.log(`  2. Fill asset prompts:    ${rel}/manifest.json`);
  console.log(`                            (backgrounds, character poses, cg — each needs a "prompt")`);
  console.log(`  3. Generate the art:      node tools/gen-assets.mjs ${id}`);
  console.log(`  4. Play it:               npm run dev   (your story appears on the title screen)`);
  console.log('');
  console.log('Audio works with zero files via procedural synths — add real files under');
  console.log(`  ${rel}/assets/audio/ only when you want them.`);
}

main().catch((err) => die(err?.stack || String(err)));

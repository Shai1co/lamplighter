/**
 * Lamplighter — safe `/stories/**` file serving. One handler, both dev and
 * preview (design doc §4.6) — registering it ahead of Vite's own middleware
 * guarantees it is the only thing that ever answers a /stories/ URL, so
 * traversal policy and headers can never diverge between the two modes.
 *
 * Range requests are not implemented: Howler fetches audio as a whole
 * buffer, and no other consumer seeks. Noted rather than silently omitted.
 */

import { createReadStream, promises as fs } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { isHiddenName } from './stories';

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  json: 'application/json',
  pq: 'text/plain; charset=utf-8',
};

function contentTypeFor(filename: string): string {
  const ext = path.extname(filename).slice(1).toLowerCase();
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

function send404(res: ServerResponse): void {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Not found.');
}

/**
 * Serves one request whose path starts with `urlPrefix` (normally
 * "/stories/"). Returns false without touching `res` when the request isn't
 * for this handler at all, so router.ts can chain it like any other
 * connect middleware.
 */
export async function serveStoryFile(req: IncomingMessage, res: ServerResponse, storiesDir: string, urlPrefix: string): Promise<boolean> {
  const rawUrl = req.url ?? '';
  if (!rawUrl.startsWith(urlPrefix)) return false;

  // 1. Reject a literal NUL or a %-decode that yields one.
  if (rawUrl.includes('\0')) {
    send404(res);
    return true;
  }
  const withoutQuery = rawUrl.split('?')[0].split('#')[0];
  let decoded: string;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    send404(res);
    return true;
  }
  if (decoded.includes('\0')) {
    send404(res);
    return true;
  }

  // 2-3. Normalize, then reject any ".." or hidden ("_"/".") segment.
  const afterPrefix = decoded.slice(urlPrefix.length).replace(/^\/+/, '');
  const rel = path.posix.normalize(afterPrefix || '.');
  const segments = rel.split('/').filter((s) => s !== '.' && s !== '');
  if (segments.some((s) => s === '..' || isHiddenName(s))) {
    send404(res);
    return true;
  }

  // 4. Belt and braces after step 3: confine the resolved path to storiesDir.
  const resolved = path.resolve(storiesDir, rel === '.' ? '' : rel);
  if (resolved !== storiesDir && !resolved.startsWith(storiesDir + path.sep)) {
    send404(res);
    return true;
  }

  // 5. A directory is a 404, never a listing.
  let stat: import('node:fs').Stats;
  try {
    stat = await fs.stat(resolved);
  } catch {
    send404(res);
    return true;
  }
  if (stat.isDirectory()) {
    send404(res);
    return true;
  }

  // 6-7. Content type + ETag/Last-Modified/Cache-Control, honouring If-None-Match.
  const etag = `W/"${stat.size}-${Math.trunc(stat.mtimeMs)}"`;
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', stat.mtime.toUTCString());
  // must-revalidate, not immutable — files genuinely change under the app
  // (regenerated art, a hand-edited story) while the process keeps running.
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Content-Type', contentTypeFor(resolved));

  const inm = req.headers['if-none-match'];
  if (typeof inm === 'string' && inm === etag) {
    res.statusCode = 304;
    res.end();
    return true;
  }

  // 8. Stream; a stream error after headers destroys the socket rather than
  // trying to write a second, conflicting response.
  res.statusCode = 200;
  res.setHeader('Content-Length', String(stat.size));
  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  const stream = createReadStream(resolved);
  stream.on('error', () => {
    try {
      res.destroy();
    } catch {
      /* already gone */
    }
  });
  stream.pipe(res);
  return true;
}

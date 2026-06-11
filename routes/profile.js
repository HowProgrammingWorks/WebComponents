import { readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { buildProfileState } from '../shared/profile-domain.mjs';

const USERNAME_RE = /^[a-z0-9][a-z0-9-]{1,63}$/i;

const usernameToPath = (username, profileDir) => {
  if (!USERNAME_RE.test(username)) return null;
  return path.join(profileDir, `${username}.json`);
};

const readProfile = async (username, profileDir) => {
  const filePath = usernameToPath(username, profileDir);
  if (!filePath) return null;
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

const saveProfileState = async (username, incoming, profileDir) => {
  const filePath = usernameToPath(username, profileDir);
  if (!filePath) {
    return {
      status: 422,
      payload: { ok: false, errors: { id: 'Invalid username' } },
    };
  }

  const merged = { ...(incoming || {}), id: username };
  const state = buildProfileState(merged);

  if (!state.valid) {
    return {
      status: 422,
      payload: { ok: false, ...state },
    };
  }

  const data = JSON.stringify(state.profile, null, 2);
  await writeFile(filePath, data, 'utf8');
  return {
    status: 200,
    payload: { ok: true, ...state },
  };
};

const getProfile = async (
  req,
  res,
  { username },
  { profileDir, sendJson, serveFile, staticDir },
) => {
  if (!USERNAME_RE.test(username)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  const accept = req.headers.accept || '';
  if (accept.includes('text/html') && !accept.includes('application/json')) {
    await serveFile(res, path.join(staticDir, 'index.html'));
    return;
  }
  try {
    const source = await readProfile(username, profileDir);
    const state = buildProfileState(source);
    sendJson(res, 200, { ok: true, ...state });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    if (error instanceof SyntaxError) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Corrupt profile JSON');
      return;
    }
    throw error;
  }
};

const updateProfile = async (
  req,
  res,
  { username },
  { profileDir, sendJson, parseJsonBody },
) => {
  if (!USERNAME_RE.test(username)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  let body;
  try {
    body = await parseJsonBody(req);
  } catch (error) {
    if (error.message === 'INVALID_JSON') {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Invalid JSON');
      return;
    }
    throw error;
  }
  const result = await saveProfileState(username, body, profileDir);
  sendJson(res, result.status, result.payload);
};

const removeProfile = async (
  req,
  res,
  { username },
  { profileDir, sendJson },
) => {
  const target = usernameToPath(username, profileDir);
  if (!target) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  try {
    await unlink(target);
    sendJson(res, 200, { ok: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    throw error;
  }
};

const listProfiles = async (req, res, _params, { profileDir, sendJson }) => {
  const url = new URL(req.url, 'http://localhost');
  const nameFilter = url.searchParams.get('name')?.toLowerCase() || '';
  const emailFilter = url.searchParams.get('email')?.toLowerCase() || '';

  const files = await readdir(profileDir).catch(() => []);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  const profiles = await Promise.all(
    jsonFiles.map(async (f) => {
      try {
        const raw = await readFile(path.join(profileDir, f), 'utf8');
        const { profile, computed } = buildProfileState(JSON.parse(raw));
        return {
          id: profile.id,
          displayName: computed.displayName,
          email: profile.email,
        };
      } catch {
        return null;
      }
    }),
  );

  const items = profiles
    .filter(Boolean)
    .filter(
      (p) => !nameFilter || p.displayName.toLowerCase().includes(nameFilter),
    )
    .filter((p) => !emailFilter || p.email.toLowerCase().includes(emailFilter))
    .sort((a, b) => a.id.localeCompare(b.id));

  sendJson(res, 200, { ok: true, items });
};

export const routes = [
  { pattern: '/profile', handlers: { GET: listProfiles } },
  {
    pattern: '/profile/:username',
    handlers: {
      GET: getProfile,
      POST: updateProfile,
      PUT: updateProfile,
      DELETE: removeProfile,
    },
  },
];

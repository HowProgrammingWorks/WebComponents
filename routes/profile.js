import { readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import config from '../config.mjs';
import {
  buildProfileState,
  isValidUsername,
} from '../shared/profile-domain.mjs';

const usernamePath = (username) =>
  isValidUsername(username)
    ? path.join(config.PROFILE_DIR, `${username}.json`)
    : null;

const readProfile = async (username) => {
  const filePath = usernamePath(username);
  if (!filePath) return null;
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

const saveProfileState = async (username, incoming) => {
  const filePath = usernamePath(username);
  if (!filePath) {
    return {
      status: 422,
      json: { ok: false, errors: { id: 'Invalid username' } },
    };
  }

  const merged = { ...incoming, id: username };
  const state = buildProfileState(merged);

  if (!state.valid) {
    return { status: 422, json: { ok: false, ...state } };
  }

  await writeFile(filePath, JSON.stringify(state.profile, null, 2), 'utf8');
  return { status: 200, json: { ok: true, ...state } };
};

const getProfile = async (channel, { username }) => {
  if (!isValidUsername(username)) return { status: 404, html: 'Not found' };

  const accept = channel.req.headers.accept || '';
  if (accept.includes('text/html') && !accept.includes('application/json')) {
    return { serve: path.join(config.STATIC_DIR, 'index.html') };
  }

  try {
    const source = await readProfile(username);
    const state = buildProfileState(source);
    return { json: { ok: true, ...state } };
  } catch (error) {
    if (error?.code === 'ENOENT') return { status: 404, html: 'Not found' };
    if (error instanceof SyntaxError) {
      return { status: 500, html: 'Corrupt profile JSON' };
    }
    throw error;
  }
};

const updateProfile = async (channel, { username }) => {
  if (!isValidUsername(username)) return { status: 404, html: 'Not found' };
  const raw = await channel.receiveBody();
  const body = raw ? JSON.parse(raw) : {};
  return saveProfileState(username, body);
};

const removeProfile = async (_channel, { username }) => {
  const target = usernamePath(username);
  if (!target) return { status: 404, html: 'Not found' };
  try {
    await unlink(target);
    return { json: { ok: true } };
  } catch (error) {
    if (error?.code === 'ENOENT') return { status: 404, html: 'Not found' };
    throw error;
  }
};

const listProfiles = async (channel) => {
  const query = channel.req.url.split('?')[1] || '';
  const params = new URLSearchParams(query);
  const nameFilter = params.get('name')?.toLowerCase() || '';
  const emailFilter = params.get('email')?.toLowerCase() || '';

  const files = await readdir(config.PROFILE_DIR).catch(() => []);
  const profiles = await Promise.all(
    files
      .filter((f) => f.endsWith('.json'))
      .map(async (f) => {
        try {
          const raw = await readFile(path.join(config.PROFILE_DIR, f), 'utf8');
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

  return { json: { ok: true, items } };
};

export default {
  routes: [
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
  ],
};

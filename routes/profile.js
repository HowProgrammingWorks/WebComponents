import { readFile, writeFile, unlink, stat } from 'node:fs/promises';
import path from 'node:path';
import config from '../config.js';
import { buildProfileState, profileFields } from '../shared/profile.js';

const usernamePath = (username) => {
  const id = typeof username === 'string' ? username.trim() : '';
  if (!id || !profileFields.id.pattern.test(id)) return null;
  return path.join(config.PROFILE_DIR, `${id}.json`);
};

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

  if (state.errors) {
    return { status: 422, json: { ok: false, ...state } };
  }

  await writeFile(filePath, JSON.stringify(state.profile, null, 2), 'utf8');
  return { status: 200, json: { ok: true, ...state } };
};

const getProfile = async (channel, username) => {
  if (!usernamePath(username)) return { status: 404, html: 'Not found' };

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

const createProfile = async (channel) => {
  const raw = await channel.receiveBody();
  const body = raw ? JSON.parse(raw) : {};
  const requestedId = typeof body.id === 'string' ? body.id.trim() : '';

  if (!usernamePath(requestedId)) {
    return {
      status: 422,
      json: { ok: false, errors: { id: 'Invalid username' } },
    };
  }

  const filePath = usernamePath(requestedId);
  try {
    await stat(filePath);
    return {
      status: 409,
      json: { ok: false, errors: { id: 'Profile already exists' } },
    };
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const state = buildProfileState({ ...body, id: requestedId });
  if (state.errors) {
    return { status: 422, json: { ok: false, ...state } };
  }

  await writeFile(filePath, JSON.stringify(state.profile, null, 2), 'utf8');
  return { status: 201, json: { ok: true, ...state } };
};

const updateProfile = async (channel, username) => {
  if (!usernamePath(username)) return { status: 404, html: 'Not found' };
  const raw = await channel.receiveBody();
  const body = raw ? JSON.parse(raw) : {};
  return saveProfileState(username, body);
};

const removeProfile = async (_channel, username) => {
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

export default {
  GET: getProfile,
  POST: updateProfile,
  PUT: createProfile,
  DELETE: removeProfile,
};

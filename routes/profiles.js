import { stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import config from '../config.mjs';
import {
  buildProfileState,
  isValidUsername,
} from '../shared/profile-domain.mjs';

const createProfile = async (channel) => {
  const raw = await channel.receiveBody();
  const body = raw ? JSON.parse(raw) : {};
  const requestedId = typeof body.id === 'string' ? body.id.trim() : '';

  if (!isValidUsername(requestedId)) {
    return {
      status: 422,
      json: { ok: false, errors: 'Invalid username' },
    };
  }

  const filePath = path.join(config.PROFILE_DIR, `${requestedId}.json`);
  try {
    await stat(filePath);
    const message = 'Profile already exists';
    return {
      status: 409,
      json: { ok: false, errors: message },
    };
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const state = buildProfileState({ ...body, id: requestedId });
  if (!state.valid) {
    return { status: 422, json: { ok: false, ...state } };
  }

  const data = JSON.stringify(state.profile, null, 2);
  await writeFile(filePath, data, 'utf8');
  return { status: 201, json: { ok: true, ...state } };
};

export default { POST: createProfile };

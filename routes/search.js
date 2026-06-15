import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import config from '../config.js';
import { buildProfileState } from '../shared/profile.js';

const readProfile = async (file) => {
  try {
    const fileName = path.join(config.PROFILE_DIR, file);
    const raw = await readFile(fileName, 'utf8');
    const { profile, computed } = buildProfileState(JSON.parse(raw));
    const { id, email } = profile;
    return { id, displayName: computed.displayName, email };
  } catch {
    return null;
  }
};

const searchProfiles = async (channel) => {
  const query = channel.req.url.split('?')[1] || '';
  const params = new URLSearchParams(query);
  const nameFilter = params.get('name')?.toLowerCase() || '';
  const emailFilter = params.get('email')?.toLowerCase() || '';

  const dir = await readdir(config.PROFILE_DIR).catch(() => []);
  const files = dir.filter((f) => f.endsWith('.json'));
  const profiles = await Promise.all(files.map(readProfile));

  const items = [];
  const includes = (value, filter) => value.toLowerCase().includes(filter);
  for (const profile of profiles) {
    if (!profile) continue;
    if (nameFilter && !includes(profile.displayName, nameFilter)) continue;
    if (emailFilter && !includes(profile.email, emailFilter)) continue;
    items.push(profile);
  }
  items.sort((a, b) => a.id.localeCompare(b.id));

  return { json: { ok: true, items } };
};

export default {
  GET: searchProfiles,
};

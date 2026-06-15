const HEADERS = { 'Content-Type': 'application/json' };

const profileUrl = (username) => `/profile/${encodeURIComponent(username)}`;

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
};

const errorsFrom = (body, fallback) => body?.errors ?? { general: fallback };

const getProfile = async (username) => {
  const options = { headers: { Accept: 'application/json' } };
  const { ok, body } = await fetchJson(profileUrl(username), options);
  if (ok) return body;
  return { ok: false, errors: { general: 'Profile not found' } };
};

const saveProfile = async (username, data) => {
  const json = JSON.stringify(data);
  const options = { method: 'POST', headers: HEADERS, body: json };
  const { ok, body } = await fetchJson(profileUrl(username), options);
  if (!ok) return { ok: false, errors: errorsFrom(body, 'Save failed') };
  return body;
};

const deleteProfile = async (username) => {
  const options = { method: 'DELETE' };
  const { ok } = await fetchJson(profileUrl(username), options);
  return { ok };
};

const searchProfiles = async ({ name = '', email = '' } = {}) => {
  const params = new URLSearchParams();
  if (name) params.set('name', name);
  if (email) params.set('email', email);
  const query = params.toString();
  const url = query ? `/search?${query}` : '/search';
  const { ok, body } = await fetchJson(url);
  if (!ok) return { ok: false, items: [] };
  return { ok: true, items: body.items };
};

const createProfile = async (data) => {
  const json = JSON.stringify(data);
  const options = { method: 'PUT', headers: HEADERS, body: json };
  const { ok, body } = await fetchJson('/profile', options);
  if (!ok) return { ok: false, errors: errorsFrom(body, 'Create failed') };
  return body;
};

export {
  getProfile,
  saveProfile,
  deleteProfile,
  searchProfiles,
  createProfile,
};

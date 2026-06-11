const HEADERS = { 'Content-Type': 'application/json' };

const profileUrl = (username) => `/profile/${encodeURIComponent(username)}`;

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
};

const getProfile = async (username) => {
  const options = { headers: { Accept: 'application/json' } };
  const { ok, body } = await fetchJson(profileUrl(username), options);
  if (!ok || !body?.ok) return { ok: false, error: 'Profile not found' };
  return body;
};

const saveProfile = async (username, data) => {
  const json = JSON.stringify(data);
  const options = { method: 'POST', headers: HEADERS, body: json };
  const { ok, body } = await fetchJson(profileUrl(username), options);
  if (!ok || !body?.ok) {
    return { ok: false, errors: body?.errors || { general: 'Save failed' } };
  }
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
  const url = query ? `/profile?${query}` : '/profile';
  const { ok, body } = await fetchJson(url);
  if (!ok || !body?.ok) return { ok: false, items: [] };
  return { ok: true, items: body.items };
};

const createProfile = async (data) => {
  const json = JSON.stringify(data);
  const options = { method: 'POST', headers: HEADERS, body: json };
  const { ok, status, body } = await fetchJson('/profiles', options);
  if (!ok || !body?.ok) {
    const validationErrors = body?.errors;
    const idError = body?.error
      ? { id: body.error }
      : { general: 'Create failed' };
    const errors = validationErrors || idError;
    return { ok: false, status, errors };
  }
  return body;
};

export {
  getProfile,
  saveProfile,
  deleteProfile,
  searchProfiles,
  createProfile,
};

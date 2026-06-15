import { getProfile } from '/api.js';
import { buildProfileState } from '/shared/profile.js';

const template = document.getElementById('profile-app');

const matchPattern = (pattern, pathname) => {
  const patternParts = pattern.split('/');
  const pathParts = pathname.split('/');
  if (patternParts.length !== pathParts.length) return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i];
    if (part.startsWith(':')) params[part.slice(1)] = pathParts[i];
    else if (part !== pathParts[i]) return null;
  }
  return params;
};

const routes = {
  '/': (app) => {
    app.main.append(document.createElement('profile-directory'));
  },
  '/new': (app) => {
    app.renderCreate();
  },
  '/profile/:username': async (app, { username }) => {
    await app.renderProfile(username);
  },
};

class ProfileApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const content = template.content.cloneNode(true);
    this.main = content.getElementById('main');
    this.homeLink = content.getElementById('homeLink');
    this.shadowRoot.append(content);
  }

  connectedCallback() {
    this.homeLink.addEventListener('click', (event) => {
      event.preventDefault();
      window.navigation.navigate('/');
    });

    this.shadowRoot.addEventListener('navigate-profile', (event) => {
      window.navigation.navigate(event.detail.path);
    });

    window.navigation.addEventListener('navigate', (event) => {
      const url = new URL(event.destination.url);
      if (url.origin !== window.location.origin) return;
      event.intercept({
        handler: async () => {
          this.renderRoute(url.pathname);
        },
      });
    });

    this.renderRoute(window.location.pathname);
  }

  async renderRoute(pathname) {
    this.main.replaceChildren();

    for (const [pattern, handler] of Object.entries(routes)) {
      const params = matchPattern(pattern, pathname);
      if (params === null) continue;
      await handler(this, params);
      return;
    }

    const error = document.createElement('div');
    error.className = 'error';
    error.textContent = 'Route not found';
    this.main.append(error);
  }

  renderCreate() {
    const form = document.createElement('profile-form');
    form.setAttribute('mode', 'create');
    form.editableId = true;
    form.state = buildProfileState({});
    form.addEventListener('profile-created', (event) => {
      window.navigation.navigate(`/profile/${event.detail.id}`);
    });
    this.main.replaceChildren(form);
  }

  async renderProfile(username) {
    const result = await getProfile(username);
    if (!result.ok) {
      const error = document.createElement('div');
      error.className = 'error';
      error.textContent = 'Profile not found';
      this.main.append(error);
      return;
    }
    const form = document.createElement('profile-form');
    form.state = result;
    form.addEventListener('profile-saved', () => {
      window.navigation.navigate('/');
    });
    this.main.append(form);
  }
}

customElements.define('profile-app', ProfileApp);

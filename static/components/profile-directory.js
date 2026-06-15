import { searchProfiles, deleteProfile } from '/api.js';

const template = document.getElementById('profile-directory');

class ProfileDirectory extends HTMLElement {
  #query = { name: '', email: '' };

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const content = template.content.cloneNode(true);
    this.search = content.getElementById('search');
    this.list = content.getElementById('list');
    this.createBtn = content.getElementById('create');
    this.shadowRoot.append(content);
  }

  connectedCallback() {
    this.load();
    this.search.addEventListener('search-change', (event) => {
      this.#query = event.detail;
      this.load();
    });
    this.list.addEventListener('open-profile', (openEvent) => {
      const event = new CustomEvent('navigate-profile', {
        detail: { path: `/profile/${openEvent.detail.id}` },
        bubbles: true,
      });
      this.dispatchEvent(event);
    });
    this.list.addEventListener('delete-profile', (event) => {
      this.removeProfile(event.detail.id);
    });
    this.createBtn.addEventListener('click', () => {
      const event = new CustomEvent('navigate-profile', {
        detail: { path: '/new' },
        bubbles: true,
      });
      this.dispatchEvent(event);
    });
  }

  async load() {
    const { items = [] } = await searchProfiles(this.#query);
    this.list.items = items;
  }

  async removeProfile(id) {
    if (!window.confirm(`Delete profile "${id}"?`)) return;
    const { ok } = await deleteProfile(id);
    if (ok) this.load();
  }
}

customElements.define('profile-directory', ProfileDirectory);

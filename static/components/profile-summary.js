import { profileFields } from '/shared/profile.js';

const template = document.getElementById('profile-summary');

class ProfileSummary extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const content = template.content.cloneNode(true);
    this.shadowRoot.append(content);
  }

  static get observedAttributes() {
    return ['values'];
  }

  attributeChangedCallback() {
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    let data = {};
    if (this.hasAttribute('values')) {
      try {
        data = JSON.parse(this.getAttribute('values'));
      } catch {
        data = {};
      }
    }

    for (const [key, metadata] of Object.entries(profileFields)) {
      if (!metadata.computed) continue;
      const el = this.shadowRoot.getElementById(key);
      if (!el) continue;
      const value = data[key];
      el.textContent =
        value === null || value === undefined || value === ''
          ? '-'
          : String(value);
    }
  }
}

customElements.define('profile-summary', ProfileSummary);

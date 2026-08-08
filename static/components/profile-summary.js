import { schema } from '/shared/profile.js';

const template = document.getElementById('profile-summary');

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return String(value);
};

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

    for (const [key, metadata] of Object.entries(schema)) {
      if (!metadata.computed) continue;
      const el = this.shadowRoot.getElementById(key);
      if (!el) continue;
      el.textContent = formatValue(data[key]);
    }
  }
}

customElements.define('profile-summary', ProfileSummary);

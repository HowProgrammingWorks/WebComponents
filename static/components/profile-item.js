const template = document.getElementById('profile-item');

class ProfileItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const content = template.content.cloneNode(true);
    this.nameEl = content.getElementById('name');
    this.emailEl = content.getElementById('email');
    this.openBtn = content.getElementById('open');
    this.deleteBtn = content.getElementById('delete');
    this.shadowRoot.append(content);
  }

  connectedCallback() {
    this.render();
    this.openBtn.addEventListener('click', () => {
      const event = new CustomEvent('open-profile', {
        detail: { id: this.getAttribute('profile-id') || '' },
        bubbles: true,
      });
      this.dispatchEvent(event);
    });
    this.deleteBtn.addEventListener('click', () => {
      const event = new CustomEvent('delete-profile', {
        detail: { id: this.getAttribute('profile-id') || '' },
        bubbles: true,
      });
      this.dispatchEvent(event);
    });
  }

  static get observedAttributes() {
    return ['display-name', 'email'];
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    this.nameEl.textContent = this.getAttribute('display-name') || '';
    this.emailEl.textContent = this.getAttribute('email') || '';
  }
}

customElements.define('profile-item', ProfileItem);

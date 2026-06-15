const template = document.getElementById('profile-search');

class ProfileSearch extends HTMLElement {
  #timer = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const content = template.content.cloneNode(true);
    this.nameInput = content.getElementById('name');
    this.emailInput = content.getElementById('email');
    this.shadowRoot.append(content);
  }

  connectedCallback() {
    const emit = () => {
      clearTimeout(this.#timer);
      this.#timer = setTimeout(() => {
        const event = new CustomEvent('search-change', {
          detail: {
            name: this.nameInput.value,
            email: this.emailInput.value,
          },
        });
        this.dispatchEvent(event);
      }, 250);
    };
    this.nameInput.addEventListener('input', emit);
    this.emailInput.addEventListener('input', emit);
  }
}

customElements.define('profile-search', ProfileSearch);

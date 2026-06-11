const template = document.getElementById('validation-message');

class ValidationMessage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const content = template.content.cloneNode(true);
    this.textEl = content.getElementById('text');
    this.shadowRoot.append(content);
  }

  static get observedAttributes() {
    return ['message'];
  }

  attributeChangedCallback() {
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.textEl.textContent = this.getAttribute('message') || '';
  }
}

customElements.define('validation-message', ValidationMessage);

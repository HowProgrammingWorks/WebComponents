const template = document.getElementById('profile-field');

class ProfileField extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const content = template.content.cloneNode(true);
    this.labelEl = content.getElementById('label');
    this.inputEl = content.getElementById('input');
    this.textareaEl = content.getElementById('textarea');
    this.errorEl = content.getElementById('error');

    const emit = () => {
      const event = new CustomEvent('field-change', {
        detail: { name: this.fieldName, value: this.value },
        bubbles: true,
      });
      this.dispatchEvent(event);
    };
    this.inputEl.addEventListener('input', emit);
    this.textareaEl.addEventListener('input', emit);
    this.shadowRoot.append(content);
  }

  static get observedAttributes() {
    return ['name', 'label', 'type', 'value', 'error', 'multiline', 'disabled'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  get fieldName() {
    return this.getAttribute('name') || '';
  }

  get value() {
    if (this.hasAttribute('multiline')) return this.textareaEl.value;
    return this.inputEl.value;
  }

  render() {
    const multiline = this.hasAttribute('multiline');
    const disabled = this.hasAttribute('disabled');
    const id = `field-${this.fieldName}`;

    this.inputEl.hidden = multiline;
    this.textareaEl.hidden = !multiline;

    const active = multiline ? this.textareaEl : this.inputEl;
    this.labelEl.setAttribute('for', id);
    active.id = id;
    this.labelEl.textContent = this.getAttribute('label') || this.fieldName;

    if (!multiline) this.inputEl.type = this.getAttribute('type') || 'text';
    active.value = this.getAttribute('value') || '';
    active.disabled = disabled;
    this.errorEl.setAttribute('message', this.getAttribute('error') || '');
  }
}

customElements.define('profile-field', ProfileField);

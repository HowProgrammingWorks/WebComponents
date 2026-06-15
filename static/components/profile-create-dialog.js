import { buildState } from '/shared/profile.js';
import { createProfile } from '/api.js';

const template = document.getElementById('profile-create-dialog');

class ProfileCreateDialog extends HTMLElement {
  #state = buildState({});

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const content = template.content.cloneNode(true);
    this.dialog = content.getElementById('dialog');
    this.form = content.getElementById('form');
    this.cancelBtn = content.getElementById('cancel');
    this.createBtn = content.getElementById('create');
    this.shadowRoot.append(content);
  }

  connectedCallback() {
    this.form.state = this.#state;
    this.form.editableId = true;
    this.form.addEventListener('profile-state-change', (event) => {
      this.#state = event.detail.state;
      this.createBtn.disabled = this.#state.errors !== undefined;
    });
    this.cancelBtn.addEventListener('click', () => this.close());
    this.createBtn.addEventListener('click', () => this.submit());
  }

  open() {
    this.#state = buildState({});
    this.form.state = this.#state;
    this.createBtn.disabled = this.#state.errors !== undefined;
    this.dialog.showModal();
  }

  close() {
    this.dialog.close();
  }

  async submit() {
    if (this.#state.errors) return;
    const result = await createProfile(this.#state.profile);
    if (!result.ok) {
      this.form.serverErrors = result.errors;
      return;
    }
    const event = new CustomEvent('profile-created', {
      detail: { id: result.profile.id },
    });
    this.dispatchEvent(event);
    this.close();
  }
}

customElements.define('profile-create-dialog', ProfileCreateDialog);

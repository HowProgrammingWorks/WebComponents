import { profileFields, buildProfileState } from '/shared/profile.js';
import { saveProfile, createProfile } from '/api.js';
import './profile-summary.js';

const template = document.getElementById('profile-form');

class ProfileForm extends HTMLElement {
  #state = buildProfileState({});
  #editableId = false;
  #fieldEls = new Map();

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const content = template.content.cloneNode(true);
    this.formEl = content.getElementById('form');
    this.titleEl = content.getElementById('title');
    this.fieldsEl = content.getElementById('fields');
    this.summaryEl = content.getElementById('summary');
    this.saveBtn = content.getElementById('save');
    this.statusEl = content.getElementById('status');
    this.shadowRoot.append(content);
  }

  connectedCallback() {
    this.renderFields();
    this.formEl.addEventListener('submit', (event) => {
      event.preventDefault();
      this.handleSave();
    });
    this.formEl.addEventListener('field-change', (event) => {
      this.updateField(event.detail.name, event.detail.value);
    });
    this.render();
  }

  set state(value) {
    this.#state = value;
    this.render();
  }

  get state() {
    return this.#state;
  }

  set serverErrors(value) {
    if (!value) return;
    this.#state = { ...this.#state, errors: value };
    this.render();
  }

  set editableId(value) {
    this.#editableId = Boolean(value);
    this.render();
  }

  get isCreate() {
    return this.getAttribute('mode') === 'create';
  }

  renderFields() {
    const nodes = [];
    for (const [name, metadata] of Object.entries(profileFields)) {
      if (metadata.computed) continue;
      const field = document.createElement('profile-field');
      field.setAttribute('name', name);
      let label = name;
      if (metadata.label) label = metadata.label;
      field.setAttribute('label', label);

      let type = 'text';
      if (metadata.inputType) {
        type = metadata.inputType;
      } else if (metadata.type === 'number' || metadata.type === 'integer') {
        type = 'number';
      }
      field.setAttribute('type', type);
      if (metadata.multiline) field.setAttribute('multiline', '');
      this.#fieldEls.set(name, field);
      nodes.push(field);
    }
    this.fieldsEl.replaceChildren(...nodes);
  }

  updateField(name, value) {
    const next = { ...this.state.profile };
    if (name === 'secondarySkills') {
      next[name] = value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (
      profileFields[name]?.type === 'number' ||
      profileFields[name]?.type === 'integer'
    ) {
      next[name] = value === '' ? 0 : Number(value);
    } else {
      next[name] = value;
    }

    this.#state = buildProfileState(next);
    const event = new CustomEvent('profile-state-change', {
      detail: { state: this.#state },
    });
    this.dispatchEvent(event);
    this.render();
  }

  async handleSave() {
    if (this.state.errors) return;
    const username = this.state.profile.id;

    if (this.isCreate) {
      const result = await createProfile(this.state.profile);
      if (!result.ok) {
        this.serverErrors = result.errors;
        return;
      }
      const event = new CustomEvent('profile-created', {
        detail: { id: result.profile.id },
      });
      this.dispatchEvent(event);
      return;
    }

    const result = await saveProfile(username, this.state.profile);
    if (!result.ok) {
      this.serverErrors = result.errors;
      this.statusEl.textContent = '';
      return;
    }
    this.#state = result;
    const event = new CustomEvent('profile-saved', {
      detail: { state: this.#state },
    });
    this.dispatchEvent(event);
  }

  render() {
    this.summaryEl.setAttribute(
      'values',
      JSON.stringify(this.state.computed || {}),
    );
    if (!this.isConnected) return;
    const profile = this.state?.profile || {};
    const errors = this.state?.errors ?? {};

    let title = 'Profile';
    if (this.isCreate) title = 'Create Profile';
    else if (profile.id) title = `Edit: ${profile.id}`;
    this.titleEl.textContent = title;

    this.saveBtn.textContent = this.isCreate ? 'Create' : 'Save';
    this.saveBtn.disabled = this.state.errors !== undefined;

    for (const [name, metadata] of Object.entries(profileFields)) {
      if (metadata.computed) continue;
      const field = this.#fieldEls.get(name);
      if (!field) continue;
      const raw = profile[name];
      let display;
      if (name === 'secondarySkills') {
        display = Array.isArray(raw) ? raw.join(', ') : '';
      } else {
        display = raw === null || raw === undefined ? '' : String(raw);
      }
      field.setAttribute('value', display);
      field.setAttribute('error', errors[name] || '');
      if (name === 'id' && !this.#editableId) {
        field.setAttribute('disabled', '');
      } else {
        field.removeAttribute('disabled');
      }
    }
  }
}

customElements.define('profile-form', ProfileForm);

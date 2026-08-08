import { schema, buildState } from '/shared/profile.js';
import { saveProfile, createProfile } from '/api.js';
import './profile-summary.js';

const template = document.getElementById('profile-form');

const resolveFieldType = (metadata) => {
  if (metadata.inputType) return metadata.inputType;
  if (metadata.type === 'number' || metadata.type === 'integer') {
    return 'number';
  }
  return 'text';
};

const coerceFieldValue = (name, value) => {
  if (name === 'secondarySkills') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const fieldType = schema[name]?.type;
  if (fieldType === 'number' || fieldType === 'integer') {
    return value === '' ? 0 : Number(value);
  }
  return value;
};

const displayFieldValue = (name, raw) => {
  if (name === 'secondarySkills') {
    return Array.isArray(raw) ? raw.join(', ') : '';
  }
  if (raw === null || raw === undefined) return '';
  return String(raw);
};

class ProfileForm extends HTMLElement {
  #state = buildState({});
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
      const { name, value } = event.detail;
      this.updateField(name, value);
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
    for (const [name, metadata] of Object.entries(schema)) {
      if (metadata.computed) continue;
      const field = document.createElement('profile-field');
      field.setAttribute('name', name);
      const label = metadata.label || name;
      field.setAttribute('label', label);
      field.setAttribute('type', resolveFieldType(metadata));
      if (metadata.multiline) field.setAttribute('multiline', '');
      this.#fieldEls.set(name, field);
      nodes.push(field);
    }
    this.fieldsEl.replaceChildren(...nodes);
  }

  updateField(name, value) {
    const next = { ...this.state.profile };
    next[name] = coerceFieldValue(name, value);

    this.#state = buildState(next);
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
    const computed = this.state.computed ?? {};
    this.summaryEl.setAttribute('values', JSON.stringify(computed));
    if (!this.isConnected) return;
    const profile = this.state?.profile ?? {};
    const errors = this.state?.errors ?? {};

    let title = 'Profile';
    if (this.isCreate) title = 'Create Profile';
    else if (profile.id) title = `Edit: ${profile.id}`;
    this.titleEl.textContent = title;

    this.saveBtn.textContent = this.isCreate ? 'Create' : 'Save';
    this.saveBtn.disabled = this.state.errors !== undefined;

    for (const [name, metadata] of Object.entries(schema)) {
      if (metadata.computed) continue;
      const field = this.#fieldEls.get(name);
      if (!field) continue;
      const display = displayFieldValue(name, profile[name]);
      field.setAttribute('value', display);
      field.setAttribute('error', errors[name] ?? '');
      if (name === 'id' && !this.#editableId) {
        field.setAttribute('disabled', '');
      } else {
        field.removeAttribute('disabled');
      }
    }
  }
}

customElements.define('profile-form', ProfileForm);

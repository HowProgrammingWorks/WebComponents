class ProfileList extends HTMLElement {
  #items = [];

  set items(value) {
    this.#items = value;
    this.render();
  }

  get items() {
    return this.#items;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const items = this.#items;
    if (items.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No profiles found.';
      this.replaceChildren(empty);
      return;
    }
    const nodes = items.map((item) => {
      const el = document.createElement('profile-item');
      el.setAttribute('profile-id', item.id);
      el.setAttribute('display-name', item.displayName || item.id);
      el.setAttribute('email', item.email || '');
      return el;
    });
    this.replaceChildren(...nodes);
  }
}

customElements.define('profile-list', ProfileList);

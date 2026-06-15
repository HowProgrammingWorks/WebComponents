# WebComponents

Technical Specification: Native Profile Form Editor

## 1. Goal

Develop a small full-stack application for browsing, searching, creating, editing and deleting user profiles.

The application must load profile data from:

```text
GET http://127.0.0.1/profile/{username}
```

It must render the data in an editable form and save the updated profile back to the same endpoint:

```text
POST http://127.0.0.1/profile/{username}
```

The application must also support profile search with partial input by first name, last name and email.

Each profile is identified by a username. The username in the URL must match the profile file name under `./data/profile/` without the `.json` extension. For example, `/profile/marcus` reads and writes `./data/profile/marcus.json`.

The project must demonstrate shared domain logic that runs both in the browser and on the server. The application must not be a simple CRUD form.

## 2. Main Restrictions

- Use only native APIs.
- Do not use npm dependencies.
- Do not use frontend frameworks.
- Do not use backend frameworks.
- Do not use bundlers, transpilers, other tooling.
- Use plain Node.js on the server.
- Use browser ES modules on the client.
- Use Web Components, Template API and Navigation API on the client. The Navigation API is intended for managing SPA-style navigations and browser history entries.
- Use `<template>` for UI fragments and Web Components with Shadow DOM where appropriate. MDN describes `<template>` and `<slot>` as native tools for building reusable Web Component structures.

## 3. Required Domain Idea

The profile must contain data that requires real business logic. Use the domain model "Professional Profile".

Example profile for user `marcus`:

```json
{
  "id": "marcus",
  "firstName": "Marcus",
  "lastName": "Aurelius",
  "email": "marcus@example.com",
  "country": "Roman Empire",
  "city": "Rome",
  "birthDate": "121-04-26",
  "experienceYears": 12,
  "primarySkill": "Architecture",
  "secondarySkills": ["Node.js", "Distributed Systems"],
  "weeklyAvailabilityHours": 24,
  "hourlyRate": 80,
  "currency": "EUR",
  "bio": "Software architect and fullstack developer"
}
```

Shared domain logic must calculate:

```text
displayName
age
seniorityLevel
monthlyCapacityHours
estimatedMonthlyIncome
profileCompleteness
publicSlug
validation errors
normalized profile data
```

Business rules:

```text
displayName = firstName + " " + lastName

age is calculated from birthDate

seniorityLevel:
0..1 years = Junior
2..4 years = Middle
5..9 years = Senior
10+ years = Principal

monthlyCapacityHours = weeklyAvailabilityHours * 4

estimatedMonthlyIncome = monthlyCapacityHours * hourlyRate

profileCompleteness is a percentage based on required fields

publicSlug is derived from firstName and lastName

email must contain "@"

firstName and lastName are required

experienceYears must be an integer from 0 to 60

weeklyAvailabilityHours must be an integer from 0 to 80

hourlyRate must be a number from 0 to 1000

birthDate must be a valid date in the past

secondarySkills must be an array of non-empty strings
```

The same domain module must run:

- in the browser during form editing
- on the server before saving data

The server must never trust client-side validation.

## 4. Required User Flow

The app home route (`/`) must show a profile directory page with:

- a search input
- a profile list
- create profile action
- delete profile action for each listed profile

Search behavior:

- search request supports partial input
- search matches are case-insensitive
- search must match by `firstName`, `lastName` and `email`
- UI updates list after each search input change (with debounce up to 300ms allowed)
- empty search query returns top 10 profiles

Open a profile by username, for example:

```text
http://127.0.0.1:8000/profile/marcus
```

The client app must use Navigation API to handle routes like `/profile/{username}`.

The app loads JSON from:

```text
GET /profile/{username}
```

The app renders the profile form.

When the user edits any field, the browser must immediately run the shared domain logic.

The UI must immediately update:

```text
validation messages
display name
age
seniority level
monthly capacity
estimated monthly income
profile completeness
public slug
save button state
```

When the user clicks Save, the client sends:

```text
POST /profile/{username}
Content-Type: application/json
```

Create flow:

- from directory page user can open a create form
- user enters `id` (username) and profile fields
- while user fills create form, frontend runs shared domain validation/business logic and shows immediate errors/computed values
- create submit must stay disabled while local create form state is invalid
- user submits create action
- server validates shared domain rules and username uniqueness
- after successful create, app navigates to `/profile/{username}` or refreshes directory list

Delete flow:

- from directory page user clicks delete action for profile
- UI asks for confirmation before delete
- client sends delete request for selected username
- after successful delete, profile disappears from directory list

The server runs the same domain logic again.

If data is invalid, the server returns:

```json
{
  "ok": false,
  "errors": {
    "email": "Invalid email"
  }
}
```

If data is valid, the server saves normalized profile data and returns:

```json
{
  "ok": true,
  "profile": {},
  "computed": {}
}
```

## 5. Server Requirements

Use only Node.js core modules:

```text
node:http
node:fs
node:path
node:url
```

The server must:

- serve static files from `./static`
- serve shared domain files from `./shared`
- serve profile JSON from `./data/profile/{username}.json`
- serve profile directory listing from `./data/profile`
- support profile search with partial matching by name and email
- support `GET /profile/{username}` for any existing profile file
- support `POST /profile/{username}` for any valid username
- support `PUT /profile/{username}` (optional alias of POST for updates)
- support `DELETE /profile/{username}` for deleting existing profile files
- support `GET /search?name={value}&email={value}` returning filtered profile summaries
- support `PUT /profile` for creating a new profile
- treat the URL username as the profile file name without the `.json` extension
- accept only safe username values that can be used as file names
- return correct `Content-Type`
- return `404` for unknown routes and missing profile files
- return `405` for unsupported methods
- return `400` for invalid JSON
- return `409` for create requests when username already exists
- return `422` for domain validation errors
- return `500` only for unexpected server errors
- Static files must be read from disk per request.
- Do not cache static files in memory.
- Do not use dynamic API module caching.
- Do not expose files outside the project directory.
- Prevent path traversal.

### Server Routing

The request dispatcher must be implemented as a **collection of route handlers**, not as a chain of `if/else` or `switch` statements in `server.js`. At startup the server scans `routes/` and builds a routing table that maps the **first URL path segment** to a route module. The dispatcher looks up that segment and delegates the request.

Route modules are plain `.js` files. Each module exports a default object of HTTP method handlers: `{ GET, POST, PUT, DELETE }`. The router maps the **first URL path segment** to a module file (`search.js` → `/search`, `profile.js` → `/profile/...`). Handler arity defines the expected path shape: a handler `(channel)` serves the mount path (`/search`), a handler `(channel, username)` serves one segment below (`/profile/marcus`).

Suggested route modules:

```text
routes/
  static.js      static file cache and serving (not a route module)
  search.js      GET /search?name=&email=
  profile.js     GET|POST|DELETE /profile/{username}, PUT /profile, PUT /profile/{username}
```

Example: `routes/profile.js` receives requests whose first segment is `profile`:

```js
export default {
  GET: getProfile,
  POST: saveProfile,
  PUT: createProfile,
  DELETE: removeProfile,
};
```

Example: `routes/search.js` handles profile directory search:

```js
export default {
  GET: searchProfiles,
};
```

The router loads modules dynamically with `readdir`. Segment depth and HTTP method dispatch live in the router; route modules contain only named handlers and the method map. `server.js` contains only bootstrap and dispatch.

## 6. Client Requirements

Use only native browser APIs:

- `customElements`
- `HTMLElement`
- Shadow DOM
- `template.content.cloneNode(true)`
- `fetch`
- `FormData`
- `URL`
- Navigation API
- ES modules

Client structure must include at least:

```text
profile-app
profile-form
profile-field
profile-summary
validation-message
profile-directory
profile-search
profile-list
profile-item
profile-create-dialog
```

- The form must be generated from a template.
- The app must not use `innerHTML` for untrusted data.
- Use `textContent`, attributes and DOM methods for dynamic data rendering.
- The save button must be disabled while the local domain state is invalid.
- After successful save, show a small saved status.
- After failed save, show server-side validation errors.
- Search UI must allow partial query and list matching profiles by name/email.
- The app must provide UI controls to create profile and delete profile.
- The create profile UI must run the shared domain module in-browser before submit.
- Delete action must include a confirmation step before request.

### Network Layer

All `fetch` calls must be encapsulated in a single dedicated module:

```text
static/api.js
```

This module exports one async function per server endpoint. Components must never call `fetch` directly. They import and call the API functions from `api.js`.

```js
const getProfile = async (username) => { ... };
const saveProfile = async (username, data) => { ... };
const deleteProfile = async (username) => { ... };
const searchProfiles = async ({ name, email } = {}) => { ... };
const createProfile = async (data) => { ... };

export { getProfile, saveProfile, deleteProfile, searchProfiles, createProfile };
```

Each function returns a normalized result object. HTTP error handling, JSON parsing and status checks happen inside `api.js`, not in components.

### Template Strategy

Each component's Shadow DOM markup lives in a dedicated `.html` file co-located with its `.js` file:

```text
static/components/
  profile-item.js
  profile-item.html
```

The `.html` file contains one `<template>` element with a matching `id`:

```html
<template id="profile-item">
  <style>
    :host {
      display: block;
    }
    .name {
      font-weight: 600;
    }
  </style>
  <div class="item">
    <div class="name" id="name"></div>
    <div class="email" id="email"></div>
  </div>
</template>
```

**Server-side assembly.** When the server handles any request that returns `index.html` (the root `/` and all `/profile/:username` browser navigations), it reads `index.html` and all `static/components/*.html` files, concatenates the template fragments, and replaces a placeholder comment in `index.html` before sending the response:

```html
<!-- index.html -->
<body>
  <profile-app></profile-app>
  <script type="module" src="/app.js"></script>
  <!-- {{templates}} -->
</body>
```

The browser receives a single document that already contains all `<template>` elements. No browser-side fetching, no `DOMParser`, no `async` in component modules.

Components read their template synchronously from the document:

```js
class ProfileItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(
      document.getElementById('profile-item').content.cloneNode(true),
    );
  }
}
```

This approach combines the best of both worlds: HTML structure stays in co-located `.html` files (pure HTML, editor-friendly, close to the component), while the browser pays zero extra requests and components remain fully synchronous.

### Declarative Rendering

Components must minimize imperative DOM construction. Follow these guidelines:

- Use `<slot>` for variable child content instead of injecting children from JavaScript.
- Drive display updates by setting `textContent` on pre-queried named elements rather than building new nodes.
- For repeated items (profile list), clone the item template once per data entry and fill named child elements, rather than calling `createElement` and manually building the subtree.
- For field-to-display mappings (computed fields in `profile-summary`), derive keys from shared metadata:

```js
import { schema } from '/shared/profile.js';

for (const [key, metadata] of Object.entries(schema)) {
  if (!metadata.computed) continue;
  // update pre-declared element by id
}
```

Computed fields are declared in `schema` with `computed: true`.

- Avoid `while (el.firstChild) el.removeChild(el.firstChild)`. Prefer `el.replaceChildren()` or reset a container once.
- Avoid dynamic element type switching at runtime (e.g. swapping `<input>` for `<textarea>`). Declare both in the template and show/hide with CSS via an attribute on the host.

### Component Responsibilities

Each component has one clear responsibility:

| Component               | Responsibility                                                           |
| ----------------------- | ------------------------------------------------------------------------ |
| `profile-app`           | SPA shell: routing, Navigation API, top-level layout                     |
| `profile-directory`     | Directory page: coordinates search, list, create dialog                  |
| `profile-search`        | Debounced search input, emits `search-change` event                      |
| `profile-list`          | Renders a list of profile summaries from a data property                 |
| `profile-item`          | Renders one summary row, emits `open-profile` / `delete-profile`         |
| `profile-form`          | Editable profile form driven by state; delegates saves via events or API |
| `profile-field`         | Single labeled field with validation message display                     |
| `profile-summary`       | Displays read-only computed fields                                       |
| `validation-message`    | Displays one error string                                                |
| `profile-create-dialog` | Modal wrapper for the create flow                                        |

Components do not perform network requests inline. They call the API facade from `api.js` or receive data through properties and events.

## 7. Shared Domain Module

Create one shared module used by both client and server:

```text
/shared/profile.js
```

It must export pure functions:

```js
const normalize = (profile) => {
  // returns new normalized object
};

const validate = (profile, now = new Date()) => {
  // returns errors object when invalid
};

const calculate = (profile, now = new Date()) => {
  // returns computed fields
};

const buildState = (profile, now = new Date()) => {
  // returns { profile, computed, errors? }
};

export { normalize, validate, calculate, buildState };
```

- Functions must not mutate arguments.
- Functions must not access DOM.
- Functions must not access files.
- Functions must not use global mutable state.
- Functions must be deterministic except for the explicitly passed `now`.

## 8. Suggested Project Structure

```text
server.js                   entry point: bootstrap + dispatch
routes/
  static.js                 static file cache and serving
  search.js                 GET /search?name=&email=
  profile.js                GET|POST|DELETE /profile/{username}, PUT /profile
shared/
  profile.js                 shared domain: normalize, validate, calculate
data/
  profile/
    marcus.json
    faustina.json
static/
  index.html                SPA shell (minimal, no embedded templates)
  app.js                   imports and registers all components
  api.js                   network facade (all fetch calls live here)
  styles.css
  components/
    profile-app.js         + profile-app.html
    profile-form.js        + profile-form.html
    profile-field.js       + profile-field.html
    profile-summary.js     + profile-summary.html
    validation-message.js  + validation-message.html
    profile-directory.js   + profile-directory.html
    profile-search.js      + profile-search.html
    profile-list.js
    profile-item.js        + profile-item.html
    profile-create-dialog.js + profile-create-dialog.html
```

## 9. API Contract

Profile routes use a dynamic username segment. The username must match the file name in `./data/profile/` without the `.json` extension.

GET `/search?name={value}&email={value}`

Success response:

```json
{
  "ok": true,
  "items": [
    {
      "id": "marcus",
      "displayName": "Marcus Aurelius",
      "email": "marcus@example.com"
    }
  ]
}
```

Notes:

- `name` is optional
- `email` is optional
- search is case-insensitive
- `name` supports partial matches against `firstName`, `lastName` and `displayName`
- `email` supports partial matches against `email`

PUT `/profile`

Request body:

```json
{
  "id": "new-user",
  "firstName": "New",
  "lastName": "User",
  "email": "new.user@example.com"
}
```

Success response:

```json
{
  "ok": true,
  "profile": {},
  "computed": {}
}
```

Conflict response (id already exists):

```json
{
  "ok": false,
  "errors": { "id": "Profile already exists" }
}
```

GET `/profile/{username}`

Success response:

```json
{
  "ok": true,
  "profile": {},
  "computed": {}
}
```

POST `/profile/{username}`

Request body:

```json
{
  "firstName": "Marcus",
  "lastName": "Aurelius",
  "email": "marcus@example.com"
}
```

Success response:

```json
{
  "ok": true,
  "profile": {},
  "computed": {}
}
```

Validation error response:

```json
{
  "ok": false,
  "profile": {},
  "computed": {},
  "errors": { "email": "Invalid email" }
}
```

DELETE `/profile/{username}`

Success response:

```json
{
  "ok": true
}
```

## 10. Acceptance Criteria

The app starts with:

```bash
node server.js
```

The browser opens a profile form by username, for example:

```text
http://127.0.0.1:8000/profile/marcus
```

- The initial form data is loaded from the server for the requested username.
- The home route shows a profile directory with search, create and delete controls.
- Search supports partial input and finds profiles by name or email.
- Editing the form immediately recalculates computed fields.
- Invalid fields immediately show validation errors.
- The save button is disabled when the profile is invalid.
- POST sends JSON to the same endpoint.
- Creating a profile stores new valid data under `./data/profile/{username}.json`.
- Deleting a profile removes `./data/profile/{username}.json`.
- The server validates the data using the same shared domain module.
- Invalid POST data is not saved.
- Valid POST data is normalized and saved to `./data/profile/{username}.json`.
- Refreshing the page shows the last saved valid data for the same username.
- No npm dependencies are installed.
- No framework or bundler is used.
- The implementation remains small and readable.
- All `fetch` calls are in `static/api.js` only.
- The server routing table maps the first URL segment to a route module loaded from `routes/`; `server.js` is not a chain of `if/else`.
- All `<template>` elements are declared in `index.html`; component `.js` files contain no template strings.
- Components contain no inline `fetch` calls and no raw DOM construction loops.

## 11. Non-Goals

- Do not implement authentication.
- Do not implement a database.
- Do not implement server-side rendering.
- Do not implement a design system.
- Do not implement offline mode.
- Do not implement optimistic conflict resolution.

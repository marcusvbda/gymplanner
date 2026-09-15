# Contadores (Água, Proteína, Calorias) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three daily counters (água/ml, proteína/g, calorias/kcal) with configurable goals, quick-add logging, progress display and manual reset, reachable through a new bottom tab bar, while keeping the existing "Treino" screen as the app's home.

**Architecture:** Everything lives in the single `index.html` file (no build step, no framework — matches the existing app). A new bottom `<nav>` toggles which top-level `<section class="view">` is visible (Treino / Água / Proteína / Calorias). The three counter screens share one HTML template and one set of render/event functions, parameterized by a `CONTADOR_CFG` array (key, label, unit, shortcut amounts). State lives in a new `localStorage` key (`contadores-v1`), fully independent from the existing `treino-v1` state — this feature must not touch `ST`, `PLANO`, or the workout timer logic.

**Tech Stack:** Vanilla JS, vanilla CSS (custom properties already defined in `:root`), no dependencies. This project has no automated test runner (no `package.json`, no test framework) — verification in every task below is a manual step: serve the file locally (`npx serve`, as the app's own error message already recommends) and check behavior in a browser plus `localStorage` via devtools. Don't introduce a test framework for this feature; that would be scope creep the spec doesn't ask for.

**Spec:** `docs/superpowers/specs/2026-09-15-contadores-design.md`

## Global Constraints

- Single file: all changes go into `index.html`. No new files, no build tooling.
- Follow existing style conventions: CSS custom properties (`--bg`, `--card`, `--line`, `--txt`, `--dim`, `--acc`), Portuguese (pt-BR) copy, debounced localStorage writes (300ms), `hidden` attribute for showing/hiding elements (already used on `#file`).
- localStorage key for the new feature: `contadores-v1`. Must not read/write `treino-v1` or mutate `ST`/`PLANO`.
- No date-based auto-reset for counters — they accumulate until the user taps "Resetar" (per spec, this is intentionally different from the workout's day-based `done` reset).
- Shortcut amounts (locked in during brainstorming): água +250ml/+500ml, proteína +20g/+40g, calorias +200kcal/+500kcal. Manual numeric input + "Adicionar" button always available in addition to shortcuts.
- Reset zeroes only `consumido` (consumed), never `meta` (goal).

---

### Task 1: Bottom nav shell and view switching

**Files:**
- Modify: `index.html` (style block ~lines 17-119, body ~lines 122-154)

**Interfaces:**
- Produces: `.view` sections with ids `view-treino`, `view-agua`, `view-proteina`, `view-calorias`; a `#bottomnav` with `.nav-btn` elements carrying `data-view="treino|agua|proteina|calorias"`; a global function `mostrarView(nome)` that shows the matching `.view` and marks the matching `.nav-btn` as `aria-selected="true"`. Later tasks render content into `view-agua`/`view-proteina`/`view-calorias` and rely on `mostrarView` existing.

- [ ] **Step 1: Add the `--navh` variable and adjust existing layout for the new nav**

In the `:root{...}` block (currently lines 17-27), add the nav height variable:

```css
:root{
  --bg:#101319;
  --bg2:#161b23;
  --card:#1b212b;
  --line:#2a3240;
  --txt:#e7ebf2;
  --dim:#8a93a3;
  --acc:#ff7a45;
  --fig:#cfd6e2;
  --r:16px;
  --navh:60px;
}
```

Update the `body` padding-bottom (currently `padding-bottom:calc(100px + env(safe-area-inset-bottom));`) to also clear the new bottom nav:

```css
body{
    background:var(--bg);
    color:var(--txt);
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    font-size:16px;line-height:1.35;
    padding-bottom:calc(100px + var(--navh) + env(safe-area-inset-bottom));
    -webkit-font-smoothing:antialiased;
  }
```

Update `.timer` (currently `position:fixed;left:0;right:0;bottom:0;z-index:30;` with `padding:10px 16px calc(10px + env(safe-area-inset-bottom));`) so it sits above the bottom nav instead of flush with the screen edge (the nav now owns the safe-area padding):

```css
.timer{
    position:fixed;left:0;right:0;bottom:var(--navh);z-index:30;
    background:rgba(22,27,35,.94);backdrop-filter:blur(12px);
    border-top:1px solid var(--line);
    padding:10px 16px;
    display:flex;align-items:center;gap:9px;
  }
```

- [ ] **Step 2: Add CSS for the views and bottom nav**

Insert this block right after `.timer .stop{flex:0 0 52px;color:var(--dim)}` and before the `@media (prefers-reduced-motion:reduce)` line:

```css
.view[hidden]{display:none}

.bottomnav{
  position:fixed;left:0;right:0;bottom:0;z-index:40;
  display:flex;
  background:rgba(22,27,35,.94);backdrop-filter:blur(12px);
  border-top:1px solid var(--line);
  padding:6px 4px calc(6px + env(safe-area-inset-bottom));
}
.nav-btn{
  flex:1;background:none;border:0;color:var(--dim);
  display:flex;flex-direction:column;align-items:center;gap:2px;
  font:inherit;font-size:11px;padding:4px 0;cursor:pointer;
}
.nav-btn svg{width:22px;height:22px}
.nav-btn[aria-selected="true"]{color:var(--acc)}
```

- [ ] **Step 3: Wrap the existing treino markup in a view section and add the other views + nav**

Change the body (currently: `<body>` then directly `<header>...</header>`, `<main>`, `<p class="note">`, `.tools`, `#file`, `.timer`, then `<script>`) to:

```html
<body>

<div id="view-treino" class="view">
<header>
  <div class="days" id="days" role="tablist"></div>
  <div class="title">
    <div>
      <h1 id="dayName">Carregando</h1>
      <p class="focus" id="dayFocus"></p>
    </div>
    <div class="count"><b id="cDone">0</b>/<span id="cAll">0</span></div>
  </div>
  <div class="bar"><i id="barFill"></i></div>
</header>

<main id="list"></main>
<p class="note" id="note"></p>

<div class="tools">
  <button id="reset">Limpar o dia</button>
  <button id="export">Exportar</button>
  <button id="import">Importar</button>
</div>
<input type="file" id="file" accept="application/json,.json" hidden>

<div class="timer">
  <div class="clock" id="clock">0:00</div>
  <button data-t="60">60s</button>
  <button data-t="90">90s</button>
  <button data-t="120">2min</button>
  <button data-t="180">3min</button>
  <button class="stop" id="stop" aria-label="Parar o descanso">■</button>
</div>
</div>

<div id="view-agua" class="view" hidden></div>
<div id="view-proteina" class="view" hidden></div>
<div id="view-calorias" class="view" hidden></div>

<nav class="bottomnav" id="bottomnav">
  <button class="nav-btn" data-view="treino" aria-selected="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16M4 12v3M4 12V9M20 12v3M20 12V9M2 12h2M20 12h2M7 8v8M17 8v8"/></svg>
    <span>Treino</span>
  </button>
  <button class="nav-btn" data-view="agua" aria-selected="false">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z"/></svg>
    <span>Água</span>
  </button>
  <button class="nav-btn" data-view="proteina" aria-selected="false">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4a4 4 0 0 1 4 4c0 2-2 3-4 5s-3 4-5 4a4 4 0 0 1-4-4c0-2 2-3 4-5s3-4 5-4z"/><path d="M6 18l-2 2"/></svg>
    <span>Proteína</span>
  </button>
  <button class="nav-btn" data-view="calorias" aria-selected="false">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2s-5 5.5-5 10a5 5 0 0 0 10 0c0-1.5-1-2.5-1-2.5s0 2-2 2-2-2.5-1-4S12 2 12 2z"/></svg>
    <span>Calorias</span>
  </button>
</nav>

<script>
```

- [ ] **Step 4: Add the view-switching JS**

Add this near the top of the `<script>` block, right after the `const $ = s => document.querySelector(s);` line:

```js
/* ========== navegação ========== */
function mostrarView(nome){
  document.querySelectorAll('.view').forEach(v => v.hidden = v.id !== `view-${nome}`);
  document.querySelectorAll('.nav-btn').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view===nome)));
}
$('#bottomnav').addEventListener('click', e=>{
  const b = e.target.closest('.nav-btn'); if(!b) return;
  mostrarView(b.dataset.view);
});
```

- [ ] **Step 5: Verify manually**

Run: `npx serve .` in the project root, open the printed URL on a phone-width browser window (or devtools device toolbar).

Expected:
- App loads exactly as before (workout list, timer bar) inside the "Treino" tab, which is active by default.
- A bottom tab bar with 4 icons/labels (Treino, Água, Proteína, Calorias) is visible above the safe area.
- Tapping "Água" hides the workout view and shows an empty `view-agua` section (blank, no errors in console); the "Água" tab is now visually highlighted (accent color).
- Tapping back to "Treino" restores the workout view and its timer bar with no layout overlap with the bottom nav.
- No console errors.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: add bottom nav shell with view switching"
```

---

### Task 2: Counters config and state persistence

**Files:**
- Modify: `index.html` (script section, insert after the "descanso" block and before the "início" IIFE — i.e. after the `$('#stop').addEventListener(...)` block, currently ending around line 379)

**Interfaces:**
- Consumes: nothing from Task 1 directly (independent state module), but lives in the same `<script>`.
- Produces: `CONTADOR_CFG` (array of `{chave, label, unidade, atalhos}`), `CONTADORES` (object keyed by `chave` → `{meta, consumido}`), `carregarContadores()`, `salvarContadores()`. Task 3 reads `CONTADOR_CFG` to build markup; Task 4 reads/writes `CONTADORES` and calls `salvarContadores()`.

- [ ] **Step 1: Add the counters config and state module**

```js
/* ========== contadores ========== */
const CONTADOR_CFG = [
  { chave:'agua',     label:'Água',      unidade:'ml',   atalhos:[250,500] },
  { chave:'proteina', label:'Proteína',  unidade:'g',    atalhos:[20,40]   },
  { chave:'calorias', label:'Calorias',  unidade:'kcal', atalhos:[200,500] },
];

const CHAVE_CONTADORES = 'contadores-v1';
let CONTADORES = {};
CONTADOR_CFG.forEach(c => CONTADORES[c.chave] = { meta:0, consumido:0 });

function carregarContadores(){
  try{
    const v = localStorage.getItem(CHAVE_CONTADORES);
    if(!v) return;
    const d = JSON.parse(v);
    CONTADOR_CFG.forEach(c=>{
      const s = d[c.chave];
      if(s){
        CONTADORES[c.chave].meta = Number(s.meta) || 0;
        CONTADORES[c.chave].consumido = Number(s.consumido) || 0;
      }
    });
  }catch(e){}
}

let pendContadores;
function salvarContadores(){
  clearTimeout(pendContadores);
  pendContadores = setTimeout(()=>{
    try{ localStorage.setItem(CHAVE_CONTADORES, JSON.stringify(CONTADORES)); }catch(e){}
  }, 300);
}
```

- [ ] **Step 2: Call `carregarContadores()` on startup**

In the "início" IIFE (the `(async ()=>{ ... })();` block at the end of the script), add the call right after `carregar();`:

```js
(async ()=>{
  carregar();
  carregarContadores();
  try{
    // ...restante da IIFE original sem alterações (fetch do plano.json, etc.)
```

The rest of the IIFE (the `fetch('./plano.json', ...)` call and everything below it) stays exactly as it is today — this step only inserts the one new line.

- [ ] **Step 3: Verify manually**

Run: `npx serve .`, open the app, open devtools console.

Expected:
- `localStorage.getItem('contadores-v1')` is `null` on first load (nothing saved yet).
- Running `CONTADORES` in the console shows `{agua:{meta:0,consumido:0}, proteina:{...}, calorias:{...}}`.
- Running `CONTADORES.agua.consumido = 500; salvarContadores();` then waiting ~400ms and reloading the page, then running `CONTADORES` again after the reload shows `agua.consumido` restored to `500` (proves `carregarContadores()` runs on load and persistence round-trips).
- No console errors, and the workout tab still behaves exactly as before (proves `ST`/`treino-v1` wasn't touched).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add counters state and localStorage persistence"
```

---

### Task 3: Counter view markup template and mount

**Files:**
- Modify: `index.html` (style block: add `.counter*` rules; script: add markup-building function and mount call)

**Interfaces:**
- Consumes: `CONTADOR_CFG` and `CONTADORES` from Task 2; `view-agua`/`view-proteina`/`view-calorias` containers from Task 1.
- Produces: for each `cfg` in `CONTADOR_CFG`, fills `#view-${cfg.chave}` with markup containing elements with ids `meta-${chave}` (goal input), `valor-${chave}` (consumed/goal readout), `bar-${chave}` (progress bar fill `<i>`), `status-${chave}` (status text), a `.counter-shortcuts` container with `data-add="<amount>"` buttons, a `manual-${chave}` number input + `add-${chave}` button, and `reset-${chave}` button. A function `renderContador(chave)` that Task 4 will call after every mutation. Function `montarContadores()` builds and mounts all three, called once at startup.

- [ ] **Step 1: Add CSS for the counter screens**

Insert this block right after the `.nav-btn[aria-selected="true"]{color:var(--acc)}` rule added in Task 1:

```css
.counter{padding:16px 16px 24px;display:flex;flex-direction:column;gap:16px}
.counter h1{margin:0;font-size:22px;letter-spacing:-.02em}
.counter-goal{display:flex;align-items:center;gap:8px;color:var(--dim);font-size:14px}
.counter-goal input{
  width:100px;background:var(--card);border:1px solid var(--line);color:var(--txt);
  border-radius:9px;padding:8px 10px;font:inherit;font-size:15px;
}
.counter-value{font-variant-numeric:tabular-nums;font-size:32px;font-weight:700;letter-spacing:-.02em}
.counter-bar{height:8px;border-radius:99px;background:var(--line);overflow:hidden}
.counter-bar i{display:block;height:100%;width:0;background:var(--acc);border-radius:99px;transition:width .3s ease}
.counter-bar i.over{background:#ff4d4d}
.counter-status{color:var(--dim);font-size:14px;min-height:18px}
.counter-shortcuts{display:flex;gap:8px;flex-wrap:wrap}
.counter-shortcuts button{
  background:var(--card);border:1px solid var(--line);color:var(--txt);
  border-radius:12px;padding:10px 16px;font:inherit;font-size:14px;cursor:pointer;
}
.counter-shortcuts button:active{border-color:var(--acc);color:var(--acc)}
.counter-manual{display:flex;gap:8px}
.counter-manual input{
  flex:1;background:var(--card);border:1px solid var(--line);color:var(--txt);
  border-radius:9px;padding:10px;font:inherit;font-size:15px;
}
.counter-manual button{
  background:var(--acc);border:1px solid var(--acc);color:#0f1218;font-weight:600;
  border-radius:9px;padding:10px 18px;font:inherit;font-size:14px;cursor:pointer;
}
.counter-reset{
  background:none;border:1px solid var(--line);color:var(--dim);
  border-radius:12px;padding:12px 6px;font:inherit;font-size:14px;cursor:pointer;
}
```

- [ ] **Step 2: Add the markup template, mount function, and render function**

Add this in the "contadores" section from Task 2, after `salvarContadores()`:

```js
function contadorHTML(cfg){
  const atalhosHTML = cfg.atalhos.map(v =>
    `<button data-add="${v}">+${v}${cfg.unidade}</button>`
  ).join('');
  return `
    <div class="counter">
      <h1>${cfg.label}</h1>
      <label class="counter-goal">Meta diária (${cfg.unidade})
        <input type="number" inputmode="decimal" min="0" id="meta-${cfg.chave}" value="${CONTADORES[cfg.chave].meta || ''}" placeholder="0">
      </label>
      <div>
        <div class="counter-value" id="valor-${cfg.chave}"></div>
        <div class="counter-bar"><i id="bar-${cfg.chave}"></i></div>
        <p class="counter-status" id="status-${cfg.chave}"></p>
      </div>
      <div class="counter-shortcuts">${atalhosHTML}</div>
      <div class="counter-manual">
        <input type="number" inputmode="decimal" min="0" id="manual-${cfg.chave}" placeholder="Quantidade (${cfg.unidade})">
        <button id="add-${cfg.chave}">Adicionar</button>
      </div>
      <button class="counter-reset" id="reset-${cfg.chave}">Resetar contador</button>
    </div>`;
}

function renderContador(chave){
  const cfg = CONTADOR_CFG.find(c => c.chave === chave);
  const st = CONTADORES[chave];
  const pct = st.meta > 0 ? Math.round(st.consumido / st.meta * 100) : 0;
  $(`#valor-${chave}`).textContent = `${st.consumido} / ${st.meta || '—'} ${cfg.unidade}`;
  const bar = $(`#bar-${chave}`);
  bar.style.width = (st.meta > 0 ? Math.min(pct, 100) : 0) + '%';
  bar.classList.toggle('over', st.meta > 0 && st.consumido > st.meta);
  const status = $(`#status-${chave}`);
  if(st.meta <= 0){
    status.textContent = '';
  } else if(st.consumido <= st.meta){
    status.textContent = `Faltam ${st.meta - st.consumido}${cfg.unidade} · ${pct}% da meta`;
  } else {
    status.textContent = `Passou ${st.consumido - st.meta}${cfg.unidade} · ${pct}%`;
  }
}

function montarContadores(){
  CONTADOR_CFG.forEach(cfg=>{
    document.getElementById(`view-${cfg.chave}`).innerHTML = contadorHTML(cfg);
    renderContador(cfg.chave);
  });
}
```

- [ ] **Step 3: Call `montarContadores()` on startup**

In the "início" IIFE, right after `carregarContadores();`:

```js
(async ()=>{
  carregar();
  carregarContadores();
  montarContadores();
  try{
```

- [ ] **Step 4: Verify manually**

Run: `npx serve .`, open the app.

Expected:
- Tapping "Água" shows: an empty goal input (placeholder "0"), a "0 / — ml" readout, an empty progress bar, no status text, "+250ml"/"+500ml" buttons, a manual quantity input + "Adicionar" button, and a "Resetar contador" button.
- Same structure appears under "Proteína" (g, +20/+40) and "Calorias" (kcal, +200/+500), with correct labels/units.
- Typing in the goal input or tapping the shortcut/add/reset buttons doesn't yet change anything on screen (behavior wiring is Task 4) and produces no console errors.
- Reloading the page after Task 2's manual `CONTADORES.agua.consumido = 500` test still shows that value once loaded (confirms the template reads from `CONTADORES` correctly) — set it again if it was cleared, and confirm `valor-agua` shows `500 / — ml`.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add counter screen markup and initial render"
```

---

### Task 4: Counter interactions (goal, shortcuts, manual add, reset)

**Files:**
- Modify: `index.html` (script section, after `montarContadores()`)

**Interfaces:**
- Consumes: `CONTADORES`, `CONTADOR_CFG`, `salvarContadores()`, `renderContador(chave)` from Tasks 2-3.
- Produces: fully interactive counters — this is the last piece of behavior the feature needs.

- [ ] **Step 1: Add event delegation for goal input, shortcuts, manual add, and reset**

Add this right after the `montarContadores` function definition:

```js
function ligarEventosContadores(){
  CONTADOR_CFG.forEach(cfg=>{
    const view = document.getElementById(`view-${cfg.chave}`);

    view.querySelector(`#meta-${cfg.chave}`).addEventListener('input', e=>{
      CONTADORES[cfg.chave].meta = Number(e.target.value) || 0;
      salvarContadores();
      renderContador(cfg.chave);
    });

    view.addEventListener('click', e=>{
      const shortcut = e.target.closest('[data-add]');
      if(shortcut){
        CONTADORES[cfg.chave].consumido += Number(shortcut.dataset.add);
        salvarContadores(); renderContador(cfg.chave);
        navigator.vibrate?.(12);
        return;
      }
      if(e.target.id === `add-${cfg.chave}`){
        const input = view.querySelector(`#manual-${cfg.chave}`);
        const valor = Number(input.value);
        if(valor > 0){
          CONTADORES[cfg.chave].consumido += valor;
          input.value = '';
          salvarContadores(); renderContador(cfg.chave);
        }
        return;
      }
      if(e.target.id === `reset-${cfg.chave}`){
        CONTADORES[cfg.chave].consumido = 0;
        salvarContadores(); renderContador(cfg.chave);
      }
    });
  });
}
```

- [ ] **Step 2: Call `ligarEventosContadores()` once, right after `montarContadores()` in the "início" IIFE**

```js
(async ()=>{
  carregar();
  carregarContadores();
  montarContadores();
  ligarEventosContadores();
  try{
```

- [ ] **Step 3: Verify manually**

Run: `npx serve .`, open the app, go to "Água".

Expected:
- Typing `2000` in the goal input updates nothing else immediately, but after reload the value `2000` is still there (persisted).
- Tapping "+250ml" updates the readout to "250 / 2000 ml", the bar fills to ~12%, and the status shows "Faltam 1750ml · 12% da meta".
- Tapping "+500ml" a few more times until consumed exceeds 2000 flips the status to "Passou Xml · Y%" and the bar turns red (`.over` class), capped visually at 100% width.
- Typing `300` in the manual quantity input and tapping "Adicionar" adds 300 to consumed and clears the input.
- Tapping "Resetar contador" zeroes the consumed value and readout back to "0 / 2000 ml" while the goal (2000) is unchanged.
- Repeat the same checks on "Proteína" (g) and "Calorias" (kcal) — shortcuts, manual add, and reset all work with the correct unit and amounts.
- Switching to "Treino" and back to a counter tab preserves its state without re-fetching or resetting anything.
- No console errors at any point.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: wire counter goal, shortcut, manual add and reset interactions"
```

---

### Task 5: Visual polish and full manual QA pass

**Files:**
- Modify: `index.html` (minor CSS/markup touch-ups only — no new logic)

**Interfaces:**
- Consumes: everything from Tasks 1-4.
- Produces: nothing new — this task is a review/polish pass plus a final end-to-end manual test.

- [ ] **Step 1: Visual review in a real mobile viewport**

Run: `npx serve .`, open in devtools device toolbar at ~375px width (iPhone SE size) and ~430px (iPhone Pro Max size).

Check and fix as needed (small CSS tweaks only, keep within existing custom properties):
- Bottom nav icons/labels aren't cramped or clipped at 375px width.
- The active tab's accent color (`--acc`) is clearly visible against `--dim` for inactive tabs.
- Counter screens have comfortable spacing and don't get any content clipped by the bottom nav (check `body` padding-bottom is sufficient) or notch/home-indicator safe areas.
- The workout timer bar (when running) doesn't visually collide with the bottom nav.

- [ ] **Step 2: Full manual regression pass**

Walk through, and fix anything that fails:
- Fresh load (clear `localStorage` first) opens on "Treino" tab, workout renders exactly as before.
- Marking an exercise done / editing carga still works and persists (proves Task 1-4 changes didn't regress `treino-v1` logic).
- Export/Import buttons on the Treino tab still work.
- Rest timer (60s/90s/2min/3min + stop) still works and sits above the bottom nav.
- All three counters: set a goal, add via shortcut, add via manual input, go over the goal, reset — exactly as tested in Task 4 — still all correct after the polish pass.
- Reload the page: all counter goals and consumed values persist; workout `done`/`carga` state persists; nothing throws in the console.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "polish: refine bottom nav and counter screen styling"
```

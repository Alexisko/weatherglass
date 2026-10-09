// Place search: an ARIA 1.2 combobox over the geocoding API.
import { searchPlaces } from '../api/geocode.js';
import { placeLabel } from '../views/format.js';

export function setupSearch({ input, listbox, onSelect }) {
  let results = [];
  let active = -1;
  let timer = 0;
  let controller = null;

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearTimeout(timer);
    if (q.length < 2) { close(); return; }
    timer = setTimeout(() => run(q), 250);
  });

  async function run(q) {
    controller?.abort();
    controller = new AbortController();
    try {
      results = await searchPlaces(q, { signal: controller.signal });
      render();
    } catch (err) {
      if (err.name !== 'AbortError') { results = []; render(err.message); }
    }
  }

  function render(errorMessage) {
    active = -1;
    input.removeAttribute('aria-activedescendant');
    if (!results.length) {
      const li = document.createElement('li');
      li.className = 'suggestion suggestion--empty';
      li.textContent = errorMessage || 'No matching place. Try a city or region name.';
      listbox.replaceChildren(li);
    } else {
      listbox.replaceChildren(...results.map((r, i) => {
        const li = document.createElement('li');
        li.className = 'suggestion';
        li.id = `place-option-${i}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        const name = document.createElement('span');
        name.className = 'suggestion__name';
        name.textContent = r.name;
        const detail = document.createElement('span');
        detail.className = 'suggestion__detail';
        detail.textContent = placeLabel(r);
        li.append(name, detail);
        li.addEventListener('mousedown', e => e.preventDefault()); // keep focus in the input
        li.addEventListener('click', () => pick(i));
        return li;
      }));
    }
    listbox.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function setActive(i) {
    const items = [...listbox.querySelectorAll('[role="option"]')];
    if (!items.length) return;
    active = (i + items.length) % items.length;
    items.forEach((el, j) => el.setAttribute('aria-selected', String(j === active)));
    input.setAttribute('aria-activedescendant', items[active].id);
    items[active].scrollIntoView({ block: 'nearest' });
  }

  function pick(i) {
    const place = results[i];
    if (!place) return;
    input.value = '';
    close();
    input.blur();
    onSelect(place);
  }

  function close() {
    listbox.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }

  input.addEventListener('keydown', e => {
    const open = !listbox.hidden;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (open) setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (open) setActive(active - 1); }
    else if (e.key === 'Enter') {
      if (!open) return;
      e.preventDefault();
      pick(active >= 0 ? active : 0);
    } else if (e.key === 'Escape') { close(); }
  });
  input.addEventListener('blur', () => setTimeout(close, 120));
}

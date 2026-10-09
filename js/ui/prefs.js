// Per-browser preferences (theme, units). Storage may be unavailable; defaults apply then.
const read = (k, fallback) => { try { return localStorage.getItem(k) || fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export function getTheme() { return read('wg-theme', 'light') === 'dark' ? 'dark' : 'light'; }

export function setupThemeToggle(button) {
  const apply = theme => {
    document.documentElement.dataset.theme = theme;
    // Constant label + aria-pressed: "Dark theme" is on or off.
    button.setAttribute('aria-pressed', String(theme === 'dark'));
  };
  apply(getTheme());
  button.addEventListener('click', () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    write('wg-theme', next);
    apply(next);
  });
}

export function getUnits() { return read('wg-units', 'metric') === 'imperial' ? 'imperial' : 'metric'; }

export function setupUnitsToggle(group, onChange) {
  const buttons = [...group.querySelectorAll('button[data-units]')];
  const apply = units => buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.units === units)));
  apply(getUnits());
  buttons.forEach(b => b.addEventListener('click', () => {
    if (b.dataset.units === getUnits()) return;
    write('wg-units', b.dataset.units);
    apply(b.dataset.units);
    onChange(b.dataset.units);
  }));
}

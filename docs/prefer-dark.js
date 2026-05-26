// First-load default: prefer dark (presets pop on dark backgrounds). theme-picker
// starts in "auto" until the visitor chooses, so only override that implicit
// default — an explicit Light/Dark choice (persisted by theme-picker) is left
// untouched. Runs after load so theme-picker has initialized its controls.
// Shared by the gallery (gallery.js) and the API page (docs-entry.js).
export function preferDarkByDefault() {
  const picker = document.querySelector('theme-picker');
  const checked = picker && picker.querySelector('input[type="radio"]:checked');
  if (checked && checked.value === 'auto') {
    const dark = picker.querySelector('input[type="radio"][value="dark"]');
    if (dark) dark.click();
    else document.documentElement.dataset.mode = 'dark';
  } else if (!picker) {
    document.documentElement.dataset.mode = 'dark';
  }
}

window.addEventListener('load', preferDarkByDefault);

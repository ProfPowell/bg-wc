// Deprecated <gl-wc> alias for the canonical <bg-wc> element. Importing this
// (done by bg-wc.js) registers <gl-wc> as a subclass that warns once on first
// connect, so existing markup keeps working through the rename.
import { BgWc } from './bg-wc.js';

let warned = false;

class GlWcAlias extends BgWc {
  connectedCallback() {
    if (!warned) {
      warned = true;
      console.warn(
        '<gl-wc> is deprecated and will be removed in a future major. Use <bg-wc> instead.'
      );
    }
    super.connectedCallback?.();
  }
}

if (!customElements.get('gl-wc')) {
  customElements.define('gl-wc', GlWcAlias);
}

export { GlWcAlias };

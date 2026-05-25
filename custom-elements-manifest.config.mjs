function stripPrivateMembers() {
  return {
    name: 'strip-private-members',
    packageLinkPhase({ customElementsManifest }) {
      for (const mod of customElementsManifest.modules || []) {
        for (const decl of mod.declarations || []) {
          if (decl.members) {
            decl.members = decl.members.filter(
              (m) => !m.name.startsWith('_') && !m.name.startsWith('#')
            );
          }
        }
      }
    },
  };
}

function addCssParts() {
  return {
    name: 'add-css-parts',
    packageLinkPhase({ customElementsManifest }) {
      for (const mod of customElementsManifest.modules || []) {
        for (const decl of mod.declarations || []) {
          if (decl.tagName === 'gl-wc') {
            decl.cssParts = [
              { name: 'canvas', description: 'The rendered background canvas element' },
            ];
          }
        }
      }
    },
  };
}

export default {
  globs: ['src/**/*.js'],
  exclude: ['src/**/*.test.js'],
  outdir: '.',
  litelement: false,
  plugins: [stripPrivateMembers(), addCssParts()],
};

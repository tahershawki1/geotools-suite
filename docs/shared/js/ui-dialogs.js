// Shared UI dialogs placeholder; real modal to be added.
window.GeoUIDialogs = {
  promptFilename(opts) {
    const def = (opts && opts.defaultName) || 'export';
    const ext = (opts && opts.extension) || '';
    const name = prompt('Enter filename', ${def});
    return name || null;
  }
};

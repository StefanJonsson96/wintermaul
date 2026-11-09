// The save transfer dialog: copy your progress as a code (or a file) on one device and load it
// on another.
import { exportCode, importCode, describeSave, type Transfer } from '../campaign/transfer';
import { loadSave, mergeCareer, storeSave } from '../campaign/save';
import { clearGame, loadGame, storeGame } from '../saved';
import { clear, h, toast } from './dom';
import { icon } from './icons';
import { confirmDialog, openModal } from './modal';

export function openTransfer(onImported: () => void): void {
  const code = exportCode(loadSave(), loadGame());
  const out = h('textarea', { class: 'transfer-code', readonly: true, rows: 4, spellcheck: false }) as HTMLTextAreaElement;
  out.value = code;
  out.addEventListener('focus', () => out.select());

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast('Save code copied.', 'good');
    } catch {
      out.focus();
      out.select();
      try {
        // older browsers, and pages without clipboard access
        if (document.execCommand('copy')) return void toast('Save code copied.', 'good');
      } catch {
        /* fall through */
      }
      toast('Select the code and copy it yourself.', 'warn');
    }
  };
  const download = () => {
    try {
      const a = h('a', { href: URL.createObjectURL(new Blob([code], { type: 'text/plain' })), download: `winterward-save-${new Date().toISOString().slice(0, 10)}.txt` }) as HTMLAnchorElement;
      document.body.append(a);
      a.click();
      a.remove();
    } catch {
      toast("This page can't save files: copy the code instead.", 'warn');
    }
  };

  const input = h('textarea', { class: 'transfer-code', rows: 4, spellcheck: false, placeholder: 'Paste a save code here' }) as HTMLTextAreaElement;
  const file = h('input', { type: 'file', accept: '.txt,text/plain', style: { display: 'none' } }) as HTMLInputElement;
  const preview = h('div', { class: 'transfer-preview' });
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (f) input.value = await f.text();
    read();
  });
  const apply = (t: Transfer) => {
    const here = loadSave();
    // achievements and career totals from both devices are kept
    mergeCareer(t.campaign, here);
    storeSave(t.campaign);
    if (t.game) storeGame(t.game);
    else clearGame();
    modal.close();
    toast('Progress loaded.', 'good');
    onImported();
  };
  const read = () => {
    clear(preview);
    if (!input.value.trim()) return;
    let t: Transfer;
    try {
      t = importCode(input.value);
    } catch (e) {
      preview.append(h('div', { class: 'transfer-bad' }, (e as Error).message));
      return;
    }
    const when = t.exportedAt ? new Date(t.exportedAt).toLocaleString() : 'unknown time';
    preview.append(
      h('div', { class: 'transfer-row' }, h('span', null, 'In the code'), h('b', null, describeSave(t.campaign)), h('small', { class: 'muted' }, `saved ${when}${t.game ? ` · with a game in progress: ${t.game.title}, wave ${t.game.wave}` : ''}`)),
      h('div', { class: 'transfer-row' }, h('span', null, 'On this device'), h('b', null, describeSave(loadSave()))),
      h(
        'button',
        {
          class: 'btn primary',
          onclick: () =>
            confirmDialog('Replace the progress on this device with the code? Achievements from both are kept.', { ok: 'Replace', danger: true }, () => apply(t)),
        },
        icon('reset', 15),
        "Load it on this device",
      ),
    );
  };
  input.addEventListener('input', read);

  const modal = openModal(
    h(
      'div',
      { class: 'transfer' },
      h('h2', null, 'Move your progress'),
      h('p', { class: 'muted' }, 'Your campaign, Rune Web, relics, achievements and the game in progress, as one code. Copy it here and paste it on your other device.'),
      h('h3', null, 'From this device'),
      out,
      h('div', { class: 'field-row' }, h('button', { class: 'btn', onclick: () => void copy() }, icon('copy', 15), 'Copy code'), h('button', { class: 'btn ghost', onclick: download }, 'Save as a file')),
      h('h3', null, 'Onto this device'),
      input,
      h('div', { class: 'field-row' }, h('button', { class: 'btn ghost', onclick: () => file.click() }, 'Open a file'), file),
      preview,
      h('div', { class: 'field-row', style: { justifyContent: 'flex-end', marginTop: '12px' } }, h('button', { class: 'btn', onclick: () => modal.close() }, 'Close')),
    ),
    { narrow: true },
  );
}

// ---------- tab navigation ----------
const SUB_TO_TOP = {
  cover:'dossier', index:'dossier', ch1:'dossier', ch2:'dossier', ch3:'dossier',
  ch4:'dossier', ch5:'dossier', ch6:'dossier', ch7:'dossier',
  roman:'roman', dossier:'dossier', gallery:'gallery', letter:'letter', notebook:'notebook'
};

function isDossierUnlocked(){
  try{ return localStorage.getItem('dossierUnlocked') === '1'; } catch(e){ return false; }
}

function activateTopView(key){
  document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(key + '-view');
  if(el) el.classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.target === key));
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function navigateTo(id){
  const topKey = SUB_TO_TOP[id] || id;
  activateTopView(topKey);
  if(topKey === 'dossier' && isDossierUnlocked() && id !== 'dossier'){
    requestAnimationFrame(() => {
      const t = document.getElementById(id);
      if(t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.target));
});

document.querySelectorAll('.index-list li[data-target]').forEach(li => {
  li.addEventListener('click', () => navigateTo(li.dataset.target));
  li.setAttribute('tabindex', '0');
  li.setAttribute('role', 'button');
  li.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo(li.dataset.target); } });
});

// ---------- redaction reveal ----------
document.querySelectorAll('.redact').forEach(span => {
  const reveal = () => span.classList.toggle('revealed');
  span.addEventListener('click', reveal);
  span.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); reveal(); } });
});

// ---------- background music (playlist, plays in order, then loops) ----------
// Add as many tracks as you like — just list the filenames here in the order
// they should play, and drop matching files into the audio/ folder.
const PLAYLIST = ['theme1.mp3', 'theme2.mp3', 'theme3.mp3'];

const audio = document.getElementById('bg-audio');
const musicBtn = document.getElementById('music-toggle');
let playing = false;
let trackIndex = 0;

function loadTrack(i){
  audio.src = `audio/${PLAYLIST[i]}`;
}
loadTrack(trackIndex);

audio.addEventListener('ended', () => {
  trackIndex = (trackIndex + 1) % PLAYLIST.length;
  loadTrack(trackIndex);
  audio.play().catch(() => {});
});

musicBtn.addEventListener('click', async () => {
  try{
    if(!playing){
      await audio.play();
      playing = true;
      musicBtn.textContent = '❚❚';
      musicBtn.setAttribute('aria-label', 'Остановить фоновую музыку');
    } else {
      audio.pause();
      playing = false;
      musicBtn.textContent = '▶';
      musicBtn.setAttribute('aria-label', 'Включить фоновую музыку');
    }
  } catch(err){
    console.warn('Не удалось включить музыку. Добавьте файлы audio/theme1.mp3 и т.д. — см. README.', err);
    musicBtn.textContent = '?';
  }
});

// ---------- notebook (localStorage) ----------
const STORAGE_KEY = 'alyona-notebook-entries';

function loadEntries(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(err){
    console.warn('Не удалось прочитать блокнот из localStorage', err);
    return [];
  }
}

function saveEntries(entries){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch(err){
    console.warn('Не удалось сохранить блокнот в localStorage', err);
  }
}

function formatDate(iso){
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function renderEntries(){
  const list = document.getElementById('entries-list');
  const empty = document.getElementById('empty-state');
  const entries = loadEntries();
  list.innerHTML = '';

  if(entries.length === 0){
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  entries.slice().reverse().forEach(entry => {
    const card = document.createElement('div');
    card.className = 'entry-card';
    card.innerHTML = `
      <h3></h3>
      <div class="entry-date"></div>
      <div class="entry-body"></div>
      <div class="entry-actions">
        <button class="btn secondary btn-download">Скачать</button>
        <button class="btn secondary btn-delete">Удалить</button>
      </div>
    `;
    card.querySelector('h3').textContent = entry.title || 'Без названия';
    card.querySelector('.entry-date').textContent = formatDate(entry.date);
    card.querySelector('.entry-body').textContent = entry.text;

    card.querySelector('.btn-delete').addEventListener('click', () => {
      const all = loadEntries().filter(e => e.id !== entry.id);
      saveEntries(all);
      renderEntries();
    });
    card.querySelector('.btn-download').addEventListener('click', () => {
      downloadText(`${entry.title || 'entry'}.txt`, `${entry.title}\n${formatDate(entry.date)}\n\n${entry.text}`);
    });

    list.appendChild(card);
  });
}

function downloadText(filename, text){
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.getElementById('save-entry').addEventListener('click', () => {
  const titleEl = document.getElementById('entry-title');
  const textEl = document.getElementById('entry-text');
  const title = titleEl.value.trim();
  const text = textEl.value.trim();
  if(!text){ textEl.focus(); return; }

  const entries = loadEntries();
  entries.push({ id: Date.now().toString(36), title, text, date: new Date().toISOString() });
  saveEntries(entries);

  titleEl.value = '';
  textEl.value = '';
  renderEntries();
});

document.getElementById('export-all').addEventListener('click', () => {
  const entries = loadEntries();
  if(entries.length === 0) return;
  const full = entries.map(e => `${e.title || 'Без названия'}\n${formatDate(e.date)}\n\n${e.text}`).join('\n\n' + '—'.repeat(20) + '\n\n');
  downloadText('блокнот-алёны.txt', full);
});

renderEntries();

// ---------- password gate (roman -> dossier) ----------
const GATE_PASSWORD = '9928';

function unlockDossier(){
  try{ localStorage.setItem('dossierUnlocked', '1'); } catch(e){}
  const lock = document.getElementById('dossier-lock');
  const content = document.getElementById('dossier-content');
  if(lock) lock.style.display = 'none';
  if(content) content.style.display = 'block';
  const btn = document.getElementById('dossier-tab-btn');
  if(btn){ btn.classList.remove('locked'); btn.innerHTML = 'ДОСЬЕ'; }
}

function wireGate(inputId, submitId, msgId){
  const input = document.getElementById(inputId);
  const submit = document.getElementById(submitId);
  const msg = document.getElementById(msgId);
  if(!submit) return;

  function tryUnlock(){
    if(input.value.trim() === GATE_PASSWORD){
      msg.textContent = 'Пароль верный. Досье открыто.';
      msg.className = 'gate-msg ok';
      unlockDossier();
      setTimeout(() => navigateTo('cover'), 500);
    } else {
      msg.textContent = 'Неверный пароль. Подсказка: он назван в последней главе романа.';
      msg.className = 'gate-msg err';
    }
  }

  submit.addEventListener('click', tryUnlock);
  input.addEventListener('keydown', e => { if(e.key === 'Enter') tryUnlock(); });
}

wireGate('gate-input', 'gate-submit', 'gate-msg');
wireGate('dossier-gate-input', 'dossier-gate-submit', 'dossier-gate-msg');

if(isDossierUnlocked()){
  unlockDossier();
}

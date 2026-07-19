// ---------- folder-tab navigation ----------
const tabs = document.querySelectorAll('.folder-tab');
const sections = [...tabs].map(t => document.getElementById(t.dataset.target)).filter(Boolean);

function goTo(id){
  const el = document.getElementById(id);
  if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => goTo(tab.dataset.target));
});

document.querySelectorAll('.index-list li[data-target]').forEach(li => {
  li.addEventListener('click', () => goTo(li.dataset.target));
  li.setAttribute('tabindex', '0');
  li.setAttribute('role', 'button');
  li.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(li.dataset.target); } });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if(entry.isIntersecting){
      tabs.forEach(t => t.classList.toggle('active', t.dataset.target === entry.target.id));
    }
  });
}, { threshold: 0.5 });
sections.forEach(s => observer.observe(s));

// ---------- redaction reveal ----------
document.querySelectorAll('.redact').forEach(span => {
  const reveal = () => span.classList.toggle('revealed');
  span.addEventListener('click', reveal);
  span.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); reveal(); } });
});

// ---------- background music ----------
const audio = document.getElementById('bg-audio');
const musicBtn = document.getElementById('music-toggle');
let playing = false;

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
    console.warn('Не удалось включить музыку. Добавьте файл audio/theme.mp3 — см. README.', err);
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

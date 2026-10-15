(() => {
  'use strict';
  const KEY = 'life-radar-v1';
  const $ = (q) => document.querySelector(q);
  const safe = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => dateKey();
  const periods = { daily: 'Today', weekly: 'This week', monthly: 'This month', yearly: 'This year' };
  const categories = ['Food & groceries', 'Transport', 'Shopping', 'Bills & subscriptions', 'Health', 'Study', 'Entertainment', 'Other'];
  const money = cents => new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR',maximumFractionDigits:2}).format(cents / 100);
  const fresh = () => ({ tasks: [], radar: [], notes: [], expenses: [], customCategories: [], focus: null });
  const categoryKey = name => name.trim().toLowerCase();
  const allCategories = () => [...categories, ...data.customCategories];
  let data = fresh(), view = 'today', period = 'daily', selected = null, toastTimer;
  const validDate = (v) => v === '' || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && dateKey(new Date(`${v}T12:00:00`)) === v);
  function validate(d) {
    if (!d || !['tasks', 'radar', 'notes'].every(k => Array.isArray(d[k]) && d[k].length <= 10000)) return false;
    const base = x => x && typeof x.id === 'string' && typeof x.title === 'string' && x.title.length <= 180 && typeof x.details === 'string' && x.details.length <= 2000;
    const custom = d.customCategories ?? [];
    if (!Array.isArray(custom) || custom.length > 200 || !custom.every(c => typeof c === 'string' && c.trim() === c && c.length > 0 && c.length <= 60 && c !== '__new__')) return false;
    const allowedCategories = [...categories, ...custom];
    if (new Set(allowedCategories.map(categoryKey)).size !== allowedCategories.length) return false;
    if (d.expenses !== undefined && (!Array.isArray(d.expenses) || d.expenses.length > 10000 || !d.expenses.every(x => base(x) && Number.isSafeInteger(x.cents) && x.cents > 0 && x.cents <= 100000000000 && allowedCategories.includes(x.category) && x.date && validDate(x.date)))) return false;
    const ids = [...d.tasks, ...d.radar, ...d.notes, ...(d.expenses || [])].map(x => x?.id);
    return new Set(ids).size === ids.length && d.tasks.every(x => base(x) && x.period in periods && validDate(x.due) && Number.isFinite(x.minutes) && x.minutes >= 1 && x.minutes <= 1440 && typeof x.done === 'boolean' && validDate(x.completedAt || '')) && d.radar.every(x => base(x) && Number.isInteger(x.interval) && x.interval >= 1 && x.interval <= 3660 && validDate(x.lastDone || '')) && d.notes.every(x => base(x) && validDate(x.resurface) && validDate(x.createdAt));
  }
  try { const raw = localStorage.getItem(KEY); if (raw) { const parsed = JSON.parse(raw); if (!validate(parsed)) throw Error(); data = parsed; if (data.focus && (!data.tasks.some(t => t.id === data.focus.id && !t.done) || !Number.isFinite(data.focus.ends))) data.focus = null; } } catch { setTimeout(() => notify('Could not load saved data. Restore a backup or check browser storage.'), 100); }
  function notify(message) { $('#toast').textContent = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').textContent = '', 4500); }
  data.expenses ??= [];
  data.customCategories ??= [];
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { notify('Storage unavailable or full. Export a backup before closing.'); } render(); }
  function isInPeriod(task) {
    if (task.due) {
      const d = new Date(`${task.due}T12:00:00`), now = new Date(); now.setHours(12, 0, 0, 0);
      if (period === 'daily') return task.due <= today() && (!task.done || task.completedAt === today());
      if (period === 'weekly') { const end = new Date(now); end.setDate(now.getDate() + (7 - (now.getDay() || 7))); const start = new Date(end); start.setDate(end.getDate() - 6); return task.done ? d >= start && d <= end : d <= end; }
      if (period === 'monthly') return task.done ? d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() : task.due <= dateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      return task.done ? d.getFullYear() === now.getFullYear() : d.getFullYear() <= now.getFullYear();
    }
    return task.period === period;
  }
  const daysSince = (s) => s ? Math.max(0, Math.round((new Date(`${today()}T12:00:00`) - new Date(`${s}T12:00:00`)) / 86400000)) : null;
  const attention = () => data.radar.filter(r => !r.lastDone || daysSince(r.lastDone) >= r.interval);
  const tabs = () => `<div class="tabs" aria-label="Time frame">${Object.entries(periods).map(([key, label]) => `<button data-period="${key}" class="${period === key ? 'active' : ''}" aria-pressed="${period === key}">${label}</button>`).join('')}</div>`;
  const empty = (title, text, kind) => `<div class="empty"><strong>${title}</strong>${text}${kind ? `<br><button class="small-button" data-add="${kind}">＋ Add your first ${kind === 'radar' ? 'check-in' : kind}</button>` : ''}</div>`;
  function tasksPanel() {
    const tasks = data.tasks.filter(isInPeriod).sort((a, b) => Number(a.done) - Number(b.done) || (a.due || '9999').localeCompare(b.due || '9999'));
    return `<section class="panel"><div class="panel-head"><h2>Your tasks <span class="helper">/ ${tasks.filter(t => !t.done).length} open</span></h2><span class="helper">One thing at a time</span></div><blockquote class="quote">“if a work can be done in 5 min do it right now”</blockquote>${tabs()}${tasks.length ? tasks.map(t => `<div class="task ${t.done ? 'done' : ''}"><button class="check" data-complete="${safe(t.id)}" aria-label="${t.done ? 'Reopen' : 'Complete'} ${safe(t.title)}" aria-pressed="${t.done}">${t.done ? '✓' : ''}</button><div class="task-text"><span class="task-title">${safe(t.title)}</span><div class="meta"><span>${t.minutes} min</span>${t.minutes <= 5 ? '<span class="tag">QUICK WIN</span>' : ''}${t.due ? `<span class="${t.due < today() && !t.done ? 'urgent' : ''}">${t.due < today() && !t.done ? 'Overdue · ' : ''}${safe(t.due)}</span>` : ''}</div></div>${!t.done ? `<button class="start" data-decide="${safe(t.id)}">Start ↗</button>` : ''}<button class="delete" data-delete="tasks:${safe(t.id)}" aria-label="Delete ${safe(t.title)}">×</button></div>`).join('') : empty('A little room to begin.', 'Add something that would make your day feel lighter.', 'task')}<button class="add-inline" data-add="task">＋ Add a task</button></section>`;
  }
  function radarPanel(full = false) {
    const items = [...data.radar].sort((a,b) => Number(!b.lastDone || daysSince(b.lastDone) >= b.interval) - Number(!a.lastDone || daysSince(a.lastDone) >= a.interval));
    return `<section class="panel"><div class="panel-head"><h2>When did I last…?</h2><button class="text-button" data-add="radar">＋ Add</button></div><p class="helper">The little things that slip through the cracks.</p>${items.length ? items.slice(0,full ? undefined : 3).map(r => { const days = daysSince(r.lastDone), late = days === null || days >= r.interval; return `<div class="radar-item"><div class="row"><h3>${safe(r.title)}</h3><button class="delete" data-delete="radar:${safe(r.id)}" aria-label="Delete ${safe(r.title)}">×</button></div><p>${days === null ? 'No check-in yet' : days === 0 ? 'Done today' : `Last done ${days} day${days === 1 ? '' : 's'} ago`} · Every ${r.interval} days</p><div class="track"><i class="${late ? 'late' : ''}" style="width:${days === null ? 100 : Math.min(100, days / r.interval * 100)}%"></i></div><div class="row"><span class="helper ${late ? 'urgent' : ''}">${late ? 'Time for a check-in' : `Next in ${r.interval - days} days`}</span><button class="small-button" data-checkin="${safe(r.id)}">Just did it ✓</button></div></div>`; }).join('') : empty('Let your radar remember.', 'Backups, catch-ups, cleaning, renewals — give each its own rhythm.', 'radar')}</section>`;
  }
  function notePanel(n) { return `<section class="panel past-note"><div class="panel-head"><span class="eyebrow">A NOTE FROM PAST YOU</span><button class="delete" data-delete="notes:${safe(n.id)}" aria-label="Delete note">×</button></div><p>“${safe(n.title)}”</p>${n.details ? `<div class="helper">${safe(n.details)}</div>` : ''}<small>Left on ${safe(n.createdAt)}${n.resurface ? ` · Resurfaces ${safe(n.resurface)}` : ''}</small></section>`; }
  function spendingPanel() {
    const now = new Date(), end = today(), start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (period === 'weekly') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    if (period === 'monthly') start.setDate(1);
    if (period === 'yearly') start.setMonth(0, 1);
    const from = dateKey(start), entries = data.expenses.filter(x => x.date >= from && x.date <= end).sort((a,b) => b.date.localeCompare(a.date));
    const total = entries.reduce((s,x) => s+x.cents,0), grouped = allCategories().map(category => ({category,total:entries.filter(x => x.category === category).reduce((s,x) => s+x.cents,0)})).filter(x => x.total).sort((a,b) => b.total-a.total);
    return `<section class="panel"><div class="panel-head"><h2>Your spending</h2><button class="primary" data-expense>Add spending ＋</button></div>${tabs()}<p class="helper">${from} → ${end} · Manually logged · INR</p><div class="spend-total">${money(total)}<span>${entries.length} expense${entries.length === 1 ? '' : 's'} logged</span></div></section><div class="columns"><section class="panel"><div class="panel-head"><h2>Expense log</h2><span class="helper">Latest first</span></div>${entries.length ? entries.map(x => `<div class="expense"><div class="task-text"><span class="task-title">${safe(x.title)}</span><div class="meta"><span class="tag">${safe(x.category)}</span><span>${safe(x.date)}</span></div>${x.details ? `<p class="helper">${safe(x.details)}</p>` : ''}</div><strong>${money(x.cents)}</strong><button class="delete" data-delete="expenses:${safe(x.id)}" aria-label="Delete ${safe(x.title)}">×</button></div>`).join('') : empty('Start with your next purchase.', 'Tea, a bus ticket, groceries — every little expense has a place.')}<button class="add-inline" data-expense>＋ Log an expense</button></section><section class="panel"><h2>Where it went</h2>${grouped.length ? grouped.map(x => `<div class="radar-item"><div class="row"><h3>${safe(x.category)}</h3><span class="helper">${money(x.total)}</span></div><div class="track"><i style="width:${x.total/total*100}%"></i></div><span class="helper">${Math.round(x.total/total*100)}% of this period</span></div>`).join('') : '<p class="helper">Your category breakdown appears as you log spending.</p>'}</section></div>`;
  }
  function render() {
    $('#date').textContent = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).toUpperCase();
    const headers = { today:['A little focus.<br>A little more life.', 'Make space for what matters, one small thing at a time.'], radar:['Less remembering.<br>More peace of mind.', 'Keep the important little things from slipping away.'], memory:['A thought today.<br>A gift for tomorrow.', 'Leave something helpful for the person you’re becoming.'], review:['Look back gently.<br>Move forward clearly.', 'Notice what moved. Make room for what comes next.'] };
    headers.spending = ['Every little expense.<br>A clearer picture.', 'Give your spending a place. See where your money goes.'];
    $('#heading').innerHTML = headers[view][0]; $('#subtitle').textContent = headers[view][1];
    document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('active', b.dataset.view === view); b.setAttribute('aria-current', b.dataset.view === view ? 'page' : 'false'); });
    const completed = data.tasks.filter(t => t.done), open = data.tasks.filter(t => !t.done);
    if (view === 'today') {
      const n = [...data.notes].reverse().find(n => !n.resurface || n.resurface <= today());
      $('#content').innerHTML = `<div class="overview"><div class="stat"><div><small>ON YOUR PLATE TODAY</small><strong>${open.filter(t => t.due ? t.due <= today() : t.period === 'daily').length}<small> tasks</small></strong></div><span class="symbol">◷</span></div><div class="stat"><div><small>NEEDS A LITTLE ATTENTION</small><strong>${attention().length}<small> check-ins</small></strong></div><span class="symbol">◎</span></div><div class="stat"><div><small>SMALL WINS TODAY</small><strong>${completed.filter(t => t.completedAt === today()).length}<small> done</small></strong></div><span class="symbol">✳</span></div></div><div class="columns"><div>${tasksPanel()}</div><div class="right-column">${radarPanel()}${n ? notePanel(n) : `<section class="panel past-note"><p class="eyebrow">A LITTLE KINDNESS FOR LATER</p><h2>Leave future you a note.</h2><p class="helper">A reminder, a lesson, or a small encouragement.</p><button class="text-button" data-add="note">Write a note ↗</button></section>`}</div></div>`;
    } else if (view === 'spending') $('#content').innerHTML = spendingPanel();
    else if (view === 'radar') $('#content').innerHTML = radarPanel(true);
    else if (view === 'memory') $('#content').innerHTML = `<div class="panel-head"><h2>Notes to self</h2><button class="primary" data-add="note">＋ Leave a note</button></div>${data.notes.length ? `<div class="memory-grid">${[...data.notes].reverse().map(notePanel).join('')}</div>` : `<section class="panel">${empty('What would future you like to hear?', 'Capture a lesson, an idea, or something worth remembering.', 'note')}</section>`}`;
    else {
      const taskList = tasks => tasks.length ? `<ul class="review-list">${tasks.map(t => `<li>${safe(t.title)} <span class="tag">${safe(periods[t.period])}</span></li>`).join('')}</ul>` : '<p class="helper">Nothing here yet. Let it build naturally.</p>';
      $('#content').innerHTML = `<section class="panel"><div class="panel-head"><h2>Your perspective</h2></div>${tabs()}<p class="helper">Completed tasks use their completion date. Open tasks use their due date or chosen time frame.</p></section><div class="review-grid"><section class="panel"><h2>Things you moved forward</h2>${taskList(completed.filter(t => { const date = t.completedAt; return date && isInPeriod({ ...t, due: date }); }))}</section><section class="panel"><h2>Still on your mind</h2>${taskList(open.filter(isInPeriod))}</section><section class="panel"><h2>A gentle check-in</h2><p class="helper">${attention().length ? `${attention().length} recurring check-in${attention().length === 1 ? '' : 's'} could use your attention.` : 'Your recurring check-ins are up to date.'}</p><button class="text-button" data-view="radar">Visit your radar →</button></section><section class="panel"><h2>Keep a copy of your life</h2><p class="helper">Your entries are saved in this browser. Export a backup to keep a copy or move to another device.</p><button class="small-button" data-backup>Export backup ↗</button><button class="text-button" data-restore>Restore backup</button></section></div>`;
    }
    renderFocus();
  }
  function capture(kind = 'task') { $('#entry-form').reset(); $('#kind').value = kind; updateFields(); $('#editor').showModal(); setTimeout(() => $('#entry-form [name="title"]').focus(), 30); }
  function updateFields() { const k = $('#kind').value; for (const type of ['task','radar','note']) document.querySelectorAll(`.${type}-fields`).forEach(e => { e.hidden = k !== type; e.querySelectorAll('input,select').forEach(i => i.disabled = k !== type); if (e.matches('input,select')) e.disabled = k !== type; }); }
  $('#kind').onchange = updateFields;
  function updateCustomCategory() {
    const adding = $('#expense-category').value === '__new__';
    $('#custom-category-field').hidden = !adding;
    $('#custom-category').disabled = !adding;
    $('#custom-category').required = adding;
  }
  $('#expense-category').onchange = () => { updateCustomCategory(); if (!$('#custom-category-field').hidden) $('#custom-category').focus(); };
  function captureExpense() {
    $('#expense-form').reset();
    $('#expense-category').innerHTML = allCategories().map(c => `<option value="${safe(c)}">${safe(c)}</option>`).join('') + '<option value="__new__">＋ Add a category…</option>';
    $('#expense-category').value = categories[0]; updateCustomCategory();
    $('#expense-form [name="date"]').value = today(); $('#expense-editor').showModal(); $('#expense-form [name="title"]').focus();
  }
  $('#capture').onclick = () => view === 'spending' ? captureExpense() : capture(); $('#close-editor').onclick = () => $('#editor').close(); $('#close-decision').onclick = () => $('#decision').close();
  $('#close-expense').onclick = () => $('#expense-editor').close();
  $('#expense-form').onsubmit = e => {
    e.preventDefault(); const f = new FormData(e.target), title = String(f.get('title') || '').trim(), amount = String(f.get('amount') || '').trim(), date = String(f.get('date') || '');
    let category = String(f.get('category') || ''), newCategory = false;
    if (category === '__new__') {
      category = String(f.get('customCategory') || '').trim();
      if (!category || category.length > 60 || category === '__new__') { notify('Give your category a name of 1–60 characters.'); return; }
      const existing = allCategories().find(c => categoryKey(c) === categoryKey(category));
      if (existing) category = existing;
      else { if (data.customCategories.length >= 200) { notify('You can save up to 200 custom categories.'); return; } newCategory = true; }
    }
    const cents = Math.round(Number(amount) * 100);
    if (!title || title.length > 180 || !/^\d+(\.\d{1,2})?$/.test(amount) || !Number.isSafeInteger(cents) || cents <= 0 || cents > 100000000000 || !date || !validDate(date) || date > today() || (!newCategory && !allCategories().includes(category))) { notify('Enter a description, a positive amount (up to 2 decimals), and a date no later than today.'); return; }
    if (newCategory) data.customCategories.push(category);
    data.expenses.push({id:crypto.randomUUID(),title,cents,date,category,details:String(f.get('details') || '').trim().slice(0,2000)}); $('#expense-editor').close(); save(); notify('Spending logged.');
  };
  $('#entry-form').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), title = String(f.get('title')).trim(); if (!title) return; const base = { id: crypto.randomUUID(), title, details: String(f.get('details') || '').trim() }, kind = f.get('kind'); if (kind === 'task') data.tasks.push({...base,period:f.get('period'),due:String(f.get('due') || ''),minutes:Number(f.get('minutes')),done:false,completedAt:''}); else if (kind === 'radar') data.radar.push({...base,interval:Number(f.get('interval')),lastDone:''}); else data.notes.push({...base,createdAt:today(),resurface:String(f.get('resurface') || '')}); $('#editor').close(); save(); notify('Saved. A little less on your mind.'); };
  document.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.view) { view = b.dataset.view; render(); }
    if (b.dataset.period) { period = b.dataset.period; render(); }
    if (b.dataset.add) capture(b.dataset.add);
    if (b.hasAttribute('data-expense')) captureExpense();
    if (b.dataset.complete) { const t = data.tasks.find(t => t.id === b.dataset.complete); if (!t) return; t.done = !t.done; t.completedAt = t.done ? today() : ''; if (data.focus?.id === t.id) data.focus = null; save(); }
    if (b.dataset.checkin) { const r = data.radar.find(r => r.id === b.dataset.checkin); if (r) { r.lastDone = today(); save(); notify('Checked in. You’re all set.'); } }
    if (b.dataset.decide) { selected = b.dataset.decide; const t = data.tasks.find(t => t.id === selected); if (!t) return; $('#decision-task').textContent = `${t.title} · ${t.minutes} min`; $('#decision').showModal(); }
    if (b.dataset.delete) { const [type,id] = b.dataset.delete.split(':'); if (!['tasks','radar','notes','expenses'].includes(type)) return; if (!confirm('Delete this entry? This cannot be undone.')) return; data[type] = data[type].filter(x => x.id !== id); if (data.focus?.id === id) data.focus = null; save(); }
    if (b.hasAttribute('data-backup')) backup(); if (b.hasAttribute('data-restore')) $('#import').click();
    if (b.hasAttribute('data-stop-focus')) { data.focus = null; save(); }
    if (b.hasAttribute('data-finish-focus') && data.focus) { const t = data.tasks.find(t => t.id === data.focus.id); if (t) { t.done = true; t.completedAt = today(); } data.focus = null; save(); notify('One small win. Nicely done.'); }
  });
  $('#start-task').onclick = () => { const t = data.tasks.find(t => t.id === selected); if (!t) return; if (data.focus && data.focus.id !== t.id && !confirm('Replace your current focus session?')) return; if (data.focus?.id !== t.id) data.focus = {id:t.id,ends:Date.now() + t.minutes * 60000}; $('#decision').close(); save(); };
  $('#later-task').onclick = () => { const t = data.tasks.find(t => t.id === selected); if (!t) return; const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1); t.due = dateKey(tomorrow); if (data.focus?.id === t.id) data.focus = null; $('#decision').close(); save(); notify('Moved to tomorrow. A conscious choice is progress too.'); };
  function renderFocus() { const el = $('#focus'), t = data.tasks.find(t => t.id === data.focus?.id); el.hidden = !t; if (!t) return; const left = Math.max(0,Math.ceil((data.focus.ends - Date.now()) / 1000)); el.innerHTML = `<div>Focusing on: ${safe(t.title)}<span>${left ? 'One thing. Right now.' : 'Time’s up. Finish when you’re ready.'}</span></div><strong>${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}</strong><div><button class="small-button" data-finish-focus>Mark done ✓</button> <button class="text-button" data-stop-focus>Stop</button></div>`; }
  setInterval(() => { const active = document.activeElement; if (!$('#focus').contains(active)) renderFocus(); }, 1000);
  let lastDay = today(); setInterval(() => { if (today() !== lastDay) { lastDay = today(); render(); } }, 30000);
  function backup() { const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'}), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `life-radar-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); }
  $('#export').onclick = backup;
  $('#import').onchange = async e => { try { const file = e.target.files[0]; if (!file) return; if (file.size > 5000000) throw Error('Backup is too large.'); const next = JSON.parse(await file.text()); if (!validate(next)) throw Error('This isn’t a valid Life Radar backup.'); if (!confirm('Replace your current Life Radar entries with this backup? Export a copy first if you need them.')) return; data = {tasks:next.tasks,radar:next.radar,notes:next.notes,expenses:next.expenses || [],customCategories:next.customCategories || [],focus:null}; save(); notify('Your backup has been restored.'); } catch (err) { notify(err.message || 'Could not restore this file.'); } finally { e.target.value = ''; } };
  render();
})();

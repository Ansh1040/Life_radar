(() => {
  'use strict';
  const api=globalThis.LifeRadar, content=document.querySelector('#content');
  if (!api || !content) return;
  const reminder=document.createElement('label');reminder.className='task-fields';reminder.innerHTML='Reminder <span class="optional">(optional)</span><input name="reminderAt" type="datetime-local"><span class="helper">Android notification at your chosen time. Battery restrictions may delay delivery.</span>';
  document.querySelector('#entry-form button[type="submit"]').before(reminder);
  const views=['today','radar','spending','memory','review'];
  const identity={today:{label:'Today',detail:'ONE STEP AT A TIME',symbol:'sun'},radar:{label:'Life radar',detail:'YOUR PERSONAL CHECK-IN',symbol:'radar'},spending:{label:'Spending',detail:'YOUR MONEY, IN FOCUS',symbol:'wallet'},memory:{label:'Notes to self',detail:'THOUGHTS WORTH KEEPING',symbol:'notebook'},review:{label:'Review',detail:'SEE HOW FAR YOU’VE COME',symbol:'chart'}};
  const paths={today:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12l6-6"/>',spending:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 8h18m-5 5h5"/><circle cx="16" cy="14" r=".5"/>',memory:'<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M8 3v18m3-13h6m-6 4h6M3 7h3m-3 5h3m-3 5h3"/>',review:'<path d="M4 3v17h17M8 15l4-4 4 2 5-7"/>'};
  const icon=key=>`<svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[key]}</svg>`;
  document.querySelectorAll('.symbol-nav [data-view]').forEach(button=>{button.innerHTML=icon(button.dataset.view)+`<span class="nav-active-label" aria-hidden="true">${identity[button.dataset.view].label}</span>`;});
  const topbar=document.querySelector('.topbar'), brand=document.querySelector('.brand');
  topbar.querySelector(':scope > span')?.remove();topbar.prepend(brand);
  const sectionIcon=brand.querySelector('.brand-icon');sectionIcon.classList.add('section-icon');
  const controls=document.createElement('div'); controls.className='topbar-actions';
  const capture=document.querySelector('#capture'); capture.before(controls);controls.append(capture);
  const theme=document.createElement('button');theme.className='theme-toggle';controls.prepend(theme);
  let mode='dark';try{mode=localStorage.getItem('life-radar-theme')==='light'?'light':'dark';}catch{}
  const applyTheme=()=>{document.documentElement.dataset.theme=mode;theme.textContent=mode==='dark'?'☀':'☾';theme.setAttribute('aria-label',`Switch to ${mode==='dark'?'light':'dark'} mode`);theme.title=theme.getAttribute('aria-label');document.querySelector('meta[name="theme-color"]').content=mode==='dark'?'#111528':'#f0f1fc';};
  theme.onclick=()=>{mode=mode==='dark'?'light':'dark';applyTheme();try{localStorage.setItem('life-radar-theme',mode);}catch{}};applyTheme();
  const notifications=document.createElement('button');notifications.className='theme-toggle';notifications.innerHTML='<svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zm5 3h4"/></svg>';notifications.title='Notification settings';notifications.setAttribute('aria-label','Notification settings');controls.prepend(notifications);notifications.onclick=()=>{if(globalThis.AndroidBackup?.notificationSettings)globalThis.AndroidBackup.notificationSettings();else api.notify('Task notifications work in the Android app. Add a reminder time when creating a task.');};
  const backup=document.createElement('div');backup.className='backup-mobile';backup.innerHTML='<button type="button" data-export-mobile>Export backup</button><button type="button" data-import-mobile>Restore backup</button>';document.querySelector('footer').before(backup);
  backup.querySelector('[data-export-mobile]').onclick=()=>api.backup();backup.querySelector('[data-import-mobile]').onclick=()=>document.querySelector('#import').click();
  const sheet=document.createElement('dialog');sheet.className='actions-sheet';sheet.setAttribute('aria-label','Entry actions');document.body.append(sheet);
  function showActions(type,id){sheet.replaceChildren();const title=document.createElement('h2');title.textContent='What would you like to do?';sheet.append(title);
    if(api.canEdit(type,id)){const edit=document.createElement('button');edit.textContent='Edit entry';edit.onclick=()=>{sheet.close();api.edit(type,id);};sheet.append(edit);}
    else {const info=document.createElement('p');info.className='helper';info.textContent='Only expenses created through Quick Capture can be edited.';sheet.append(info);}
    const remove=document.createElement('button');remove.className='danger';remove.textContent='Delete entry';remove.onclick=()=>{sheet.close();api.remove(type,id);};sheet.append(remove);
    const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.onclick=()=>sheet.close();sheet.append(cancel);sheet.showModal();
  }
  function enhance(){
    const current=api.currentView(), info=identity[current];
    document.documentElement.dataset.page=current;
    sectionIcon.innerHTML=icon(current);
    brand.querySelector('small').textContent=info.detail;
    document.title=`${info.label} · Life Radar`;
    const motif=document.querySelector('.radar-art');
    motif.innerHTML=`<div class="page-motif motif-${current}">${icon(current)}<span>${current==='today'?'MAKE TODAY COUNT':current==='radar'?'STAY IN ORBIT':current==='spending'?'MONEY IN · MONEY OUT':current==='memory'?'DEAR FUTURE ME':'SMALL STEPS ADD UP'}</span></div>`;
    motif.setAttribute('aria-hidden','true');
    const intro=document.querySelector('.intro');
    let chapter=intro.querySelector('.page-chapter');
    if(!chapter){chapter=document.createElement('p');chapter.className='page-chapter';intro.firstElementChild.prepend(chapter);}
    chapter.textContent={today:'THE DAILY EDIT',radar:'ON YOUR RADAR',spending:'THE MONEY JOURNAL',memory:'YOUR PERSONAL LETTERS',review:'THE BIGGER PICTURE'}[current];
    content.querySelectorAll('[data-delete]').forEach(button=>{
      const row=button.closest('.task,.radar-item,.past-note,.expense');if(!row||row.dataset.swipeId)return;
      const [type,id]=button.dataset.delete.split(':');row.dataset.swipeType=type;row.dataset.swipeId=id;row.classList.add('swipe-target');
      const at=type==='tasks'?api.getReminder(id):'';if(at){const label=document.createElement('div');label.className='meta';label.textContent='Reminder · '+new Date(at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});row.querySelector('.task-text')?.append(label);}
      const more=document.createElement('button');more.type='button';more.className='entry-menu';more.textContent='⋯';more.setAttribute('aria-label','Actions for this entry');more.onclick=()=>showActions(type,id);button.before(more);
    });
    if(!content.querySelector('.gesture-help')){const help=document.createElement('p');help.className='gesture-help';help.textContent='Swipe an entry right to edit, left for actions. Swipe empty space to switch sections.';content.prepend(help);}
  }
  globalThis.LifeRadarUI={enhance};enhance();
  let gesture=null;
  content.style.touchAction='pan-y';
  content.addEventListener('pointerdown',event=>{if(event.isPrimary===false||event.target.closest('button,input,textarea,select,a'))return;const row=event.target.closest('[data-swipe-id]');gesture={x:event.clientX,y:event.clientY,id:event.pointerId,row};content.setPointerCapture(event.pointerId);});
  content.addEventListener('pointerup',event=>{if(!gesture||gesture.id!==event.pointerId)return;const g=gesture;gesture=null;const dx=event.clientX-g.x,dy=event.clientY-g.y;if(Math.abs(dx)<65||Math.abs(dx)<Math.abs(dy)*1.5)return;
    if(g.row){const {swipeType:type,swipeId:id}=g.row.dataset;if(dx>0&&api.canEdit(type,id))api.edit(type,id);else showActions(type,id);}
    else {const index=views.indexOf(api.currentView())+(dx<0?1:-1);if(index>=0&&index<views.length){api.navigate(views[index]);window.scrollTo({top:0,behavior:'instant'});}}
  });content.addEventListener('pointercancel',()=>gesture=null);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let scheduled=false,point=null;
  if(!reduce)document.addEventListener('pointermove',event=>{if(event.pointerType==='touch'||document.hidden)return;point={x:event.clientX,y:event.clientY};if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;document.documentElement.style.setProperty('--pointer-x',`${point.x/innerWidth*100}%`);document.documentElement.style.setProperty('--pointer-y',`${point.y/innerHeight*100}%`);});},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)gesture=null;});
})();

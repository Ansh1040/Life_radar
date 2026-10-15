import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = await readFile(new URL('./app.js', import.meta.url), 'utf8');
function boot(saved = null) {
  const nodes = new Map(), listeners = {}, store = new Map(saved ? [['life-radar-v1', JSON.stringify(saved)]] : []);
  const node = key => { if (!nodes.has(key)) nodes.set(key, { innerHTML:'', textContent:'', value:'', hidden:false, dataset:{}, classList:{toggle(){}},setAttribute(){},querySelectorAll(){return []},querySelector(){return node('field')},reset(){},showModal(){this.open=true},close(){this.open=false},focus(){},contains(){return false},click(){} }); return nodes.get(key); };
  const context = { document:{querySelector:node,querySelectorAll:()=>[],addEventListener:(type,fn)=>listeners[type]=fn,activeElement:null,createElement:()=>node('anchor')},localStorage:{getItem:k=>store.get(k) || null,setItem:(k,v)=>store.set(k,v)},setTimeout:()=>0,clearTimeout(){},setInterval(){},Date,Math,JSON,String,Number,Array,Set,Error,Object,crypto:{randomUUID:()=> 'new-id'},FormData:class{constructor(form){this.form=form}get(key){return this.form.values[key] ?? null}},confirm:()=>true,Blob,URL,console };
  vm.runInNewContext(source,context);
  return {node,store,click:dataset=>listeners.click({target:{closest:()=>({dataset,hasAttribute:k=>k in dataset})}}),state:()=>JSON.parse(store.get('life-radar-v1'))};
}
const app = boot();
assert.match(app.node('#content').innerHTML,/if a work can be done in 5 min do it right now/);
app.node('#entry-form').onsubmit({preventDefault(){},target:{values:{kind:'task',title:'<script>alert(1)</script>',details:'',period:'daily',minutes:'5',due:''}}});
assert.equal(app.state().tasks.length,1);
assert.ok(!app.node('#content').innerHTML.includes('<script>alert(1)</script>'));
assert.match(app.node('#content').innerHTML,/&lt;script&gt;/);
app.click({decide:'new-id'}); assert.equal(app.node('#decision').open,true);
app.node('#start-task').onclick(); assert.equal(app.state().focus.id,'new-id');
const restored = boot(app.state()); assert.match(restored.node('#focus').innerHTML,/05:00|04:59/);
app.click({complete:'new-id'}); assert.equal(app.state().tasks[0].done,true); assert.equal(app.state().focus,null);
app.click({complete:'new-id'}); app.click({decide:'new-id'}); app.node('#later-task').onclick(); assert.ok(app.state().tasks[0].due > new Date().toLocaleDateString('en-CA'));
app.click({view:'review'}); assert.match(app.node('#content').innerHTML,/Your perspective/);
app.click({view:'memory'}); assert.match(app.node('#content').innerHTML,/Notes to self/);
app.click({view:'radar'}); assert.match(app.node('#content').innerHTML,/When did I last/);
const bad = boot({tasks:[{id:'bad'}],radar:[],notes:[]}); assert.match(bad.node('#content').innerHTML,/A little room to begin/);
console.log('Passed: empty state, quote, task capture, HTML escaping, start prompt, focus persistence, completion, postponement, navigation, invalid storage recovery.');

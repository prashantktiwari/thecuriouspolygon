(()=>{'use strict';
const config=JSON.parse(JSON.stringify(window.PORTFOLIO_MEDIA||{})),files=new Map(),objectURLs=new Map();let dirty=false;
const picker=document.querySelector('#slot-picker'),content=document.querySelector('#editor-content'),status=document.querySelector('#editor-status'),M=window.PortfolioMedia;
Object.keys(config).forEach(key=>{const opt=document.createElement('option');opt.value=key;opt.textContent=key;picker.append(opt);});
function el(tag,attrs={},text=''){const n=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));n.textContent=text;return n;}
function changed(){dirty=true;status.textContent='Changes are local. Export to save them.';}
function selectSlot(){const key=picker.value,item=config[key],imageOnly=key.endsWith('.cover')||key.endsWith('.portrait');content.replaceChildren();const row=el('div',{class:'studio-slot'}),left=el('div'),title=el('h2',{},key),small=el('small',{},imageOnly?'Image cover / portrait':'Image, video or social link'),preview=el('div',{class:'studio-preview media-shell'}),form=el('div',{class:'studio-form'}),error=el('p',{class:'studio-error',role:'alert'});
left.append(title,small,preview);row.append(left,form);content.append(row);
function previewItem(){const it={...item};if(objectURLs.has(key))it.src=objectURLs.get(key);M.render(preview,it);}
function field(label,node){const l=el('label',{},label);l.append(node);form.append(l);return node;}
const type=field('Media type',el('select'));(imageOnly?['image']:['image','video','youtube','instagram']).forEach(x=>type.append(el('option',{value:x},x)));type.value=item.type;
const src=field('File path or public link',el('input',{type:'text',value:item.src||'',placeholder:'assets/media/film.mp4 or https://…'}));
const upload=field('Or select a local image / video',el('input',{type:'file',accept:imageOnly?'image/jpeg,image/png,image/webp':'image/jpeg,image/png,image/webp,video/mp4,video/webm'}));
const alt=field('Image description / video title',el('input',{type:'text',value:item.alt||''}));
const cap=field('Caption and credit',el('input',{type:'text',value:item.caption||''}));
const poster=field('Poster image path (for videos / social links)',el('input',{type:'text',value:item.poster||'',placeholder:'assets/media/drone-cover.webp'}));
const captions=field('Optional video captions path (.vtt)',el('input',{type:'text',value:item.captions||'',placeholder:'assets/media/project-captions.vtt'}));
const apply=el('button',{type:'button',class:'btn primary'},'Apply & preview ↗');form.append(apply,error);previewItem();
apply.addEventListener('click',()=>{error.textContent='';const value=src.value.trim(),ty=type.value;
if(!M.safeURL(value)){error.textContent='Use an assets/media/ path or a valid HTTPS link.';return;}
if(ty==='youtube'&&!M.youtube(value)){error.textContent='Paste a YouTube watch, Shorts, live or youtu.be video link.';return;}
if(ty==='instagram'&&!M.instagram(value)){error.textContent='Paste a public Instagram /p/ or /reel/ link.';return;}
if(!alt.value.trim()){error.textContent='Add an image description or video title.';return;}
if(poster.value&&!M.safeURL(poster.value)){error.textContent='Poster must use an assets/ path or HTTPS URL.';return;}
if(captions.value&&!M.safeURL(captions.value)){error.textContent='Captions must use an assets/ path or HTTPS URL.';return;}
if(item.src!==value&&files.get(key)?.name!==value){files.delete(key);const old=objectURLs.get(key);if(old)URL.revokeObjectURL(old);objectURLs.delete(key);}
Object.assign(item,{published:true,type:ty,src:value,alt:alt.value.trim(),caption:cap.value.trim(),poster:poster.value.trim(),captions:captions.value.trim()});changed();previewItem();});
upload.addEventListener('change',async()=>{const f=upload.files[0];if(!f)return;error.textContent='';const mime=['image/jpeg','image/png','image/webp','video/mp4','video/webm'];if(!mime.includes(f.type)||imageOnly&&!f.type.startsWith('image/')){error.textContent='Choose JPG, PNG, WebP, MP4 or WebM. Cover slots need images.';upload.value='';return;}
if(f.size>50*1024*1024){error.textContent='Choose a file under 50 MB. A short compressed clip is best.';upload.value='';return;}
const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'}[f.type],name='assets/media/'+key.replaceAll('.','-')+'-upload.'+ext;files.set(key,{name,file:f});if(objectURLs.has(key))URL.revokeObjectURL(objectURLs.get(key));objectURLs.set(key,URL.createObjectURL(f));item.published=true;item.type=f.type.startsWith('image/')?'image':'video';item.src=name;src.value=name;type.value=item.type;changed();previewItem();});
}
picker.addEventListener('change',selectSlot);selectSlot();
// Store-only ZIP with CRC-32: runs offline and has no external dependency.
const encoder=new TextEncoder(),table=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc(a){let c=0xffffffff;for(const b of a)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function u16(v,n,o){v.setUint16(o,n,true);}function u32(v,n,o){v.setUint32(o,n,true);}
function zip(entries){const parts=[],central=[];let offset=0,totalCentral=0;for(const [name,bytes] of entries){const fname=encoder.encode(name),c=crc(bytes),h=new Uint8Array(30+fname.length),v=new DataView(h.buffer);u32(v,0x04034b50,0);u16(v,20,4);u16(v,0x800,6);u32(v,c,14);u32(v,bytes.length,18);u32(v,bytes.length,22);u16(v,fname.length,26);h.set(fname,30);parts.push(h,bytes);const ch=new Uint8Array(46+fname.length),cv=new DataView(ch.buffer);u32(cv,0x02014b50,0);u16(cv,20,4);u16(cv,20,6);u16(cv,0x800,8);u32(cv,c,16);u32(cv,bytes.length,20);u32(cv,bytes.length,24);u16(cv,fname.length,28);u32(cv,offset,42);ch.set(fname,46);central.push(ch);totalCentral+=ch.length;offset+=h.length+bytes.length;}const end=new Uint8Array(22),ev=new DataView(end.buffer);u32(ev,0x06054b50,0);u16(ev,entries.length,8);u16(ev,entries.length,10);u32(ev,totalCentral,12);u32(ev,offset,16);return new Blob([...parts,...central,end],{type:'application/zip'});}
document.querySelector('#export-media').addEventListener('click',async()=>{const b=document.querySelector('#export-media');b.disabled=true;try{const entries=[['media.config.js',encoder.encode('/* Exported by the local media studio. */\nwindow.PORTFOLIO_MEDIA = '+JSON.stringify(config,null,2)+';\n')],['MEDIA-UPDATE-README.txt',encoder.encode('Unzip this pack into the website root. Replace media.config.js and merge assets/media. Commit these files to your GitHub Pages repository. This export does not publish by itself.\n')]];for(const {name,file}of files.values())entries.push([name,new Uint8Array(await file.arrayBuffer())]);const url=URL.createObjectURL(zip(entries)),a=el('a',{href:url,download:'prashant-media-update.zip'});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);dirty=false;status.textContent='Export downloaded. Unzip into the website folder, then commit to GitHub.';}catch{status.textContent='Export failed. Keep this tab open and try again.';}finally{b.disabled=false;}});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
})();

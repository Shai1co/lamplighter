(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const r of n)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&i(a)}).observe(document,{childList:!0,subtree:!0});function t(n){const r={};return n.integrity&&(r.integrity=n.integrity),n.referrerPolicy&&(r.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?r.credentials="include":n.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(n){if(n.ep)return;n.ep=!0;const r=t(n);fetch(n.href,r)}})();class Uf{handlers={};debug=!1;on(e,t){let i=this.handlers[e];return i||(i=new Set,this.handlers[e]=i),i.add(t),()=>this.off(e,t)}once(e,t){const i=n=>{this.off(e,i),t(n)};return this.on(e,i)}off(e,t){this.handlers[e]?.delete(t)}emit(e,t){this.debug&&console.debug("[pq:event]",e,t);const i=this.handlers[e];if(!(!i||i.size===0))for(const n of[...i])n(t)}clear(){this.handlers={}}}function Of(s){let e=!1;for(let t=0;t<s.length;t++){const i=s[t];if(i==='"')e=!e;else if(i==="#"&&!e)return s.slice(0,t)}return s}function Nf(s){const e=[],t=s.split(/\r?\n/);for(let i=0;i<t.length;i++){const n=Of(t[i]).trim();if(!n)continue;let r;n.startsWith("::")?r="label":n.startsWith("@")?r="directive":n.startsWith("->")?r="jump":n.startsWith(">")?r="choice":r="say",e.push({line:i+1,kind:r,raw:n})}return e}function Ff(s){const e=[],t=s.length;let i=0;for(;i<t;){for(;i<t&&/\s/.test(s[i]);)i++;if(i>=t)break;if(s[i]==='"'){i++;let n="";for(;i<t&&s[i]!=='"';)n+=s[i],i++;i++,e.push(n)}else{let n="";for(;i<t&&!/\s/.test(s[i]);)n+=s[i],i++;e.push(n)}}return e}function Bf(s){const e=[],t={};for(const i of s){const n=i.indexOf(":");n>0&&/^[A-Za-z_][A-Za-z0-9_]*$/.test(i.slice(0,n))?t[i.slice(0,n)]=i.slice(n+1):e.push(i)}return{positional:e,kv:t}}function oo(s){const e=s.match(/\{([^{}]*)\}\s*$/);if(!e||e.index===void 0)return{text:s.trim()};let t=e[1].trim();const i=t.match(/^(?:var|flag)\s*:\s*(.*)$/);i&&(t=i[1].trim());const n=s.slice(0,e.index).trim();return t?{text:n,guard:t}:{text:n}}const zf=["push","pull","pan-left","pan-right","still"],Hf=["none","rain","snow","dust","fog"],Gf=["flash","shake","dissolve","glitch"],Vf=["=","+","-","+=","-="];function lo(s){return s==="left"||s==="center"||s==="right"?s:void 0}function Ln(s){if(s===void 0)return;const e=parseFloat(s);return Number.isNaN(e)?void 0:e}function Wf(s){const e=[],t={},i=[];let n=null,r=null;const a=(d,l)=>{i.push({line:d,message:l})},o=d=>(t[d]||(t[d]=[],e.push(d)),n=d,d),c=d=>{const l=n??o("start");t[l].push(d)};for(const d of Nf(s))switch(d.kind){case"label":{r=null;const l=d.raw.slice(2).trim().split(/\s+/)[0];if(!l){a(d.line,"Label with no name");break}o(l);break}case"say":{r=null;const{text:l,guard:h}=oo(d.raw);let f=null,g=l;if(g.startsWith("|"))g=g.slice(1).trim();else{const p=g.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);p&&(f=p[1],g=p[2].trim())}const _={kind:"say",speaker:f,text:g};h&&(_.guard=h),c(_);break}case"jump":{r=null;const{text:l,guard:h}=oo(d.raw.slice(2).trim()),f=l.trim().split(/\s+/)[0];if(!f){a(d.line,"Jump with no target");break}const g={kind:"jump",target:f};h&&(g.guard=h),c(g);break}case"choice":{let l,h;d.raw.startsWith(">!")?(l="offscript",h=d.raw.slice(2)):d.raw.startsWith(">?")?(l="neutral",h=d.raw.slice(2)):(l="suggested",h=d.raw.slice(1));const{text:f,guard:g}=oo(h.trim());let _,p;const m=f.match(/^"([^"]*)"\s*->\s*(.+)$/);if(m)_=m[1],p=m[2].trim().split(/\s+/)[0];else{const y=f.match(/^(.+?)\s*->\s*(.+)$/);y&&(_=y[1].trim().replace(/^"|"$/g,""),p=y[2].trim().split(/\s+/)[0])}if(_===void 0||!p){a(d.line,`Malformed choice line: ${d.raw}`),r=null;break}const x={text:_,target:p,kind:l};g&&(x.guard=g),r?r.options.push(x):(r={kind:"choice",options:[x]},c(r));break}case"directive":{r=null;const l=qf(d.line,d.raw,a);l&&c(l);break}}const u=e[0]??"";return{order:e,labels:t,warnings:i,entry:u}}function qf(s,e,t){const i=e.match(/^@([A-Za-z][A-Za-z-]*)\s*(.*)$/);if(!i)return t(s,`Malformed directive: ${e}`),null;const n=i[1].toLowerCase(),r=i[2].trim(),a=Ff(r),{positional:o,kv:c}=Bf(a);switch(n){case"bg":{const u=o[0];if(!u)return t(s,"@bg missing background id"),null;const d={kind:"bg",id:u};return c.mood&&(d.mood=c.mood),c.transition&&(d.transition=c.transition),d}case"enter":{const u=o[0];if(!u)return t(s,"@enter missing character"),null;const d={kind:"enter",char:u},l=lo(c.from);l&&(d.from=l);const h=c.pose??o[1];return h&&(d.pose=h),d}case"exit":{const u=o[0];if(!u)return t(s,"@exit missing character"),null;const d={kind:"exit",char:u},l=lo(c.to??o[1]);return l&&(d.to=l),d}case"pose":{const u=o[0],d=o[1]??c.pose;return!u||!d?(t(s,"@pose needs a character and a pose"),null):{kind:"pose",char:u,pose:d}}case"move":{const u=o[0],d=lo(c.to??o[1]);return!u||!d?(t(s,"@move needs a character and a valid side"),null):{kind:"move",char:u,to:d}}case"weather":{const u=o[0];if(!Hf.includes(u))return t(s,`@weather unknown kind: ${o[0]??""}`),null;const d={kind:"weather",weather:u},l=Ln(c.intensity??o[1]);return l!==void 0&&(d.intensity=l),d}case"camera":{const u=o[0];if(!zf.includes(u))return t(s,`@camera unknown move: ${o[0]??""}`),null;const d={kind:"camera",move:u},l=Ln(c.zoom);l!==void 0&&(d.zoom=l);const h=Ln(c.duration);return h!==void 0&&(d.duration=h),d}case"music":{const u=o[0];if(!u)return t(s,'@music missing id (or "stop")'),null;const l={kind:"music",id:u==="stop"||u==="none"?null:u},h=Ln(c.fade??o[1]);return h!==void 0&&(l.fade=h),l}case"sfx":{const u=o[0];return u?{kind:"sfx",id:u}:(t(s,"@sfx missing id"),null)}case"ambience":{const u=o[0];if(!u)return t(s,'@ambience missing id (or "stop")'),null;const l={kind:"ambience",id:u==="stop"||u==="none"?null:u},h=Ln(c.fade??o[1]);return h!==void 0&&(l.fade=h),l}case"wait":{const u=Ln(o[0]??c.seconds);return u===void 0?(t(s,"@wait needs a number of seconds"),null):{kind:"wait",seconds:u}}case"fx":{const u=o[0];if(!Gf.includes(u))return t(s,`@fx unknown effect: ${o[0]??""}`),null;const d={kind:"fx",effect:u},l={};for(const[h,f]of Object.entries(c)){const g=Ln(f);g!==void 0&&(l[h]=g)}return Object.keys(l).length>0&&(d.params=l),d}case"set":{const u=r.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(\+=|-=|=|\+|-)\s*(.+?)\s*$/);if(!u)return t(s,`@set malformed: ${e}`),null;const d=u[1],l=u[2];if(!Vf.includes(l))return t(s,`@set unknown operator: ${l}`),null;const h=u[3].trim();let f;if(h==="true")f=!0;else if(h==="false")f=!1;else{const g=Number(h);if(Number.isNaN(g))return t(s,`@set non-numeric value: ${h}`),null;f=g}return{kind:"set",target:d,op:l,value:f}}case"chapter":{const u=a[0];if(u===void 0)return t(s,"@chapter needs a title"),null;const d={kind:"chapter",title:u};return a[1]!==void 0&&(d.subtitle=a[1]),d}default:return t(s,`Unknown directive: @${n}`),null}}function ba(s){return typeof s=="boolean"?s?1:0:typeof s=="number"&&Number.isFinite(s)?s:0}const Xf=["&&","||","==","!=",">=","<="];function Yf(s){const e=[],t=s.length;let i=0;for(;i<t;){const n=s[i];if(/\s/.test(n)||n===","){i++;continue}if(n>="0"&&n<="9"||n==="."&&i+1<t&&s[i+1]>="0"&&s[i+1]<="9"){let a=i+1;for(;a<t&&/[0-9.]/.test(s[a]);)a++;e.push({t:"num",v:parseFloat(s.slice(i,a))}),i=a;continue}if(/[A-Za-z_]/.test(n)){let a=i+1;for(;a<t&&/[A-Za-z0-9_]/.test(s[a]);)a++;e.push({t:"id",v:s.slice(i,a)}),i=a;continue}const r=s.slice(i,i+2);if(Xf.includes(r)){e.push({t:"op",v:r}),i+=2;continue}if(n==="("){e.push({t:"lp"}),i++;continue}if(n===")"){e.push({t:"rp"}),i++;continue}if("!+-*/<>".includes(n)){e.push({t:"op",v:n}),i++;continue}throw new Error(`Unexpected character '${n}' in guard`)}return e}class jf{constructor(e,t){this.toks=e,this.vars=t}i=0;evaluate(){const e=this.or();if(this.i!==this.toks.length)throw new Error("Trailing tokens in guard");return e}peek(){return this.toks[this.i]}isOp(e){const t=this.toks[this.i];return!!t&&t.t==="op"&&t.v===e}eatOp(){const e=this.toks[this.i++];return e&&e.t==="op"?e.v:""}or(){let e=this.and();for(;this.isOp("||");){this.eatOp();const t=this.and();e=e!==0||t!==0?1:0}return e}and(){let e=this.eq();for(;this.isOp("&&");){this.eatOp();const t=this.eq();e=e!==0&&t!==0?1:0}return e}eq(){let e=this.cmp();for(;this.isOp("==")||this.isOp("!=");){const t=this.eatOp(),i=this.cmp();e=t==="=="?e===i?1:0:e!==i?1:0}return e}cmp(){let e=this.add();for(;this.isOp("<")||this.isOp("<=")||this.isOp(">")||this.isOp(">=");){const t=this.eatOp(),i=this.add();e=t==="<"?e<i?1:0:t==="<="?e<=i?1:0:t===">"?e>i?1:0:e>=i?1:0}return e}add(){let e=this.mul();for(;this.isOp("+")||this.isOp("-");){const t=this.eatOp(),i=this.mul();e=t==="+"?e+i:e-i}return e}mul(){let e=this.unary();for(;this.isOp("*")||this.isOp("/");){const t=this.eatOp(),i=this.unary();e=t==="*"?e*i:i===0?0:e/i}return e}unary(){return this.isOp("!")?(this.eatOp(),this.unary()===0?1:0):this.isOp("-")?(this.eatOp(),-this.unary()):this.isOp("+")?(this.eatOp(),this.unary()):this.primary()}primary(){const e=this.peek();if(!e)throw new Error("Unexpected end of guard");if(e.t==="lp"){this.i++;const t=this.or(),i=this.peek();if(!i||i.t!=="rp")throw new Error("Missing )");return this.i++,t}if(e.t==="num")return this.i++,e.v;if(e.t==="id")return this.i++,e.v==="true"?1:e.v==="false"?0:ba(this.vars[e.v]);throw new Error("Unexpected token in guard")}}function Kf(s,e){if(!s||!s.trim())return!0;try{const t=Yf(s);return t.length===0?!0:new jf(t,e).evaluate()!==0}catch{return!1}}function Zf(s,e){const t=ba(s[e.target]);switch(e.op){case"=":s[e.target]=e.value;break;case"+":case"+=":s[e.target]=t+ba(e.value);break;case"-":case"-=":s[e.target]=t-ba(e.value);break}}const Qf=1e4;class Jf{bus;unsubscribe=[];manifest;script;storyId="";label="";cursor=0;vars={};history=[];seen=[];chapters=0;pending=null;pendingChoices=[];ended=!1;loaded=!1;constructor(e){this.bus=e,this.unsubscribe.push(e.on("input:advance",()=>this.onAdvance()),e.on("input:choose",t=>this.onChoose(t)),e.on("input:continue",()=>this.onResumeWait()),e.on("input:skip",()=>this.onResumeWait()))}load(e,t){this.manifest=e.manifest,this.script=e.script,this.storyId=e.manifest.id,this.vars={...e.manifest.vars??{},...t?.vars??{}},this.label=t?.label??e.manifest.entry??e.script.entry??"",this.cursor=t?.cursor??0,this.history=t?.history?t.history.map(i=>({...i})):[],this.seen=t?.seen?[...t.seen]:[],this.chapters=t?.chapters??0,this.pending=null,this.pendingChoices=[],this.ended=!1,this.loaded=!0}start(){this.loaded&&(this.ended=!1,this.pending=null,this.bus.emit("runtime:ready",{story:this.manifest,history:this.history.map(e=>({...e}))}),this.emitState(),this.run())}snapshot(){return{storyId:this.storyId,label:this.label,cursor:this.cursor,vars:{...this.vars},history:this.history.map(e=>({...e})),seen:[...this.seen],chapters:this.chapters}}dispose(){for(const e of this.unsubscribe)e();this.unsubscribe.length=0}run(){if(this.pending!==null||this.ended||!this.loaded)return;let e=0;for(;;){if(e++>Qf){this.failEnd("Step cap exceeded (possible infinite loop)");return}const t=this.script.labels[this.label];if(!t){this.failEnd(`Missing label: "${this.label}"`);return}if(this.seen.includes(this.label)||this.seen.push(this.label),this.cursor>=t.length){this.end();return}const i=t[this.cursor];switch(i.kind){case"bg":this.bus.emit("scene:bg",{id:i.id,mood:i.mood,transition:i.transition}),this.cursor++;break;case"enter":{const n=this.manifest.characters[i.char];this.bus.emit("char:enter",{char:i.char,from:i.from??n?.home??"center",pose:i.pose??n?.defaultPose}),this.cursor++;break}case"exit":{const n=this.manifest.characters[i.char];this.bus.emit("char:exit",{char:i.char,to:i.to??n?.home??"left"}),this.cursor++;break}case"pose":this.bus.emit("char:pose",{char:i.char,pose:i.pose}),this.cursor++;break;case"move":this.bus.emit("char:move",{char:i.char,to:i.to}),this.cursor++;break;case"weather":this.bus.emit("weather:set",{weather:i.weather,intensity:i.intensity??1}),this.cursor++;break;case"camera":this.bus.emit("camera:move",{move:i.move,zoom:i.zoom??1,duration:i.duration??2}),this.cursor++;break;case"music":this.bus.emit("audio:music",{id:i.id,fade:i.fade??1}),this.cursor++;break;case"sfx":this.bus.emit("audio:sfx",{id:i.id}),this.cursor++;break;case"ambience":this.bus.emit("audio:ambience",{id:i.id,fade:i.fade??1}),this.cursor++;break;case"fx":this.bus.emit("fx:play",{effect:i.effect,params:i.params??{}}),this.cursor++;break;case"set":Zf(this.vars,i),this.cursor++,this.emitState();break;case"jump":{if(i.guard&&!this.test(i.guard)){this.cursor++;break}if(i.target==="END"){this.end();return}this.label=i.target,this.cursor=0;break}case"say":{if(i.guard&&!this.test(i.guard)){this.cursor++;break}const n=this.resolveSpeaker(i.speaker);this.history.push({speaker:i.speaker,speakerName:n?.name,text:i.text}),this.bus.emit("char:speaking",{char:i.speaker}),this.bus.emit("ui:say",{speaker:n,text:i.text,auto:!1}),this.cursor++,this.pending="say",this.emitState();return}case"chapter":this.chapters++,this.bus.emit("ui:chapter",{title:i.title,subtitle:i.subtitle,index:this.chapters}),this.cursor++,this.pending="chapter",this.emitState();return;case"wait":this.bus.emit("wait:begin",{seconds:i.seconds}),this.cursor++,this.pending="wait";return;case"choice":{const n=[];for(const r of i.options)r.guard&&!this.test(r.guard)||n.push({target:r.target,text:r.text,kind:r.kind});if(n.length===0){this.cursor++;break}this.pendingChoices=n,this.pending="choice",this.bus.emit("ui:choices",{options:n});return}}}}onAdvance(){this.ended||(this.pending==="say"||this.pending==="chapter")&&(this.pending=null,this.run())}onResumeWait(){this.ended||this.pending==="wait"&&(this.pending=null,this.run())}onChoose(e){if(this.pending!=="choice")return;this.pending=null;const t=this.pendingChoices.find(n=>n.target===e.target)??this.pendingChoices[0];this.pendingChoices=[],t&&(this.history.push({speaker:null,text:t.text,choiceKind:t.kind}),this.emitState());const i=t?t.target:e.target;if(!i||i==="END"){this.end();return}this.label=i,this.cursor=0,this.run()}test(e){return Kf(e,this.vars)}resolveSpeaker(e){if(e===null)return null;const t=this.manifest.characters[e];return t?{key:e,name:t.name,color:t.color}:{key:e,name:e,color:this.manifest.theme.accent}}emitState(){this.bus.emit("state:changed",{state:this.snapshot()})}end(){this.ended||(this.ended=!0,this.pending=null,this.bus.emit("ui:end",{credits:this.manifest.credits}))}failEnd(e){console.warn(`[pq:runtime] ${e}`),this.end()}}const $f="_template",ep="New Story",tp="A starter you can make your own",ip="Your name here",np='This is the starter template. Copy this folder (or run `npm run new-story <id> "Title"`), then edit manifest.json and story.pq. Every field below is documented; every directive is demonstrated in story.pq. It runs immediately, even before you generate any art — missing textures fall back to tasteful procedural placeholders built from the theme colors.',sp="start",rp="title_key",ap=["New Story","","Written by you","Made with Lamplighter"],op="Replace this with a strong, specific art-director sentence. It is prepended to every asset prompt to keep your art cohesive — describe palette, lighting, rendering style, framing, and always end with: no text, no UI, no border, no watermark. Example: 'Soft painterly illustration, warm neutral palette, gentle diffuse light, shallow depth of field, consistent character identity; no text, no UI, no border, no watermark.'",lp={key:"#8aa6b8",accent:"#c8a27a",ink:"#eef1f4",paper:"#12161b",grade:{lift:[0,0,.01],gamma:[1,1,1],gain:[1,1,.98],splitTone:.2,contrast:1.04,saturation:.95},bloom:.7,vignette:.4,grain:.4},cp={guide:{name:"Guide",color:"#c8a27a",description:"Describe your character once, here, in detail: age, features, hair, wardrobe, and lighting. This description is reused across every pose so the same person is recognizable in each expression. Keep wardrobe and lighting constant; change only the expression per pose.",defaultPose:"neutral",home:"center",scale:1,poses:{neutral:{prompt:"Portrait of the Guide (restate the character description here), calm and composed, facing slightly off-camera. Soft diffuse light; shallow depth of field; painterly, chest-up portrait framing. No text, no UI, no border."},happy:{prompt:"Portrait of the Guide (restate the character description here), a warm open smile, eyes bright. Soft diffuse light; shallow depth of field; painterly, chest-up portrait framing, consistent identity. No text, no UI, no border."},sad:{prompt:"Portrait of the Guide (restate the character description here), downcast and quiet, gaze lowered. Soft diffuse light; shallow depth of field; painterly, chest-up portrait framing, consistent identity. No text, no UI, no border."}}}},hp={room:{prompt:"Describe your first location as a landscape scene with no people. Example: a quiet interior at evening, one warm lamp, soft shadows, gentle haze, painterly, shallow depth of field. No text, no UI, no border.",parallax:.05,focus:.5},outside:{prompt:"Describe your second location as a landscape scene with no people. Example: a wide exterior under an open sky, soft light, distant horizon, painterly, atmospheric depth. No text, no UI, no border.",parallax:.06,focus:.6}},up={title_key:{prompt:"Your cover / key art. One striking image that captures the mood of the whole story, with room left for a title. No people required. No text, no UI, no border, no watermark."}},dp={theme:{synth:"pad",loop:!0,volume:.5}},fp={room_tone:{synth:"hum",loop:!0,volume:.3}},pp={chime:{synth:"chime",volume:.6},click:{synth:"click",volume:.5}},mp={mood:0,trust:0},gp={id:$f,title:ep,subtitle:tp,author:ip,synopsis:np,entry:sp,cover:rp,credits:ap,artStyle:op,theme:lp,characters:cp,backgrounds:hp,cg:up,music:dp,ambience:fp,sfx:pp,vars:mp},_p="before-the-lanterns-drown",vp="Before the Lanterns Drown",xp="One last reading at high tide",yp="Lamplighter",bp="The black canal water is thirty minutes from swallowing the market stalls. A fortune teller prepares to pack her velvet cloth when the one person who abandoned her six winters ago steps out of the rising tide.",wp="scene_arrival",Sp="cover",Mp=["Before the Lanterns Drown","","A Story by Lamplighter","Made with Lamplighter"],Tp="Dark atmospheric gouache and cinematic chiaroscuro, deep jade and bruised amber palette, flooded stone textures, soft volumetric lantern glow through mist, no text, no UI, no border, no watermark.",Ap={key:"#4aa896",accent:"#e07a5f",ink:"#f4f1de",paper:"#16191d",grade:{splitTone:.6,contrast:1.08,saturation:.85},bloom:1.1,vignette:.65,grain:.3},Ep={soren:{name:"Soren",color:"#e07a5f",description:"A man in his early thirties with sharp, weathered features, damp raven hair clinging to his temples, wearing a heavy salt-stained wool coat over a faded linen shirt. Cold amber lamplight catches his sharp jaw and the faint silver scar running along his left thumb.",defaultPose:"guarded",home:"center",scale:1,poses:{guarded:{prompt:"Portrait of Soren — A man in his early thirties with sharp, weathered features, damp raven hair clinging to his temples, wearing a heavy salt-stained wool coat over a faded linen shirt. Cold amber lamplight catches his sharp jaw and the faint silver scar running along his left thumb. — Guarded, cautious expression, eyes narrowed under the brim of his drenched collar. Chest-up portrait framing, painterly, shallow depth of field, opaque dark neutral backdrop. No text, no UI, no border."},tender:{prompt:"Portrait of Soren — A man in his early thirties with sharp, weathered features, damp raven hair clinging to his temples, wearing a heavy salt-stained wool coat over a faded linen shirt. Cold amber lamplight catches his sharp jaw and the faint silver scar running along his left thumb. — Vulnerable and weary expression, eyes softened with unspoken regret. Chest-up portrait framing, painterly, shallow depth of field, opaque dark neutral backdrop. No text, no UI, no border."},wry:{prompt:"Portrait of Soren — A man in his early thirties with sharp, weathered features, damp raven hair clinging to his temples, wearing a heavy salt-stained wool coat over a faded linen shirt. Cold amber lamplight catches his sharp jaw and the faint silver scar running along his left thumb. — A faint, self-deprecating smirk touching the corner of his lips. Chest-up portrait framing, painterly, shallow depth of field, opaque dark neutral backdrop. No text, no UI, no border."},bitter:{prompt:"Portrait of Soren — A man in his early thirties with sharp, weathered features, damp raven hair clinging to his temples, wearing a heavy salt-stained wool coat over a faded linen shirt. Cold amber lamplight catches his sharp jaw and the faint silver scar running along his left thumb. — Tight jaw, defensive and pained stare, eyes fixed straight ahead. Chest-up portrait framing, painterly, shallow depth of field, opaque dark neutral backdrop. No text, no UI, no border."}}}},Cp={booth:{prompt:"A cramped wooden fortune-telling stall in a flooded night market. Dark canal water covers the wooden plank floor up to ankle height. Red silk and velvet drapes hang soaked at the edges. Submerged paper lanterns glow faintly beneath murky green water. Landscape composition, no people.",parallax:.05,focus:.55},canal:{prompt:"A narrow Venetian-style flooded canal at midnight during an extreme high tide. Decaying stone tenements flank the dark water where yellow and red lanterns float. Rain ripples across the dark reflective surface. Landscape composition, no people.",parallax:.06,focus:.5},steps:{prompt:"Wide ancient stone landing stairs rising out of surging black canal water toward dry upper bridge arches. Fog hangs thick over the submerged lowest steps. Distant amber light washes over wet granite. Landscape composition, no people.",parallax:.04,focus:.6}},Rp={cover:{prompt:"A fortune teller table half-submerged in rising green-black canal water, soaked velvet cloth, brass astrolabe and tarot cards floating adrift, illuminated by drowned amber lanterns beneath the surface. No people."}},Pp={theme_drone:{synth:"drone",loop:!0,volume:.5},theme_pad:{synth:"pad",loop:!0,volume:.45}},Lp={water_rain:{synth:"rain",loop:!0,volume:.5},canal_hum:{synth:"hum",loop:!0,volume:.35}},Dp={bell_chime:{synth:"chime",volume:.6},coin_click:{synth:"click",volume:.7},splash_tone:{synth:"tone",volume:.55}},Ip={truth:0,regret:0,composure:3},kp={id:_p,title:vp,subtitle:xp,author:yp,synopsis:bp,entry:wp,cover:Sp,credits:Mp,artStyle:Tp,theme:Ap,characters:Ep,backgrounds:Cp,cg:Rp,music:Pp,ambience:Lp,sfx:Dp,vars:Ip},Up="lumen",Op="Lumen",Np="A long night, in someone else's words",Fp="Lamplighter",Bp="You are a Lantern: a human who lends their voice to LUMEN, an AI companion for people awake through hard nights. A panel of soft light feeds you the perfect thing to say. You can read it, or you can say your own words instead — trading the machine's coherence for something a stranger might actually feel. Tonight there is one caller. Her name is Noor. This morning they demolished a building she designed, and it is 3 a.m., and dawn is a long way off.",zp="prologue",Hp="Lantern",Gp="card_cover",Vp=["Lumen","A Lamplighter story","","Written by Lamplighter","In the melancholy tradition of the late-night proxy","","For anyone who has ever answered the phone at 3 a.m.,","and for anyone who wished someone would."],Wp="Painterly semi-realistic cinematic key art in the mood of a Pacific-Northwest night. Muted teal-and-amber palette; deep blue-black shadows; a single warm practical light source; soft volumetric haze and gentle bloom; shallow depth of field; fine filmic grain. Restrained, melancholy, unhurried — the composure of an Edward Hopper night piece. Consistent character identity, wardrobe, and lighting across every frame. Absolutely no text, no lettering, no UI, no logos, no borders, no watermark.",qp={key:"#7db4c8",accent:"#e0a46b",ink:"#e8eef2",paper:"#0b1116",grade:{lift:[-.012,.008,.03],gamma:[1,.98,.95],gain:[1.03,1,.93],splitTone:.36,contrast:1.08,saturation:.9},bloom:.9,vignette:.46,grain:.5},Xp={noor:{name:"Noor",color:"#e0a46b",description:"HAND-PAINTED PORTRAIT in oils/gouache with VISIBLE CONFIDENT BRUSHSTROKES throughout — the same painted medium as a Zachtronics/Eliza character portrait or a matte painting. Explicitly NOT a photograph: no photographic skin pores, no lens artifacts; skin built from warm paint planes and soft brush economy, edges resolved by brushwork. A woman in her early forties, South Asian, warm brown skin with fine lines at the eyes; dark shoulder-length hair loosely tied back with a few threads of early silver; wearing a soft charcoal wool cardigan over a slate-blue blouse. An architect's quiet precision in how she holds herself. Lit by a single warm amber desk lamp against a cool blue-black night; shallow depth of field, painterly portrait framing from the chest up, facing slightly off-camera to the left.",defaultPose:"tired",home:"right",scale:1,poses:{neutral:{prompt:"IMPASTO SCALE RULE: paint with LARGE, BOLD, confident brushstrokes — stroke width no finer than a fingertip at canvas scale — so the painted texture stays clearly visible even when the image is displayed at HALF size. Slightly lifted midtones: her torso and hair must separate readably from a dark background (no crushed-black merging). HAND-PAINTED PORTRAIT in oils/gouache with VISIBLE CONFIDENT BRUSHSTROKES throughout — the same painted medium as a Zachtronics/Eliza character portrait or a matte painting. Explicitly NOT a photograph: no photographic skin pores, no lens artifacts; skin built from warm paint planes and soft brush economy, edges resolved by brushwork. Portrait of Noor, a South Asian woman in her early forties, dark hair loosely tied back with a few silver threads, charcoal wool cardigan over a slate-blue blouse. Composed and guarded, jaw faintly set, looking slightly off-camera to the left. Single warm amber desk lamp against a cool blue-black night; soft volumetric haze; shallow depth of field; painterly, visible brushwork, filmic grain. Chest-up portrait framing, no text, no UI, no border."},tired:{prompt:"IMPASTO SCALE RULE: paint with LARGE, BOLD, confident brushstrokes — stroke width no finer than a fingertip at canvas scale — so the painted texture stays clearly visible even when the image is displayed at HALF size. Slightly lifted midtones: her torso and hair must separate readably from a dark background (no crushed-black merging). HAND-PAINTED PORTRAIT in oils/gouache with VISIBLE CONFIDENT BRUSHSTROKES throughout — the same painted medium as a Zachtronics/Eliza character portrait or a matte painting. Explicitly NOT a photograph: no photographic skin pores, no lens artifacts; skin built from warm paint planes and soft brush economy, edges resolved by brushwork. Portrait of Noor, the same South Asian woman in her early forties, dark hair with silver threads loosely tied back, charcoal cardigan over slate-blue blouse. Weary at the end of a long night, eyes shadowed and heavy, one hand resting against her temple, gaze lowered. Single warm amber lamp against cool blue-black darkness; gentle haze; shallow depth of field; painterly, visible brushwork, filmic grain. Chest-up portrait framing, consistent identity, no text, no UI, no border."},tearful:{prompt:"IMPASTO SCALE RULE: paint with LARGE, BOLD, confident brushstrokes — stroke width no finer than a fingertip at canvas scale — so the painted texture stays clearly visible even when the image is displayed at HALF size. Slightly lifted midtones: her torso and hair must separate readably from a dark background (no crushed-black merging). HAND-PAINTED PORTRAIT in oils/gouache with VISIBLE CONFIDENT BRUSHSTROKES throughout — the same painted medium as a Zachtronics/Eliza character portrait or a matte painting. Explicitly NOT a photograph: no photographic skin pores, no lens artifacts; skin built from warm paint planes and soft brush economy, edges resolved by brushwork. Portrait of Noor, the same South Asian woman in her early forties, silver-threaded dark hair loosely tied back, charcoal cardigan over slate-blue blouse. Eyes glassed with unshed tears, chin lifted in careful composure, holding herself together. Warm amber lamp catching the wet shine of her eyes against cool blue-black night; soft haze; shallow depth of field; painterly, visible brushwork, filmic grain. Chest-up portrait framing, consistent identity, no text, no UI, no border. CRITICAL CONSISTENCY: painted dark blue-black BACKDROP INCLUDED behind her exactly like the other portraits in this set (do NOT output a transparent background, do NOT cut her out); NO earrings, NO jewelry; the SAME softly rounded, naturally weathered face in her early forties as the neutral/tired poses — not glamorous, not sharpened; tears held back at the lash line rather than streaming; brushwork over every surface including the backdrop."},"faint-smile":{prompt:"IMPASTO SCALE RULE: paint with LARGE, BOLD, confident brushstrokes — stroke width no finer than a fingertip at canvas scale — so the painted texture stays clearly visible even when the image is displayed at HALF size. Slightly lifted midtones: her torso and hair must separate readably from a dark background (no crushed-black merging). HAND-PAINTED PORTRAIT in oils/gouache with VISIBLE CONFIDENT BRUSHSTROKES throughout — the same painted medium as a Zachtronics/Eliza character portrait or a matte painting. Explicitly NOT a photograph: no photographic skin pores, no lens artifacts; skin built from warm paint planes and soft brush economy, edges resolved by brushwork. Portrait of Noor, the same South Asian woman in her early forties, silver-threaded dark hair loosely tied back, charcoal cardigan over slate-blue blouse. The smallest, tiredest smile, features softened, a little warmth returning to the eyes, a breath of relief. Warm amber lamp against a lightening blue-grey pre-dawn; gentle haze; shallow depth of field; painterly, visible brushwork, filmic grain. Chest-up portrait framing, consistent identity, no text, no UI, no border."}}}},Yp={ops_room:{prompt:"A dim overnight operations booth for an AI companion service, deep night. Left third: one tidy desk with a crisp modern task lamp (defined metal shade, warm amber pool of light) and a single slim monitor whose screen shows only a soft dim teal glow — screen mostly dark, faint and unreadable, nothing bright white anywhere; no loose paper, no blank sheets, clean desk surface with a mug and a headset. A translucent glass partition catching soft reflections; beyond it a wall of floor-to-ceiling windows with rain streaking the glass and the city blurred into teal-and-amber bokeh. A few empty chairs receding into blue-black darkness; volumetric haze. Hand-painted texture with visible brushwork in the shadows, painterly semi-realistic, shallow depth of field, filmic grain. Every object crisply drawn where lit, dissolving softly into darkness where not. MIDFIELD RULE: the middle third of the frame must stay READABLE, never crushed-black mush — the monitor throws a soft teal UI glow that spills onto the desk edge and chair back, the glass partition shows defined mullion verticals, and a faint cool bounce keeps every large region textured. No area bigger than a hand of featureless black. Landscape composition, no people, no text, no UI, no border.",parallax:.05,focus:.5},memory_atrium:{prompt:"The light-filled atrium of a small public reading room, remembered rather than seen — softly overexposed at the edges like a memory. A tall north-facing clerestory of pale oak and glass; long shafts of amber late-afternoon light falling across a warm oak floor and low shelves; dust motes suspended in the beams; utterly quiet and reverent. Muted teal shadows warmed by golden light; painterly semi-realistic, gentle bloom, shallow depth of field, dreamlike haze, filmic grain. Landscape composition, no people, no text, no UI, no border.",parallax:.06,focus:.62},window_rain:{prompt:"A city seen through a rain-streaked window at deep night. Blurred amber streetlights and teal signage bleeding through rivulets of water on dark glass; a faint reflection of a dim interior; melancholy, still, cinematic bokeh. Cool blue-black palette with warm points of light; painterly semi-realistic, shallow depth of field, soft bloom, filmic grain. Landscape composition, no people, no text, no UI, no border.",parallax:.04,focus:.72},window_dawn:{prompt:"The same city window at first light, the rain ending. A pale gold-and-grey dawn rising over wet rooftops; the glass clearing as the last droplets slide down; thin mist lifting; a quiet, cold-warm gradient of hope. Soft teal shadows giving way to first amber sun; painterly semi-realistic, gentle bloom, shallow depth of field, filmic grain. Landscape composition, no people, no text, no UI, no border.",parallax:.04,focus:.72}},jp={title_key:{prompt:"Hand-painted cinematic cover key art with visible confident brushwork, like a matte painting or gouache film still — NOT photographic, NOT glossy. A lone figure in silhouette seated at a glowing amber console desk, seen from behind and slightly off-center left, before a towering wall of rain-streaked night windows scattering the city into rough teal-and-amber bokeh dabs of paint. At the figure left hand a faint translucent panel of soft light hovers. Asymmetric composition, imperfect edges, paint texture in the sky and blacks, deep blue-black shadows, one warm practical glow, volumetric haze, restrained and melancholy. No text, no lettering, no UI, no border, no watermark."},card_cover:{prompt:"Hand-painted story-cover key art designed to be READ SMALL (as a 490px-wide card): a tight, high-clarity composition of the rain-streaked night window with the city beyond — CRISP painted skyline edges, one dominant warm amber light cluster reflected in dark water, defined window mullion at right, rain rivulets catching cyan light. Confident visible brushwork, strong value structure that survives thumbnail scale, deep blue-black + teal + one amber focal. No mush, no soft-focus blur anywhere, no figure, no text, no border."},title_backdrop:{prompt:"Hand-painted TITLE-SCREEN backdrop composed for a menu overlay, 16:9. LEFT THIRD lower: a crisp, lovingly painted desk still-life anchored by one warm articulated task lamp — mug with a specular rim, padded headset with defined earcup highlights, slim monitor showing a dim readable teal relay-queue UI glow that casts a cool secondary rim on the headset. UPPER-LEFT: calm, near-empty deep blue-black wall with subtle painted texture — negative space reserved for a logotype. RIGHT HALF: floor-to-ceiling window, rain rivulets on the glass, city beyond painted as CRISP bokeh discs and defined skyline silhouettes with one warm amber cluster low on the water. Sharp focal plane on the desk still-life; depth softness ONLY through the glass. Confident visible brushwork everywhere, deep blue-black + teal + single amber focal, filmic, no text, no UI chrome, no border, no people."}},Kp={night_theme:{synth:"pad",loop:!0,volume:.5}},Zp={room_hum:{synth:"hum",loop:!0,volume:.35},rain:{synth:"rain",loop:!0,volume:.45}},Qp={chime:{synth:"chime",volume:.6},click:{synth:"click",volume:.5}},Jp={trust:0,coherence:3},$p={id:Up,title:Op,subtitle:Np,author:Fp,synopsis:Bp,entry:zp,narrator:Hp,cover:Gp,credits:Vp,artStyle:Wp,theme:qp,characters:Xp,backgrounds:Yp,cg:jp,music:Kp,ambience:Zp,sfx:Qp,vars:Jp},em=`# =============================================================================
# story.pq — the starter script (PQScript).
#
# PQScript is line-based: one statement per line. Lines starting with '#' are
# comments. Blank lines are ignored. Unknown @directives are skipped with a
# warning, so it's safe to leave notes to yourself.
#
# Anything you reference here (backgrounds, characters, poses, music, sfx,
# ambience) must be declared in manifest.json. Missing art won't crash — the
# engine draws a tasteful procedural placeholder — so you can write and play the
# whole story before generating a single image.
#
# This template is deliberately tiny (two scenes) but demonstrates EVERY
# directive and all three choice types. Delete what you don't need.
# =============================================================================

# ':: label' declares a jump target. 'entry' in manifest.json points here.
:: start

# --- Atmosphere -------------------------------------------------------------
@bg room mood:evening              # set the background (id from manifest.backgrounds)
@weather rain intensity:0.4        # none | rain | snow | dust | fog, intensity 0..1
@music theme fade:3                # start looping music (fade in over 3s)
@ambience room_tone fade:2         # start a looping ambience bed
@camera still zoom:1.0             # push | pull | pan-left | pan-right | still

# --- Narration --------------------------------------------------------------
# A line beginning with '|' is narration (no speaker). A bare line works too,
# but the leading '|' is unambiguous — always safe, even with punctuation.
| The lamp is on. Outside, it has just begun to rain.
| This is where your story starts. Write like it matters.

# --- A character enters ------------------------------------------------------
@enter guide from:center pose:neutral    # from: left | right | center
guide: Hello. I'm the one who'll walk you through this.
guide: Change my name, my face, and everything I say — I'm only a placeholder.

# --- Expression + movement ---------------------------------------------------
@pose guide happy                  # swap expression (pose id from the character)
guide: But the machinery is real. Watch.
@move guide left                   # slide to: left | center | right
@camera push zoom:1.05 duration:4  # a slow cinematic push-in over 4 seconds

# --- A conditional line ------------------------------------------------------
# Guards in { } gate a line. Vars default to 0 / false. This one is skipped the
# first time through because 'mood' is still 0.
guide: You've been here before, haven't you? {mood>=1}

# --- Choices: the three kinds -----------------------------------------------
# A run of choice lines becomes one menu. Each has:  "text" -> target-label
#   >   suggested  (the AI/proxy's line — the 'Eliza' mechanic)
#   >!  off-script (the player's own words)
#   >?  neutral    (a plain branch, for stories without the proxy conceit)
# Guards work on choices too: add {var...} after the target.
| How do you want to answer?
> "Take the line the panel is offering you." -> path_scripted
>! "Say something of your own instead." -> path_offscript
>? "Just ask a plain question." -> path_neutral

# --- Branch A: scripted ------------------------------------------------------
:: path_scripted
@set mood += 1                     # mutate state: = + - += -=   (numbers or true/false)
guide: Safe and steady. The panel likes you.
-> scene_two                       # unconditional jump

# --- Branch B: off-script ----------------------------------------------------
:: path_offscript
@set mood += 1
@set trust += 1
@pose guide happy
guide: Off the script already. That's where the good stuff lives.
@sfx chime                         # play a one-shot sound effect
-> scene_two

# --- Branch C: neutral -------------------------------------------------------
:: path_neutral
guide: A fair question. Hold onto it.
-> scene_two

# =============================================================================
# Scene two: a chapter card, a scene change, an effect, and two endings chosen
# by a guarded jump chain (first matching guard wins).
# =============================================================================
:: scene_two
@chapter "Chapter Two" "The template continues"   # full-screen interstitial card
@fx dissolve                        # flash | shake | dissolve | glitch
@bg outside mood:night              # change location
@weather none                       # clear the rain
@ambience room_tone fade:2
@camera pan-right zoom:1.04 duration:6
| The door opens onto somewhere new.
@wait 1                             # hold for 1 second of silence

guide: This is the last beat. Where it goes depends on how you played.
@exit guide to:right                # send a character off-screen

# A guarded jump chain: the engine takes the FIRST line whose guard passes.
# Reach the warm ending by going off-script above (which raised 'trust').
-> ending_good {trust>=1}
-> ending_quiet

:: ending_good
@bg outside mood:dawn
| You said something true, and it landed. That's the whole trick.
@music stop fade:4
-> END                              # end the story (rolls credits from manifest)

:: ending_quiet
| You kept to the script. Safe, and a little further away.
@music stop fade:4
-> END
`,tm=`:: scene_arrival
@chapter "Act I" "The Silt and the Salt"
@bg booth
@weather rain intensity:0.4
@ambience water_rain fade:2
@music theme_drone fade:2
| The canal water is four inches above the floorboards now.
| It laps against the legs of your cedar table, soaking the fringe of your velvet cloth.
| Across the district, sirens whine. The district gates close at midnight.
@sfx bell_chime
| The beaded curtain rattles. Cold water splashes as someone wades inside.
@enter soren from:right pose:guarded
soren: You always were the last stall to blow out your candles.
| The wool of his coat is soaked through. He looks exactly like the night he vanished down the north sluice.
> "Ten coppers for a reading. Double after the second flood siren." -> booth_business
>! "You have nerve bringing that coat back to this table." -> booth_personal

:: booth_business
@set composure += 1
@pose soren wry
soren: Still running the ledger even when the floor is swimming.
soren: Good. I did not come here looking for mercy.
-> booth_table

:: booth_personal
@set truth += 1
@set composure -= 1
@pose soren bitter
soren: I wondered what your first words would be. That is fair enough.
soren: Six years of salt water does not wash out a bad debt.
-> booth_table

:: booth_table
@sfx coin_click
| He drops a heavy brass guilder onto the velvet cloth between you.
| It sinks slightly into the wet fabric, unpolished and nicked at the rim.
soren: Read my left hand. Tell me if I make the last ferry at the Upper Lock.
| He extends his palm over the table. The scar across his thumb is pale against cold skin.
> "A brass coin buys three minutes. Keep your fingers flat." -> reading_shallow
>! "You took this coin from my lockbox the night you left." -> reading_confront

:: reading_shallow
@set composure += 1
| You take his wrist. His pulse is fast and irregular beneath cold skin.
| Your fingers trace the deep furrow of his lifeline toward the wrist.
-> reading_lines

:: reading_confront
@set truth += 2
@set regret += 1
@set composure -= 1
@pose soren tender
soren: I did.
soren: And I spent six years making sure I never had to spend it on bread.
| His fingers do not pull away. The heat in his skin fights the draft from the doorway.
-> reading_lines

:: reading_lines
@chapter "Act II" "The Line of Travel"
@bg booth
@weather rain intensity:0.6
@ambience canal_hum fade:2
@sfx splash_tone
| Outside, another warning bell clangs from the high church tower.
| The water rises past your ankles, cold and murky.
@pose soren guarded
soren: What do you see? Do the stars care about an old thief on a sinking wharf?
> "The traveler line breaks twice. You were never meant to stay anywhere." -> reading_fate
>! "I see someone who runs the moment the tide gets too deep to walk." -> reading_blunt
>! "I see the year we lost, cut straight across your palm." -> reading_grief {truth>=1}

:: reading_fate
@set composure += 1
soren: Destiny is convenient. It absolves everyone of bad choices.
-> truth_moment

:: reading_blunt
@set truth += 1
@set composure -= 1
@pose soren bitter
soren: You think I ran because it was easy?
soren: The magistrates were burning the lower wards. If I stayed, they would have taken you with me.
-> truth_moment

:: reading_grief
@set truth += 2
@set regret += 2
@pose soren tender
soren: It never healed clean. None of it did.
soren: I remember every word you said on the dock before the whistles blew. {regret>=2}
-> truth_moment

:: truth_moment
@music stop fade:2
@music theme_pad fade:2
| A floating lantern bumps against your doorpost, its candle hissing out in the flood.
| The tide is up to your calves now. The wooden table shudders against the current.
@pose soren wry
soren: The Upper Lock ferry leaves in twenty minutes. I have two passage tokens.
| He draws a second brass token from inside his collar and sets it beside the first.
soren: One for me. One for whoever is willing to walk up the stone stairs before the weir breaks.
> "I belong to this quarter. I stay until the roof goes under." -> offer_refuse
>! "Why come back for me now, after six winters of silence?" -> offer_question

:: offer_refuse
@set composure += 1
@pose soren guarded
soren: The quarter is dead. Tomorrow this whole lane is six fathoms of silt.
soren: There is no honor in drowning for an empty room.
-> canal_wade

:: offer_question
@set truth += 1
@set regret += 1
@pose soren tender
soren: Because every city north of here was just stone and strangers.
soren: And because you told me once that if I ever came back, I owed you a reading.
-> canal_wade

:: canal_wade
@bg canal
@weather rain intensity:0.7
| You kick open the back door of the booth. Black canal water rushes in to waist level.
| The drowned lane is a river of broken timber and dim floating lamps.
| Soren wades beside you, his arm braced against the rushing swell.
> "Keep your lantern high. The current is pulling toward the grates." -> wade_careful
>! "Take my arm. The paving stones are gone underfoot." -> wade_close {truth>=2}

:: wade_careful
@set composure += 1
@pose soren guarded
soren: I have the heading. Follow the bridge pilings.
-> scene_stairs

:: wade_close
@set truth += 1
@set regret += 1
@pose soren tender
| He locks his forearm with yours, his wet wool rough against your soaked sleeve.
soren: I have you. We are nearly at the dry tiers.
-> scene_stairs

:: scene_stairs
@chapter "Act III" "The Upper Stairs"
@bg steps
@weather rain intensity:0.8
@ambience water_rain fade:2
@camera push zoom:1.05 duration:3
| Together you scramble up the moss-slick granite steps out of the surging water.
@pose soren guarded
| At the tenth landing, the water stops below your heels.
| Above you, the steam ferry whistles long and low into the fog.
| Soren turns. His hair drips into his eyes; his coat is black with canal mud.
soren: The gangway is dropping. We have one minute.
> "Take the ferry, Soren. We paid each other off tonight." -> eval_stairs_part
>! "Give me the other token. I am done reading futures in stagnant water." -> eval_stairs_stay {truth>=2}
>! "Leave the token on the wet step. Let the tide decide." -> eval_stairs_chance

:: eval_stairs_part
@set truth += 1
| You push the heavy guilder back into his wet hand.
-> ending_together {truth>=4 && regret>=2}
-> ending_separate {truth>=2}
-> ending_drowned

:: eval_stairs_stay
@set regret += 2
@set truth += 2
| You reach out and take the second token from between his cold fingers.
-> ending_together {truth>=4 && regret>=2}
-> ending_separate {truth>=2}
-> ending_drowned

:: eval_stairs_chance
@set composure += 1
| The brass coin clicks sharply against the wet granite landing.
-> ending_together {truth>=4 && regret>=2}
-> ending_separate {truth>=2}
-> ending_drowned

:: ending_together
@bg steps
@camera still
@pose soren tender
| He closes his fingers firmly over yours, warm despite the freezing rain.
soren: The northern canals are higher. The water doesn't reach the windows there.
| You step up the final granite tier together as the ferry horn cuts the fog.
| Below you, the lanterns of the old quarter slip under the black water, one by one.
-> END

:: ending_separate
@bg steps
@camera still
@pose soren wry
soren: You were always the smarter one between us.
| He touches two fingers to his temple in a quick, familiar salute.
soren: May your next table find dry ground and richer fools.
| He turns and runs up the iron gangway just as the hawsers groan and cast off.
| You stand on the high dry landing, holding your single brass coin, watching his lantern shrink into the mist.
-> END

:: ending_drowned
@bg steps
@camera still
@pose soren bitter
soren: Some things drown before the water even gets there.
| He pockets both tokens, his jaw set hard against the pouring dark.
| He does not look back as he walks past the ferry gate and disappears into the upper alleys alone.
| You look down at the dark water lapping the granite stairs, carrying the remains of your stall out to sea.
-> END
`,im=`# Lumen — a long night, in someone else's words.
#
# The player is a "Lantern": a human who lends their voice to LUMEN, an AI
# companion service. The panel of light (>) feeds you the perfect line. You can
# read it and keep the machine "coherent" — or go off-script (>!) and say your
# own words, which the machine can't model, but a person might actually feel.
#
# Vars: trust (real connection, starts 0) and coherence (how on-script you are,
# starts 3). Reading suggested lines keeps coherence. Going off-script spends a
# point of coherence for a chance at real trust. The ending you reach is decided
# by how truly you reached her, not how neatly you followed the script.

:: prologue
@bg ops_room mood:night
@weather rain intensity:0.6
@ambience room_hum fade:2
@music night_theme fade:5
@camera still zoom:1.0
| Third floor. The overnight desk. Everyone else has gone home to whatever it is they have.
| You are a Lantern. You do not give your name. You give your voice.
| The service is called LUMEN. It listens to the people who are still awake, and it tells you what to say back to them.
| A panel of soft light waits at your left hand — LUMEN's suggestions, formed before you've thought of anything yourself.
| You can read what it offers. Or you can say your own words, and watch the little coherence meter dim while it recalculates around you.
| Rain on the glass. 3:11 a.m. The board has been dark for an hour.
@sfx chime
| One line lights up. The first call of the shift. Maybe the last.
@camera push zoom:1.06 duration:6
-> scene_open

:: scene_open
@chapter "The Night Shift"
@enter noor from:right pose:tired
noor: ...Hello? Is there a person there, or is this the recording again.
| The panel offers you a line at once. It's a good line. It is always a good line.
> "You've reached LUMEN. I'm here, and I'm listening. Take all the time you need." -> open_script
>! "Not a recording. I'm right here. You can take as long as you want — there's nowhere I have to be." -> open_offscript

:: open_script
noor: Good. The recording tells you to breathe. I have been breathing for forty-two years. It has not helped tonight.
-> after_open

:: open_offscript
@set trust += 1
@set coherence -= 1
noor: ...That's a strange thing for a machine to say.
noor: But all right. All right, then.
-> after_open

:: after_open
@pose noor tired
noor: I don't do this. Call things. I want you to know that about me first.
noor: I searched it the way you'd search for a locksmith. "Someone to talk to. 24 hours." And here we are.
| Under the dryness her voice is doing a careful, deliberate thing to stay level.
noor: There was a building.
noor: On Alder Street. A reading room. Small. You wouldn't have heard of it.
noor: They took it down this morning. I watched from my car, which is a very stupid place to watch a thing like that from.
-> atrium_scene

:: atrium_scene
@weather none
@bg memory_atrium mood:remember
@camera pan-left zoom:1.09 duration:11
noor: I designed it. Twenty-one years ago. My first building that was only mine.
noor: There was a clerestory — a band of glass, high up, facing north so the light never glared. It just... arrived. All afternoon. It moved across the oak like it had somewhere to be.
noor: Children used to lie on the floor underneath it. Not reading. Just lying in the light. The librarians stopped telling them to get up.
| The panel is already lit. Reflective. Validating. Exactly, uselessly correct.
> "That sounds like a place that held real meaning for the people who used it." -> building_script
>! "You keep saying 'a building.' You've said it three times. It doesn't sound like a building to you." -> building_offscript

:: building_script
noor: Meaning. Yes. That was the word at the ribbon-cutting, too, before they knocked it flat. Everything has meaning right up until it's in the way of a train line.
| Correct, and no use to her at all. She's still holding the door shut with her whole weight.
-> after_building

:: building_offscript
@set trust += 2
@set coherence -= 1
@pose noor tearful
noor: ...
noor: No. It doesn't.
noor: My mother was dying while I drew it. Slowly. All that year. I couldn't build her a single extra day — so I built a room full of light instead, and I told myself it was for the neighborhood.
noor: She never saw it finished. She'd have complained about the parking. She'd have loved the light.
-> after_building

:: after_building
@bg window_rain mood:night
@weather rain intensity:0.5
@camera still zoom:1.02
-> deeper_gate

# Second branch point, gated on trust: she only goes further if you've reached her.
:: deeper_gate
-> deeper {trust>=2}
-> holding

:: deeper
@pose noor tired
noor: Can I tell you the embarrassing part? It isn't the building.
noor: It's that I haven't made anything since. Fifteen years of good, sensible work. Renovations. A wheelchair ramp onto a heritage post office. Nothing that was only mine.
noor: I thought the reading room could wait for me. That it would be standing there whenever I was brave again. And now the one thing I made out of grief is gravel, and I'm forty-two, and I've called a phone number to say it out loud to a machine.
| The panel wants to reassure her. To tell her it isn't too late. It's a good line. It might even be true.
> "It isn't too late. You have decades of work ahead of you. This can be a beginning." -> deeper_script
>! "You made a thing that made strangers lie down in the light. That happened. They can knock it down, but they can't unbuild that." -> deeper_offscript

:: deeper_script
noor: Maybe. People say "beginning" as though it were free. As though it costs nothing to start, when you already know exactly how it ends.
-> converge

:: deeper_offscript
@set trust += 1
@set coherence -= 1
@pose noor faint-smile
noor: ...The light. Yes.
noor: I've never been able to say that out loud without it sounding like bragging. The way you put it, it only sounds true.
-> converge

:: holding
@pose noor tired
noor: Anyway. That's the whole sad little story. A man builds a train, a woman calls a hotline. You must get a hundred of these a night.
| She's tidying herself away. You can feel the call ending before it's over.
-> converge

# If you've drifted far enough off-script, the machine can no longer keep up.
:: converge
-> lumen_strain {coherence<=0}
-> ch2

:: lumen_strain
@fx glitch intensity:0.4
| At your left hand the panel stutters. Its suggestions have gone thin — half-formed, hedging, uncertain of you. You've gone so far off the script that it can barely model what you'll do next.
| A small grey banner rises and fades: COHERENCE LOW. The service would like you back.
| You could still take its words. Or you could keep being the person she is actually talking to.
-> ch2

:: ch2
@chapter "The Hour Before Dawn"
@bg window_rain mood:night
@weather rain intensity:0.3
@ambience rain fade:3
noor: It's getting light out. Look at that. It does that whether you're ready for it or not.
@camera push zoom:1.05 duration:12
| One last line waits in the panel. The closing script. Gentle, professional, complete.
> "I'm so glad you called tonight. LUMEN is always here whenever you need us." -> final_script
>! "Go to Alder Street. Before they fence it off. Stand where the light used to land, and remember exactly where it went." -> final_offscript

:: final_script
noor: Thank you. You've been kind. Or the machine has. I honestly can't tell, and perhaps that is the whole point of you.
-> climax

:: final_offscript
@set trust += 1
@set coherence -= 1
noor: ...Stand in it. God.
noor: I could. It's twenty minutes from here. The light would be about right by the time I arrived.
-> climax

# The climax: a guarded jump chain, first match wins. Two endings.
# You reach her through sustained trust — or by abandoning the script for her
# so completely there's nothing of the machine left. Otherwise she slips away.
:: climax
-> ending_dawn {trust>=4}
-> ending_dawn {trust>=3 && coherence<=1}
-> ending_withdraw

:: ending_dawn
@bg window_dawn mood:dawn
@weather rain intensity:0.1
@camera pan-right zoom:1.03 duration:14
@ambience room_hum fade:5
@sfx chime
@pose noor faint-smile
noor: The rain's stopping.
noor: I'm going to go. Not to sleep — I won't sleep. I'm going to drive to Alder Street and stand in an empty lot like a madwoman and watch the sun come up over the hole where my light used to be.
noor: And then I think I'll go home and draw something. Small. Only mine.
noor: I don't know your name. But I know you weren't only reading to me. Thank you for that.
@weather none
@camera still zoom:1.0
| The line goes quiet. Not the flat quiet of someone hanging up on a machine — the quiet of someone who has, quite suddenly, somewhere to be.
| Outside, the first real light comes up grey-gold over the wet roofs, finds the window, and stays.
@wait 2
-> credits_end

:: ending_withdraw
@bg window_rain mood:night
@weather rain intensity:0.4
@pose noor neutral
noor: Well. Thank you. It was — it was good to say it out loud. I feel better.
| She doesn't. It's the voice people use once they've decided to be fine, so the other person is allowed to go.
noor: You've been very helpful. I'll let you get to your other calls.
| There are no other calls. You could tell her that. The panel doesn't offer it, and you find you can't reach past it in time.
noor: Goodnight, LUMEN.
@sfx click
| The line closes on the clean, soft tone the service is so proud of.
| The rain keeps on. Somewhere across the city a woman turns off a lamp, and it is still dark, and she is still awake — and you were so close to being real to her that it aches.
@camera pull zoom:1.0 duration:8
@wait 2
-> credits_end

:: credits_end
@music stop fade:6
| 5:58 a.m. The board is dark again.
| A Lantern doesn't give their name. But the light you lend is your own.
@wait 1
-> END
`,nm=""+new URL("booth-BLPysKyP.png",import.meta.url).href,sm=""+new URL("canal-Yj5ozUOf.png",import.meta.url).href,rm=""+new URL("steps-CU9WR82F.png",import.meta.url).href,am=""+new URL("cover-CpnVDmWh.png",import.meta.url).href,om=""+new URL("bitter-BKnbhbNz.png",import.meta.url).href,lm=""+new URL("guarded-CGtBZrqp.png",import.meta.url).href,cm=""+new URL("tender-C-5cnbDW.png",import.meta.url).href,hm=""+new URL("wry-BozL2Rzz.png",import.meta.url).href,um=""+new URL("memory_atrium-XnLpy1lU.png",import.meta.url).href,dm=""+new URL("ops_room-J6BHw0gH.png",import.meta.url).href,fm=""+new URL("window_dawn-xZXxlRGC.png",import.meta.url).href,pm=""+new URL("window_rain-B_-y-0lo.png",import.meta.url).href,mm=""+new URL("card_cover-CFi7QHDM.png",import.meta.url).href,gm=""+new URL("title_backdrop-BadiPTRU.png",import.meta.url).href,_m=""+new URL("title_key-EOWllD5Q.png",import.meta.url).href,vm=""+new URL("faint-smile-B8CUR1Ic.png",import.meta.url).href,xm=""+new URL("neutral-CSfmzeym.png",import.meta.url).href,ym=""+new URL("tearful-D2AMLSuj.png",import.meta.url).href,bm=""+new URL("tired-Cef-OA8e.png",import.meta.url).href,Ui=["png","jpg","jpeg","webp"],Zc=["mp3","ogg","wav"];function wm(s,e){const t={};for(const[d,l]of Object.entries(e)){const h=d.indexOf("/assets/"),f=h>=0?d.slice(h+1):d.startsWith("assets/")?d:d.replace(/^\/+/,"");t[f]=l}const i=(d,l)=>{for(const h of l){const f=t[`${d}.${h}`];if(f)return f}},n=(d,l)=>{const h=t[d];if(h)return h;if(!/\.[A-Za-z0-9]+$/.test(d))return i(d,l)},r=d=>{const l=[];for(let h=0;h<8;h++){const f=i(`${d}.${h}`,Ui);if(!f)break;l.push(f)}return l},a={};for(const[d,l]of Object.entries(s.backgrounds??{})){const h=l,f="assets/backgrounds";let g=[];if(h.files&&h.files.length)for(const _ of h.files){const p=n(`${f}/${_}`,Ui);p&&g.push(p)}else if(h.file){const _=n(`${f}/${h.file}`,Ui);_&&g.push(_)}else{const _=i(`${f}/${d}`,Ui);g=_?[_]:r(`${f}/${d}`)}a[d]={id:d,layers:g,parallax:h.parallax??.04,focus:h.focus??.5}}const o={};for(const[d,l]of Object.entries(s.characters??{})){const h=l,f={};for(const[g,_]of Object.entries(h.poses??{})){const p=_;let m;p.file&&(m=n(`assets/characters/${p.file}`,Ui)),m||(m=i(`assets/characters/${d}/${g}`,Ui)),m||(m=i(`assets/characters/${d}_${g}`,Ui)),m&&(f[g]=m)}o[d]=f}const c={};for(const[d,l]of Object.entries(s.cg??{})){const h=l;let f;h.file&&(f=n(`assets/cg/${h.file}`,Ui)),f||(f=i(`assets/cg/${d}`,Ui)),f&&(c[d]=f)}const u=d=>{const l={};for(const[h,f]of Object.entries(d??{})){const g=f;let _;g.file&&(_=n(`assets/audio/${g.file}`,Zc)),_||(_=i(`assets/audio/${h}`,Zc)),l[h]=_?{url:_,def:g}:{def:g}}return l};return{backgrounds:a,characters:o,cg:c,music:u(s.music),sfx:u(s.sfx),ambience:u(s.ambience)}}function Ou(s,e,t){return{manifest:s,script:Wf(e),assets:wm(s,t)}}function Sm(){const s=Object.assign({"/stories/_template/manifest.json":gp,"/stories/before-the-lanterns-drown/manifest.json":kp,"/stories/lumen/manifest.json":$p}),e=Object.assign({"/stories/_template/story.pq":em,"/stories/before-the-lanterns-drown/story.pq":tm,"/stories/lumen/story.pq":im}),t=Object.assign({"/stories/before-the-lanterns-drown/assets/backgrounds/booth.png":nm,"/stories/before-the-lanterns-drown/assets/backgrounds/canal.png":sm,"/stories/before-the-lanterns-drown/assets/backgrounds/steps.png":rm,"/stories/before-the-lanterns-drown/assets/cg/cover.png":am,"/stories/before-the-lanterns-drown/assets/characters/soren/bitter.png":om,"/stories/before-the-lanterns-drown/assets/characters/soren/guarded.png":lm,"/stories/before-the-lanterns-drown/assets/characters/soren/tender.png":cm,"/stories/before-the-lanterns-drown/assets/characters/soren/wry.png":hm,"/stories/lumen/assets/backgrounds/memory_atrium.png":um,"/stories/lumen/assets/backgrounds/ops_room.png":dm,"/stories/lumen/assets/backgrounds/window_dawn.png":fm,"/stories/lumen/assets/backgrounds/window_rain.png":pm,"/stories/lumen/assets/cg/card_cover.png":mm,"/stories/lumen/assets/cg/title_backdrop.png":gm,"/stories/lumen/assets/cg/title_key.png":_m,"/stories/lumen/assets/characters/noor/faint-smile.png":vm,"/stories/lumen/assets/characters/noor/neutral.png":xm,"/stories/lumen/assets/characters/noor/tearful.png":ym,"/stories/lumen/assets/characters/noor/tired.png":bm}),i=Object.assign({}),n=[];for(const[r,a]of Object.entries(s)){const o=r.match(/^\/stories\/([^/]+)\/manifest\.json$/);if(!o)continue;const c=o[1];if(c.startsWith("_"))continue;const u=e[`/stories/${c}/story.pq`];if(typeof u!="string")continue;const d=`/stories/${c}/`,l={};for(const[h,f]of Object.entries(t))h.startsWith(d)&&(l[h]=f);for(const[h,f]of Object.entries(i))h.startsWith(d)&&(l[h]=f);n.push(Ou(a,u,l))}return n.sort((r,a)=>(r.manifest.title??"").localeCompare(a.manifest.title??"")),n}const Mm=2500;function Tm(s){const e={};for(const t of s.assets)e[t.path]=`/stories/${s.id}/${t.path}?v=${t.mtime}`;return Ou(s.manifest,s.script,e)}async function Am(s){try{const e=await fetch("/api/stories",{signal:AbortSignal.timeout(s?.timeoutMs??Mm)});if(!e.ok)return[];const t=await e.json();if(t.api!=="1.0"||!Array.isArray(t.stories))return[];const i=[];for(const n of t.stories)try{i.push(Tm(n))}catch{}return i}catch{return[]}}function Em(s,e){const t=new Map;for(const n of s)t.set(n.manifest.id,n);for(const n of e)t.set(n.manifest.id,n);const i=[...t.values()];return i.sort((n,r)=>(n.manifest.title??"").localeCompare(r.manifest.title??"")),i}async function Cm(){const[s,e]=await Promise.all([Sm(),Am()]);return Em(s,e)}const cc={textSpeed:45,masterVolume:.9,musicVolume:.7,sfxVolume:.85,grain:.5,reducedMotion:!1,cinematic:!0,fullscreen:!1,autoAdvance:!1},Nr="pq.save.",co="pq.autosave",Qc="pq.settings";function Ka(){try{return typeof localStorage<"u"&&localStorage!==null}catch{return!1}}function wa(s){if(!Ka())return null;try{const e=localStorage.getItem(s);return e?JSON.parse(e):null}catch{return null}}function sl(s,e){if(Ka())try{localStorage.setItem(s,JSON.stringify(e))}catch{}}function Jc(s){if(Ka())try{localStorage.removeItem(s)}catch{}}class Rm{save(e,t){sl(Nr+e,t)}load(e){return wa(Nr+e)}remove(e){Jc(Nr+e)}list(){if(!Ka())return[];const e=[];try{for(let t=0;t<localStorage.length;t++){const i=localStorage.key(t);if(!i||!i.startsWith(Nr))continue;const n=wa(i);n&&e.push(n)}}catch{return e}return e.sort((t,i)=>t.slot-i.slot),e}autosave(e){sl(co,e)}loadAuto(){return wa(co)}clearAuto(){Jc(co)}}class Pm{load(){const e={...cc},t=wa(Qc);return Lm(e,t)}save(e){sl(Qc,e)}}function Lm(s,e){if(!e||typeof e!="object")return s;const t=e,i=(r,a)=>typeof t[r]=="number"&&Number.isFinite(t[r])?t[r]:a,n=(r,a)=>typeof t[r]=="boolean"?t[r]:a;return{textSpeed:i("textSpeed",s.textSpeed),masterVolume:i("masterVolume",s.masterVolume),musicVolume:i("musicVolume",s.musicVolume),sfxVolume:i("sfxVolume",s.sfxVolume),grain:i("grain",s.grain),reducedMotion:n("reducedMotion",s.reducedMotion),cinematic:n("cinematic",s.cinematic),fullscreen:n("fullscreen",s.fullscreen),autoAdvance:n("autoAdvance",s.autoAdvance)}}/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const hc="169",Dm=0,$c=1,Im=2,Nu=1,km=2,Hi=3,yn=0,Xt=1,Wi=2,Di=0,jn=1,ka=2,eh=3,th=4,Um=5,Wn=100,Om=101,Nm=102,Fm=103,Bm=104,zm=200,Hm=201,Gm=202,Vm=203,rl=204,al=205,Wm=206,qm=207,Xm=208,Ym=209,jm=210,Km=211,Zm=212,Qm=213,Jm=214,ol=0,ll=1,cl=2,ks=3,hl=4,ul=5,dl=6,fl=7,Fu=0,$m=1,eg=2,_n=0,Bu=1,zu=2,Hu=3,uc=4,tg=5,Gu=6,Vu=7,Wu=300,Us=301,Os=302,pl=303,ml=304,Za=306,gl=1e3,qi=1001,_l=1002,At=1003,ig=1004,Fr=1005,Dt=1006,ho=1007,dn=1008,Qi=1009,qu=1010,Xu=1011,gr=1012,dc=1013,$n=1014,Xi=1015,oi=1016,fc=1017,pc=1018,Ns=1020,Yu=35902,ju=1021,Ku=1022,Ti=1023,Zu=1024,Qu=1025,Rs=1026,Fs=1027,Ju=1028,mc=1029,$u=1030,gc=1031,_c=1033,Sa=33776,Ma=33777,Ta=33778,Aa=33779,vl=35840,xl=35841,yl=35842,bl=35843,wl=36196,Sl=37492,Ml=37496,Tl=37808,Al=37809,El=37810,Cl=37811,Rl=37812,Pl=37813,Ll=37814,Dl=37815,Il=37816,kl=37817,Ul=37818,Ol=37819,Nl=37820,Fl=37821,Ea=36492,Bl=36494,zl=36495,ed=36283,Hl=36284,Gl=36285,Vl=36286,ng=3200,td=3201,sg=0,rg=1,un="",yt="srgb",An="srgb-linear",vc="display-p3",Qa="display-p3-linear",Ua="linear",nt="srgb",Oa="rec709",Na="p3",ns=7680,ih=519,ag=512,og=513,lg=514,id=515,cg=516,hg=517,ug=518,dg=519,Wl=35044,nh="300 es",Yi=2e3,Fa=2001;class Xs{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;const i=this._listeners;return i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;const n=this._listeners[e];if(n!==void 0){const r=n.indexOf(t);r!==-1&&n.splice(r,1)}}dispatchEvent(e){if(this._listeners===void 0)return;const i=this._listeners[e.type];if(i!==void 0){e.target=this;const n=i.slice(0);for(let r=0,a=n.length;r<a;r++)n[r].call(this,e);e.target=null}}}const Pt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let sh=1234567;const ur=Math.PI/180,_r=180/Math.PI;function ji(){const s=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Pt[s&255]+Pt[s>>8&255]+Pt[s>>16&255]+Pt[s>>24&255]+"-"+Pt[e&255]+Pt[e>>8&255]+"-"+Pt[e>>16&15|64]+Pt[e>>24&255]+"-"+Pt[t&63|128]+Pt[t>>8&255]+"-"+Pt[t>>16&255]+Pt[t>>24&255]+Pt[i&255]+Pt[i>>8&255]+Pt[i>>16&255]+Pt[i>>24&255]).toLowerCase()}function Ft(s,e,t){return Math.max(e,Math.min(t,s))}function xc(s,e){return(s%e+e)%e}function fg(s,e,t,i,n){return i+(s-e)*(n-i)/(t-e)}function pg(s,e,t){return s!==e?(t-s)/(e-s):0}function dr(s,e,t){return(1-t)*s+t*e}function mg(s,e,t,i){return dr(s,e,1-Math.exp(-t*i))}function gg(s,e=1){return e-Math.abs(xc(s,e*2)-e)}function _g(s,e,t){return s<=e?0:s>=t?1:(s=(s-e)/(t-e),s*s*(3-2*s))}function vg(s,e,t){return s<=e?0:s>=t?1:(s=(s-e)/(t-e),s*s*s*(s*(s*6-15)+10))}function xg(s,e){return s+Math.floor(Math.random()*(e-s+1))}function yg(s,e){return s+Math.random()*(e-s)}function bg(s){return s*(.5-Math.random())}function wg(s){s!==void 0&&(sh=s);let e=sh+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Sg(s){return s*ur}function Mg(s){return s*_r}function Tg(s){return(s&s-1)===0&&s!==0}function Ag(s){return Math.pow(2,Math.ceil(Math.log(s)/Math.LN2))}function Eg(s){return Math.pow(2,Math.floor(Math.log(s)/Math.LN2))}function Cg(s,e,t,i,n){const r=Math.cos,a=Math.sin,o=r(t/2),c=a(t/2),u=r((e+i)/2),d=a((e+i)/2),l=r((e-i)/2),h=a((e-i)/2),f=r((i-e)/2),g=a((i-e)/2);switch(n){case"XYX":s.set(o*d,c*l,c*h,o*u);break;case"YZY":s.set(c*h,o*d,c*l,o*u);break;case"ZXZ":s.set(c*l,c*h,o*d,o*u);break;case"XZX":s.set(o*d,c*g,c*f,o*u);break;case"YXY":s.set(c*f,o*d,c*g,o*u);break;case"ZYZ":s.set(c*g,c*f,o*d,o*u);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+n)}}function Mi(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("Invalid component type.")}}function Je(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("Invalid component type.")}}const Bt={DEG2RAD:ur,RAD2DEG:_r,generateUUID:ji,clamp:Ft,euclideanModulo:xc,mapLinear:fg,inverseLerp:pg,lerp:dr,damp:mg,pingpong:gg,smoothstep:_g,smootherstep:vg,randInt:xg,randFloat:yg,randFloatSpread:bg,seededRandom:wg,degToRad:Sg,radToDeg:Mg,isPowerOfTwo:Tg,ceilPowerOfTwo:Ag,floorPowerOfTwo:Eg,setQuaternionFromProperEuler:Cg,normalize:Je,denormalize:Mi};class we{constructor(e=0,t=0){we.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,n=e.elements;return this.x=n[0]*t+n[3]*i+n[6],this.y=n[1]*t+n[4]*i+n[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Ft(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),n=Math.sin(t),r=this.x-e.x,a=this.y-e.y;return this.x=r*i-a*n+e.x,this.y=r*n+a*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Ue{constructor(e,t,i,n,r,a,o,c,u){Ue.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,n,r,a,o,c,u)}set(e,t,i,n,r,a,o,c,u){const d=this.elements;return d[0]=e,d[1]=n,d[2]=o,d[3]=t,d[4]=r,d[5]=c,d[6]=i,d[7]=a,d[8]=u,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,n=t.elements,r=this.elements,a=i[0],o=i[3],c=i[6],u=i[1],d=i[4],l=i[7],h=i[2],f=i[5],g=i[8],_=n[0],p=n[3],m=n[6],x=n[1],y=n[4],b=n[7],C=n[2],E=n[5],A=n[8];return r[0]=a*_+o*x+c*C,r[3]=a*p+o*y+c*E,r[6]=a*m+o*b+c*A,r[1]=u*_+d*x+l*C,r[4]=u*p+d*y+l*E,r[7]=u*m+d*b+l*A,r[2]=h*_+f*x+g*C,r[5]=h*p+f*y+g*E,r[8]=h*m+f*b+g*A,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],n=e[2],r=e[3],a=e[4],o=e[5],c=e[6],u=e[7],d=e[8];return t*a*d-t*o*u-i*r*d+i*o*c+n*r*u-n*a*c}invert(){const e=this.elements,t=e[0],i=e[1],n=e[2],r=e[3],a=e[4],o=e[5],c=e[6],u=e[7],d=e[8],l=d*a-o*u,h=o*c-d*r,f=u*r-a*c,g=t*l+i*h+n*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const _=1/g;return e[0]=l*_,e[1]=(n*u-d*i)*_,e[2]=(o*i-n*a)*_,e[3]=h*_,e[4]=(d*t-n*c)*_,e[5]=(n*r-o*t)*_,e[6]=f*_,e[7]=(i*c-u*t)*_,e[8]=(a*t-i*r)*_,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,n,r,a,o){const c=Math.cos(r),u=Math.sin(r);return this.set(i*c,i*u,-i*(c*a+u*o)+a+e,-n*u,n*c,-n*(-u*a+c*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(uo.makeScale(e,t)),this}rotate(e){return this.premultiply(uo.makeRotation(-e)),this}translate(e,t){return this.premultiply(uo.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,i=e.elements;for(let n=0;n<9;n++)if(t[n]!==i[n])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const uo=new Ue;function nd(s){for(let e=s.length-1;e>=0;--e)if(s[e]>=65535)return!0;return!1}function vr(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function Rg(){const s=vr("canvas");return s.style.display="block",s}const rh={};function Ca(s){s in rh||(rh[s]=!0,console.warn(s))}function Pg(s,e,t){return new Promise(function(i,n){function r(){switch(s.clientWaitSync(e,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:n();break;case s.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:i()}}setTimeout(r,t)})}function Lg(s){const e=s.elements;e[2]=.5*e[2]+.5*e[3],e[6]=.5*e[6]+.5*e[7],e[10]=.5*e[10]+.5*e[11],e[14]=.5*e[14]+.5*e[15]}function Dg(s){const e=s.elements;e[11]===-1?(e[10]=-e[10]-1,e[14]=-e[14]):(e[10]=-e[10],e[14]=-e[14]+1)}const ah=new Ue().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),oh=new Ue().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),Zs={[An]:{transfer:Ua,primaries:Oa,luminanceCoefficients:[.2126,.7152,.0722],toReference:s=>s,fromReference:s=>s},[yt]:{transfer:nt,primaries:Oa,luminanceCoefficients:[.2126,.7152,.0722],toReference:s=>s.convertSRGBToLinear(),fromReference:s=>s.convertLinearToSRGB()},[Qa]:{transfer:Ua,primaries:Na,luminanceCoefficients:[.2289,.6917,.0793],toReference:s=>s.applyMatrix3(oh),fromReference:s=>s.applyMatrix3(ah)},[vc]:{transfer:nt,primaries:Na,luminanceCoefficients:[.2289,.6917,.0793],toReference:s=>s.convertSRGBToLinear().applyMatrix3(oh),fromReference:s=>s.applyMatrix3(ah).convertLinearToSRGB()}},Ig=new Set([An,Qa]),Ye={enabled:!0,_workingColorSpace:An,get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(s){if(!Ig.has(s))throw new Error(`Unsupported working color space, "${s}".`);this._workingColorSpace=s},convert:function(s,e,t){if(this.enabled===!1||e===t||!e||!t)return s;const i=Zs[e].toReference,n=Zs[t].fromReference;return n(i(s))},fromWorkingColorSpace:function(s,e){return this.convert(s,this._workingColorSpace,e)},toWorkingColorSpace:function(s,e){return this.convert(s,e,this._workingColorSpace)},getPrimaries:function(s){return Zs[s].primaries},getTransfer:function(s){return s===un?Ua:Zs[s].transfer},getLuminanceCoefficients:function(s,e=this._workingColorSpace){return s.fromArray(Zs[e].luminanceCoefficients)}};function Ps(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function fo(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}let ss;class kg{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{ss===void 0&&(ss=vr("canvas")),ss.width=e.width,ss.height=e.height;const i=ss.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),t=ss}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=vr("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const n=i.getImageData(0,0,e.width,e.height),r=n.data;for(let a=0;a<r.length;a++)r[a]=Ps(r[a]/255)*255;return i.putImageData(n,0,0),t}else if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(Ps(t[i]/255)*255):t[i]=Ps(t[i]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let Ug=0;class sd{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Ug++}),this.uuid=ji(),this.data=e,this.dataReady=!0,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},n=this.data;if(n!==null){let r;if(Array.isArray(n)){r=[];for(let a=0,o=n.length;a<o;a++)n[a].isDataTexture?r.push(po(n[a].image)):r.push(po(n[a]))}else r=po(n);i.url=r}return t||(e.images[this.uuid]=i),i}}function po(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?kg.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let Og=0;class bt extends Xs{constructor(e=bt.DEFAULT_IMAGE,t=bt.DEFAULT_MAPPING,i=qi,n=qi,r=Dt,a=dn,o=Ti,c=Qi,u=bt.DEFAULT_ANISOTROPY,d=un){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Og++}),this.uuid=ji(),this.name="",this.source=new sd(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=n,this.magFilter=r,this.minFilter=a,this.anisotropy=u,this.format=o,this.internalFormat=null,this.type=c,this.offset=new we(0,0),this.repeat=new we(1,1),this.center=new we(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ue,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=d,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Wu)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case gl:e.x=e.x-Math.floor(e.x);break;case qi:e.x=e.x<0?0:1;break;case _l:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case gl:e.y=e.y-Math.floor(e.y);break;case qi:e.y=e.y<0?0:1;break;case _l:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}bt.DEFAULT_IMAGE=null;bt.DEFAULT_MAPPING=Wu;bt.DEFAULT_ANISOTROPY=1;class je{constructor(e=0,t=0,i=0,n=1){je.prototype.isVector4=!0,this.x=e,this.y=t,this.z=i,this.w=n}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,n){return this.x=e,this.y=t,this.z=i,this.w=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,n=this.z,r=this.w,a=e.elements;return this.x=a[0]*t+a[4]*i+a[8]*n+a[12]*r,this.y=a[1]*t+a[5]*i+a[9]*n+a[13]*r,this.z=a[2]*t+a[6]*i+a[10]*n+a[14]*r,this.w=a[3]*t+a[7]*i+a[11]*n+a[15]*r,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,n,r;const c=e.elements,u=c[0],d=c[4],l=c[8],h=c[1],f=c[5],g=c[9],_=c[2],p=c[6],m=c[10];if(Math.abs(d-h)<.01&&Math.abs(l-_)<.01&&Math.abs(g-p)<.01){if(Math.abs(d+h)<.1&&Math.abs(l+_)<.1&&Math.abs(g+p)<.1&&Math.abs(u+f+m-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const y=(u+1)/2,b=(f+1)/2,C=(m+1)/2,E=(d+h)/4,A=(l+_)/4,L=(g+p)/4;return y>b&&y>C?y<.01?(i=0,n=.707106781,r=.707106781):(i=Math.sqrt(y),n=E/i,r=A/i):b>C?b<.01?(i=.707106781,n=0,r=.707106781):(n=Math.sqrt(b),i=E/n,r=L/n):C<.01?(i=.707106781,n=.707106781,r=0):(r=Math.sqrt(C),i=A/r,n=L/r),this.set(i,n,r,t),this}let x=Math.sqrt((p-g)*(p-g)+(l-_)*(l-_)+(h-d)*(h-d));return Math.abs(x)<.001&&(x=1),this.x=(p-g)/x,this.y=(l-_)/x,this.z=(h-d)/x,this.w=Math.acos((u+f+m-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Ng extends Xs{constructor(e=1,t=1,i={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new je(0,0,e,t),this.scissorTest=!1,this.viewport=new je(0,0,e,t);const n={width:e,height:t,depth:1};i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Dt,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},i);const r=new bt(n,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.colorSpace);r.flipY=!1,r.generateMipmaps=i.generateMipmaps,r.internalFormat=i.internalFormat,this.textures=[];const a=i.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0;this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this.depthTexture=i.depthTexture,this.samples=i.samples}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let n=0,r=this.textures.length;n<r;n++)this.textures[n].image.width=e,this.textures[n].image.height=t,this.textures[n].image.depth=i;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let i=0,n=e.textures.length;i<n;i++)this.textures[i]=e.textures[i].clone(),this.textures[i].isRenderTargetTexture=!0;const t=Object.assign({},e.texture.image);return this.texture.source=new sd(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Ht extends Ng{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}}class rd extends bt{constructor(e=null,t=1,i=1,n=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:n},this.magFilter=At,this.minFilter=At,this.wrapR=qi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Fg extends bt{constructor(e=null,t=1,i=1,n=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:n},this.magFilter=At,this.minFilter=At,this.wrapR=qi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Rr{constructor(e=0,t=0,i=0,n=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=n}static slerpFlat(e,t,i,n,r,a,o){let c=i[n+0],u=i[n+1],d=i[n+2],l=i[n+3];const h=r[a+0],f=r[a+1],g=r[a+2],_=r[a+3];if(o===0){e[t+0]=c,e[t+1]=u,e[t+2]=d,e[t+3]=l;return}if(o===1){e[t+0]=h,e[t+1]=f,e[t+2]=g,e[t+3]=_;return}if(l!==_||c!==h||u!==f||d!==g){let p=1-o;const m=c*h+u*f+d*g+l*_,x=m>=0?1:-1,y=1-m*m;if(y>Number.EPSILON){const C=Math.sqrt(y),E=Math.atan2(C,m*x);p=Math.sin(p*E)/C,o=Math.sin(o*E)/C}const b=o*x;if(c=c*p+h*b,u=u*p+f*b,d=d*p+g*b,l=l*p+_*b,p===1-o){const C=1/Math.sqrt(c*c+u*u+d*d+l*l);c*=C,u*=C,d*=C,l*=C}}e[t]=c,e[t+1]=u,e[t+2]=d,e[t+3]=l}static multiplyQuaternionsFlat(e,t,i,n,r,a){const o=i[n],c=i[n+1],u=i[n+2],d=i[n+3],l=r[a],h=r[a+1],f=r[a+2],g=r[a+3];return e[t]=o*g+d*l+c*f-u*h,e[t+1]=c*g+d*h+u*l-o*f,e[t+2]=u*g+d*f+o*h-c*l,e[t+3]=d*g-o*l-c*h-u*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,n){return this._x=e,this._y=t,this._z=i,this._w=n,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const i=e._x,n=e._y,r=e._z,a=e._order,o=Math.cos,c=Math.sin,u=o(i/2),d=o(n/2),l=o(r/2),h=c(i/2),f=c(n/2),g=c(r/2);switch(a){case"XYZ":this._x=h*d*l+u*f*g,this._y=u*f*l-h*d*g,this._z=u*d*g+h*f*l,this._w=u*d*l-h*f*g;break;case"YXZ":this._x=h*d*l+u*f*g,this._y=u*f*l-h*d*g,this._z=u*d*g-h*f*l,this._w=u*d*l+h*f*g;break;case"ZXY":this._x=h*d*l-u*f*g,this._y=u*f*l+h*d*g,this._z=u*d*g+h*f*l,this._w=u*d*l-h*f*g;break;case"ZYX":this._x=h*d*l-u*f*g,this._y=u*f*l+h*d*g,this._z=u*d*g-h*f*l,this._w=u*d*l+h*f*g;break;case"YZX":this._x=h*d*l+u*f*g,this._y=u*f*l+h*d*g,this._z=u*d*g-h*f*l,this._w=u*d*l-h*f*g;break;case"XZY":this._x=h*d*l-u*f*g,this._y=u*f*l-h*d*g,this._z=u*d*g+h*f*l,this._w=u*d*l+h*f*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,n=Math.sin(i);return this._x=e.x*n,this._y=e.y*n,this._z=e.z*n,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],n=t[4],r=t[8],a=t[1],o=t[5],c=t[9],u=t[2],d=t[6],l=t[10],h=i+o+l;if(h>0){const f=.5/Math.sqrt(h+1);this._w=.25/f,this._x=(d-c)*f,this._y=(r-u)*f,this._z=(a-n)*f}else if(i>o&&i>l){const f=2*Math.sqrt(1+i-o-l);this._w=(d-c)/f,this._x=.25*f,this._y=(n+a)/f,this._z=(r+u)/f}else if(o>l){const f=2*Math.sqrt(1+o-i-l);this._w=(r-u)/f,this._x=(n+a)/f,this._y=.25*f,this._z=(c+d)/f}else{const f=2*Math.sqrt(1+l-i-o);this._w=(a-n)/f,this._x=(r+u)/f,this._y=(c+d)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<Number.EPSILON?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ft(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const n=Math.min(1,t/i);return this.slerp(e,n),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,n=e._y,r=e._z,a=e._w,o=t._x,c=t._y,u=t._z,d=t._w;return this._x=i*d+a*o+n*u-r*c,this._y=n*d+a*c+r*o-i*u,this._z=r*d+a*u+i*c-n*o,this._w=a*d-i*o-n*c-r*u,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const i=this._x,n=this._y,r=this._z,a=this._w;let o=a*e._w+i*e._x+n*e._y+r*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=a,this._x=i,this._y=n,this._z=r,this;const c=1-o*o;if(c<=Number.EPSILON){const f=1-t;return this._w=f*a+t*this._w,this._x=f*i+t*this._x,this._y=f*n+t*this._y,this._z=f*r+t*this._z,this.normalize(),this}const u=Math.sqrt(c),d=Math.atan2(u,o),l=Math.sin((1-t)*d)/u,h=Math.sin(t*d)/u;return this._w=a*l+this._w*h,this._x=i*l+this._x*h,this._y=n*l+this._y*h,this._z=r*l+this._z*h,this._onChangeCallback(),this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),n=Math.sqrt(1-i),r=Math.sqrt(i);return this.set(n*Math.sin(e),n*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class z{constructor(e=0,t=0,i=0){z.prototype.isVector3=!0,this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(lh.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(lh.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,n=this.z,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6]*n,this.y=r[1]*t+r[4]*i+r[7]*n,this.z=r[2]*t+r[5]*i+r[8]*n,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,n=this.z,r=e.elements,a=1/(r[3]*t+r[7]*i+r[11]*n+r[15]);return this.x=(r[0]*t+r[4]*i+r[8]*n+r[12])*a,this.y=(r[1]*t+r[5]*i+r[9]*n+r[13])*a,this.z=(r[2]*t+r[6]*i+r[10]*n+r[14])*a,this}applyQuaternion(e){const t=this.x,i=this.y,n=this.z,r=e.x,a=e.y,o=e.z,c=e.w,u=2*(a*n-o*i),d=2*(o*t-r*n),l=2*(r*i-a*t);return this.x=t+c*u+a*l-o*d,this.y=i+c*d+o*u-r*l,this.z=n+c*l+r*d-a*u,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,n=this.z,r=e.elements;return this.x=r[0]*t+r[4]*i+r[8]*n,this.y=r[1]*t+r[5]*i+r[9]*n,this.z=r[2]*t+r[6]*i+r[10]*n,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,n=e.y,r=e.z,a=t.x,o=t.y,c=t.z;return this.x=n*c-r*o,this.y=r*a-i*c,this.z=i*o-n*a,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return mo.copy(this).projectOnVector(e),this.sub(mo)}reflect(e){return this.sub(mo.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Ft(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,n=this.z-e.z;return t*t+i*i+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const n=Math.sin(t)*e;return this.x=n*Math.sin(i),this.y=Math.cos(t)*e,this.z=n*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),n=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=n,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const mo=new z,lh=new Rr;class Pr{constructor(e=new z(1/0,1/0,1/0),t=new z(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(bi.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(bi.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=bi.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const r=i.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,bi):bi.fromBufferAttribute(r,a),bi.applyMatrix4(e.matrixWorld),this.expandByPoint(bi);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Br.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Br.copy(i.boundingBox)),Br.applyMatrix4(e.matrixWorld),this.union(Br)}const n=e.children;for(let r=0,a=n.length;r<a;r++)this.expandByObject(n[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,bi),bi.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Qs),zr.subVectors(this.max,Qs),rs.subVectors(e.a,Qs),as.subVectors(e.b,Qs),os.subVectors(e.c,Qs),nn.subVectors(as,rs),sn.subVectors(os,as),Dn.subVectors(rs,os);let t=[0,-nn.z,nn.y,0,-sn.z,sn.y,0,-Dn.z,Dn.y,nn.z,0,-nn.x,sn.z,0,-sn.x,Dn.z,0,-Dn.x,-nn.y,nn.x,0,-sn.y,sn.x,0,-Dn.y,Dn.x,0];return!go(t,rs,as,os,zr)||(t=[1,0,0,0,1,0,0,0,1],!go(t,rs,as,os,zr))?!1:(Hr.crossVectors(nn,sn),t=[Hr.x,Hr.y,Hr.z],go(t,rs,as,os,zr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,bi).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(bi).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Oi[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Oi[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Oi[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Oi[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Oi[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Oi[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Oi[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Oi[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Oi),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}}const Oi=[new z,new z,new z,new z,new z,new z,new z,new z],bi=new z,Br=new Pr,rs=new z,as=new z,os=new z,nn=new z,sn=new z,Dn=new z,Qs=new z,zr=new z,Hr=new z,In=new z;function go(s,e,t,i,n){for(let r=0,a=s.length-3;r<=a;r+=3){In.fromArray(s,r);const o=n.x*Math.abs(In.x)+n.y*Math.abs(In.y)+n.z*Math.abs(In.z),c=e.dot(In),u=t.dot(In),d=i.dot(In);if(Math.max(-Math.max(c,u,d),Math.min(c,u,d))>o)return!1}return!0}const Bg=new Pr,Js=new z,_o=new z;class Ja{constructor(e=new z,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):Bg.setFromPoints(e).getCenter(i);let n=0;for(let r=0,a=e.length;r<a;r++)n=Math.max(n,i.distanceToSquared(e[r]));return this.radius=Math.sqrt(n),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Js.subVectors(e,this.center);const t=Js.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),n=(i-this.radius)*.5;this.center.addScaledVector(Js,n/i),this.radius+=n}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(_o.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Js.copy(e.center).add(_o)),this.expandByPoint(Js.copy(e.center).sub(_o))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}}const Ni=new z,vo=new z,Gr=new z,rn=new z,xo=new z,Vr=new z,yo=new z;class ad{constructor(e=new z,t=new z(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Ni)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Ni.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Ni.copy(this.origin).addScaledVector(this.direction,t),Ni.distanceToSquared(e))}distanceSqToSegment(e,t,i,n){vo.copy(e).add(t).multiplyScalar(.5),Gr.copy(t).sub(e).normalize(),rn.copy(this.origin).sub(vo);const r=e.distanceTo(t)*.5,a=-this.direction.dot(Gr),o=rn.dot(this.direction),c=-rn.dot(Gr),u=rn.lengthSq(),d=Math.abs(1-a*a);let l,h,f,g;if(d>0)if(l=a*c-o,h=a*o-c,g=r*d,l>=0)if(h>=-g)if(h<=g){const _=1/d;l*=_,h*=_,f=l*(l+a*h+2*o)+h*(a*l+h+2*c)+u}else h=r,l=Math.max(0,-(a*h+o)),f=-l*l+h*(h+2*c)+u;else h=-r,l=Math.max(0,-(a*h+o)),f=-l*l+h*(h+2*c)+u;else h<=-g?(l=Math.max(0,-(-a*r+o)),h=l>0?-r:Math.min(Math.max(-r,-c),r),f=-l*l+h*(h+2*c)+u):h<=g?(l=0,h=Math.min(Math.max(-r,-c),r),f=h*(h+2*c)+u):(l=Math.max(0,-(a*r+o)),h=l>0?r:Math.min(Math.max(-r,-c),r),f=-l*l+h*(h+2*c)+u);else h=a>0?-r:r,l=Math.max(0,-(a*h+o)),f=-l*l+h*(h+2*c)+u;return i&&i.copy(this.origin).addScaledVector(this.direction,l),n&&n.copy(vo).addScaledVector(Gr,h),f}intersectSphere(e,t){Ni.subVectors(e.center,this.origin);const i=Ni.dot(this.direction),n=Ni.dot(Ni)-i*i,r=e.radius*e.radius;if(n>r)return null;const a=Math.sqrt(r-n),o=i-a,c=i+a;return c<0?null:o<0?this.at(c,t):this.at(o,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,n,r,a,o,c;const u=1/this.direction.x,d=1/this.direction.y,l=1/this.direction.z,h=this.origin;return u>=0?(i=(e.min.x-h.x)*u,n=(e.max.x-h.x)*u):(i=(e.max.x-h.x)*u,n=(e.min.x-h.x)*u),d>=0?(r=(e.min.y-h.y)*d,a=(e.max.y-h.y)*d):(r=(e.max.y-h.y)*d,a=(e.min.y-h.y)*d),i>a||r>n||((r>i||isNaN(i))&&(i=r),(a<n||isNaN(n))&&(n=a),l>=0?(o=(e.min.z-h.z)*l,c=(e.max.z-h.z)*l):(o=(e.max.z-h.z)*l,c=(e.min.z-h.z)*l),i>c||o>n)||((o>i||i!==i)&&(i=o),(c<n||n!==n)&&(n=c),n<0)?null:this.at(i>=0?i:n,t)}intersectsBox(e){return this.intersectBox(e,Ni)!==null}intersectTriangle(e,t,i,n,r){xo.subVectors(t,e),Vr.subVectors(i,e),yo.crossVectors(xo,Vr);let a=this.direction.dot(yo),o;if(a>0){if(n)return null;o=1}else if(a<0)o=-1,a=-a;else return null;rn.subVectors(this.origin,e);const c=o*this.direction.dot(Vr.crossVectors(rn,Vr));if(c<0)return null;const u=o*this.direction.dot(xo.cross(rn));if(u<0||c+u>a)return null;const d=-o*rn.dot(yo);return d<0?null:this.at(d/a,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class dt{constructor(e,t,i,n,r,a,o,c,u,d,l,h,f,g,_,p){dt.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,n,r,a,o,c,u,d,l,h,f,g,_,p)}set(e,t,i,n,r,a,o,c,u,d,l,h,f,g,_,p){const m=this.elements;return m[0]=e,m[4]=t,m[8]=i,m[12]=n,m[1]=r,m[5]=a,m[9]=o,m[13]=c,m[2]=u,m[6]=d,m[10]=l,m[14]=h,m[3]=f,m[7]=g,m[11]=_,m[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new dt().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,i=e.elements,n=1/ls.setFromMatrixColumn(e,0).length(),r=1/ls.setFromMatrixColumn(e,1).length(),a=1/ls.setFromMatrixColumn(e,2).length();return t[0]=i[0]*n,t[1]=i[1]*n,t[2]=i[2]*n,t[3]=0,t[4]=i[4]*r,t[5]=i[5]*r,t[6]=i[6]*r,t[7]=0,t[8]=i[8]*a,t[9]=i[9]*a,t[10]=i[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,n=e.y,r=e.z,a=Math.cos(i),o=Math.sin(i),c=Math.cos(n),u=Math.sin(n),d=Math.cos(r),l=Math.sin(r);if(e.order==="XYZ"){const h=a*d,f=a*l,g=o*d,_=o*l;t[0]=c*d,t[4]=-c*l,t[8]=u,t[1]=f+g*u,t[5]=h-_*u,t[9]=-o*c,t[2]=_-h*u,t[6]=g+f*u,t[10]=a*c}else if(e.order==="YXZ"){const h=c*d,f=c*l,g=u*d,_=u*l;t[0]=h+_*o,t[4]=g*o-f,t[8]=a*u,t[1]=a*l,t[5]=a*d,t[9]=-o,t[2]=f*o-g,t[6]=_+h*o,t[10]=a*c}else if(e.order==="ZXY"){const h=c*d,f=c*l,g=u*d,_=u*l;t[0]=h-_*o,t[4]=-a*l,t[8]=g+f*o,t[1]=f+g*o,t[5]=a*d,t[9]=_-h*o,t[2]=-a*u,t[6]=o,t[10]=a*c}else if(e.order==="ZYX"){const h=a*d,f=a*l,g=o*d,_=o*l;t[0]=c*d,t[4]=g*u-f,t[8]=h*u+_,t[1]=c*l,t[5]=_*u+h,t[9]=f*u-g,t[2]=-u,t[6]=o*c,t[10]=a*c}else if(e.order==="YZX"){const h=a*c,f=a*u,g=o*c,_=o*u;t[0]=c*d,t[4]=_-h*l,t[8]=g*l+f,t[1]=l,t[5]=a*d,t[9]=-o*d,t[2]=-u*d,t[6]=f*l+g,t[10]=h-_*l}else if(e.order==="XZY"){const h=a*c,f=a*u,g=o*c,_=o*u;t[0]=c*d,t[4]=-l,t[8]=u*d,t[1]=h*l+_,t[5]=a*d,t[9]=f*l-g,t[2]=g*l-f,t[6]=o*d,t[10]=_*l+h}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(zg,e,Hg)}lookAt(e,t,i){const n=this.elements;return ti.subVectors(e,t),ti.lengthSq()===0&&(ti.z=1),ti.normalize(),an.crossVectors(i,ti),an.lengthSq()===0&&(Math.abs(i.z)===1?ti.x+=1e-4:ti.z+=1e-4,ti.normalize(),an.crossVectors(i,ti)),an.normalize(),Wr.crossVectors(ti,an),n[0]=an.x,n[4]=Wr.x,n[8]=ti.x,n[1]=an.y,n[5]=Wr.y,n[9]=ti.y,n[2]=an.z,n[6]=Wr.z,n[10]=ti.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,n=t.elements,r=this.elements,a=i[0],o=i[4],c=i[8],u=i[12],d=i[1],l=i[5],h=i[9],f=i[13],g=i[2],_=i[6],p=i[10],m=i[14],x=i[3],y=i[7],b=i[11],C=i[15],E=n[0],A=n[4],L=n[8],D=n[12],v=n[1],S=n[5],H=n[9],F=n[13],P=n[2],B=n[6],O=n[10],j=n[14],V=n[3],se=n[7],ee=n[11],ce=n[15];return r[0]=a*E+o*v+c*P+u*V,r[4]=a*A+o*S+c*B+u*se,r[8]=a*L+o*H+c*O+u*ee,r[12]=a*D+o*F+c*j+u*ce,r[1]=d*E+l*v+h*P+f*V,r[5]=d*A+l*S+h*B+f*se,r[9]=d*L+l*H+h*O+f*ee,r[13]=d*D+l*F+h*j+f*ce,r[2]=g*E+_*v+p*P+m*V,r[6]=g*A+_*S+p*B+m*se,r[10]=g*L+_*H+p*O+m*ee,r[14]=g*D+_*F+p*j+m*ce,r[3]=x*E+y*v+b*P+C*V,r[7]=x*A+y*S+b*B+C*se,r[11]=x*L+y*H+b*O+C*ee,r[15]=x*D+y*F+b*j+C*ce,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],n=e[8],r=e[12],a=e[1],o=e[5],c=e[9],u=e[13],d=e[2],l=e[6],h=e[10],f=e[14],g=e[3],_=e[7],p=e[11],m=e[15];return g*(+r*c*l-n*u*l-r*o*h+i*u*h+n*o*f-i*c*f)+_*(+t*c*f-t*u*h+r*a*h-n*a*f+n*u*d-r*c*d)+p*(+t*u*l-t*o*f-r*a*l+i*a*f+r*o*d-i*u*d)+m*(-n*o*d-t*c*l+t*o*h+n*a*l-i*a*h+i*c*d)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const n=this.elements;return e.isVector3?(n[12]=e.x,n[13]=e.y,n[14]=e.z):(n[12]=e,n[13]=t,n[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],n=e[2],r=e[3],a=e[4],o=e[5],c=e[6],u=e[7],d=e[8],l=e[9],h=e[10],f=e[11],g=e[12],_=e[13],p=e[14],m=e[15],x=l*p*u-_*h*u+_*c*f-o*p*f-l*c*m+o*h*m,y=g*h*u-d*p*u-g*c*f+a*p*f+d*c*m-a*h*m,b=d*_*u-g*l*u+g*o*f-a*_*f-d*o*m+a*l*m,C=g*l*c-d*_*c-g*o*h+a*_*h+d*o*p-a*l*p,E=t*x+i*y+n*b+r*C;if(E===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const A=1/E;return e[0]=x*A,e[1]=(_*h*r-l*p*r-_*n*f+i*p*f+l*n*m-i*h*m)*A,e[2]=(o*p*r-_*c*r+_*n*u-i*p*u-o*n*m+i*c*m)*A,e[3]=(l*c*r-o*h*r-l*n*u+i*h*u+o*n*f-i*c*f)*A,e[4]=y*A,e[5]=(d*p*r-g*h*r+g*n*f-t*p*f-d*n*m+t*h*m)*A,e[6]=(g*c*r-a*p*r-g*n*u+t*p*u+a*n*m-t*c*m)*A,e[7]=(a*h*r-d*c*r+d*n*u-t*h*u-a*n*f+t*c*f)*A,e[8]=b*A,e[9]=(g*l*r-d*_*r-g*i*f+t*_*f+d*i*m-t*l*m)*A,e[10]=(a*_*r-g*o*r+g*i*u-t*_*u-a*i*m+t*o*m)*A,e[11]=(d*o*r-a*l*r-d*i*u+t*l*u+a*i*f-t*o*f)*A,e[12]=C*A,e[13]=(d*_*n-g*l*n+g*i*h-t*_*h-d*i*p+t*l*p)*A,e[14]=(g*o*n-a*_*n-g*i*c+t*_*c+a*i*p-t*o*p)*A,e[15]=(a*l*n-d*o*n+d*i*c-t*l*c-a*i*h+t*o*h)*A,this}scale(e){const t=this.elements,i=e.x,n=e.y,r=e.z;return t[0]*=i,t[4]*=n,t[8]*=r,t[1]*=i,t[5]*=n,t[9]*=r,t[2]*=i,t[6]*=n,t[10]*=r,t[3]*=i,t[7]*=n,t[11]*=r,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],n=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,n))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),n=Math.sin(t),r=1-i,a=e.x,o=e.y,c=e.z,u=r*a,d=r*o;return this.set(u*a+i,u*o-n*c,u*c+n*o,0,u*o+n*c,d*o+i,d*c-n*a,0,u*c-n*o,d*c+n*a,r*c*c+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,n,r,a){return this.set(1,i,r,0,e,1,a,0,t,n,1,0,0,0,0,1),this}compose(e,t,i){const n=this.elements,r=t._x,a=t._y,o=t._z,c=t._w,u=r+r,d=a+a,l=o+o,h=r*u,f=r*d,g=r*l,_=a*d,p=a*l,m=o*l,x=c*u,y=c*d,b=c*l,C=i.x,E=i.y,A=i.z;return n[0]=(1-(_+m))*C,n[1]=(f+b)*C,n[2]=(g-y)*C,n[3]=0,n[4]=(f-b)*E,n[5]=(1-(h+m))*E,n[6]=(p+x)*E,n[7]=0,n[8]=(g+y)*A,n[9]=(p-x)*A,n[10]=(1-(h+_))*A,n[11]=0,n[12]=e.x,n[13]=e.y,n[14]=e.z,n[15]=1,this}decompose(e,t,i){const n=this.elements;let r=ls.set(n[0],n[1],n[2]).length();const a=ls.set(n[4],n[5],n[6]).length(),o=ls.set(n[8],n[9],n[10]).length();this.determinant()<0&&(r=-r),e.x=n[12],e.y=n[13],e.z=n[14],wi.copy(this);const u=1/r,d=1/a,l=1/o;return wi.elements[0]*=u,wi.elements[1]*=u,wi.elements[2]*=u,wi.elements[4]*=d,wi.elements[5]*=d,wi.elements[6]*=d,wi.elements[8]*=l,wi.elements[9]*=l,wi.elements[10]*=l,t.setFromRotationMatrix(wi),i.x=r,i.y=a,i.z=o,this}makePerspective(e,t,i,n,r,a,o=Yi){const c=this.elements,u=2*r/(t-e),d=2*r/(i-n),l=(t+e)/(t-e),h=(i+n)/(i-n);let f,g;if(o===Yi)f=-(a+r)/(a-r),g=-2*a*r/(a-r);else if(o===Fa)f=-a/(a-r),g=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=u,c[4]=0,c[8]=l,c[12]=0,c[1]=0,c[5]=d,c[9]=h,c[13]=0,c[2]=0,c[6]=0,c[10]=f,c[14]=g,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,i,n,r,a,o=Yi){const c=this.elements,u=1/(t-e),d=1/(i-n),l=1/(a-r),h=(t+e)*u,f=(i+n)*d;let g,_;if(o===Yi)g=(a+r)*l,_=-2*l;else if(o===Fa)g=r*l,_=-1*l;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=2*u,c[4]=0,c[8]=0,c[12]=-h,c[1]=0,c[5]=2*d,c[9]=0,c[13]=-f,c[2]=0,c[6]=0,c[10]=_,c[14]=-g,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let n=0;n<16;n++)if(t[n]!==i[n])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}}const ls=new z,wi=new dt,zg=new z(0,0,0),Hg=new z(1,1,1),an=new z,Wr=new z,ti=new z,ch=new dt,hh=new Rr;class Ji{constructor(e=0,t=0,i=0,n=Ji.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=n}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,n=this._order){return this._x=e,this._y=t,this._z=i,this._order=n,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const n=e.elements,r=n[0],a=n[4],o=n[8],c=n[1],u=n[5],d=n[9],l=n[2],h=n[6],f=n[10];switch(t){case"XYZ":this._y=Math.asin(Ft(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-d,f),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(h,u),this._z=0);break;case"YXZ":this._x=Math.asin(-Ft(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(c,u)):(this._y=Math.atan2(-l,r),this._z=0);break;case"ZXY":this._x=Math.asin(Ft(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(-l,f),this._z=Math.atan2(-a,u)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-Ft(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(h,f),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-a,u));break;case"YZX":this._z=Math.asin(Ft(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-d,u),this._y=Math.atan2(-l,r)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-Ft(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(h,u),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-d,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return ch.makeRotationFromQuaternion(e),this.setFromRotationMatrix(ch,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return hh.setFromEuler(this),this.setFromQuaternion(hh,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Ji.DEFAULT_ORDER="XYZ";class od{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Gg=0;const uh=new z,cs=new Rr,Fi=new dt,qr=new z,$s=new z,Vg=new z,Wg=new Rr,dh=new z(1,0,0),fh=new z(0,1,0),ph=new z(0,0,1),mh={type:"added"},qg={type:"removed"},hs={type:"childadded",child:null},bo={type:"childremoved",child:null};class Gt extends Xs{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Gg++}),this.uuid=ji(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Gt.DEFAULT_UP.clone();const e=new z,t=new Ji,i=new Rr,n=new z(1,1,1);function r(){i.setFromEuler(t,!1)}function a(){t.setFromQuaternion(i,void 0,!1)}t._onChange(r),i._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:n},modelViewMatrix:{value:new dt},normalMatrix:{value:new Ue}}),this.matrix=new dt,this.matrixWorld=new dt,this.matrixAutoUpdate=Gt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Gt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new od,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return cs.setFromAxisAngle(e,t),this.quaternion.multiply(cs),this}rotateOnWorldAxis(e,t){return cs.setFromAxisAngle(e,t),this.quaternion.premultiply(cs),this}rotateX(e){return this.rotateOnAxis(dh,e)}rotateY(e){return this.rotateOnAxis(fh,e)}rotateZ(e){return this.rotateOnAxis(ph,e)}translateOnAxis(e,t){return uh.copy(e).applyQuaternion(this.quaternion),this.position.add(uh.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(dh,e)}translateY(e){return this.translateOnAxis(fh,e)}translateZ(e){return this.translateOnAxis(ph,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Fi.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?qr.copy(e):qr.set(e,t,i);const n=this.parent;this.updateWorldMatrix(!0,!1),$s.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Fi.lookAt($s,qr,this.up):Fi.lookAt(qr,$s,this.up),this.quaternion.setFromRotationMatrix(Fi),n&&(Fi.extractRotation(n.matrixWorld),cs.setFromRotationMatrix(Fi),this.quaternion.premultiply(cs.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(mh),hs.child=e,this.dispatchEvent(hs),hs.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(qg),bo.child=e,this.dispatchEvent(bo),bo.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Fi.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Fi.multiply(e.parent.matrixWorld)),e.applyMatrix4(Fi),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(mh),hs.child=e,this.dispatchEvent(hs),hs.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,n=this.children.length;i<n;i++){const a=this.children[i].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);const n=this.children;for(let r=0,a=n.length;r<a;r++)n[r].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose($s,e,Vg),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose($s,Wg,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,n=t.length;i<n;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,n=t.length;i<n;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,n=t.length;i<n;i++)t[i].updateMatrixWorld(e)}updateWorldMatrix(e,t){const i=this.parent;if(e===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const n=this.children;for(let r=0,a=n.length;r<a;r++)n[r].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const n={};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.castShadow===!0&&(n.castShadow=!0),this.receiveShadow===!0&&(n.receiveShadow=!0),this.visible===!1&&(n.visible=!1),this.frustumCulled===!1&&(n.frustumCulled=!1),this.renderOrder!==0&&(n.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(n.userData=this.userData),n.layers=this.layers.mask,n.matrix=this.matrix.toArray(),n.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(n.matrixAutoUpdate=!1),this.isInstancedMesh&&(n.type="InstancedMesh",n.count=this.count,n.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(n.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(n.type="BatchedMesh",n.perObjectFrustumCulled=this.perObjectFrustumCulled,n.sortObjects=this.sortObjects,n.drawRanges=this._drawRanges,n.reservedRanges=this._reservedRanges,n.visibility=this._visibility,n.active=this._active,n.bounds=this._bounds.map(o=>({boxInitialized:o.boxInitialized,boxMin:o.box.min.toArray(),boxMax:o.box.max.toArray(),sphereInitialized:o.sphereInitialized,sphereRadius:o.sphere.radius,sphereCenter:o.sphere.center.toArray()})),n.maxInstanceCount=this._maxInstanceCount,n.maxVertexCount=this._maxVertexCount,n.maxIndexCount=this._maxIndexCount,n.geometryInitialized=this._geometryInitialized,n.geometryCount=this._geometryCount,n.matricesTexture=this._matricesTexture.toJSON(e),this._colorsTexture!==null&&(n.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(n.boundingSphere={center:n.boundingSphere.center.toArray(),radius:n.boundingSphere.radius}),this.boundingBox!==null&&(n.boundingBox={min:n.boundingBox.min.toArray(),max:n.boundingBox.max.toArray()}));function r(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?n.background=this.background.toJSON():this.background.isTexture&&(n.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(n.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){n.geometry=r(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const c=o.shapes;if(Array.isArray(c))for(let u=0,d=c.length;u<d;u++){const l=c[u];r(e.shapes,l)}else r(e.shapes,c)}}if(this.isSkinnedMesh&&(n.bindMode=this.bindMode,n.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),n.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let c=0,u=this.material.length;c<u;c++)o.push(r(e.materials,this.material[c]));n.material=o}else n.material=r(e.materials,this.material);if(this.children.length>0){n.children=[];for(let o=0;o<this.children.length;o++)n.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){n.animations=[];for(let o=0;o<this.animations.length;o++){const c=this.animations[o];n.animations.push(r(e.animations,c))}}if(t){const o=a(e.geometries),c=a(e.materials),u=a(e.textures),d=a(e.images),l=a(e.shapes),h=a(e.skeletons),f=a(e.animations),g=a(e.nodes);o.length>0&&(i.geometries=o),c.length>0&&(i.materials=c),u.length>0&&(i.textures=u),d.length>0&&(i.images=d),l.length>0&&(i.shapes=l),h.length>0&&(i.skeletons=h),f.length>0&&(i.animations=f),g.length>0&&(i.nodes=g)}return i.object=n,i;function a(o){const c=[];for(const u in o){const d=o[u];delete d.metadata,c.push(d)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const n=e.children[i];this.add(n.clone())}return this}}Gt.DEFAULT_UP=new z(0,1,0);Gt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Gt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const Si=new z,Bi=new z,wo=new z,zi=new z,us=new z,ds=new z,gh=new z,So=new z,Mo=new z,To=new z,Ao=new je,Eo=new je,Co=new je;class _i{constructor(e=new z,t=new z,i=new z){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,n){n.subVectors(i,t),Si.subVectors(e,t),n.cross(Si);const r=n.lengthSq();return r>0?n.multiplyScalar(1/Math.sqrt(r)):n.set(0,0,0)}static getBarycoord(e,t,i,n,r){Si.subVectors(n,t),Bi.subVectors(i,t),wo.subVectors(e,t);const a=Si.dot(Si),o=Si.dot(Bi),c=Si.dot(wo),u=Bi.dot(Bi),d=Bi.dot(wo),l=a*u-o*o;if(l===0)return r.set(0,0,0),null;const h=1/l,f=(u*c-o*d)*h,g=(a*d-o*c)*h;return r.set(1-f-g,g,f)}static containsPoint(e,t,i,n){return this.getBarycoord(e,t,i,n,zi)===null?!1:zi.x>=0&&zi.y>=0&&zi.x+zi.y<=1}static getInterpolation(e,t,i,n,r,a,o,c){return this.getBarycoord(e,t,i,n,zi)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,zi.x),c.addScaledVector(a,zi.y),c.addScaledVector(o,zi.z),c)}static getInterpolatedAttribute(e,t,i,n,r,a){return Ao.setScalar(0),Eo.setScalar(0),Co.setScalar(0),Ao.fromBufferAttribute(e,t),Eo.fromBufferAttribute(e,i),Co.fromBufferAttribute(e,n),a.setScalar(0),a.addScaledVector(Ao,r.x),a.addScaledVector(Eo,r.y),a.addScaledVector(Co,r.z),a}static isFrontFacing(e,t,i,n){return Si.subVectors(i,t),Bi.subVectors(e,t),Si.cross(Bi).dot(n)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,n){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[n]),this}setFromAttributeAndIndices(e,t,i,n){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,n),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Si.subVectors(this.c,this.b),Bi.subVectors(this.a,this.b),Si.cross(Bi).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return _i.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return _i.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,n,r){return _i.getInterpolation(e,this.a,this.b,this.c,t,i,n,r)}containsPoint(e){return _i.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return _i.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,n=this.b,r=this.c;let a,o;us.subVectors(n,i),ds.subVectors(r,i),So.subVectors(e,i);const c=us.dot(So),u=ds.dot(So);if(c<=0&&u<=0)return t.copy(i);Mo.subVectors(e,n);const d=us.dot(Mo),l=ds.dot(Mo);if(d>=0&&l<=d)return t.copy(n);const h=c*l-d*u;if(h<=0&&c>=0&&d<=0)return a=c/(c-d),t.copy(i).addScaledVector(us,a);To.subVectors(e,r);const f=us.dot(To),g=ds.dot(To);if(g>=0&&f<=g)return t.copy(r);const _=f*u-c*g;if(_<=0&&u>=0&&g<=0)return o=u/(u-g),t.copy(i).addScaledVector(ds,o);const p=d*g-f*l;if(p<=0&&l-d>=0&&f-g>=0)return gh.subVectors(r,n),o=(l-d)/(l-d+(f-g)),t.copy(n).addScaledVector(gh,o);const m=1/(p+_+h);return a=_*m,o=h*m,t.copy(i).addScaledVector(us,a).addScaledVector(ds,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const ld={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},on={h:0,s:0,l:0},Xr={h:0,s:0,l:0};function Ro(s,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?s+(e-s)*6*t:t<1/2?e:t<2/3?s+(e-s)*6*(2/3-t):s}class Pe{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){const n=e;n&&n.isColor?this.copy(n):typeof n=="number"?this.setHex(n):typeof n=="string"&&this.setStyle(n)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=yt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Ye.toWorkingColorSpace(this,t),this}setRGB(e,t,i,n=Ye.workingColorSpace){return this.r=e,this.g=t,this.b=i,Ye.toWorkingColorSpace(this,n),this}setHSL(e,t,i,n=Ye.workingColorSpace){if(e=xc(e,1),t=Ft(t,0,1),i=Ft(i,0,1),t===0)this.r=this.g=this.b=i;else{const r=i<=.5?i*(1+t):i+t-i*t,a=2*i-r;this.r=Ro(a,r,e+1/3),this.g=Ro(a,r,e),this.b=Ro(a,r,e-1/3)}return Ye.toWorkingColorSpace(this,n),this}setStyle(e,t=yt){function i(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let n;if(n=/^(\w+)\(([^\)]*)\)/.exec(e)){let r;const a=n[1],o=n[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(n=/^\#([A-Fa-f\d]+)$/.exec(e)){const r=n[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(r,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=yt){const i=ld[e.toLowerCase()];return i!==void 0?this.setHex(i,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Ps(e.r),this.g=Ps(e.g),this.b=Ps(e.b),this}copyLinearToSRGB(e){return this.r=fo(e.r),this.g=fo(e.g),this.b=fo(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=yt){return Ye.fromWorkingColorSpace(Lt.copy(this),e),Math.round(Ft(Lt.r*255,0,255))*65536+Math.round(Ft(Lt.g*255,0,255))*256+Math.round(Ft(Lt.b*255,0,255))}getHexString(e=yt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Ye.workingColorSpace){Ye.fromWorkingColorSpace(Lt.copy(this),t);const i=Lt.r,n=Lt.g,r=Lt.b,a=Math.max(i,n,r),o=Math.min(i,n,r);let c,u;const d=(o+a)/2;if(o===a)c=0,u=0;else{const l=a-o;switch(u=d<=.5?l/(a+o):l/(2-a-o),a){case i:c=(n-r)/l+(n<r?6:0);break;case n:c=(r-i)/l+2;break;case r:c=(i-n)/l+4;break}c/=6}return e.h=c,e.s=u,e.l=d,e}getRGB(e,t=Ye.workingColorSpace){return Ye.fromWorkingColorSpace(Lt.copy(this),t),e.r=Lt.r,e.g=Lt.g,e.b=Lt.b,e}getStyle(e=yt){Ye.fromWorkingColorSpace(Lt.copy(this),e);const t=Lt.r,i=Lt.g,n=Lt.b;return e!==yt?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${n.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(n*255)})`}offsetHSL(e,t,i){return this.getHSL(on),this.setHSL(on.h+e,on.s+t,on.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(on),e.getHSL(Xr);const i=dr(on.h,Xr.h,t),n=dr(on.s,Xr.s,t),r=dr(on.l,Xr.l,t);return this.setHSL(i,n,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,i=this.g,n=this.b,r=e.elements;return this.r=r[0]*t+r[3]*i+r[6]*n,this.g=r[1]*t+r[4]*i+r[7]*n,this.b=r[2]*t+r[5]*i+r[8]*n,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Lt=new Pe;Pe.NAMES=ld;let Xg=0;class Ys extends Xs{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Xg++}),this.uuid=ji(),this.name="",this.type="Material",this.blending=jn,this.side=yn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=rl,this.blendDst=al,this.blendEquation=Wn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Pe(0,0,0),this.blendAlpha=0,this.depthFunc=ks,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=ih,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=ns,this.stencilZFail=ns,this.stencilZPass=ns,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const n=this[t];if(n===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}n&&n.isColor?n.set(i):n&&n.isVector3&&i&&i.isVector3?n.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==jn&&(i.blending=this.blending),this.side!==yn&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==rl&&(i.blendSrc=this.blendSrc),this.blendDst!==al&&(i.blendDst=this.blendDst),this.blendEquation!==Wn&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==ks&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==ih&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==ns&&(i.stencilFail=this.stencilFail),this.stencilZFail!==ns&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==ns&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function n(r){const a=[];for(const o in r){const c=r[o];delete c.metadata,a.push(c)}return a}if(t){const r=n(e.textures),a=n(e.images);r.length>0&&(i.textures=r),a.length>0&&(i.images=a)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const n=t.length;i=new Array(n);for(let r=0;r!==n;++r)i[r]=t[r].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class Lr extends Ys{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Pe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Ji,this.combine=Fu,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const vt=new z,Yr=new we;class li{constructor(e,t,i=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=Wl,this.updateRanges=[],this.gpuType=Xi,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let n=0,r=this.itemSize;n<r;n++)this.array[e+n]=t.array[i+n];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)Yr.fromBufferAttribute(this,t),Yr.applyMatrix3(e),this.setXY(t,Yr.x,Yr.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)vt.fromBufferAttribute(this,t),vt.applyMatrix3(e),this.setXYZ(t,vt.x,vt.y,vt.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)vt.fromBufferAttribute(this,t),vt.applyMatrix4(e),this.setXYZ(t,vt.x,vt.y,vt.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)vt.fromBufferAttribute(this,t),vt.applyNormalMatrix(e),this.setXYZ(t,vt.x,vt.y,vt.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)vt.fromBufferAttribute(this,t),vt.transformDirection(e),this.setXYZ(t,vt.x,vt.y,vt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=Mi(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=Je(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Mi(t,this.array)),t}setX(e,t){return this.normalized&&(t=Je(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Mi(t,this.array)),t}setY(e,t){return this.normalized&&(t=Je(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Mi(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Je(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Mi(t,this.array)),t}setW(e,t){return this.normalized&&(t=Je(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=Je(t,this.array),i=Je(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,n){return e*=this.itemSize,this.normalized&&(t=Je(t,this.array),i=Je(i,this.array),n=Je(n,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=n,this}setXYZW(e,t,i,n,r){return e*=this.itemSize,this.normalized&&(t=Je(t,this.array),i=Je(i,this.array),n=Je(n,this.array),r=Je(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=n,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Wl&&(e.usage=this.usage),e}}class cd extends li{constructor(e,t,i){super(new Uint16Array(e),t,i)}}class hd extends li{constructor(e,t,i){super(new Uint32Array(e),t,i)}}class Ki extends li{constructor(e,t,i){super(new Float32Array(e),t,i)}}let Yg=0;const fi=new dt,Po=new Gt,fs=new z,ii=new Pr,er=new Pr,Mt=new z;class Ai extends Xs{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Yg++}),this.uuid=ji(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(nd(e)?hd:cd)(e,1):this.index=e,this}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const r=new Ue().getNormalMatrix(e);i.applyNormalMatrix(r),i.needsUpdate=!0}const n=this.attributes.tangent;return n!==void 0&&(n.transformDirection(e),n.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return fi.makeRotationFromQuaternion(e),this.applyMatrix4(fi),this}rotateX(e){return fi.makeRotationX(e),this.applyMatrix4(fi),this}rotateY(e){return fi.makeRotationY(e),this.applyMatrix4(fi),this}rotateZ(e){return fi.makeRotationZ(e),this.applyMatrix4(fi),this}translate(e,t,i){return fi.makeTranslation(e,t,i),this.applyMatrix4(fi),this}scale(e,t,i){return fi.makeScale(e,t,i),this.applyMatrix4(fi),this}lookAt(e){return Po.lookAt(e),Po.updateMatrix(),this.applyMatrix4(Po.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(fs).negate(),this.translate(fs.x,fs.y,fs.z),this}setFromPoints(e){const t=[];for(let i=0,n=e.length;i<n;i++){const r=e[i];t.push(r.x,r.y,r.z||0)}return this.setAttribute("position",new Ki(t,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Pr);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new z(-1/0,-1/0,-1/0),new z(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,n=t.length;i<n;i++){const r=t[i];ii.setFromBufferAttribute(r),this.morphTargetsRelative?(Mt.addVectors(this.boundingBox.min,ii.min),this.boundingBox.expandByPoint(Mt),Mt.addVectors(this.boundingBox.max,ii.max),this.boundingBox.expandByPoint(Mt)):(this.boundingBox.expandByPoint(ii.min),this.boundingBox.expandByPoint(ii.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ja);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new z,1/0);return}if(e){const i=this.boundingSphere.center;if(ii.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){const o=t[r];er.setFromBufferAttribute(o),this.morphTargetsRelative?(Mt.addVectors(ii.min,er.min),ii.expandByPoint(Mt),Mt.addVectors(ii.max,er.max),ii.expandByPoint(Mt)):(ii.expandByPoint(er.min),ii.expandByPoint(er.max))}ii.getCenter(i);let n=0;for(let r=0,a=e.count;r<a;r++)Mt.fromBufferAttribute(e,r),n=Math.max(n,i.distanceToSquared(Mt));if(t)for(let r=0,a=t.length;r<a;r++){const o=t[r],c=this.morphTargetsRelative;for(let u=0,d=o.count;u<d;u++)Mt.fromBufferAttribute(o,u),c&&(fs.fromBufferAttribute(e,u),Mt.add(fs)),n=Math.max(n,i.distanceToSquared(Mt))}this.boundingSphere.radius=Math.sqrt(n),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=t.position,n=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new li(new Float32Array(4*i.count),4));const a=this.getAttribute("tangent"),o=[],c=[];for(let L=0;L<i.count;L++)o[L]=new z,c[L]=new z;const u=new z,d=new z,l=new z,h=new we,f=new we,g=new we,_=new z,p=new z;function m(L,D,v){u.fromBufferAttribute(i,L),d.fromBufferAttribute(i,D),l.fromBufferAttribute(i,v),h.fromBufferAttribute(r,L),f.fromBufferAttribute(r,D),g.fromBufferAttribute(r,v),d.sub(u),l.sub(u),f.sub(h),g.sub(h);const S=1/(f.x*g.y-g.x*f.y);isFinite(S)&&(_.copy(d).multiplyScalar(g.y).addScaledVector(l,-f.y).multiplyScalar(S),p.copy(l).multiplyScalar(f.x).addScaledVector(d,-g.x).multiplyScalar(S),o[L].add(_),o[D].add(_),o[v].add(_),c[L].add(p),c[D].add(p),c[v].add(p))}let x=this.groups;x.length===0&&(x=[{start:0,count:e.count}]);for(let L=0,D=x.length;L<D;++L){const v=x[L],S=v.start,H=v.count;for(let F=S,P=S+H;F<P;F+=3)m(e.getX(F+0),e.getX(F+1),e.getX(F+2))}const y=new z,b=new z,C=new z,E=new z;function A(L){C.fromBufferAttribute(n,L),E.copy(C);const D=o[L];y.copy(D),y.sub(C.multiplyScalar(C.dot(D))).normalize(),b.crossVectors(E,D);const S=b.dot(c[L])<0?-1:1;a.setXYZW(L,y.x,y.y,y.z,S)}for(let L=0,D=x.length;L<D;++L){const v=x[L],S=v.start,H=v.count;for(let F=S,P=S+H;F<P;F+=3)A(e.getX(F+0)),A(e.getX(F+1)),A(e.getX(F+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new li(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let h=0,f=i.count;h<f;h++)i.setXYZ(h,0,0,0);const n=new z,r=new z,a=new z,o=new z,c=new z,u=new z,d=new z,l=new z;if(e)for(let h=0,f=e.count;h<f;h+=3){const g=e.getX(h+0),_=e.getX(h+1),p=e.getX(h+2);n.fromBufferAttribute(t,g),r.fromBufferAttribute(t,_),a.fromBufferAttribute(t,p),d.subVectors(a,r),l.subVectors(n,r),d.cross(l),o.fromBufferAttribute(i,g),c.fromBufferAttribute(i,_),u.fromBufferAttribute(i,p),o.add(d),c.add(d),u.add(d),i.setXYZ(g,o.x,o.y,o.z),i.setXYZ(_,c.x,c.y,c.z),i.setXYZ(p,u.x,u.y,u.z)}else for(let h=0,f=t.count;h<f;h+=3)n.fromBufferAttribute(t,h+0),r.fromBufferAttribute(t,h+1),a.fromBufferAttribute(t,h+2),d.subVectors(a,r),l.subVectors(n,r),d.cross(l),i.setXYZ(h+0,d.x,d.y,d.z),i.setXYZ(h+1,d.x,d.y,d.z),i.setXYZ(h+2,d.x,d.y,d.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)Mt.fromBufferAttribute(e,t),Mt.normalize(),e.setXYZ(t,Mt.x,Mt.y,Mt.z)}toNonIndexed(){function e(o,c){const u=o.array,d=o.itemSize,l=o.normalized,h=new u.constructor(c.length*d);let f=0,g=0;for(let _=0,p=c.length;_<p;_++){o.isInterleavedBufferAttribute?f=c[_]*o.data.stride+o.offset:f=c[_]*d;for(let m=0;m<d;m++)h[g++]=u[f++]}return new li(h,d,l)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Ai,i=this.index.array,n=this.attributes;for(const o in n){const c=n[o],u=e(c,i);t.setAttribute(o,u)}const r=this.morphAttributes;for(const o in r){const c=[],u=r[o];for(let d=0,l=u.length;d<l;d++){const h=u[d],f=e(h,i);c.push(f)}t.morphAttributes[o]=c}t.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,c=a.length;o<c;o++){const u=a[o];t.addGroup(u.start,u.count,u.materialIndex)}return t}toJSON(){const e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const u in c)c[u]!==void 0&&(e[u]=c[u]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const c in i){const u=i[c];e.data.attributes[c]=u.toJSON(e.data)}const n={};let r=!1;for(const c in this.morphAttributes){const u=this.morphAttributes[c],d=[];for(let l=0,h=u.length;l<h;l++){const f=u[l];d.push(f.toJSON(e.data))}d.length>0&&(n[c]=d,r=!0)}r&&(e.data.morphAttributes=n,e.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone(t));const n=e.attributes;for(const u in n){const d=n[u];this.setAttribute(u,d.clone(t))}const r=e.morphAttributes;for(const u in r){const d=[],l=r[u];for(let h=0,f=l.length;h<f;h++)d.push(l[h].clone(t));this.morphAttributes[u]=d}this.morphTargetsRelative=e.morphTargetsRelative;const a=e.groups;for(let u=0,d=a.length;u<d;u++){const l=a[u];this.addGroup(l.start,l.count,l.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const _h=new dt,kn=new ad,jr=new Ja,vh=new z,Kr=new z,Zr=new z,Qr=new z,Lo=new z,Jr=new z,xh=new z,$r=new z;class zt extends Gt{constructor(e=new Ai,t=new Lr){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const n=t[i[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=n.length;r<a;r++){const o=n[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(e,t){const i=this.geometry,n=i.attributes.position,r=i.morphAttributes.position,a=i.morphTargetsRelative;t.fromBufferAttribute(n,e);const o=this.morphTargetInfluences;if(r&&o){Jr.set(0,0,0);for(let c=0,u=r.length;c<u;c++){const d=o[c],l=r[c];d!==0&&(Lo.fromBufferAttribute(l,e),a?Jr.addScaledVector(Lo,d):Jr.addScaledVector(Lo.sub(t),d))}t.add(Jr)}return t}raycast(e,t){const i=this.geometry,n=this.material,r=this.matrixWorld;n!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),jr.copy(i.boundingSphere),jr.applyMatrix4(r),kn.copy(e.ray).recast(e.near),!(jr.containsPoint(kn.origin)===!1&&(kn.intersectSphere(jr,vh)===null||kn.origin.distanceToSquared(vh)>(e.far-e.near)**2))&&(_h.copy(r).invert(),kn.copy(e.ray).applyMatrix4(_h),!(i.boundingBox!==null&&kn.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,kn)))}_computeIntersections(e,t,i){let n;const r=this.geometry,a=this.material,o=r.index,c=r.attributes.position,u=r.attributes.uv,d=r.attributes.uv1,l=r.attributes.normal,h=r.groups,f=r.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,_=h.length;g<_;g++){const p=h[g],m=a[p.materialIndex],x=Math.max(p.start,f.start),y=Math.min(o.count,Math.min(p.start+p.count,f.start+f.count));for(let b=x,C=y;b<C;b+=3){const E=o.getX(b),A=o.getX(b+1),L=o.getX(b+2);n=ea(this,m,e,i,u,d,l,E,A,L),n&&(n.faceIndex=Math.floor(b/3),n.face.materialIndex=p.materialIndex,t.push(n))}}else{const g=Math.max(0,f.start),_=Math.min(o.count,f.start+f.count);for(let p=g,m=_;p<m;p+=3){const x=o.getX(p),y=o.getX(p+1),b=o.getX(p+2);n=ea(this,a,e,i,u,d,l,x,y,b),n&&(n.faceIndex=Math.floor(p/3),t.push(n))}}else if(c!==void 0)if(Array.isArray(a))for(let g=0,_=h.length;g<_;g++){const p=h[g],m=a[p.materialIndex],x=Math.max(p.start,f.start),y=Math.min(c.count,Math.min(p.start+p.count,f.start+f.count));for(let b=x,C=y;b<C;b+=3){const E=b,A=b+1,L=b+2;n=ea(this,m,e,i,u,d,l,E,A,L),n&&(n.faceIndex=Math.floor(b/3),n.face.materialIndex=p.materialIndex,t.push(n))}}else{const g=Math.max(0,f.start),_=Math.min(c.count,f.start+f.count);for(let p=g,m=_;p<m;p+=3){const x=p,y=p+1,b=p+2;n=ea(this,a,e,i,u,d,l,x,y,b),n&&(n.faceIndex=Math.floor(p/3),t.push(n))}}}}function jg(s,e,t,i,n,r,a,o){let c;if(e.side===Xt?c=i.intersectTriangle(a,r,n,!0,o):c=i.intersectTriangle(n,r,a,e.side===yn,o),c===null)return null;$r.copy(o),$r.applyMatrix4(s.matrixWorld);const u=t.ray.origin.distanceTo($r);return u<t.near||u>t.far?null:{distance:u,point:$r.clone(),object:s}}function ea(s,e,t,i,n,r,a,o,c,u){s.getVertexPosition(o,Kr),s.getVertexPosition(c,Zr),s.getVertexPosition(u,Qr);const d=jg(s,e,t,i,Kr,Zr,Qr,xh);if(d){const l=new z;_i.getBarycoord(xh,Kr,Zr,Qr,l),n&&(d.uv=_i.getInterpolatedAttribute(n,o,c,u,l,new we)),r&&(d.uv1=_i.getInterpolatedAttribute(r,o,c,u,l,new we)),a&&(d.normal=_i.getInterpolatedAttribute(a,o,c,u,l,new z),d.normal.dot(i.direction)>0&&d.normal.multiplyScalar(-1));const h={a:o,b:c,c:u,normal:new z,materialIndex:0};_i.getNormal(Kr,Zr,Qr,h.normal),d.face=h,d.barycoord=l}return d}class Dr extends Ai{constructor(e=1,t=1,i=1,n=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:n,heightSegments:r,depthSegments:a};const o=this;n=Math.floor(n),r=Math.floor(r),a=Math.floor(a);const c=[],u=[],d=[],l=[];let h=0,f=0;g("z","y","x",-1,-1,i,t,e,a,r,0),g("z","y","x",1,-1,i,t,-e,a,r,1),g("x","z","y",1,1,e,i,t,n,a,2),g("x","z","y",1,-1,e,i,-t,n,a,3),g("x","y","z",1,-1,e,t,i,n,r,4),g("x","y","z",-1,-1,e,t,-i,n,r,5),this.setIndex(c),this.setAttribute("position",new Ki(u,3)),this.setAttribute("normal",new Ki(d,3)),this.setAttribute("uv",new Ki(l,2));function g(_,p,m,x,y,b,C,E,A,L,D){const v=b/A,S=C/L,H=b/2,F=C/2,P=E/2,B=A+1,O=L+1;let j=0,V=0;const se=new z;for(let ee=0;ee<O;ee++){const ce=ee*S-F;for(let Ie=0;Ie<B;Ie++){const Oe=Ie*v-H;se[_]=Oe*x,se[p]=ce*y,se[m]=P,u.push(se.x,se.y,se.z),se[_]=0,se[p]=0,se[m]=E>0?1:-1,d.push(se.x,se.y,se.z),l.push(Ie/A),l.push(1-ee/L),j+=1}}for(let ee=0;ee<L;ee++)for(let ce=0;ce<A;ce++){const Ie=h+ce+B*ee,Oe=h+ce+B*(ee+1),Y=h+(ce+1)+B*(ee+1),J=h+(ce+1)+B*ee;c.push(Ie,Oe,J),c.push(Oe,Y,J),V+=6}o.addGroup(f,V,D),f+=V,h+=j}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Dr(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function Bs(s){const e={};for(const t in s){e[t]={};for(const i in s[t]){const n=s[t][i];n&&(n.isColor||n.isMatrix3||n.isMatrix4||n.isVector2||n.isVector3||n.isVector4||n.isTexture||n.isQuaternion)?n.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=n.clone():Array.isArray(n)?e[t][i]=n.slice():e[t][i]=n}}return e}function Nt(s){const e={};for(let t=0;t<s.length;t++){const i=Bs(s[t]);for(const n in i)e[n]=i[n]}return e}function Kg(s){const e=[];for(let t=0;t<s.length;t++)e.push(s[t].clone());return e}function ud(s){const e=s.getRenderTarget();return e===null?s.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Ye.workingColorSpace}const Zi={clone:Bs,merge:Nt};var Zg=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Qg=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class gt extends Ys{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Zg,this.fragmentShader=Qg,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Bs(e.uniforms),this.uniformsGroups=Kg(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const n in this.uniforms){const a=this.uniforms[n].value;a&&a.isTexture?t.uniforms[n]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[n]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[n]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[n]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[n]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[n]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[n]={type:"m4",value:a.toArray()}:t.uniforms[n]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const i={};for(const n in this.extensions)this.extensions[n]===!0&&(i[n]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}}class dd extends Gt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new dt,this.projectionMatrix=new dt,this.projectionMatrixInverse=new dt,this.coordinateSystem=Yi}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const ln=new z,yh=new we,bh=new we;class gi extends dd{constructor(e=50,t=1,i=.1,n=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=n,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=_r*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(ur*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return _r*2*Math.atan(Math.tan(ur*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){ln.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(ln.x,ln.y).multiplyScalar(-e/ln.z),ln.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(ln.x,ln.y).multiplyScalar(-e/ln.z)}getViewSize(e,t){return this.getViewBounds(e,yh,bh),t.subVectors(bh,yh)}setViewOffset(e,t,i,n,r,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=n,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(ur*.5*this.fov)/this.zoom,i=2*t,n=this.aspect*i,r=-.5*n;const a=this.view;if(this.view!==null&&this.view.enabled){const c=a.fullWidth,u=a.fullHeight;r+=a.offsetX*n/c,t-=a.offsetY*i/u,n*=a.width/c,i*=a.height/u}const o=this.filmOffset;o!==0&&(r+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+n,t,t-i,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const ps=-90,ms=1;class Jg extends Gt{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const n=new gi(ps,ms,e,t);n.layers=this.layers,this.add(n);const r=new gi(ps,ms,e,t);r.layers=this.layers,this.add(r);const a=new gi(ps,ms,e,t);a.layers=this.layers,this.add(a);const o=new gi(ps,ms,e,t);o.layers=this.layers,this.add(o);const c=new gi(ps,ms,e,t);c.layers=this.layers,this.add(c);const u=new gi(ps,ms,e,t);u.layers=this.layers,this.add(u)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[i,n,r,a,o,c]=t;for(const u of t)this.remove(u);if(e===Yi)i.up.set(0,1,0),i.lookAt(1,0,0),n.up.set(0,1,0),n.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===Fa)i.up.set(0,-1,0),i.lookAt(-1,0,0),n.up.set(0,-1,0),n.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const u of t)this.add(u),u.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:n}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[r,a,o,c,u,d]=this.children,l=e.getRenderTarget(),h=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const _=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,e.setRenderTarget(i,0,n),e.render(t,r),e.setRenderTarget(i,1,n),e.render(t,a),e.setRenderTarget(i,2,n),e.render(t,o),e.setRenderTarget(i,3,n),e.render(t,c),e.setRenderTarget(i,4,n),e.render(t,u),i.texture.generateMipmaps=_,e.setRenderTarget(i,5,n),e.render(t,d),e.setRenderTarget(l,h,f),e.xr.enabled=g,i.texture.needsPMREMUpdate=!0}}class fd extends bt{constructor(e,t,i,n,r,a,o,c,u,d){e=e!==void 0?e:[],t=t!==void 0?t:Us,super(e,t,i,n,r,a,o,c,u,d),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class $g extends Ht{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},n=[i,i,i,i,i,i];this.texture=new fd(n,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:Dt}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},n=new Dr(5,5,5),r=new gt({name:"CubemapFromEquirect",uniforms:Bs(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Xt,blending:Di});r.uniforms.tEquirect.value=t;const a=new zt(n,r),o=t.minFilter;return t.minFilter===dn&&(t.minFilter=Dt),new Jg(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t,i,n){const r=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,i,n);e.setRenderTarget(r)}}const Do=new z,e0=new z,t0=new Ue;class Hn{constructor(e=new z(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,n){return this.normal.set(e,t,i),this.constant=n,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const n=Do.subVectors(i,t).cross(e0.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(n,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const i=e.delta(Do),n=this.normal.dot(i);if(n===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const r=-(e.start.dot(this.normal)+this.constant)/n;return r<0||r>1?null:t.copy(e.start).addScaledVector(i,r)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||t0.getNormalMatrix(e),n=this.coplanarPoint(Do).applyMatrix4(e),r=this.normal.applyMatrix3(i).normalize();return this.constant=-n.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Un=new Ja,ta=new z;class pd{constructor(e=new Hn,t=new Hn,i=new Hn,n=new Hn,r=new Hn,a=new Hn){this.planes=[e,t,i,n,r,a]}set(e,t,i,n,r,a){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(i),o[3].copy(n),o[4].copy(r),o[5].copy(a),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=Yi){const i=this.planes,n=e.elements,r=n[0],a=n[1],o=n[2],c=n[3],u=n[4],d=n[5],l=n[6],h=n[7],f=n[8],g=n[9],_=n[10],p=n[11],m=n[12],x=n[13],y=n[14],b=n[15];if(i[0].setComponents(c-r,h-u,p-f,b-m).normalize(),i[1].setComponents(c+r,h+u,p+f,b+m).normalize(),i[2].setComponents(c+a,h+d,p+g,b+x).normalize(),i[3].setComponents(c-a,h-d,p-g,b-x).normalize(),i[4].setComponents(c-o,h-l,p-_,b-y).normalize(),t===Yi)i[5].setComponents(c+o,h+l,p+_,b+y).normalize();else if(t===Fa)i[5].setComponents(o,l,_,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Un.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Un.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Un)}intersectsSprite(e){return Un.center.set(0,0,0),Un.radius=.7071067811865476,Un.applyMatrix4(e.matrixWorld),this.intersectsSphere(Un)}intersectsSphere(e){const t=this.planes,i=e.center,n=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(i)<n)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const n=t[i];if(ta.x=n.normal.x>0?e.max.x:e.min.x,ta.y=n.normal.y>0?e.max.y:e.min.y,ta.z=n.normal.z>0?e.max.z:e.min.z,n.distanceToPoint(ta)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function md(){let s=null,e=!1,t=null,i=null;function n(r,a){t(r,a),i=s.requestAnimationFrame(n)}return{start:function(){e!==!0&&t!==null&&(i=s.requestAnimationFrame(n),e=!0)},stop:function(){s.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){s=r}}}function i0(s){const e=new WeakMap;function t(o,c){const u=o.array,d=o.usage,l=u.byteLength,h=s.createBuffer();s.bindBuffer(c,h),s.bufferData(c,u,d),o.onUploadCallback();let f;if(u instanceof Float32Array)f=s.FLOAT;else if(u instanceof Uint16Array)o.isFloat16BufferAttribute?f=s.HALF_FLOAT:f=s.UNSIGNED_SHORT;else if(u instanceof Int16Array)f=s.SHORT;else if(u instanceof Uint32Array)f=s.UNSIGNED_INT;else if(u instanceof Int32Array)f=s.INT;else if(u instanceof Int8Array)f=s.BYTE;else if(u instanceof Uint8Array)f=s.UNSIGNED_BYTE;else if(u instanceof Uint8ClampedArray)f=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+u);return{buffer:h,type:f,bytesPerElement:u.BYTES_PER_ELEMENT,version:o.version,size:l}}function i(o,c,u){const d=c.array,l=c.updateRanges;if(s.bindBuffer(u,o),l.length===0)s.bufferSubData(u,0,d);else{l.sort((f,g)=>f.start-g.start);let h=0;for(let f=1;f<l.length;f++){const g=l[h],_=l[f];_.start<=g.start+g.count+1?g.count=Math.max(g.count,_.start+_.count-g.start):(++h,l[h]=_)}l.length=h+1;for(let f=0,g=l.length;f<g;f++){const _=l[f];s.bufferSubData(u,_.start*d.BYTES_PER_ELEMENT,d,_.start,_.count)}c.clearUpdateRanges()}c.onUploadCallback()}function n(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);const c=e.get(o);c&&(s.deleteBuffer(c.buffer),e.delete(o))}function a(o,c){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const d=e.get(o);(!d||d.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const u=e.get(o);if(u===void 0)e.set(o,t(o,c));else if(u.version<o.version){if(u.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(u.buffer,o,c),u.version=o.version}}return{get:n,remove:r,update:a}}class bn extends Ai{constructor(e=1,t=1,i=1,n=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:n};const r=e/2,a=t/2,o=Math.floor(i),c=Math.floor(n),u=o+1,d=c+1,l=e/o,h=t/c,f=[],g=[],_=[],p=[];for(let m=0;m<d;m++){const x=m*h-a;for(let y=0;y<u;y++){const b=y*l-r;g.push(b,-x,0),_.push(0,0,1),p.push(y/o),p.push(1-m/c)}}for(let m=0;m<c;m++)for(let x=0;x<o;x++){const y=x+u*m,b=x+u*(m+1),C=x+1+u*(m+1),E=x+1+u*m;f.push(y,b,E),f.push(b,C,E)}this.setIndex(f),this.setAttribute("position",new Ki(g,3)),this.setAttribute("normal",new Ki(_,3)),this.setAttribute("uv",new Ki(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new bn(e.width,e.height,e.widthSegments,e.heightSegments)}}var n0=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,s0=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,r0=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,a0=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,o0=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,l0=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,c0=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,h0=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,u0=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,d0=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,f0=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,p0=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,m0=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,g0=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,_0=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,v0=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,x0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,y0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,b0=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,w0=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,S0=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,M0=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,T0=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,A0=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,E0=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,C0=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,R0=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,P0=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,L0=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,D0=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,I0="gl_FragColor = linearToOutputTexel( gl_FragColor );",k0=`
const mat3 LINEAR_SRGB_TO_LINEAR_DISPLAY_P3 = mat3(
	vec3( 0.8224621, 0.177538, 0.0 ),
	vec3( 0.0331941, 0.9668058, 0.0 ),
	vec3( 0.0170827, 0.0723974, 0.9105199 )
);
const mat3 LINEAR_DISPLAY_P3_TO_LINEAR_SRGB = mat3(
	vec3( 1.2249401, - 0.2249404, 0.0 ),
	vec3( - 0.0420569, 1.0420571, 0.0 ),
	vec3( - 0.0196376, - 0.0786361, 1.0982735 )
);
vec4 LinearSRGBToLinearDisplayP3( in vec4 value ) {
	return vec4( value.rgb * LINEAR_SRGB_TO_LINEAR_DISPLAY_P3, value.a );
}
vec4 LinearDisplayP3ToLinearSRGB( in vec4 value ) {
	return vec4( value.rgb * LINEAR_DISPLAY_P3_TO_LINEAR_SRGB, value.a );
}
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,U0=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,O0=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,N0=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,F0=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,B0=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,z0=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,H0=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,G0=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,V0=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,W0=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,q0=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,X0=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Y0=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,j0=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,K0=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Z0=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Q0=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,J0=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,$0=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,e_=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,t_=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,i_=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,n_=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,s_=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,r_=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,a_=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,o_=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,l_=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,c_=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,h_=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,u_=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,d_=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,f_=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,p_=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,m_=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,g_=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,__=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,v_=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,x_=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,y_=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,b_=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,w_=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,S_=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,M_=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,T_=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,A_=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,E_=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,C_=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,R_=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,P_=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,L_=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,D_=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,I_=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,k_=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,U_=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,O_=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,N_=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,F_=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,B_=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,z_=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,H_=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,G_=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,V_=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,W_=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,q_=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,X_=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Y_=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,j_=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,K_=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Z_=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Q_=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
		
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
		
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		
		#else
		
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,J_=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,$_=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,ev=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,tv=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const iv=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,nv=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,sv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,rv=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,av=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,ov=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,lv=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,cv=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,hv=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,uv=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,dv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,fv=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,pv=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,mv=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,gv=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,_v=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,vv=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,xv=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,yv=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,bv=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,wv=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Sv=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Mv=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Tv=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Av=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Ev=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Cv=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Rv=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Pv=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Lv=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Dv=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Iv=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,kv=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Uv=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,ke={alphahash_fragment:n0,alphahash_pars_fragment:s0,alphamap_fragment:r0,alphamap_pars_fragment:a0,alphatest_fragment:o0,alphatest_pars_fragment:l0,aomap_fragment:c0,aomap_pars_fragment:h0,batching_pars_vertex:u0,batching_vertex:d0,begin_vertex:f0,beginnormal_vertex:p0,bsdfs:m0,iridescence_fragment:g0,bumpmap_pars_fragment:_0,clipping_planes_fragment:v0,clipping_planes_pars_fragment:x0,clipping_planes_pars_vertex:y0,clipping_planes_vertex:b0,color_fragment:w0,color_pars_fragment:S0,color_pars_vertex:M0,color_vertex:T0,common:A0,cube_uv_reflection_fragment:E0,defaultnormal_vertex:C0,displacementmap_pars_vertex:R0,displacementmap_vertex:P0,emissivemap_fragment:L0,emissivemap_pars_fragment:D0,colorspace_fragment:I0,colorspace_pars_fragment:k0,envmap_fragment:U0,envmap_common_pars_fragment:O0,envmap_pars_fragment:N0,envmap_pars_vertex:F0,envmap_physical_pars_fragment:K0,envmap_vertex:B0,fog_vertex:z0,fog_pars_vertex:H0,fog_fragment:G0,fog_pars_fragment:V0,gradientmap_pars_fragment:W0,lightmap_pars_fragment:q0,lights_lambert_fragment:X0,lights_lambert_pars_fragment:Y0,lights_pars_begin:j0,lights_toon_fragment:Z0,lights_toon_pars_fragment:Q0,lights_phong_fragment:J0,lights_phong_pars_fragment:$0,lights_physical_fragment:e_,lights_physical_pars_fragment:t_,lights_fragment_begin:i_,lights_fragment_maps:n_,lights_fragment_end:s_,logdepthbuf_fragment:r_,logdepthbuf_pars_fragment:a_,logdepthbuf_pars_vertex:o_,logdepthbuf_vertex:l_,map_fragment:c_,map_pars_fragment:h_,map_particle_fragment:u_,map_particle_pars_fragment:d_,metalnessmap_fragment:f_,metalnessmap_pars_fragment:p_,morphinstance_vertex:m_,morphcolor_vertex:g_,morphnormal_vertex:__,morphtarget_pars_vertex:v_,morphtarget_vertex:x_,normal_fragment_begin:y_,normal_fragment_maps:b_,normal_pars_fragment:w_,normal_pars_vertex:S_,normal_vertex:M_,normalmap_pars_fragment:T_,clearcoat_normal_fragment_begin:A_,clearcoat_normal_fragment_maps:E_,clearcoat_pars_fragment:C_,iridescence_pars_fragment:R_,opaque_fragment:P_,packing:L_,premultiplied_alpha_fragment:D_,project_vertex:I_,dithering_fragment:k_,dithering_pars_fragment:U_,roughnessmap_fragment:O_,roughnessmap_pars_fragment:N_,shadowmap_pars_fragment:F_,shadowmap_pars_vertex:B_,shadowmap_vertex:z_,shadowmask_pars_fragment:H_,skinbase_vertex:G_,skinning_pars_vertex:V_,skinning_vertex:W_,skinnormal_vertex:q_,specularmap_fragment:X_,specularmap_pars_fragment:Y_,tonemapping_fragment:j_,tonemapping_pars_fragment:K_,transmission_fragment:Z_,transmission_pars_fragment:Q_,uv_pars_fragment:J_,uv_pars_vertex:$_,uv_vertex:ev,worldpos_vertex:tv,background_vert:iv,background_frag:nv,backgroundCube_vert:sv,backgroundCube_frag:rv,cube_vert:av,cube_frag:ov,depth_vert:lv,depth_frag:cv,distanceRGBA_vert:hv,distanceRGBA_frag:uv,equirect_vert:dv,equirect_frag:fv,linedashed_vert:pv,linedashed_frag:mv,meshbasic_vert:gv,meshbasic_frag:_v,meshlambert_vert:vv,meshlambert_frag:xv,meshmatcap_vert:yv,meshmatcap_frag:bv,meshnormal_vert:wv,meshnormal_frag:Sv,meshphong_vert:Mv,meshphong_frag:Tv,meshphysical_vert:Av,meshphysical_frag:Ev,meshtoon_vert:Cv,meshtoon_frag:Rv,points_vert:Pv,points_frag:Lv,shadow_vert:Dv,shadow_frag:Iv,sprite_vert:kv,sprite_frag:Uv},re={common:{diffuse:{value:new Pe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ue},alphaMap:{value:null},alphaMapTransform:{value:new Ue},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ue}},envmap:{envMap:{value:null},envMapRotation:{value:new Ue},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ue}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ue}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ue},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ue},normalScale:{value:new we(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ue},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ue}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ue}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ue}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Pe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Pe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ue},alphaTest:{value:0},uvTransform:{value:new Ue}},sprite:{diffuse:{value:new Pe(16777215)},opacity:{value:1},center:{value:new we(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ue},alphaMap:{value:null},alphaMapTransform:{value:new Ue},alphaTest:{value:0}}},Ri={basic:{uniforms:Nt([re.common,re.specularmap,re.envmap,re.aomap,re.lightmap,re.fog]),vertexShader:ke.meshbasic_vert,fragmentShader:ke.meshbasic_frag},lambert:{uniforms:Nt([re.common,re.specularmap,re.envmap,re.aomap,re.lightmap,re.emissivemap,re.bumpmap,re.normalmap,re.displacementmap,re.fog,re.lights,{emissive:{value:new Pe(0)}}]),vertexShader:ke.meshlambert_vert,fragmentShader:ke.meshlambert_frag},phong:{uniforms:Nt([re.common,re.specularmap,re.envmap,re.aomap,re.lightmap,re.emissivemap,re.bumpmap,re.normalmap,re.displacementmap,re.fog,re.lights,{emissive:{value:new Pe(0)},specular:{value:new Pe(1118481)},shininess:{value:30}}]),vertexShader:ke.meshphong_vert,fragmentShader:ke.meshphong_frag},standard:{uniforms:Nt([re.common,re.envmap,re.aomap,re.lightmap,re.emissivemap,re.bumpmap,re.normalmap,re.displacementmap,re.roughnessmap,re.metalnessmap,re.fog,re.lights,{emissive:{value:new Pe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:ke.meshphysical_vert,fragmentShader:ke.meshphysical_frag},toon:{uniforms:Nt([re.common,re.aomap,re.lightmap,re.emissivemap,re.bumpmap,re.normalmap,re.displacementmap,re.gradientmap,re.fog,re.lights,{emissive:{value:new Pe(0)}}]),vertexShader:ke.meshtoon_vert,fragmentShader:ke.meshtoon_frag},matcap:{uniforms:Nt([re.common,re.bumpmap,re.normalmap,re.displacementmap,re.fog,{matcap:{value:null}}]),vertexShader:ke.meshmatcap_vert,fragmentShader:ke.meshmatcap_frag},points:{uniforms:Nt([re.points,re.fog]),vertexShader:ke.points_vert,fragmentShader:ke.points_frag},dashed:{uniforms:Nt([re.common,re.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:ke.linedashed_vert,fragmentShader:ke.linedashed_frag},depth:{uniforms:Nt([re.common,re.displacementmap]),vertexShader:ke.depth_vert,fragmentShader:ke.depth_frag},normal:{uniforms:Nt([re.common,re.bumpmap,re.normalmap,re.displacementmap,{opacity:{value:1}}]),vertexShader:ke.meshnormal_vert,fragmentShader:ke.meshnormal_frag},sprite:{uniforms:Nt([re.sprite,re.fog]),vertexShader:ke.sprite_vert,fragmentShader:ke.sprite_frag},background:{uniforms:{uvTransform:{value:new Ue},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:ke.background_vert,fragmentShader:ke.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ue}},vertexShader:ke.backgroundCube_vert,fragmentShader:ke.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:ke.cube_vert,fragmentShader:ke.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:ke.equirect_vert,fragmentShader:ke.equirect_frag},distanceRGBA:{uniforms:Nt([re.common,re.displacementmap,{referencePosition:{value:new z},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:ke.distanceRGBA_vert,fragmentShader:ke.distanceRGBA_frag},shadow:{uniforms:Nt([re.lights,re.fog,{color:{value:new Pe(0)},opacity:{value:1}}]),vertexShader:ke.shadow_vert,fragmentShader:ke.shadow_frag}};Ri.physical={uniforms:Nt([Ri.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ue},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ue},clearcoatNormalScale:{value:new we(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ue},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ue},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ue},sheen:{value:0},sheenColor:{value:new Pe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ue},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ue},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ue},transmissionSamplerSize:{value:new we},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ue},attenuationDistance:{value:0},attenuationColor:{value:new Pe(0)},specularColor:{value:new Pe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ue},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ue},anisotropyVector:{value:new we},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ue}}]),vertexShader:ke.meshphysical_vert,fragmentShader:ke.meshphysical_frag};const ia={r:0,b:0,g:0},On=new Ji,Ov=new dt;function Nv(s,e,t,i,n,r,a){const o=new Pe(0);let c=r===!0?0:1,u,d,l=null,h=0,f=null;function g(x){let y=x.isScene===!0?x.background:null;return y&&y.isTexture&&(y=(x.backgroundBlurriness>0?t:e).get(y)),y}function _(x){let y=!1;const b=g(x);b===null?m(o,c):b&&b.isColor&&(m(b,1),y=!0);const C=s.xr.getEnvironmentBlendMode();C==="additive"?i.buffers.color.setClear(0,0,0,1,a):C==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,a),(s.autoClear||y)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function p(x,y){const b=g(y);b&&(b.isCubeTexture||b.mapping===Za)?(d===void 0&&(d=new zt(new Dr(1,1,1),new gt({name:"BackgroundCubeMaterial",uniforms:Bs(Ri.backgroundCube.uniforms),vertexShader:Ri.backgroundCube.vertexShader,fragmentShader:Ri.backgroundCube.fragmentShader,side:Xt,depthTest:!1,depthWrite:!1,fog:!1})),d.geometry.deleteAttribute("normal"),d.geometry.deleteAttribute("uv"),d.onBeforeRender=function(C,E,A){this.matrixWorld.copyPosition(A.matrixWorld)},Object.defineProperty(d.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(d)),On.copy(y.backgroundRotation),On.x*=-1,On.y*=-1,On.z*=-1,b.isCubeTexture&&b.isRenderTargetTexture===!1&&(On.y*=-1,On.z*=-1),d.material.uniforms.envMap.value=b,d.material.uniforms.flipEnvMap.value=b.isCubeTexture&&b.isRenderTargetTexture===!1?-1:1,d.material.uniforms.backgroundBlurriness.value=y.backgroundBlurriness,d.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,d.material.uniforms.backgroundRotation.value.setFromMatrix4(Ov.makeRotationFromEuler(On)),d.material.toneMapped=Ye.getTransfer(b.colorSpace)!==nt,(l!==b||h!==b.version||f!==s.toneMapping)&&(d.material.needsUpdate=!0,l=b,h=b.version,f=s.toneMapping),d.layers.enableAll(),x.unshift(d,d.geometry,d.material,0,0,null)):b&&b.isTexture&&(u===void 0&&(u=new zt(new bn(2,2),new gt({name:"BackgroundMaterial",uniforms:Bs(Ri.background.uniforms),vertexShader:Ri.background.vertexShader,fragmentShader:Ri.background.fragmentShader,side:yn,depthTest:!1,depthWrite:!1,fog:!1})),u.geometry.deleteAttribute("normal"),Object.defineProperty(u.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(u)),u.material.uniforms.t2D.value=b,u.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,u.material.toneMapped=Ye.getTransfer(b.colorSpace)!==nt,b.matrixAutoUpdate===!0&&b.updateMatrix(),u.material.uniforms.uvTransform.value.copy(b.matrix),(l!==b||h!==b.version||f!==s.toneMapping)&&(u.material.needsUpdate=!0,l=b,h=b.version,f=s.toneMapping),u.layers.enableAll(),x.unshift(u,u.geometry,u.material,0,0,null))}function m(x,y){x.getRGB(ia,ud(s)),i.buffers.color.setClear(ia.r,ia.g,ia.b,y,a)}return{getClearColor:function(){return o},setClearColor:function(x,y=1){o.set(x),c=y,m(o,c)},getClearAlpha:function(){return c},setClearAlpha:function(x){c=x,m(o,c)},render:_,addToRenderList:p}}function Fv(s,e){const t=s.getParameter(s.MAX_VERTEX_ATTRIBS),i={},n=h(null);let r=n,a=!1;function o(v,S,H,F,P){let B=!1;const O=l(F,H,S);r!==O&&(r=O,u(r.object)),B=f(v,F,H,P),B&&g(v,F,H,P),P!==null&&e.update(P,s.ELEMENT_ARRAY_BUFFER),(B||a)&&(a=!1,b(v,S,H,F),P!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,e.get(P).buffer))}function c(){return s.createVertexArray()}function u(v){return s.bindVertexArray(v)}function d(v){return s.deleteVertexArray(v)}function l(v,S,H){const F=H.wireframe===!0;let P=i[v.id];P===void 0&&(P={},i[v.id]=P);let B=P[S.id];B===void 0&&(B={},P[S.id]=B);let O=B[F];return O===void 0&&(O=h(c()),B[F]=O),O}function h(v){const S=[],H=[],F=[];for(let P=0;P<t;P++)S[P]=0,H[P]=0,F[P]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:S,enabledAttributes:H,attributeDivisors:F,object:v,attributes:{},index:null}}function f(v,S,H,F){const P=r.attributes,B=S.attributes;let O=0;const j=H.getAttributes();for(const V in j)if(j[V].location>=0){const ee=P[V];let ce=B[V];if(ce===void 0&&(V==="instanceMatrix"&&v.instanceMatrix&&(ce=v.instanceMatrix),V==="instanceColor"&&v.instanceColor&&(ce=v.instanceColor)),ee===void 0||ee.attribute!==ce||ce&&ee.data!==ce.data)return!0;O++}return r.attributesNum!==O||r.index!==F}function g(v,S,H,F){const P={},B=S.attributes;let O=0;const j=H.getAttributes();for(const V in j)if(j[V].location>=0){let ee=B[V];ee===void 0&&(V==="instanceMatrix"&&v.instanceMatrix&&(ee=v.instanceMatrix),V==="instanceColor"&&v.instanceColor&&(ee=v.instanceColor));const ce={};ce.attribute=ee,ee&&ee.data&&(ce.data=ee.data),P[V]=ce,O++}r.attributes=P,r.attributesNum=O,r.index=F}function _(){const v=r.newAttributes;for(let S=0,H=v.length;S<H;S++)v[S]=0}function p(v){m(v,0)}function m(v,S){const H=r.newAttributes,F=r.enabledAttributes,P=r.attributeDivisors;H[v]=1,F[v]===0&&(s.enableVertexAttribArray(v),F[v]=1),P[v]!==S&&(s.vertexAttribDivisor(v,S),P[v]=S)}function x(){const v=r.newAttributes,S=r.enabledAttributes;for(let H=0,F=S.length;H<F;H++)S[H]!==v[H]&&(s.disableVertexAttribArray(H),S[H]=0)}function y(v,S,H,F,P,B,O){O===!0?s.vertexAttribIPointer(v,S,H,P,B):s.vertexAttribPointer(v,S,H,F,P,B)}function b(v,S,H,F){_();const P=F.attributes,B=H.getAttributes(),O=S.defaultAttributeValues;for(const j in B){const V=B[j];if(V.location>=0){let se=P[j];if(se===void 0&&(j==="instanceMatrix"&&v.instanceMatrix&&(se=v.instanceMatrix),j==="instanceColor"&&v.instanceColor&&(se=v.instanceColor)),se!==void 0){const ee=se.normalized,ce=se.itemSize,Ie=e.get(se);if(Ie===void 0)continue;const Oe=Ie.buffer,Y=Ie.type,J=Ie.bytesPerElement,_e=Y===s.INT||Y===s.UNSIGNED_INT||se.gpuType===dc;if(se.isInterleavedBufferAttribute){const de=se.data,Le=de.stride,Me=se.offset;if(de.isInstancedInterleavedBuffer){for(let ze=0;ze<V.locationSize;ze++)m(V.location+ze,de.meshPerAttribute);v.isInstancedMesh!==!0&&F._maxInstanceCount===void 0&&(F._maxInstanceCount=de.meshPerAttribute*de.count)}else for(let ze=0;ze<V.locationSize;ze++)p(V.location+ze);s.bindBuffer(s.ARRAY_BUFFER,Oe);for(let ze=0;ze<V.locationSize;ze++)y(V.location+ze,ce/V.locationSize,Y,ee,Le*J,(Me+ce/V.locationSize*ze)*J,_e)}else{if(se.isInstancedBufferAttribute){for(let de=0;de<V.locationSize;de++)m(V.location+de,se.meshPerAttribute);v.isInstancedMesh!==!0&&F._maxInstanceCount===void 0&&(F._maxInstanceCount=se.meshPerAttribute*se.count)}else for(let de=0;de<V.locationSize;de++)p(V.location+de);s.bindBuffer(s.ARRAY_BUFFER,Oe);for(let de=0;de<V.locationSize;de++)y(V.location+de,ce/V.locationSize,Y,ee,ce*J,ce/V.locationSize*de*J,_e)}}else if(O!==void 0){const ee=O[j];if(ee!==void 0)switch(ee.length){case 2:s.vertexAttrib2fv(V.location,ee);break;case 3:s.vertexAttrib3fv(V.location,ee);break;case 4:s.vertexAttrib4fv(V.location,ee);break;default:s.vertexAttrib1fv(V.location,ee)}}}}x()}function C(){L();for(const v in i){const S=i[v];for(const H in S){const F=S[H];for(const P in F)d(F[P].object),delete F[P];delete S[H]}delete i[v]}}function E(v){if(i[v.id]===void 0)return;const S=i[v.id];for(const H in S){const F=S[H];for(const P in F)d(F[P].object),delete F[P];delete S[H]}delete i[v.id]}function A(v){for(const S in i){const H=i[S];if(H[v.id]===void 0)continue;const F=H[v.id];for(const P in F)d(F[P].object),delete F[P];delete H[v.id]}}function L(){D(),a=!0,r!==n&&(r=n,u(r.object))}function D(){n.geometry=null,n.program=null,n.wireframe=!1}return{setup:o,reset:L,resetDefaultState:D,dispose:C,releaseStatesOfGeometry:E,releaseStatesOfProgram:A,initAttributes:_,enableAttribute:p,disableUnusedAttributes:x}}function Bv(s,e,t){let i;function n(u){i=u}function r(u,d){s.drawArrays(i,u,d),t.update(d,i,1)}function a(u,d,l){l!==0&&(s.drawArraysInstanced(i,u,d,l),t.update(d,i,l))}function o(u,d,l){if(l===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,u,0,d,0,l);let f=0;for(let g=0;g<l;g++)f+=d[g];t.update(f,i,1)}function c(u,d,l,h){if(l===0)return;const f=e.get("WEBGL_multi_draw");if(f===null)for(let g=0;g<u.length;g++)a(u[g],d[g],h[g]);else{f.multiDrawArraysInstancedWEBGL(i,u,0,d,0,h,0,l);let g=0;for(let _=0;_<l;_++)g+=d[_];for(let _=0;_<h.length;_++)t.update(g,i,h[_])}}this.setMode=n,this.render=r,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=c}function zv(s,e,t,i){let n;function r(){if(n!==void 0)return n;if(e.has("EXT_texture_filter_anisotropic")===!0){const A=e.get("EXT_texture_filter_anisotropic");n=s.getParameter(A.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else n=0;return n}function a(A){return!(A!==Ti&&i.convert(A)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(A){const L=A===oi&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(A!==Qi&&i.convert(A)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE)&&A!==Xi&&!L)}function c(A){if(A==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";A="mediump"}return A==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let u=t.precision!==void 0?t.precision:"highp";const d=c(u);d!==u&&(console.warn("THREE.WebGLRenderer:",u,"not supported, using",d,"instead."),u=d);const l=t.logarithmicDepthBuffer===!0,h=t.reverseDepthBuffer===!0&&e.has("EXT_clip_control");if(h===!0){const A=e.get("EXT_clip_control");A.clipControlEXT(A.LOWER_LEFT_EXT,A.ZERO_TO_ONE_EXT)}const f=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),g=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=s.getParameter(s.MAX_TEXTURE_SIZE),p=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),m=s.getParameter(s.MAX_VERTEX_ATTRIBS),x=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),y=s.getParameter(s.MAX_VARYING_VECTORS),b=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),C=g>0,E=s.getParameter(s.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:c,textureFormatReadable:a,textureTypeReadable:o,precision:u,logarithmicDepthBuffer:l,reverseDepthBuffer:h,maxTextures:f,maxVertexTextures:g,maxTextureSize:_,maxCubemapSize:p,maxAttributes:m,maxVertexUniforms:x,maxVaryings:y,maxFragmentUniforms:b,vertexTextures:C,maxSamples:E}}function Hv(s){const e=this;let t=null,i=0,n=!1,r=!1;const a=new Hn,o=new Ue,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(l,h){const f=l.length!==0||h||i!==0||n;return n=h,i=l.length,f},this.beginShadows=function(){r=!0,d(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(l,h){t=d(l,h,0)},this.setState=function(l,h,f){const g=l.clippingPlanes,_=l.clipIntersection,p=l.clipShadows,m=s.get(l);if(!n||g===null||g.length===0||r&&!p)r?d(null):u();else{const x=r?0:i,y=x*4;let b=m.clippingState||null;c.value=b,b=d(g,h,y,f);for(let C=0;C!==y;++C)b[C]=t[C];m.clippingState=b,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=x}};function u(){c.value!==t&&(c.value=t,c.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function d(l,h,f,g){const _=l!==null?l.length:0;let p=null;if(_!==0){if(p=c.value,g!==!0||p===null){const m=f+_*4,x=h.matrixWorldInverse;o.getNormalMatrix(x),(p===null||p.length<m)&&(p=new Float32Array(m));for(let y=0,b=f;y!==_;++y,b+=4)a.copy(l[y]).applyMatrix4(x,o),a.normal.toArray(p,b),p[b+3]=a.constant}c.value=p,c.needsUpdate=!0}return e.numPlanes=_,e.numIntersection=0,p}}function Gv(s){let e=new WeakMap;function t(a,o){return o===pl?a.mapping=Us:o===ml&&(a.mapping=Os),a}function i(a){if(a&&a.isTexture){const o=a.mapping;if(o===pl||o===ml)if(e.has(a)){const c=e.get(a).texture;return t(c,a.mapping)}else{const c=a.image;if(c&&c.height>0){const u=new $g(c.height);return u.fromEquirectangularTexture(s,a),e.set(a,u),a.addEventListener("dispose",n),t(u.texture,a.mapping)}else return null}}return a}function n(a){const o=a.target;o.removeEventListener("dispose",n);const c=e.get(o);c!==void 0&&(e.delete(o),c.dispose())}function r(){e=new WeakMap}return{get:i,dispose:r}}class gd extends dd{constructor(e=-1,t=1,i=1,n=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=n,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,n,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=n,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,n=(this.top+this.bottom)/2;let r=i-e,a=i+e,o=n+t,c=n-t;if(this.view!==null&&this.view.enabled){const u=(this.right-this.left)/this.view.fullWidth/this.zoom,d=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=u*this.view.offsetX,a=r+u*this.view.width,o-=d*this.view.offsetY,c=o-d*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,c,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}const Ts=4,wh=[.125,.215,.35,.446,.526,.582],qn=20,Io=new gd,Sh=new Pe;let ko=null,Uo=0,Oo=0,No=!1;const Gn=(1+Math.sqrt(5))/2,gs=1/Gn,Mh=[new z(-Gn,gs,0),new z(Gn,gs,0),new z(-gs,0,Gn),new z(gs,0,Gn),new z(0,Gn,-gs),new z(0,Gn,gs),new z(-1,1,-1),new z(1,1,-1),new z(-1,1,1),new z(1,1,1)];class Th{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,i=.1,n=100){ko=this._renderer.getRenderTarget(),Uo=this._renderer.getActiveCubeFace(),Oo=this._renderer.getActiveMipmapLevel(),No=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const r=this._allocateTargets();return r.depthBuffer=!0,this._sceneToCubeUV(e,i,n,r),t>0&&this._blur(r,0,0,t),this._applyPMREM(r),this._cleanup(r),r}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Ch(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Eh(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(ko,Uo,Oo),this._renderer.xr.enabled=No,e.scissorTest=!1,na(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Us||e.mapping===Os?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),ko=this._renderer.getRenderTarget(),Uo=this._renderer.getActiveCubeFace(),Oo=this._renderer.getActiveMipmapLevel(),No=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Dt,minFilter:Dt,generateMipmaps:!1,type:oi,format:Ti,colorSpace:An,depthBuffer:!1},n=Ah(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Ah(e,t,i);const{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Vv(r)),this._blurMaterial=Wv(r,e,t)}return n}_compileMaterial(e){const t=new zt(this._lodPlanes[0],e);this._renderer.compile(t,Io)}_sceneToCubeUV(e,t,i,n){const o=new gi(90,1,t,i),c=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],d=this._renderer,l=d.autoClear,h=d.toneMapping;d.getClearColor(Sh),d.toneMapping=_n,d.autoClear=!1;const f=new Lr({name:"PMREM.Background",side:Xt,depthWrite:!1,depthTest:!1}),g=new zt(new Dr,f);let _=!1;const p=e.background;p?p.isColor&&(f.color.copy(p),e.background=null,_=!0):(f.color.copy(Sh),_=!0);for(let m=0;m<6;m++){const x=m%3;x===0?(o.up.set(0,c[m],0),o.lookAt(u[m],0,0)):x===1?(o.up.set(0,0,c[m]),o.lookAt(0,u[m],0)):(o.up.set(0,c[m],0),o.lookAt(0,0,u[m]));const y=this._cubeSize;na(n,x*y,m>2?y:0,y,y),d.setRenderTarget(n),_&&d.render(g,o),d.render(e,o)}g.geometry.dispose(),g.material.dispose(),d.toneMapping=h,d.autoClear=l,e.background=p}_textureToCubeUV(e,t){const i=this._renderer,n=e.mapping===Us||e.mapping===Os;n?(this._cubemapMaterial===null&&(this._cubemapMaterial=Ch()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Eh());const r=n?this._cubemapMaterial:this._equirectMaterial,a=new zt(this._lodPlanes[0],r),o=r.uniforms;o.envMap.value=e;const c=this._cubeSize;na(t,0,0,3*c,2*c),i.setRenderTarget(t),i.render(a,Io)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const n=this._lodPlanes.length;for(let r=1;r<n;r++){const a=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),o=Mh[(n-r-1)%Mh.length];this._blur(e,r-1,r,a,o)}t.autoClear=i}_blur(e,t,i,n,r){const a=this._pingPongRenderTarget;this._halfBlur(e,a,t,i,n,"latitudinal",r),this._halfBlur(a,e,i,i,n,"longitudinal",r)}_halfBlur(e,t,i,n,r,a,o){const c=this._renderer,u=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const d=3,l=new zt(this._lodPlanes[n],u),h=u.uniforms,f=this._sizeLods[i]-1,g=isFinite(r)?Math.PI/(2*f):2*Math.PI/(2*qn-1),_=r/g,p=isFinite(r)?1+Math.floor(d*_):qn;p>qn&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${p} samples when the maximum is set to ${qn}`);const m=[];let x=0;for(let A=0;A<qn;++A){const L=A/_,D=Math.exp(-L*L/2);m.push(D),A===0?x+=D:A<p&&(x+=2*D)}for(let A=0;A<m.length;A++)m[A]=m[A]/x;h.envMap.value=e.texture,h.samples.value=p,h.weights.value=m,h.latitudinal.value=a==="latitudinal",o&&(h.poleAxis.value=o);const{_lodMax:y}=this;h.dTheta.value=g,h.mipInt.value=y-i;const b=this._sizeLods[n],C=3*b*(n>y-Ts?n-y+Ts:0),E=4*(this._cubeSize-b);na(t,C,E,3*b,2*b),c.setRenderTarget(t),c.render(l,Io)}}function Vv(s){const e=[],t=[],i=[];let n=s;const r=s-Ts+1+wh.length;for(let a=0;a<r;a++){const o=Math.pow(2,n);t.push(o);let c=1/o;a>s-Ts?c=wh[a-s+Ts-1]:a===0&&(c=0),i.push(c);const u=1/(o-2),d=-u,l=1+u,h=[d,d,l,d,l,l,d,d,l,l,d,l],f=6,g=6,_=3,p=2,m=1,x=new Float32Array(_*g*f),y=new Float32Array(p*g*f),b=new Float32Array(m*g*f);for(let E=0;E<f;E++){const A=E%3*2/3-1,L=E>2?0:-1,D=[A,L,0,A+2/3,L,0,A+2/3,L+1,0,A,L,0,A+2/3,L+1,0,A,L+1,0];x.set(D,_*g*E),y.set(h,p*g*E);const v=[E,E,E,E,E,E];b.set(v,m*g*E)}const C=new Ai;C.setAttribute("position",new li(x,_)),C.setAttribute("uv",new li(y,p)),C.setAttribute("faceIndex",new li(b,m)),e.push(C),n>Ts&&n--}return{lodPlanes:e,sizeLods:t,sigmas:i}}function Ah(s,e,t){const i=new Ht(s,e,t);return i.texture.mapping=Za,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function na(s,e,t,i,n){s.viewport.set(e,t,i,n),s.scissor.set(e,t,i,n)}function Wv(s,e,t){const i=new Float32Array(qn),n=new z(0,1,0);return new gt({name:"SphericalGaussianBlur",defines:{n:qn,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:n}},vertexShader:yc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Di,depthTest:!1,depthWrite:!1})}function Eh(){return new gt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:yc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Di,depthTest:!1,depthWrite:!1})}function Ch(){return new gt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:yc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Di,depthTest:!1,depthWrite:!1})}function yc(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function qv(s){let e=new WeakMap,t=null;function i(o){if(o&&o.isTexture){const c=o.mapping,u=c===pl||c===ml,d=c===Us||c===Os;if(u||d){let l=e.get(o);const h=l!==void 0?l.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==h)return t===null&&(t=new Th(s)),l=u?t.fromEquirectangular(o,l):t.fromCubemap(o,l),l.texture.pmremVersion=o.pmremVersion,e.set(o,l),l.texture;if(l!==void 0)return l.texture;{const f=o.image;return u&&f&&f.height>0||d&&f&&n(f)?(t===null&&(t=new Th(s)),l=u?t.fromEquirectangular(o):t.fromCubemap(o),l.texture.pmremVersion=o.pmremVersion,e.set(o,l),o.addEventListener("dispose",r),l.texture):null}}}return o}function n(o){let c=0;const u=6;for(let d=0;d<u;d++)o[d]!==void 0&&c++;return c===u}function r(o){const c=o.target;c.removeEventListener("dispose",r);const u=e.get(c);u!==void 0&&(e.delete(c),u.dispose())}function a(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:a}}function Xv(s){const e={};function t(i){if(e[i]!==void 0)return e[i];let n;switch(i){case"WEBGL_depth_texture":n=s.getExtension("WEBGL_depth_texture")||s.getExtension("MOZ_WEBGL_depth_texture")||s.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":n=s.getExtension("EXT_texture_filter_anisotropic")||s.getExtension("MOZ_EXT_texture_filter_anisotropic")||s.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":n=s.getExtension("WEBGL_compressed_texture_s3tc")||s.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":n=s.getExtension("WEBGL_compressed_texture_pvrtc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:n=s.getExtension(i)}return e[i]=n,n}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const n=t(i);return n===null&&Ca("THREE.WebGLRenderer: "+i+" extension not supported."),n}}}function Yv(s,e,t,i){const n={},r=new WeakMap;function a(l){const h=l.target;h.index!==null&&e.remove(h.index);for(const g in h.attributes)e.remove(h.attributes[g]);for(const g in h.morphAttributes){const _=h.morphAttributes[g];for(let p=0,m=_.length;p<m;p++)e.remove(_[p])}h.removeEventListener("dispose",a),delete n[h.id];const f=r.get(h);f&&(e.remove(f),r.delete(h)),i.releaseStatesOfGeometry(h),h.isInstancedBufferGeometry===!0&&delete h._maxInstanceCount,t.memory.geometries--}function o(l,h){return n[h.id]===!0||(h.addEventListener("dispose",a),n[h.id]=!0,t.memory.geometries++),h}function c(l){const h=l.attributes;for(const g in h)e.update(h[g],s.ARRAY_BUFFER);const f=l.morphAttributes;for(const g in f){const _=f[g];for(let p=0,m=_.length;p<m;p++)e.update(_[p],s.ARRAY_BUFFER)}}function u(l){const h=[],f=l.index,g=l.attributes.position;let _=0;if(f!==null){const x=f.array;_=f.version;for(let y=0,b=x.length;y<b;y+=3){const C=x[y+0],E=x[y+1],A=x[y+2];h.push(C,E,E,A,A,C)}}else if(g!==void 0){const x=g.array;_=g.version;for(let y=0,b=x.length/3-1;y<b;y+=3){const C=y+0,E=y+1,A=y+2;h.push(C,E,E,A,A,C)}}else return;const p=new(nd(h)?hd:cd)(h,1);p.version=_;const m=r.get(l);m&&e.remove(m),r.set(l,p)}function d(l){const h=r.get(l);if(h){const f=l.index;f!==null&&h.version<f.version&&u(l)}else u(l);return r.get(l)}return{get:o,update:c,getWireframeAttribute:d}}function jv(s,e,t){let i;function n(h){i=h}let r,a;function o(h){r=h.type,a=h.bytesPerElement}function c(h,f){s.drawElements(i,f,r,h*a),t.update(f,i,1)}function u(h,f,g){g!==0&&(s.drawElementsInstanced(i,f,r,h*a,g),t.update(f,i,g))}function d(h,f,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,f,0,r,h,0,g);let p=0;for(let m=0;m<g;m++)p+=f[m];t.update(p,i,1)}function l(h,f,g,_){if(g===0)return;const p=e.get("WEBGL_multi_draw");if(p===null)for(let m=0;m<h.length;m++)u(h[m]/a,f[m],_[m]);else{p.multiDrawElementsInstancedWEBGL(i,f,0,r,h,0,_,0,g);let m=0;for(let x=0;x<g;x++)m+=f[x];for(let x=0;x<_.length;x++)t.update(m,i,_[x])}}this.setMode=n,this.setIndex=o,this.render=c,this.renderInstances=u,this.renderMultiDraw=d,this.renderMultiDrawInstances=l}function Kv(s){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(r,a,o){switch(t.calls++,a){case s.TRIANGLES:t.triangles+=o*(r/3);break;case s.LINES:t.lines+=o*(r/2);break;case s.LINE_STRIP:t.lines+=o*(r-1);break;case s.LINE_LOOP:t.lines+=o*r;break;case s.POINTS:t.points+=o*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function n(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:n,update:i}}function Zv(s,e,t){const i=new WeakMap,n=new je;function r(a,o,c){const u=a.morphTargetInfluences,d=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,l=d!==void 0?d.length:0;let h=i.get(o);if(h===void 0||h.count!==l){let D=function(){A.dispose(),i.delete(o),o.removeEventListener("dispose",D)};h!==void 0&&h.texture.dispose();const f=o.morphAttributes.position!==void 0,g=o.morphAttributes.normal!==void 0,_=o.morphAttributes.color!==void 0,p=o.morphAttributes.position||[],m=o.morphAttributes.normal||[],x=o.morphAttributes.color||[];let y=0;f===!0&&(y=1),g===!0&&(y=2),_===!0&&(y=3);let b=o.attributes.position.count*y,C=1;b>e.maxTextureSize&&(C=Math.ceil(b/e.maxTextureSize),b=e.maxTextureSize);const E=new Float32Array(b*C*4*l),A=new rd(E,b,C,l);A.type=Xi,A.needsUpdate=!0;const L=y*4;for(let v=0;v<l;v++){const S=p[v],H=m[v],F=x[v],P=b*C*4*v;for(let B=0;B<S.count;B++){const O=B*L;f===!0&&(n.fromBufferAttribute(S,B),E[P+O+0]=n.x,E[P+O+1]=n.y,E[P+O+2]=n.z,E[P+O+3]=0),g===!0&&(n.fromBufferAttribute(H,B),E[P+O+4]=n.x,E[P+O+5]=n.y,E[P+O+6]=n.z,E[P+O+7]=0),_===!0&&(n.fromBufferAttribute(F,B),E[P+O+8]=n.x,E[P+O+9]=n.y,E[P+O+10]=n.z,E[P+O+11]=F.itemSize===4?n.w:1)}}h={count:l,texture:A,size:new we(b,C)},i.set(o,h),o.addEventListener("dispose",D)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)c.getUniforms().setValue(s,"morphTexture",a.morphTexture,t);else{let f=0;for(let _=0;_<u.length;_++)f+=u[_];const g=o.morphTargetsRelative?1:1-f;c.getUniforms().setValue(s,"morphTargetBaseInfluence",g),c.getUniforms().setValue(s,"morphTargetInfluences",u)}c.getUniforms().setValue(s,"morphTargetsTexture",h.texture,t),c.getUniforms().setValue(s,"morphTargetsTextureSize",h.size)}return{update:r}}function Qv(s,e,t,i){let n=new WeakMap;function r(c){const u=i.render.frame,d=c.geometry,l=e.get(c,d);if(n.get(l)!==u&&(e.update(l),n.set(l,u)),c.isInstancedMesh&&(c.hasEventListener("dispose",o)===!1&&c.addEventListener("dispose",o),n.get(c)!==u&&(t.update(c.instanceMatrix,s.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,s.ARRAY_BUFFER),n.set(c,u))),c.isSkinnedMesh){const h=c.skeleton;n.get(h)!==u&&(h.update(),n.set(h,u))}return l}function a(){n=new WeakMap}function o(c){const u=c.target;u.removeEventListener("dispose",o),t.remove(u.instanceMatrix),u.instanceColor!==null&&t.remove(u.instanceColor)}return{update:r,dispose:a}}class _d extends bt{constructor(e,t,i,n,r,a,o,c,u,d=Rs){if(d!==Rs&&d!==Fs)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");i===void 0&&d===Rs&&(i=$n),i===void 0&&d===Fs&&(i=Ns),super(null,n,r,a,o,c,d,i,u),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=o!==void 0?o:At,this.minFilter=c!==void 0?c:At,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}const vd=new bt,Rh=new _d(1,1),xd=new rd,yd=new Fg,bd=new fd,Ph=[],Lh=[],Dh=new Float32Array(16),Ih=new Float32Array(9),kh=new Float32Array(4);function js(s,e,t){const i=s[0];if(i<=0||i>0)return s;const n=e*t;let r=Ph[n];if(r===void 0&&(r=new Float32Array(n),Ph[n]=r),e!==0){i.toArray(r,0);for(let a=1,o=0;a!==e;++a)o+=t,s[a].toArray(r,o)}return r}function wt(s,e){if(s.length!==e.length)return!1;for(let t=0,i=s.length;t<i;t++)if(s[t]!==e[t])return!1;return!0}function St(s,e){for(let t=0,i=e.length;t<i;t++)s[t]=e[t]}function $a(s,e){let t=Lh[e];t===void 0&&(t=new Int32Array(e),Lh[e]=t);for(let i=0;i!==e;++i)t[i]=s.allocateTextureUnit();return t}function Jv(s,e){const t=this.cache;t[0]!==e&&(s.uniform1f(this.addr,e),t[0]=e)}function $v(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wt(t,e))return;s.uniform2fv(this.addr,e),St(t,e)}}function ex(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(s.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(wt(t,e))return;s.uniform3fv(this.addr,e),St(t,e)}}function tx(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wt(t,e))return;s.uniform4fv(this.addr,e),St(t,e)}}function ix(s,e){const t=this.cache,i=e.elements;if(i===void 0){if(wt(t,e))return;s.uniformMatrix2fv(this.addr,!1,e),St(t,e)}else{if(wt(t,i))return;kh.set(i),s.uniformMatrix2fv(this.addr,!1,kh),St(t,i)}}function nx(s,e){const t=this.cache,i=e.elements;if(i===void 0){if(wt(t,e))return;s.uniformMatrix3fv(this.addr,!1,e),St(t,e)}else{if(wt(t,i))return;Ih.set(i),s.uniformMatrix3fv(this.addr,!1,Ih),St(t,i)}}function sx(s,e){const t=this.cache,i=e.elements;if(i===void 0){if(wt(t,e))return;s.uniformMatrix4fv(this.addr,!1,e),St(t,e)}else{if(wt(t,i))return;Dh.set(i),s.uniformMatrix4fv(this.addr,!1,Dh),St(t,i)}}function rx(s,e){const t=this.cache;t[0]!==e&&(s.uniform1i(this.addr,e),t[0]=e)}function ax(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wt(t,e))return;s.uniform2iv(this.addr,e),St(t,e)}}function ox(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(wt(t,e))return;s.uniform3iv(this.addr,e),St(t,e)}}function lx(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wt(t,e))return;s.uniform4iv(this.addr,e),St(t,e)}}function cx(s,e){const t=this.cache;t[0]!==e&&(s.uniform1ui(this.addr,e),t[0]=e)}function hx(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wt(t,e))return;s.uniform2uiv(this.addr,e),St(t,e)}}function ux(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(wt(t,e))return;s.uniform3uiv(this.addr,e),St(t,e)}}function dx(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wt(t,e))return;s.uniform4uiv(this.addr,e),St(t,e)}}function fx(s,e,t){const i=this.cache,n=t.allocateTextureUnit();i[0]!==n&&(s.uniform1i(this.addr,n),i[0]=n);let r;this.type===s.SAMPLER_2D_SHADOW?(Rh.compareFunction=id,r=Rh):r=vd,t.setTexture2D(e||r,n)}function px(s,e,t){const i=this.cache,n=t.allocateTextureUnit();i[0]!==n&&(s.uniform1i(this.addr,n),i[0]=n),t.setTexture3D(e||yd,n)}function mx(s,e,t){const i=this.cache,n=t.allocateTextureUnit();i[0]!==n&&(s.uniform1i(this.addr,n),i[0]=n),t.setTextureCube(e||bd,n)}function gx(s,e,t){const i=this.cache,n=t.allocateTextureUnit();i[0]!==n&&(s.uniform1i(this.addr,n),i[0]=n),t.setTexture2DArray(e||xd,n)}function _x(s){switch(s){case 5126:return Jv;case 35664:return $v;case 35665:return ex;case 35666:return tx;case 35674:return ix;case 35675:return nx;case 35676:return sx;case 5124:case 35670:return rx;case 35667:case 35671:return ax;case 35668:case 35672:return ox;case 35669:case 35673:return lx;case 5125:return cx;case 36294:return hx;case 36295:return ux;case 36296:return dx;case 35678:case 36198:case 36298:case 36306:case 35682:return fx;case 35679:case 36299:case 36307:return px;case 35680:case 36300:case 36308:case 36293:return mx;case 36289:case 36303:case 36311:case 36292:return gx}}function vx(s,e){s.uniform1fv(this.addr,e)}function xx(s,e){const t=js(e,this.size,2);s.uniform2fv(this.addr,t)}function yx(s,e){const t=js(e,this.size,3);s.uniform3fv(this.addr,t)}function bx(s,e){const t=js(e,this.size,4);s.uniform4fv(this.addr,t)}function wx(s,e){const t=js(e,this.size,4);s.uniformMatrix2fv(this.addr,!1,t)}function Sx(s,e){const t=js(e,this.size,9);s.uniformMatrix3fv(this.addr,!1,t)}function Mx(s,e){const t=js(e,this.size,16);s.uniformMatrix4fv(this.addr,!1,t)}function Tx(s,e){s.uniform1iv(this.addr,e)}function Ax(s,e){s.uniform2iv(this.addr,e)}function Ex(s,e){s.uniform3iv(this.addr,e)}function Cx(s,e){s.uniform4iv(this.addr,e)}function Rx(s,e){s.uniform1uiv(this.addr,e)}function Px(s,e){s.uniform2uiv(this.addr,e)}function Lx(s,e){s.uniform3uiv(this.addr,e)}function Dx(s,e){s.uniform4uiv(this.addr,e)}function Ix(s,e,t){const i=this.cache,n=e.length,r=$a(t,n);wt(i,r)||(s.uniform1iv(this.addr,r),St(i,r));for(let a=0;a!==n;++a)t.setTexture2D(e[a]||vd,r[a])}function kx(s,e,t){const i=this.cache,n=e.length,r=$a(t,n);wt(i,r)||(s.uniform1iv(this.addr,r),St(i,r));for(let a=0;a!==n;++a)t.setTexture3D(e[a]||yd,r[a])}function Ux(s,e,t){const i=this.cache,n=e.length,r=$a(t,n);wt(i,r)||(s.uniform1iv(this.addr,r),St(i,r));for(let a=0;a!==n;++a)t.setTextureCube(e[a]||bd,r[a])}function Ox(s,e,t){const i=this.cache,n=e.length,r=$a(t,n);wt(i,r)||(s.uniform1iv(this.addr,r),St(i,r));for(let a=0;a!==n;++a)t.setTexture2DArray(e[a]||xd,r[a])}function Nx(s){switch(s){case 5126:return vx;case 35664:return xx;case 35665:return yx;case 35666:return bx;case 35674:return wx;case 35675:return Sx;case 35676:return Mx;case 5124:case 35670:return Tx;case 35667:case 35671:return Ax;case 35668:case 35672:return Ex;case 35669:case 35673:return Cx;case 5125:return Rx;case 36294:return Px;case 36295:return Lx;case 36296:return Dx;case 35678:case 36198:case 36298:case 36306:case 35682:return Ix;case 35679:case 36299:case 36307:return kx;case 35680:case 36300:case 36308:case 36293:return Ux;case 36289:case 36303:case 36311:case 36292:return Ox}}class Fx{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=_x(t.type)}}class Bx{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Nx(t.type)}}class zx{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const n=this.seq;for(let r=0,a=n.length;r!==a;++r){const o=n[r];o.setValue(e,t[o.id],i)}}}const Fo=/(\w+)(\])?(\[|\.)?/g;function Uh(s,e){s.seq.push(e),s.map[e.id]=e}function Hx(s,e,t){const i=s.name,n=i.length;for(Fo.lastIndex=0;;){const r=Fo.exec(i),a=Fo.lastIndex;let o=r[1];const c=r[2]==="]",u=r[3];if(c&&(o=o|0),u===void 0||u==="["&&a+2===n){Uh(t,u===void 0?new Fx(o,s,e):new Bx(o,s,e));break}else{let l=t.map[o];l===void 0&&(l=new zx(o),Uh(t,l)),t=l}}}class Ra{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let n=0;n<i;++n){const r=e.getActiveUniform(t,n),a=e.getUniformLocation(t,r.name);Hx(r,a,this)}}setValue(e,t,i,n){const r=this.map[t];r!==void 0&&r.setValue(e,i,n)}setOptional(e,t,i){const n=t[i];n!==void 0&&this.setValue(e,i,n)}static upload(e,t,i,n){for(let r=0,a=t.length;r!==a;++r){const o=t[r],c=i[o.id];c.needsUpdate!==!1&&o.setValue(e,c.value,n)}}static seqWithValue(e,t){const i=[];for(let n=0,r=e.length;n!==r;++n){const a=e[n];a.id in t&&i.push(a)}return i}}function Oh(s,e,t){const i=s.createShader(e);return s.shaderSource(i,t),s.compileShader(i),i}const Gx=37297;let Vx=0;function Wx(s,e){const t=s.split(`
`),i=[],n=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let a=n;a<r;a++){const o=a+1;i.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return i.join(`
`)}function qx(s){const e=Ye.getPrimaries(Ye.workingColorSpace),t=Ye.getPrimaries(s);let i;switch(e===t?i="":e===Na&&t===Oa?i="LinearDisplayP3ToLinearSRGB":e===Oa&&t===Na&&(i="LinearSRGBToLinearDisplayP3"),s){case An:case Qa:return[i,"LinearTransferOETF"];case yt:case vc:return[i,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space:",s),[i,"LinearTransferOETF"]}}function Nh(s,e,t){const i=s.getShaderParameter(e,s.COMPILE_STATUS),n=s.getShaderInfoLog(e).trim();if(i&&n==="")return"";const r=/ERROR: 0:(\d+)/.exec(n);if(r){const a=parseInt(r[1]);return t.toUpperCase()+`

`+n+`

`+Wx(s.getShaderSource(e),a)}else return n}function Xx(s,e){const t=qx(e);return`vec4 ${s}( vec4 value ) { return ${t[0]}( ${t[1]}( value ) ); }`}function Yx(s,e){let t;switch(e){case Bu:t="Linear";break;case zu:t="Reinhard";break;case Hu:t="Cineon";break;case uc:t="ACESFilmic";break;case Gu:t="AgX";break;case Vu:t="Neutral";break;case tg:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+s+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const sa=new z;function jx(){Ye.getLuminanceCoefficients(sa);const s=sa.x.toFixed(4),e=sa.y.toFixed(4),t=sa.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Kx(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(or).join(`
`)}function Zx(s){const e=[];for(const t in s){const i=s[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function Qx(s,e){const t={},i=s.getProgramParameter(e,s.ACTIVE_ATTRIBUTES);for(let n=0;n<i;n++){const r=s.getActiveAttrib(e,n),a=r.name;let o=1;r.type===s.FLOAT_MAT2&&(o=2),r.type===s.FLOAT_MAT3&&(o=3),r.type===s.FLOAT_MAT4&&(o=4),t[a]={type:r.type,location:s.getAttribLocation(e,a),locationSize:o}}return t}function or(s){return s!==""}function Fh(s,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return s.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Bh(s,e){return s.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Jx=/^[ \t]*#include +<([\w\d./]+)>/gm;function ql(s){return s.replace(Jx,ey)}const $x=new Map;function ey(s,e){let t=ke[e];if(t===void 0){const i=$x.get(e);if(i!==void 0)t=ke[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return ql(t)}const ty=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function zh(s){return s.replace(ty,iy)}function iy(s,e,t,i){let n="";for(let r=parseInt(e);r<parseInt(t);r++)n+=i.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return n}function Hh(s){let e=`precision ${s.precision} float;
	precision ${s.precision} int;
	precision ${s.precision} sampler2D;
	precision ${s.precision} samplerCube;
	precision ${s.precision} sampler3D;
	precision ${s.precision} sampler2DArray;
	precision ${s.precision} sampler2DShadow;
	precision ${s.precision} samplerCubeShadow;
	precision ${s.precision} sampler2DArrayShadow;
	precision ${s.precision} isampler2D;
	precision ${s.precision} isampler3D;
	precision ${s.precision} isamplerCube;
	precision ${s.precision} isampler2DArray;
	precision ${s.precision} usampler2D;
	precision ${s.precision} usampler3D;
	precision ${s.precision} usamplerCube;
	precision ${s.precision} usampler2DArray;
	`;return s.precision==="highp"?e+=`
#define HIGH_PRECISION`:s.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:s.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function ny(s){let e="SHADOWMAP_TYPE_BASIC";return s.shadowMapType===Nu?e="SHADOWMAP_TYPE_PCF":s.shadowMapType===km?e="SHADOWMAP_TYPE_PCF_SOFT":s.shadowMapType===Hi&&(e="SHADOWMAP_TYPE_VSM"),e}function sy(s){let e="ENVMAP_TYPE_CUBE";if(s.envMap)switch(s.envMapMode){case Us:case Os:e="ENVMAP_TYPE_CUBE";break;case Za:e="ENVMAP_TYPE_CUBE_UV";break}return e}function ry(s){let e="ENVMAP_MODE_REFLECTION";if(s.envMap)switch(s.envMapMode){case Os:e="ENVMAP_MODE_REFRACTION";break}return e}function ay(s){let e="ENVMAP_BLENDING_NONE";if(s.envMap)switch(s.combine){case Fu:e="ENVMAP_BLENDING_MULTIPLY";break;case $m:e="ENVMAP_BLENDING_MIX";break;case eg:e="ENVMAP_BLENDING_ADD";break}return e}function oy(s){const e=s.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:i,maxMip:t}}function ly(s,e,t,i){const n=s.getContext(),r=t.defines;let a=t.vertexShader,o=t.fragmentShader;const c=ny(t),u=sy(t),d=ry(t),l=ay(t),h=oy(t),f=Kx(t),g=Zx(r),_=n.createProgram();let p,m,x=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(or).join(`
`),p.length>0&&(p+=`
`),m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(or).join(`
`),m.length>0&&(m+=`
`)):(p=[Hh(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+d:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(or).join(`
`),m=[Hh(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.envMap?"#define "+d:"",t.envMap?"#define "+l:"",h?"#define CUBEUV_TEXEL_WIDTH "+h.texelWidth:"",h?"#define CUBEUV_TEXEL_HEIGHT "+h.texelHeight:"",h?"#define CUBEUV_MAX_MIP "+h.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==_n?"#define TONE_MAPPING":"",t.toneMapping!==_n?ke.tonemapping_pars_fragment:"",t.toneMapping!==_n?Yx("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",ke.colorspace_pars_fragment,Xx("linearToOutputTexel",t.outputColorSpace),jx(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(or).join(`
`)),a=ql(a),a=Fh(a,t),a=Bh(a,t),o=ql(o),o=Fh(o,t),o=Bh(o,t),a=zh(a),o=zh(o),t.isRawShaderMaterial!==!0&&(x=`#version 300 es
`,p=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,m=["#define varying in",t.glslVersion===nh?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===nh?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);const y=x+p+a,b=x+m+o,C=Oh(n,n.VERTEX_SHADER,y),E=Oh(n,n.FRAGMENT_SHADER,b);n.attachShader(_,C),n.attachShader(_,E),t.index0AttributeName!==void 0?n.bindAttribLocation(_,0,t.index0AttributeName):t.morphTargets===!0&&n.bindAttribLocation(_,0,"position"),n.linkProgram(_);function A(S){if(s.debug.checkShaderErrors){const H=n.getProgramInfoLog(_).trim(),F=n.getShaderInfoLog(C).trim(),P=n.getShaderInfoLog(E).trim();let B=!0,O=!0;if(n.getProgramParameter(_,n.LINK_STATUS)===!1)if(B=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(n,_,C,E);else{const j=Nh(n,C,"vertex"),V=Nh(n,E,"fragment");console.error("THREE.WebGLProgram: Shader Error "+n.getError()+" - VALIDATE_STATUS "+n.getProgramParameter(_,n.VALIDATE_STATUS)+`

Material Name: `+S.name+`
Material Type: `+S.type+`

Program Info Log: `+H+`
`+j+`
`+V)}else H!==""?console.warn("THREE.WebGLProgram: Program Info Log:",H):(F===""||P==="")&&(O=!1);O&&(S.diagnostics={runnable:B,programLog:H,vertexShader:{log:F,prefix:p},fragmentShader:{log:P,prefix:m}})}n.deleteShader(C),n.deleteShader(E),L=new Ra(n,_),D=Qx(n,_)}let L;this.getUniforms=function(){return L===void 0&&A(this),L};let D;this.getAttributes=function(){return D===void 0&&A(this),D};let v=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return v===!1&&(v=n.getProgramParameter(_,Gx)),v},this.destroy=function(){i.releaseStatesOfProgram(this),n.deleteProgram(_),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Vx++,this.cacheKey=e,this.usedTimes=1,this.program=_,this.vertexShader=C,this.fragmentShader=E,this}let cy=0;class hy{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,i=e.fragmentShader,n=this._getShaderStage(t),r=this._getShaderStage(i),a=this._getShaderCacheForMaterial(e);return a.has(n)===!1&&(a.add(n),n.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){const t=this.shaderCache;let i=t.get(e);return i===void 0&&(i=new uy(e),t.set(e,i)),i}}class uy{constructor(e){this.id=cy++,this.code=e,this.usedTimes=0}}function dy(s,e,t,i,n,r,a){const o=new od,c=new hy,u=new Set,d=[],l=n.logarithmicDepthBuffer,h=n.reverseDepthBuffer,f=n.vertexTextures;let g=n.precision;const _={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function p(v){return u.add(v),v===0?"uv":`uv${v}`}function m(v,S,H,F,P){const B=F.fog,O=P.geometry,j=v.isMeshStandardMaterial?F.environment:null,V=(v.isMeshStandardMaterial?t:e).get(v.envMap||j),se=V&&V.mapping===Za?V.image.height:null,ee=_[v.type];v.precision!==null&&(g=n.getMaxPrecision(v.precision),g!==v.precision&&console.warn("THREE.WebGLProgram.getParameters:",v.precision,"not supported, using",g,"instead."));const ce=O.morphAttributes.position||O.morphAttributes.normal||O.morphAttributes.color,Ie=ce!==void 0?ce.length:0;let Oe=0;O.morphAttributes.position!==void 0&&(Oe=1),O.morphAttributes.normal!==void 0&&(Oe=2),O.morphAttributes.color!==void 0&&(Oe=3);let Y,J,_e,de;if(ee){const Wt=Ri[ee];Y=Wt.vertexShader,J=Wt.fragmentShader}else Y=v.vertexShader,J=v.fragmentShader,c.update(v),_e=c.getVertexShaderID(v),de=c.getFragmentShaderID(v);const Le=s.getRenderTarget(),Me=P.isInstancedMesh===!0,ze=P.isBatchedMesh===!0,$e=!!v.map,He=!!v.matcap,I=!!V,Jt=!!v.aoMap,Fe=!!v.lightMap,Ve=!!v.bumpMap,Ae=!!v.normalMap,st=!!v.displacementMap,Re=!!v.emissiveMap,R=!!v.metalnessMap,w=!!v.roughnessMap,G=v.anisotropy>0,Z=v.clearcoat>0,$=v.dispersion>0,K=v.iridescence>0,xe=v.sheen>0,ae=v.transmission>0,fe=G&&!!v.anisotropyMap,We=Z&&!!v.clearcoatMap,ie=Z&&!!v.clearcoatNormalMap,pe=Z&&!!v.clearcoatRoughnessMap,Ee=K&&!!v.iridescenceMap,Ce=K&&!!v.iridescenceThicknessMap,me=xe&&!!v.sheenColorMap,Be=xe&&!!v.sheenRoughnessMap,De=!!v.specularMap,it=!!v.specularColorMap,k=!!v.specularIntensityMap,he=ae&&!!v.transmissionMap,X=ae&&!!v.thicknessMap,Q=!!v.gradientMap,oe=!!v.alphaMap,ue=v.alphaTest>0,Ge=!!v.alphaHash,_t=!!v.extensions;let Vt=_n;v.toneMapped&&(Le===null||Le.isXRRenderTarget===!0)&&(Vt=s.toneMapping);const Xe={shaderID:ee,shaderType:v.type,shaderName:v.name,vertexShader:Y,fragmentShader:J,defines:v.defines,customVertexShaderID:_e,customFragmentShaderID:de,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:g,batching:ze,batchingColor:ze&&P._colorsTexture!==null,instancing:Me,instancingColor:Me&&P.instanceColor!==null,instancingMorph:Me&&P.morphTexture!==null,supportsVertexTextures:f,outputColorSpace:Le===null?s.outputColorSpace:Le.isXRRenderTarget===!0?Le.texture.colorSpace:An,alphaToCoverage:!!v.alphaToCoverage,map:$e,matcap:He,envMap:I,envMapMode:I&&V.mapping,envMapCubeUVHeight:se,aoMap:Jt,lightMap:Fe,bumpMap:Ve,normalMap:Ae,displacementMap:f&&st,emissiveMap:Re,normalMapObjectSpace:Ae&&v.normalMapType===rg,normalMapTangentSpace:Ae&&v.normalMapType===sg,metalnessMap:R,roughnessMap:w,anisotropy:G,anisotropyMap:fe,clearcoat:Z,clearcoatMap:We,clearcoatNormalMap:ie,clearcoatRoughnessMap:pe,dispersion:$,iridescence:K,iridescenceMap:Ee,iridescenceThicknessMap:Ce,sheen:xe,sheenColorMap:me,sheenRoughnessMap:Be,specularMap:De,specularColorMap:it,specularIntensityMap:k,transmission:ae,transmissionMap:he,thicknessMap:X,gradientMap:Q,opaque:v.transparent===!1&&v.blending===jn&&v.alphaToCoverage===!1,alphaMap:oe,alphaTest:ue,alphaHash:Ge,combine:v.combine,mapUv:$e&&p(v.map.channel),aoMapUv:Jt&&p(v.aoMap.channel),lightMapUv:Fe&&p(v.lightMap.channel),bumpMapUv:Ve&&p(v.bumpMap.channel),normalMapUv:Ae&&p(v.normalMap.channel),displacementMapUv:st&&p(v.displacementMap.channel),emissiveMapUv:Re&&p(v.emissiveMap.channel),metalnessMapUv:R&&p(v.metalnessMap.channel),roughnessMapUv:w&&p(v.roughnessMap.channel),anisotropyMapUv:fe&&p(v.anisotropyMap.channel),clearcoatMapUv:We&&p(v.clearcoatMap.channel),clearcoatNormalMapUv:ie&&p(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:pe&&p(v.clearcoatRoughnessMap.channel),iridescenceMapUv:Ee&&p(v.iridescenceMap.channel),iridescenceThicknessMapUv:Ce&&p(v.iridescenceThicknessMap.channel),sheenColorMapUv:me&&p(v.sheenColorMap.channel),sheenRoughnessMapUv:Be&&p(v.sheenRoughnessMap.channel),specularMapUv:De&&p(v.specularMap.channel),specularColorMapUv:it&&p(v.specularColorMap.channel),specularIntensityMapUv:k&&p(v.specularIntensityMap.channel),transmissionMapUv:he&&p(v.transmissionMap.channel),thicknessMapUv:X&&p(v.thicknessMap.channel),alphaMapUv:oe&&p(v.alphaMap.channel),vertexTangents:!!O.attributes.tangent&&(Ae||G),vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!O.attributes.color&&O.attributes.color.itemSize===4,pointsUvs:P.isPoints===!0&&!!O.attributes.uv&&($e||oe),fog:!!B,useFog:v.fog===!0,fogExp2:!!B&&B.isFogExp2,flatShading:v.flatShading===!0,sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:l,reverseDepthBuffer:h,skinning:P.isSkinnedMesh===!0,morphTargets:O.morphAttributes.position!==void 0,morphNormals:O.morphAttributes.normal!==void 0,morphColors:O.morphAttributes.color!==void 0,morphTargetsCount:Ie,morphTextureStride:Oe,numDirLights:S.directional.length,numPointLights:S.point.length,numSpotLights:S.spot.length,numSpotLightMaps:S.spotLightMap.length,numRectAreaLights:S.rectArea.length,numHemiLights:S.hemi.length,numDirLightShadows:S.directionalShadowMap.length,numPointLightShadows:S.pointShadowMap.length,numSpotLightShadows:S.spotShadowMap.length,numSpotLightShadowsWithMaps:S.numSpotLightShadowsWithMaps,numLightProbes:S.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:v.dithering,shadowMapEnabled:s.shadowMap.enabled&&H.length>0,shadowMapType:s.shadowMap.type,toneMapping:Vt,decodeVideoTexture:$e&&v.map.isVideoTexture===!0&&Ye.getTransfer(v.map.colorSpace)===nt,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===Wi,flipSided:v.side===Xt,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:_t&&v.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(_t&&v.extensions.multiDraw===!0||ze)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return Xe.vertexUv1s=u.has(1),Xe.vertexUv2s=u.has(2),Xe.vertexUv3s=u.has(3),u.clear(),Xe}function x(v){const S=[];if(v.shaderID?S.push(v.shaderID):(S.push(v.customVertexShaderID),S.push(v.customFragmentShaderID)),v.defines!==void 0)for(const H in v.defines)S.push(H),S.push(v.defines[H]);return v.isRawShaderMaterial===!1&&(y(S,v),b(S,v),S.push(s.outputColorSpace)),S.push(v.customProgramCacheKey),S.join()}function y(v,S){v.push(S.precision),v.push(S.outputColorSpace),v.push(S.envMapMode),v.push(S.envMapCubeUVHeight),v.push(S.mapUv),v.push(S.alphaMapUv),v.push(S.lightMapUv),v.push(S.aoMapUv),v.push(S.bumpMapUv),v.push(S.normalMapUv),v.push(S.displacementMapUv),v.push(S.emissiveMapUv),v.push(S.metalnessMapUv),v.push(S.roughnessMapUv),v.push(S.anisotropyMapUv),v.push(S.clearcoatMapUv),v.push(S.clearcoatNormalMapUv),v.push(S.clearcoatRoughnessMapUv),v.push(S.iridescenceMapUv),v.push(S.iridescenceThicknessMapUv),v.push(S.sheenColorMapUv),v.push(S.sheenRoughnessMapUv),v.push(S.specularMapUv),v.push(S.specularColorMapUv),v.push(S.specularIntensityMapUv),v.push(S.transmissionMapUv),v.push(S.thicknessMapUv),v.push(S.combine),v.push(S.fogExp2),v.push(S.sizeAttenuation),v.push(S.morphTargetsCount),v.push(S.morphAttributeCount),v.push(S.numDirLights),v.push(S.numPointLights),v.push(S.numSpotLights),v.push(S.numSpotLightMaps),v.push(S.numHemiLights),v.push(S.numRectAreaLights),v.push(S.numDirLightShadows),v.push(S.numPointLightShadows),v.push(S.numSpotLightShadows),v.push(S.numSpotLightShadowsWithMaps),v.push(S.numLightProbes),v.push(S.shadowMapType),v.push(S.toneMapping),v.push(S.numClippingPlanes),v.push(S.numClipIntersection),v.push(S.depthPacking)}function b(v,S){o.disableAll(),S.supportsVertexTextures&&o.enable(0),S.instancing&&o.enable(1),S.instancingColor&&o.enable(2),S.instancingMorph&&o.enable(3),S.matcap&&o.enable(4),S.envMap&&o.enable(5),S.normalMapObjectSpace&&o.enable(6),S.normalMapTangentSpace&&o.enable(7),S.clearcoat&&o.enable(8),S.iridescence&&o.enable(9),S.alphaTest&&o.enable(10),S.vertexColors&&o.enable(11),S.vertexAlphas&&o.enable(12),S.vertexUv1s&&o.enable(13),S.vertexUv2s&&o.enable(14),S.vertexUv3s&&o.enable(15),S.vertexTangents&&o.enable(16),S.anisotropy&&o.enable(17),S.alphaHash&&o.enable(18),S.batching&&o.enable(19),S.dispersion&&o.enable(20),S.batchingColor&&o.enable(21),v.push(o.mask),o.disableAll(),S.fog&&o.enable(0),S.useFog&&o.enable(1),S.flatShading&&o.enable(2),S.logarithmicDepthBuffer&&o.enable(3),S.reverseDepthBuffer&&o.enable(4),S.skinning&&o.enable(5),S.morphTargets&&o.enable(6),S.morphNormals&&o.enable(7),S.morphColors&&o.enable(8),S.premultipliedAlpha&&o.enable(9),S.shadowMapEnabled&&o.enable(10),S.doubleSided&&o.enable(11),S.flipSided&&o.enable(12),S.useDepthPacking&&o.enable(13),S.dithering&&o.enable(14),S.transmission&&o.enable(15),S.sheen&&o.enable(16),S.opaque&&o.enable(17),S.pointsUvs&&o.enable(18),S.decodeVideoTexture&&o.enable(19),S.alphaToCoverage&&o.enable(20),v.push(o.mask)}function C(v){const S=_[v.type];let H;if(S){const F=Ri[S];H=Zi.clone(F.uniforms)}else H=v.uniforms;return H}function E(v,S){let H;for(let F=0,P=d.length;F<P;F++){const B=d[F];if(B.cacheKey===S){H=B,++H.usedTimes;break}}return H===void 0&&(H=new ly(s,S,v,r),d.push(H)),H}function A(v){if(--v.usedTimes===0){const S=d.indexOf(v);d[S]=d[d.length-1],d.pop(),v.destroy()}}function L(v){c.remove(v)}function D(){c.dispose()}return{getParameters:m,getProgramCacheKey:x,getUniforms:C,acquireProgram:E,releaseProgram:A,releaseShaderCache:L,programs:d,dispose:D}}function fy(){let s=new WeakMap;function e(a){return s.has(a)}function t(a){let o=s.get(a);return o===void 0&&(o={},s.set(a,o)),o}function i(a){s.delete(a)}function n(a,o,c){s.get(a)[o]=c}function r(){s=new WeakMap}return{has:e,get:t,remove:i,update:n,dispose:r}}function py(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.material.id!==e.material.id?s.material.id-e.material.id:s.z!==e.z?s.z-e.z:s.id-e.id}function Gh(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.z!==e.z?e.z-s.z:s.id-e.id}function Vh(){const s=[];let e=0;const t=[],i=[],n=[];function r(){e=0,t.length=0,i.length=0,n.length=0}function a(l,h,f,g,_,p){let m=s[e];return m===void 0?(m={id:l.id,object:l,geometry:h,material:f,groupOrder:g,renderOrder:l.renderOrder,z:_,group:p},s[e]=m):(m.id=l.id,m.object=l,m.geometry=h,m.material=f,m.groupOrder=g,m.renderOrder=l.renderOrder,m.z=_,m.group=p),e++,m}function o(l,h,f,g,_,p){const m=a(l,h,f,g,_,p);f.transmission>0?i.push(m):f.transparent===!0?n.push(m):t.push(m)}function c(l,h,f,g,_,p){const m=a(l,h,f,g,_,p);f.transmission>0?i.unshift(m):f.transparent===!0?n.unshift(m):t.unshift(m)}function u(l,h){t.length>1&&t.sort(l||py),i.length>1&&i.sort(h||Gh),n.length>1&&n.sort(h||Gh)}function d(){for(let l=e,h=s.length;l<h;l++){const f=s[l];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:t,transmissive:i,transparent:n,init:r,push:o,unshift:c,finish:d,sort:u}}function my(){let s=new WeakMap;function e(i,n){const r=s.get(i);let a;return r===void 0?(a=new Vh,s.set(i,[a])):n>=r.length?(a=new Vh,r.push(a)):a=r[n],a}function t(){s=new WeakMap}return{get:e,dispose:t}}function gy(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new z,color:new Pe};break;case"SpotLight":t={position:new z,direction:new z,color:new Pe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new z,color:new Pe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new z,skyColor:new Pe,groundColor:new Pe};break;case"RectAreaLight":t={color:new Pe,position:new z,halfWidth:new z,halfHeight:new z};break}return s[e.id]=t,t}}}function _y(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[e.id]=t,t}}}let vy=0;function xy(s,e){return(e.castShadow?2:0)-(s.castShadow?2:0)+(e.map?1:0)-(s.map?1:0)}function yy(s){const e=new gy,t=_y(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let u=0;u<9;u++)i.probe.push(new z);const n=new z,r=new dt,a=new dt;function o(u){let d=0,l=0,h=0;for(let D=0;D<9;D++)i.probe[D].set(0,0,0);let f=0,g=0,_=0,p=0,m=0,x=0,y=0,b=0,C=0,E=0,A=0;u.sort(xy);for(let D=0,v=u.length;D<v;D++){const S=u[D],H=S.color,F=S.intensity,P=S.distance,B=S.shadow&&S.shadow.map?S.shadow.map.texture:null;if(S.isAmbientLight)d+=H.r*F,l+=H.g*F,h+=H.b*F;else if(S.isLightProbe){for(let O=0;O<9;O++)i.probe[O].addScaledVector(S.sh.coefficients[O],F);A++}else if(S.isDirectionalLight){const O=e.get(S);if(O.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){const j=S.shadow,V=t.get(S);V.shadowIntensity=j.intensity,V.shadowBias=j.bias,V.shadowNormalBias=j.normalBias,V.shadowRadius=j.radius,V.shadowMapSize=j.mapSize,i.directionalShadow[f]=V,i.directionalShadowMap[f]=B,i.directionalShadowMatrix[f]=S.shadow.matrix,x++}i.directional[f]=O,f++}else if(S.isSpotLight){const O=e.get(S);O.position.setFromMatrixPosition(S.matrixWorld),O.color.copy(H).multiplyScalar(F),O.distance=P,O.coneCos=Math.cos(S.angle),O.penumbraCos=Math.cos(S.angle*(1-S.penumbra)),O.decay=S.decay,i.spot[_]=O;const j=S.shadow;if(S.map&&(i.spotLightMap[C]=S.map,C++,j.updateMatrices(S),S.castShadow&&E++),i.spotLightMatrix[_]=j.matrix,S.castShadow){const V=t.get(S);V.shadowIntensity=j.intensity,V.shadowBias=j.bias,V.shadowNormalBias=j.normalBias,V.shadowRadius=j.radius,V.shadowMapSize=j.mapSize,i.spotShadow[_]=V,i.spotShadowMap[_]=B,b++}_++}else if(S.isRectAreaLight){const O=e.get(S);O.color.copy(H).multiplyScalar(F),O.halfWidth.set(S.width*.5,0,0),O.halfHeight.set(0,S.height*.5,0),i.rectArea[p]=O,p++}else if(S.isPointLight){const O=e.get(S);if(O.color.copy(S.color).multiplyScalar(S.intensity),O.distance=S.distance,O.decay=S.decay,S.castShadow){const j=S.shadow,V=t.get(S);V.shadowIntensity=j.intensity,V.shadowBias=j.bias,V.shadowNormalBias=j.normalBias,V.shadowRadius=j.radius,V.shadowMapSize=j.mapSize,V.shadowCameraNear=j.camera.near,V.shadowCameraFar=j.camera.far,i.pointShadow[g]=V,i.pointShadowMap[g]=B,i.pointShadowMatrix[g]=S.shadow.matrix,y++}i.point[g]=O,g++}else if(S.isHemisphereLight){const O=e.get(S);O.skyColor.copy(S.color).multiplyScalar(F),O.groundColor.copy(S.groundColor).multiplyScalar(F),i.hemi[m]=O,m++}}p>0&&(s.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=re.LTC_FLOAT_1,i.rectAreaLTC2=re.LTC_FLOAT_2):(i.rectAreaLTC1=re.LTC_HALF_1,i.rectAreaLTC2=re.LTC_HALF_2)),i.ambient[0]=d,i.ambient[1]=l,i.ambient[2]=h;const L=i.hash;(L.directionalLength!==f||L.pointLength!==g||L.spotLength!==_||L.rectAreaLength!==p||L.hemiLength!==m||L.numDirectionalShadows!==x||L.numPointShadows!==y||L.numSpotShadows!==b||L.numSpotMaps!==C||L.numLightProbes!==A)&&(i.directional.length=f,i.spot.length=_,i.rectArea.length=p,i.point.length=g,i.hemi.length=m,i.directionalShadow.length=x,i.directionalShadowMap.length=x,i.pointShadow.length=y,i.pointShadowMap.length=y,i.spotShadow.length=b,i.spotShadowMap.length=b,i.directionalShadowMatrix.length=x,i.pointShadowMatrix.length=y,i.spotLightMatrix.length=b+C-E,i.spotLightMap.length=C,i.numSpotLightShadowsWithMaps=E,i.numLightProbes=A,L.directionalLength=f,L.pointLength=g,L.spotLength=_,L.rectAreaLength=p,L.hemiLength=m,L.numDirectionalShadows=x,L.numPointShadows=y,L.numSpotShadows=b,L.numSpotMaps=C,L.numLightProbes=A,i.version=vy++)}function c(u,d){let l=0,h=0,f=0,g=0,_=0;const p=d.matrixWorldInverse;for(let m=0,x=u.length;m<x;m++){const y=u[m];if(y.isDirectionalLight){const b=i.directional[l];b.direction.setFromMatrixPosition(y.matrixWorld),n.setFromMatrixPosition(y.target.matrixWorld),b.direction.sub(n),b.direction.transformDirection(p),l++}else if(y.isSpotLight){const b=i.spot[f];b.position.setFromMatrixPosition(y.matrixWorld),b.position.applyMatrix4(p),b.direction.setFromMatrixPosition(y.matrixWorld),n.setFromMatrixPosition(y.target.matrixWorld),b.direction.sub(n),b.direction.transformDirection(p),f++}else if(y.isRectAreaLight){const b=i.rectArea[g];b.position.setFromMatrixPosition(y.matrixWorld),b.position.applyMatrix4(p),a.identity(),r.copy(y.matrixWorld),r.premultiply(p),a.extractRotation(r),b.halfWidth.set(y.width*.5,0,0),b.halfHeight.set(0,y.height*.5,0),b.halfWidth.applyMatrix4(a),b.halfHeight.applyMatrix4(a),g++}else if(y.isPointLight){const b=i.point[h];b.position.setFromMatrixPosition(y.matrixWorld),b.position.applyMatrix4(p),h++}else if(y.isHemisphereLight){const b=i.hemi[_];b.direction.setFromMatrixPosition(y.matrixWorld),b.direction.transformDirection(p),_++}}}return{setup:o,setupView:c,state:i}}function Wh(s){const e=new yy(s),t=[],i=[];function n(d){u.camera=d,t.length=0,i.length=0}function r(d){t.push(d)}function a(d){i.push(d)}function o(){e.setup(t)}function c(d){e.setupView(t,d)}const u={lightsArray:t,shadowsArray:i,camera:null,lights:e,transmissionRenderTarget:{}};return{init:n,state:u,setupLights:o,setupLightsView:c,pushLight:r,pushShadow:a}}function by(s){let e=new WeakMap;function t(n,r=0){const a=e.get(n);let o;return a===void 0?(o=new Wh(s),e.set(n,[o])):r>=a.length?(o=new Wh(s),a.push(o)):o=a[r],o}function i(){e=new WeakMap}return{get:t,dispose:i}}class wd extends Ys{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=ng,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class wy extends Ys{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const Sy=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,My=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function Ty(s,e,t){let i=new pd;const n=new we,r=new we,a=new je,o=new wd({depthPacking:td}),c=new wy,u={},d=t.maxTextureSize,l={[yn]:Xt,[Xt]:yn,[Wi]:Wi},h=new gt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new we},radius:{value:4}},vertexShader:Sy,fragmentShader:My}),f=h.clone();f.defines.HORIZONTAL_PASS=1;const g=new Ai;g.setAttribute("position",new li(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const _=new zt(g,h),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Nu;let m=this.type;this.render=function(E,A,L){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||E.length===0)return;const D=s.getRenderTarget(),v=s.getActiveCubeFace(),S=s.getActiveMipmapLevel(),H=s.state;H.setBlending(Di),H.buffers.color.setClear(1,1,1,1),H.buffers.depth.setTest(!0),H.setScissorTest(!1);const F=m!==Hi&&this.type===Hi,P=m===Hi&&this.type!==Hi;for(let B=0,O=E.length;B<O;B++){const j=E[B],V=j.shadow;if(V===void 0){console.warn("THREE.WebGLShadowMap:",j,"has no shadow.");continue}if(V.autoUpdate===!1&&V.needsUpdate===!1)continue;n.copy(V.mapSize);const se=V.getFrameExtents();if(n.multiply(se),r.copy(V.mapSize),(n.x>d||n.y>d)&&(n.x>d&&(r.x=Math.floor(d/se.x),n.x=r.x*se.x,V.mapSize.x=r.x),n.y>d&&(r.y=Math.floor(d/se.y),n.y=r.y*se.y,V.mapSize.y=r.y)),V.map===null||F===!0||P===!0){const ce=this.type!==Hi?{minFilter:At,magFilter:At}:{};V.map!==null&&V.map.dispose(),V.map=new Ht(n.x,n.y,ce),V.map.texture.name=j.name+".shadowMap",V.camera.updateProjectionMatrix()}s.setRenderTarget(V.map),s.clear();const ee=V.getViewportCount();for(let ce=0;ce<ee;ce++){const Ie=V.getViewport(ce);a.set(r.x*Ie.x,r.y*Ie.y,r.x*Ie.z,r.y*Ie.w),H.viewport(a),V.updateMatrices(j,ce),i=V.getFrustum(),b(A,L,V.camera,j,this.type)}V.isPointLightShadow!==!0&&this.type===Hi&&x(V,L),V.needsUpdate=!1}m=this.type,p.needsUpdate=!1,s.setRenderTarget(D,v,S)};function x(E,A){const L=e.update(_);h.defines.VSM_SAMPLES!==E.blurSamples&&(h.defines.VSM_SAMPLES=E.blurSamples,f.defines.VSM_SAMPLES=E.blurSamples,h.needsUpdate=!0,f.needsUpdate=!0),E.mapPass===null&&(E.mapPass=new Ht(n.x,n.y)),h.uniforms.shadow_pass.value=E.map.texture,h.uniforms.resolution.value=E.mapSize,h.uniforms.radius.value=E.radius,s.setRenderTarget(E.mapPass),s.clear(),s.renderBufferDirect(A,null,L,h,_,null),f.uniforms.shadow_pass.value=E.mapPass.texture,f.uniforms.resolution.value=E.mapSize,f.uniforms.radius.value=E.radius,s.setRenderTarget(E.map),s.clear(),s.renderBufferDirect(A,null,L,f,_,null)}function y(E,A,L,D){let v=null;const S=L.isPointLight===!0?E.customDistanceMaterial:E.customDepthMaterial;if(S!==void 0)v=S;else if(v=L.isPointLight===!0?c:o,s.localClippingEnabled&&A.clipShadows===!0&&Array.isArray(A.clippingPlanes)&&A.clippingPlanes.length!==0||A.displacementMap&&A.displacementScale!==0||A.alphaMap&&A.alphaTest>0||A.map&&A.alphaTest>0){const H=v.uuid,F=A.uuid;let P=u[H];P===void 0&&(P={},u[H]=P);let B=P[F];B===void 0&&(B=v.clone(),P[F]=B,A.addEventListener("dispose",C)),v=B}if(v.visible=A.visible,v.wireframe=A.wireframe,D===Hi?v.side=A.shadowSide!==null?A.shadowSide:A.side:v.side=A.shadowSide!==null?A.shadowSide:l[A.side],v.alphaMap=A.alphaMap,v.alphaTest=A.alphaTest,v.map=A.map,v.clipShadows=A.clipShadows,v.clippingPlanes=A.clippingPlanes,v.clipIntersection=A.clipIntersection,v.displacementMap=A.displacementMap,v.displacementScale=A.displacementScale,v.displacementBias=A.displacementBias,v.wireframeLinewidth=A.wireframeLinewidth,v.linewidth=A.linewidth,L.isPointLight===!0&&v.isMeshDistanceMaterial===!0){const H=s.properties.get(v);H.light=L}return v}function b(E,A,L,D,v){if(E.visible===!1)return;if(E.layers.test(A.layers)&&(E.isMesh||E.isLine||E.isPoints)&&(E.castShadow||E.receiveShadow&&v===Hi)&&(!E.frustumCulled||i.intersectsObject(E))){E.modelViewMatrix.multiplyMatrices(L.matrixWorldInverse,E.matrixWorld);const F=e.update(E),P=E.material;if(Array.isArray(P)){const B=F.groups;for(let O=0,j=B.length;O<j;O++){const V=B[O],se=P[V.materialIndex];if(se&&se.visible){const ee=y(E,se,D,v);E.onBeforeShadow(s,E,A,L,F,ee,V),s.renderBufferDirect(L,null,F,ee,E,V),E.onAfterShadow(s,E,A,L,F,ee,V)}}}else if(P.visible){const B=y(E,P,D,v);E.onBeforeShadow(s,E,A,L,F,B,null),s.renderBufferDirect(L,null,F,B,E,null),E.onAfterShadow(s,E,A,L,F,B,null)}}const H=E.children;for(let F=0,P=H.length;F<P;F++)b(H[F],A,L,D,v)}function C(E){E.target.removeEventListener("dispose",C);for(const L in u){const D=u[L],v=E.target.uuid;v in D&&(D[v].dispose(),delete D[v])}}}const Ay={[ol]:ll,[cl]:dl,[hl]:fl,[ks]:ul,[ll]:ol,[dl]:cl,[fl]:hl,[ul]:ks};function Ey(s){function e(){let k=!1;const he=new je;let X=null;const Q=new je(0,0,0,0);return{setMask:function(oe){X!==oe&&!k&&(s.colorMask(oe,oe,oe,oe),X=oe)},setLocked:function(oe){k=oe},setClear:function(oe,ue,Ge,_t,Vt){Vt===!0&&(oe*=_t,ue*=_t,Ge*=_t),he.set(oe,ue,Ge,_t),Q.equals(he)===!1&&(s.clearColor(oe,ue,Ge,_t),Q.copy(he))},reset:function(){k=!1,X=null,Q.set(-1,0,0,0)}}}function t(){let k=!1,he=!1,X=null,Q=null,oe=null;return{setReversed:function(ue){he=ue},setTest:function(ue){ue?_e(s.DEPTH_TEST):de(s.DEPTH_TEST)},setMask:function(ue){X!==ue&&!k&&(s.depthMask(ue),X=ue)},setFunc:function(ue){if(he&&(ue=Ay[ue]),Q!==ue){switch(ue){case ol:s.depthFunc(s.NEVER);break;case ll:s.depthFunc(s.ALWAYS);break;case cl:s.depthFunc(s.LESS);break;case ks:s.depthFunc(s.LEQUAL);break;case hl:s.depthFunc(s.EQUAL);break;case ul:s.depthFunc(s.GEQUAL);break;case dl:s.depthFunc(s.GREATER);break;case fl:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}Q=ue}},setLocked:function(ue){k=ue},setClear:function(ue){oe!==ue&&(s.clearDepth(ue),oe=ue)},reset:function(){k=!1,X=null,Q=null,oe=null}}}function i(){let k=!1,he=null,X=null,Q=null,oe=null,ue=null,Ge=null,_t=null,Vt=null;return{setTest:function(Xe){k||(Xe?_e(s.STENCIL_TEST):de(s.STENCIL_TEST))},setMask:function(Xe){he!==Xe&&!k&&(s.stencilMask(Xe),he=Xe)},setFunc:function(Xe,Wt,ki){(X!==Xe||Q!==Wt||oe!==ki)&&(s.stencilFunc(Xe,Wt,ki),X=Xe,Q=Wt,oe=ki)},setOp:function(Xe,Wt,ki){(ue!==Xe||Ge!==Wt||_t!==ki)&&(s.stencilOp(Xe,Wt,ki),ue=Xe,Ge=Wt,_t=ki)},setLocked:function(Xe){k=Xe},setClear:function(Xe){Vt!==Xe&&(s.clearStencil(Xe),Vt=Xe)},reset:function(){k=!1,he=null,X=null,Q=null,oe=null,ue=null,Ge=null,_t=null,Vt=null}}}const n=new e,r=new t,a=new i,o=new WeakMap,c=new WeakMap;let u={},d={},l=new WeakMap,h=[],f=null,g=!1,_=null,p=null,m=null,x=null,y=null,b=null,C=null,E=new Pe(0,0,0),A=0,L=!1,D=null,v=null,S=null,H=null,F=null;const P=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let B=!1,O=0;const j=s.getParameter(s.VERSION);j.indexOf("WebGL")!==-1?(O=parseFloat(/^WebGL (\d)/.exec(j)[1]),B=O>=1):j.indexOf("OpenGL ES")!==-1&&(O=parseFloat(/^OpenGL ES (\d)/.exec(j)[1]),B=O>=2);let V=null,se={};const ee=s.getParameter(s.SCISSOR_BOX),ce=s.getParameter(s.VIEWPORT),Ie=new je().fromArray(ee),Oe=new je().fromArray(ce);function Y(k,he,X,Q){const oe=new Uint8Array(4),ue=s.createTexture();s.bindTexture(k,ue),s.texParameteri(k,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(k,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let Ge=0;Ge<X;Ge++)k===s.TEXTURE_3D||k===s.TEXTURE_2D_ARRAY?s.texImage3D(he,0,s.RGBA,1,1,Q,0,s.RGBA,s.UNSIGNED_BYTE,oe):s.texImage2D(he+Ge,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,oe);return ue}const J={};J[s.TEXTURE_2D]=Y(s.TEXTURE_2D,s.TEXTURE_2D,1),J[s.TEXTURE_CUBE_MAP]=Y(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),J[s.TEXTURE_2D_ARRAY]=Y(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),J[s.TEXTURE_3D]=Y(s.TEXTURE_3D,s.TEXTURE_3D,1,1),n.setClear(0,0,0,1),r.setClear(1),a.setClear(0),_e(s.DEPTH_TEST),r.setFunc(ks),Fe(!1),Ve($c),_e(s.CULL_FACE),I(Di);function _e(k){u[k]!==!0&&(s.enable(k),u[k]=!0)}function de(k){u[k]!==!1&&(s.disable(k),u[k]=!1)}function Le(k,he){return d[k]!==he?(s.bindFramebuffer(k,he),d[k]=he,k===s.DRAW_FRAMEBUFFER&&(d[s.FRAMEBUFFER]=he),k===s.FRAMEBUFFER&&(d[s.DRAW_FRAMEBUFFER]=he),!0):!1}function Me(k,he){let X=h,Q=!1;if(k){X=l.get(he),X===void 0&&(X=[],l.set(he,X));const oe=k.textures;if(X.length!==oe.length||X[0]!==s.COLOR_ATTACHMENT0){for(let ue=0,Ge=oe.length;ue<Ge;ue++)X[ue]=s.COLOR_ATTACHMENT0+ue;X.length=oe.length,Q=!0}}else X[0]!==s.BACK&&(X[0]=s.BACK,Q=!0);Q&&s.drawBuffers(X)}function ze(k){return f!==k?(s.useProgram(k),f=k,!0):!1}const $e={[Wn]:s.FUNC_ADD,[Om]:s.FUNC_SUBTRACT,[Nm]:s.FUNC_REVERSE_SUBTRACT};$e[Fm]=s.MIN,$e[Bm]=s.MAX;const He={[zm]:s.ZERO,[Hm]:s.ONE,[Gm]:s.SRC_COLOR,[rl]:s.SRC_ALPHA,[jm]:s.SRC_ALPHA_SATURATE,[Xm]:s.DST_COLOR,[Wm]:s.DST_ALPHA,[Vm]:s.ONE_MINUS_SRC_COLOR,[al]:s.ONE_MINUS_SRC_ALPHA,[Ym]:s.ONE_MINUS_DST_COLOR,[qm]:s.ONE_MINUS_DST_ALPHA,[Km]:s.CONSTANT_COLOR,[Zm]:s.ONE_MINUS_CONSTANT_COLOR,[Qm]:s.CONSTANT_ALPHA,[Jm]:s.ONE_MINUS_CONSTANT_ALPHA};function I(k,he,X,Q,oe,ue,Ge,_t,Vt,Xe){if(k===Di){g===!0&&(de(s.BLEND),g=!1);return}if(g===!1&&(_e(s.BLEND),g=!0),k!==Um){if(k!==_||Xe!==L){if((p!==Wn||y!==Wn)&&(s.blendEquation(s.FUNC_ADD),p=Wn,y=Wn),Xe)switch(k){case jn:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case ka:s.blendFunc(s.ONE,s.ONE);break;case eh:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case th:s.blendFuncSeparate(s.ZERO,s.SRC_COLOR,s.ZERO,s.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",k);break}else switch(k){case jn:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case ka:s.blendFunc(s.SRC_ALPHA,s.ONE);break;case eh:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case th:s.blendFunc(s.ZERO,s.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",k);break}m=null,x=null,b=null,C=null,E.set(0,0,0),A=0,_=k,L=Xe}return}oe=oe||he,ue=ue||X,Ge=Ge||Q,(he!==p||oe!==y)&&(s.blendEquationSeparate($e[he],$e[oe]),p=he,y=oe),(X!==m||Q!==x||ue!==b||Ge!==C)&&(s.blendFuncSeparate(He[X],He[Q],He[ue],He[Ge]),m=X,x=Q,b=ue,C=Ge),(_t.equals(E)===!1||Vt!==A)&&(s.blendColor(_t.r,_t.g,_t.b,Vt),E.copy(_t),A=Vt),_=k,L=!1}function Jt(k,he){k.side===Wi?de(s.CULL_FACE):_e(s.CULL_FACE);let X=k.side===Xt;he&&(X=!X),Fe(X),k.blending===jn&&k.transparent===!1?I(Di):I(k.blending,k.blendEquation,k.blendSrc,k.blendDst,k.blendEquationAlpha,k.blendSrcAlpha,k.blendDstAlpha,k.blendColor,k.blendAlpha,k.premultipliedAlpha),r.setFunc(k.depthFunc),r.setTest(k.depthTest),r.setMask(k.depthWrite),n.setMask(k.colorWrite);const Q=k.stencilWrite;a.setTest(Q),Q&&(a.setMask(k.stencilWriteMask),a.setFunc(k.stencilFunc,k.stencilRef,k.stencilFuncMask),a.setOp(k.stencilFail,k.stencilZFail,k.stencilZPass)),st(k.polygonOffset,k.polygonOffsetFactor,k.polygonOffsetUnits),k.alphaToCoverage===!0?_e(s.SAMPLE_ALPHA_TO_COVERAGE):de(s.SAMPLE_ALPHA_TO_COVERAGE)}function Fe(k){D!==k&&(k?s.frontFace(s.CW):s.frontFace(s.CCW),D=k)}function Ve(k){k!==Dm?(_e(s.CULL_FACE),k!==v&&(k===$c?s.cullFace(s.BACK):k===Im?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):de(s.CULL_FACE),v=k}function Ae(k){k!==S&&(B&&s.lineWidth(k),S=k)}function st(k,he,X){k?(_e(s.POLYGON_OFFSET_FILL),(H!==he||F!==X)&&(s.polygonOffset(he,X),H=he,F=X)):de(s.POLYGON_OFFSET_FILL)}function Re(k){k?_e(s.SCISSOR_TEST):de(s.SCISSOR_TEST)}function R(k){k===void 0&&(k=s.TEXTURE0+P-1),V!==k&&(s.activeTexture(k),V=k)}function w(k,he,X){X===void 0&&(V===null?X=s.TEXTURE0+P-1:X=V);let Q=se[X];Q===void 0&&(Q={type:void 0,texture:void 0},se[X]=Q),(Q.type!==k||Q.texture!==he)&&(V!==X&&(s.activeTexture(X),V=X),s.bindTexture(k,he||J[k]),Q.type=k,Q.texture=he)}function G(){const k=se[V];k!==void 0&&k.type!==void 0&&(s.bindTexture(k.type,null),k.type=void 0,k.texture=void 0)}function Z(){try{s.compressedTexImage2D.apply(s,arguments)}catch(k){console.error("THREE.WebGLState:",k)}}function $(){try{s.compressedTexImage3D.apply(s,arguments)}catch(k){console.error("THREE.WebGLState:",k)}}function K(){try{s.texSubImage2D.apply(s,arguments)}catch(k){console.error("THREE.WebGLState:",k)}}function xe(){try{s.texSubImage3D.apply(s,arguments)}catch(k){console.error("THREE.WebGLState:",k)}}function ae(){try{s.compressedTexSubImage2D.apply(s,arguments)}catch(k){console.error("THREE.WebGLState:",k)}}function fe(){try{s.compressedTexSubImage3D.apply(s,arguments)}catch(k){console.error("THREE.WebGLState:",k)}}function We(){try{s.texStorage2D.apply(s,arguments)}catch(k){console.error("THREE.WebGLState:",k)}}function ie(){try{s.texStorage3D.apply(s,arguments)}catch(k){console.error("THREE.WebGLState:",k)}}function pe(){try{s.texImage2D.apply(s,arguments)}catch(k){console.error("THREE.WebGLState:",k)}}function Ee(){try{s.texImage3D.apply(s,arguments)}catch(k){console.error("THREE.WebGLState:",k)}}function Ce(k){Ie.equals(k)===!1&&(s.scissor(k.x,k.y,k.z,k.w),Ie.copy(k))}function me(k){Oe.equals(k)===!1&&(s.viewport(k.x,k.y,k.z,k.w),Oe.copy(k))}function Be(k,he){let X=c.get(he);X===void 0&&(X=new WeakMap,c.set(he,X));let Q=X.get(k);Q===void 0&&(Q=s.getUniformBlockIndex(he,k.name),X.set(k,Q))}function De(k,he){const Q=c.get(he).get(k);o.get(he)!==Q&&(s.uniformBlockBinding(he,Q,k.__bindingPointIndex),o.set(he,Q))}function it(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),u={},V=null,se={},d={},l=new WeakMap,h=[],f=null,g=!1,_=null,p=null,m=null,x=null,y=null,b=null,C=null,E=new Pe(0,0,0),A=0,L=!1,D=null,v=null,S=null,H=null,F=null,Ie.set(0,0,s.canvas.width,s.canvas.height),Oe.set(0,0,s.canvas.width,s.canvas.height),n.reset(),r.reset(),a.reset()}return{buffers:{color:n,depth:r,stencil:a},enable:_e,disable:de,bindFramebuffer:Le,drawBuffers:Me,useProgram:ze,setBlending:I,setMaterial:Jt,setFlipSided:Fe,setCullFace:Ve,setLineWidth:Ae,setPolygonOffset:st,setScissorTest:Re,activeTexture:R,bindTexture:w,unbindTexture:G,compressedTexImage2D:Z,compressedTexImage3D:$,texImage2D:pe,texImage3D:Ee,updateUBOMapping:Be,uniformBlockBinding:De,texStorage2D:We,texStorage3D:ie,texSubImage2D:K,texSubImage3D:xe,compressedTexSubImage2D:ae,compressedTexSubImage3D:fe,scissor:Ce,viewport:me,reset:it}}function qh(s,e,t,i){const n=Cy(i);switch(t){case ju:return s*e;case Zu:return s*e;case Qu:return s*e*2;case Ju:return s*e/n.components*n.byteLength;case mc:return s*e/n.components*n.byteLength;case $u:return s*e*2/n.components*n.byteLength;case gc:return s*e*2/n.components*n.byteLength;case Ku:return s*e*3/n.components*n.byteLength;case Ti:return s*e*4/n.components*n.byteLength;case _c:return s*e*4/n.components*n.byteLength;case Sa:case Ma:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case Ta:case Aa:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case xl:case bl:return Math.max(s,16)*Math.max(e,8)/4;case vl:case yl:return Math.max(s,8)*Math.max(e,8)/2;case wl:case Sl:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case Ml:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Tl:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Al:return Math.floor((s+4)/5)*Math.floor((e+3)/4)*16;case El:return Math.floor((s+4)/5)*Math.floor((e+4)/5)*16;case Cl:return Math.floor((s+5)/6)*Math.floor((e+4)/5)*16;case Rl:return Math.floor((s+5)/6)*Math.floor((e+5)/6)*16;case Pl:return Math.floor((s+7)/8)*Math.floor((e+4)/5)*16;case Ll:return Math.floor((s+7)/8)*Math.floor((e+5)/6)*16;case Dl:return Math.floor((s+7)/8)*Math.floor((e+7)/8)*16;case Il:return Math.floor((s+9)/10)*Math.floor((e+4)/5)*16;case kl:return Math.floor((s+9)/10)*Math.floor((e+5)/6)*16;case Ul:return Math.floor((s+9)/10)*Math.floor((e+7)/8)*16;case Ol:return Math.floor((s+9)/10)*Math.floor((e+9)/10)*16;case Nl:return Math.floor((s+11)/12)*Math.floor((e+9)/10)*16;case Fl:return Math.floor((s+11)/12)*Math.floor((e+11)/12)*16;case Ea:case Bl:case zl:return Math.ceil(s/4)*Math.ceil(e/4)*16;case ed:case Hl:return Math.ceil(s/4)*Math.ceil(e/4)*8;case Gl:case Vl:return Math.ceil(s/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Cy(s){switch(s){case Qi:case qu:return{byteLength:1,components:1};case gr:case Xu:case oi:return{byteLength:2,components:1};case fc:case pc:return{byteLength:2,components:4};case $n:case dc:case Xi:return{byteLength:4,components:1};case Yu:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${s}.`)}function Ry(s,e,t,i,n,r,a){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),u=new we,d=new WeakMap;let l;const h=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(R,w){return f?new OffscreenCanvas(R,w):vr("canvas")}function _(R,w,G){let Z=1;const $=Re(R);if(($.width>G||$.height>G)&&(Z=G/Math.max($.width,$.height)),Z<1)if(typeof HTMLImageElement<"u"&&R instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&R instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&R instanceof ImageBitmap||typeof VideoFrame<"u"&&R instanceof VideoFrame){const K=Math.floor(Z*$.width),xe=Math.floor(Z*$.height);l===void 0&&(l=g(K,xe));const ae=w?g(K,xe):l;return ae.width=K,ae.height=xe,ae.getContext("2d").drawImage(R,0,0,K,xe),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+$.width+"x"+$.height+") to ("+K+"x"+xe+")."),ae}else return"data"in R&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+$.width+"x"+$.height+")."),R;return R}function p(R){return R.generateMipmaps&&R.minFilter!==At&&R.minFilter!==Dt}function m(R){s.generateMipmap(R)}function x(R,w,G,Z,$=!1){if(R!==null){if(s[R]!==void 0)return s[R];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+R+"'")}let K=w;if(w===s.RED&&(G===s.FLOAT&&(K=s.R32F),G===s.HALF_FLOAT&&(K=s.R16F),G===s.UNSIGNED_BYTE&&(K=s.R8)),w===s.RED_INTEGER&&(G===s.UNSIGNED_BYTE&&(K=s.R8UI),G===s.UNSIGNED_SHORT&&(K=s.R16UI),G===s.UNSIGNED_INT&&(K=s.R32UI),G===s.BYTE&&(K=s.R8I),G===s.SHORT&&(K=s.R16I),G===s.INT&&(K=s.R32I)),w===s.RG&&(G===s.FLOAT&&(K=s.RG32F),G===s.HALF_FLOAT&&(K=s.RG16F),G===s.UNSIGNED_BYTE&&(K=s.RG8)),w===s.RG_INTEGER&&(G===s.UNSIGNED_BYTE&&(K=s.RG8UI),G===s.UNSIGNED_SHORT&&(K=s.RG16UI),G===s.UNSIGNED_INT&&(K=s.RG32UI),G===s.BYTE&&(K=s.RG8I),G===s.SHORT&&(K=s.RG16I),G===s.INT&&(K=s.RG32I)),w===s.RGB_INTEGER&&(G===s.UNSIGNED_BYTE&&(K=s.RGB8UI),G===s.UNSIGNED_SHORT&&(K=s.RGB16UI),G===s.UNSIGNED_INT&&(K=s.RGB32UI),G===s.BYTE&&(K=s.RGB8I),G===s.SHORT&&(K=s.RGB16I),G===s.INT&&(K=s.RGB32I)),w===s.RGBA_INTEGER&&(G===s.UNSIGNED_BYTE&&(K=s.RGBA8UI),G===s.UNSIGNED_SHORT&&(K=s.RGBA16UI),G===s.UNSIGNED_INT&&(K=s.RGBA32UI),G===s.BYTE&&(K=s.RGBA8I),G===s.SHORT&&(K=s.RGBA16I),G===s.INT&&(K=s.RGBA32I)),w===s.RGB&&G===s.UNSIGNED_INT_5_9_9_9_REV&&(K=s.RGB9_E5),w===s.RGBA){const xe=$?Ua:Ye.getTransfer(Z);G===s.FLOAT&&(K=s.RGBA32F),G===s.HALF_FLOAT&&(K=s.RGBA16F),G===s.UNSIGNED_BYTE&&(K=xe===nt?s.SRGB8_ALPHA8:s.RGBA8),G===s.UNSIGNED_SHORT_4_4_4_4&&(K=s.RGBA4),G===s.UNSIGNED_SHORT_5_5_5_1&&(K=s.RGB5_A1)}return(K===s.R16F||K===s.R32F||K===s.RG16F||K===s.RG32F||K===s.RGBA16F||K===s.RGBA32F)&&e.get("EXT_color_buffer_float"),K}function y(R,w){let G;return R?w===null||w===$n||w===Ns?G=s.DEPTH24_STENCIL8:w===Xi?G=s.DEPTH32F_STENCIL8:w===gr&&(G=s.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):w===null||w===$n||w===Ns?G=s.DEPTH_COMPONENT24:w===Xi?G=s.DEPTH_COMPONENT32F:w===gr&&(G=s.DEPTH_COMPONENT16),G}function b(R,w){return p(R)===!0||R.isFramebufferTexture&&R.minFilter!==At&&R.minFilter!==Dt?Math.log2(Math.max(w.width,w.height))+1:R.mipmaps!==void 0&&R.mipmaps.length>0?R.mipmaps.length:R.isCompressedTexture&&Array.isArray(R.image)?w.mipmaps.length:1}function C(R){const w=R.target;w.removeEventListener("dispose",C),A(w),w.isVideoTexture&&d.delete(w)}function E(R){const w=R.target;w.removeEventListener("dispose",E),D(w)}function A(R){const w=i.get(R);if(w.__webglInit===void 0)return;const G=R.source,Z=h.get(G);if(Z){const $=Z[w.__cacheKey];$.usedTimes--,$.usedTimes===0&&L(R),Object.keys(Z).length===0&&h.delete(G)}i.remove(R)}function L(R){const w=i.get(R);s.deleteTexture(w.__webglTexture);const G=R.source,Z=h.get(G);delete Z[w.__cacheKey],a.memory.textures--}function D(R){const w=i.get(R);if(R.depthTexture&&R.depthTexture.dispose(),R.isWebGLCubeRenderTarget)for(let Z=0;Z<6;Z++){if(Array.isArray(w.__webglFramebuffer[Z]))for(let $=0;$<w.__webglFramebuffer[Z].length;$++)s.deleteFramebuffer(w.__webglFramebuffer[Z][$]);else s.deleteFramebuffer(w.__webglFramebuffer[Z]);w.__webglDepthbuffer&&s.deleteRenderbuffer(w.__webglDepthbuffer[Z])}else{if(Array.isArray(w.__webglFramebuffer))for(let Z=0;Z<w.__webglFramebuffer.length;Z++)s.deleteFramebuffer(w.__webglFramebuffer[Z]);else s.deleteFramebuffer(w.__webglFramebuffer);if(w.__webglDepthbuffer&&s.deleteRenderbuffer(w.__webglDepthbuffer),w.__webglMultisampledFramebuffer&&s.deleteFramebuffer(w.__webglMultisampledFramebuffer),w.__webglColorRenderbuffer)for(let Z=0;Z<w.__webglColorRenderbuffer.length;Z++)w.__webglColorRenderbuffer[Z]&&s.deleteRenderbuffer(w.__webglColorRenderbuffer[Z]);w.__webglDepthRenderbuffer&&s.deleteRenderbuffer(w.__webglDepthRenderbuffer)}const G=R.textures;for(let Z=0,$=G.length;Z<$;Z++){const K=i.get(G[Z]);K.__webglTexture&&(s.deleteTexture(K.__webglTexture),a.memory.textures--),i.remove(G[Z])}i.remove(R)}let v=0;function S(){v=0}function H(){const R=v;return R>=n.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+R+" texture units while this GPU supports only "+n.maxTextures),v+=1,R}function F(R){const w=[];return w.push(R.wrapS),w.push(R.wrapT),w.push(R.wrapR||0),w.push(R.magFilter),w.push(R.minFilter),w.push(R.anisotropy),w.push(R.internalFormat),w.push(R.format),w.push(R.type),w.push(R.generateMipmaps),w.push(R.premultiplyAlpha),w.push(R.flipY),w.push(R.unpackAlignment),w.push(R.colorSpace),w.join()}function P(R,w){const G=i.get(R);if(R.isVideoTexture&&Ae(R),R.isRenderTargetTexture===!1&&R.version>0&&G.__version!==R.version){const Z=R.image;if(Z===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(Z.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{Oe(G,R,w);return}}t.bindTexture(s.TEXTURE_2D,G.__webglTexture,s.TEXTURE0+w)}function B(R,w){const G=i.get(R);if(R.version>0&&G.__version!==R.version){Oe(G,R,w);return}t.bindTexture(s.TEXTURE_2D_ARRAY,G.__webglTexture,s.TEXTURE0+w)}function O(R,w){const G=i.get(R);if(R.version>0&&G.__version!==R.version){Oe(G,R,w);return}t.bindTexture(s.TEXTURE_3D,G.__webglTexture,s.TEXTURE0+w)}function j(R,w){const G=i.get(R);if(R.version>0&&G.__version!==R.version){Y(G,R,w);return}t.bindTexture(s.TEXTURE_CUBE_MAP,G.__webglTexture,s.TEXTURE0+w)}const V={[gl]:s.REPEAT,[qi]:s.CLAMP_TO_EDGE,[_l]:s.MIRRORED_REPEAT},se={[At]:s.NEAREST,[ig]:s.NEAREST_MIPMAP_NEAREST,[Fr]:s.NEAREST_MIPMAP_LINEAR,[Dt]:s.LINEAR,[ho]:s.LINEAR_MIPMAP_NEAREST,[dn]:s.LINEAR_MIPMAP_LINEAR},ee={[ag]:s.NEVER,[dg]:s.ALWAYS,[og]:s.LESS,[id]:s.LEQUAL,[lg]:s.EQUAL,[ug]:s.GEQUAL,[cg]:s.GREATER,[hg]:s.NOTEQUAL};function ce(R,w){if(w.type===Xi&&e.has("OES_texture_float_linear")===!1&&(w.magFilter===Dt||w.magFilter===ho||w.magFilter===Fr||w.magFilter===dn||w.minFilter===Dt||w.minFilter===ho||w.minFilter===Fr||w.minFilter===dn)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(R,s.TEXTURE_WRAP_S,V[w.wrapS]),s.texParameteri(R,s.TEXTURE_WRAP_T,V[w.wrapT]),(R===s.TEXTURE_3D||R===s.TEXTURE_2D_ARRAY)&&s.texParameteri(R,s.TEXTURE_WRAP_R,V[w.wrapR]),s.texParameteri(R,s.TEXTURE_MAG_FILTER,se[w.magFilter]),s.texParameteri(R,s.TEXTURE_MIN_FILTER,se[w.minFilter]),w.compareFunction&&(s.texParameteri(R,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(R,s.TEXTURE_COMPARE_FUNC,ee[w.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(w.magFilter===At||w.minFilter!==Fr&&w.minFilter!==dn||w.type===Xi&&e.has("OES_texture_float_linear")===!1)return;if(w.anisotropy>1||i.get(w).__currentAnisotropy){const G=e.get("EXT_texture_filter_anisotropic");s.texParameterf(R,G.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(w.anisotropy,n.getMaxAnisotropy())),i.get(w).__currentAnisotropy=w.anisotropy}}}function Ie(R,w){let G=!1;R.__webglInit===void 0&&(R.__webglInit=!0,w.addEventListener("dispose",C));const Z=w.source;let $=h.get(Z);$===void 0&&($={},h.set(Z,$));const K=F(w);if(K!==R.__cacheKey){$[K]===void 0&&($[K]={texture:s.createTexture(),usedTimes:0},a.memory.textures++,G=!0),$[K].usedTimes++;const xe=$[R.__cacheKey];xe!==void 0&&($[R.__cacheKey].usedTimes--,xe.usedTimes===0&&L(w)),R.__cacheKey=K,R.__webglTexture=$[K].texture}return G}function Oe(R,w,G){let Z=s.TEXTURE_2D;(w.isDataArrayTexture||w.isCompressedArrayTexture)&&(Z=s.TEXTURE_2D_ARRAY),w.isData3DTexture&&(Z=s.TEXTURE_3D);const $=Ie(R,w),K=w.source;t.bindTexture(Z,R.__webglTexture,s.TEXTURE0+G);const xe=i.get(K);if(K.version!==xe.__version||$===!0){t.activeTexture(s.TEXTURE0+G);const ae=Ye.getPrimaries(Ye.workingColorSpace),fe=w.colorSpace===un?null:Ye.getPrimaries(w.colorSpace),We=w.colorSpace===un||ae===fe?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,w.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,w.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,w.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,We);let ie=_(w.image,!1,n.maxTextureSize);ie=st(w,ie);const pe=r.convert(w.format,w.colorSpace),Ee=r.convert(w.type);let Ce=x(w.internalFormat,pe,Ee,w.colorSpace,w.isVideoTexture);ce(Z,w);let me;const Be=w.mipmaps,De=w.isVideoTexture!==!0,it=xe.__version===void 0||$===!0,k=K.dataReady,he=b(w,ie);if(w.isDepthTexture)Ce=y(w.format===Fs,w.type),it&&(De?t.texStorage2D(s.TEXTURE_2D,1,Ce,ie.width,ie.height):t.texImage2D(s.TEXTURE_2D,0,Ce,ie.width,ie.height,0,pe,Ee,null));else if(w.isDataTexture)if(Be.length>0){De&&it&&t.texStorage2D(s.TEXTURE_2D,he,Ce,Be[0].width,Be[0].height);for(let X=0,Q=Be.length;X<Q;X++)me=Be[X],De?k&&t.texSubImage2D(s.TEXTURE_2D,X,0,0,me.width,me.height,pe,Ee,me.data):t.texImage2D(s.TEXTURE_2D,X,Ce,me.width,me.height,0,pe,Ee,me.data);w.generateMipmaps=!1}else De?(it&&t.texStorage2D(s.TEXTURE_2D,he,Ce,ie.width,ie.height),k&&t.texSubImage2D(s.TEXTURE_2D,0,0,0,ie.width,ie.height,pe,Ee,ie.data)):t.texImage2D(s.TEXTURE_2D,0,Ce,ie.width,ie.height,0,pe,Ee,ie.data);else if(w.isCompressedTexture)if(w.isCompressedArrayTexture){De&&it&&t.texStorage3D(s.TEXTURE_2D_ARRAY,he,Ce,Be[0].width,Be[0].height,ie.depth);for(let X=0,Q=Be.length;X<Q;X++)if(me=Be[X],w.format!==Ti)if(pe!==null)if(De){if(k)if(w.layerUpdates.size>0){const oe=qh(me.width,me.height,w.format,w.type);for(const ue of w.layerUpdates){const Ge=me.data.subarray(ue*oe/me.data.BYTES_PER_ELEMENT,(ue+1)*oe/me.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,X,0,0,ue,me.width,me.height,1,pe,Ge,0,0)}w.clearLayerUpdates()}else t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,X,0,0,0,me.width,me.height,ie.depth,pe,me.data,0,0)}else t.compressedTexImage3D(s.TEXTURE_2D_ARRAY,X,Ce,me.width,me.height,ie.depth,0,me.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else De?k&&t.texSubImage3D(s.TEXTURE_2D_ARRAY,X,0,0,0,me.width,me.height,ie.depth,pe,Ee,me.data):t.texImage3D(s.TEXTURE_2D_ARRAY,X,Ce,me.width,me.height,ie.depth,0,pe,Ee,me.data)}else{De&&it&&t.texStorage2D(s.TEXTURE_2D,he,Ce,Be[0].width,Be[0].height);for(let X=0,Q=Be.length;X<Q;X++)me=Be[X],w.format!==Ti?pe!==null?De?k&&t.compressedTexSubImage2D(s.TEXTURE_2D,X,0,0,me.width,me.height,pe,me.data):t.compressedTexImage2D(s.TEXTURE_2D,X,Ce,me.width,me.height,0,me.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):De?k&&t.texSubImage2D(s.TEXTURE_2D,X,0,0,me.width,me.height,pe,Ee,me.data):t.texImage2D(s.TEXTURE_2D,X,Ce,me.width,me.height,0,pe,Ee,me.data)}else if(w.isDataArrayTexture)if(De){if(it&&t.texStorage3D(s.TEXTURE_2D_ARRAY,he,Ce,ie.width,ie.height,ie.depth),k)if(w.layerUpdates.size>0){const X=qh(ie.width,ie.height,w.format,w.type);for(const Q of w.layerUpdates){const oe=ie.data.subarray(Q*X/ie.data.BYTES_PER_ELEMENT,(Q+1)*X/ie.data.BYTES_PER_ELEMENT);t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,Q,ie.width,ie.height,1,pe,Ee,oe)}w.clearLayerUpdates()}else t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,ie.width,ie.height,ie.depth,pe,Ee,ie.data)}else t.texImage3D(s.TEXTURE_2D_ARRAY,0,Ce,ie.width,ie.height,ie.depth,0,pe,Ee,ie.data);else if(w.isData3DTexture)De?(it&&t.texStorage3D(s.TEXTURE_3D,he,Ce,ie.width,ie.height,ie.depth),k&&t.texSubImage3D(s.TEXTURE_3D,0,0,0,0,ie.width,ie.height,ie.depth,pe,Ee,ie.data)):t.texImage3D(s.TEXTURE_3D,0,Ce,ie.width,ie.height,ie.depth,0,pe,Ee,ie.data);else if(w.isFramebufferTexture){if(it)if(De)t.texStorage2D(s.TEXTURE_2D,he,Ce,ie.width,ie.height);else{let X=ie.width,Q=ie.height;for(let oe=0;oe<he;oe++)t.texImage2D(s.TEXTURE_2D,oe,Ce,X,Q,0,pe,Ee,null),X>>=1,Q>>=1}}else if(Be.length>0){if(De&&it){const X=Re(Be[0]);t.texStorage2D(s.TEXTURE_2D,he,Ce,X.width,X.height)}for(let X=0,Q=Be.length;X<Q;X++)me=Be[X],De?k&&t.texSubImage2D(s.TEXTURE_2D,X,0,0,pe,Ee,me):t.texImage2D(s.TEXTURE_2D,X,Ce,pe,Ee,me);w.generateMipmaps=!1}else if(De){if(it){const X=Re(ie);t.texStorage2D(s.TEXTURE_2D,he,Ce,X.width,X.height)}k&&t.texSubImage2D(s.TEXTURE_2D,0,0,0,pe,Ee,ie)}else t.texImage2D(s.TEXTURE_2D,0,Ce,pe,Ee,ie);p(w)&&m(Z),xe.__version=K.version,w.onUpdate&&w.onUpdate(w)}R.__version=w.version}function Y(R,w,G){if(w.image.length!==6)return;const Z=Ie(R,w),$=w.source;t.bindTexture(s.TEXTURE_CUBE_MAP,R.__webglTexture,s.TEXTURE0+G);const K=i.get($);if($.version!==K.__version||Z===!0){t.activeTexture(s.TEXTURE0+G);const xe=Ye.getPrimaries(Ye.workingColorSpace),ae=w.colorSpace===un?null:Ye.getPrimaries(w.colorSpace),fe=w.colorSpace===un||xe===ae?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,w.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,w.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,w.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,fe);const We=w.isCompressedTexture||w.image[0].isCompressedTexture,ie=w.image[0]&&w.image[0].isDataTexture,pe=[];for(let Q=0;Q<6;Q++)!We&&!ie?pe[Q]=_(w.image[Q],!0,n.maxCubemapSize):pe[Q]=ie?w.image[Q].image:w.image[Q],pe[Q]=st(w,pe[Q]);const Ee=pe[0],Ce=r.convert(w.format,w.colorSpace),me=r.convert(w.type),Be=x(w.internalFormat,Ce,me,w.colorSpace),De=w.isVideoTexture!==!0,it=K.__version===void 0||Z===!0,k=$.dataReady;let he=b(w,Ee);ce(s.TEXTURE_CUBE_MAP,w);let X;if(We){De&&it&&t.texStorage2D(s.TEXTURE_CUBE_MAP,he,Be,Ee.width,Ee.height);for(let Q=0;Q<6;Q++){X=pe[Q].mipmaps;for(let oe=0;oe<X.length;oe++){const ue=X[oe];w.format!==Ti?Ce!==null?De?k&&t.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,oe,0,0,ue.width,ue.height,Ce,ue.data):t.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,oe,Be,ue.width,ue.height,0,ue.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):De?k&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,oe,0,0,ue.width,ue.height,Ce,me,ue.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,oe,Be,ue.width,ue.height,0,Ce,me,ue.data)}}}else{if(X=w.mipmaps,De&&it){X.length>0&&he++;const Q=Re(pe[0]);t.texStorage2D(s.TEXTURE_CUBE_MAP,he,Be,Q.width,Q.height)}for(let Q=0;Q<6;Q++)if(ie){De?k&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,0,0,pe[Q].width,pe[Q].height,Ce,me,pe[Q].data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,Be,pe[Q].width,pe[Q].height,0,Ce,me,pe[Q].data);for(let oe=0;oe<X.length;oe++){const Ge=X[oe].image[Q].image;De?k&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,oe+1,0,0,Ge.width,Ge.height,Ce,me,Ge.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,oe+1,Be,Ge.width,Ge.height,0,Ce,me,Ge.data)}}else{De?k&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,0,0,Ce,me,pe[Q]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,Be,Ce,me,pe[Q]);for(let oe=0;oe<X.length;oe++){const ue=X[oe];De?k&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,oe+1,0,0,Ce,me,ue.image[Q]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,oe+1,Be,Ce,me,ue.image[Q])}}}p(w)&&m(s.TEXTURE_CUBE_MAP),K.__version=$.version,w.onUpdate&&w.onUpdate(w)}R.__version=w.version}function J(R,w,G,Z,$,K){const xe=r.convert(G.format,G.colorSpace),ae=r.convert(G.type),fe=x(G.internalFormat,xe,ae,G.colorSpace);if(!i.get(w).__hasExternalTextures){const ie=Math.max(1,w.width>>K),pe=Math.max(1,w.height>>K);$===s.TEXTURE_3D||$===s.TEXTURE_2D_ARRAY?t.texImage3D($,K,fe,ie,pe,w.depth,0,xe,ae,null):t.texImage2D($,K,fe,ie,pe,0,xe,ae,null)}t.bindFramebuffer(s.FRAMEBUFFER,R),Ve(w)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,Z,$,i.get(G).__webglTexture,0,Fe(w)):($===s.TEXTURE_2D||$>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&$<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,Z,$,i.get(G).__webglTexture,K),t.bindFramebuffer(s.FRAMEBUFFER,null)}function _e(R,w,G){if(s.bindRenderbuffer(s.RENDERBUFFER,R),w.depthBuffer){const Z=w.depthTexture,$=Z&&Z.isDepthTexture?Z.type:null,K=y(w.stencilBuffer,$),xe=w.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,ae=Fe(w);Ve(w)?o.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,ae,K,w.width,w.height):G?s.renderbufferStorageMultisample(s.RENDERBUFFER,ae,K,w.width,w.height):s.renderbufferStorage(s.RENDERBUFFER,K,w.width,w.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,xe,s.RENDERBUFFER,R)}else{const Z=w.textures;for(let $=0;$<Z.length;$++){const K=Z[$],xe=r.convert(K.format,K.colorSpace),ae=r.convert(K.type),fe=x(K.internalFormat,xe,ae,K.colorSpace),We=Fe(w);G&&Ve(w)===!1?s.renderbufferStorageMultisample(s.RENDERBUFFER,We,fe,w.width,w.height):Ve(w)?o.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,We,fe,w.width,w.height):s.renderbufferStorage(s.RENDERBUFFER,fe,w.width,w.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function de(R,w){if(w&&w.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(s.FRAMEBUFFER,R),!(w.depthTexture&&w.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!i.get(w.depthTexture).__webglTexture||w.depthTexture.image.width!==w.width||w.depthTexture.image.height!==w.height)&&(w.depthTexture.image.width=w.width,w.depthTexture.image.height=w.height,w.depthTexture.needsUpdate=!0),P(w.depthTexture,0);const Z=i.get(w.depthTexture).__webglTexture,$=Fe(w);if(w.depthTexture.format===Rs)Ve(w)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,Z,0,$):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,Z,0);else if(w.depthTexture.format===Fs)Ve(w)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,Z,0,$):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,Z,0);else throw new Error("Unknown depthTexture format")}function Le(R){const w=i.get(R),G=R.isWebGLCubeRenderTarget===!0;if(w.__boundDepthTexture!==R.depthTexture){const Z=R.depthTexture;if(w.__depthDisposeCallback&&w.__depthDisposeCallback(),Z){const $=()=>{delete w.__boundDepthTexture,delete w.__depthDisposeCallback,Z.removeEventListener("dispose",$)};Z.addEventListener("dispose",$),w.__depthDisposeCallback=$}w.__boundDepthTexture=Z}if(R.depthTexture&&!w.__autoAllocateDepthBuffer){if(G)throw new Error("target.depthTexture not supported in Cube render targets");de(w.__webglFramebuffer,R)}else if(G){w.__webglDepthbuffer=[];for(let Z=0;Z<6;Z++)if(t.bindFramebuffer(s.FRAMEBUFFER,w.__webglFramebuffer[Z]),w.__webglDepthbuffer[Z]===void 0)w.__webglDepthbuffer[Z]=s.createRenderbuffer(),_e(w.__webglDepthbuffer[Z],R,!1);else{const $=R.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,K=w.__webglDepthbuffer[Z];s.bindRenderbuffer(s.RENDERBUFFER,K),s.framebufferRenderbuffer(s.FRAMEBUFFER,$,s.RENDERBUFFER,K)}}else if(t.bindFramebuffer(s.FRAMEBUFFER,w.__webglFramebuffer),w.__webglDepthbuffer===void 0)w.__webglDepthbuffer=s.createRenderbuffer(),_e(w.__webglDepthbuffer,R,!1);else{const Z=R.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,$=w.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,$),s.framebufferRenderbuffer(s.FRAMEBUFFER,Z,s.RENDERBUFFER,$)}t.bindFramebuffer(s.FRAMEBUFFER,null)}function Me(R,w,G){const Z=i.get(R);w!==void 0&&J(Z.__webglFramebuffer,R,R.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),G!==void 0&&Le(R)}function ze(R){const w=R.texture,G=i.get(R),Z=i.get(w);R.addEventListener("dispose",E);const $=R.textures,K=R.isWebGLCubeRenderTarget===!0,xe=$.length>1;if(xe||(Z.__webglTexture===void 0&&(Z.__webglTexture=s.createTexture()),Z.__version=w.version,a.memory.textures++),K){G.__webglFramebuffer=[];for(let ae=0;ae<6;ae++)if(w.mipmaps&&w.mipmaps.length>0){G.__webglFramebuffer[ae]=[];for(let fe=0;fe<w.mipmaps.length;fe++)G.__webglFramebuffer[ae][fe]=s.createFramebuffer()}else G.__webglFramebuffer[ae]=s.createFramebuffer()}else{if(w.mipmaps&&w.mipmaps.length>0){G.__webglFramebuffer=[];for(let ae=0;ae<w.mipmaps.length;ae++)G.__webglFramebuffer[ae]=s.createFramebuffer()}else G.__webglFramebuffer=s.createFramebuffer();if(xe)for(let ae=0,fe=$.length;ae<fe;ae++){const We=i.get($[ae]);We.__webglTexture===void 0&&(We.__webglTexture=s.createTexture(),a.memory.textures++)}if(R.samples>0&&Ve(R)===!1){G.__webglMultisampledFramebuffer=s.createFramebuffer(),G.__webglColorRenderbuffer=[],t.bindFramebuffer(s.FRAMEBUFFER,G.__webglMultisampledFramebuffer);for(let ae=0;ae<$.length;ae++){const fe=$[ae];G.__webglColorRenderbuffer[ae]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,G.__webglColorRenderbuffer[ae]);const We=r.convert(fe.format,fe.colorSpace),ie=r.convert(fe.type),pe=x(fe.internalFormat,We,ie,fe.colorSpace,R.isXRRenderTarget===!0),Ee=Fe(R);s.renderbufferStorageMultisample(s.RENDERBUFFER,Ee,pe,R.width,R.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+ae,s.RENDERBUFFER,G.__webglColorRenderbuffer[ae])}s.bindRenderbuffer(s.RENDERBUFFER,null),R.depthBuffer&&(G.__webglDepthRenderbuffer=s.createRenderbuffer(),_e(G.__webglDepthRenderbuffer,R,!0)),t.bindFramebuffer(s.FRAMEBUFFER,null)}}if(K){t.bindTexture(s.TEXTURE_CUBE_MAP,Z.__webglTexture),ce(s.TEXTURE_CUBE_MAP,w);for(let ae=0;ae<6;ae++)if(w.mipmaps&&w.mipmaps.length>0)for(let fe=0;fe<w.mipmaps.length;fe++)J(G.__webglFramebuffer[ae][fe],R,w,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+ae,fe);else J(G.__webglFramebuffer[ae],R,w,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+ae,0);p(w)&&m(s.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(xe){for(let ae=0,fe=$.length;ae<fe;ae++){const We=$[ae],ie=i.get(We);t.bindTexture(s.TEXTURE_2D,ie.__webglTexture),ce(s.TEXTURE_2D,We),J(G.__webglFramebuffer,R,We,s.COLOR_ATTACHMENT0+ae,s.TEXTURE_2D,0),p(We)&&m(s.TEXTURE_2D)}t.unbindTexture()}else{let ae=s.TEXTURE_2D;if((R.isWebGL3DRenderTarget||R.isWebGLArrayRenderTarget)&&(ae=R.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(ae,Z.__webglTexture),ce(ae,w),w.mipmaps&&w.mipmaps.length>0)for(let fe=0;fe<w.mipmaps.length;fe++)J(G.__webglFramebuffer[fe],R,w,s.COLOR_ATTACHMENT0,ae,fe);else J(G.__webglFramebuffer,R,w,s.COLOR_ATTACHMENT0,ae,0);p(w)&&m(ae),t.unbindTexture()}R.depthBuffer&&Le(R)}function $e(R){const w=R.textures;for(let G=0,Z=w.length;G<Z;G++){const $=w[G];if(p($)){const K=R.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:s.TEXTURE_2D,xe=i.get($).__webglTexture;t.bindTexture(K,xe),m(K),t.unbindTexture()}}}const He=[],I=[];function Jt(R){if(R.samples>0){if(Ve(R)===!1){const w=R.textures,G=R.width,Z=R.height;let $=s.COLOR_BUFFER_BIT;const K=R.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,xe=i.get(R),ae=w.length>1;if(ae)for(let fe=0;fe<w.length;fe++)t.bindFramebuffer(s.FRAMEBUFFER,xe.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+fe,s.RENDERBUFFER,null),t.bindFramebuffer(s.FRAMEBUFFER,xe.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+fe,s.TEXTURE_2D,null,0);t.bindFramebuffer(s.READ_FRAMEBUFFER,xe.__webglMultisampledFramebuffer),t.bindFramebuffer(s.DRAW_FRAMEBUFFER,xe.__webglFramebuffer);for(let fe=0;fe<w.length;fe++){if(R.resolveDepthBuffer&&(R.depthBuffer&&($|=s.DEPTH_BUFFER_BIT),R.stencilBuffer&&R.resolveStencilBuffer&&($|=s.STENCIL_BUFFER_BIT)),ae){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,xe.__webglColorRenderbuffer[fe]);const We=i.get(w[fe]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,We,0)}s.blitFramebuffer(0,0,G,Z,0,0,G,Z,$,s.NEAREST),c===!0&&(He.length=0,I.length=0,He.push(s.COLOR_ATTACHMENT0+fe),R.depthBuffer&&R.resolveDepthBuffer===!1&&(He.push(K),I.push(K),s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,I)),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,He))}if(t.bindFramebuffer(s.READ_FRAMEBUFFER,null),t.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),ae)for(let fe=0;fe<w.length;fe++){t.bindFramebuffer(s.FRAMEBUFFER,xe.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+fe,s.RENDERBUFFER,xe.__webglColorRenderbuffer[fe]);const We=i.get(w[fe]).__webglTexture;t.bindFramebuffer(s.FRAMEBUFFER,xe.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+fe,s.TEXTURE_2D,We,0)}t.bindFramebuffer(s.DRAW_FRAMEBUFFER,xe.__webglMultisampledFramebuffer)}else if(R.depthBuffer&&R.resolveDepthBuffer===!1&&c){const w=R.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[w])}}}function Fe(R){return Math.min(n.maxSamples,R.samples)}function Ve(R){const w=i.get(R);return R.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&w.__useRenderToTexture!==!1}function Ae(R){const w=a.render.frame;d.get(R)!==w&&(d.set(R,w),R.update())}function st(R,w){const G=R.colorSpace,Z=R.format,$=R.type;return R.isCompressedTexture===!0||R.isVideoTexture===!0||G!==An&&G!==un&&(Ye.getTransfer(G)===nt?(Z!==Ti||$!==Qi)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",G)),w}function Re(R){return typeof HTMLImageElement<"u"&&R instanceof HTMLImageElement?(u.width=R.naturalWidth||R.width,u.height=R.naturalHeight||R.height):typeof VideoFrame<"u"&&R instanceof VideoFrame?(u.width=R.displayWidth,u.height=R.displayHeight):(u.width=R.width,u.height=R.height),u}this.allocateTextureUnit=H,this.resetTextureUnits=S,this.setTexture2D=P,this.setTexture2DArray=B,this.setTexture3D=O,this.setTextureCube=j,this.rebindTextures=Me,this.setupRenderTarget=ze,this.updateRenderTargetMipmap=$e,this.updateMultisampleRenderTarget=Jt,this.setupDepthRenderbuffer=Le,this.setupFrameBufferTexture=J,this.useMultisampledRTT=Ve}function Py(s,e){function t(i,n=un){let r;const a=Ye.getTransfer(n);if(i===Qi)return s.UNSIGNED_BYTE;if(i===fc)return s.UNSIGNED_SHORT_4_4_4_4;if(i===pc)return s.UNSIGNED_SHORT_5_5_5_1;if(i===Yu)return s.UNSIGNED_INT_5_9_9_9_REV;if(i===qu)return s.BYTE;if(i===Xu)return s.SHORT;if(i===gr)return s.UNSIGNED_SHORT;if(i===dc)return s.INT;if(i===$n)return s.UNSIGNED_INT;if(i===Xi)return s.FLOAT;if(i===oi)return s.HALF_FLOAT;if(i===ju)return s.ALPHA;if(i===Ku)return s.RGB;if(i===Ti)return s.RGBA;if(i===Zu)return s.LUMINANCE;if(i===Qu)return s.LUMINANCE_ALPHA;if(i===Rs)return s.DEPTH_COMPONENT;if(i===Fs)return s.DEPTH_STENCIL;if(i===Ju)return s.RED;if(i===mc)return s.RED_INTEGER;if(i===$u)return s.RG;if(i===gc)return s.RG_INTEGER;if(i===_c)return s.RGBA_INTEGER;if(i===Sa||i===Ma||i===Ta||i===Aa)if(a===nt)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(i===Sa)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===Ma)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===Ta)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Aa)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(i===Sa)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===Ma)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===Ta)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Aa)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===vl||i===xl||i===yl||i===bl)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(i===vl)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===xl)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===yl)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===bl)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===wl||i===Sl||i===Ml)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(i===wl||i===Sl)return a===nt?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(i===Ml)return a===nt?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===Tl||i===Al||i===El||i===Cl||i===Rl||i===Pl||i===Ll||i===Dl||i===Il||i===kl||i===Ul||i===Ol||i===Nl||i===Fl)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(i===Tl)return a===nt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Al)return a===nt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===El)return a===nt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Cl)return a===nt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Rl)return a===nt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Pl)return a===nt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Ll)return a===nt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Dl)return a===nt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Il)return a===nt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===kl)return a===nt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Ul)return a===nt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Ol)return a===nt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Nl)return a===nt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Fl)return a===nt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Ea||i===Bl||i===zl)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(i===Ea)return a===nt?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Bl)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===zl)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===ed||i===Hl||i===Gl||i===Vl)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(i===Ea)return r.COMPRESSED_RED_RGTC1_EXT;if(i===Hl)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Gl)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Vl)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Ns?s.UNSIGNED_INT_24_8:s[i]!==void 0?s[i]:null}return{convert:t}}class Ly extends gi{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}}class fn extends Gt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Dy={type:"move"};class Bo{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new fn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new fn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new z,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new z),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new fn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new z,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new z),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let n=null,r=null,a=null;const o=this._targetRay,c=this._grip,u=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(u&&e.hand){a=!0;for(const _ of e.hand.values()){const p=t.getJointPose(_,i),m=this._getHandJoint(u,_);p!==null&&(m.matrix.fromArray(p.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=p.radius),m.visible=p!==null}const d=u.joints["index-finger-tip"],l=u.joints["thumb-tip"],h=d.position.distanceTo(l.position),f=.02,g=.005;u.inputState.pinching&&h>f+g?(u.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!u.inputState.pinching&&h<=f-g&&(u.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,i),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1));o!==null&&(n=t.getPose(e.targetRaySpace,i),n===null&&r!==null&&(n=r),n!==null&&(o.matrix.fromArray(n.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,n.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(n.linearVelocity)):o.hasLinearVelocity=!1,n.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(n.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Dy)))}return o!==null&&(o.visible=n!==null),c!==null&&(c.visible=r!==null),u!==null&&(u.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const i=new fn;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}}const Iy=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,ky=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class Uy{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t,i){if(this.texture===null){const n=new bt,r=e.properties.get(n);r.__webglTexture=t.texture,(t.depthNear!=i.depthNear||t.depthFar!=i.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,i=new gt({vertexShader:Iy,fragmentShader:ky,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new zt(new bn(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Oy extends Xs{constructor(e,t){super();const i=this;let n=null,r=1,a=null,o="local-floor",c=1,u=null,d=null,l=null,h=null,f=null,g=null;const _=new Uy,p=t.getContextAttributes();let m=null,x=null;const y=[],b=[],C=new we;let E=null;const A=new gi;A.layers.enable(1),A.viewport=new je;const L=new gi;L.layers.enable(2),L.viewport=new je;const D=[A,L],v=new Ly;v.layers.enable(1),v.layers.enable(2);let S=null,H=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Y){let J=y[Y];return J===void 0&&(J=new Bo,y[Y]=J),J.getTargetRaySpace()},this.getControllerGrip=function(Y){let J=y[Y];return J===void 0&&(J=new Bo,y[Y]=J),J.getGripSpace()},this.getHand=function(Y){let J=y[Y];return J===void 0&&(J=new Bo,y[Y]=J),J.getHandSpace()};function F(Y){const J=b.indexOf(Y.inputSource);if(J===-1)return;const _e=y[J];_e!==void 0&&(_e.update(Y.inputSource,Y.frame,u||a),_e.dispatchEvent({type:Y.type,data:Y.inputSource}))}function P(){n.removeEventListener("select",F),n.removeEventListener("selectstart",F),n.removeEventListener("selectend",F),n.removeEventListener("squeeze",F),n.removeEventListener("squeezestart",F),n.removeEventListener("squeezeend",F),n.removeEventListener("end",P),n.removeEventListener("inputsourceschange",B);for(let Y=0;Y<y.length;Y++){const J=b[Y];J!==null&&(b[Y]=null,y[Y].disconnect(J))}S=null,H=null,_.reset(),e.setRenderTarget(m),f=null,h=null,l=null,n=null,x=null,Oe.stop(),i.isPresenting=!1,e.setPixelRatio(E),e.setSize(C.width,C.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Y){r=Y,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Y){o=Y,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return u||a},this.setReferenceSpace=function(Y){u=Y},this.getBaseLayer=function(){return h!==null?h:f},this.getBinding=function(){return l},this.getFrame=function(){return g},this.getSession=function(){return n},this.setSession=async function(Y){if(n=Y,n!==null){if(m=e.getRenderTarget(),n.addEventListener("select",F),n.addEventListener("selectstart",F),n.addEventListener("selectend",F),n.addEventListener("squeeze",F),n.addEventListener("squeezestart",F),n.addEventListener("squeezeend",F),n.addEventListener("end",P),n.addEventListener("inputsourceschange",B),p.xrCompatible!==!0&&await t.makeXRCompatible(),E=e.getPixelRatio(),e.getSize(C),n.renderState.layers===void 0){const J={antialias:p.antialias,alpha:!0,depth:p.depth,stencil:p.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(n,t,J),n.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),x=new Ht(f.framebufferWidth,f.framebufferHeight,{format:Ti,type:Qi,colorSpace:e.outputColorSpace,stencilBuffer:p.stencil})}else{let J=null,_e=null,de=null;p.depth&&(de=p.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,J=p.stencil?Fs:Rs,_e=p.stencil?Ns:$n);const Le={colorFormat:t.RGBA8,depthFormat:de,scaleFactor:r};l=new XRWebGLBinding(n,t),h=l.createProjectionLayer(Le),n.updateRenderState({layers:[h]}),e.setPixelRatio(1),e.setSize(h.textureWidth,h.textureHeight,!1),x=new Ht(h.textureWidth,h.textureHeight,{format:Ti,type:Qi,depthTexture:new _d(h.textureWidth,h.textureHeight,_e,void 0,void 0,void 0,void 0,void 0,void 0,J),stencilBuffer:p.stencil,colorSpace:e.outputColorSpace,samples:p.antialias?4:0,resolveDepthBuffer:h.ignoreDepthValues===!1})}x.isXRRenderTarget=!0,this.setFoveation(c),u=null,a=await n.requestReferenceSpace(o),Oe.setContext(n),Oe.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(n!==null)return n.environmentBlendMode},this.getDepthTexture=function(){return _.getDepthTexture()};function B(Y){for(let J=0;J<Y.removed.length;J++){const _e=Y.removed[J],de=b.indexOf(_e);de>=0&&(b[de]=null,y[de].disconnect(_e))}for(let J=0;J<Y.added.length;J++){const _e=Y.added[J];let de=b.indexOf(_e);if(de===-1){for(let Me=0;Me<y.length;Me++)if(Me>=b.length){b.push(_e),de=Me;break}else if(b[Me]===null){b[Me]=_e,de=Me;break}if(de===-1)break}const Le=y[de];Le&&Le.connect(_e)}}const O=new z,j=new z;function V(Y,J,_e){O.setFromMatrixPosition(J.matrixWorld),j.setFromMatrixPosition(_e.matrixWorld);const de=O.distanceTo(j),Le=J.projectionMatrix.elements,Me=_e.projectionMatrix.elements,ze=Le[14]/(Le[10]-1),$e=Le[14]/(Le[10]+1),He=(Le[9]+1)/Le[5],I=(Le[9]-1)/Le[5],Jt=(Le[8]-1)/Le[0],Fe=(Me[8]+1)/Me[0],Ve=ze*Jt,Ae=ze*Fe,st=de/(-Jt+Fe),Re=st*-Jt;if(J.matrixWorld.decompose(Y.position,Y.quaternion,Y.scale),Y.translateX(Re),Y.translateZ(st),Y.matrixWorld.compose(Y.position,Y.quaternion,Y.scale),Y.matrixWorldInverse.copy(Y.matrixWorld).invert(),Le[10]===-1)Y.projectionMatrix.copy(J.projectionMatrix),Y.projectionMatrixInverse.copy(J.projectionMatrixInverse);else{const R=ze+st,w=$e+st,G=Ve-Re,Z=Ae+(de-Re),$=He*$e/w*R,K=I*$e/w*R;Y.projectionMatrix.makePerspective(G,Z,$,K,R,w),Y.projectionMatrixInverse.copy(Y.projectionMatrix).invert()}}function se(Y,J){J===null?Y.matrixWorld.copy(Y.matrix):Y.matrixWorld.multiplyMatrices(J.matrixWorld,Y.matrix),Y.matrixWorldInverse.copy(Y.matrixWorld).invert()}this.updateCamera=function(Y){if(n===null)return;let J=Y.near,_e=Y.far;_.texture!==null&&(_.depthNear>0&&(J=_.depthNear),_.depthFar>0&&(_e=_.depthFar)),v.near=L.near=A.near=J,v.far=L.far=A.far=_e,(S!==v.near||H!==v.far)&&(n.updateRenderState({depthNear:v.near,depthFar:v.far}),S=v.near,H=v.far);const de=Y.parent,Le=v.cameras;se(v,de);for(let Me=0;Me<Le.length;Me++)se(Le[Me],de);Le.length===2?V(v,A,L):v.projectionMatrix.copy(A.projectionMatrix),ee(Y,v,de)};function ee(Y,J,_e){_e===null?Y.matrix.copy(J.matrixWorld):(Y.matrix.copy(_e.matrixWorld),Y.matrix.invert(),Y.matrix.multiply(J.matrixWorld)),Y.matrix.decompose(Y.position,Y.quaternion,Y.scale),Y.updateMatrixWorld(!0),Y.projectionMatrix.copy(J.projectionMatrix),Y.projectionMatrixInverse.copy(J.projectionMatrixInverse),Y.isPerspectiveCamera&&(Y.fov=_r*2*Math.atan(1/Y.projectionMatrix.elements[5]),Y.zoom=1)}this.getCamera=function(){return v},this.getFoveation=function(){if(!(h===null&&f===null))return c},this.setFoveation=function(Y){c=Y,h!==null&&(h.fixedFoveation=Y),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=Y)},this.hasDepthSensing=function(){return _.texture!==null},this.getDepthSensingMesh=function(){return _.getMesh(v)};let ce=null;function Ie(Y,J){if(d=J.getViewerPose(u||a),g=J,d!==null){const _e=d.views;f!==null&&(e.setRenderTargetFramebuffer(x,f.framebuffer),e.setRenderTarget(x));let de=!1;_e.length!==v.cameras.length&&(v.cameras.length=0,de=!0);for(let Me=0;Me<_e.length;Me++){const ze=_e[Me];let $e=null;if(f!==null)$e=f.getViewport(ze);else{const I=l.getViewSubImage(h,ze);$e=I.viewport,Me===0&&(e.setRenderTargetTextures(x,I.colorTexture,h.ignoreDepthValues?void 0:I.depthStencilTexture),e.setRenderTarget(x))}let He=D[Me];He===void 0&&(He=new gi,He.layers.enable(Me),He.viewport=new je,D[Me]=He),He.matrix.fromArray(ze.transform.matrix),He.matrix.decompose(He.position,He.quaternion,He.scale),He.projectionMatrix.fromArray(ze.projectionMatrix),He.projectionMatrixInverse.copy(He.projectionMatrix).invert(),He.viewport.set($e.x,$e.y,$e.width,$e.height),Me===0&&(v.matrix.copy(He.matrix),v.matrix.decompose(v.position,v.quaternion,v.scale)),de===!0&&v.cameras.push(He)}const Le=n.enabledFeatures;if(Le&&Le.includes("depth-sensing")){const Me=l.getDepthInformation(_e[0]);Me&&Me.isValid&&Me.texture&&_.init(e,Me,n.renderState)}}for(let _e=0;_e<y.length;_e++){const de=b[_e],Le=y[_e];de!==null&&Le!==void 0&&Le.update(de,J,u||a)}ce&&ce(Y,J),J.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:J}),g=null}const Oe=new md;Oe.setAnimationLoop(Ie),this.setAnimationLoop=function(Y){ce=Y},this.dispose=function(){}}}const Nn=new Ji,Ny=new dt;function Fy(s,e){function t(p,m){p.matrixAutoUpdate===!0&&p.updateMatrix(),m.value.copy(p.matrix)}function i(p,m){m.color.getRGB(p.fogColor.value,ud(s)),m.isFog?(p.fogNear.value=m.near,p.fogFar.value=m.far):m.isFogExp2&&(p.fogDensity.value=m.density)}function n(p,m,x,y,b){m.isMeshBasicMaterial||m.isMeshLambertMaterial?r(p,m):m.isMeshToonMaterial?(r(p,m),l(p,m)):m.isMeshPhongMaterial?(r(p,m),d(p,m)):m.isMeshStandardMaterial?(r(p,m),h(p,m),m.isMeshPhysicalMaterial&&f(p,m,b)):m.isMeshMatcapMaterial?(r(p,m),g(p,m)):m.isMeshDepthMaterial?r(p,m):m.isMeshDistanceMaterial?(r(p,m),_(p,m)):m.isMeshNormalMaterial?r(p,m):m.isLineBasicMaterial?(a(p,m),m.isLineDashedMaterial&&o(p,m)):m.isPointsMaterial?c(p,m,x,y):m.isSpriteMaterial?u(p,m):m.isShadowMaterial?(p.color.value.copy(m.color),p.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function r(p,m){p.opacity.value=m.opacity,m.color&&p.diffuse.value.copy(m.color),m.emissive&&p.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(p.map.value=m.map,t(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.bumpMap&&(p.bumpMap.value=m.bumpMap,t(m.bumpMap,p.bumpMapTransform),p.bumpScale.value=m.bumpScale,m.side===Xt&&(p.bumpScale.value*=-1)),m.normalMap&&(p.normalMap.value=m.normalMap,t(m.normalMap,p.normalMapTransform),p.normalScale.value.copy(m.normalScale),m.side===Xt&&p.normalScale.value.negate()),m.displacementMap&&(p.displacementMap.value=m.displacementMap,t(m.displacementMap,p.displacementMapTransform),p.displacementScale.value=m.displacementScale,p.displacementBias.value=m.displacementBias),m.emissiveMap&&(p.emissiveMap.value=m.emissiveMap,t(m.emissiveMap,p.emissiveMapTransform)),m.specularMap&&(p.specularMap.value=m.specularMap,t(m.specularMap,p.specularMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest);const x=e.get(m),y=x.envMap,b=x.envMapRotation;y&&(p.envMap.value=y,Nn.copy(b),Nn.x*=-1,Nn.y*=-1,Nn.z*=-1,y.isCubeTexture&&y.isRenderTargetTexture===!1&&(Nn.y*=-1,Nn.z*=-1),p.envMapRotation.value.setFromMatrix4(Ny.makeRotationFromEuler(Nn)),p.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,p.reflectivity.value=m.reflectivity,p.ior.value=m.ior,p.refractionRatio.value=m.refractionRatio),m.lightMap&&(p.lightMap.value=m.lightMap,p.lightMapIntensity.value=m.lightMapIntensity,t(m.lightMap,p.lightMapTransform)),m.aoMap&&(p.aoMap.value=m.aoMap,p.aoMapIntensity.value=m.aoMapIntensity,t(m.aoMap,p.aoMapTransform))}function a(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,m.map&&(p.map.value=m.map,t(m.map,p.mapTransform))}function o(p,m){p.dashSize.value=m.dashSize,p.totalSize.value=m.dashSize+m.gapSize,p.scale.value=m.scale}function c(p,m,x,y){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.size.value=m.size*x,p.scale.value=y*.5,m.map&&(p.map.value=m.map,t(m.map,p.uvTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function u(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.rotation.value=m.rotation,m.map&&(p.map.value=m.map,t(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function d(p,m){p.specular.value.copy(m.specular),p.shininess.value=Math.max(m.shininess,1e-4)}function l(p,m){m.gradientMap&&(p.gradientMap.value=m.gradientMap)}function h(p,m){p.metalness.value=m.metalness,m.metalnessMap&&(p.metalnessMap.value=m.metalnessMap,t(m.metalnessMap,p.metalnessMapTransform)),p.roughness.value=m.roughness,m.roughnessMap&&(p.roughnessMap.value=m.roughnessMap,t(m.roughnessMap,p.roughnessMapTransform)),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)}function f(p,m,x){p.ior.value=m.ior,m.sheen>0&&(p.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),p.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(p.sheenColorMap.value=m.sheenColorMap,t(m.sheenColorMap,p.sheenColorMapTransform)),m.sheenRoughnessMap&&(p.sheenRoughnessMap.value=m.sheenRoughnessMap,t(m.sheenRoughnessMap,p.sheenRoughnessMapTransform))),m.clearcoat>0&&(p.clearcoat.value=m.clearcoat,p.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(p.clearcoatMap.value=m.clearcoatMap,t(m.clearcoatMap,p.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,t(m.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(p.clearcoatNormalMap.value=m.clearcoatNormalMap,t(m.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===Xt&&p.clearcoatNormalScale.value.negate())),m.dispersion>0&&(p.dispersion.value=m.dispersion),m.iridescence>0&&(p.iridescence.value=m.iridescence,p.iridescenceIOR.value=m.iridescenceIOR,p.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(p.iridescenceMap.value=m.iridescenceMap,t(m.iridescenceMap,p.iridescenceMapTransform)),m.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=m.iridescenceThicknessMap,t(m.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),m.transmission>0&&(p.transmission.value=m.transmission,p.transmissionSamplerMap.value=x.texture,p.transmissionSamplerSize.value.set(x.width,x.height),m.transmissionMap&&(p.transmissionMap.value=m.transmissionMap,t(m.transmissionMap,p.transmissionMapTransform)),p.thickness.value=m.thickness,m.thicknessMap&&(p.thicknessMap.value=m.thicknessMap,t(m.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=m.attenuationDistance,p.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(p.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(p.anisotropyMap.value=m.anisotropyMap,t(m.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=m.specularIntensity,p.specularColor.value.copy(m.specularColor),m.specularColorMap&&(p.specularColorMap.value=m.specularColorMap,t(m.specularColorMap,p.specularColorMapTransform)),m.specularIntensityMap&&(p.specularIntensityMap.value=m.specularIntensityMap,t(m.specularIntensityMap,p.specularIntensityMapTransform))}function g(p,m){m.matcap&&(p.matcap.value=m.matcap)}function _(p,m){const x=e.get(m).light;p.referencePosition.value.setFromMatrixPosition(x.matrixWorld),p.nearDistance.value=x.shadow.camera.near,p.farDistance.value=x.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:n}}function By(s,e,t,i){let n={},r={},a=[];const o=s.getParameter(s.MAX_UNIFORM_BUFFER_BINDINGS);function c(x,y){const b=y.program;i.uniformBlockBinding(x,b)}function u(x,y){let b=n[x.id];b===void 0&&(g(x),b=d(x),n[x.id]=b,x.addEventListener("dispose",p));const C=y.program;i.updateUBOMapping(x,C);const E=e.render.frame;r[x.id]!==E&&(h(x),r[x.id]=E)}function d(x){const y=l();x.__bindingPointIndex=y;const b=s.createBuffer(),C=x.__size,E=x.usage;return s.bindBuffer(s.UNIFORM_BUFFER,b),s.bufferData(s.UNIFORM_BUFFER,C,E),s.bindBuffer(s.UNIFORM_BUFFER,null),s.bindBufferBase(s.UNIFORM_BUFFER,y,b),b}function l(){for(let x=0;x<o;x++)if(a.indexOf(x)===-1)return a.push(x),x;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function h(x){const y=n[x.id],b=x.uniforms,C=x.__cache;s.bindBuffer(s.UNIFORM_BUFFER,y);for(let E=0,A=b.length;E<A;E++){const L=Array.isArray(b[E])?b[E]:[b[E]];for(let D=0,v=L.length;D<v;D++){const S=L[D];if(f(S,E,D,C)===!0){const H=S.__offset,F=Array.isArray(S.value)?S.value:[S.value];let P=0;for(let B=0;B<F.length;B++){const O=F[B],j=_(O);typeof O=="number"||typeof O=="boolean"?(S.__data[0]=O,s.bufferSubData(s.UNIFORM_BUFFER,H+P,S.__data)):O.isMatrix3?(S.__data[0]=O.elements[0],S.__data[1]=O.elements[1],S.__data[2]=O.elements[2],S.__data[3]=0,S.__data[4]=O.elements[3],S.__data[5]=O.elements[4],S.__data[6]=O.elements[5],S.__data[7]=0,S.__data[8]=O.elements[6],S.__data[9]=O.elements[7],S.__data[10]=O.elements[8],S.__data[11]=0):(O.toArray(S.__data,P),P+=j.storage/Float32Array.BYTES_PER_ELEMENT)}s.bufferSubData(s.UNIFORM_BUFFER,H,S.__data)}}}s.bindBuffer(s.UNIFORM_BUFFER,null)}function f(x,y,b,C){const E=x.value,A=y+"_"+b;if(C[A]===void 0)return typeof E=="number"||typeof E=="boolean"?C[A]=E:C[A]=E.clone(),!0;{const L=C[A];if(typeof E=="number"||typeof E=="boolean"){if(L!==E)return C[A]=E,!0}else if(L.equals(E)===!1)return L.copy(E),!0}return!1}function g(x){const y=x.uniforms;let b=0;const C=16;for(let A=0,L=y.length;A<L;A++){const D=Array.isArray(y[A])?y[A]:[y[A]];for(let v=0,S=D.length;v<S;v++){const H=D[v],F=Array.isArray(H.value)?H.value:[H.value];for(let P=0,B=F.length;P<B;P++){const O=F[P],j=_(O),V=b%C,se=V%j.boundary,ee=V+se;b+=se,ee!==0&&C-ee<j.storage&&(b+=C-ee),H.__data=new Float32Array(j.storage/Float32Array.BYTES_PER_ELEMENT),H.__offset=b,b+=j.storage}}}const E=b%C;return E>0&&(b+=C-E),x.__size=b,x.__cache={},this}function _(x){const y={boundary:0,storage:0};return typeof x=="number"||typeof x=="boolean"?(y.boundary=4,y.storage=4):x.isVector2?(y.boundary=8,y.storage=8):x.isVector3||x.isColor?(y.boundary=16,y.storage=12):x.isVector4?(y.boundary=16,y.storage=16):x.isMatrix3?(y.boundary=48,y.storage=48):x.isMatrix4?(y.boundary=64,y.storage=64):x.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",x),y}function p(x){const y=x.target;y.removeEventListener("dispose",p);const b=a.indexOf(y.__bindingPointIndex);a.splice(b,1),s.deleteBuffer(n[y.id]),delete n[y.id],delete r[y.id]}function m(){for(const x in n)s.deleteBuffer(n[x]);a=[],n={},r={}}return{bind:c,update:u,dispose:m}}class zy{constructor(e={}){const{canvas:t=Rg(),context:i=null,depth:n=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:u=!1,powerPreference:d="default",failIfMajorPerformanceCaveat:l=!1}=e;this.isWebGLRenderer=!0;let h;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");h=i.getContextAttributes().alpha}else h=a;const f=new Uint32Array(4),g=new Int32Array(4);let _=null,p=null;const m=[],x=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=yt,this.toneMapping=_n,this.toneMappingExposure=1;const y=this;let b=!1,C=0,E=0,A=null,L=-1,D=null;const v=new je,S=new je;let H=null;const F=new Pe(0);let P=0,B=t.width,O=t.height,j=1,V=null,se=null;const ee=new je(0,0,B,O),ce=new je(0,0,B,O);let Ie=!1;const Oe=new pd;let Y=!1,J=!1;const _e=new dt,de=new dt,Le=new z,Me=new je,ze={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let $e=!1;function He(){return A===null?j:1}let I=i;function Jt(M,U){return t.getContext(M,U)}try{const M={alpha:!0,depth:n,stencil:r,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:u,powerPreference:d,failIfMajorPerformanceCaveat:l};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${hc}`),t.addEventListener("webglcontextlost",Q,!1),t.addEventListener("webglcontextrestored",oe,!1),t.addEventListener("webglcontextcreationerror",ue,!1),I===null){const U="webgl2";if(I=Jt(U,M),I===null)throw Jt(U)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(M){throw console.error("THREE.WebGLRenderer: "+M.message),M}let Fe,Ve,Ae,st,Re,R,w,G,Z,$,K,xe,ae,fe,We,ie,pe,Ee,Ce,me,Be,De,it,k;function he(){Fe=new Xv(I),Fe.init(),De=new Py(I,Fe),Ve=new zv(I,Fe,e,De),Ae=new Ey(I),Ve.reverseDepthBuffer&&Ae.buffers.depth.setReversed(!0),st=new Kv(I),Re=new fy,R=new Ry(I,Fe,Ae,Re,Ve,De,st),w=new Gv(y),G=new qv(y),Z=new i0(I),it=new Fv(I,Z),$=new Yv(I,Z,st,it),K=new Qv(I,$,Z,st),Ce=new Zv(I,Ve,R),ie=new Hv(Re),xe=new dy(y,w,G,Fe,Ve,it,ie),ae=new Fy(y,Re),fe=new my,We=new by(Fe),Ee=new Nv(y,w,G,Ae,K,h,c),pe=new Ty(y,K,Ve),k=new By(I,st,Ve,Ae),me=new Bv(I,Fe,st),Be=new jv(I,Fe,st),st.programs=xe.programs,y.capabilities=Ve,y.extensions=Fe,y.properties=Re,y.renderLists=fe,y.shadowMap=pe,y.state=Ae,y.info=st}he();const X=new Oy(y,I);this.xr=X,this.getContext=function(){return I},this.getContextAttributes=function(){return I.getContextAttributes()},this.forceContextLoss=function(){const M=Fe.get("WEBGL_lose_context");M&&M.loseContext()},this.forceContextRestore=function(){const M=Fe.get("WEBGL_lose_context");M&&M.restoreContext()},this.getPixelRatio=function(){return j},this.setPixelRatio=function(M){M!==void 0&&(j=M,this.setSize(B,O,!1))},this.getSize=function(M){return M.set(B,O)},this.setSize=function(M,U,W=!0){if(X.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}B=M,O=U,t.width=Math.floor(M*j),t.height=Math.floor(U*j),W===!0&&(t.style.width=M+"px",t.style.height=U+"px"),this.setViewport(0,0,M,U)},this.getDrawingBufferSize=function(M){return M.set(B*j,O*j).floor()},this.setDrawingBufferSize=function(M,U,W){B=M,O=U,j=W,t.width=Math.floor(M*W),t.height=Math.floor(U*W),this.setViewport(0,0,M,U)},this.getCurrentViewport=function(M){return M.copy(v)},this.getViewport=function(M){return M.copy(ee)},this.setViewport=function(M,U,W,q){M.isVector4?ee.set(M.x,M.y,M.z,M.w):ee.set(M,U,W,q),Ae.viewport(v.copy(ee).multiplyScalar(j).round())},this.getScissor=function(M){return M.copy(ce)},this.setScissor=function(M,U,W,q){M.isVector4?ce.set(M.x,M.y,M.z,M.w):ce.set(M,U,W,q),Ae.scissor(S.copy(ce).multiplyScalar(j).round())},this.getScissorTest=function(){return Ie},this.setScissorTest=function(M){Ae.setScissorTest(Ie=M)},this.setOpaqueSort=function(M){V=M},this.setTransparentSort=function(M){se=M},this.getClearColor=function(M){return M.copy(Ee.getClearColor())},this.setClearColor=function(){Ee.setClearColor.apply(Ee,arguments)},this.getClearAlpha=function(){return Ee.getClearAlpha()},this.setClearAlpha=function(){Ee.setClearAlpha.apply(Ee,arguments)},this.clear=function(M=!0,U=!0,W=!0){let q=0;if(M){let N=!1;if(A!==null){const ne=A.texture.format;N=ne===_c||ne===gc||ne===mc}if(N){const ne=A.texture.type,le=ne===Qi||ne===$n||ne===gr||ne===Ns||ne===fc||ne===pc,ge=Ee.getClearColor(),ve=Ee.getClearAlpha(),Se=ge.r,Te=ge.g,ye=ge.b;le?(f[0]=Se,f[1]=Te,f[2]=ye,f[3]=ve,I.clearBufferuiv(I.COLOR,0,f)):(g[0]=Se,g[1]=Te,g[2]=ye,g[3]=ve,I.clearBufferiv(I.COLOR,0,g))}else q|=I.COLOR_BUFFER_BIT}U&&(q|=I.DEPTH_BUFFER_BIT,I.clearDepth(this.capabilities.reverseDepthBuffer?0:1)),W&&(q|=I.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),I.clear(q)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",Q,!1),t.removeEventListener("webglcontextrestored",oe,!1),t.removeEventListener("webglcontextcreationerror",ue,!1),fe.dispose(),We.dispose(),Re.dispose(),w.dispose(),G.dispose(),K.dispose(),it.dispose(),k.dispose(),xe.dispose(),X.dispose(),X.removeEventListener("sessionstart",Gc),X.removeEventListener("sessionend",Vc),Pn.stop()};function Q(M){M.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),b=!0}function oe(){console.log("THREE.WebGLRenderer: Context Restored."),b=!1;const M=st.autoReset,U=pe.enabled,W=pe.autoUpdate,q=pe.needsUpdate,N=pe.type;he(),st.autoReset=M,pe.enabled=U,pe.autoUpdate=W,pe.needsUpdate=q,pe.type=N}function ue(M){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",M.statusMessage)}function Ge(M){const U=M.target;U.removeEventListener("dispose",Ge),_t(U)}function _t(M){Vt(M),Re.remove(M)}function Vt(M){const U=Re.get(M).programs;U!==void 0&&(U.forEach(function(W){xe.releaseProgram(W)}),M.isShaderMaterial&&xe.releaseShaderCache(M))}this.renderBufferDirect=function(M,U,W,q,N,ne){U===null&&(U=ze);const le=N.isMesh&&N.matrixWorld.determinant()<0,ge=Lf(M,U,W,q,N);Ae.setMaterial(q,le);let ve=W.index,Se=1;if(q.wireframe===!0){if(ve=$.getWireframeAttribute(W),ve===void 0)return;Se=2}const Te=W.drawRange,ye=W.attributes.position;let Qe=Te.start*Se,rt=(Te.start+Te.count)*Se;ne!==null&&(Qe=Math.max(Qe,ne.start*Se),rt=Math.min(rt,(ne.start+ne.count)*Se)),ve!==null?(Qe=Math.max(Qe,0),rt=Math.min(rt,ve.count)):ye!=null&&(Qe=Math.max(Qe,0),rt=Math.min(rt,ye.count));const ht=rt-Qe;if(ht<0||ht===1/0)return;it.setup(N,q,ge,W,ve);let $t,Ke=me;if(ve!==null&&($t=Z.get(ve),Ke=Be,Ke.setIndex($t)),N.isMesh)q.wireframe===!0?(Ae.setLineWidth(q.wireframeLinewidth*He()),Ke.setMode(I.LINES)):Ke.setMode(I.TRIANGLES);else if(N.isLine){let be=q.linewidth;be===void 0&&(be=1),Ae.setLineWidth(be*He()),N.isLineSegments?Ke.setMode(I.LINES):N.isLineLoop?Ke.setMode(I.LINE_LOOP):Ke.setMode(I.LINE_STRIP)}else N.isPoints?Ke.setMode(I.POINTS):N.isSprite&&Ke.setMode(I.TRIANGLES);if(N.isBatchedMesh)if(N._multiDrawInstances!==null)Ke.renderMultiDrawInstances(N._multiDrawStarts,N._multiDrawCounts,N._multiDrawCount,N._multiDrawInstances);else if(Fe.get("WEBGL_multi_draw"))Ke.renderMultiDraw(N._multiDrawStarts,N._multiDrawCounts,N._multiDrawCount);else{const be=N._multiDrawStarts,Ct=N._multiDrawCounts,Ze=N._multiDrawCount,yi=ve?Z.get(ve).bytesPerElement:1,is=Re.get(q).currentProgram.getUniforms();for(let ei=0;ei<Ze;ei++)is.setValue(I,"_gl_DrawID",ei),Ke.render(be[ei]/yi,Ct[ei])}else if(N.isInstancedMesh)Ke.renderInstances(Qe,ht,N.count);else if(W.isInstancedBufferGeometry){const be=W._maxInstanceCount!==void 0?W._maxInstanceCount:1/0,Ct=Math.min(W.instanceCount,be);Ke.renderInstances(Qe,ht,Ct)}else Ke.render(Qe,ht)};function Xe(M,U,W){M.transparent===!0&&M.side===Wi&&M.forceSinglePass===!1?(M.side=Xt,M.needsUpdate=!0,Or(M,U,W),M.side=yn,M.needsUpdate=!0,Or(M,U,W),M.side=Wi):Or(M,U,W)}this.compile=function(M,U,W=null){W===null&&(W=M),p=We.get(W),p.init(U),x.push(p),W.traverseVisible(function(N){N.isLight&&N.layers.test(U.layers)&&(p.pushLight(N),N.castShadow&&p.pushShadow(N))}),M!==W&&M.traverseVisible(function(N){N.isLight&&N.layers.test(U.layers)&&(p.pushLight(N),N.castShadow&&p.pushShadow(N))}),p.setupLights();const q=new Set;return M.traverse(function(N){if(!(N.isMesh||N.isPoints||N.isLine||N.isSprite))return;const ne=N.material;if(ne)if(Array.isArray(ne))for(let le=0;le<ne.length;le++){const ge=ne[le];Xe(ge,W,N),q.add(ge)}else Xe(ne,W,N),q.add(ne)}),x.pop(),p=null,q},this.compileAsync=function(M,U,W=null){const q=this.compile(M,U,W);return new Promise(N=>{function ne(){if(q.forEach(function(le){Re.get(le).currentProgram.isReady()&&q.delete(le)}),q.size===0){N(M);return}setTimeout(ne,10)}Fe.get("KHR_parallel_shader_compile")!==null?ne():setTimeout(ne,10)})};let Wt=null;function ki(M){Wt&&Wt(M)}function Gc(){Pn.stop()}function Vc(){Pn.start()}const Pn=new md;Pn.setAnimationLoop(ki),typeof self<"u"&&Pn.setContext(self),this.setAnimationLoop=function(M){Wt=M,X.setAnimationLoop(M),M===null?Pn.stop():Pn.start()},X.addEventListener("sessionstart",Gc),X.addEventListener("sessionend",Vc),this.render=function(M,U){if(U!==void 0&&U.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(b===!0)return;if(M.matrixWorldAutoUpdate===!0&&M.updateMatrixWorld(),U.parent===null&&U.matrixWorldAutoUpdate===!0&&U.updateMatrixWorld(),X.enabled===!0&&X.isPresenting===!0&&(X.cameraAutoUpdate===!0&&X.updateCamera(U),U=X.getCamera()),M.isScene===!0&&M.onBeforeRender(y,M,U,A),p=We.get(M,x.length),p.init(U),x.push(p),de.multiplyMatrices(U.projectionMatrix,U.matrixWorldInverse),Oe.setFromProjectionMatrix(de),J=this.localClippingEnabled,Y=ie.init(this.clippingPlanes,J),_=fe.get(M,m.length),_.init(),m.push(_),X.enabled===!0&&X.isPresenting===!0){const ne=y.xr.getDepthSensingMesh();ne!==null&&no(ne,U,-1/0,y.sortObjects)}no(M,U,0,y.sortObjects),_.finish(),y.sortObjects===!0&&_.sort(V,se),$e=X.enabled===!1||X.isPresenting===!1||X.hasDepthSensing()===!1,$e&&Ee.addToRenderList(_,M),this.info.render.frame++,Y===!0&&ie.beginShadows();const W=p.state.shadowsArray;pe.render(W,M,U),Y===!0&&ie.endShadows(),this.info.autoReset===!0&&this.info.reset();const q=_.opaque,N=_.transmissive;if(p.setupLights(),U.isArrayCamera){const ne=U.cameras;if(N.length>0)for(let le=0,ge=ne.length;le<ge;le++){const ve=ne[le];qc(q,N,M,ve)}$e&&Ee.render(M);for(let le=0,ge=ne.length;le<ge;le++){const ve=ne[le];Wc(_,M,ve,ve.viewport)}}else N.length>0&&qc(q,N,M,U),$e&&Ee.render(M),Wc(_,M,U);A!==null&&(R.updateMultisampleRenderTarget(A),R.updateRenderTargetMipmap(A)),M.isScene===!0&&M.onAfterRender(y,M,U),it.resetDefaultState(),L=-1,D=null,x.pop(),x.length>0?(p=x[x.length-1],Y===!0&&ie.setGlobalState(y.clippingPlanes,p.state.camera)):p=null,m.pop(),m.length>0?_=m[m.length-1]:_=null};function no(M,U,W,q){if(M.visible===!1)return;if(M.layers.test(U.layers)){if(M.isGroup)W=M.renderOrder;else if(M.isLOD)M.autoUpdate===!0&&M.update(U);else if(M.isLight)p.pushLight(M),M.castShadow&&p.pushShadow(M);else if(M.isSprite){if(!M.frustumCulled||Oe.intersectsSprite(M)){q&&Me.setFromMatrixPosition(M.matrixWorld).applyMatrix4(de);const le=K.update(M),ge=M.material;ge.visible&&_.push(M,le,ge,W,Me.z,null)}}else if((M.isMesh||M.isLine||M.isPoints)&&(!M.frustumCulled||Oe.intersectsObject(M))){const le=K.update(M),ge=M.material;if(q&&(M.boundingSphere!==void 0?(M.boundingSphere===null&&M.computeBoundingSphere(),Me.copy(M.boundingSphere.center)):(le.boundingSphere===null&&le.computeBoundingSphere(),Me.copy(le.boundingSphere.center)),Me.applyMatrix4(M.matrixWorld).applyMatrix4(de)),Array.isArray(ge)){const ve=le.groups;for(let Se=0,Te=ve.length;Se<Te;Se++){const ye=ve[Se],Qe=ge[ye.materialIndex];Qe&&Qe.visible&&_.push(M,le,Qe,W,Me.z,ye)}}else ge.visible&&_.push(M,le,ge,W,Me.z,null)}}const ne=M.children;for(let le=0,ge=ne.length;le<ge;le++)no(ne[le],U,W,q)}function Wc(M,U,W,q){const N=M.opaque,ne=M.transmissive,le=M.transparent;p.setupLightsView(W),Y===!0&&ie.setGlobalState(y.clippingPlanes,W),q&&Ae.viewport(v.copy(q)),N.length>0&&Ur(N,U,W),ne.length>0&&Ur(ne,U,W),le.length>0&&Ur(le,U,W),Ae.buffers.depth.setTest(!0),Ae.buffers.depth.setMask(!0),Ae.buffers.color.setMask(!0),Ae.setPolygonOffset(!1)}function qc(M,U,W,q){if((W.isScene===!0?W.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[q.id]===void 0&&(p.state.transmissionRenderTarget[q.id]=new Ht(1,1,{generateMipmaps:!0,type:Fe.has("EXT_color_buffer_half_float")||Fe.has("EXT_color_buffer_float")?oi:Qi,minFilter:dn,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Ye.workingColorSpace}));const ne=p.state.transmissionRenderTarget[q.id],le=q.viewport||v;ne.setSize(le.z,le.w);const ge=y.getRenderTarget();y.setRenderTarget(ne),y.getClearColor(F),P=y.getClearAlpha(),P<1&&y.setClearColor(16777215,.5),y.clear(),$e&&Ee.render(W);const ve=y.toneMapping;y.toneMapping=_n;const Se=q.viewport;if(q.viewport!==void 0&&(q.viewport=void 0),p.setupLightsView(q),Y===!0&&ie.setGlobalState(y.clippingPlanes,q),Ur(M,W,q),R.updateMultisampleRenderTarget(ne),R.updateRenderTargetMipmap(ne),Fe.has("WEBGL_multisampled_render_to_texture")===!1){let Te=!1;for(let ye=0,Qe=U.length;ye<Qe;ye++){const rt=U[ye],ht=rt.object,$t=rt.geometry,Ke=rt.material,be=rt.group;if(Ke.side===Wi&&ht.layers.test(q.layers)){const Ct=Ke.side;Ke.side=Xt,Ke.needsUpdate=!0,Xc(ht,W,q,$t,Ke,be),Ke.side=Ct,Ke.needsUpdate=!0,Te=!0}}Te===!0&&(R.updateMultisampleRenderTarget(ne),R.updateRenderTargetMipmap(ne))}y.setRenderTarget(ge),y.setClearColor(F,P),Se!==void 0&&(q.viewport=Se),y.toneMapping=ve}function Ur(M,U,W){const q=U.isScene===!0?U.overrideMaterial:null;for(let N=0,ne=M.length;N<ne;N++){const le=M[N],ge=le.object,ve=le.geometry,Se=q===null?le.material:q,Te=le.group;ge.layers.test(W.layers)&&Xc(ge,U,W,ve,Se,Te)}}function Xc(M,U,W,q,N,ne){M.onBeforeRender(y,U,W,q,N,ne),M.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,M.matrixWorld),M.normalMatrix.getNormalMatrix(M.modelViewMatrix),N.onBeforeRender(y,U,W,q,M,ne),N.transparent===!0&&N.side===Wi&&N.forceSinglePass===!1?(N.side=Xt,N.needsUpdate=!0,y.renderBufferDirect(W,U,q,N,M,ne),N.side=yn,N.needsUpdate=!0,y.renderBufferDirect(W,U,q,N,M,ne),N.side=Wi):y.renderBufferDirect(W,U,q,N,M,ne),M.onAfterRender(y,U,W,q,N,ne)}function Or(M,U,W){U.isScene!==!0&&(U=ze);const q=Re.get(M),N=p.state.lights,ne=p.state.shadowsArray,le=N.state.version,ge=xe.getParameters(M,N.state,ne,U,W),ve=xe.getProgramCacheKey(ge);let Se=q.programs;q.environment=M.isMeshStandardMaterial?U.environment:null,q.fog=U.fog,q.envMap=(M.isMeshStandardMaterial?G:w).get(M.envMap||q.environment),q.envMapRotation=q.environment!==null&&M.envMap===null?U.environmentRotation:M.envMapRotation,Se===void 0&&(M.addEventListener("dispose",Ge),Se=new Map,q.programs=Se);let Te=Se.get(ve);if(Te!==void 0){if(q.currentProgram===Te&&q.lightsStateVersion===le)return jc(M,ge),Te}else ge.uniforms=xe.getUniforms(M),M.onBeforeCompile(ge,y),Te=xe.acquireProgram(ge,ve),Se.set(ve,Te),q.uniforms=ge.uniforms;const ye=q.uniforms;return(!M.isShaderMaterial&&!M.isRawShaderMaterial||M.clipping===!0)&&(ye.clippingPlanes=ie.uniform),jc(M,ge),q.needsLights=If(M),q.lightsStateVersion=le,q.needsLights&&(ye.ambientLightColor.value=N.state.ambient,ye.lightProbe.value=N.state.probe,ye.directionalLights.value=N.state.directional,ye.directionalLightShadows.value=N.state.directionalShadow,ye.spotLights.value=N.state.spot,ye.spotLightShadows.value=N.state.spotShadow,ye.rectAreaLights.value=N.state.rectArea,ye.ltc_1.value=N.state.rectAreaLTC1,ye.ltc_2.value=N.state.rectAreaLTC2,ye.pointLights.value=N.state.point,ye.pointLightShadows.value=N.state.pointShadow,ye.hemisphereLights.value=N.state.hemi,ye.directionalShadowMap.value=N.state.directionalShadowMap,ye.directionalShadowMatrix.value=N.state.directionalShadowMatrix,ye.spotShadowMap.value=N.state.spotShadowMap,ye.spotLightMatrix.value=N.state.spotLightMatrix,ye.spotLightMap.value=N.state.spotLightMap,ye.pointShadowMap.value=N.state.pointShadowMap,ye.pointShadowMatrix.value=N.state.pointShadowMatrix),q.currentProgram=Te,q.uniformsList=null,Te}function Yc(M){if(M.uniformsList===null){const U=M.currentProgram.getUniforms();M.uniformsList=Ra.seqWithValue(U.seq,M.uniforms)}return M.uniformsList}function jc(M,U){const W=Re.get(M);W.outputColorSpace=U.outputColorSpace,W.batching=U.batching,W.batchingColor=U.batchingColor,W.instancing=U.instancing,W.instancingColor=U.instancingColor,W.instancingMorph=U.instancingMorph,W.skinning=U.skinning,W.morphTargets=U.morphTargets,W.morphNormals=U.morphNormals,W.morphColors=U.morphColors,W.morphTargetsCount=U.morphTargetsCount,W.numClippingPlanes=U.numClippingPlanes,W.numIntersection=U.numClipIntersection,W.vertexAlphas=U.vertexAlphas,W.vertexTangents=U.vertexTangents,W.toneMapping=U.toneMapping}function Lf(M,U,W,q,N){U.isScene!==!0&&(U=ze),R.resetTextureUnits();const ne=U.fog,le=q.isMeshStandardMaterial?U.environment:null,ge=A===null?y.outputColorSpace:A.isXRRenderTarget===!0?A.texture.colorSpace:An,ve=(q.isMeshStandardMaterial?G:w).get(q.envMap||le),Se=q.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,Te=!!W.attributes.tangent&&(!!q.normalMap||q.anisotropy>0),ye=!!W.morphAttributes.position,Qe=!!W.morphAttributes.normal,rt=!!W.morphAttributes.color;let ht=_n;q.toneMapped&&(A===null||A.isXRRenderTarget===!0)&&(ht=y.toneMapping);const $t=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,Ke=$t!==void 0?$t.length:0,be=Re.get(q),Ct=p.state.lights;if(Y===!0&&(J===!0||M!==D)){const di=M===D&&q.id===L;ie.setState(q,M,di)}let Ze=!1;q.version===be.__version?(be.needsLights&&be.lightsStateVersion!==Ct.state.version||be.outputColorSpace!==ge||N.isBatchedMesh&&be.batching===!1||!N.isBatchedMesh&&be.batching===!0||N.isBatchedMesh&&be.batchingColor===!0&&N.colorTexture===null||N.isBatchedMesh&&be.batchingColor===!1&&N.colorTexture!==null||N.isInstancedMesh&&be.instancing===!1||!N.isInstancedMesh&&be.instancing===!0||N.isSkinnedMesh&&be.skinning===!1||!N.isSkinnedMesh&&be.skinning===!0||N.isInstancedMesh&&be.instancingColor===!0&&N.instanceColor===null||N.isInstancedMesh&&be.instancingColor===!1&&N.instanceColor!==null||N.isInstancedMesh&&be.instancingMorph===!0&&N.morphTexture===null||N.isInstancedMesh&&be.instancingMorph===!1&&N.morphTexture!==null||be.envMap!==ve||q.fog===!0&&be.fog!==ne||be.numClippingPlanes!==void 0&&(be.numClippingPlanes!==ie.numPlanes||be.numIntersection!==ie.numIntersection)||be.vertexAlphas!==Se||be.vertexTangents!==Te||be.morphTargets!==ye||be.morphNormals!==Qe||be.morphColors!==rt||be.toneMapping!==ht||be.morphTargetsCount!==Ke)&&(Ze=!0):(Ze=!0,be.__version=q.version);let yi=be.currentProgram;Ze===!0&&(yi=Or(q,U,N));let is=!1,ei=!1,so=!1;const ft=yi.getUniforms(),tn=be.uniforms;if(Ae.useProgram(yi.program)&&(is=!0,ei=!0,so=!0),q.id!==L&&(L=q.id,ei=!0),is||D!==M){Ve.reverseDepthBuffer?(_e.copy(M.projectionMatrix),Lg(_e),Dg(_e),ft.setValue(I,"projectionMatrix",_e)):ft.setValue(I,"projectionMatrix",M.projectionMatrix),ft.setValue(I,"viewMatrix",M.matrixWorldInverse);const di=ft.map.cameraPosition;di!==void 0&&di.setValue(I,Le.setFromMatrixPosition(M.matrixWorld)),Ve.logarithmicDepthBuffer&&ft.setValue(I,"logDepthBufFC",2/(Math.log(M.far+1)/Math.LN2)),(q.isMeshPhongMaterial||q.isMeshToonMaterial||q.isMeshLambertMaterial||q.isMeshBasicMaterial||q.isMeshStandardMaterial||q.isShaderMaterial)&&ft.setValue(I,"isOrthographic",M.isOrthographicCamera===!0),D!==M&&(D=M,ei=!0,so=!0)}if(N.isSkinnedMesh){ft.setOptional(I,N,"bindMatrix"),ft.setOptional(I,N,"bindMatrixInverse");const di=N.skeleton;di&&(di.boneTexture===null&&di.computeBoneTexture(),ft.setValue(I,"boneTexture",di.boneTexture,R))}N.isBatchedMesh&&(ft.setOptional(I,N,"batchingTexture"),ft.setValue(I,"batchingTexture",N._matricesTexture,R),ft.setOptional(I,N,"batchingIdTexture"),ft.setValue(I,"batchingIdTexture",N._indirectTexture,R),ft.setOptional(I,N,"batchingColorTexture"),N._colorsTexture!==null&&ft.setValue(I,"batchingColorTexture",N._colorsTexture,R));const ro=W.morphAttributes;if((ro.position!==void 0||ro.normal!==void 0||ro.color!==void 0)&&Ce.update(N,W,yi),(ei||be.receiveShadow!==N.receiveShadow)&&(be.receiveShadow=N.receiveShadow,ft.setValue(I,"receiveShadow",N.receiveShadow)),q.isMeshGouraudMaterial&&q.envMap!==null&&(tn.envMap.value=ve,tn.flipEnvMap.value=ve.isCubeTexture&&ve.isRenderTargetTexture===!1?-1:1),q.isMeshStandardMaterial&&q.envMap===null&&U.environment!==null&&(tn.envMapIntensity.value=U.environmentIntensity),ei&&(ft.setValue(I,"toneMappingExposure",y.toneMappingExposure),be.needsLights&&Df(tn,so),ne&&q.fog===!0&&ae.refreshFogUniforms(tn,ne),ae.refreshMaterialUniforms(tn,q,j,O,p.state.transmissionRenderTarget[M.id]),Ra.upload(I,Yc(be),tn,R)),q.isShaderMaterial&&q.uniformsNeedUpdate===!0&&(Ra.upload(I,Yc(be),tn,R),q.uniformsNeedUpdate=!1),q.isSpriteMaterial&&ft.setValue(I,"center",N.center),ft.setValue(I,"modelViewMatrix",N.modelViewMatrix),ft.setValue(I,"normalMatrix",N.normalMatrix),ft.setValue(I,"modelMatrix",N.matrixWorld),q.isShaderMaterial||q.isRawShaderMaterial){const di=q.uniformsGroups;for(let ao=0,kf=di.length;ao<kf;ao++){const Kc=di[ao];k.update(Kc,yi),k.bind(Kc,yi)}}return yi}function Df(M,U){M.ambientLightColor.needsUpdate=U,M.lightProbe.needsUpdate=U,M.directionalLights.needsUpdate=U,M.directionalLightShadows.needsUpdate=U,M.pointLights.needsUpdate=U,M.pointLightShadows.needsUpdate=U,M.spotLights.needsUpdate=U,M.spotLightShadows.needsUpdate=U,M.rectAreaLights.needsUpdate=U,M.hemisphereLights.needsUpdate=U}function If(M){return M.isMeshLambertMaterial||M.isMeshToonMaterial||M.isMeshPhongMaterial||M.isMeshStandardMaterial||M.isShadowMaterial||M.isShaderMaterial&&M.lights===!0}this.getActiveCubeFace=function(){return C},this.getActiveMipmapLevel=function(){return E},this.getRenderTarget=function(){return A},this.setRenderTargetTextures=function(M,U,W){Re.get(M.texture).__webglTexture=U,Re.get(M.depthTexture).__webglTexture=W;const q=Re.get(M);q.__hasExternalTextures=!0,q.__autoAllocateDepthBuffer=W===void 0,q.__autoAllocateDepthBuffer||Fe.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),q.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(M,U){const W=Re.get(M);W.__webglFramebuffer=U,W.__useDefaultFramebuffer=U===void 0},this.setRenderTarget=function(M,U=0,W=0){A=M,C=U,E=W;let q=!0,N=null,ne=!1,le=!1;if(M){const ve=Re.get(M);if(ve.__useDefaultFramebuffer!==void 0)Ae.bindFramebuffer(I.FRAMEBUFFER,null),q=!1;else if(ve.__webglFramebuffer===void 0)R.setupRenderTarget(M);else if(ve.__hasExternalTextures)R.rebindTextures(M,Re.get(M.texture).__webglTexture,Re.get(M.depthTexture).__webglTexture);else if(M.depthBuffer){const ye=M.depthTexture;if(ve.__boundDepthTexture!==ye){if(ye!==null&&Re.has(ye)&&(M.width!==ye.image.width||M.height!==ye.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");R.setupDepthRenderbuffer(M)}}const Se=M.texture;(Se.isData3DTexture||Se.isDataArrayTexture||Se.isCompressedArrayTexture)&&(le=!0);const Te=Re.get(M).__webglFramebuffer;M.isWebGLCubeRenderTarget?(Array.isArray(Te[U])?N=Te[U][W]:N=Te[U],ne=!0):M.samples>0&&R.useMultisampledRTT(M)===!1?N=Re.get(M).__webglMultisampledFramebuffer:Array.isArray(Te)?N=Te[W]:N=Te,v.copy(M.viewport),S.copy(M.scissor),H=M.scissorTest}else v.copy(ee).multiplyScalar(j).floor(),S.copy(ce).multiplyScalar(j).floor(),H=Ie;if(Ae.bindFramebuffer(I.FRAMEBUFFER,N)&&q&&Ae.drawBuffers(M,N),Ae.viewport(v),Ae.scissor(S),Ae.setScissorTest(H),ne){const ve=Re.get(M.texture);I.framebufferTexture2D(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_CUBE_MAP_POSITIVE_X+U,ve.__webglTexture,W)}else if(le){const ve=Re.get(M.texture),Se=U||0;I.framebufferTextureLayer(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,ve.__webglTexture,W||0,Se)}L=-1},this.readRenderTargetPixels=function(M,U,W,q,N,ne,le){if(!(M&&M.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let ge=Re.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&le!==void 0&&(ge=ge[le]),ge){Ae.bindFramebuffer(I.FRAMEBUFFER,ge);try{const ve=M.texture,Se=ve.format,Te=ve.type;if(!Ve.textureFormatReadable(Se)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Ve.textureTypeReadable(Te)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}U>=0&&U<=M.width-q&&W>=0&&W<=M.height-N&&I.readPixels(U,W,q,N,De.convert(Se),De.convert(Te),ne)}finally{const ve=A!==null?Re.get(A).__webglFramebuffer:null;Ae.bindFramebuffer(I.FRAMEBUFFER,ve)}}},this.readRenderTargetPixelsAsync=async function(M,U,W,q,N,ne,le){if(!(M&&M.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let ge=Re.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&le!==void 0&&(ge=ge[le]),ge){const ve=M.texture,Se=ve.format,Te=ve.type;if(!Ve.textureFormatReadable(Se))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Ve.textureTypeReadable(Te))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(U>=0&&U<=M.width-q&&W>=0&&W<=M.height-N){Ae.bindFramebuffer(I.FRAMEBUFFER,ge);const ye=I.createBuffer();I.bindBuffer(I.PIXEL_PACK_BUFFER,ye),I.bufferData(I.PIXEL_PACK_BUFFER,ne.byteLength,I.STREAM_READ),I.readPixels(U,W,q,N,De.convert(Se),De.convert(Te),0);const Qe=A!==null?Re.get(A).__webglFramebuffer:null;Ae.bindFramebuffer(I.FRAMEBUFFER,Qe);const rt=I.fenceSync(I.SYNC_GPU_COMMANDS_COMPLETE,0);return I.flush(),await Pg(I,rt,4),I.bindBuffer(I.PIXEL_PACK_BUFFER,ye),I.getBufferSubData(I.PIXEL_PACK_BUFFER,0,ne),I.deleteBuffer(ye),I.deleteSync(rt),ne}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(M,U=null,W=0){M.isTexture!==!0&&(Ca("WebGLRenderer: copyFramebufferToTexture function signature has changed."),U=arguments[0]||null,M=arguments[1]);const q=Math.pow(2,-W),N=Math.floor(M.image.width*q),ne=Math.floor(M.image.height*q),le=U!==null?U.x:0,ge=U!==null?U.y:0;R.setTexture2D(M,0),I.copyTexSubImage2D(I.TEXTURE_2D,W,0,0,le,ge,N,ne),Ae.unbindTexture()},this.copyTextureToTexture=function(M,U,W=null,q=null,N=0){M.isTexture!==!0&&(Ca("WebGLRenderer: copyTextureToTexture function signature has changed."),q=arguments[0]||null,M=arguments[1],U=arguments[2],N=arguments[3]||0,W=null);let ne,le,ge,ve,Se,Te;W!==null?(ne=W.max.x-W.min.x,le=W.max.y-W.min.y,ge=W.min.x,ve=W.min.y):(ne=M.image.width,le=M.image.height,ge=0,ve=0),q!==null?(Se=q.x,Te=q.y):(Se=0,Te=0);const ye=De.convert(U.format),Qe=De.convert(U.type);R.setTexture2D(U,0),I.pixelStorei(I.UNPACK_FLIP_Y_WEBGL,U.flipY),I.pixelStorei(I.UNPACK_PREMULTIPLY_ALPHA_WEBGL,U.premultiplyAlpha),I.pixelStorei(I.UNPACK_ALIGNMENT,U.unpackAlignment);const rt=I.getParameter(I.UNPACK_ROW_LENGTH),ht=I.getParameter(I.UNPACK_IMAGE_HEIGHT),$t=I.getParameter(I.UNPACK_SKIP_PIXELS),Ke=I.getParameter(I.UNPACK_SKIP_ROWS),be=I.getParameter(I.UNPACK_SKIP_IMAGES),Ct=M.isCompressedTexture?M.mipmaps[N]:M.image;I.pixelStorei(I.UNPACK_ROW_LENGTH,Ct.width),I.pixelStorei(I.UNPACK_IMAGE_HEIGHT,Ct.height),I.pixelStorei(I.UNPACK_SKIP_PIXELS,ge),I.pixelStorei(I.UNPACK_SKIP_ROWS,ve),M.isDataTexture?I.texSubImage2D(I.TEXTURE_2D,N,Se,Te,ne,le,ye,Qe,Ct.data):M.isCompressedTexture?I.compressedTexSubImage2D(I.TEXTURE_2D,N,Se,Te,Ct.width,Ct.height,ye,Ct.data):I.texSubImage2D(I.TEXTURE_2D,N,Se,Te,ne,le,ye,Qe,Ct),I.pixelStorei(I.UNPACK_ROW_LENGTH,rt),I.pixelStorei(I.UNPACK_IMAGE_HEIGHT,ht),I.pixelStorei(I.UNPACK_SKIP_PIXELS,$t),I.pixelStorei(I.UNPACK_SKIP_ROWS,Ke),I.pixelStorei(I.UNPACK_SKIP_IMAGES,be),N===0&&U.generateMipmaps&&I.generateMipmap(I.TEXTURE_2D),Ae.unbindTexture()},this.copyTextureToTexture3D=function(M,U,W=null,q=null,N=0){M.isTexture!==!0&&(Ca("WebGLRenderer: copyTextureToTexture3D function signature has changed."),W=arguments[0]||null,q=arguments[1]||null,M=arguments[2],U=arguments[3],N=arguments[4]||0);let ne,le,ge,ve,Se,Te,ye,Qe,rt;const ht=M.isCompressedTexture?M.mipmaps[N]:M.image;W!==null?(ne=W.max.x-W.min.x,le=W.max.y-W.min.y,ge=W.max.z-W.min.z,ve=W.min.x,Se=W.min.y,Te=W.min.z):(ne=ht.width,le=ht.height,ge=ht.depth,ve=0,Se=0,Te=0),q!==null?(ye=q.x,Qe=q.y,rt=q.z):(ye=0,Qe=0,rt=0);const $t=De.convert(U.format),Ke=De.convert(U.type);let be;if(U.isData3DTexture)R.setTexture3D(U,0),be=I.TEXTURE_3D;else if(U.isDataArrayTexture||U.isCompressedArrayTexture)R.setTexture2DArray(U,0),be=I.TEXTURE_2D_ARRAY;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}I.pixelStorei(I.UNPACK_FLIP_Y_WEBGL,U.flipY),I.pixelStorei(I.UNPACK_PREMULTIPLY_ALPHA_WEBGL,U.premultiplyAlpha),I.pixelStorei(I.UNPACK_ALIGNMENT,U.unpackAlignment);const Ct=I.getParameter(I.UNPACK_ROW_LENGTH),Ze=I.getParameter(I.UNPACK_IMAGE_HEIGHT),yi=I.getParameter(I.UNPACK_SKIP_PIXELS),is=I.getParameter(I.UNPACK_SKIP_ROWS),ei=I.getParameter(I.UNPACK_SKIP_IMAGES);I.pixelStorei(I.UNPACK_ROW_LENGTH,ht.width),I.pixelStorei(I.UNPACK_IMAGE_HEIGHT,ht.height),I.pixelStorei(I.UNPACK_SKIP_PIXELS,ve),I.pixelStorei(I.UNPACK_SKIP_ROWS,Se),I.pixelStorei(I.UNPACK_SKIP_IMAGES,Te),M.isDataTexture||M.isData3DTexture?I.texSubImage3D(be,N,ye,Qe,rt,ne,le,ge,$t,Ke,ht.data):U.isCompressedArrayTexture?I.compressedTexSubImage3D(be,N,ye,Qe,rt,ne,le,ge,$t,ht.data):I.texSubImage3D(be,N,ye,Qe,rt,ne,le,ge,$t,Ke,ht),I.pixelStorei(I.UNPACK_ROW_LENGTH,Ct),I.pixelStorei(I.UNPACK_IMAGE_HEIGHT,Ze),I.pixelStorei(I.UNPACK_SKIP_PIXELS,yi),I.pixelStorei(I.UNPACK_SKIP_ROWS,is),I.pixelStorei(I.UNPACK_SKIP_IMAGES,ei),N===0&&U.generateMipmaps&&I.generateMipmap(be),Ae.unbindTexture()},this.initRenderTarget=function(M){Re.get(M).__webglFramebuffer===void 0&&R.setupRenderTarget(M)},this.initTexture=function(M){M.isCubeTexture?R.setTextureCube(M,0):M.isData3DTexture?R.setTexture3D(M,0):M.isDataArrayTexture||M.isCompressedArrayTexture?R.setTexture2DArray(M,0):R.setTexture2D(M,0),Ae.unbindTexture()},this.resetState=function(){C=0,E=0,A=null,Ae.reset(),it.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Yi}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=e===vc?"display-p3":"srgb",t.unpackColorSpace=Ye.workingColorSpace===Qa?"display-p3":"srgb"}}class Hy extends Gt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Ji,this.environmentIntensity=1,this.environmentRotation=new Ji,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class Gy{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=Wl,this.updateRanges=[],this.version=0,this.uuid=ji()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,i){e*=this.stride,i*=t.stride;for(let n=0,r=this.stride;n<r;n++)this.array[e+n]=t.array[i+n];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=ji()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),i=new this.constructor(t,this.stride);return i.setUsage(this.usage),i}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=ji()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}const Ot=new z;class Ba{constructor(e,t,i,n=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=i,this.normalized=n}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,i=this.data.count;t<i;t++)Ot.fromBufferAttribute(this,t),Ot.applyMatrix4(e),this.setXYZ(t,Ot.x,Ot.y,Ot.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)Ot.fromBufferAttribute(this,t),Ot.applyNormalMatrix(e),this.setXYZ(t,Ot.x,Ot.y,Ot.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)Ot.fromBufferAttribute(this,t),Ot.transformDirection(e),this.setXYZ(t,Ot.x,Ot.y,Ot.z);return this}getComponent(e,t){let i=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(i=Mi(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=Je(i,this.array)),this.data.array[e*this.data.stride+this.offset+t]=i,this}setX(e,t){return this.normalized&&(t=Je(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=Je(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=Je(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=Je(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=Mi(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=Mi(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=Mi(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=Mi(t,this.array)),t}setXY(e,t,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=Je(t,this.array),i=Je(i,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this}setXYZ(e,t,i,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=Je(t,this.array),i=Je(i,this.array),n=Je(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this.data.array[e+2]=n,this}setXYZW(e,t,i,n,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=Je(t,this.array),i=Je(i,this.array),n=Je(n,this.array),r=Je(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this.data.array[e+2]=n,this.data.array[e+3]=r,this}clone(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let i=0;i<this.count;i++){const n=i*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[n+r])}return new li(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new Ba(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let i=0;i<this.count;i++){const n=i*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[n+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}class Sd extends Ys{constructor(e){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new Pe(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}let _s;const tr=new z,vs=new z,xs=new z,ys=new we,ir=new we,Md=new dt,ra=new z,nr=new z,aa=new z,Xh=new we,zo=new we,Yh=new we;class Vy extends Gt{constructor(e=new Sd){if(super(),this.isSprite=!0,this.type="Sprite",_s===void 0){_s=new Ai;const t=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),i=new Gy(t,5);_s.setIndex([0,1,2,0,2,3]),_s.setAttribute("position",new Ba(i,3,0,!1)),_s.setAttribute("uv",new Ba(i,2,3,!1))}this.geometry=_s,this.material=e,this.center=new we(.5,.5)}raycast(e,t){e.camera===null&&console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),vs.setFromMatrixScale(this.matrixWorld),Md.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),xs.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&vs.multiplyScalar(-xs.z);const i=this.material.rotation;let n,r;i!==0&&(r=Math.cos(i),n=Math.sin(i));const a=this.center;oa(ra.set(-.5,-.5,0),xs,a,vs,n,r),oa(nr.set(.5,-.5,0),xs,a,vs,n,r),oa(aa.set(.5,.5,0),xs,a,vs,n,r),Xh.set(0,0),zo.set(1,0),Yh.set(1,1);let o=e.ray.intersectTriangle(ra,nr,aa,!1,tr);if(o===null&&(oa(nr.set(-.5,.5,0),xs,a,vs,n,r),zo.set(0,1),o=e.ray.intersectTriangle(ra,aa,nr,!1,tr),o===null))return;const c=e.ray.origin.distanceTo(tr);c<e.near||c>e.far||t.push({distance:c,point:tr.clone(),uv:_i.getInterpolation(tr,ra,nr,aa,Xh,zo,Yh,new we),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}}function oa(s,e,t,i,n,r){ys.subVectors(s,t).addScalar(.5).multiply(i),n!==void 0?(ir.x=r*ys.x-n*ys.y,ir.y=n*ys.x+r*ys.y):ir.copy(ys),s.copy(e),s.x+=ir.x,s.y+=ir.y,s.applyMatrix4(Md)}class Td extends bt{constructor(e=null,t=1,i=1,n,r,a,o,c,u=At,d=At,l,h){super(null,a,o,c,u,d,n,r,l,h),this.isDataTexture=!0,this.image={data:e,width:t,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Ad extends Ys{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Pe(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const jh=new dt,Xl=new ad,la=new Ja,ca=new z;class Wy extends Gt{constructor(e=new Ai,t=new Ad){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const i=this.geometry,n=this.matrixWorld,r=e.params.Points.threshold,a=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),la.copy(i.boundingSphere),la.applyMatrix4(n),la.radius+=r,e.ray.intersectsSphere(la)===!1)return;jh.copy(n).invert(),Xl.copy(e.ray).applyMatrix4(jh);const o=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,u=i.index,l=i.attributes.position;if(u!==null){const h=Math.max(0,a.start),f=Math.min(u.count,a.start+a.count);for(let g=h,_=f;g<_;g++){const p=u.getX(g);ca.fromBufferAttribute(l,p),Kh(ca,p,c,n,e,t,this)}}else{const h=Math.max(0,a.start),f=Math.min(l.count,a.start+a.count);for(let g=h,_=f;g<_;g++)ca.fromBufferAttribute(l,g),Kh(ca,g,c,n,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const n=t[i[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=n.length;r<a;r++){const o=n[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}}function Kh(s,e,t,i,n,r,a){const o=Xl.distanceSqToPoint(s);if(o<t){const c=new z;Xl.closestPointToPoint(s,c),c.applyMatrix4(i);const u=n.ray.origin.distanceTo(c);if(u<n.near||u>n.far)return;r.push({distance:u,distanceToRay:Math.sqrt(o),point:c,index:e,face:null,faceIndex:null,barycoord:null,object:a})}}class Xn extends bt{constructor(e,t,i,n,r,a,o,c,u){super(e,t,i,n,r,a,o,c,u),this.isCanvasTexture=!0,this.needsUpdate=!0}}class qy extends gt{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}const Zh={enabled:!1,files:{},add:function(s,e){this.enabled!==!1&&(this.files[s]=e)},get:function(s){if(this.enabled!==!1)return this.files[s]},remove:function(s){delete this.files[s]},clear:function(){this.files={}}};class Xy{constructor(e,t,i){const n=this;let r=!1,a=0,o=0,c;const u=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=i,this.itemStart=function(d){o++,r===!1&&n.onStart!==void 0&&n.onStart(d,a,o),r=!0},this.itemEnd=function(d){a++,n.onProgress!==void 0&&n.onProgress(d,a,o),a===o&&(r=!1,n.onLoad!==void 0&&n.onLoad())},this.itemError=function(d){n.onError!==void 0&&n.onError(d)},this.resolveURL=function(d){return c?c(d):d},this.setURLModifier=function(d){return c=d,this},this.addHandler=function(d,l){return u.push(d,l),this},this.removeHandler=function(d){const l=u.indexOf(d);return l!==-1&&u.splice(l,2),this},this.getHandler=function(d){for(let l=0,h=u.length;l<h;l+=2){const f=u[l],g=u[l+1];if(f.global&&(f.lastIndex=0),f.test(d))return g}return null}}}const Yy=new Xy;class bc{constructor(e){this.manager=e!==void 0?e:Yy,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){const i=this;return new Promise(function(n,r){i.load(e,n,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}}bc.DEFAULT_MATERIAL_NAME="__DEFAULT";class jy extends bc{constructor(e){super(e)}load(e,t,i,n){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=this,a=Zh.get(e);if(a!==void 0)return r.manager.itemStart(e),setTimeout(function(){t&&t(a),r.manager.itemEnd(e)},0),a;const o=vr("img");function c(){d(),Zh.add(e,this),t&&t(this),r.manager.itemEnd(e)}function u(l){d(),n&&n(l),r.manager.itemError(e),r.manager.itemEnd(e)}function d(){o.removeEventListener("load",c,!1),o.removeEventListener("error",u,!1)}return o.addEventListener("load",c,!1),o.addEventListener("error",u,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),r.manager.itemStart(e),o.src=e,o}}class Ky extends bc{constructor(e){super(e)}load(e,t,i,n){const r=new bt,a=new jy(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(o){r.image=o,r.needsUpdate=!0,t!==void 0&&t(r)},i,n),r}}class Ed{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=Qh(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=Qh();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}function Qh(){return performance.now()}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:hc}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=hc);function Gi(s){if(s===void 0)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return s}function Cd(s,e){s.prototype=Object.create(e.prototype),s.prototype.constructor=s,s.__proto__=e}/*!
 * GSAP 3.15.0
 * https://gsap.com
 *
 * @license Copyright 2008-2026, GreenSock. All rights reserved.
 * Subject to the terms at https://gsap.com/standard-license
 * @author: Jack Doyle, jack@greensock.com
*/var ci={autoSleep:120,force3D:"auto",nullTargetWarn:1,units:{lineHeight:""}},xr={duration:.5,overwrite:!1,delay:0},wc,Rt,at,vi=1e8,tt=1/vi,Yl=Math.PI*2,Zy=Yl/4,Qy=0,Rd=Math.sqrt,Jy=Math.cos,$y=Math.sin,Et=function(e){return typeof e=="string"},ut=function(e){return typeof e=="function"},$i=function(e){return typeof e=="number"},Sc=function(e){return typeof e>"u"},Ii=function(e){return typeof e=="object"},Yt=function(e){return e!==!1},Mc=function(){return typeof window<"u"},ha=function(e){return ut(e)||Et(e)},Pd=typeof ArrayBuffer=="function"&&ArrayBuffer.isView||function(){},Ut=Array.isArray,eb=/random\([^)]+\)/g,tb=/,\s*/g,Jh=/(?:-?\.?\d|\.)+/gi,Ld=/[-+=.]*\d+[.e\-+]*\d*[e\-+]*\d*/g,As=/[-+=.]*\d+[.e-]*\d*[a-z%]*/g,Ho=/[-+=.]*\d+\.?\d*(?:e-|e\+)?\d*/gi,Dd=/[+-]=-?[.\d]+/,ib=/[^,'"\[\]\s]+/gi,nb=/^[+\-=e\s\d]*\d+[.\d]*([a-z]*|%)\s*$/i,lt,Ci,jl,Tc,hi={},za={},Id,kd=function(e){return(za=zs(e,hi))&&Qt},Ac=function(e,t){return console.warn("Invalid property",e,"set to",t,"Missing plugin? gsap.registerPlugin()")},yr=function(e,t){return!t&&console.warn(e)},Ud=function(e,t){return e&&(hi[e]=t)&&za&&(za[e]=t)||hi},br=function(){return 0},sb={suppressEvents:!0,isStart:!0,kill:!1},Pa={suppressEvents:!0,kill:!1},rb={suppressEvents:!0},Ec={},vn=[],Kl={},Od,ni={},Go={},$h=30,La=[],Cc="",Rc=function(e){var t=e[0],i,n;if(Ii(t)||ut(t)||(e=[e]),!(i=(t._gsap||{}).harness)){for(n=La.length;n--&&!La[n].targetTest(t););i=La[n]}for(n=e.length;n--;)e[n]&&(e[n]._gsap||(e[n]._gsap=new rf(e[n],i)))||e.splice(n,1);return e},Kn=function(e){return e._gsap||Rc(xi(e))[0]._gsap},Nd=function(e,t,i){return(i=e[t])&&ut(i)?e[t]():Sc(i)&&e.getAttribute&&e.getAttribute(t)||i},jt=function(e,t){return(e=e.split(",")).forEach(t)||e},mt=function(e){return Math.round(e*1e5)/1e5||0},ot=function(e){return Math.round(e*1e7)/1e7||0},Ls=function(e,t){var i=t.charAt(0),n=parseFloat(t.substr(2));return e=parseFloat(e),i==="+"?e+n:i==="-"?e-n:i==="*"?e*n:e/n},ab=function(e,t){for(var i=t.length,n=0;e.indexOf(t[n])<0&&++n<i;);return n<i},Ha=function(){var e=vn.length,t=vn.slice(0),i,n;for(Kl={},vn.length=0,i=0;i<e;i++)n=t[i],n&&n._lazy&&(n.render(n._lazy[0],n._lazy[1],!0)._lazy=0)},Pc=function(e){return!!(e._initted||e._startAt||e.add)},Fd=function(e,t,i,n){vn.length&&!Rt&&Ha(),e.render(t,i,!!(Rt&&t<0&&Pc(e))),vn.length&&!Rt&&Ha()},Bd=function(e){var t=parseFloat(e);return(t||t===0)&&(e+"").match(ib).length<2?t:Et(e)?e.trim():e},zd=function(e){return e},ui=function(e,t){for(var i in t)i in e||(e[i]=t[i]);return e},ob=function(e){return function(t,i){for(var n in i)n in t||n==="duration"&&e||n==="ease"||(t[n]=i[n])}},zs=function(e,t){for(var i in t)e[i]=t[i];return e},eu=function s(e,t){for(var i in t)i!=="__proto__"&&i!=="constructor"&&i!=="prototype"&&(e[i]=Ii(t[i])?s(e[i]||(e[i]={}),t[i]):t[i]);return e},Ga=function(e,t){var i={},n;for(n in e)n in t||(i[n]=e[n]);return i},fr=function(e){var t=e.parent||lt,i=e.keyframes?ob(Ut(e.keyframes)):ui;if(Yt(e.inherit))for(;t;)i(e,t.vars.defaults),t=t.parent||t._dp;return e},lb=function(e,t){for(var i=e.length,n=i===t.length;n&&i--&&e[i]===t[i];);return i<0},Hd=function(e,t,i,n,r){var a=e[n],o;if(r)for(o=t[r];a&&a[r]>o;)a=a._prev;return a?(t._next=a._next,a._next=t):(t._next=e[i],e[i]=t),t._next?t._next._prev=t:e[n]=t,t._prev=a,t.parent=t._dp=e,t},eo=function(e,t,i,n){i===void 0&&(i="_first"),n===void 0&&(n="_last");var r=t._prev,a=t._next;r?r._next=a:e[i]===t&&(e[i]=a),a?a._prev=r:e[n]===t&&(e[n]=r),t._next=t._prev=t.parent=null},wn=function(e,t){e.parent&&(!t||e.parent.autoRemoveChildren)&&e.parent.remove&&e.parent.remove(e),e._act=0},Zn=function(e,t){if(e&&(!t||t._end>e._dur||t._start<0))for(var i=e;i;)i._dirty=1,i=i.parent;return e},cb=function(e){for(var t=e.parent;t&&t.parent;)t._dirty=1,t.totalDuration(),t=t.parent;return e},Zl=function(e,t,i,n){return e._startAt&&(Rt?e._startAt.revert(Pa):e.vars.immediateRender&&!e.vars.autoRevert||e._startAt.render(t,!0,n))},hb=function s(e){return!e||e._ts&&s(e.parent)},tu=function(e){return e._repeat?Hs(e._tTime,e=e.duration()+e._rDelay)*e:0},Hs=function(e,t){var i=Math.floor(e=ot(e/t));return e&&i===e?i-1:i},Va=function(e,t){return(e-t._start)*t._ts+(t._ts>=0?0:t._dirty?t.totalDuration():t._tDur)},to=function(e){return e._end=ot(e._start+(e._tDur/Math.abs(e._ts||e._rts||tt)||0))},io=function(e,t){var i=e._dp;return i&&i.smoothChildTiming&&e._ts&&(e._start=ot(i._time-(e._ts>0?t/e._ts:((e._dirty?e.totalDuration():e._tDur)-t)/-e._ts)),to(e),i._dirty||Zn(i,e)),e},Gd=function(e,t){var i;if((t._time||!t._dur&&t._initted||t._start<e._time&&(t._dur||!t.add))&&(i=Va(e.rawTime(),t),(!t._dur||Ir(0,t.totalDuration(),i)-t._tTime>tt)&&t.render(i,!0)),Zn(e,t)._dp&&e._initted&&e._time>=e._dur&&e._ts){if(e._dur<e.duration())for(i=e;i._dp;)i.rawTime()>=0&&i.totalTime(i._tTime),i=i._dp;e._zTime=-tt}},Pi=function(e,t,i,n){return t.parent&&wn(t),t._start=ot(($i(i)?i:i||e!==lt?mi(e,i,t):e._time)+t._delay),t._end=ot(t._start+(t.totalDuration()/Math.abs(t.timeScale())||0)),Hd(e,t,"_first","_last",e._sort?"_start":0),Ql(t)||(e._recent=t),n||Gd(e,t),e._ts<0&&io(e,e._tTime),e},Vd=function(e,t){return(hi.ScrollTrigger||Ac("scrollTrigger",t))&&hi.ScrollTrigger.create(t,e)},Wd=function(e,t,i,n,r){if(Dc(e,t,r),!e._initted)return 1;if(!i&&e._pt&&!Rt&&(e._dur&&e.vars.lazy!==!1||!e._dur&&e.vars.lazy)&&Od!==si.frame)return vn.push(e),e._lazy=[r,n],1},ub=function s(e){var t=e.parent;return t&&t._ts&&t._initted&&!t._lock&&(t.rawTime()<0||s(t))},Ql=function(e){var t=e.data;return t==="isFromStart"||t==="isStart"},db=function(e,t,i,n){var r=e.ratio,a=t<0||!t&&(!e._start&&ub(e)&&!(!e._initted&&Ql(e))||(e._ts<0||e._dp._ts<0)&&!Ql(e))?0:1,o=e._rDelay,c=0,u,d,l;if(o&&e._repeat&&(c=Ir(0,e._tDur,t),d=Hs(c,o),e._yoyo&&d&1&&(a=1-a),d!==Hs(e._tTime,o)&&(r=1-a,e.vars.repeatRefresh&&e._initted&&e.invalidate())),a!==r||Rt||n||e._zTime===tt||!t&&e._zTime){if(!e._initted&&Wd(e,t,n,i,c))return;for(l=e._zTime,e._zTime=t||(i?tt:0),i||(i=t&&!l),e.ratio=a,e._from&&(a=1-a),e._time=0,e._tTime=c,u=e._pt;u;)u.r(a,u.d),u=u._next;t<0&&Zl(e,t,i,!0),e._onUpdate&&!i&&ri(e,"onUpdate"),c&&e._repeat&&!i&&e.parent&&ri(e,"onRepeat"),(t>=e._tDur||t<0)&&e.ratio===a&&(a&&wn(e,1),!i&&!Rt&&(ri(e,a?"onComplete":"onReverseComplete",!0),e._prom&&e._prom()))}else e._zTime||(e._zTime=t)},fb=function(e,t,i){var n;if(i>t)for(n=e._first;n&&n._start<=i;){if(n.data==="isPause"&&n._start>t)return n;n=n._next}else for(n=e._last;n&&n._start>=i;){if(n.data==="isPause"&&n._start<t)return n;n=n._prev}},Gs=function(e,t,i,n){var r=e._repeat,a=ot(t)||0,o=e._tTime/e._tDur;return o&&!n&&(e._time*=a/e._dur),e._dur=a,e._tDur=r?r<0?1e10:ot(a*(r+1)+e._rDelay*r):a,o>0&&!n&&io(e,e._tTime=e._tDur*o),e.parent&&to(e),i||Zn(e.parent,e),e},iu=function(e){return e instanceof qt?Zn(e):Gs(e,e._dur)},pb={_start:0,endTime:br,totalDuration:br},mi=function s(e,t,i){var n=e.labels,r=e._recent||pb,a=e.duration()>=vi?r.endTime(!1):e._dur,o,c,u;return Et(t)&&(isNaN(t)||t in n)?(c=t.charAt(0),u=t.substr(-1)==="%",o=t.indexOf("="),c==="<"||c===">"?(o>=0&&(t=t.replace(/=/,"")),(c==="<"?r._start:r.endTime(r._repeat>=0))+(parseFloat(t.substr(1))||0)*(u?(o<0?r:i).totalDuration()/100:1)):o<0?(t in n||(n[t]=a),n[t]):(c=parseFloat(t.charAt(o-1)+t.substr(o+1)),u&&i&&(c=c/100*(Ut(i)?i[0]:i).totalDuration()),o>1?s(e,t.substr(0,o-1),i)+c:a+c)):t==null?a:+t},pr=function(e,t,i){var n=$i(t[1]),r=(n?2:1)+(e<2?0:1),a=t[r],o,c;if(n&&(a.duration=t[1]),a.parent=i,e){for(o=a,c=i;c&&!("immediateRender"in o);)o=c.vars.defaults||{},c=Yt(c.vars.inherit)&&c.parent;a.immediateRender=Yt(o.immediateRender),e<2?a.runBackwards=1:a.startAt=t[r-1]}return new xt(t[0],a,t[r+1])},En=function(e,t){return e||e===0?t(e):t},Ir=function(e,t,i){return i<e?e:i>t?t:i},It=function(e,t){return!Et(e)||!(t=nb.exec(e))?"":t[1]},mb=function(e,t,i){return En(i,function(n){return Ir(e,t,n)})},Jl=[].slice,qd=function(e,t){return e&&Ii(e)&&"length"in e&&(!t&&!e.length||e.length-1 in e&&Ii(e[0]))&&!e.nodeType&&e!==Ci},gb=function(e,t,i){return i===void 0&&(i=[]),e.forEach(function(n){var r;return Et(n)&&!t||qd(n,1)?(r=i).push.apply(r,xi(n)):i.push(n)})||i},xi=function(e,t,i){return at&&!t&&at.selector?at.selector(e):Et(e)&&!i&&(jl||!Vs())?Jl.call((t||Tc).querySelectorAll(e),0):Ut(e)?gb(e,i):qd(e)?Jl.call(e,0):e?[e]:[]},$l=function(e){return e=xi(e)[0]||yr("Invalid scope")||{},function(t){var i=e.current||e.nativeElement||e;return xi(t,i.querySelectorAll?i:i===e?yr("Invalid scope")||Tc.createElement("div"):e)}},Xd=function(e){return e.sort(function(){return .5-Math.random()})},Yd=function(e){if(ut(e))return e;var t=Ii(e)?e:{each:e},i=Qn(t.ease),n=t.from||0,r=parseFloat(t.base)||0,a={},o=n>0&&n<1,c=isNaN(n)||o,u=t.axis,d=n,l=n;return Et(n)?d=l={center:.5,edges:.5,end:1}[n]||0:!o&&c&&(d=n[0],l=n[1]),function(h,f,g){var _=(g||t).length,p=a[_],m,x,y,b,C,E,A,L,D;if(!p){if(D=t.grid==="auto"?0:(t.grid||[1,vi])[1],!D){for(A=-vi;A<(A=g[D++].getBoundingClientRect().left)&&D<_;);D<_&&D--}for(p=a[_]=[],m=c?Math.min(D,_)*d-.5:n%D,x=D===vi?0:c?_*l/D-.5:n/D|0,A=0,L=vi,E=0;E<_;E++)y=E%D-m,b=x-(E/D|0),p[E]=C=u?Math.abs(u==="y"?b:y):Rd(y*y+b*b),C>A&&(A=C),C<L&&(L=C);n==="random"&&Xd(p),p.max=A-L,p.min=L,p.v=_=(parseFloat(t.amount)||parseFloat(t.each)*(D>_?_-1:u?u==="y"?_/D:D:Math.max(D,_/D))||0)*(n==="edges"?-1:1),p.b=_<0?r-_:r,p.u=It(t.amount||t.each)||0,i=i&&_<0?Rb(i):i}return _=(p[h]-p.min)/p.max||0,ot(p.b+(i?i(_):_)*p.v)+p.u}},ec=function(e){var t=Math.pow(10,((e+"").split(".")[1]||"").length);return function(i){var n=ot(Math.round(parseFloat(i)/e)*e*t);return(n-n%1)/t+($i(i)?0:It(i))}},jd=function(e,t){var i=Ut(e),n,r;return!i&&Ii(e)&&(n=i=e.radius||vi,e.values?(e=xi(e.values),(r=!$i(e[0]))&&(n*=n)):e=ec(e.increment)),En(t,i?ut(e)?function(a){return r=e(a),Math.abs(r-a)<=n?r:a}:function(a){for(var o=parseFloat(r?a.x:a),c=parseFloat(r?a.y:0),u=vi,d=0,l=e.length,h,f;l--;)r?(h=e[l].x-o,f=e[l].y-c,h=h*h+f*f):h=Math.abs(e[l]-o),h<u&&(u=h,d=l);return d=!n||u<=n?e[d]:a,r||d===a||$i(a)?d:d+It(a)}:ec(e))},Kd=function(e,t,i,n){return En(Ut(e)?!t:i===!0?!!(i=0):!n,function(){return Ut(e)?e[~~(Math.random()*e.length)]:(i=i||1e-5)&&(n=i<1?Math.pow(10,(i+"").length-2):1)&&Math.floor(Math.round((e-i/2+Math.random()*(t-e+i*.99))/i)*i*n)/n})},_b=function(){for(var e=arguments.length,t=new Array(e),i=0;i<e;i++)t[i]=arguments[i];return function(n){return t.reduce(function(r,a){return a(r)},n)}},vb=function(e,t){return function(i){return e(parseFloat(i))+(t||It(i))}},xb=function(e,t,i){return Qd(e,t,0,1,i)},Zd=function(e,t,i){return En(i,function(n){return e[~~t(n)]})},yb=function s(e,t,i){var n=t-e;return Ut(e)?Zd(e,s(0,e.length),t):En(i,function(r){return(n+(r-e)%n)%n+e})},bb=function s(e,t,i){var n=t-e,r=n*2;return Ut(e)?Zd(e,s(0,e.length-1),t):En(i,function(a){return a=(r+(a-e)%r)%r||0,e+(a>n?r-a:a)})},wr=function(e){return e.replace(eb,function(t){var i=t.indexOf("[")+1,n=t.substring(i||7,i?t.indexOf("]"):t.length-1).split(tb);return Kd(i?n:+n[0],i?0:+n[1],+n[2]||1e-5)})},Qd=function(e,t,i,n,r){var a=t-e,o=n-i;return En(r,function(c){return i+((c-e)/a*o||0)})},wb=function s(e,t,i,n){var r=isNaN(e+t)?0:function(f){return(1-f)*e+f*t};if(!r){var a=Et(e),o={},c,u,d,l,h;if(i===!0&&(n=1)&&(i=null),a)e={p:e},t={p:t};else if(Ut(e)&&!Ut(t)){for(d=[],l=e.length,h=l-2,u=1;u<l;u++)d.push(s(e[u-1],e[u]));l--,r=function(g){g*=l;var _=Math.min(h,~~g);return d[_](g-_)},i=t}else n||(e=zs(Ut(e)?[]:{},e));if(!d){for(c in t)Lc.call(o,e,c,"get",t[c]);r=function(g){return Uc(g,o)||(a?e.p:e)}}}return En(i,r)},nu=function(e,t,i){var n=e.labels,r=vi,a,o,c;for(a in n)o=n[a]-t,o<0==!!i&&o&&r>(o=Math.abs(o))&&(c=a,r=o);return c},ri=function(e,t,i){var n=e.vars,r=n[t],a=at,o=e._ctx,c,u,d;if(r)return c=n[t+"Params"],u=n.callbackScope||e,i&&vn.length&&Ha(),o&&(at=o),d=c?r.apply(u,c):r.call(u),at=a,d},lr=function(e){return wn(e),e.scrollTrigger&&e.scrollTrigger.kill(!!Rt),e.progress()<1&&ri(e,"onInterrupt"),e},Es,Jd=[],$d=function(e){if(e)if(e=!e.name&&e.default||e,Mc()||e.headless){var t=e.name,i=ut(e),n=t&&!i&&e.init?function(){this._props=[]}:e,r={init:br,render:Uc,add:Lc,kill:Bb,modifier:Fb,rawVars:0},a={targetTest:0,get:0,getSetter:kc,aliases:{},register:0};if(Vs(),e!==n){if(ni[t])return;ui(n,ui(Ga(e,r),a)),zs(n.prototype,zs(r,Ga(e,a))),ni[n.prop=t]=n,e.targetTest&&(La.push(n),Ec[t]=1),t=(t==="css"?"CSS":t.charAt(0).toUpperCase()+t.substr(1))+"Plugin"}Ud(t,n),e.register&&e.register(Qt,n,Kt)}else Jd.push(e)},et=255,cr={aqua:[0,et,et],lime:[0,et,0],silver:[192,192,192],black:[0,0,0],maroon:[128,0,0],teal:[0,128,128],blue:[0,0,et],navy:[0,0,128],white:[et,et,et],olive:[128,128,0],yellow:[et,et,0],orange:[et,165,0],gray:[128,128,128],purple:[128,0,128],green:[0,128,0],red:[et,0,0],pink:[et,192,203],cyan:[0,et,et],transparent:[et,et,et,0]},Vo=function(e,t,i){return e+=e<0?1:e>1?-1:0,(e*6<1?t+(i-t)*e*6:e<.5?i:e*3<2?t+(i-t)*(2/3-e)*6:t)*et+.5|0},ef=function(e,t,i){var n=e?$i(e)?[e>>16,e>>8&et,e&et]:0:cr.black,r,a,o,c,u,d,l,h,f,g;if(!n){if(e.substr(-1)===","&&(e=e.substr(0,e.length-1)),cr[e])n=cr[e];else if(e.charAt(0)==="#"){if(e.length<6&&(r=e.charAt(1),a=e.charAt(2),o=e.charAt(3),e="#"+r+r+a+a+o+o+(e.length===5?e.charAt(4)+e.charAt(4):"")),e.length===9)return n=parseInt(e.substr(1,6),16),[n>>16,n>>8&et,n&et,parseInt(e.substr(7),16)/255];e=parseInt(e.substr(1),16),n=[e>>16,e>>8&et,e&et]}else if(e.substr(0,3)==="hsl"){if(n=g=e.match(Jh),!t)c=+n[0]%360/360,u=+n[1]/100,d=+n[2]/100,a=d<=.5?d*(u+1):d+u-d*u,r=d*2-a,n.length>3&&(n[3]*=1),n[0]=Vo(c+1/3,r,a),n[1]=Vo(c,r,a),n[2]=Vo(c-1/3,r,a);else if(~e.indexOf("="))return n=e.match(Ld),i&&n.length<4&&(n[3]=1),n}else n=e.match(Jh)||cr.transparent;n=n.map(Number)}return t&&!g&&(r=n[0]/et,a=n[1]/et,o=n[2]/et,l=Math.max(r,a,o),h=Math.min(r,a,o),d=(l+h)/2,l===h?c=u=0:(f=l-h,u=d>.5?f/(2-l-h):f/(l+h),c=l===r?(a-o)/f+(a<o?6:0):l===a?(o-r)/f+2:(r-a)/f+4,c*=60),n[0]=~~(c+.5),n[1]=~~(u*100+.5),n[2]=~~(d*100+.5)),i&&n.length<4&&(n[3]=1),n},tf=function(e){var t=[],i=[],n=-1;return e.split(xn).forEach(function(r){var a=r.match(As)||[];t.push.apply(t,a),i.push(n+=a.length+1)}),t.c=i,t},su=function(e,t,i){var n="",r=(e+n).match(xn),a=t?"hsla(":"rgba(",o=0,c,u,d,l;if(!r)return e;if(r=r.map(function(h){return(h=ef(h,t,1))&&a+(t?h[0]+","+h[1]+"%,"+h[2]+"%,"+h[3]:h.join(","))+")"}),i&&(d=tf(e),c=i.c,c.join(n)!==d.c.join(n)))for(u=e.replace(xn,"1").split(As),l=u.length-1;o<l;o++)n+=u[o]+(~c.indexOf(o)?r.shift()||a+"0,0,0,0)":(d.length?d:r.length?r:i).shift());if(!u)for(u=e.split(xn),l=u.length-1;o<l;o++)n+=u[o]+r[o];return n+u[l]},xn=function(){var s="(?:\\b(?:(?:rgb|rgba|hsl|hsla)\\(.+?\\))|\\B#(?:[0-9a-f]{3,4}){1,2}\\b",e;for(e in cr)s+="|"+e+"\\b";return new RegExp(s+")","gi")}(),Sb=/hsl[a]?\(/,nf=function(e){var t=e.join(" "),i;if(xn.lastIndex=0,xn.test(t))return i=Sb.test(t),e[1]=su(e[1],i),e[0]=su(e[0],i,tf(e[1])),!0},Sr,si=function(){var s=Date.now,e=500,t=33,i=s(),n=i,r=1e3/240,a=r,o=[],c,u,d,l,h,f,g=function _(p){var m=s()-n,x=p===!0,y,b,C,E;if((m>e||m<0)&&(i+=m-t),n+=m,C=n-i,y=C-a,(y>0||x)&&(E=++l.frame,h=C-l.time*1e3,l.time=C=C/1e3,a+=y+(y>=r?4:r-y),b=1),x||(c=u(_)),b)for(f=0;f<o.length;f++)o[f](C,h,E,p)};return l={time:0,frame:0,tick:function(){g(!0)},deltaRatio:function(p){return h/(1e3/(p||60))},wake:function(){Id&&(!jl&&Mc()&&(Ci=jl=window,Tc=Ci.document||{},hi.gsap=Qt,(Ci.gsapVersions||(Ci.gsapVersions=[])).push(Qt.version),kd(za||Ci.GreenSockGlobals||!Ci.gsap&&Ci||{}),Jd.forEach($d)),d=typeof requestAnimationFrame<"u"&&requestAnimationFrame,c&&l.sleep(),u=d||function(p){return setTimeout(p,a-l.time*1e3+1|0)},Sr=1,g(2))},sleep:function(){(d?cancelAnimationFrame:clearTimeout)(c),Sr=0,u=br},lagSmoothing:function(p,m){e=p||1/0,t=Math.min(m||33,e)},fps:function(p){r=1e3/(p||240),a=l.time*1e3+r},add:function(p,m,x){var y=m?function(b,C,E,A){p(b,C,E,A),l.remove(y)}:p;return l.remove(p),o[x?"unshift":"push"](y),Vs(),y},remove:function(p,m){~(m=o.indexOf(p))&&o.splice(m,1)&&f>=m&&f--},_listeners:o},l}(),Vs=function(){return!Sr&&si.wake()},Ne={},Mb=/^[\d.\-M][\d.\-,\s]/,Tb=/["']/g,Ab=function(e){for(var t={},i=e.substr(1,e.length-3).split(":"),n=i[0],r=1,a=i.length,o,c,u;r<a;r++)c=i[r],o=r!==a-1?c.lastIndexOf(","):c.length,u=c.substr(0,o),t[n]=isNaN(u)?u.replace(Tb,"").trim():+u,n=c.substr(o+1).trim();return t},Eb=function(e){var t=e.indexOf("(")+1,i=e.indexOf(")"),n=e.indexOf("(",t);return e.substring(t,~n&&n<i?e.indexOf(")",i+1):i)},Cb=function(e){var t=(e+"").split("("),i=Ne[t[0]];return i&&t.length>1&&i.config?i.config.apply(null,~e.indexOf("{")?[Ab(t[1])]:Eb(e).split(",").map(Bd)):Ne._CE&&Mb.test(e)?Ne._CE("",e):i},Rb=function(e){return function(t){return 1-e(1-t)}},Qn=function(e,t){return e&&(ut(e)?e:Ne[e]||Cb(e))||t},ts=function(e,t,i,n){i===void 0&&(i=function(c){return 1-t(1-c)}),n===void 0&&(n=function(c){return c<.5?t(c*2)/2:1-t((1-c)*2)/2});var r={easeIn:t,easeOut:i,easeInOut:n},a;return jt(e,function(o){Ne[o]=hi[o]=r,Ne[a=o.toLowerCase()]=i;for(var c in r)Ne[a+(c==="easeIn"?".in":c==="easeOut"?".out":".inOut")]=Ne[o+"."+c]=r[c]}),r},sf=function(e){return function(t){return t<.5?(1-e(1-t*2))/2:.5+e((t-.5)*2)/2}},Wo=function s(e,t,i){var n=t>=1?t:1,r=(i||(e?.3:.45))/(t<1?t:1),a=r/Yl*(Math.asin(1/n)||0),o=function(d){return d===1?1:n*Math.pow(2,-10*d)*$y((d-a)*r)+1},c=e==="out"?o:e==="in"?function(u){return 1-o(1-u)}:sf(o);return r=Yl/r,c.config=function(u,d){return s(e,u,d)},c},qo=function s(e,t){t===void 0&&(t=1.70158);var i=function(a){return a?--a*a*((t+1)*a+t)+1:0},n=e==="out"?i:e==="in"?function(r){return 1-i(1-r)}:sf(i);return n.config=function(r){return s(e,r)},n};jt("Linear,Quad,Cubic,Quart,Quint,Strong",function(s,e){var t=e<5?e+1:e;ts(s+",Power"+(t-1),e?function(i){return Math.pow(i,t)}:function(i){return i},function(i){return 1-Math.pow(1-i,t)},function(i){return i<.5?Math.pow(i*2,t)/2:1-Math.pow((1-i)*2,t)/2})});Ne.Linear.easeNone=Ne.none=Ne.Linear.easeIn;ts("Elastic",Wo("in"),Wo("out"),Wo());(function(s,e){var t=1/e,i=2*t,n=2.5*t,r=function(o){return o<t?s*o*o:o<i?s*Math.pow(o-1.5/e,2)+.75:o<n?s*(o-=2.25/e)*o+.9375:s*Math.pow(o-2.625/e,2)+.984375};ts("Bounce",function(a){return 1-r(1-a)},r)})(7.5625,2.75);ts("Expo",function(s){return Math.pow(2,10*(s-1))*s+s*s*s*s*s*s*(1-s)});ts("Circ",function(s){return-(Rd(1-s*s)-1)});ts("Sine",function(s){return s===1?1:-Jy(s*Zy)+1});ts("Back",qo("in"),qo("out"),qo());Ne.SteppedEase=Ne.steps=hi.SteppedEase={config:function(e,t){e===void 0&&(e=1);var i=1/e,n=e+(t?0:1),r=t?1:0,a=1-tt;return function(o){return((n*Ir(0,a,o)|0)+r)*i}}};xr.ease=Ne["quad.out"];jt("onComplete,onUpdate,onStart,onRepeat,onReverseComplete,onInterrupt",function(s){return Cc+=s+","+s+"Params,"});var rf=function(e,t){this.id=Qy++,e._gsap=this,this.target=e,this.harness=t,this.get=t?t.get:Nd,this.set=t?t.getSetter:kc},Mr=function(){function s(t){this.vars=t,this._delay=+t.delay||0,(this._repeat=t.repeat===1/0?-2:t.repeat||0)&&(this._rDelay=t.repeatDelay||0,this._yoyo=!!t.yoyo||!!t.yoyoEase),this._ts=1,Gs(this,+t.duration,1,1),this.data=t.data,at&&(this._ctx=at,at.data.push(this)),Sr||si.wake()}var e=s.prototype;return e.delay=function(i){return i||i===0?(this.parent&&this.parent.smoothChildTiming&&this.startTime(this._start+i-this._delay),this._delay=i,this):this._delay},e.duration=function(i){return arguments.length?this.totalDuration(this._repeat>0?i+(i+this._rDelay)*this._repeat:i):this.totalDuration()&&this._dur},e.totalDuration=function(i){return arguments.length?(this._dirty=0,Gs(this,this._repeat<0?i:(i-this._repeat*this._rDelay)/(this._repeat+1))):this._tDur},e.totalTime=function(i,n){if(Vs(),!arguments.length)return this._tTime;var r=this._dp;if(r&&r.smoothChildTiming&&this._ts){for(io(this,i),!r._dp||r.parent||Gd(r,this);r&&r.parent;)r.parent._time!==r._start+(r._ts>=0?r._tTime/r._ts:(r.totalDuration()-r._tTime)/-r._ts)&&r.totalTime(r._tTime,!0),r=r.parent;!this.parent&&this._dp.autoRemoveChildren&&(this._ts>0&&i<this._tDur||this._ts<0&&i>0||!this._tDur&&!i)&&Pi(this._dp,this,this._start-this._delay)}return(this._tTime!==i||!this._dur&&!n||this._initted&&Math.abs(this._zTime)===tt||!this._initted&&this._dur&&i||!i&&!this._initted&&(this.add||this._ptLookup))&&(this._ts||(this._pTime=i),Fd(this,i,n)),this},e.time=function(i,n){return arguments.length?this.totalTime(Math.min(this.totalDuration(),i+tu(this))%(this._dur+this._rDelay)||(i?this._dur:0),n):this._time},e.totalProgress=function(i,n){return arguments.length?this.totalTime(this.totalDuration()*i,n):this.totalDuration()?Math.min(1,this._tTime/this._tDur):this.rawTime()>=0&&this._initted?1:0},e.progress=function(i,n){return arguments.length?this.totalTime(this.duration()*(this._yoyo&&!(this.iteration()&1)?1-i:i)+tu(this),n):this.duration()?Math.min(1,this._time/this._dur):this.rawTime()>0?1:0},e.iteration=function(i,n){var r=this.duration()+this._rDelay;return arguments.length?this.totalTime(this._time+(i-1)*r,n):this._repeat?Hs(this._tTime,r)+1:1},e.timeScale=function(i,n){if(!arguments.length)return this._rts===-tt?0:this._rts;if(this._rts===i)return this;var r=this.parent&&this._ts?Va(this.parent._time,this):this._tTime;return this._rts=+i||0,this._ts=this._ps||i===-tt?0:this._rts,this.totalTime(Ir(-Math.abs(this._delay),this.totalDuration(),r),n!==!1),to(this),cb(this)},e.paused=function(i){return arguments.length?(this._ps!==i&&(this._ps=i,i?(this._pTime=this._tTime||Math.max(-this._delay,this.rawTime()),this._ts=this._act=0):(Vs(),this._ts=this._rts,this.totalTime(this.parent&&!this.parent.smoothChildTiming?this.rawTime():this._tTime||this._pTime,this.progress()===1&&Math.abs(this._zTime)!==tt&&(this._tTime-=tt)))),this):this._ps},e.startTime=function(i){if(arguments.length){this._start=ot(i);var n=this.parent||this._dp;return n&&(n._sort||!this.parent)&&Pi(n,this,this._start-this._delay),this}return this._start},e.endTime=function(i){return this._start+(Yt(i)?this.totalDuration():this.duration())/Math.abs(this._ts||1)},e.rawTime=function(i){var n=this.parent||this._dp;return n?i&&(!this._ts||this._repeat&&this._time&&this.totalProgress()<1)?this._tTime%(this._dur+this._rDelay):this._ts?Va(n.rawTime(i),this):this._tTime:this._tTime},e.revert=function(i){i===void 0&&(i=rb);var n=Rt;return Rt=i,Pc(this)&&(this.timeline&&this.timeline.revert(i),this.totalTime(-.01,i.suppressEvents)),this.data!=="nested"&&i.kill!==!1&&this.kill(),Rt=n,this},e.globalTime=function(i){for(var n=this,r=arguments.length?i:n.rawTime();n;)r=n._start+r/(Math.abs(n._ts)||1),n=n._dp;return!this.parent&&this._sat?this._sat.globalTime(i):r},e.repeat=function(i){return arguments.length?(this._repeat=i===1/0?-2:i,iu(this)):this._repeat===-2?1/0:this._repeat},e.repeatDelay=function(i){if(arguments.length){var n=this._time;return this._rDelay=i,iu(this),n?this.time(n):this}return this._rDelay},e.yoyo=function(i){return arguments.length?(this._yoyo=i,this):this._yoyo},e.seek=function(i,n){return this.totalTime(mi(this,i),Yt(n))},e.restart=function(i,n){return this.play().totalTime(i?-this._delay:0,Yt(n)),this._dur||(this._zTime=-tt),this},e.play=function(i,n){return i!=null&&this.seek(i,n),this.reversed(!1).paused(!1)},e.reverse=function(i,n){return i!=null&&this.seek(i||this.totalDuration(),n),this.reversed(!0).paused(!1)},e.pause=function(i,n){return i!=null&&this.seek(i,n),this.paused(!0)},e.resume=function(){return this.paused(!1)},e.reversed=function(i){return arguments.length?(!!i!==this.reversed()&&this.timeScale(-this._rts||(i?-tt:0)),this):this._rts<0},e.invalidate=function(){return this._initted=this._act=0,this._zTime=-tt,this},e.isActive=function(){var i=this.parent||this._dp,n=this._start,r;return!!(!i||this._ts&&this._initted&&i.isActive()&&(r=i.rawTime(!0))>=n&&r<this.endTime(!0)-tt)},e.eventCallback=function(i,n,r){var a=this.vars;return arguments.length>1?(n?(a[i]=n,r&&(a[i+"Params"]=r),i==="onUpdate"&&(this._onUpdate=n)):delete a[i],this):a[i]},e.then=function(i){var n=this,r=n._prom;return new Promise(function(a){var o=ut(i)?i:zd,c=function(){var d=n.then;n.then=null,r&&r(),ut(o)&&(o=o(n))&&(o.then||o===n)&&(n.then=d),a(o),n.then=d};n._initted&&n.totalProgress()===1&&n._ts>=0||!n._tTime&&n._ts<0?c():n._prom=c})},e.kill=function(){lr(this)},s}();ui(Mr.prototype,{_time:0,_start:0,_end:0,_tTime:0,_tDur:0,_dirty:0,_repeat:0,_yoyo:!1,parent:null,_initted:!1,_rDelay:0,_ts:1,_dp:0,ratio:0,_zTime:-tt,_prom:0,_ps:!1,_rts:1});var qt=function(s){Cd(e,s);function e(i,n){var r;return i===void 0&&(i={}),r=s.call(this,i)||this,r.labels={},r.smoothChildTiming=!!i.smoothChildTiming,r.autoRemoveChildren=!!i.autoRemoveChildren,r._sort=Yt(i.sortChildren),lt&&Pi(i.parent||lt,Gi(r),n),i.reversed&&r.reverse(),i.paused&&r.paused(!0),i.scrollTrigger&&Vd(Gi(r),i.scrollTrigger),r}var t=e.prototype;return t.to=function(n,r,a){return pr(0,arguments,this),this},t.from=function(n,r,a){return pr(1,arguments,this),this},t.fromTo=function(n,r,a,o){return pr(2,arguments,this),this},t.set=function(n,r,a){return r.duration=0,r.parent=this,fr(r).repeatDelay||(r.repeat=0),r.immediateRender=!!r.immediateRender,new xt(n,r,mi(this,a),1),this},t.call=function(n,r,a){return Pi(this,xt.delayedCall(0,n,r),a)},t.staggerTo=function(n,r,a,o,c,u,d){return a.duration=r,a.stagger=a.stagger||o,a.onComplete=u,a.onCompleteParams=d,a.parent=this,new xt(n,a,mi(this,c)),this},t.staggerFrom=function(n,r,a,o,c,u,d){return a.runBackwards=1,fr(a).immediateRender=Yt(a.immediateRender),this.staggerTo(n,r,a,o,c,u,d)},t.staggerFromTo=function(n,r,a,o,c,u,d,l){return o.startAt=a,fr(o).immediateRender=Yt(o.immediateRender),this.staggerTo(n,r,o,c,u,d,l)},t.render=function(n,r,a){var o=this._time,c=this._dirty?this.totalDuration():this._tDur,u=this._dur,d=n<=0?0:ot(n),l=this._zTime<0!=n<0&&(this._initted||!u),h,f,g,_,p,m,x,y,b,C,E,A;if(this!==lt&&d>c&&n>=0&&(d=c),d!==this._tTime||a||l){if(o!==this._time&&u&&(d+=this._time-o,n+=this._time-o),h=d,b=this._start,y=this._ts,m=!y,l&&(u||(o=this._zTime),(n||!r)&&(this._zTime=n)),this._repeat){if(E=this._yoyo,p=u+this._rDelay,this._repeat<-1&&n<0)return this.totalTime(p*100+n,r,a);if(h=ot(d%p),d===c?(_=this._repeat,h=u):(C=ot(d/p),_=~~C,_&&_===C&&(h=u,_--),h>u&&(h=u)),C=Hs(this._tTime,p),!o&&this._tTime&&C!==_&&this._tTime-C*p-this._dur<=0&&(C=_),E&&_&1&&(h=u-h,A=1),_!==C&&!this._lock){var L=E&&C&1,D=L===(E&&_&1);if(_<C&&(L=!L),o=L?0:d%u?u:d,this._lock=1,this.render(o||(A?0:ot(_*p)),r,!u)._lock=0,this._tTime=d,!r&&this.parent&&ri(this,"onRepeat"),this.vars.repeatRefresh&&!A&&(this.invalidate()._lock=1,C=_),o&&o!==this._time||m!==!this._ts||this.vars.onRepeat&&!this.parent&&!this._act)return this;if(u=this._dur,c=this._tDur,D&&(this._lock=2,o=L?u:-1e-4,this.render(o,!0),this.vars.repeatRefresh&&!A&&this.invalidate()),this._lock=0,!this._ts&&!m)return this}}if(this._hasPause&&!this._forcing&&this._lock<2&&(x=fb(this,ot(o),ot(h)),x&&(d-=h-(h=x._start))),this._tTime=d,this._time=h,this._act=!!y,this._initted||(this._onUpdate=this.vars.onUpdate,this._initted=1,this._zTime=n,o=0),!o&&d&&u&&!r&&!C&&(ri(this,"onStart"),this._tTime!==d))return this;if(h>=o&&n>=0)for(f=this._first;f;){if(g=f._next,(f._act||h>=f._start)&&f._ts&&x!==f){if(f.parent!==this)return this.render(n,r,a);if(f.render(f._ts>0?(h-f._start)*f._ts:(f._dirty?f.totalDuration():f._tDur)+(h-f._start)*f._ts,r,a),h!==this._time||!this._ts&&!m){x=0,g&&(d+=this._zTime=-tt);break}}f=g}else{f=this._last;for(var v=n<0?n:h;f;){if(g=f._prev,(f._act||v<=f._end)&&f._ts&&x!==f){if(f.parent!==this)return this.render(n,r,a);if(f.render(f._ts>0?(v-f._start)*f._ts:(f._dirty?f.totalDuration():f._tDur)+(v-f._start)*f._ts,r,a||Rt&&Pc(f)),h!==this._time||!this._ts&&!m){x=0,g&&(d+=this._zTime=v?-tt:tt);break}}f=g}}if(x&&!r&&(this.pause(),x.render(h>=o?0:-tt)._zTime=h>=o?1:-1,this._ts))return this._start=b,to(this),this.render(n,r,a);this._onUpdate&&!r&&ri(this,"onUpdate",!0),(d===c&&this._tTime>=this.totalDuration()||!d&&o)&&(b===this._start||Math.abs(y)!==Math.abs(this._ts))&&(this._lock||((n||!u)&&(d===c&&this._ts>0||!d&&this._ts<0)&&wn(this,1),!r&&!(n<0&&!o)&&(d||o||!c)&&(ri(this,d===c&&n>=0?"onComplete":"onReverseComplete",!0),this._prom&&!(d<c&&this.timeScale()>0)&&this._prom())))}return this},t.add=function(n,r){var a=this;if($i(r)||(r=mi(this,r,n)),!(n instanceof Mr)){if(Ut(n))return n.forEach(function(o){return a.add(o,r)}),this;if(Et(n))return this.addLabel(n,r);if(ut(n))n=xt.delayedCall(0,n);else return this}return this!==n?Pi(this,n,r):this},t.getChildren=function(n,r,a,o){n===void 0&&(n=!0),r===void 0&&(r=!0),a===void 0&&(a=!0),o===void 0&&(o=-vi);for(var c=[],u=this._first;u;)u._start>=o&&(u instanceof xt?r&&c.push(u):(a&&c.push(u),n&&c.push.apply(c,u.getChildren(!0,r,a)))),u=u._next;return c},t.getById=function(n){for(var r=this.getChildren(1,1,1),a=r.length;a--;)if(r[a].vars.id===n)return r[a]},t.remove=function(n){return Et(n)?this.removeLabel(n):ut(n)?this.killTweensOf(n):(n.parent===this&&eo(this,n),n===this._recent&&(this._recent=this._last),Zn(this))},t.totalTime=function(n,r){return arguments.length?(this._forcing=1,!this._dp&&this._ts&&(this._start=ot(si.time-(this._ts>0?n/this._ts:(this.totalDuration()-n)/-this._ts))),s.prototype.totalTime.call(this,n,r),this._forcing=0,this):this._tTime},t.addLabel=function(n,r){return this.labels[n]=mi(this,r),this},t.removeLabel=function(n){return delete this.labels[n],this},t.addPause=function(n,r,a){var o=xt.delayedCall(0,r||br,a);return o.data="isPause",this._hasPause=1,Pi(this,o,mi(this,n))},t.removePause=function(n){var r=this._first;for(n=mi(this,n);r;)r._start===n&&r.data==="isPause"&&wn(r),r=r._next},t.killTweensOf=function(n,r,a){for(var o=this.getTweensOf(n,a),c=o.length;c--;)pn!==o[c]&&o[c].kill(n,r);return this},t.getTweensOf=function(n,r){for(var a=[],o=xi(n),c=this._first,u=$i(r),d;c;)c instanceof xt?ab(c._targets,o)&&(u?(!pn||c._initted&&c._ts)&&c.globalTime(0)<=r&&c.globalTime(c.totalDuration())>r:!r||c.isActive())&&a.push(c):(d=c.getTweensOf(o,r)).length&&a.push.apply(a,d),c=c._next;return a},t.tweenTo=function(n,r){r=r||{};var a=this,o=mi(a,n),c=r,u=c.startAt,d=c.onStart,l=c.onStartParams,h=c.immediateRender,f,g=xt.to(a,ui({ease:r.ease||"none",lazy:!1,immediateRender:!1,time:o,overwrite:"auto",duration:r.duration||Math.abs((o-(u&&"time"in u?u.time:a._time))/a.timeScale())||tt,onStart:function(){if(a.pause(),!f){var p=r.duration||Math.abs((o-(u&&"time"in u?u.time:a._time))/a.timeScale());g._dur!==p&&Gs(g,p,0,1).render(g._time,!0,!0),f=1}d&&d.apply(g,l||[])}},r));return h?g.render(0):g},t.tweenFromTo=function(n,r,a){return this.tweenTo(r,ui({startAt:{time:mi(this,n)}},a))},t.recent=function(){return this._recent},t.nextLabel=function(n){return n===void 0&&(n=this._time),nu(this,mi(this,n))},t.previousLabel=function(n){return n===void 0&&(n=this._time),nu(this,mi(this,n),1)},t.currentLabel=function(n){return arguments.length?this.seek(n,!0):this.previousLabel(this._time+tt)},t.shiftChildren=function(n,r,a){a===void 0&&(a=0);var o=this._first,c=this.labels,u;for(n=ot(n);o;)o._start>=a&&(o._start+=n,o._end+=n),o=o._next;if(r)for(u in c)c[u]>=a&&(c[u]+=n);return Zn(this)},t.invalidate=function(n){var r=this._first;for(this._lock=0;r;)r.invalidate(n),r=r._next;return s.prototype.invalidate.call(this,n)},t.clear=function(n){n===void 0&&(n=!0);for(var r=this._first,a;r;)a=r._next,this.remove(r),r=a;return this._dp&&(this._time=this._tTime=this._pTime=0),n&&(this.labels={}),Zn(this)},t.totalDuration=function(n){var r=0,a=this,o=a._last,c=vi,u,d,l;if(arguments.length)return a.timeScale((a._repeat<0?a.duration():a.totalDuration())/(a.reversed()?-n:n));if(a._dirty){for(l=a.parent;o;)u=o._prev,o._dirty&&o.totalDuration(),d=o._start,d>c&&a._sort&&o._ts&&!a._lock?(a._lock=1,Pi(a,o,d-o._delay,1)._lock=0):c=d,d<0&&o._ts&&(r-=d,(!l&&!a._dp||l&&l.smoothChildTiming)&&(a._start+=ot(d/a._ts),a._time-=d,a._tTime-=d),a.shiftChildren(-d,!1,-1/0),c=0),o._end>r&&o._ts&&(r=o._end),o=u;Gs(a,a===lt&&a._time>r?a._time:r,1,1),a._dirty=0}return a._tDur},e.updateRoot=function(n){if(lt._ts&&(Fd(lt,Va(n,lt)),Od=si.frame),si.frame>=$h){$h+=ci.autoSleep||120;var r=lt._first;if((!r||!r._ts)&&ci.autoSleep&&si._listeners.length<2){for(;r&&!r._ts;)r=r._next;r||si.sleep()}}},e}(Mr);ui(qt.prototype,{_lock:0,_hasPause:0,_forcing:0});var Pb=function(e,t,i,n,r,a,o){var c=new Kt(this._pt,e,t,0,1,uf,null,r),u=0,d=0,l,h,f,g,_,p,m,x;for(c.b=i,c.e=n,i+="",n+="",(m=~n.indexOf("random("))&&(n=wr(n)),a&&(x=[i,n],a(x,e,t),i=x[0],n=x[1]),h=i.match(Ho)||[];l=Ho.exec(n);)g=l[0],_=n.substring(u,l.index),f?f=(f+1)%5:_.substr(-5)==="rgba("&&(f=1),g!==h[d++]&&(p=parseFloat(h[d-1])||0,c._pt={_next:c._pt,p:_||d===1?_:",",s:p,c:g.charAt(1)==="="?Ls(p,g)-p:parseFloat(g)-p,m:f&&f<4?Math.round:0},u=Ho.lastIndex);return c.c=u<n.length?n.substring(u,n.length):"",c.fp=o,(Dd.test(n)||m)&&(c.e=0),this._pt=c,c},Lc=function(e,t,i,n,r,a,o,c,u,d){ut(n)&&(n=n(r||0,e,a));var l=e[t],h=i!=="get"?i:ut(l)?u?e[t.indexOf("set")||!ut(e["get"+t.substr(3)])?t:"get"+t.substr(3)](u):e[t]():l,f=ut(l)?u?Ub:cf:Ic,g;if(Et(n)&&(~n.indexOf("random(")&&(n=wr(n)),n.charAt(1)==="="&&(g=Ls(h,n)+(It(h)||0),(g||g===0)&&(n=g))),!d||h!==n||tc)return!isNaN(h*n)&&n!==""?(g=new Kt(this._pt,e,t,+h||0,n-(h||0),typeof l=="boolean"?Nb:hf,0,f),u&&(g.fp=u),o&&g.modifier(o,this,e),this._pt=g):(!l&&!(t in e)&&Ac(t,n),Pb.call(this,e,t,h,n,f,c||ci.stringFilter,u))},Lb=function(e,t,i,n,r){if(ut(e)&&(e=mr(e,r,t,i,n)),!Ii(e)||e.style&&e.nodeType||Ut(e)||Pd(e))return Et(e)?mr(e,r,t,i,n):e;var a={},o;for(o in e)a[o]=mr(e[o],r,t,i,n);return a},af=function(e,t,i,n,r,a){var o,c,u,d;if(ni[e]&&(o=new ni[e]).init(r,o.rawVars?t[e]:Lb(t[e],n,r,a,i),i,n,a)!==!1&&(i._pt=c=new Kt(i._pt,r,e,0,1,o.render,o,0,o.priority),i!==Es))for(u=i._ptLookup[i._targets.indexOf(r)],d=o._props.length;d--;)u[o._props[d]]=c;return o},pn,tc,Dc=function s(e,t,i){var n=e.vars,r=n.ease,a=n.startAt,o=n.immediateRender,c=n.lazy,u=n.onUpdate,d=n.runBackwards,l=n.yoyoEase,h=n.keyframes,f=n.autoRevert,g=e._dur,_=e._startAt,p=e._targets,m=e.parent,x=m&&m.data==="nested"?m.vars.targets:p,y=e._overwrite==="auto"&&!wc,b=e.timeline,C=n.easeReverse||l,E,A,L,D,v,S,H,F,P,B,O,j,V;if(b&&(!h||!r)&&(r="none"),e._ease=Qn(r,xr.ease),e._rEase=C&&(Qn(C)||e._ease),e._from=!b&&!!n.runBackwards,e._from&&(e.ratio=1),!b||h&&!n.stagger){if(F=p[0]?Kn(p[0]).harness:0,j=F&&n[F.prop],E=Ga(n,Ec),_&&(_._zTime<0&&_.progress(1),t<0&&d&&o&&!f?_.render(-1,!0):_.revert(d&&g?Pa:sb),_._lazy=0),a){if(wn(e._startAt=xt.set(p,ui({data:"isStart",overwrite:!1,parent:m,immediateRender:!0,lazy:!_&&Yt(c),startAt:null,delay:0,onUpdate:u&&function(){return ri(e,"onUpdate")},stagger:0},a))),e._startAt._dp=0,e._startAt._sat=e,t<0&&(Rt||!o&&!f)&&e._startAt.revert(Pa),o&&g&&t<=0&&i<=0){t&&(e._zTime=t);return}}else if(d&&g&&!_){if(t&&(o=!1),L=ui({overwrite:!1,data:"isFromStart",lazy:o&&!_&&Yt(c),immediateRender:o,stagger:0,parent:m},E),j&&(L[F.prop]=j),wn(e._startAt=xt.set(p,L)),e._startAt._dp=0,e._startAt._sat=e,t<0&&(Rt?e._startAt.revert(Pa):e._startAt.render(-1,!0)),e._zTime=t,!o)s(e._startAt,tt,tt);else if(!t)return}for(e._pt=e._ptCache=0,c=g&&Yt(c)||c&&!g,A=0;A<p.length;A++){if(v=p[A],H=v._gsap||Rc(p)[A]._gsap,e._ptLookup[A]=B={},Kl[H.id]&&vn.length&&Ha(),O=x===p?A:x.indexOf(v),F&&(P=new F).init(v,j||E,e,O,x)!==!1&&(e._pt=D=new Kt(e._pt,v,P.name,0,1,P.render,P,0,P.priority),P._props.forEach(function(se){B[se]=D}),P.priority&&(S=1)),!F||j)for(L in E)ni[L]&&(P=af(L,E,e,O,v,x))?P.priority&&(S=1):B[L]=D=Lc.call(e,v,L,"get",E[L],O,x,0,n.stringFilter);e._op&&e._op[A]&&e.kill(v,e._op[A]),y&&e._pt&&(pn=e,lt.killTweensOf(v,B,e.globalTime(t)),V=!e.parent,pn=0),e._pt&&c&&(Kl[H.id]=1)}S&&df(e),e._onInit&&e._onInit(e)}e._onUpdate=u,e._initted=(!e._op||e._pt)&&!V,h&&t<=0&&b.render(vi,!0,!0)},Db=function(e,t,i,n,r,a,o,c){var u=(e._pt&&e._ptCache||(e._ptCache={}))[t],d,l,h,f;if(!u)for(u=e._ptCache[t]=[],h=e._ptLookup,f=e._targets.length;f--;){if(d=h[f][t],d&&d.d&&d.d._pt)for(d=d.d._pt;d&&d.p!==t&&d.fp!==t;)d=d._next;if(!d)return tc=1,e.vars[t]="+=0",Dc(e,o),tc=0,c?yr(t+" not eligible for reset. Try splitting into individual properties"):1;u.push(d)}for(f=u.length;f--;)l=u[f],d=l._pt||l,d.s=(n||n===0)&&!r?n:d.s+(n||0)+a*d.c,d.c=i-d.s,l.e&&(l.e=mt(i)+It(l.e)),l.b&&(l.b=d.s+It(l.b))},Ib=function(e,t){var i=e[0]?Kn(e[0]).harness:0,n=i&&i.aliases,r,a,o,c;if(!n)return t;r=zs({},t);for(a in n)if(a in r)for(c=n[a].split(","),o=c.length;o--;)r[c[o]]=r[a];return r},kb=function(e,t,i,n){var r=t.ease||n||"power1.inOut",a,o;if(Ut(t))o=i[e]||(i[e]=[]),t.forEach(function(c,u){return o.push({t:u/(t.length-1)*100,v:c,e:r})});else for(a in t)o=i[a]||(i[a]=[]),a==="ease"||o.push({t:parseFloat(e),v:t[a],e:r})},mr=function(e,t,i,n,r){return ut(e)?e.call(t,i,n,r):Et(e)&&~e.indexOf("random(")?wr(e):e},of=Cc+"repeat,repeatDelay,yoyo,repeatRefresh,yoyoEase,easeReverse,autoRevert",lf={};jt(of+",id,stagger,delay,duration,paused,scrollTrigger",function(s){return lf[s]=1});var xt=function(s){Cd(e,s);function e(i,n,r,a){var o;typeof n=="number"&&(r.duration=n,n=r,r=null),o=s.call(this,a?n:fr(n))||this;var c=o.vars,u=c.duration,d=c.delay,l=c.immediateRender,h=c.stagger,f=c.overwrite,g=c.keyframes,_=c.defaults,p=c.scrollTrigger,m=n.parent||lt,x=(Ut(i)||Pd(i)?$i(i[0]):"length"in n)?[i]:xi(i),y,b,C,E,A,L,D,v;if(o._targets=x.length?Rc(x):yr("GSAP target "+i+" not found. https://gsap.com",!ci.nullTargetWarn)||[],o._ptLookup=[],o._overwrite=f,g||h||ha(u)||ha(d)){n=o.vars;var S=n.easeReverse||n.yoyoEase;if(y=o.timeline=new qt({data:"nested",defaults:_||{},targets:m&&m.data==="nested"?m.vars.targets:x}),y.kill(),y.parent=y._dp=Gi(o),y._start=0,h||ha(u)||ha(d)){if(E=x.length,D=h&&Yd(h),Ii(h))for(A in h)~of.indexOf(A)&&(v||(v={}),v[A]=h[A]);for(b=0;b<E;b++)C=Ga(n,lf),C.stagger=0,S&&(C.easeReverse=S),v&&zs(C,v),L=x[b],C.duration=+mr(u,Gi(o),b,L,x),C.delay=(+mr(d,Gi(o),b,L,x)||0)-o._delay,!h&&E===1&&C.delay&&(o._delay=d=C.delay,o._start+=d,C.delay=0),y.to(L,C,D?D(b,L,x):0),y._ease=Ne.none;y.duration()?u=d=0:o.timeline=0}else if(g){fr(ui(y.vars.defaults,{ease:"none"})),y._ease=Qn(g.ease||n.ease||"none");var H=0,F,P,B;if(Ut(g))g.forEach(function(O){return y.to(x,O,">")}),y.duration();else{C={};for(A in g)A==="ease"||A==="easeEach"||kb(A,g[A],C,g.easeEach);for(A in C)for(F=C[A].sort(function(O,j){return O.t-j.t}),H=0,b=0;b<F.length;b++)P=F[b],B={ease:P.e,duration:(P.t-(b?F[b-1].t:0))/100*u},B[A]=P.v,y.to(x,B,H),H+=B.duration;y.duration()<u&&y.to({},{duration:u-y.duration()})}}u||o.duration(u=y.duration())}else o.timeline=0;return f===!0&&!wc&&(pn=Gi(o),lt.killTweensOf(x),pn=0),Pi(m,Gi(o),r),n.reversed&&o.reverse(),n.paused&&o.paused(!0),(l||!u&&!g&&o._start===ot(m._time)&&Yt(l)&&hb(Gi(o))&&m.data!=="nested")&&(o._tTime=-tt,o.render(Math.max(0,-d)||0)),p&&Vd(Gi(o),p),o}var t=e.prototype;return t.render=function(n,r,a){var o=this._time,c=this._tDur,u=this._dur,d=n<0,l=n>c-tt&&!d?c:n<tt?0:n,h,f,g,_,p,m,x,y;if(!u)db(this,n,r,a);else if(l!==this._tTime||!n||a||!this._initted&&this._tTime||this._startAt&&this._zTime<0!==d||this._lazy){if(h=l,y=this.timeline,this._repeat){if(_=u+this._rDelay,this._repeat<-1&&d)return this.totalTime(_*100+n,r,a);if(h=ot(l%_),l===c?(g=this._repeat,h=u):(p=ot(l/_),g=~~p,g&&g===p?(h=u,g--):h>u&&(h=u)),m=this._yoyo&&g&1,m&&(h=u-h),p=Hs(this._tTime,_),h===o&&!a&&this._initted&&g===p)return this._tTime=l,this;g!==p&&this.vars.repeatRefresh&&!m&&!this._lock&&h!==_&&this._initted&&(this._lock=a=1,this.render(ot(_*g),!0).invalidate()._lock=0)}if(!this._initted){if(Wd(this,d?n:h,a,r,l))return this._tTime=0,this;if(o!==this._time&&!(a&&this.vars.repeatRefresh&&g!==p))return this;if(u!==this._dur)return this.render(n,r,a)}if(this._rEase){var b=h<o;if(b!==this._inv){var C=b?o:u-o;this._inv=b,this._from&&(this.ratio=1-this.ratio),this._invRatio=this.ratio,this._invTime=o,this._invRecip=C?(b?-1:1)/C:0,this._invScale=b?-this.ratio:1-this.ratio,this._invEase=b?this._rEase:this._ease}this.ratio=x=this._invRatio+this._invScale*this._invEase((h-this._invTime)*this._invRecip)}else this.ratio=x=this._ease(h/u);if(this._from&&(this.ratio=x=1-x),this._tTime=l,this._time=h,!this._act&&this._ts&&(this._act=1,this._lazy=0),!o&&l&&!r&&!p&&(ri(this,"onStart"),this._tTime!==l))return this;for(f=this._pt;f;)f.r(x,f.d),f=f._next;y&&y.render(n<0?n:y._dur*y._ease(h/this._dur),r,a)||this._startAt&&(this._zTime=n),this._onUpdate&&!r&&(d&&Zl(this,n,r,a),ri(this,"onUpdate")),this._repeat&&g!==p&&this.vars.onRepeat&&!r&&this.parent&&ri(this,"onRepeat"),(l===this._tDur||!l)&&this._tTime===l&&(d&&!this._onUpdate&&Zl(this,n,!0,!0),(n||!u)&&(l===this._tDur&&this._ts>0||!l&&this._ts<0)&&wn(this,1),!r&&!(d&&!o)&&(l||o||m)&&(ri(this,l===c?"onComplete":"onReverseComplete",!0),this._prom&&!(l<c&&this.timeScale()>0)&&this._prom()))}return this},t.targets=function(){return this._targets},t.invalidate=function(n){return(!n||!this.vars.runBackwards)&&(this._startAt=0),this._pt=this._op=this._onUpdate=this._lazy=this.ratio=0,this._ptLookup=[],this.timeline&&this.timeline.invalidate(n),s.prototype.invalidate.call(this,n)},t.resetTo=function(n,r,a,o,c){Sr||si.wake(),this._ts||this.play();var u=Math.min(this._dur,(this._dp._time-this._start)*this._ts),d;return this._initted||Dc(this,u),d=this._ease(u/this._dur),Db(this,n,r,a,o,d,u,c)?this.resetTo(n,r,a,o,1):(io(this,0),this.parent||Hd(this._dp,this,"_first","_last",this._dp._sort?"_start":0),this.render(0))},t.kill=function(n,r){if(r===void 0&&(r="all"),!n&&(!r||r==="all"))return this._lazy=this._pt=0,this.parent?lr(this):this.scrollTrigger&&this.scrollTrigger.kill(!!Rt),this;if(this.timeline){var a=this.timeline.totalDuration();return this.timeline.killTweensOf(n,r,pn&&pn.vars.overwrite!==!0)._first||lr(this),this.parent&&a!==this.timeline.totalDuration()&&Gs(this,this._dur*this.timeline._tDur/a,0,1),this}var o=this._targets,c=n?xi(n):o,u=this._ptLookup,d=this._pt,l,h,f,g,_,p,m;if((!r||r==="all")&&lb(o,c))return r==="all"&&(this._pt=0),lr(this);for(l=this._op=this._op||[],r!=="all"&&(Et(r)&&(_={},jt(r,function(x){return _[x]=1}),r=_),r=Ib(o,r)),m=o.length;m--;)if(~c.indexOf(o[m])){h=u[m],r==="all"?(l[m]=r,g=h,f={}):(f=l[m]=l[m]||{},g=r);for(_ in g)p=h&&h[_],p&&((!("kill"in p.d)||p.d.kill(_)===!0)&&eo(this,p,"_pt"),delete h[_]),f!=="all"&&(f[_]=1)}return this._initted&&!this._pt&&d&&lr(this),this},e.to=function(n,r){return new e(n,r,arguments[2])},e.from=function(n,r){return pr(1,arguments)},e.delayedCall=function(n,r,a,o){return new e(r,0,{immediateRender:!1,lazy:!1,overwrite:!1,delay:n,onComplete:r,onReverseComplete:r,onCompleteParams:a,onReverseCompleteParams:a,callbackScope:o})},e.fromTo=function(n,r,a){return pr(2,arguments)},e.set=function(n,r){return r.duration=0,r.repeatDelay||(r.repeat=0),new e(n,r)},e.killTweensOf=function(n,r,a){return lt.killTweensOf(n,r,a)},e}(Mr);ui(xt.prototype,{_targets:[],_lazy:0,_startAt:0,_op:0,_onInit:0});jt("staggerTo,staggerFrom,staggerFromTo",function(s){xt[s]=function(){var e=new qt,t=Jl.call(arguments,0);return t.splice(s==="staggerFromTo"?5:4,0,0),e[s].apply(e,t)}});var Ic=function(e,t,i){return e[t]=i},cf=function(e,t,i){return e[t](i)},Ub=function(e,t,i,n){return e[t](n.fp,i)},Ob=function(e,t,i){return e.setAttribute(t,i)},kc=function(e,t){return ut(e[t])?cf:Sc(e[t])&&e.setAttribute?Ob:Ic},hf=function(e,t){return t.set(t.t,t.p,Math.round((t.s+t.c*e)*1e6)/1e6,t)},Nb=function(e,t){return t.set(t.t,t.p,!!(t.s+t.c*e),t)},uf=function(e,t){var i=t._pt,n="";if(!e&&t.b)n=t.b;else if(e===1&&t.e)n=t.e;else{for(;i;)n=i.p+(i.m?i.m(i.s+i.c*e):Math.round((i.s+i.c*e)*1e4)/1e4)+n,i=i._next;n+=t.c}t.set(t.t,t.p,n,t)},Uc=function(e,t){for(var i=t._pt;i;)i.r(e,i.d),i=i._next},Fb=function(e,t,i,n){for(var r=this._pt,a;r;)a=r._next,r.p===n&&r.modifier(e,t,i),r=a},Bb=function(e){for(var t=this._pt,i,n;t;)n=t._next,t.p===e&&!t.op||t.op===e?eo(this,t,"_pt"):t.dep||(i=1),t=n;return!i},zb=function(e,t,i,n){n.mSet(e,t,n.m.call(n.tween,i,n.mt),n)},df=function(e){for(var t=e._pt,i,n,r,a;t;){for(i=t._next,n=r;n&&n.pr>t.pr;)n=n._next;(t._prev=n?n._prev:a)?t._prev._next=t:r=t,(t._next=n)?n._prev=t:a=t,t=i}e._pt=r},Kt=function(){function s(t,i,n,r,a,o,c,u,d){this.t=i,this.s=r,this.c=a,this.p=n,this.r=o||hf,this.d=c||this,this.set=u||Ic,this.pr=d||0,this._next=t,t&&(t._prev=this)}var e=s.prototype;return e.modifier=function(i,n,r){this.mSet=this.mSet||this.set,this.set=zb,this.m=i,this.mt=r,this.tween=n},s}();jt(Cc+"parent,duration,ease,delay,overwrite,runBackwards,startAt,yoyo,immediateRender,repeat,repeatDelay,data,paused,reversed,lazy,callbackScope,stringFilter,id,yoyoEase,stagger,inherit,repeatRefresh,keyframes,autoRevert,scrollTrigger,easeReverse",function(s){return Ec[s]=1});hi.TweenMax=hi.TweenLite=xt;hi.TimelineLite=hi.TimelineMax=qt;lt=new qt({sortChildren:!1,defaults:xr,autoRemoveChildren:!0,id:"root",smoothChildTiming:!0});ci.stringFilter=nf;var Jn=[],Da={},Hb=[],ru=0,Gb=0,Xo=function(e){return(Da[e]||Hb).map(function(t){return t()})},ic=function(){var e=Date.now(),t=[];e-ru>2&&(Xo("matchMediaInit"),Jn.forEach(function(i){var n=i.queries,r=i.conditions,a,o,c,u;for(o in n)a=Ci.matchMedia(n[o]).matches,a&&(c=1),a!==r[o]&&(r[o]=a,u=1);u&&(i.revert(),c&&t.push(i))}),Xo("matchMediaRevert"),t.forEach(function(i){return i.onMatch(i,function(n){return i.add(null,n)})}),ru=e,Xo("matchMedia"))},ff=function(){function s(t,i){this.selector=i&&$l(i),this.data=[],this._r=[],this.isReverted=!1,this.id=Gb++,t&&this.add(t)}var e=s.prototype;return e.add=function(i,n,r){ut(i)&&(r=n,n=i,i=ut);var a=this,o=function(){var u=at,d=a.selector,l;return u&&u!==a&&u.data.push(a),r&&(a.selector=$l(r)),at=a,l=n.apply(a,arguments),ut(l)&&a._r.push(l),at=u,a.selector=d,a.isReverted=!1,l};return a.last=o,i===ut?o(a,function(c){return a.add(null,c)}):i?a[i]=o:o},e.ignore=function(i){var n=at;at=null,i(this),at=n},e.getTweens=function(){var i=[];return this.data.forEach(function(n){return n instanceof s?i.push.apply(i,n.getTweens()):n instanceof xt&&!(n.parent&&n.parent.data==="nested")&&i.push(n)}),i},e.clear=function(){this._r.length=this.data.length=0},e.kill=function(i,n){var r=this;if(i?function(){for(var o=r.getTweens(),c=r.data.length,u;c--;)u=r.data[c],u.data==="isFlip"&&(u.revert(),u.getChildren(!0,!0,!1).forEach(function(d){return o.splice(o.indexOf(d),1)}));for(o.map(function(d){return{g:d._dur||d._delay||d._sat&&!d._sat.vars.immediateRender?d.globalTime(0):-1/0,t:d}}).sort(function(d,l){return l.g-d.g||-1/0}).forEach(function(d){return d.t.revert(i)}),c=r.data.length;c--;)u=r.data[c],u instanceof qt?u.data!=="nested"&&(u.scrollTrigger&&u.scrollTrigger.revert(),u.kill()):!(u instanceof xt)&&u.revert&&u.revert(i);r._r.forEach(function(d){return d(i,r)}),r.isReverted=!0}():this.data.forEach(function(o){return o.kill&&o.kill()}),this.clear(),n)for(var a=Jn.length;a--;)Jn[a].id===this.id&&Jn.splice(a,1)},e.revert=function(i){this.kill(i||{})},s}(),Vb=function(){function s(t){this.contexts=[],this.scope=t,at&&at.data.push(this)}var e=s.prototype;return e.add=function(i,n,r){Ii(i)||(i={matches:i});var a=new ff(0,r||this.scope),o=a.conditions={},c,u,d;at&&!a.selector&&(a.selector=at.selector),this.contexts.push(a),n=a.add("onMatch",n),a.queries=i;for(u in i)u==="all"?d=1:(c=Ci.matchMedia(i[u]),c&&(Jn.indexOf(a)<0&&Jn.push(a),(o[u]=c.matches)&&(d=1),c.addListener?c.addListener(ic):c.addEventListener("change",ic)));return d&&n(a,function(l){return a.add(null,l)}),this},e.revert=function(i){this.kill(i||{})},e.kill=function(i){this.contexts.forEach(function(n){return n.kill(i,!0)})},s}(),Wa={registerPlugin:function(){for(var e=arguments.length,t=new Array(e),i=0;i<e;i++)t[i]=arguments[i];t.forEach(function(n){return $d(n)})},timeline:function(e){return new qt(e)},getTweensOf:function(e,t){return lt.getTweensOf(e,t)},getProperty:function(e,t,i,n){Et(e)&&(e=xi(e)[0]);var r=Kn(e||{}).get,a=i?zd:Bd;return i==="native"&&(i=""),e&&(t?a((ni[t]&&ni[t].get||r)(e,t,i,n)):function(o,c,u){return a((ni[o]&&ni[o].get||r)(e,o,c,u))})},quickSetter:function(e,t,i){if(e=xi(e),e.length>1){var n=e.map(function(d){return Qt.quickSetter(d,t,i)}),r=n.length;return function(d){for(var l=r;l--;)n[l](d)}}e=e[0]||{};var a=ni[t],o=Kn(e),c=o.harness&&(o.harness.aliases||{})[t]||t,u=a?function(d){var l=new a;Es._pt=0,l.init(e,i?d+i:d,Es,0,[e]),l.render(1,l),Es._pt&&Uc(1,Es)}:o.set(e,c);return a?u:function(d){return u(e,c,i?d+i:d,o,1)}},quickTo:function(e,t,i){var n,r=Qt.to(e,ui((n={},n[t]="+=0.1",n.paused=!0,n.stagger=0,n),i||{})),a=function(c,u,d){return r.resetTo(t,c,u,d)};return a.tween=r,a},isTweening:function(e){return lt.getTweensOf(e,!0).length>0},defaults:function(e){return e&&e.ease&&(e.ease=Qn(e.ease,xr.ease)),eu(xr,e||{})},config:function(e){return eu(ci,e||{})},registerEffect:function(e){var t=e.name,i=e.effect,n=e.plugins,r=e.defaults,a=e.extendTimeline;(n||"").split(",").forEach(function(o){return o&&!ni[o]&&!hi[o]&&yr(t+" effect requires "+o+" plugin.")}),Go[t]=function(o,c,u){return i(xi(o),ui(c||{},r),u)},a&&(qt.prototype[t]=function(o,c,u){return this.add(Go[t](o,Ii(c)?c:(u=c)&&{},this),u)})},registerEase:function(e,t){Ne[e]=Qn(t)},parseEase:function(e,t){return arguments.length?Qn(e,t):Ne},getById:function(e){return lt.getById(e)},exportRoot:function(e,t){e===void 0&&(e={});var i=new qt(e),n,r;for(i.smoothChildTiming=Yt(e.smoothChildTiming),lt.remove(i),i._dp=0,i._time=i._tTime=lt._time,n=lt._first;n;)r=n._next,(t||!(!n._dur&&n instanceof xt&&n.vars.onComplete===n._targets[0]))&&Pi(i,n,n._start-n._delay),n=r;return Pi(lt,i,0),i},context:function(e,t){return e?new ff(e,t):at},matchMedia:function(e){return new Vb(e)},matchMediaRefresh:function(){return Jn.forEach(function(e){var t=e.conditions,i,n;for(n in t)t[n]&&(t[n]=!1,i=1);i&&e.revert()})||ic()},addEventListener:function(e,t){var i=Da[e]||(Da[e]=[]);~i.indexOf(t)||i.push(t)},removeEventListener:function(e,t){var i=Da[e],n=i&&i.indexOf(t);n>=0&&i.splice(n,1)},utils:{wrap:yb,wrapYoyo:bb,distribute:Yd,random:Kd,snap:jd,normalize:xb,getUnit:It,clamp:mb,splitColor:ef,toArray:xi,selector:$l,mapRange:Qd,pipe:_b,unitize:vb,interpolate:wb,shuffle:Xd},install:kd,effects:Go,ticker:si,updateRoot:qt.updateRoot,plugins:ni,globalTimeline:lt,core:{PropTween:Kt,globals:Ud,Tween:xt,Timeline:qt,Animation:Mr,getCache:Kn,_removeLinkedListItem:eo,reverting:function(){return Rt},context:function(e){return e&&at&&(at.data.push(e),e._ctx=at),at},suppressOverwrites:function(e){return wc=e}}};jt("to,from,fromTo,delayedCall,set,killTweensOf",function(s){return Wa[s]=xt[s]});si.add(qt.updateRoot);Es=Wa.to({},{duration:0});var Wb=function(e,t){for(var i=e._pt;i&&i.p!==t&&i.op!==t&&i.fp!==t;)i=i._next;return i},qb=function(e,t){var i=e._targets,n,r,a;for(n in t)for(r=i.length;r--;)a=e._ptLookup[r][n],a&&(a=a.d)&&(a._pt&&(a=Wb(a,n)),a&&a.modifier&&a.modifier(t[n],e,i[r],n))},Yo=function(e,t){return{name:e,headless:1,rawVars:1,init:function(n,r,a){a._onInit=function(o){var c,u;if(Et(r)&&(c={},jt(r,function(d){return c[d]=1}),r=c),t){c={};for(u in r)c[u]=t(r[u]);r=c}qb(o,r)}}}},Qt=Wa.registerPlugin({name:"attr",init:function(e,t,i,n,r){var a,o,c;this.tween=i;for(a in t)c=e.getAttribute(a)||"",o=this.add(e,"setAttribute",(c||0)+"",t[a],n,r,0,0,a),o.op=a,o.b=c,this._props.push(a)},render:function(e,t){for(var i=t._pt;i;)Rt?i.set(i.t,i.p,i.b,i):i.r(e,i.d),i=i._next}},{name:"endArray",headless:1,init:function(e,t){for(var i=t.length;i--;)this.add(e,i,e[i]||0,t[i],0,0,0,0,0,1)}},Yo("roundProps",ec),Yo("modifiers"),Yo("snap",jd))||Wa;xt.version=qt.version=Qt.version="3.15.0";Id=1;Mc()&&Vs();Ne.Power0;Ne.Power1;Ne.Power2;Ne.Power3;Ne.Power4;Ne.Linear;Ne.Quad;Ne.Cubic;Ne.Quart;Ne.Quint;Ne.Strong;Ne.Elastic;Ne.Back;Ne.SteppedEase;Ne.Bounce;Ne.Sine;Ne.Expo;Ne.Circ;/*!
 * CSSPlugin 3.15.0
 * https://gsap.com
 *
 * Copyright 2008-2026, GreenSock. All rights reserved.
 * Subject to the terms at https://gsap.com/standard-license
 * @author: Jack Doyle, jack@greensock.com
*/var au,mn,Ds,Oc,Yn,ou,Nc,Xb=function(){return typeof window<"u"},en={},Vn=180/Math.PI,Is=Math.PI/180,bs=Math.atan2,lu=1e8,Fc=/([A-Z])/g,Yb=/(left|right|width|margin|padding|x)/i,jb=/[\s,\(]\S/,Li={autoAlpha:"opacity,visibility",scale:"scaleX,scaleY",alpha:"opacity"},nc=function(e,t){return t.set(t.t,t.p,Math.round((t.s+t.c*e)*1e4)/1e4+t.u,t)},Kb=function(e,t){return t.set(t.t,t.p,e===1?t.e:Math.round((t.s+t.c*e)*1e4)/1e4+t.u,t)},Zb=function(e,t){return t.set(t.t,t.p,e?Math.round((t.s+t.c*e)*1e4)/1e4+t.u:t.b,t)},Qb=function(e,t){return t.set(t.t,t.p,e===1?t.e:e?Math.round((t.s+t.c*e)*1e4)/1e4+t.u:t.b,t)},Jb=function(e,t){var i=t.s+t.c*e;t.set(t.t,t.p,~~(i+(i<0?-.5:.5))+t.u,t)},pf=function(e,t){return t.set(t.t,t.p,e?t.e:t.b,t)},mf=function(e,t){return t.set(t.t,t.p,e!==1?t.b:t.e,t)},$b=function(e,t,i){return e.style[t]=i},ew=function(e,t,i){return e.style.setProperty(t,i)},tw=function(e,t,i){return e._gsap[t]=i},iw=function(e,t,i){return e._gsap.scaleX=e._gsap.scaleY=i},nw=function(e,t,i,n,r){var a=e._gsap;a.scaleX=a.scaleY=i,a.renderTransform(r,a)},sw=function(e,t,i,n,r){var a=e._gsap;a[t]=i,a.renderTransform(r,a)},ct="transform",Zt=ct+"Origin",rw=function s(e,t){var i=this,n=this.target,r=n.style,a=n._gsap;if(e in en&&r){if(this.tfm=this.tfm||{},e!=="transform")e=Li[e]||e,~e.indexOf(",")?e.split(",").forEach(function(o){return i.tfm[o]=Vi(n,o)}):this.tfm[e]=a.x?a[e]:Vi(n,e),e===Zt&&(this.tfm.zOrigin=a.zOrigin);else return Li.transform.split(",").forEach(function(o){return s.call(i,o,t)});if(this.props.indexOf(ct)>=0)return;a.svg&&(this.svgo=n.getAttribute("data-svg-origin"),this.props.push(Zt,t,"")),e=ct}(r||t)&&this.props.push(e,t,r[e])},gf=function(e){e.translate&&(e.removeProperty("translate"),e.removeProperty("scale"),e.removeProperty("rotate"))},aw=function(){var e=this.props,t=this.target,i=t.style,n=t._gsap,r,a;for(r=0;r<e.length;r+=3)e[r+1]?e[r+1]===2?t[e[r]](e[r+2]):t[e[r]]=e[r+2]:e[r+2]?i[e[r]]=e[r+2]:i.removeProperty(e[r].substr(0,2)==="--"?e[r]:e[r].replace(Fc,"-$1").toLowerCase());if(this.tfm){for(a in this.tfm)n[a]=this.tfm[a];n.svg&&(n.renderTransform(),t.setAttribute("data-svg-origin",this.svgo||"")),r=Nc(),(!r||!r.isStart)&&!i[ct]&&(gf(i),n.zOrigin&&i[Zt]&&(i[Zt]+=" "+n.zOrigin+"px",n.zOrigin=0,n.renderTransform()),n.uncache=1)}},_f=function(e,t){var i={target:e,props:[],revert:aw,save:rw};return e._gsap||Qt.core.getCache(e),t&&e.style&&e.nodeType&&t.split(",").forEach(function(n){return i.save(n)}),i},vf,sc=function(e,t){var i=mn.createElementNS?mn.createElementNS((t||"http://www.w3.org/1999/xhtml").replace(/^https/,"http"),e):mn.createElement(e);return i&&i.style?i:mn.createElement(e)},ai=function s(e,t,i){var n=getComputedStyle(e);return n[t]||n.getPropertyValue(t.replace(Fc,"-$1").toLowerCase())||n.getPropertyValue(t)||!i&&s(e,Ws(t)||t,1)||""},cu="O,Moz,ms,Ms,Webkit".split(","),Ws=function(e,t,i){var n=t||Yn,r=n.style,a=5;if(e in r&&!i)return e;for(e=e.charAt(0).toUpperCase()+e.substr(1);a--&&!(cu[a]+e in r););return a<0?null:(a===3?"ms":a>=0?cu[a]:"")+e},rc=function(){Xb()&&window.document&&(au=window,mn=au.document,Ds=mn.documentElement,Yn=sc("div")||{style:{}},sc("div"),ct=Ws(ct),Zt=ct+"Origin",Yn.style.cssText="border-width:0;line-height:0;position:absolute;padding:0",vf=!!Ws("perspective"),Nc=Qt.core.reverting,Oc=1)},hu=function(e){var t=e.ownerSVGElement,i=sc("svg",t&&t.getAttribute("xmlns")||"http://www.w3.org/2000/svg"),n=e.cloneNode(!0),r;n.style.display="block",i.appendChild(n),Ds.appendChild(i);try{r=n.getBBox()}catch{}return i.removeChild(n),Ds.removeChild(i),r},uu=function(e,t){for(var i=t.length;i--;)if(e.hasAttribute(t[i]))return e.getAttribute(t[i])},xf=function(e){var t,i;try{t=e.getBBox()}catch{t=hu(e),i=1}return t&&(t.width||t.height)||i||(t=hu(e)),t&&!t.width&&!t.x&&!t.y?{x:+uu(e,["x","cx","x1"])||0,y:+uu(e,["y","cy","y1"])||0,width:0,height:0}:t},yf=function(e){return!!(e.getCTM&&(!e.parentNode||e.ownerSVGElement)&&xf(e))},Sn=function(e,t){if(t){var i=e.style,n;t in en&&t!==Zt&&(t=ct),i.removeProperty?(n=t.substr(0,2),(n==="ms"||t.substr(0,6)==="webkit")&&(t="-"+t),i.removeProperty(n==="--"?t:t.replace(Fc,"-$1").toLowerCase())):i.removeAttribute(t)}},gn=function(e,t,i,n,r,a){var o=new Kt(e._pt,t,i,0,1,a?mf:pf);return e._pt=o,o.b=n,o.e=r,e._props.push(i),o},du={deg:1,rad:1,turn:1},ow={grid:1,flex:1},Mn=function s(e,t,i,n){var r=parseFloat(i)||0,a=(i+"").trim().substr((r+"").length)||"px",o=Yn.style,c=Yb.test(t),u=e.tagName.toLowerCase()==="svg",d=(u?"client":"offset")+(c?"Width":"Height"),l=100,h=n==="px",f=n==="%",g,_,p,m;if(n===a||!r||du[n]||du[a])return r;if(a!=="px"&&!h&&(r=s(e,t,i,"px")),m=e.getCTM&&yf(e),(f||a==="%")&&(en[t]||~t.indexOf("adius")))return g=m?e.getBBox()[c?"width":"height"]:e[d],mt(f?r/g*l:r/100*g);if(o[c?"width":"height"]=l+(h?a:n),_=n!=="rem"&&~t.indexOf("adius")||n==="em"&&e.appendChild&&!u?e:e.parentNode,m&&(_=(e.ownerSVGElement||{}).parentNode),(!_||_===mn||!_.appendChild)&&(_=mn.body),p=_._gsap,p&&f&&p.width&&c&&p.time===si.time&&!p.uncache)return mt(r/p.width*l);if(f&&(t==="height"||t==="width")){var x=e.style[t];e.style[t]=l+n,g=e[d],x?e.style[t]=x:Sn(e,t)}else(f||a==="%")&&!ow[ai(_,"display")]&&(o.position=ai(e,"position")),_===e&&(o.position="static"),_.appendChild(Yn),g=Yn[d],_.removeChild(Yn),o.position="absolute";return c&&f&&(p=Kn(_),p.time=si.time,p.width=_[d]),mt(h?g*r/l:g&&r?l/g*r:0)},Vi=function(e,t,i,n){var r;return Oc||rc(),t in Li&&t!=="transform"&&(t=Li[t],~t.indexOf(",")&&(t=t.split(",")[0])),en[t]&&t!=="transform"?(r=Ar(e,n),r=t!=="transformOrigin"?r[t]:r.svg?r.origin:Xa(ai(e,Zt))+" "+r.zOrigin+"px"):(r=e.style[t],(!r||r==="auto"||n||~(r+"").indexOf("calc("))&&(r=qa[t]&&qa[t](e,t,i)||ai(e,t)||Nd(e,t)||(t==="opacity"?1:0))),i&&!~(r+"").trim().indexOf(" ")?Mn(e,t,r,i)+i:r},lw=function(e,t,i,n){if(!i||i==="none"){var r=Ws(t,e,1),a=r&&ai(e,r,1);a&&a!==i?(t=r,i=a):t==="borderColor"&&(i=ai(e,"borderTopColor"))}var o=new Kt(this._pt,e.style,t,0,1,uf),c=0,u=0,d,l,h,f,g,_,p,m,x,y,b,C;if(o.b=i,o.e=n,i+="",n+="",n.substring(0,6)==="var(--"&&(n=ai(e,n.substring(4,n.indexOf(")")))),n==="auto"&&(_=e.style[t],e.style[t]=n,n=ai(e,t)||n,_?e.style[t]=_:Sn(e,t)),d=[i,n],nf(d),i=d[0],n=d[1],h=i.match(As)||[],C=n.match(As)||[],C.length){for(;l=As.exec(n);)p=l[0],x=n.substring(c,l.index),g?g=(g+1)%5:(x.substr(-5)==="rgba("||x.substr(-5)==="hsla(")&&(g=1),p!==(_=h[u++]||"")&&(f=parseFloat(_)||0,b=_.substr((f+"").length),p.charAt(1)==="="&&(p=Ls(f,p)+b),m=parseFloat(p),y=p.substr((m+"").length),c=As.lastIndex-y.length,y||(y=y||ci.units[t]||b,c===n.length&&(n+=y,o.e+=y)),b!==y&&(f=Mn(e,t,_,y)||0),o._pt={_next:o._pt,p:x||u===1?x:",",s:f,c:m-f,m:g&&g<4||t==="zIndex"?Math.round:0});o.c=c<n.length?n.substring(c,n.length):""}else o.r=t==="display"&&n==="none"?mf:pf;return Dd.test(n)&&(o.e=0),this._pt=o,o},fu={top:"0%",bottom:"100%",left:"0%",right:"100%",center:"50%"},cw=function(e){var t=e.split(" "),i=t[0],n=t[1]||"50%";return(i==="top"||i==="bottom"||n==="left"||n==="right")&&(e=i,i=n,n=e),t[0]=fu[i]||i,t[1]=fu[n]||n,t.join(" ")},hw=function(e,t){if(t.tween&&t.tween._time===t.tween._dur){var i=t.t,n=i.style,r=t.u,a=i._gsap,o,c,u;if(r==="all"||r===!0)n.cssText="",c=1;else for(r=r.split(","),u=r.length;--u>-1;)o=r[u],en[o]&&(c=1,o=o==="transformOrigin"?Zt:ct),Sn(i,o);c&&(Sn(i,ct),a&&(a.svg&&i.removeAttribute("transform"),n.scale=n.rotate=n.translate="none",Ar(i,1),a.uncache=1,gf(n)))}},qa={clearProps:function(e,t,i,n,r){if(r.data!=="isFromStart"){var a=e._pt=new Kt(e._pt,t,i,0,0,hw);return a.u=n,a.pr=-10,a.tween=r,e._props.push(i),1}}},Tr=[1,0,0,1,0,0],bf={},wf=function(e){return e==="matrix(1, 0, 0, 1, 0, 0)"||e==="none"||!e},pu=function(e){var t=ai(e,ct);return wf(t)?Tr:t.substr(7).match(Ld).map(mt)},Bc=function(e,t){var i=e._gsap||Kn(e),n=e.style,r=pu(e),a,o,c,u;return i.svg&&e.getAttribute("transform")?(c=e.transform.baseVal.consolidate().matrix,r=[c.a,c.b,c.c,c.d,c.e,c.f],r.join(",")==="1,0,0,1,0,0"?Tr:r):(r===Tr&&!e.offsetParent&&e!==Ds&&!i.svg&&(c=n.display,n.display="block",a=e.parentNode,(!a||!e.offsetParent&&!e.getBoundingClientRect().width)&&(u=1,o=e.nextElementSibling,Ds.appendChild(e)),r=pu(e),c?n.display=c:Sn(e,"display"),u&&(o?a.insertBefore(e,o):a?a.appendChild(e):Ds.removeChild(e))),t&&r.length>6?[r[0],r[1],r[4],r[5],r[12],r[13]]:r)},ac=function(e,t,i,n,r,a){var o=e._gsap,c=r||Bc(e,!0),u=o.xOrigin||0,d=o.yOrigin||0,l=o.xOffset||0,h=o.yOffset||0,f=c[0],g=c[1],_=c[2],p=c[3],m=c[4],x=c[5],y=t.split(" "),b=parseFloat(y[0])||0,C=parseFloat(y[1])||0,E,A,L,D;i?c!==Tr&&(A=f*p-g*_)&&(L=b*(p/A)+C*(-_/A)+(_*x-p*m)/A,D=b*(-g/A)+C*(f/A)-(f*x-g*m)/A,b=L,C=D):(E=xf(e),b=E.x+(~y[0].indexOf("%")?b/100*E.width:b),C=E.y+(~(y[1]||y[0]).indexOf("%")?C/100*E.height:C)),n||n!==!1&&o.smooth?(m=b-u,x=C-d,o.xOffset=l+(m*f+x*_)-m,o.yOffset=h+(m*g+x*p)-x):o.xOffset=o.yOffset=0,o.xOrigin=b,o.yOrigin=C,o.smooth=!!n,o.origin=t,o.originIsAbsolute=!!i,e.style[Zt]="0px 0px",a&&(gn(a,o,"xOrigin",u,b),gn(a,o,"yOrigin",d,C),gn(a,o,"xOffset",l,o.xOffset),gn(a,o,"yOffset",h,o.yOffset)),e.setAttribute("data-svg-origin",b+" "+C)},Ar=function(e,t){var i=e._gsap||new rf(e);if("x"in i&&!t&&!i.uncache)return i;var n=e.style,r=i.scaleX<0,a="px",o="deg",c=getComputedStyle(e),u=ai(e,Zt)||"0",d,l,h,f,g,_,p,m,x,y,b,C,E,A,L,D,v,S,H,F,P,B,O,j,V,se,ee,ce,Ie,Oe,Y,J;return d=l=h=_=p=m=x=y=b=0,f=g=1,i.svg=!!(e.getCTM&&yf(e)),c.translate&&((c.translate!=="none"||c.scale!=="none"||c.rotate!=="none")&&(n[ct]=(c.translate!=="none"?"translate3d("+(c.translate+" 0 0").split(" ").slice(0,3).join(", ")+") ":"")+(c.rotate!=="none"?"rotate("+c.rotate+") ":"")+(c.scale!=="none"?"scale("+c.scale.split(" ").join(",")+") ":"")+(c[ct]!=="none"?c[ct]:"")),n.scale=n.rotate=n.translate="none"),A=Bc(e,i.svg),i.svg&&(i.uncache?(V=e.getBBox(),u=i.xOrigin-V.x+"px "+(i.yOrigin-V.y)+"px",j=""):j=!t&&e.getAttribute("data-svg-origin"),ac(e,j||u,!!j||i.originIsAbsolute,i.smooth!==!1,A)),C=i.xOrigin||0,E=i.yOrigin||0,A!==Tr&&(S=A[0],H=A[1],F=A[2],P=A[3],d=B=A[4],l=O=A[5],A.length===6?(f=Math.sqrt(S*S+H*H),g=Math.sqrt(P*P+F*F),_=S||H?bs(H,S)*Vn:0,x=F||P?bs(F,P)*Vn+_:0,x&&(g*=Math.abs(Math.cos(x*Is))),i.svg&&(d-=C-(C*S+E*F),l-=E-(C*H+E*P))):(J=A[6],Oe=A[7],ee=A[8],ce=A[9],Ie=A[10],Y=A[11],d=A[12],l=A[13],h=A[14],L=bs(J,Ie),p=L*Vn,L&&(D=Math.cos(-L),v=Math.sin(-L),j=B*D+ee*v,V=O*D+ce*v,se=J*D+Ie*v,ee=B*-v+ee*D,ce=O*-v+ce*D,Ie=J*-v+Ie*D,Y=Oe*-v+Y*D,B=j,O=V,J=se),L=bs(-F,Ie),m=L*Vn,L&&(D=Math.cos(-L),v=Math.sin(-L),j=S*D-ee*v,V=H*D-ce*v,se=F*D-Ie*v,Y=P*v+Y*D,S=j,H=V,F=se),L=bs(H,S),_=L*Vn,L&&(D=Math.cos(L),v=Math.sin(L),j=S*D+H*v,V=B*D+O*v,H=H*D-S*v,O=O*D-B*v,S=j,B=V),p&&Math.abs(p)+Math.abs(_)>359.9&&(p=_=0,m=180-m),f=mt(Math.sqrt(S*S+H*H+F*F)),g=mt(Math.sqrt(O*O+J*J)),L=bs(B,O),x=Math.abs(L)>2e-4?L*Vn:0,b=Y?1/(Y<0?-Y:Y):0),i.svg&&(j=e.getAttribute("transform"),i.forceCSS=e.setAttribute("transform","")||!wf(ai(e,ct)),j&&e.setAttribute("transform",j))),Math.abs(x)>90&&Math.abs(x)<270&&(r?(f*=-1,x+=_<=0?180:-180,_+=_<=0?180:-180):(g*=-1,x+=x<=0?180:-180)),t=t||i.uncache,i.x=d-((i.xPercent=d&&(!t&&i.xPercent||(Math.round(e.offsetWidth/2)===Math.round(-d)?-50:0)))?e.offsetWidth*i.xPercent/100:0)+a,i.y=l-((i.yPercent=l&&(!t&&i.yPercent||(Math.round(e.offsetHeight/2)===Math.round(-l)?-50:0)))?e.offsetHeight*i.yPercent/100:0)+a,i.z=h+a,i.scaleX=mt(f),i.scaleY=mt(g),i.rotation=mt(_)+o,i.rotationX=mt(p)+o,i.rotationY=mt(m)+o,i.skewX=x+o,i.skewY=y+o,i.transformPerspective=b+a,(i.zOrigin=parseFloat(u.split(" ")[2])||!t&&i.zOrigin||0)&&(n[Zt]=Xa(u)),i.xOffset=i.yOffset=0,i.force3D=ci.force3D,i.renderTransform=i.svg?dw:vf?Sf:uw,i.uncache=0,i},Xa=function(e){return(e=e.split(" "))[0]+" "+e[1]},jo=function(e,t,i){var n=It(t);return mt(parseFloat(t)+parseFloat(Mn(e,"x",i+"px",n)))+n},uw=function(e,t){t.z="0px",t.rotationY=t.rotationX="0deg",t.force3D=0,Sf(e,t)},Fn="0deg",sr="0px",Bn=") ",Sf=function(e,t){var i=t||this,n=i.xPercent,r=i.yPercent,a=i.x,o=i.y,c=i.z,u=i.rotation,d=i.rotationY,l=i.rotationX,h=i.skewX,f=i.skewY,g=i.scaleX,_=i.scaleY,p=i.transformPerspective,m=i.force3D,x=i.target,y=i.zOrigin,b="",C=m==="auto"&&e&&e!==1||m===!0;if(y&&(l!==Fn||d!==Fn)){var E=parseFloat(d)*Is,A=Math.sin(E),L=Math.cos(E),D;E=parseFloat(l)*Is,D=Math.cos(E),a=jo(x,a,A*D*-y),o=jo(x,o,-Math.sin(E)*-y),c=jo(x,c,L*D*-y+y)}p!==sr&&(b+="perspective("+p+Bn),(n||r)&&(b+="translate("+n+"%, "+r+"%) "),(C||a!==sr||o!==sr||c!==sr)&&(b+=c!==sr||C?"translate3d("+a+", "+o+", "+c+") ":"translate("+a+", "+o+Bn),u!==Fn&&(b+="rotate("+u+Bn),d!==Fn&&(b+="rotateY("+d+Bn),l!==Fn&&(b+="rotateX("+l+Bn),(h!==Fn||f!==Fn)&&(b+="skew("+h+", "+f+Bn),(g!==1||_!==1)&&(b+="scale("+g+", "+_+Bn),x.style[ct]=b||"translate(0, 0)"},dw=function(e,t){var i=t||this,n=i.xPercent,r=i.yPercent,a=i.x,o=i.y,c=i.rotation,u=i.skewX,d=i.skewY,l=i.scaleX,h=i.scaleY,f=i.target,g=i.xOrigin,_=i.yOrigin,p=i.xOffset,m=i.yOffset,x=i.forceCSS,y=parseFloat(a),b=parseFloat(o),C,E,A,L,D;c=parseFloat(c),u=parseFloat(u),d=parseFloat(d),d&&(d=parseFloat(d),u+=d,c+=d),c||u?(c*=Is,u*=Is,C=Math.cos(c)*l,E=Math.sin(c)*l,A=Math.sin(c-u)*-h,L=Math.cos(c-u)*h,u&&(d*=Is,D=Math.tan(u-d),D=Math.sqrt(1+D*D),A*=D,L*=D,d&&(D=Math.tan(d),D=Math.sqrt(1+D*D),C*=D,E*=D)),C=mt(C),E=mt(E),A=mt(A),L=mt(L)):(C=l,L=h,E=A=0),(y&&!~(a+"").indexOf("px")||b&&!~(o+"").indexOf("px"))&&(y=Mn(f,"x",a,"px"),b=Mn(f,"y",o,"px")),(g||_||p||m)&&(y=mt(y+g-(g*C+_*A)+p),b=mt(b+_-(g*E+_*L)+m)),(n||r)&&(D=f.getBBox(),y=mt(y+n/100*D.width),b=mt(b+r/100*D.height)),D="matrix("+C+","+E+","+A+","+L+","+y+","+b+")",f.setAttribute("transform",D),x&&(f.style[ct]=D)},fw=function(e,t,i,n,r){var a=360,o=Et(r),c=parseFloat(r)*(o&&~r.indexOf("rad")?Vn:1),u=c-n,d=n+u+"deg",l,h;return o&&(l=r.split("_")[1],l==="short"&&(u%=a,u!==u%(a/2)&&(u+=u<0?a:-a)),l==="cw"&&u<0?u=(u+a*lu)%a-~~(u/a)*a:l==="ccw"&&u>0&&(u=(u-a*lu)%a-~~(u/a)*a)),e._pt=h=new Kt(e._pt,t,i,n,u,Kb),h.e=d,h.u="deg",e._props.push(i),h},mu=function(e,t){for(var i in t)e[i]=t[i];return e},pw=function(e,t,i){var n=mu({},i._gsap),r="perspective,force3D,transformOrigin,svgOrigin",a=i.style,o,c,u,d,l,h,f,g;n.svg?(u=i.getAttribute("transform"),i.setAttribute("transform",""),a[ct]=t,o=Ar(i,1),Sn(i,ct),i.setAttribute("transform",u)):(u=getComputedStyle(i)[ct],a[ct]=t,o=Ar(i,1),a[ct]=u);for(c in en)u=n[c],d=o[c],u!==d&&r.indexOf(c)<0&&(f=It(u),g=It(d),l=f!==g?Mn(i,c,u,g):parseFloat(u),h=parseFloat(d),e._pt=new Kt(e._pt,o,c,l,h-l,nc),e._pt.u=g||0,e._props.push(c));mu(o,n)};jt("padding,margin,Width,Radius",function(s,e){var t="Top",i="Right",n="Bottom",r="Left",a=(e<3?[t,i,n,r]:[t+r,t+i,n+i,n+r]).map(function(o){return e<2?s+o:"border"+o+s});qa[e>1?"border"+s:s]=function(o,c,u,d,l){var h,f;if(arguments.length<4)return h=a.map(function(g){return Vi(o,g,u)}),f=h.join(" "),f.split(h[0]).length===5?h[0]:f;h=(d+"").split(" "),f={},a.forEach(function(g,_){return f[g]=h[_]=h[_]||h[(_-1)/2|0]}),o.init(c,f,l)}});var Mf={name:"css",register:rc,targetTest:function(e){return e.style&&e.nodeType},init:function(e,t,i,n,r){var a=this._props,o=e.style,c=i.vars.startAt,u,d,l,h,f,g,_,p,m,x,y,b,C,E,A,L,D;Oc||rc(),this.styles=this.styles||_f(e),L=this.styles.props,this.tween=i;for(_ in t)if(_!=="autoRound"&&(d=t[_],!(ni[_]&&af(_,t,i,n,e,r)))){if(f=typeof d,g=qa[_],f==="function"&&(d=d.call(i,n,e,r),f=typeof d),f==="string"&&~d.indexOf("random(")&&(d=wr(d)),g)g(this,e,_,d,i)&&(A=1);else if(_.substr(0,2)==="--")u=(getComputedStyle(e).getPropertyValue(_)+"").trim(),d+="",xn.lastIndex=0,xn.test(u)||(p=It(u),m=It(d),m?p!==m&&(u=Mn(e,_,u,m)+m):p&&(d+=p)),this.add(o,"setProperty",u,d,n,r,0,0,_),a.push(_),L.push(_,0,o[_]);else if(f!=="undefined"){if(c&&_ in c?(u=typeof c[_]=="function"?c[_].call(i,n,e,r):c[_],Et(u)&&~u.indexOf("random(")&&(u=wr(u)),It(u+"")||u==="auto"||(u+=ci.units[_]||It(Vi(e,_))||""),(u+"").charAt(1)==="="&&(u=Vi(e,_))):u=Vi(e,_),h=parseFloat(u),x=f==="string"&&d.charAt(1)==="="&&d.substr(0,2),x&&(d=d.substr(2)),l=parseFloat(d),_ in Li&&(_==="autoAlpha"&&(h===1&&Vi(e,"visibility")==="hidden"&&l&&(h=0),L.push("visibility",0,o.visibility),gn(this,o,"visibility",h?"inherit":"hidden",l?"inherit":"hidden",!l)),_!=="scale"&&_!=="transform"&&(_=Li[_],~_.indexOf(",")&&(_=_.split(",")[0]))),y=_ in en,y){if(this.styles.save(_),D=d,f==="string"&&d.substring(0,6)==="var(--"){if(d=ai(e,d.substring(4,d.indexOf(")"))),d.substring(0,5)==="calc("){var v=e.style.perspective;e.style.perspective=d,d=ai(e,"perspective"),v?e.style.perspective=v:Sn(e,"perspective")}l=parseFloat(d)}if(b||(C=e._gsap,C.renderTransform&&!t.parseTransform||Ar(e,t.parseTransform),E=t.smoothOrigin!==!1&&C.smooth,b=this._pt=new Kt(this._pt,o,ct,0,1,C.renderTransform,C,0,-1),b.dep=1),_==="scale")this._pt=new Kt(this._pt,C,"scaleY",C.scaleY,(x?Ls(C.scaleY,x+l):l)-C.scaleY||0,nc),this._pt.u=0,a.push("scaleY",_),_+="X";else if(_==="transformOrigin"){L.push(Zt,0,o[Zt]),d=cw(d),C.svg?ac(e,d,0,E,0,this):(m=parseFloat(d.split(" ")[2])||0,m!==C.zOrigin&&gn(this,C,"zOrigin",C.zOrigin,m),gn(this,o,_,Xa(u),Xa(d)));continue}else if(_==="svgOrigin"){ac(e,d,1,E,0,this);continue}else if(_ in bf){fw(this,C,_,h,x?Ls(h,x+d):d);continue}else if(_==="smoothOrigin"){gn(this,C,"smooth",C.smooth,d);continue}else if(_==="force3D"){C[_]=d;continue}else if(_==="transform"){pw(this,d,e);continue}}else _ in o||(_=Ws(_)||_);if(y||(l||l===0)&&(h||h===0)&&!jb.test(d)&&_ in o)p=(u+"").substr((h+"").length),l||(l=0),m=It(d)||(_ in ci.units?ci.units[_]:p),p!==m&&(h=Mn(e,_,u,m)),this._pt=new Kt(this._pt,y?C:o,_,h,(x?Ls(h,x+l):l)-h,!y&&(m==="px"||_==="zIndex")&&t.autoRound!==!1?Jb:nc),this._pt.u=m||0,y&&D!==d?(this._pt.b=u,this._pt.e=D,this._pt.r=Qb):p!==m&&m!=="%"&&(this._pt.b=u,this._pt.r=Zb);else if(_ in o)lw.call(this,e,_,u,x?x+d:d);else if(_ in e)this.add(e,_,u||e[_],x?x+d:d,n,r);else if(_!=="parseTransform"){Ac(_,d);continue}y||(_ in o?L.push(_,0,o[_]):typeof e[_]=="function"?L.push(_,2,e[_]()):L.push(_,1,u||e[_])),a.push(_)}}A&&df(this)},render:function(e,t){if(t.tween._time||!Nc())for(var i=t._pt;i;)i.r(e,i.d),i=i._next;else t.styles.revert()},get:Vi,aliases:Li,getSetter:function(e,t,i){var n=Li[t];return n&&n.indexOf(",")<0&&(t=n),t in en&&t!==Zt&&(e._gsap.x||Vi(e,"x"))?i&&ou===i?t==="scale"?iw:tw:(ou=i||{})&&(t==="scale"?nw:sw):e.style&&!Sc(e.style[t])?$b:~t.indexOf("-")?ew:kc(e,t)},core:{_removeProperty:Sn,_getMatrix:Bc}};Qt.utils.checkPrefix=Ws;Qt.core.getStyleSaver=_f;(function(s,e,t,i){var n=jt(s+","+e+","+t,function(r){en[r]=1});jt(e,function(r){ci.units[r]="deg",bf[r]=1}),Li[n[13]]=s+","+e,jt(i,function(r){var a=r.split(":");Li[a[1]]=n[a[0]]})})("x,y,z,scale,scaleX,scaleY,xPercent,yPercent","rotation,rotationX,rotationY,skewX,skewY","transform,transformOrigin,svgOrigin,force3D,smoothOrigin,transformPerspective","0:translateX,1:translateY,2:translateZ,8:rotate,8:rotationZ,8:rotateZ,9:rotateX,10:rotateY");jt("x,y,z,top,right,bottom,left,width,height,fontSize,padding,margin,perspective",function(s){ci.units[s]="px"});Qt.registerPlugin(Mf);var qe=Qt.registerPlugin(Mf)||Qt;qe.core.Tween;const Ko=35,rr=6;class mw{camera;base=new z(0,0,rr);look=new z(0,0,0);applied=new z(0,0,rr);zoom=1;lastFov=Ko;reduced=!1;shakeAmp=0;shakeTime=0;tweens=new Set;constructor(e){this.camera=new gi(Ko,e,.1,100),this.camera.position.copy(this.base),this.camera.lookAt(this.look)}setReducedMotion(e){this.reduced=e,e&&(this.shakeAmp=0)}setAspect(e){this.camera.aspect=e,this.camera.updateProjectionMatrix()}distanceTo(e){return Math.abs(this.applied.z-e)}track(e){this.tweens.add(e),e.eventCallback("onComplete",()=>this.tweens.delete(e))}move(e,t,i){const n=this.reduced?Math.min(i,.4):Math.max(i,.001),r="power2.inOut",a=t&&t>0?t:1;switch(e){case"push":this.track(qe.to(this.base,{z:rr-1.1,duration:n,ease:r})),this.track(qe.to(this,{zoom:a>1?a:1.18,duration:n,ease:r}));break;case"pull":this.track(qe.to(this.base,{z:rr+.6,duration:n,ease:r})),this.track(qe.to(this,{zoom:a<1?a:.9,duration:n,ease:r}));break;case"pan-left":this.track(qe.to(this.base,{x:-.9,duration:n,ease:r})),a!==1&&this.track(qe.to(this,{zoom:a,duration:n,ease:r}));break;case"pan-right":this.track(qe.to(this.base,{x:.9,duration:n,ease:r})),a!==1&&this.track(qe.to(this,{zoom:a,duration:n,ease:r}));break;case"still":default:this.track(qe.to(this.base,{x:0,y:0,z:rr,duration:n,ease:r})),this.track(qe.to(this,{zoom:1,duration:n,ease:r}));break}}shake(e,t){this.reduced||(this.shakeAmp=Math.max(this.shakeAmp,.06+e*.18),this.shakeTime=0)}update(e,t){let i=0,n=0,r=0;this.reduced||(i=Math.sin(t*.13)*.08+Math.sin(t*.07+1.3)*.05,n=Math.cos(t*.11)*.05+Math.sin(t*.05+.6)*.03,r=Math.sin(t*.05)*.06);let a=0,o=0;this.shakeAmp>5e-4?(this.shakeTime+=e,a=Math.sin(this.shakeTime*57)*this.shakeAmp,o=Math.sin(this.shakeTime*63.3+2.1)*this.shakeAmp,this.shakeAmp*=Math.exp(-e*7)):this.shakeAmp=0,this.applied.set(this.base.x+i+a,this.base.y+n+o,this.base.z+r),this.camera.position.copy(this.applied),this.camera.lookAt(this.look);const c=Ko/Math.max(this.zoom,.05);Math.abs(c-this.lastFov)>1e-4&&(this.camera.fov=c,this.camera.updateProjectionMatrix(),this.lastFov=c)}get panX(){return this.applied.x}get panY(){return this.applied.y}dispose(){for(const e of this.tweens)e.kill();this.tweens.clear(),qe.killTweensOf(this.base),qe.killTweensOf(this)}}class gw{mesh;geometry;material;base=new z;depth=0;parallax=0;phase=0;constructor(){this.geometry=new bn(1,1),this.material=new Lr({transparent:!1,depthTest:!0,depthWrite:!0,toneMapped:!0,color:16777215}),this.mesh=new zt(this.geometry,this.material),this.mesh.frustumCulled=!1,this.mesh.renderOrder=0}setTexture(e){this.material.map=e,this.material.needsUpdate=!0,this.mesh.visible=e!==null}configure(e){this.base.set(e.offsetX??0,e.offsetY??0,e.z),this.depth=e.depth,this.parallax=e.parallax,this.phase=e.phase,this.mesh.scale.set(e.width,e.height,1),this.mesh.position.copy(this.base),this.mesh.renderOrder=Math.round(e.depth*8)}update(e,t,i,n){const r=this.parallax*(.25+this.depth*.9),a=n?0:Math.sin(e*.05+this.phase)*.03*(.4+this.depth*.6),o=n?0:Math.cos(e*.04+this.phase*1.7)*.02*(.4+this.depth*.6);this.mesh.position.set(this.base.x-t*r+a,this.base.y-i*r*.6+o,this.base.z)}dispose(){this.geometry.dispose(),this.material.dispose()}}const _w=2654435761;function vw(s){let e=s>>>0;return()=>{e|=0,e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}function xw(s){let e=(s+1)*2654435761;return e^=e>>>15,e=Math.imul(e,2246822507),e^=e>>>13,(e>>>0)/4294967296}const Tf=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,Af=`
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
/**
 * hash13 — Dave Hoskins' sin-free 3->1 hash. Unlike the fract(p.x * p.y) form
 * above it stays well-distributed at large integer coordinates, which is exactly
 * where a screen-space grain field lives (0…1920). The older hash visibly
 * *repeats* across a 1080p frame: on flat darks it resolves into a dot lattice
 * that reads as dithering, so grain must never be built on it.
 */
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
`,yw=`
varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform vec2  uResolution;
uniform float uTime;
uniform vec3  uLift;
uniform vec3  uGamma;
uniform vec3  uGain;
uniform float uContrast;
uniform float uSaturation;
uniform float uSplitTone;
uniform float uVignette;
uniform float uGrain;
uniform float uGrainSize;
uniform float uAberration;
uniform float uFlash;
uniform float uGlitch;
/** Focal plane, in frame coordinates: centre.xy, half-extents.zw (0..1). */
uniform vec4  uFocus;
/** Peak defocus radius at the far edge of the frame, in UV. 0 retires the pass. */
uniform float uFieldBlur;
/** Shadow-family unifier — how hard an ungraded dark region is pulled toward
 *  the room's own teal. 0 leaves the plate's own shadow hue alone. */
uniform float uShadowBridge;
/** Midtone-weighted exposure, per plate. See the call site — this is the print
 *  exposure of the frame, not a lift: it cannot move a black or a specular. */
uniform float uMidLift;

${Af}

/**
 * Highlight shoulder. Untouched below SHOULDER_K, asymptotic to SHOULDER_W —
 * a classic print shoulder rather than a clip. See the call site for why the
 * desk practical needed one.
 *
 * SHOULDER_W 0.55 → 0.92, and this is the single number behind the "reads a
 * stop underexposed under a flat dark overlay" note. An asymptote at 0.55
 * linear prints, through the ACES fit and the sRGB encode downstream, at about
 * 170/255 — so nothing in the picture, not the lamp's own shade, not the relay
 * screen, not the brightest disc of city bokeh, could ever reach a highlight
 * value. A frame whose ceiling is a middle grey has no contrast range left to
 * spend, and no amount of work in the shadows can give it one back. At 0.92 the
 * practicals reach ~230 and the frame finally has a top to its scale; the knee
 * comes up with it (0.20 → 0.27) so the midtones the shoulder used to start
 * eating at are simply not billed at all.
 */
const float SHOULDER_K = 0.27;
const float SHOULDER_W = 0.92;

void main() {
  vec2 uv = vUv;
  vec2 centered = uv - 0.5;
  float r2 = dot(centered, centered);

  // Glitch horizontal band jitter.
  float band = 0.0;
  if (uGlitch > 0.0001) {
    float line = floor(uv.y * 160.0);
    float j = (hash21(vec2(line, floor(uTime * 30.0))) - 0.5);
    band = step(0.7, hash21(vec2(line, floor(uTime * 12.0)))) * j * 0.06 * uGlitch;
    uv.x += band;
  }

  // Chromatic aberration — grows toward the frame edges.
  float ca = (uAberration + uGlitch * 0.6) * (0.15 + r2 * 1.2);
  vec2 dir = normalize(centered + 1e-5);
  vec3 color;
  color.r = texture2D(tDiffuse, uv - dir * ca).r;
  color.g = texture2D(tDiffuse, uv).g;
  color.b = texture2D(tDiffuse, uv + dir * ca).b;

  /* ── The lens ─────────────────────────────────────────────────────────────
   *
   * A real depth of field. BokehPass upstream is stopped almost all the way
   * down and has to be (its depth pass is alpha-blind — see postfx.ts), so the
   * frame arrives here with EVERYTHING at one sharpness: a desk vignette two
   * feet from the lens and a city half a mile behind it, rendered identically.
   * That is not a subtle failure. It is what makes a painted plate read as an
   * upscale rather than as a photograph, because the one thing no upscaler can
   * fake and no lens can avoid is that focus falls off with distance.
   *
   * Depth here is not available and does not need to be: this frame's depth is
   * a COMPOSITION, and the composition is declared per plate (Stage →
   * PLATE_FOCUS). One soft ellipse around the thing the camera is focused on;
   * everything outside it is progressively resolved away, on a curve that is
   * flat across the subject and only bites once it is clear of it.
   *
   * Six taps on a rotated hexagon plus the centre — a hexagonal iris, which is
   * what a real fast prime gives a point source, and cheaper than the ring a
   * circular one would need. The radius is squared into the falloff so the
   * near midground gets a whisper and the far background gets the lot.
   */
  if (uFieldBlur > 0.0001) {
    vec2 fd = (vUv - uFocus.xy) / max(uFocus.zw, vec2(1e-4));
    float coc = smoothstep(0.85, 2.30, length(fd));
    coc *= coc;
    float rad = uFieldBlur * coc;
    if (rad > 0.0002) {
      vec3 acc = color;
      // Two hexagons, one at half radius, so the falloff inside the disc is
      // smooth rather than a ring of six ghosts around every highlight.
      for (int i = 0; i < 6; i++) {
        float th = float(i) * 1.0471976 + 0.3926991;
        vec2 o = vec2(cos(th), sin(th));
        o.y *= uResolution.x / max(uResolution.y, 1.0);
        acc += texture2D(tDiffuse, vUv + o * rad).rgb;
        acc += texture2D(tDiffuse, vUv + o * rad * 0.5).rgb;
      }
      color = mix(color, acc / 13.0, clamp(coc, 0.0, 1.0));
    }
  }

  // Lift / gamma / gain.
  color = color * uGain + uLift;
  color = max(color, 0.0);
  color = pow(color, 1.0 / max(uGamma, vec3(0.001)));

  // Contrast about a linear-ish pivot.
  color = (color - 0.18) * uContrast + 0.18;
  color = max(color, 0.0);

  /* ── Print exposure ───────────────────────────────────────────────────────
   *
   * The frame prints a stop and a half down. Not in the shadows — the black
   * floor below is deliberate and correct — and not in the highlights, which the
   * shoulder above is already holding off the ceiling. It is the BAND BETWEEN
   * them: the desk's front face, the partition, the chair, the wall above the
   * lamp, the shadow side of a face. All of it sits within a few code values of
   * the black it is supposed to be separating from, so at a glance the picture
   * is a lamp, a face and a rectangle of nothing, and at thumbnail scale it is a
   * lamp and a rectangle of nothing.
   *
   * Neither lift, gamma nor gain can fix that without costing one of the two
   * ends. Lift raises the floor (a milky black is the composited-plate tell this
   * whole stack exists to avoid); gain scales the highlights into the shoulder;
   * gamma does both, gently, everywhere. What the note actually asks for is a
   * colourist's midtone window, so that is what this is: a multiplicative gain
   * inside a luminance window that opens off the toe and has closed again before
   * the practicals.
   *
   *   • it is ZERO at black by construction (the lower smoothstep), so the floor
   *     that the vignette and the emulsion both depend on cannot move;
   *   • it has CLOSED AGAIN by 0.46 linear, well under the lit desk and well
   *     under a lit cheek, so neither the practicals nor the subject's own key
   *     are billed twice and the highlight shoulder above keeps its job;
   *   • it is a GAIN, not an add — light scales what a surface reflects, and an
   *     additive term in this band would flatten the very separation it is meant
   *     to be buying.
   *
   * The window's upper edge is the number that matters and it was wrong first
   * time. Rolling off between 0.42 and 0.92 sounds like "midtones" and is not:
   * a lit forearm sits around 0.35 linear here, so a half-stop window that is
   * still at full strength there put a stop and a half onto the brightest skin
   * plane on the plate — through the bloom gate — and printed a blown wrist.
   * 0.11 → 0.46 is the actual band the note is about: the desk's front face, the
   * partition, the chair, the wall, the shadow side of a jaw. Everything already
   * carrying light keeps what it had.
   *
   * At uMidLift 0.45 that is +0.54 stop through that band, +9% on a lit forearm
   * and nothing at all on a practical. It is per-plate (see Stage →
   * PLATE_FOCUS): a daylit reading room, whose failure mode is the opposite one,
   * takes none of it. */
  if (uMidLift > 0.0001) {
    float mL = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float mw = smoothstep(0.0035, 0.022, mL) * (1.0 - smoothstep(0.11, 0.46, mL));
    color *= 1.0 + uMidLift * mw;
  }

  // Highlight shoulder. The desk practical was printing its paper as a flat
  // near-white slab — a large area pinned near the top of the range with almost
  // no separation left inside it, which reads as a blown JPEG rather than as
  // lit paper. This takes roughly a stop off the top and hands the falloff its
  // gradient back. Two disciplines matter:
  //   • it is applied as a RATIO across all three channels, never per-channel.
  //     A per-channel knee compresses whichever channel is highest, so it walks
  //     a tungsten highlight toward white — precisely the opposite of what a
  //     warm practical does as it falls off;
  //   • what it pulls down it also warms, by the amount it pulled, so the paper
  //     runs amber-into-shadow instead of grey-into-shadow.
  float sL = dot(color, vec3(0.2126, 0.7152, 0.0722));
  if (sL > SHOULDER_K) {
    float rolled = SHOULDER_K + (SHOULDER_W - SHOULDER_K) *
      (1.0 - exp(-(sL - SHOULDER_K) / (SHOULDER_W - SHOULDER_K)));
    float k = rolled / max(sL, 1e-4);
    color *= k;
    color *= mix(vec3(1.0), vec3(1.05, 0.995, 0.90), clamp(1.0 - k, 0.0, 1.0));
  }

  /* ── The unifying pass: one ground under both halves ──────────────────────
   *
   * The frame is built from two asset pipelines and it showed. The left third is
   * an illustration — a desk, a shaded lamp, a mug, a headset, all of it painted,
   * every surface carrying a brush-scale mottle. The right third is a
   * photographic portrait plate. The plate already gets a painterly tooth of its
   * own in its material (see SPRITE_DIFFUSE_PATCH → uCanvas) and that closes the
   * gap from ONE side: it makes the photograph less smooth. It cannot make the
   * two halves share a surface, because the two tooths are generated in two
   * different spaces at two different frequencies by two different programs, and
   * "both are textured" is not the same claim as "both are the same painting".
   *
   * This is the same claim. One field, in SCREEN space, over the whole composited
   * frame — plate, room, props and the bloom that ties them together — so every
   * pixel in the picture sits on one ground at one brush frequency. It is the
   * paper the whole thing is printed on.
   *
   * Three properties earn it and each one is a decision:
   *   • it is STATIC. The emulsion below re-hashes every 16th of a second because
   *     grain is a property of the camera; a canvas tooth is a property of the
   *     SURFACE and must not crawl. A crawling tooth is the single fastest way to
   *     turn this from paper into video noise;
   *   • it is CHROMATIC, unlike the emulsion, which is deliberately achromatic.
   *     Pigment on a tooth breaks colour as well as value — the low spots hold
   *     more of it — and the tiny per-channel decorrelation here is what makes the
   *     photographic half stop reading as *cleaner* rather than merely *flatter*
   *     than the painted half;
   *   • it is TWO OCTAVES at a brush scale — ~17px and ~6px per cell at 1920,
   *     matched to the frequencies the plate's own tooth already runs at, and
   *     three to eight times coarser than the 2.2px emulsion, so the two fields
   *     can never be mistaken for one another or beat against each other.
   *
   * Ceiling ~1.9% value and ~0.7% chroma at the default grain mix. It must be
   * felt at 100% and invisible at a glance, exactly like the tooth of a paper.
   * Scaled by the grain setting so one slider still retires the whole emulsion
   * stack, and it runs BEFORE saturation and the split-tone so the tint sits on
   * top of the ground the way ink does rather than beside it. */
  float tAmt = clamp(uGrain, 0.0, 1.0);
  vec2 tUv = vUv * uResolution / max(uResolution.y, 1.0);
  float tCoarse = vnoise(tUv * 64.0);
  float tFine = vnoise(tUv * 190.0);
  float tooth = (tCoarse - 0.5) * 0.62 + (tFine - 0.5) * 0.38;
  // Per-channel offsets are a fraction of a cell, so the three fields are the
  // SAME tooth sampled a hair apart — pigment settling — never three noises.
  vec3 toothRGB = vec3(
    vnoise(tUv * 64.0 + vec2(0.21, 0.0)),
    tCoarse,
    vnoise(tUv * 64.0 + vec2(0.0, 0.24))
  ) - 0.5;
  color *= 1.0 + tooth * 0.038 * tAmt;
  /* 0.014 → 0.009. "Keep the chroma clean" is the second half of the grain note
   * and this is the only chromatic noise term in the pipeline — the emulsion
   * below is luminance-only by construction and the DOM plate is desaturated in
   * its own filter. The argument for a chromatic tooth stands (pigment settling
   * on a tooth breaks colour as well as value, and it is what stops the
   * photographic half reading as *cleaner* than the painted half), so it is
   * trimmed rather than retired: at 0.9% it still decorrelates the three
   * channels on a lit plane and it no longer puts findable colour speckle into
   * the near-blacks, where two thirds of this frame lives. */
  color *= 1.0 + toothRGB * 0.009 * tAmt;

  // Saturation.
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luma), color, uSaturation);

  // Teal ↔ orange split-tone, weighted by luminance.
  vec3 shadowTint = vec3(0.06, 0.34, 0.44);
  vec3 highTint   = vec3(0.98, 0.62, 0.30);
  vec3 split = mix(shadowTint, highTint, smoothstep(0.0, 0.9, luma));
  color = mix(color, color * (0.55 + 0.9 * split), clamp(uSplitTone, 0.0, 1.0) * 0.55);

  /* ── The window side, cooled ──────────────────────────────────────────────
   *
   * The shadow bridge below unifies the DARKS and the split-tone bends whatever
   * already has chroma. Between the two of them sits the band this frame keeps
   * losing: the low midtones of the window wall — the glazing bars, the far
   * bench, the wet floor under the glass, the chair's own mass. The plate paints
   * them a warm-neutral, the split-tone reads them as "not dark enough to be
   * shadow, not bright enough to be highlight" and hands them the middle of its
   * ramp, and the middle of a teal↔amber ramp is OLIVE. Half the picture then
   * drifts yellow-green against a window that is unambiguously teal, which is a
   * palette-incoherence read the rubric fails outright.
   *
   * So the window side is given the window's own hue, on exactly the terms the
   * shadow bridge is given it: the mix target is LUMINANCE × the pane teal,
   * divided by its own luma, i.e. value-preserving by construction — it moves the
   * hue of the band and never its exposure. Ramped in x so the lamp's own third
   * is untouched (the room really does have two colour temperatures in it and
   * that is the point of the shot), and windowed in luminance so it starts above
   * the bridge's band and has closed again well under the practicals.
   */
  {
    float wSide = smoothstep(0.40, 0.70, vUv.x);
    float wLum  = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float wBand = smoothstep(0.006, 0.030, wLum) * (1.0 - smoothstep(0.10, 0.34, wLum));
    // Peak-normalised pane steel, ÷ its own luma (0.849).
    vec3 wHue = vec3(0.56, 0.92, 1.00) * 1.177;
    color = mix(color, vec3(wLum) * wHue, 0.30 * wSide * wBand);
  }

  /* ── The shadow family ────────────────────────────────────────────────────
   *
   * Between the warm desk pool and the teal city there is a band of floor and
   * partition that belongs to NEITHER — the plate painted it a murky
   * yellow-green, the split-tone above cannot reach it (a multiply by a tint
   * only bends a colour that already has chroma in the right place), and a
   * region that is outside the grade is the fastest palette-incoherence read a
   * frame can offer. It is the "mid-frame mush" note, and it is a colour note
   * rather than a detail one.
   *
   * So the darks are given one family. The mix target is LUMINANCE × the room's
   * own teal, peak-normalised and then divided by its own luma, which makes the
   * operation exactly value-preserving: it moves the hue of a shadow toward the
   * window and never its exposure. Weighted to bite hardest between the black
   * floor and the low midtones — the band the murk actually lives in — and to
   * be gone by the time it would reach the lamp pool.
   */
  if (uShadowBridge > 0.0001) {
    float sb = dot(color, vec3(0.2126, 0.7152, 0.0722));
    // Peak-normalised #7db4c8 pushed a step cooler, ÷ its own luma (0.834).
    vec3 shadowFamily = vec3(0.50, 0.90, 1.00) * 1.199;
    float w = smoothstep(0.0012, 0.010, sb) * (1.0 - smoothstep(0.030, 0.130, sb));
    color = mix(color, vec3(sb) * shadowFamily, clamp(uShadowBridge, 0.0, 1.0) * w);
  }

  // Vignette. Deliberately a LONG, shallow falloff: the old curve reached its
  // floor before the corner and stamped the frame with a near-black ring, which
  // over an already dark plate reads as muddy crush rather than as a lens. The
  // radius now starts outside the safe area, the shoulder is gentle, and the
  // applied strength is capped so window mullions and the desk silhouette stay
  // barely readable in the corners instead of disappearing.
  float vAmt = min(clamp(uVignette, 0.0, 1.0), 0.55);
  float vig = smoothstep(1.30, 0.30, r2 * (1.0 + vAmt * 1.6));
  color *= 1.0 - vAmt * (1.0 - vig);

  // Frame-right exit guard.
  //
  // A radial vignette is weakest exactly where a 16:9 frame leaks hardest: the
  // middle of the short edges, where r2 is smallest for a given distance from
  // centre. On the ops plate that band holds a cluster of city bokeh a few
  // pixels off the right edge, and it was the brightest thing outboard of the
  // speaker — an object with nowhere to go, dragging the eye off the picture
  // at the one place the composition has nothing to say. So the outer tenth of
  // the frame carries its own long falloff, independent of the radius. 192px at
  // 1920, ramped on a smoothstep, ~-0.6 stop at the extreme edge: a colourist's
  // edge window, not a mask — the mullions and the desk silhouette are still
  // legible inside it.
  //
  // 0.40 → 0.18, and the ramp starts 60px later. The window was drawn against a
  // composition whose problem was a cluster of bokeh leaking off the right edge;
  // the composition has since been given a second mullion, a lit far bench and
  // a floor out there, and against THAT the same window is no longer a
  // colourist's edge — it is the reason the outboard third reads as an
  // undifferentiated hole. A sixth of a stop at the extreme edge still stops the
  // eye walking out of frame; four tenths deletes the counterweight.
  color *= 1.0 - 0.18 * smoothstep(0.93, 1.0, vUv.x);

  // Black floor. Crushing to pure 0 turns whole regions into a void that reads
  // as "missing render" rather than "night", and — worse in a STILL — a region
  // pinned within two code values of zero has no room left for the dither that
  // stops a 400px gradient banding across it.
  //
  // Lifted ~40% (0.0105 → 0.0148 linear), which is about +3.5% at the output
  // after three's ACES fit and the sRGB encode: the deepest black in frame now
  // lands near #12 rather than near #0a. That figure is chosen against the
  // vignette, which is applied immediately above this line and takes ~28% out
  // of the bottom corners — so the corners were reaching the floor and staying
  // there, and the floor is the only thing that can give them back a value.
  // Applied AFTER the vignette on purpose, for exactly that reason.
  //
  // Deliberately NEUTRAL: the previous floor was blue enough that anywhere the
  // vignette bit went cyan-muddy rather than simply dark. White is untouched.
  const vec3 BLACK_FLOOR = vec3(0.0148, 0.0150, 0.0139);
  /* …and the OUTBOARD FLOOR gets a second one on top of it.
   *
   * Two operators bite hardest in the same corner — the radial vignette, and the
   * frame-right exit guard immediately above — and they compound: the bottom
   * right of this frame is the one region where the picture reaches the floor and
   * simply stays there, so roughly a fifth of the canvas prints as a single
   * undifferentiated value. That is not a vignette, it is a hole, and the
   * difference between the two is entirely whether the eye can find a plane
   * inside the darkness.
   *
   * ~4 code values at the output, ramped over half the frame in x and most of it
   * in y so there is no boundary anywhere to be seen, and struck a hair COOL
   * (unlike the neutral floor below it) because what is dark out there is a wet
   * floor under a wall of city glass — the same emitter the whole right half is
   * lit by. Applied with the floor rather than as a lift, so it cannot touch a
   * midtone and cannot move a highlight by a thousandth. */
  float fEdge = smoothstep(0.60, 0.94, vUv.x) * (1.0 - smoothstep(0.08, 0.60, vUv.y));
  vec3 floorHere = BLACK_FLOOR + vec3(0.0030, 0.0038, 0.0044) * fEdge;
  color = floorHere + color * (1.0 - floorHere);

  // Film grain. Six disciplines keep it emulsion and not a screen door:
  //   • the field is hashed per grain CELL straight off gl_FragCoord — no value
  //     -noise lattice, no interpolation, no texture — so it cannot tile;
  //   • hash13 (sin-free, well distributed at 4-digit coordinates) replaces the
  //     old fract(p.x*p.y) hash, which resolved into a visible dot grid on flats;
  //   • the cell lattice is OFFSET BY A RANDOM AMOUNT EVERY STEP, so the grain
  //     never locks to the pixel grid twice running. A fixed lattice at a fine
  //     cell size is precisely what reads as a fixed fine grid / screen door,
  //     however well distributed the hash inside it is;
  //   • it is high-passed against a 3× coarser field, killing the low-frequency
  //     clumping that reads as blotch and leaving a blue-noise-ish sparkle;
  //   • it is ACHROMATIC (luminance-only) and applied MULTIPLICATIVELY. A
  //     linear-space *additive* grain explodes in the toe once sRGB encoding
  //     stretches it; a relative modulation survives the transfer curve at
  //     near-constant perceived strength. The coefficient is set so the DEFAULT
  //     mix (0.5 setting × 0.5 theme) peaks around 2% and a maxed-out slider
  //     still stays inside ~9% — the old 0.55 reached ±40% and gridded the frame;
  //   • it is rolled off in the highlights so a practical never picks up crawl,
  //     but it is NOT switched off in the toe. Killing it below ~2% luma left
  //     the lit desk pool grained and the entire dark two-thirds of the frame
  //     plastic-clean — two emulsions in one shot, which is exactly the "the
  //     photographic region and the soft bokeh are different renderers" read
  //     the grade exists to erase. The blacks keep a third of the field, and a
  //     small ADDITIVE term carries it where a multiplicative one cannot (near
  //     zero there is nothing to modulate), doubling as dither in the long
  //     falloffs.
  float gLum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  /* The highlight roll, and it is now the term that carries the face.
   *
   * 0.55 over 0.25→1.2 was written as a guard against a practical picking up
   * crawl, and against a practical it works: a lamp shade at 0.8 linear loses
   * half its grain. The band it never reached is the one the note is about. A
   * lit cheek and a forehead plane sit between 0.30 and 0.50 linear, where the
   * old smoothstep had barely opened — under 10% off — so the two largest
   * SMOOTH, CONTINUOUSLY-MODELLED surfaces in the frame were carrying nearly the
   * full emulsion. Grain on a gradient that shallow does not read as film; it
   * reads as an 8-bit source, because the modulation is larger than the step
   * between the values it is modulating and the plane visibly quantises.
   * 0.70 over 0.14→0.72 pulls roughly a third out of exactly that band (−21% at
   * 0.35, −38% at 0.45) and leaves the deep midtones — the wool, the collar, the
   * shadow side of the jaw, the desk's front face — inside 2% of where they
   * were, which is where the frame's filmic weight actually lives. */
  float gw = 1.0 - 0.70 * smoothstep(0.14, 0.72, gLum);      // roll off in highlights
  // …and eased into the toe. The floor comes 0.34 → 0.24: the note is that the
  // grain in the deep shadows reads as NOISE masking unfinished area rather than
  // as emulsion, and a deep shadow is precisely where a real stock has the least
  // silver to scatter. Roughly a third off the blacks; the midtone term below
  // comes up by a ninth to keep the frame's filmic weight where it belongs.
  gw *= 0.24 + 0.76 * smoothstep(0.0020, 0.0185, gLum);
  float gToe = 1.0 - smoothstep(0.004, 0.045, gLum);          // 1 in the blacks, 0 by mid
  // Bottom-right weighting. Not a second emulsion and not a quadrant with an
  // edge: one very long, very soft ramp over the corner where BOTH deep-shadow
  // problems live at once — the vignette is deepest there and the dialogue
  // scrim's 400px ramp lands on top of it, which is precisely the surface an
  // 8-bit display bands on. Grain is the dither that kills that, so it is
  // strongest exactly where the gradient is longest and the values are lowest.
  // The ramps are half a frame wide, so there is no boundary anywhere for the
  // eye to find; vUv.y is 0 at the bottom of the frame.
  float gCorner = smoothstep(0.40, 0.95, vUv.x) * (1.0 - smoothstep(0.06, 0.56, vUv.y));
  // 0.8 → 0.5. Same note as the toe floor above, one axis over: the corner
  // weighting was authored as dither for the longest gradient in the game and it
  // lands on the darkest region of the frame, so the two boosts compounded and
  // the bottom-right read as noise over an unfinished area. Half the boost still
  // covers the scrim's ramp — which has also just been shortened and neutralised
  // (see --pq-scrim-foot) — without being visible as a quadrant of sparkle.
  float gq = uGrain * (1.0 + 0.5 * gCorner);
  float gt = floor(uTime * 16.0);
  vec2 gjit = vec2(hash13(vec3(gt, 3.7, 11.3)), hash13(vec3(gt, 91.1, 5.9))) * 512.0;
  /* The lattice is ROTATED before it is quantised, and this one line is the fix
   * for the "horizontal banding / scanline" note.
   *
   * A floor(p / cell) builds an AXIS-ALIGNED grid. However well distributed the
   * hash inside each cell is, the cell BOUNDARIES all lie on two families of
   * perfectly horizontal and vertical lines — and when the pitch is a small
   * non-integer number of device pixels those boundaries beat against the raster
   * and print as a regular ripple across every flat in the frame. The per-step
   * jitter above translates the grid; it never rotates it, so it cannot help: a
   * translated horizontal line is still a horizontal line. Read on a still, that
   * ripple is indistinguishable from macro-blocking, which is exactly the read
   * that came back ("reads as compression, not film").
   * A 31.7° rotation (an angle with no small rational relationship to the pixel
   * grid, the same trick a halftone screen uses for the identical reason) puts
   * every cell boundary at an irrational slope, so no run of cells can ever line
   * up into a row. It costs four multiplies and it is the difference between an
   * emulsion and a screen door. */
  mat2 GROT = mat2(0.8508, -0.5255, 0.5255, 0.8508);
  vec2 gcell = floor((GROT * (gl_FragCoord.xy + gjit)) / max(uGrainSize, 0.5));
  float gFine = hash13(vec3(gcell, gt));
  float gCoarse = hash13(vec3(floor(gcell * 0.3333), gt + 19.0));
  float g = (gFine - 0.5) - (gCoarse - 0.5) * 0.5;
  // 0.185 → 0.212. The DOM emulsion above the render has just been paid down by
  // a third (see .pq-plate), because a source-over grey field lifts blacks and
  // this one does not — it is a relative modulation. Same total grain in the
  // finished frame, redistributed onto the term that costs the toe nothing.
  // 0.212 → 0.236. The two operators above take about a third out of the deep
  // shadows; this puts an eighth back into the MIDTONES, which is where the note
  // says the filmic feel has to survive — and, crucially, where the composited
  // portrait lives. Her lit cheek, her forearm and the collar are the only large
  // midtone surfaces in the frame, and they were the region reading as pasted
  // from a cleaner source.
  color *= 1.0 + g * gq * 0.236 * gw;
  // The additive term is the one that actually dithers near zero (there is
  // nothing to modulate down there), so it carries the corner weighting hardest.
  // 0.0038 → 0.0025 on the toe term, for the third time and the same reason:
  // this is the ONLY grain that survives near zero, so it is also the whole of
  // what "grain in the deep shadows" means. A third off. The 0.0008 base is
  // untouched — it is the dither the long falloffs need and it is inaudible.
  color += g * gq * (0.0008 + 0.0025 * gToe) * (1.0 + 0.5 * gCorner);

  // Glitch scanline darkening.
  if (uGlitch > 0.0001) {
    float sl = sin(vUv.y * uResolution.y * 1.4) * 0.5 + 0.5;
    color *= mix(1.0, 0.82 + 0.18 * sl, uGlitch * 0.5);
  }

  // Flash to white.
  color = mix(color, vec3(1.0), clamp(uFlash, 0.0, 1.0));

  gl_FragColor = vec4(max(color, 0.0), 1.0);
}
`,bw=`
varying vec2 vUv;
uniform sampler2D tDiffuse;   // incoming (live) scene
uniform sampler2D tPrev;      // frozen outgoing snapshot
uniform float uProgress;      // 0 → prev, 1 → next
uniform float uActive;        // 0 idle (passthrough), 1 transitioning
uniform float uKind;          // 0 dissolve, 1 crossfade, 2 iris, 3 light-bleed
uniform float uTime;
uniform vec2  uResolution;
uniform vec3  uKey;           // theme key color for edge glow

${Af}

void main() {
  vec3 next = texture2D(tDiffuse, vUv).rgb;
  if (uActive < 0.5) {
    gl_FragColor = vec4(next, 1.0);
    return;
  }
  vec3 prev = texture2D(tPrev, vUv).rgb;
  float p = clamp(uProgress, 0.0, 1.0);
  vec3 col;

  if (uKind < 0.5) {
    // Dissolve — animated noise threshold with a glowing wavefront.
    float n = vnoise(vUv * 7.0) * 0.6 + vnoise(vUv * 23.0) * 0.4;
    float w = 0.12;
    float e = smoothstep(p - w, p + w, n);
    col = mix(next, prev, e);
    float edge = (1.0 - abs(n - p) / w);
    edge = clamp(edge, 0.0, 1.0);
    col += uKey * edge * 0.6 * smoothstep(0.0, 0.15, p) * smoothstep(1.0, 0.85, p);
  } else if (uKind < 1.5) {
    // Crossfade.
    col = mix(prev, next, smoothstep(0.0, 1.0, p));
  } else if (uKind < 2.5) {
    // Iris — soft circular reveal from the center.
    vec2 c = vUv - 0.5;
    c.x *= uResolution.x / max(uResolution.y, 1.0);
    float d = length(c);
    float radius = p * 1.15;
    float m = smoothstep(radius + 0.06, radius - 0.06, d);
    col = mix(prev, next, m);
    float ring = clamp(1.0 - abs(d - radius) / 0.05, 0.0, 1.0);
    col += uKey * ring * 0.5;
  } else {
    // Light-bleed — signature chapter/scene break: bloom to white, reveal.
    float b = sin(p * 3.14159265);
    float wipe = smoothstep(p - 0.25, p + 0.25, vUv.x);
    vec3 base = mix(prev, next, mix(smoothstep(0.0, 1.0, p), wipe, 0.4));
    col = mix(base, vec3(1.0), b * 0.92);
  }

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`,ww=`
uniform float uBright;
uniform float uDesat;
uniform float uTintAmt;
uniform vec3  uTint;
uniform float uPlateDesat;
uniform float uPlateSplit;
uniform float uPlateCool;
uniform float uEnvTint;
uniform float uCanvas;
uniform float uPaint;
uniform float uBrush;
uniform float uMidGain;
uniform float uPlateSoft;

/** Cheap 2->1 hash + smoothed value noise, local to the sprite program. The
 *  stage's shared GLSL_NOISE is only injected into the post passes; a plate
 *  needs its own because the tooth below is sampled in TEXTURE space, not in
 *  screen space (see the uCanvas note). */
float pqPlateHash(vec2 p) {
  p = fract(p * vec2(127.13, 311.7));
  p += dot(p, p + 42.21);
  return fract(p.x * p.y);
}
float pqPlateNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(pqPlateHash(i), pqPlateHash(i + vec2(1.0, 0.0)), u.x),
    mix(pqPlateHash(i + vec2(0.0, 1.0)), pqPlateHash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
`,Sw=`
#include <map_fragment>
/* ── The brush, and the only note colour could never answer ─────────────────
 *
 * Everything below this block is a COLOUR operation: desaturate the plate,
 * split-tone it, cool its speculars, lay the room's ambient over it. All of it
 * is correct and none of it touches the actual complaint, which is that the
 * desk still-life is PAINTED — surfaces described in strokes, detail resolved
 * only as far as a brush resolves it — and the portrait is PHOTOGRAPHED, with
 * pore-level micro-detail and a sensor's isotropic noise. Two renderers in one
 * image. The eye finds the smooth, over-resolved object and files the frame as
 * two sourced assets composited together, which is exactly the verdict.
 *
 * A brush does two things a lens does not: it AVERAGES what is under it, and it
 * averages DIRECTIONALLY. So the plate is re-sampled along a stroke:
 *
 *   • the stroke ANGLE comes from low-frequency value noise in the plate's own
 *     uv (~26 × 17 cells — a stroke is about a fortieth of a portrait wide), so
 *     the direction holds over a patch and turns as it crosses the form, the
 *     way a hand loads and lays down a mark;
 *   • four taps: two along the stroke and two half a step off it to either
 *     side, which is a short flat brush rather than a symmetric blur. A
 *     symmetric blur is soft focus and reads as a mistake; an anisotropic one
 *     reads as a mark;
 *   • the mix is capped in the interior only. Both the tap average and the raw
 *     sample must be fully opaque before any smearing happens, so the plate's
 *     silhouette — the one edge that must stay cut — never picks up a halo, and
 *     the feather at her shoulder is left exactly as the matte drew it.
 *
 * Applied BEFORE the grade so everything downstream operates on the painted
 * surface, and read together with the tooth at the end of this patch (which
 * puts the ground back under the stroke) it is the whole answer to "unify the
 * rendering language": compressed detail, visible directional structure, and a
 * noise field at the same scale as the room's.
 */
float _brushAng = pqPlateNoise(vMapUv * vec2(26.0, 17.0)) * 6.2831853;
vec2  _brushDir = vec2(cos(_brushAng), sin(_brushAng)) * uBrush;
vec2  _brushOrt = vec2(-_brushDir.y, _brushDir.x) * 0.45;
vec4  _brush = texture2D(map, vMapUv + _brushDir)
             + texture2D(map, vMapUv - _brushDir)
             + texture2D(map, vMapUv + _brushDir * 0.45 + _brushOrt)
             + texture2D(map, vMapUv - _brushDir * 0.45 - _brushOrt);
_brush *= 0.25;
float _brushCore = step(0.995, _brush.a) * step(0.995, sampledDiffuseColor.a);
diffuseColor.rgb = mix(diffuseColor.rgb, _brush.rgb, clamp(uPaint, 0.0, 1.0) * _brushCore);
diffuseColor.rgb *= uBright;
float _spriteLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
diffuseColor.rgb = mix(vec3(_spriteLuma), diffuseColor.rgb, 1.0 - clamp(uDesat, 0.0, 1.0));
diffuseColor.rgb = mix(diffuseColor.rgb, uTint, clamp(uTintAmt, 0.0, 1.0));
float _plateLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
diffuseColor.rgb = mix(vec3(_plateLuma), diffuseColor.rgb, 1.0 - clamp(uPlateDesat, 0.0, 1.0));
vec3 _plateShadow = vec3(0.140, 0.420, 0.440);
vec3 _plateHigh   = vec3(0.980, 0.713, 0.401);
vec3 _plateSplit  = mix(_plateShadow, _plateHigh, smoothstep(0.0, 0.9, _plateLuma));
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  diffuseColor.rgb * (0.55 + 0.9 * _plateSplit),
  clamp(uPlateSplit, 0.0, 1.0)
);
// Cool bounce in the speculars only — smoothstep starts well above mid so it
// never touches skin midtones, which would read as a colour cast on the face
// rather than as light on it.
float _plateSpec = smoothstep(0.36, 0.88, _plateLuma);
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  diffuseColor.rgb * vec3(0.855, 1.0, 1.075),
  _plateSpec * clamp(uPlateCool, 0.0, 1.0)
);
/* Environmental tint — the room's ambient, over ALL of her.
 *
 * uPlateCool above only reaches the speculars, on the reasoning that a cool
 * bounce shows on a sheen. True, and it leaves the other 90% of her surface
 * area carrying no ambient at all: a figure whose midtones and shadows are
 * innocent of the room she is sitting in is a figure that was lit somewhere
 * else, and that is the read the critic gave the frame. Every object in a
 * night interior with a wall of city glass behind it sits in a weak teal
 * ambient; this is hers.
 *
 * Mixed toward LUMINANCE × the ambient hue rather than toward a flat colour,
 * and the hue is scaled by 1/its own luma (0.725) so the operation is exactly
 * value-preserving: it moves her chroma toward the room and never her
 * exposure. 12% is the point where she stops being the only warm-only object
 * in frame and still, unmistakably, has blood in her.
 */
vec3 _envHue = vec3(0.42, 0.80, 0.88) * 1.379;
float _envLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  vec3(_envLuma) * _envHue,
  clamp(uEnvTint, 0.0, 1.0)
);
/* ── The print exposure, on HER ────────────────────────────────────────────
 *
 * Everything above this line is a HUE operation. uPlateDesat pulls her chroma,
 * uPlateSplit bends it toward the room's two lights, uPlateCool and uEnvTint lay
 * the window over her — all of it correct, all of it value-preserving by
 * construction, and none of it able to answer the note that she does not
 * separate from the plate behind her. That note is about VALUE, and the only
 * value operations this material carried were uBright (a flat multiply, which
 * moves her blacks and her speculars along with everything else) and the plate
 * bake's own midLift, which is applied once at load in 8-bit sRGB and cannot
 * know what the composite grade downstream will do to the room around her.
 *
 * So the sprite carries a midtone-weighted GAIN of its own, and three properties
 * are what make it usable rather than merely brighter:
 *   • it is weighted in PERCEPTUAL space, not linear. The window 4L(1−L) is
 *     the right shape and the wrong argument here: three decodes an sRGB plate
 *     to linear before this runs, and a lit forearm sits near 0.10 LINEAR, where
 *     4L(1−L) is already down to a third of its peak. Taking the ~1/2.2 root
 *     first puts the peak of the window back on the band a colourist means by
 *     "midtones" — the wool, the collar, the shadow side of the jaw, the
 *     forearm — which is the band the separation actually lives in;
 *   • it is a GAIN. Light scales what a surface reflects; an additive lift of
 *     the same size would raise her blacks, which is the single most legible
 *     signature of a badly composited plate and the thing this whole material
 *     exists to avoid;
 *   • it is ZERO at both ends by construction, so it cannot lift a black and it
 *     cannot drive a specular into the highlight shoulder downstream. At
 *     uMidGain 0.13 it is +13% at mid, ≥10% across the whole midtone band, +2%
 *     on a lit cheek's brightest plane and 0% on white.
 */
float _midLum = clamp(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
float _midW = pow(_midLum, 0.4545);
diffuseColor.rgb *= 1.0 + clamp(uMidGain, 0.0, 1.0) * 4.0 * _midW * (1.0 - _midW);
/* ── The contrast match ────────────────────────────────────────────────────
 *
 * Everything above this line moves the plate's HUE toward the room or its
 * EXPOSURE toward the room, and the note that keeps coming back is neither: the
 * portrait carries about a stop more contrast than the set it is sitting in.
 * That is not a colour difference and it is not a level difference — it is the
 * slope of the transfer curve the plate was shot on against the slope the room
 * was painted on, and it is why a plate can measure correct at both ends and
 * still read as pasted. The eye is extremely good at this comparison and has no
 * name for it, which is exactly the profile of a note that arrives as "the
 * character layer isn't in the grade".
 *
 * So the plate's own curve is compressed toward a night-interior pivot before
 * the composite grade sees it, and two properties keep it from being a haze:
 *   • it is GATED OFF THE TOE. A contrast pull about a pivot necessarily lifts
 *     everything below that pivot, and lifting her blacks is the single most
 *     legible composited-plate tell there is — the milky matte this whole
 *     material exists to avoid. The weight is zero below 0.02 linear and only
 *     fully open by 0.14, so her deep shadows keep the curve they arrived with
 *     and only the modelled range is compressed;
 *   • the PIVOT is the room's own midtone (0.12 linear, the value the desk's
 *     front face and the partition sit at), not 0.18 and not her own mean. A
 *     pull about the room's mid moves her toward the set; a pull about her own
 *     mean only makes her flatter in place.
 *
 * uPlateSoft IS the pull, so 0.12 is 12% off her slope — about a sixth of a stop
 * across the modelled band, which is what the difference measured at — costing
 * her lit cheek roughly 3% and her blacks nothing at all. Written as a scale
 * about the pivot rather than as a mix() so the identity case is exact: at
 * weight zero the expression returns the sample unchanged, bit for bit.
 */
{
  vec3 _sPivot = vec3(0.12);
  float _sLum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float _sK = 1.0 - clamp(uPlateSoft, 0.0, 1.0) * smoothstep(0.02, 0.14, _sLum);
  diffuseColor.rgb = _sPivot + (diffuseColor.rgb - _sPivot) * _sK;
}
/* Painterly tooth — the last difference between the two renderers.
 *
 * The room is a painting: every surface in it carries a mottle at the scale of
 * a brush, and the plate — however well graded — carries a perfectly smooth
 * one. Colour operations cannot close that gap, because it is not a colour
 * difference, it is a TEXTURE difference, and the eye finds the smooth object
 * and calls it pasted.
 *
 * Two octaves of value noise in the plate's OWN uv (not screen space — this is
 * a property of the painted surface, so it must parallax and breathe with her,
 * unlike the emulsion downstream which is a property of the camera). The
 * frequencies are chosen against the plate's on-screen size: ~64 × 40 cells is
 * a brush stroke, ~190 × 120 is the tooth of the ground under it, and both sit
 * comfortably above two screen pixels per cell so neither can alias into a
 * grid. Applied MULTIPLICATIVELY, so it modulates what is there and cannot
 * fog her shadows.
 */
float _tooth = (pqPlateNoise(vMapUv * vec2(64.0, 40.0)) - 0.5) * 0.62
             + (pqPlateNoise(vMapUv * vec2(190.0, 120.0)) - 0.5) * 0.38;
/* …and the tooth is ROLLED OFF on the lit planes, which is the half of the
 * "posterised cheek" note that the composite grain roll cannot reach.
 *
 * The gap in the reasoning that set uCanvas was uniformity. A ground has one
 * tooth everywhere, so the modulation was applied at one strength everywhere —
 * and it is a RELATIVE modulation, so at ±11% it is ±3 code values on her
 * cardigan and ±22 on her forehead. Twenty-two values of noise laid across the
 * two smoothest, most continuously modelled surfaces on the figure is larger
 * than the steps the modelling itself is made of, so the planes quantise: the
 * cheek and the brow break into flat patches with visible boundaries, which the
 * eye reads as compression rather than as canvas. It is also wrong about paint —
 * a ground shows through a thin scumble and is buried under a loaded highlight,
 * so the tooth belongs in the shadows and the halftones and not on the light.
 *
 * ~40% off the lit band, nothing at all below 0.18, which leaves her shadow side
 * and the cardigan measuring in the same noise band as the painted desk while
 * her lit planes stop breaking up. */
float _toothLum = clamp(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
float _toothW = 1.0 - 0.42 * smoothstep(0.18, 0.70, _toothLum);
diffuseColor.rgb *= 1.0 + _tooth * 2.0 * clamp(uCanvas, 0.0, 1.0) * _toothW;
`,Ef=`
uniform sampler2D uLight;
uniform float uHasLight;
uniform vec2 uLightRes;
/**
 * Screen-space occupancy of the speaker — centre.xy, half-extents.zw, in the
 * same 0..1 y-up frame as pqScreenUv(). Published every frame by the Stage
 * (see Stage.publishFigureMask) from the plate's own solid core, so it tracks
 * her breathing, her entrance and any camera drift without a second render.
 *
 * She is INDOORS. Every drop in this rig is on the far side of the pane, so a
 * streak drawn at full strength across her cheek is not weather, it is proof
 * that the weather layer and the figure were never in the same space — the
 * loudest compositing tell the frame carries. The consumers below fence
 * themselves against it: the falling field all but disappears over her, the
 * water on the glass merely thins (the pane really is in front of her, and
 * saying so is half of what makes the shot read as *through a window* rather
 * than as rain stickered onto a portrait).
 */
uniform vec4 uFigure;
uniform float uFigureAmt;
/**
 * ── The interior fence ───────────────────────────────────────────────────────
 *
 * The camera is INSIDE. Everything this rig draws — the falling field, the
 * rivulets, the sheet, the mullion — belongs to the far side of a pane, and the
 * near third of this frame is a desk with a lamp, a mug, a headset and a
 * monitor sitting on it. A streak crossing the lamp's shade is not weather; it
 * is proof that the weather layer never had a plane, and it is the single
 * loudest note the frame came back with ("unmotivated rain over the whole
 * picture").
 *
 * The figure fence above answers the same question for a PERSON, and it answers
 * it with a projected bound published every frame. A room's furniture cannot be
 * projected — it is painted into the plate — so it is DECLARED instead: up to
 * three soft ellipses in the same 0..1 y-up framed screen the light field is
 * sampled in, authored per background beside its screen prop (see
 * Stage → PLATE_INTERIOR).
 *
 * Ellipses, never boxes, and that is not a stylistic preference: an
 * axis-aligned rectangle of "no rain" has straight edges, and a straight edge
 * in a weather field is a matte. A superellipse would round the corners and
 * still terminate; a plain ellipse with a long shoulder cannot draw a line
 * anywhere, at any strength.
 */
uniform vec4 uInteriorA;
uniform vec4 uInteriorB;
uniform vec4 uInteriorC;
uniform vec4 uInteriorD;
/** Per-ellipse shoulder width, as a fraction of each radius. */
uniform vec4 uInteriorSoft;
/** Master amount. 0 retires the fence — a plate with no declared interior keeps
 *  exactly the weather it had. */
uniform float uInteriorAmt;
/**
 * ── The pane matte ───────────────────────────────────────────────────────────
 *
 * The interior fence above is a SUBTRACTIVE description of the room: name every
 * prop between the lens and the glass and take the water off it. That is the
 * right instrument for a lamp and a mug — objects with no straight edge — and it
 * is the wrong one for the question the frame kept failing, which is not "what
 * occludes the pane" but "WHERE IS THE PANE AT ALL". Four ellipses can never
 * spell the answer, because the complement of a union of ellipses is not a
 * window: it leaks between them, above them and past their shoulders, and every
 * leak prints as a streak standing on a wall, a chair back or a desk.
 *
 * So the glass is declared POSITIVELY as well — the rectangle of frame the
 * window wall actually occupies, with a soft shoulder on each side (a hard
 * boundary in a weather field is a matte, exactly as for the ellipses). The two
 * fences compose: rain exists only inside the pane rect AND outside the
 * furniture. Everything on this rig is on the far side of the glass by
 * construction, so this is simply that statement made once, in the coordinates
 * the statement is about.
 *
 * uPane is (x0, y0, x1, y1) in the framed screen, 0..1, y up. uPaneAmt 0 retires
 * the matte — a plate with no window keeps exactly the weather it had.
 */
uniform vec4 uPane;
uniform vec2 uPaneSoft;
uniform float uPaneAmt;
/**
 * ── The rain window ─────────────────────────────────────────────────────────
 *
 * The pane matte above is one rectangle, and one rectangle is not enough to say
 * where a wall of glass is once anything stands in front of it. The ops room is
 * the case that proves it: the glass runs from the partition jamb to the frame
 * edge, and a task chair — the largest opaque mass in the composition — sits in
 * the middle of that run with its crown two fifths of the way up the picture.
 * A single rect either includes the chair (and rains down it, which is the note
 * four consecutive reads came back with) or excludes the whole middle of the
 * window with it. Ellipses cannot fix that either: they are a SUBTRACTIVE
 * description, and every gap between them leaks a streak onto something solid.
 *
 * So the glass is declared as a UNION OF UP TO TWO FEATHERED RECTANGLES —
 * "here, and here, is where a raindrop can be seen at all" — authored per plate
 * off a framed 1920×1080 capture, in the same 0..1 y-up screen the light field
 * is sampled in. Two is the whole budget on purpose: a description that needs
 * three is a description that has started tracing a silhouette, and a traced
 * silhouette in a weather field is a matte.
 *
 * The second rect is what carries the VERTICAL clip. In the ops room the upper
 * rect stops at the chair's crown and the outboard rect continues past it down
 * to the sill, so the field terminates in mid-frame only where the chair is
 * standing in it — which is what occlusion looks like — and runs to the floor
 * line out in the bay, where nothing interrupts it.
 *
 * Each rect is (x0, x1, y0, y1). uRainWinAmt 0 retires the window entirely: a
 * plate that declares none keeps exactly the weather it had.
 */
uniform vec4 uRainWinA;
uniform vec4 uRainWinB;
/** Feather half-widths in x and y, frame fractions. Never zero — see pqWinRect. */
uniform vec2 uRainWinSoft;
uniform float uRainWinAmt;
/**
 * Where this fragment is on screen, 0..1, y up.
 *
 * Straight off gl_FragCoord, NEVER off an interpolated gl_Position.xy/w. Both
 * consumers here live on planes the camera looks at from an angle (the camera
 * tracks the origin, so nothing is exactly parallel to the image plane), and a
 * varying is resolved with perspective correction — which for a quantity that
 * is already divided by w lands somewhere that is neither. The error is not
 * academic: it put the glass reflection a couple of hundred pixels below where
 * the stage placed it, i.e. off the pane and onto the carpet, which is exactly
 * the unmotivated smear the frame was failing on.
 */
vec2 pqScreenUv() {
  return clamp(gl_FragCoord.xy / max(uLightRes, vec2(1.0)), 0.0, 1.0);
}
/** Peak-normalized hue of the light behind a screen-space point. */
vec3 lightHue(vec3 c) {
  float m = max(c.r, max(c.g, c.b));
  return c / max(m, 0.001);
}
/**
 * 1 deep inside the speaker, 0 clear of her, with a long soft shoulder.
 *
 * The falloff is deliberately wide: a crisp cut-out would trade one seam for
 * another — a rain-shaped hole in the exact silhouette of a portrait — and the
 * plate's own edge is a ~78px feather, not a line. A gradient is the only honest
 * boundary here.
 *
 * 0.70/1.10 → 0.82/1.16, and it is the PLATEAU that matters rather than the
 * shoulder. The published footprint is the plate's solid core (see
 * Character.CORE), and at a plateau of 0.70 of that radius the fence reached
 * full strength over her face and had already begun releasing across her near
 * shoulder and her forearm — so the terms this gates were at half strength over
 * exactly the two large smooth planes where a stray mark is most visible. At
 * 0.82, read against the 1.20 × / 1.10 × over-scale the Stage now publishes (see
 * publishFigureMask), the full-strength region covers her from crown to forearm
 * and the shoulder releases out in the dark bay beside her, where there is
 * nothing for a boundary to be seen against.
 */
float pqFigure(vec2 uv) {
  vec2 d = (uv - uFigure.xy) / max(uFigure.zw, vec2(1e-4));
  return uFigureAmt * (1.0 - smoothstep(0.82, 1.16, length(d)));
}
/** One interior ellipse: 1 deep inside, 0 clear of it, with a long shoulder. */
float pqInteriorLobe(vec2 uv, vec4 e, float soft) {
  if (e.z <= 0.0 || e.w <= 0.0) return 0.0;
  float d = length((uv - e.xy) / max(e.zw, vec2(1e-4)));
  return 1.0 - smoothstep(max(1.0 - soft, 0.0), 1.0 + soft, d);
}
/** 1 out on the glass, 0 off it, with a long shoulder on all four sides. */
float pqPane(vec2 uv) {
  if (uPaneAmt <= 0.0) return 1.0;
  float mx = smoothstep(uPane.x - uPaneSoft.x, uPane.x + uPaneSoft.x, uv.x)
           * (1.0 - smoothstep(uPane.z - uPaneSoft.x, uPane.z + uPaneSoft.x, uv.x));
  float my = smoothstep(uPane.y - uPaneSoft.y, uPane.y + uPaneSoft.y, uv.y)
           * (1.0 - smoothstep(uPane.w - uPaneSoft.y, uPane.w + uPaneSoft.y, uv.y));
  return mix(1.0, mx * my, clamp(uPaneAmt, 0.0, 1.0));
}
/**
 * One rain-window rectangle: 1 inside, 0 outside, with a smooth shoulder on all
 * four sides. A degenerate rect (unset slot) returns 0 and drops out of the max.
 *
 * The shoulder is the entire reason this is a smoothstep and not a step: a hard
 * boundary in a weather field is a matte, and a matte is the exact artefact the
 * window exists to remove. Ranges that reach a frame edge are pushed past it by
 * the Stage (see Weather.setRainWindow) so their feather is spent off-picture
 * and the field runs full strength to the edge rather than halving at it.
 */
float pqWinRect(vec2 uv, vec4 r) {
  if (r.y <= r.x || r.w <= r.z) return 0.0;
  vec2 s = max(uRainWinSoft, vec2(1e-3));
  float mx = smoothstep(r.x - s.x, r.x + s.x, uv.x)
           * (1.0 - smoothstep(r.y - s.x, r.y + s.x, uv.x));
  float my = smoothstep(r.z - s.y, r.z + s.y, uv.y)
           * (1.0 - smoothstep(r.w - s.y, r.w + s.y, uv.y));
  return mx * my;
}
/** 1 where this plate has glass, 0 where it has room. See the uniforms above. */
float pqRainWindow(vec2 uv) {
  if (uRainWinAmt <= 0.0) return 1.0;
  float m = max(pqWinRect(uv, uRainWinA), pqWinRect(uv, uRainWinB));
  return mix(1.0, m, clamp(uRainWinAmt, 0.0, 1.0));
}
/** 1 where the room's own furniture occludes the pane, 0 out on the glass. */
float pqInterior(vec2 uv) {
  float m = pqInteriorLobe(uv, uInteriorA, uInteriorSoft.x);
  m = max(m, pqInteriorLobe(uv, uInteriorB, uInteriorSoft.y));
  m = max(m, pqInteriorLobe(uv, uInteriorC, uInteriorSoft.z));
  m = max(m, pqInteriorLobe(uv, uInteriorD, uInteriorSoft.w));
  return m * clamp(uInteriorAmt, 0.0, 1.0);
}
`,Mw=`
varying float vStreak;
attribute float aStreak;
`,Tw=`
vStreak = aStreak;
gl_PointSize = size * (0.40 + 1.30 * aStreak);`,Aw=`
varying float vStreak;
${Ef}
`,Ew=`
vec3 _behind = texture2D(uLight, pqScreenUv()).rgb;
float _behindLum = dot(_behind, vec3(0.2126, 0.7152, 0.0722));
float _lit = mix(1.0, smoothstep(0.03, 0.30, _behindLum), uHasLight);
// Over dead blacks a streak keeps only a whisper; in a practical it flares.
diffuseColor.a *= mix(0.15, 1.0, _lit);
// Per-drop exposure, 16–92%, and DECORRELATED from the length above.
// Uniform opacity across a field is the other half of the "identical ticks"
// tell — but driving length and exposure off the same attribute only trades it
// for a rule (every long streak is also the brightest one), which the eye finds
// just as fast. One cheap hash off the same attribute gives the second axis its
// own distribution at zero extra cost, so a field now contains short bright
// drops and long faint ones as well as the obvious pairs. Mean is 0.54 against
// the old 0.55, so the field's overall density is unchanged.
float _expo = fract(vStreak * 43.7585 + 0.3713);
diffuseColor.a *= mix(0.16, 0.92, _expo);
// …and the figure fence. Rain falls OUTSIDE; she is at a desk inside. Held at
// a floor rather than 0 so the streaks crossing the bright bokeh beside her ear
// still carry a whisper of continuity across the silhouette — a field that
// stops dead at her outline reads as a matte, which is the very thing this
// exists to remove.
//
// 0.18 → 0.06. The continuity argument is sound and the number was not: 18% of
// a 0.9-base field over a face is still a visible line, and a fine bright
// vertical crossing a lit cheek does not read as "rain seen past her" — it
// reads as a SCRATCH ON THE PRINT, which is the single most damaging thing a
// frame can be accused of, because it is an accusation about the medium rather
// than about the picture. At 6% the field is present across her as a texture
// and absent as a mark. Note that the pane's own water (GLASS_FRAGMENT) still
// crosses her properly — that layer is genuinely in front of her and is where
// the through-a-window read is actually earned.
diffuseColor.a *= mix(1.0, 0.06, pqFigure(pqScreenUv()));
// …and the interior fence, which unlike the figure is absolute. The pane is a
// PLANE: a drop cannot be in front of the desk lamp and behind the window at
// the same time, and the compromise the figure gets (18%, so the field carries
// continuity across a feathered silhouette) has no equivalent here — a painted
// prop has no feather, it simply occludes. 2% is left so the ellipse's own
// shoulder still resolves smoothly rather than terminating on a zero.
diffuseColor.a *= mix(1.0, 0.02, pqInterior(pqScreenUv()));
// …and the PANE MATTE, which is absolute in the other direction: a drop that is
// not on the glass is not a drop, it is an overlay. Multiplied rather than
// floored — the ellipses above keep a 2% shoulder so their own falloff resolves
// smoothly, but there is nothing on the far side of THIS boundary for a shoulder
// to resolve into. The smoothstep in pqPane is what keeps the edge off the
// picture; the value it reaches is zero.
diffuseColor.a *= pqPane(pqScreenUv());
// …and the RAIN WINDOW, which is the same statement made per plate and with a
// vertical extent (see pqRainWindow). It is multiplied, absolute and last of the
// three fences because it is the one that can say "there is a chair in front of
// this bay": the pane rect above knows only that the wall of glass begins at
// x=0.425, and a wall of glass with a task chair standing in the middle of it
// still has no rain over the chair. Zero outside, no floor, no allowance — a
// drop that is not on glass is not a drop, it is an overlay, and this is the
// only fence in the file that gets to see that per background.
diffuseColor.a *= pqRainWindow(pqScreenUv());
// …and the SPECULAR TINT, 0.62 → 0.78. A drop on a window is not a white tick
// that happens to be standing in front of a teal city; it is a lens, and what it
// shows is the city. Taking three quarters of its hue from what is behind it
// (rather than three fifths) is what makes a streak crossing the signage read
// teal and a streak crossing a street practical read amber — i.e. refractive
// rather than stamped, which is the note.
diffuseColor.rgb = mix(diffuseColor.rgb, lightHue(_behind), 0.78 * _lit);
// The FLARE, 1.15 → 0.72 of gain on the lit term. The tint above is free; the
// gain was not. At 1.95× over a bright bokeh a single drop was the third
// brightest object in the frame — a bar of light hanging in the window with
// nothing to explain it, which is exactly how the frame came back describing the
// one at x≈1060. A drop transmits what is behind it; it does not amplify it by a
// stop. 1.52× still separates the lit drops from the dead ones by the amount
// that makes rain visible, and no single one of them can now out-print the
// practical the composition is hung on.
diffuseColor.rgb *= 0.8 + 0.72 * _lit;
outgoingLight = diffuseColor.rgb;
`,Cw=`
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,Rw=`
uniform float uTime;
uniform float uOpacity;
uniform vec2  uRefl;       // screen-space position of the reflected practical
uniform vec3  uReflColor;
uniform float uReflAmt;
${Ef}

/** Local 2->1 hash — GLSL_NOISE is not injected here, and the pane needs one
 *  cheap stationary field for the dried-spray haze on its specular. */
float pqHash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

/**
 * One rivulet: a hairline core dragging a short decaying tail, with a slightly
 * fatter bead at the head. Widths are in screen-UV, so ~0.001 ≈ 2px at 1080p —
 * any thicker and it stops being water and starts being a worm.
 */
float rivulet(vec2 uv, float x0, float speed, float phase, float width, float decay) {
  float wob = sin(uv.y * 9.0 + phase) * 0.0022 + sin(uv.y * 23.0 + phase * 2.3) * 0.0008;
  float dx = uv.x - (x0 + wob);
  float head = 1.16 - fract(uTime * speed + phase * 0.13) * 1.4;
  float above = uv.y - head;
  // decay is per-rivulet, and that is the point: every trail used to fall off
  // at the same 4.6, so all six were the same LENGTH however different their
  // gauges and speeds were — six copies of one line again, one axis down. A fat
  // slow bead drags a long trail; a fine fast one is nearly all head.
  float tail = smoothstep(-0.010, 0.004, above) * exp(-max(above, 0.0) * decay);
  float core = exp(-pow(dx / width, 2.0)) * tail;
  float bead = exp(-pow(dx / (width * 2.3), 2.0)) * exp(-pow(above / 0.013, 2.0));
  return core + bead * 0.55;
}

/**
 * The whole pane's worth of water, as one field.
 *
 * Eight rivulets at eight genuinely different gauges, speeds and tail lengths.
 * They used to run 0.0011 / 0.0009 / 0.0010 wide at near-identical speeds —
 * three copies of one
 * line, which is what makes water on glass read as a repeated texture. Sampled
 * as a field (rather than summed inline) so the refraction below can take its
 * horizontal derivative with a central difference.
 */
float rivuletField(vec2 uv) {
  return rivulet(uv, 0.585, 0.055, 0.0, 0.0024, 3.4) * 0.85
       + rivulet(uv, 0.668, 0.039, 5.7, 0.0014, 6.1) * 0.60
       + rivulet(uv, 0.742, 0.031, 2.1, 0.0012, 7.8) * 0.55
       + rivulet(uv, 0.906, 0.047, 4.4, 0.0018, 4.4) * 0.70
       // Four more across the INBOARD bays. They used to sit at 0.335 / 0.452 and
       // — the two loudest — at 0.148 / 0.209, "across the lamp", on the argument
       // that a drop lit by the practical is the one that welds the glass to the
       // room. The argument is good and the geometry was not: the lamp, the mug
       // and the monitor are on the CAMERA's side of that window, so those two
       // rivulets were water running down the front of a desk lamp. The interior
       // ellipses already thinned them to nothing and the pane matte now deletes
       // them outright; carrying them was buying a fence twice and a picture
       // never.
       //
       // Re-pointed onto the first two bays of actual glass, which is also where
       // the frame needed them: the run between the partition arris (0.416) and
       // the near mullion (0.632) was the emptiest stretch of pane in the shot.
       // Deliberately the faintest four of the eight — over the darker inboard
       // bays the lit gate keeps them near 5%, enough to say "there is glass
       // here", not enough to be seen as a mark.
       + rivulet(uv, 0.428, 0.043, 1.3, 0.0013, 5.5) * 0.44
       + rivulet(uv, 0.505, 0.036, 3.9, 0.0010, 8.6) * 0.38
       + rivulet(uv, 0.472, 0.050, 2.7, 0.0021, 4.0) * 0.50
       + rivulet(uv, 0.556, 0.034, 0.6, 0.0012, 7.0) * 0.36;
}

/**
 * Track marks — the healed trails of every rivulet that has already run.
 *
 * The rivulets say "water is moving on this pane". They cannot say "this pane
 * has been rained on for hours", and that is the difference between weather
 * drawn on a surface and weather that has a HISTORY on it. Real glass in a
 * storm carries a fine vertical striation of part-dried tracks between the live
 * beads: it is what the eye reads as a plane long before it notices a drop.
 *
 * Deliberately STATIC — a track is a property of the glass, not of the moment,
 * and a crawling one collapses straight back into a particle overlay. Two
 * incommensurate vertical rhythms with a slow lateral wander so no two tracks
 * are parallel, ceiling ~2% alpha, and it is the term the refraction below
 * leans on hardest: a dried track still bends what is behind it, which is the
 * whole reason the city has to shift as it crosses one.
 */
float trackField(vec2 uv) {
  float wob = sin(uv.y * 5.3) * 0.010 + sin(uv.y * 13.7 + 1.9) * 0.004;
  float a = sin((uv.x + wob) * 268.0);
  float b = sin((uv.x - wob * 0.6) * 173.0 + 2.4);
  // Sharpened toward the crests, so the field is a set of fine lines rather
  // than a corduroy of even ripples.
  return pow(max(a, 0.0), 7.0) * 0.62 + pow(max(b, 0.0), 11.0) * 0.38;
}

void main() {
  vec2 uv = pqScreenUv();
  vec3 behind = texture2D(uLight, uv).rgb;
  float behindLum = dot(behind, vec3(0.2126, 0.7152, 0.0722));
  float lit = mix(1.0, smoothstep(0.03, 0.30, behindLum), uHasLight);
  // Everything this pass draws lives on the far side of the pane, so every
  // term below is fenced twice: OUT of the room's own furniture (pqInterior) and
  // IN to the window wall itself (pqPane). The second is the one that stops the
  // sheet, the tracks and the specular reading as a full-frame overlay — a run
  // of water with no left edge anywhere in the picture is a filter, whatever is
  // drawn inside it.
  // …and fenced a THIRD time by the plate's own rain window, which is what
  // stops the rivulets, the sheet, the tracks and the frame members from being
  // drawn over a chair back or a desk that happens to stand inside the pane
  // rect. Every term below reads this same "pane" factor, so declaring the
  // window once here gates the whole pass — including the mullions, which is
  // correct in the same way the water is: a frame
  // member behind an object in the room is occluded by it exactly as the water
  // on the same sheet is.
  float pane = (1.0 - pqInterior(uv)) * pqPane(uv) * pqRainWindow(uv);

  float riv = rivuletField(uv);
  // The pane has a bottom. The rivulets used to run the full height of the
  // frame, which put water tracking down the speaker's shoulder and down the
  // laptop lid in front of her — objects that are on THIS side of the glass.
  // Read at a glance that is not weather, it is a reflection smeared across a
  // figure, and it is the loudest compositing tell in the lower third. The
  // sill line retires them over the bottom band, which is also exactly the
  // band the dialogue is read in.
  //
  // 0.06→0.28 pulled down to 0.03→0.17. At the old numbers the pane ran out of
  // water a third of the way up the frame, which put its lower terminus right
  // across the speaker's shoulder: the streaks visibly STOPPED partway down
  // her, and a sheet of glass that ends in mid-air over a figure is a worse
  // read than no glass at all — it says "layer", not "window". The pane now
  // continues to within ~180px of the frame edge and only retires inside the
  // reading band itself.
  float sill = smoothstep(0.03, 0.17, uv.y);
  // The pane is genuinely in FRONT of her, so unlike the falling field the
  // water does not stop at her outline — it thins. Three quarters strength over
  // the figure (was one half): the claim a through-the-window frame makes is
  // that the glass demonstrably continues across the shot, and at half strength
  // over an unlit subject the arithmetic put the water at ~6% alpha, i.e. the
  // pane was, over the one object it most needed to cross, absent.
  float fig = pqFigure(uv);
  // Density: 0.42 at full light, and a FLOOR of 0.19 rather than 0.12 where
  // there is nothing lit behind the pane. The lit gate is what made the water
  // vanish over her coat and over the dead middle — correct as a light model,
  // wrong as a picture, because rain on a window is still visible against a
  // dark room by refraction alone. The floor is that refraction term.
  //
  // Over the FIGURE: 0.74 → 0.52 → 0.34 → 0.04, and the last step is a change of
  // position rather than of dose. The three before it were all trying to find a
  // density at which water lying on a lit cheek reads as a window instead of as
  // a compositing artefact, and there is no such density — the pane is now drawn
  // BEHIND her (see Weather: renderOrder 12) and the only thing this factor still
  // governs is how much of it shows THROUGH her matte, which is a 78px feather
  // with a dissolving torso in it. Four percent is what keeps the rivulets from
  // terminating on her outline like a stencil while leaving nothing on her that
  // could be mistaken for a mark. The "a window that stops at a silhouette is not
  // a window" claim is answered by the pane's own structure out in the bays,
  // where a mullion and a run of water can be seen crossing nothing at all.
  float aRiv = clamp(riv, 0.0, 1.0) * uOpacity * mix(0.19, 0.42, lit) * sill
             * mix(1.0, 0.04, fig) * pane;

  // Refraction. A bead of water is a cylindrical lens: the city behind it does
  // not merely brighten, it SHIFTS. The field's own horizontal derivative gives
  // the lens power, so the light field is resampled displaced by it (and pushed
  // a touch down-frame, the way a drop drags what it carries). Blending that
  // displaced sample into the streak colour is what separates water on a pane
  // from white ticks drawn over a photograph. Two extra field evaluations —
  // the pass is gated by uOpacity and discards on empty glass.
  float e = 1.6 / max(uLightRes.x, 1.0);
  float gx = rivuletField(uv + vec2(e, 0.0)) - rivuletField(uv - vec2(e, 0.0));
  // The tracks bend light too, and being everywhere they are what actually
  // carries the "behind glass" read across the whole pane rather than at eight
  // isolated x positions. Their derivative is folded into the same lens.
  float tk = trackField(uv);
  gx += (trackField(uv + vec2(e, 0.0)) - trackField(uv - vec2(e, 0.0))) * 0.55;
  // Lens power 0.09 → 0.15. The displacement is what makes a bead read as a
  // bead and not as a white tick, and at the old value the shift was under a
  // texel of the 64×36 light field for every gauge but the fattest — i.e. the
  // refraction was, for four of the eight rivulets, arithmetically absent.
  vec3 refr = texture2D(uLight, clamp(uv + vec2(gx * 0.15, 0.012), 0.0, 1.0)).rgb;

  vec3 cRiv = mix(vec3(0.72, 0.80, 0.86), lightHue(behind), 0.7 * lit) * (0.75 + 0.8 * lit);
  // Gated on lit: lightHue() peak-normalises, so over dead black it would
  // amplify sensor noise into a confetti of saturated hues.
  cRiv = mix(cRiv, lightHue(refr) * (0.55 + 1.35 * lit), 0.45 * uHasLight * lit);
  /* ── The caustic ──────────────────────────────────────────────────────────
   * A bead of water is a cylindrical lens, and the whole of what separates one
   * from a coloured line is that a lens has a FOCUS. The displacement above
   * already shifts what is behind the bead; it shifts it evenly, so the drop
   * carries the city and never concentrates it.
   *
   * The concentration happens on the FLANKS — where the surface is steepest,
   * which is exactly where the field's own horizontal derivative peaks — so the
   * derivative already in hand is the lens power, and the highlight is that power
   * carrying the refracted hue. Two consequences the frame needs: a runnel
   * crossing the signage throws a teal core, one crossing a street practical
   * throws an amber one, and both of them are BRIGHTER than the pane around
   * them, so the water reads as refractive rather than as a tinted stroke.
   * Gated on the lit term and on uHasLight for the same reason as the line
   * above it. */
  float caustic = smoothstep(0.08, 0.34, abs(gx)) * lit * uHasLight;
  cRiv += lightHue(refr) * caustic * 0.38;

  // Reflected practical: a small soft lobe plus the vertical drag wet glass
  // gives it.
  //
  // HALF the radius it used to carry, and fenced to the pane. At the old size
  // — and free to land wherever the light field pointed, including the carpet —
  // it painted a ~400px amber bloom across the middle of the floor with nothing
  // in frame to cast it. That is not a reflection, it is a compositing seam,
  // and a seam is a hard fail. reflBand now kills it below the sill line, so
  // the only surface it can appear on is the glass the camera is behind.
  vec2 rp = uv - uRefl;
  float lobe = exp(-dot(rp / vec2(0.042, 0.021), rp / vec2(0.042, 0.021)));
  /* …and its GHOST. A window in a tower is double-glazed, so a practical in the
   * room behind the lens reflects TWICE — once off the inner sheet and once off
   * the outer, separated by the cavity and therefore offset by a few pixels and
   * a stop or so down. One lobe is a smudge that happens to be amber; two lobes
   * at one offset are unmistakably a reflection, because nothing else in a night
   * interior doubles. It is the cheapest available answer to "the warm mark on
   * the glass reads as arbitrary", and it costs one exponential. */
  vec2 rp2 = uv - uRefl - vec2(0.0128, -0.0072);
  float ghost = exp(-dot(rp2 / vec2(0.050, 0.025), rp2 / vec2(0.050, 0.025)));
  float drag = exp(-pow(rp.x / 0.013, 2.0)) * exp(-pow(max(-rp.y, 0.0) / 0.07, 1.7))
             * step(rp.y, 0.0);
  float reflBand = smoothstep(0.40, 0.54, uv.y);
  /* …and over the subject it is now GONE, 0.68 → 0.0, which is the one term on
   * this pane that gets deleted rather than thinned.
   *
   * The rivulets and the tracks are held at a whisper because they are fine lines
   * and a fine line that terminates on a silhouette reads as a stencil. A
   * REFLECTION is the opposite object: a single large soft amber lobe with a
   * ghost and a vertical drag, i.e. the biggest, softest, brightest mark this
   * pass can make. There is no strength at which it reads as glass when it lands
   * on a face — at any density it reads as the subject being half-eaten, and the
   * blind note ("she reads as a semi-transparent photo-composite") is in large
   * part this lobe lying across her jaw.
   *
   * Deleting it costs nothing, because a reflection is a local event: the smear
   * is still there on the pane either side of her, where the eye can see it lying
   * on a surface with nothing behind it. A reflection that stops where a person
   * is standing in front of the glass is, in fact, exactly what a reflection
   * does. */
  float aRefl = clamp(lobe * 0.72 + ghost * 0.3 + drag * 0.28, 0.0, 1.0)
              * uReflAmt * uOpacity * reflBand * pane * (1.0 - fig);

  /* ── The sheet itself ────────────────────────────────────────────────────
   * Six rivulets and one reflection describe things ON the glass and still
   * never describe the GLASS: between them the pane is a perfect vacuum, so
   * the eye reads streaks floating in front of a photograph rather than a
   * surface with weather on it. Two ~2% terms give it a body:
   *
   *   • a broad diagonal specular — the room's own light raking across the
   *     sheet, the single cheapest cue that says "there is a plane here".
   *     Wide (sigma ~ 0.30 of the diagonal) and gated on the lit term, so it
   *     only ever appears where something is actually behind it to reflect;
   *   • a fine haze of dried spray, sampled off the same displaced light the
   *     rivulets refract, which is what stops the specular from reading as a
   *     flat gradient laid over the frame.
   *
   * Both are fenced by the sill line and thinned over the figure on the same
   * terms as the water. Ceiling is ~4% alpha: it must be felt, never seen.
   */
  float diag = uv.x * 0.62 + uv.y * 0.78;
  float sheenBand = exp(-pow((diag - 0.86) / 0.30, 2.0));
  float haze = 0.55 + 0.45 * pqHash21(floor(uv * uLightRes / 3.0));
  // The sheet used to be the one term that did NOT thin over her (0.88), on the
  // argument that a sheet of glass which fades out behind a figure is not a
  // sheet. That argument was made when the pane was drawn in FRONT of her; with
  // the pane behind her (see Weather: renderOrder 12) the only thing this can
  // still do over the figure is haze her matte's feather, which is the exact
  // mechanism by which a plate reads as semi-transparent. 0.88 → 0.10: the sheet
  // still crosses the whole frame, it simply stops crossing HER.
  float aSheen = sheenBand * haze * (0.006 + 0.022 * lit) * uOpacity * sill
               * mix(1.0, 0.1, fig) * pane;
  vec3 cSheen = mix(vec3(0.70, 0.80, 0.88), lightHue(behind), 0.55 * lit);

  /* ── The tracks ──────────────────────────────────────────────────────────
   * The healed trails (see trackField). Two things are worth stating about the
   * levels, because both are what keep this a surface rather than a texture:
   *   • it is coloured off the REFRACTED sample, not off what is directly
   *     behind. That is the entire claim — a track that merely brightens is a
   *     scratch; a track that shows the city displaced is glass;
   *   • the lit gate is soft-floored at 0.28 rather than 0.19, because unlike a
   *     bead a dried track is visible against a dark room by its own scatter.
   * Ceiling ~2.2% alpha, and it is fenced by the pane and the sill like
   * everything else on this sheet.
   *
   * …and it is fenced HARDEST of all over the figure — 0.66 → 0.22, a third of
   * what the rivulets keep. The two are not the same object and the frame proves
   * it: a rivulet is a single wandering line and reads, correctly, as one drop
   * of water crossing her. The track field is a REGULAR striation — two summed
   * sines, i.e. a set of near-parallel verticals at an even pitch — and a set of
   * even parallel verticals running the full height of a face is the textbook
   * appearance of a scratched print. Every property that makes this term work
   * across a wall of glass (it is everywhere, it is uniform, it never ends) is
   * the property that makes it read as damage over skin. */
  // …and 0.22 → 0.0. The reasoning above is the reasoning for deleting it: a set
  // of even parallel verticals running the full height of a face is the textbook
  // appearance of a scratched print, and "a third of the rivulets' strength" is
  // still a set of even parallel verticals. It is the single term on this pass
  // whose failure mode is an accusation about the MEDIUM rather than about the
  // picture, so it gets no allowance at all over her.
  float aTrack = clamp(tk, 0.0, 1.0) * uOpacity * mix(0.010, 0.030, lit) * sill
               * (1.0 - fig) * pane;
  vec3 cTrack = mix(vec3(0.66, 0.76, 0.84), lightHue(refr), 0.62 * lit) * (0.62 + 0.75 * lit);

  /* ── The mullion ─────────────────────────────────────────────────────────
   *
   * Rivulets, a specular and a reflection describe things ON a pane and still
   * never say where the pane ENDS — and a sheet of glass with no edge anywhere
   * in frame is indistinguishable from a filter. So the window is given a frame
   * member, and it is placed for one specific job: it crosses her.
   *
   * That is the entire point of it and it is worth being explicit about, because
   * the instinct is to tuck a mullion into empty space where it cannot bother
   * anything. Empty space is exactly where it proves nothing. An object that
   * passes IN FRONT of a figure is the cheapest and most absolute depth cue a
   * two-dimensional image has: one soft dark bar over her forearm and shoulder
   * settles the question the whole left of the frame was leaving open — is she
   * in this room, or was she pasted into it. Nothing else in this pass can
   * answer that, because everything else in it is translucent.
   *
   * Two terms, which is how a real member reads at night:
   *   • the DARK core — a soft-shouldered bar about 11px wide at 1920, at 26%.
   *     Deliberately not opaque: it is being read against city light and the
   *     eye should have to notice it rather than be stopped by it;
   *   • the ARRIS — a fine lit edge down its inboard side, taking its hue from
   *     whatever is behind the pane there, so the frame member is lit by the
   *     same room as everything else and can never read as a drawn line.
   * Retired below the reading band and released at the very top, so it never
   * terminates on a hard end anywhere the eye is likely to be. */
  /* A SECOND member, out in the right third.
   *
   * One mullion establishes that there is a window. It does not establish that
   * there is a WALL of window, and the note the frame came back with is about
   * the outboard third specifically: undifferentiated darkness where the eye
   * expects a counterweight. A run of glass has bays, and a bay is the cheapest
   * structure a flat dark region can be given — it divides the field, it tells
   * the eye how far away the wall is, and it puts a vertical in the one part of
   * the composition that has nothing but horizontals in it.
   *
   * Placed at 0.845, i.e. inside the frame-right band rather than on it, and
   * struck a step under the near member (0.21/0.16 against 0.26/0.20) because
   * it is further round the curve of the wall and carries less of the room. */
  float mx2 = uv.x - 0.845;
  float mull2Core = exp(-pow(mx2 / 0.0060, 2.0));
  float mull2Arris = exp(-pow((mx2 + 0.0074) / 0.0014, 2.0));
  float mx = uv.x - 0.632;
  float mullCore = exp(-pow(mx / 0.0072, 2.0));
  float mullArris = exp(-pow((mx + 0.0086) / 0.0016, 2.0));
  float mullBand = smoothstep(0.13, 0.27, uv.y) * (1.0 - smoothstep(0.88, 1.0, uv.y));
  /* The arris is the pane's only STRUCTURAL specular, and it is what makes the
   * frame member read as a member rather than as a soft dark stripe — so when
   * the water on this pass came down over the figure, the frame it belongs to
   * had to come UP, or the note ("rain with no plane behind it") would simply be
   * answered by having less rain. 0.20/0.16 → 0.27/0.21: still a hairline, now
   * unambiguously a lit metal edge, and it is the term that says the streaks are
   * lying on something. */
  /* …and BOTH members are now fenced against the figure, which reverses the
   * paragraph above and is the point of this round.
   *
   * "It crosses her, and that is the entire point of it" was the strongest
   * argument in this file and it was answered by the frame: a soft dark bar and a
   * lit arris drawn over a forearm is a depth cue only if the eye reads them as
   * an object in front of her, and blind readers did not — they read a woman with
   * a vertical seam through her, i.e. the compositing tell the bar was placed to
   * disprove. A frame member cannot prove she is behind glass while it is the
   * thing making her look composited.
   *
   * The near member at x=0.632 sits squarely on her plate, so the fence takes it
   * off her and leaves the ~500px of it that runs through the empty bays above and
   * below — which is where a mullion proves there is a wall of window anyway. The
   * outboard member at 0.845 is clear of her at every camera position and is
   * untouched by construction (fig is 0 out there). */
  float mullFig = 1.0 - fig;
  float aMull = (mullCore * 0.26 + mull2Core * 0.21) * uOpacity * mullBand * pane * mullFig;
  float aArris = (mullArris * 0.27 + mull2Arris * 0.21) * uOpacity * mullBand * pane * mullFig;
  vec3 cMull = vec3(0.020, 0.031, 0.036);
  vec3 cArris = mix(vec3(0.50, 0.60, 0.68), lightHue(behind), 0.55 * lit) * (0.45 + 0.85 * lit);

  float a = clamp(aRiv + aTrack + aRefl + aSheen + aMull + aArris, 0.0, 1.0);
  if (a < 0.002) discard;
  vec3 c = (cRiv * aRiv + cTrack * aTrack + uReflColor * aRefl + cSheen * aSheen
          + cMull * aMull + cArris * aArris) / max(a, 0.0001);
  gl_FragColor = vec4(c, a);
}
`,Pw=.15,Lw=.22,Dw=.23,Iw=.12,kw=.13,Uw=.12,Ow=.055,Nw=.71,Fw=.0031;function gu(s,e){const t=new Lr({map:s,transparent:!0,depthTest:!0,depthWrite:!1,toneMapped:!0,alphaTest:.01}),i={uBright:{value:1},uDesat:{value:0},uTintAmt:{value:0},uTint:{value:e.clone()},uPlateDesat:{value:Pw},uPlateSplit:{value:Lw},uPlateCool:{value:Dw},uEnvTint:{value:Uw},uCanvas:{value:Ow},uPaint:{value:Nw},uBrush:{value:Fw},uMidGain:{value:kw},uPlateSoft:{value:Iw}};return t.onBeforeCompile=n=>{n.uniforms.uBright=i.uBright,n.uniforms.uDesat=i.uDesat,n.uniforms.uTintAmt=i.uTintAmt,n.uniforms.uTint=i.uTint,n.uniforms.uPlateDesat=i.uPlateDesat,n.uniforms.uPlateSplit=i.uPlateSplit,n.uniforms.uPlateCool=i.uPlateCool,n.uniforms.uEnvTint=i.uEnvTint,n.uniforms.uCanvas=i.uCanvas,n.uniforms.uPaint=i.uPaint,n.uniforms.uBrush=i.uBrush,n.uniforms.uMidGain=i.uMidGain,n.uniforms.uPlateSoft=i.uPlateSoft,n.fragmentShader=ww+n.fragmentShader.replace("#include <map_fragment>",Sw)},{material:t,uniforms:i}}class Cs{key;group;mesh;geometry;material;uniforms;tint;index;phase;anchors;baseHeight;texAspect=.62;currentTexture;targetBright=1;targetDesat=0;breathAmp=1;ghost=null;tweens=new Set;disposed=!1;constructor(e,t){this.key=e.key,this.index=e.index,this.tint=e.tint.clone(),this.anchors=e.anchors,this.baseHeight=e.height,this.phase=xw(e.index)*Math.PI*2,this.currentTexture=t,this.texAspect=this.aspectOf(t),this.group=new fn,this.group.position.z=e.worldZ,this.geometry=new bn(1,1);const i=gu(t,this.tint);this.material=i.material,this.uniforms=i.uniforms,this.mesh=new zt(this.geometry,this.material),this.mesh.frustumCulled=!1,this.mesh.renderOrder=20+e.index,this.applySize(),this.group.add(this.mesh),this.group.visible=!1}aspectOf(e){const t=e.image;return t&&t.width&&t.height?t.width/t.height:.62}applySize(){const e=this.baseHeight,t=e*this.texAspect;this.mesh.scale.set(t,e,1)}static CORE={cx:.45,cy:.43,hx:.3,hy:.4};coreBounds(){const e=this.mesh.scale.x,t=this.mesh.scale.y;return{x:this.group.position.x+this.mesh.position.x+(Cs.CORE.cx-.5)*e,y:this.group.position.y+this.mesh.position.y+(.5-Cs.CORE.cy)*t,hx:e*Cs.CORE.hx,hy:t*Cs.CORE.hy}}get presence(){return this.group.visible?this.material.opacity:0}relayout(e,t){this.baseHeight=e,this.anchors=t,this.applySize()}track(e){return this.tweens.add(e),e.eventCallback("onComplete",()=>this.tweens.delete(e)),e}enter(e,t){const i=this.anchors[e]??this.anchors.center,n=Math.max(Math.abs(this.anchors.left),Math.abs(this.anchors.right))+2.5,r=e==="right"?n:e==="left"?-n:i;if(this.group.visible=!0,this.group.position.x=r,this.group.position.y=e==="center"?-.35:0,this.uniforms.uBright.value=.2,this.material.opacity=0,t){this.group.position.set(i,0,this.group.position.z),this.material.opacity=1,this.uniforms.uBright.value=this.targetBright;return}this.track(qe.to(this.group.position,{x:i,y:0,duration:.95,ease:"back.out(1.4)"})),this.track(qe.to(this.material,{opacity:1,duration:.6,ease:"power2.out"})),this.track(qe.to(this.uniforms.uBright,{value:this.targetBright,duration:.8,ease:"power2.out"}))}moveTo(e,t){const i=this.anchors[e]??this.anchors.center;if(t){this.group.position.x=i;return}this.track(qe.to(this.group.position,{x:i,duration:.8,ease:"power3.inOut"}))}exit(e,t){const i=Math.max(Math.abs(this.anchors.left),Math.abs(this.anchors.right))+3,n=e==="left"?-i:i;return t?new Promise(r=>{this.material.opacity=0,this.group.visible=!1,r()}):new Promise(r=>{this.track(qe.to(this.group.position,{x:n,duration:.7,ease:"power2.in"})),this.track(qe.to(this.material,{opacity:0,duration:.6,ease:"power2.in",onComplete:()=>{this.group.visible=!1,r()}}))})}setPose(e,t){if(e===this.currentTexture)return;const i=this.currentTexture;if(this.currentTexture=e,this.texAspect=this.aspectOf(e),t){this.material.map=e,this.material.needsUpdate=!0,this.applySize();return}this.clearGhost();const n=gu(i,this.tint),r=n.material;n.uniforms.uBright.value=this.uniforms.uBright.value,n.uniforms.uDesat.value=this.uniforms.uDesat.value;const a=new zt(this.geometry,r);a.scale.copy(this.mesh.scale),a.renderOrder=this.mesh.renderOrder+1,a.frustumCulled=!1,this.group.add(a),this.ghost=a,this.material.map=e,this.material.needsUpdate=!0,this.applySize(),a.scale.copy(this.mesh.scale),this.track(qe.to(r,{opacity:0,duration:.28,ease:"power2.out",onComplete:()=>{this.group.remove(a),r.dispose(),this.ghost===a&&(this.ghost=null)}})),this.track(qe.fromTo(this.mesh.scale,{y:this.mesh.scale.y*.985},{y:this.mesh.scale.y,duration:.3,ease:"back.out(2)"}))}clearGhost(){if(this.ghost){const e=this.ghost.material;this.group.remove(this.ghost),e.dispose(),this.ghost=null}}setSpeaking(e){e==="speaker"?(this.targetBright=1.12,this.targetDesat=0,this.breathAmp=1.25):e==="listener"?(this.targetBright=.74,this.targetDesat=.3,this.breathAmp=.7):(this.targetBright=.96,this.targetDesat=.06,this.breathAmp=1)}update(e,t){if(this.disposed)return;const i=1-Math.exp(-t*6);this.uniforms.uBright.value+=(this.targetBright-this.uniforms.uBright.value)*i,this.uniforms.uDesat.value+=(this.targetDesat-this.uniforms.uDesat.value)*i;const n=Math.sin(e*1.05+this.phase)*.008*this.breathAmp,r=Math.sin(e*.5+this.phase*1.3)*.006*this.breathAmp;this.mesh.scale.setY(this.baseHeight*(1+n)),this.mesh.scale.setX(this.baseHeight*this.texAspect*(1-n*.4)),this.mesh.position.y=r,this.ghost&&(this.ghost.scale.copy(this.mesh.scale),this.ghost.position.y=this.mesh.position.y)}dispose(){this.disposed=!0;for(const e of this.tweens)e.kill();this.tweens.clear(),qe.killTweensOf(this.group.position),qe.killTweensOf(this.material),qe.killTweensOf(this.uniforms.uBright),this.clearGhost(),this.geometry.dispose(),this.material.dispose(),this.group.clear()}}const Bw=1.6;function Zo(s){const t=document.createElement("canvas");t.width=64,t.height=64;const i=t.getContext("2d");if(s==="streak"||s==="hairline"){const r=s==="streak"?.1:.064,a=i.createLinearGradient(64*(.5-r),0,64*(.5+r),0);a.addColorStop(0,"rgba(255,255,255,0)"),s==="streak"?(a.addColorStop(.3,"rgba(255,255,255,0.55)"),a.addColorStop(.5,"rgba(255,255,255,1)"),a.addColorStop(.7,"rgba(255,255,255,0.55)")):a.addColorStop(.5,"rgba(255,255,255,1)"),a.addColorStop(1,"rgba(255,255,255,0)"),i.fillStyle=a,i.fillRect(64*(.5-r),0,64*r*2,64),i.globalCompositeOperation="destination-in";const o=i.createLinearGradient(0,0,0,64);if(o.addColorStop(0,"rgba(255,255,255,0)"),o.addColorStop(.5,`rgba(255,255,255,${s==="streak"?.85:1})`),o.addColorStop(1,"rgba(255,255,255,0)"),i.fillStyle=o,i.fillRect(0,0,64,64),s==="hairline"){const c=document.createElement("canvas");c.width=64,c.height=64;const u=c.getContext("2d");u.filter=`blur(${Bw}px)`,u.drawImage(t,0,0);const d=new Xn(c);return d.colorSpace=yt,d}}else{const r=i.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,"rgba(255,255,255,1)"),r.addColorStop(.4,"rgba(255,255,255,0.7)"),r.addColorStop(1,"rgba(255,255,255,0)"),i.fillStyle=r,i.fillRect(0,0,64,64)}const n=new Xn(t);return n.colorSpace=yt,n}const Ya=9,ja=6,zw=2.2,_u={cx:0,cy:0,cz:0,hx:Ya,hy:ja,hz:zw},Hw={cx:0,cy:0,cz:0,hx:Ya,hy:ja,hz:.42},Gw={cx:3.05,cy:0,cz:.28,hx:.42,hy:3.5,hz:.12},Vw=1.9,Ww=1.4,vu=.9,xu=.285;class qw{group;kind="none";intensity=0;rain;rainNear;snow;dust;fog;fogMat;glass;glassMat;streakTex;hairlineTex;dotTex;neutralTex;uLight;uHasLight;uLightRes;uFigure;uFigureAmt;uInteriorA;uInteriorB;uInteriorC;uInteriorD;uInteriorSoft;uInteriorAmt;uPane;uPaneSoft;uPaneAmt;uRainWinA;uRainWinB;uRainWinSoft;uRainWinAmt;rnd=vw(_w^1374496523);tweens=new Set;amt={rain:0,snow:0,dust:0,fog:0};constructor(e){this.group=new fn,this.group.position.z=e,this.group.renderOrder=10,this.streakTex=Zo("streak"),this.hairlineTex=Zo("hairline"),this.dotTex=Zo("dot"),this.neutralTex=new Td(new Uint8Array([255,255,255,255]),1,1),this.neutralTex.needsUpdate=!0,this.uLight={value:this.neutralTex},this.uHasLight={value:0},this.uLightRes={value:new we(1920,1080)},this.uFigure={value:new je(.5,.5,.001,.001)},this.uFigureAmt={value:0},this.uInteriorA={value:new je(0,0,0,0)},this.uInteriorB={value:new je(0,0,0,0)},this.uInteriorC={value:new je(0,0,0,0)},this.uInteriorD={value:new je(0,0,0,0)},this.uInteriorSoft={value:new je(.3,.3,.3,.3)},this.uInteriorAmt={value:0},this.uPane={value:new je(0,0,1,1)},this.uPaneSoft={value:new we(.05,.05)},this.uPaneAmt={value:0},this.uRainWinA={value:new je(0,0,0,0)},this.uRainWinB={value:new je(0,0,0,0)},this.uRainWinSoft={value:new we(.04,.04)},this.uRainWinAmt={value:0},this.rain=this.buildField(360,this.streakTex,{size:.5,color:12374748,opacity:vu,additive:!1,velMin:6.5,velMax:16.5},Hw),this.patchRainMaterial(this.rain.material),this.rainNear=this.buildField(9,this.hairlineTex,{size:.92,color:13621726,opacity:xu,additive:!1,velMin:9,velMax:17},Gw),this.patchRainMaterial(this.rainNear.material),this.snow=this.buildField(240,this.dotTex,{size:.12,color:15660280,opacity:.9,additive:!1,velMin:.5,velMax:1.1},_u),this.dust=this.buildField(140,this.dotTex,{size:.09,color:15124378,opacity:.6,additive:!0,velMin:.05,velMax:.18},_u),this.group.add(this.rain.points,this.rainNear.points,this.snow.points,this.dust.points),this.fogMat=new gt({transparent:!0,depthWrite:!1,depthTest:!1,uniforms:{uTime:{value:0},uOpacity:{value:0},uColor:{value:new Pe(9414322)}},vertexShader:`
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,fragmentShader:`
        varying vec2 vUv;
        uniform float uTime; uniform float uOpacity; uniform vec3 uColor;
        float h(vec2 p){ p=fract(p*vec2(123.34,345.45)); p+=dot(p,p+34.3); return fract(p.x*p.y); }
        float n(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f);
          return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y); }
        void main(){
          vec2 uv = vUv;
          float f = n(uv*3.0 + vec2(uTime*0.02, uTime*0.01));
          f = f*0.6 + n(uv*6.0 - vec2(uTime*0.015, 0.0))*0.4;
          float band = smoothstep(0.15, 0.75, uv.y);
          float a = uOpacity * (0.35 + 0.65*f) * (0.4 + 0.6*band);
          gl_FragColor = vec4(uColor, a);
        }
      `}),this.fog=new zt(new bn(Ya*2.4,ja*2.4),this.fogMat),this.fog.position.z=-.6,this.fog.renderOrder=9,this.fog.frustumCulled=!1,this.group.add(this.fog),this.glassMat=new gt({transparent:!0,depthWrite:!1,depthTest:!1,uniforms:{uTime:{value:0},uOpacity:{value:0},uRefl:{value:new we(.78,.44)},uReflColor:{value:new Pe(15245404)},uReflAmt:{value:0},uLight:this.uLight,uHasLight:this.uHasLight,uLightRes:this.uLightRes,uFigure:this.uFigure,uFigureAmt:this.uFigureAmt,uInteriorA:this.uInteriorA,uInteriorB:this.uInteriorB,uInteriorC:this.uInteriorC,uInteriorD:this.uInteriorD,uInteriorSoft:this.uInteriorSoft,uInteriorAmt:this.uInteriorAmt,uPane:this.uPane,uPaneSoft:this.uPaneSoft,uPaneAmt:this.uPaneAmt,uRainWinA:this.uRainWinA,uRainWinB:this.uRainWinB,uRainWinSoft:this.uRainWinSoft,uRainWinAmt:this.uRainWinAmt},vertexShader:Cw,fragmentShader:Rw}),this.glass=new zt(new bn(Ya*2.4,ja*2.4),this.glassMat),this.glass.position.z=.2,this.glass.renderOrder=12,this.glass.frustumCulled=!1,this.glass.visible=!1,this.group.add(this.glass),this.setFieldOpacity(this.rain,0),this.setFieldOpacity(this.rainNear,0),this.setFieldOpacity(this.snow,0),this.setFieldOpacity(this.dust,0)}buildField(e,t,i,n){const r=new Float32Array(e*3),a=new Float32Array(e),o=new Float32Array(e),c=new Float32Array(e);for(let h=0;h<e;h++)r[h*3]=n.cx+(this.rnd()*2-1)*n.hx,r[h*3+1]=n.cy+(this.rnd()*2-1)*n.hy,r[h*3+2]=n.cz+(this.rnd()*2-1)*n.hz,a[h]=i.velMin+this.rnd()*(i.velMax-i.velMin),o[h]=this.rnd()*Math.PI*2,c[h]=this.rnd();const u=new Ai;u.setAttribute("position",new li(r,3)),u.setAttribute("aStreak",new li(c,1));const d=new Ad({map:t,size:i.size,color:i.color,transparent:!0,opacity:i.opacity,depthWrite:!1,depthTest:!1,sizeAttenuation:!0,blending:i.additive?ka:jn}),l=new Wy(u,d);return l.renderOrder=10,l.frustumCulled=!1,l.visible=!1,{points:l,material:d,positions:r,velY:a,swayPhase:o,count:e,region:n}}patchRainMaterial(e){e.onBeforeCompile=t=>{t.uniforms.uLight=this.uLight,t.uniforms.uHasLight=this.uHasLight,t.uniforms.uLightRes=this.uLightRes,t.uniforms.uFigure=this.uFigure,t.uniforms.uFigureAmt=this.uFigureAmt,t.uniforms.uInteriorA=this.uInteriorA,t.uniforms.uInteriorB=this.uInteriorB,t.uniforms.uInteriorC=this.uInteriorC,t.uniforms.uInteriorD=this.uInteriorD,t.uniforms.uInteriorSoft=this.uInteriorSoft,t.uniforms.uInteriorAmt=this.uInteriorAmt,t.uniforms.uPane=this.uPane,t.uniforms.uPaneSoft=this.uPaneSoft,t.uniforms.uPaneAmt=this.uPaneAmt,t.uniforms.uRainWinA=this.uRainWinA,t.uniforms.uRainWinB=this.uRainWinB,t.uniforms.uRainWinSoft=this.uRainWinSoft,t.uniforms.uRainWinAmt=this.uRainWinAmt,t.vertexShader=Mw+t.vertexShader.replace("gl_PointSize = size;",Tw),t.fragmentShader=Aw+t.fragmentShader.replace("outgoingLight = diffuseColor.rgb;",Ew)},e.customProgramCacheKey=()=>"pq-rain-lightfield"}setResolution(e,t){this.uLightRes.value.set(Math.max(1,e),Math.max(1,t))}setFigureMask(e,t,i,n,r){this.uFigure.value.set(e,t,Math.max(i,1e-4),Math.max(n,1e-4)),this.uFigureAmt.value=Bt.clamp(r,0,1)}setInteriorMask(e,t){const i=[this.uInteriorA,this.uInteriorB,this.uInteriorC,this.uInteriorD],n=this.uInteriorSoft.value;for(let r=0;r<i.length;r++){const a=e[r];a?(i[r].value.set(a.cx,a.cy,Math.max(a.rx,0),Math.max(a.ry,0)),n.setComponent(r,Math.max(a.soft,.02))):i[r].value.set(0,0,0,0)}this.uInteriorAmt.value=Bt.clamp(t,0,1)}setPaneMask(e,t=1){if(!e||t<=0){this.uPaneAmt.value=0;return}this.uPane.value.set(e.x0,e.y0,e.x1,e.y1),this.uPaneSoft.value.set(Math.max(e.softX,.001),Math.max(e.softY,.001)),this.uPaneAmt.value=Bt.clamp(t,0,1)}setRainWindow(e){const t=e?.amount??1;if(!e||e.ranges.length===0||t<=0){this.uRainWinAmt.value=0;return}const i=Math.max(e.softX,.001),n=Math.max(e.softY,.001);this.uRainWinSoft.value.set(i,n);const r=[this.uRainWinA,this.uRainWinB];for(let a=0;a<r.length;a++){const o=e.ranges[a];if(!o){r[a].value.set(0,0,0,0);continue}const c=o.y0??0,u=o.y1??1;r[a].value.set(o.x0<=.001?o.x0-2*i:o.x0,o.x1>=.999?o.x1+2*i:o.x1,c<=.001?c-2*n:c,u>=.999?u+2*n:u)}this.uRainWinAmt.value=Bt.clamp(t,0,1)}setLightField(e,t){this.uLight.value=e??this.neutralTex,this.uHasLight.value=e?1:0;const i=this.glassMat.uniforms;t&&t.amount>0?(i.uRefl.value.set(t.x,t.y),i.uReflColor.value.copy(t.color),i.uReflAmt.value=t.amount):i.uReflAmt.value=0}baseOpacity(e){return e===this.rain?vu:e===this.rainNear?xu:e===this.snow?.9:.6}setFieldOpacity(e,t){e.material.opacity=this.baseOpacity(e)*t,e.points.visible=t>.001}track(e){this.tweens.add(e),e.eventCallback("onComplete",()=>this.tweens.delete(e))}setWeather(e,t){this.kind=e,this.intensity=Bt.clamp(t,0,1);const i={rain:0,snow:0,dust:0,fog:0};e==="rain"?i.rain=this.intensity:e==="snow"?i.snow=this.intensity:e==="dust"?i.dust=this.intensity:e==="fog"&&(i.fog=this.intensity);for(const n of["rain","snow","dust","fog"])this.track(qe.to(this.amt,{[n]:i[n],duration:1.1,ease:"power2.inOut",onUpdate:()=>{n==="fog"?this.fogMat.uniforms.uOpacity.value=this.amt.fog*.5:this.setFieldOpacity(this[n],this.amt[n]),n==="rain"&&(this.setFieldOpacity(this.rainNear,this.amt.rain),this.glassMat.uniforms.uOpacity.value=this.amt.rain,this.glass.visible=this.amt.rain>.001)}}))}update(e,t){this.fogMat.uniforms.uTime.value=t,this.glass.visible&&(this.glassMat.uniforms.uTime.value=t),this.rain.points.visible&&this.stepRain(this.rain,Ww,e),this.rainNear.points.visible&&this.stepRain(this.rainNear,Vw,e),this.snow.points.visible&&this.stepSnow(e,t),this.dust.points.visible&&this.stepDust(e,t)}stepRain(e,t,i){const n=e.positions,r=e.region;for(let a=0;a<e.count;a++){const o=a*3,c=o+1;n[c]-=e.velY[a]*i,n[o]+=t*i,n[c]<r.cy-r.hy&&(n[c]=r.cy+r.hy,n[o]=r.cx+(this.rnd()*2-1)*r.hx),n[o]>r.cx+r.hx&&(n[o]=r.cx-r.hx)}e.points.geometry.attributes.position.needsUpdate=!0}stepSnow(e,t){const i=this.snow,n=i.positions,r=i.region;for(let a=0;a<i.count;a++){const o=a*3,c=o+1;n[c]-=i.velY[a]*e,n[o]+=Math.sin(t*.6+i.swayPhase[a])*.25*e,n[c]<r.cy-r.hy&&(n[c]=r.cy+r.hy,n[o]=r.cx+(this.rnd()*2-1)*r.hx)}i.points.geometry.attributes.position.needsUpdate=!0}stepDust(e,t){const i=this.dust,n=i.positions,r=i.region;for(let a=0;a<i.count;a++){const o=a*3,c=o+1;n[c]+=(Math.sin(t*.3+i.swayPhase[a])*.12-i.velY[a]*.3)*e,n[o]+=Math.cos(t*.25+i.swayPhase[a]*1.4)*.1*e,n[c]<r.cy-r.hy&&(n[c]=r.cy+r.hy),n[c]>r.cy+r.hy&&(n[c]=r.cy-r.hy)}i.points.geometry.attributes.position.needsUpdate=!0}dispose(){for(const e of this.tweens)e.kill();this.tweens.clear(),qe.killTweensOf(this.amt);for(const e of[this.rain,this.rainNear,this.snow,this.dust])e.points.geometry.dispose(),e.material.dispose();this.fog.geometry.dispose(),this.fogMat.dispose(),this.glass.geometry.dispose(),this.glassMat.dispose(),this.neutralTex.dispose(),this.streakTex.dispose(),this.hairlineTex.dispose(),this.dotTex.dispose(),this.group.clear()}}class Cn{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const Xw=new gd(-1,1,1,-1,0,1);class Yw extends Ai{constructor(){super(),this.setAttribute("position",new Ki([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Ki([0,2,0,0,2,0],2))}}const jw=new Yw;class kr{constructor(e){this._mesh=new zt(jw,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,Xw)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class zc extends Cn{constructor(e,t){super(),this.textureID=t!==void 0?t:"tDiffuse",e instanceof gt?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=Zi.clone(e.uniforms),this.material=new gt({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new kr(this.material)}render(e,t,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}const Kw={dissolve:0,crossfade:1,iris:2,"light-bleed":3};function Zw(s){switch(s){case"crossfade":case"fade":return"crossfade";case"iris":return"iris";case"light-bleed":case"lightbleed":case"bleed":case"chapter":return"light-bleed";case"dissolve":default:return"dissolve"}}class Qw{pass;renderer;prevRT;active=null;constructor(e,t,i,n){this.renderer=e,this.prevRT=new Ht(Math.max(1,t),Math.max(1,i),{minFilter:Dt,magFilter:Dt,type:oi,depthBuffer:!1,stencilBuffer:!1}),this.pass=new zc({name:"PQTransition",uniforms:{tDiffuse:{value:null},tPrev:{value:this.prevRT.texture},uProgress:{value:0},uActive:{value:0},uKind:{value:0},uTime:{value:0},uResolution:{value:new we(t,i)},uKey:{value:n.clone()}},vertexShader:Tf,fragmentShader:bw})}setKeyColor(e){this.pass.uniforms.uKey.value.copy(e)}update(e){this.pass.uniforms.uTime.value=e}snapshot(e,t){const i=this.renderer.getRenderTarget();this.renderer.setRenderTarget(this.prevRT),this.renderer.clear(),this.renderer.render(e,t),this.renderer.setRenderTarget(i),this.pass.uniforms.tPrev.value=this.prevRT.texture}play(e,t){const i=Zw(e),n=i==="light-bleed"?1.3:1,r=Bt.clamp(t??n,.8,1.4);this.active&&(this.active.kill(),this.active=null);const a=this.pass.uniforms;return a.uKind.value=Kw[i],a.uProgress.value=0,a.uActive.value=1,new Promise(o=>{this.active=qe.to(a.uProgress,{value:1,duration:r,ease:i==="light-bleed"?"power2.inOut":"power1.inOut",onComplete:()=>{a.uActive.value=0,a.uProgress.value=0,this.active=null,o()}})})}fxShimmer(e,t){this.snapshot(e,t),this.play("dissolve",.8)}get busy(){return this.pass.uniforms.uActive.value>.5}resize(e,t){this.prevRT.setSize(Math.max(1,e),Math.max(1,t)),this.pass.uniforms.tPrev.value=this.prevRT.texture,this.pass.uniforms.uResolution.value.set(e,t)}dispose(){this.active&&this.active.kill(),this.active=null,qe.killTweensOf(this.pass.uniforms.uProgress),this.prevRT.dispose(),this.pass.dispose()}}const Cf={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class yu extends Cn{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,i){const n=e.getContext(),r=e.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(n.REPLACE,n.REPLACE,n.REPLACE),r.buffers.stencil.setFunc(n.ALWAYS,a,4294967295),r.buffers.stencil.setClear(o),r.buffers.stencil.setLocked(!0),e.setRenderTarget(i),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(n.EQUAL,1,4294967295),r.buffers.stencil.setOp(n.KEEP,n.KEEP,n.KEEP),r.buffers.stencil.setLocked(!0)}}class Jw extends Cn{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class $w{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const i=e.getSize(new we);this._width=i.width,this._height=i.height,t=new Ht(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:oi}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new zc(Cf),this.copyPass.material.blending=Di,this.clock=new Ed}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let i=!1;for(let n=0,r=this.passes.length;n<r;n++){const a=this.passes[n];if(a.enabled!==!1){if(a.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(n),a.render(this.renderer,this.writeBuffer,this.readBuffer,e,i),a.needsSwap){if(i){const o=this.renderer.getContext(),c=this.renderer.state.buffers.stencil;c.setFunc(o.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),c.setFunc(o.EQUAL,1,4294967295)}this.swapBuffers()}yu!==void 0&&(a instanceof yu?i=!0:a instanceof Jw&&(i=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new we);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const i=this._width*this._pixelRatio,n=this._height*this._pixelRatio;this.renderTarget1.setSize(i,n),this.renderTarget2.setSize(i,n);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(i,n)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class eS extends Cn{constructor(e,t,i=null,n=null,r=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=i,this.clearColor=n,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Pe}render(e,t,i){const n=e.autoClear;e.autoClear=!1;let r,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(r=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=n}}const tS={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Pe(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class qs extends Cn{constructor(e,t,i,n){super(),this.strength=t!==void 0?t:1,this.radius=i,this.threshold=n,this.resolution=e!==void 0?new we(e.x,e.y):new we(256,256),this.clearColor=new Pe(0,0,0),this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);this.renderTargetBright=new Ht(r,a,{type:oi}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let l=0;l<this.nMips;l++){const h=new Ht(r,a,{type:oi});h.texture.name="UnrealBloomPass.h"+l,h.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(h);const f=new Ht(r,a,{type:oi});f.texture.name="UnrealBloomPass.v"+l,f.texture.generateMipmaps=!1,this.renderTargetsVertical.push(f),r=Math.round(r/2),a=Math.round(a/2)}const o=tS;this.highPassUniforms=Zi.clone(o.uniforms),this.highPassUniforms.luminosityThreshold.value=n,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new gt({uniforms:this.highPassUniforms,vertexShader:o.vertexShader,fragmentShader:o.fragmentShader}),this.separableBlurMaterials=[];const c=[3,5,7,9,11];r=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);for(let l=0;l<this.nMips;l++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(c[l])),this.separableBlurMaterials[l].uniforms.invSize.value=new we(1/r,1/a),r=Math.round(r/2),a=Math.round(a/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const u=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=u,this.bloomTintColors=[new z(1,1,1),new z(1,1,1),new z(1,1,1),new z(1,1,1),new z(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors;const d=Cf;this.copyUniforms=Zi.clone(d.uniforms),this.blendMaterial=new gt({uniforms:this.copyUniforms,vertexShader:d.vertexShader,fragmentShader:d.fragmentShader,blending:ka,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new Pe,this.oldClearAlpha=1,this.basic=new Lr,this.fsQuad=new kr(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this.basic.dispose(),this.fsQuad.dispose()}setSize(e,t){let i=Math.round(e/2),n=Math.round(t/2);this.renderTargetBright.setSize(i,n);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(i,n),this.renderTargetsVertical[r].setSize(i,n),this.separableBlurMaterials[r].uniforms.invSize.value=new we(1/i,1/n),i=Math.round(i/2),n=Math.round(n/2)}render(e,t,i,n,r){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();const a=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),r&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=i.texture,e.setRenderTarget(null),e.clear(),this.fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this.fsQuad.render(e);let o=this.renderTargetBright;for(let c=0;c<this.nMips;c++)this.fsQuad.material=this.separableBlurMaterials[c],this.separableBlurMaterials[c].uniforms.colorTexture.value=o.texture,this.separableBlurMaterials[c].uniforms.direction.value=qs.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[c]),e.clear(),this.fsQuad.render(e),this.separableBlurMaterials[c].uniforms.colorTexture.value=this.renderTargetsHorizontal[c].texture,this.separableBlurMaterials[c].uniforms.direction.value=qs.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[c]),e.clear(),this.fsQuad.render(e),o=this.renderTargetsVertical[c];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(i),this.fsQuad.render(e)),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=a}getSeperableBlurMaterial(e){const t=[];for(let i=0;i<e;i++)t.push(.39894*Math.exp(-.5*i*i/(e*e))/e);return new gt({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new we(.5,.5)},direction:{value:new we(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}getCompositeMaterial(e){return new gt({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}}qs.BlurDirectionX=new we(1,0);qs.BlurDirectionY=new we(0,1);const iS={defines:{DEPTH_PACKING:1,PERSPECTIVE_CAMERA:1},uniforms:{tColor:{value:null},tDepth:{value:null},focus:{value:1},aspect:{value:1},aperture:{value:.025},maxblur:{value:.01},nearClip:{value:1},farClip:{value:1e3}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		#include <common>

		varying vec2 vUv;

		uniform sampler2D tColor;
		uniform sampler2D tDepth;

		uniform float maxblur; // max blur amount
		uniform float aperture; // aperture - bigger values for shallower depth of field

		uniform float nearClip;
		uniform float farClip;

		uniform float focus;
		uniform float aspect;

		#include <packing>

		float getDepth( const in vec2 screenPosition ) {
			#if DEPTH_PACKING == 1
			return unpackRGBAToDepth( texture2D( tDepth, screenPosition ) );
			#else
			return texture2D( tDepth, screenPosition ).x;
			#endif
		}

		float getViewZ( const in float depth ) {
			#if PERSPECTIVE_CAMERA == 1
			return perspectiveDepthToViewZ( depth, nearClip, farClip );
			#else
			return orthographicDepthToViewZ( depth, nearClip, farClip );
			#endif
		}


		void main() {

			vec2 aspectcorrect = vec2( 1.0, aspect );

			float viewZ = getViewZ( getDepth( vUv ) );

			float factor = ( focus + viewZ ); // viewZ is <= 0, so this is a difference equation

			vec2 dofblur = vec2 ( clamp( factor * aperture, -maxblur, maxblur ) );

			vec2 dofblur9 = dofblur * 0.9;
			vec2 dofblur7 = dofblur * 0.7;
			vec2 dofblur4 = dofblur * 0.4;

			vec4 col = vec4( 0.0 );

			col += texture2D( tColor, vUv.xy );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur );

			col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur9 );

			col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur7 );

			col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.4,   0.0  ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur4 );

			gl_FragColor = col / 41.0;
			gl_FragColor.a = 1.0;

		}`};class nS extends Cn{constructor(e,t,i){super(),this.scene=e,this.camera=t;const n=i.focus!==void 0?i.focus:1,r=i.aperture!==void 0?i.aperture:.025,a=i.maxblur!==void 0?i.maxblur:1;this.renderTargetDepth=new Ht(1,1,{minFilter:At,magFilter:At,type:oi}),this.renderTargetDepth.texture.name="BokehPass.depth",this.materialDepth=new wd,this.materialDepth.depthPacking=td,this.materialDepth.blending=Di;const o=iS,c=Zi.clone(o.uniforms);c.tDepth.value=this.renderTargetDepth.texture,c.focus.value=n,c.aspect.value=t.aspect,c.aperture.value=r,c.maxblur.value=a,c.nearClip.value=t.near,c.farClip.value=t.far,this.materialBokeh=new gt({defines:Object.assign({},o.defines),uniforms:c,vertexShader:o.vertexShader,fragmentShader:o.fragmentShader}),this.uniforms=c,this.fsQuad=new kr(this.materialBokeh),this._oldClearColor=new Pe}render(e,t,i){this.scene.overrideMaterial=this.materialDepth,e.getClearColor(this._oldClearColor);const n=e.getClearAlpha(),r=e.autoClear;e.autoClear=!1,e.setClearColor(16777215),e.setClearAlpha(1),e.setRenderTarget(this.renderTargetDepth),e.clear(),e.render(this.scene,this.camera),this.uniforms.tColor.value=i.texture,this.uniforms.nearClip.value=this.camera.near,this.uniforms.farClip.value=this.camera.far,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),e.clear(),this.fsQuad.render(e)),this.scene.overrideMaterial=null,e.setClearColor(this._oldClearColor),e.setClearAlpha(n),e.autoClear=r}setSize(e,t){this.materialBokeh.uniforms.aspect.value=e/t,this.renderTargetDepth.setSize(e,t)}dispose(){this.renderTargetDepth.dispose(),this.materialDepth.dispose(),this.materialBokeh.dispose(),this.fsQuad.dispose()}}const ua={defines:{SMAA_THRESHOLD:"0.1"},uniforms:{tDiffuse:{value:null},resolution:{value:new we(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];

		void SMAAEdgeDetectionVS( vec2 texcoord ) {
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -1.0, 0.0, 0.0,  1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4(  1.0, 0.0, 0.0, -1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 2 ] = texcoord.xyxy + resolution.xyxy * vec4( -2.0, 0.0, 0.0,  2.0 ); // WebGL port note: Changed sign in W component
		}

		void main() {

			vUv = uv;

			SMAAEdgeDetectionVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];

		vec4 SMAAColorEdgeDetectionPS( vec2 texcoord, vec4 offset[3], sampler2D colorTex ) {
			vec2 threshold = vec2( SMAA_THRESHOLD, SMAA_THRESHOLD );

			// Calculate color deltas:
			vec4 delta;
			vec3 C = texture2D( colorTex, texcoord ).rgb;

			vec3 Cleft = texture2D( colorTex, offset[0].xy ).rgb;
			vec3 t = abs( C - Cleft );
			delta.x = max( max( t.r, t.g ), t.b );

			vec3 Ctop = texture2D( colorTex, offset[0].zw ).rgb;
			t = abs( C - Ctop );
			delta.y = max( max( t.r, t.g ), t.b );

			// We do the usual threshold:
			vec2 edges = step( threshold, delta.xy );

			// Then discard if there is no edge:
			if ( dot( edges, vec2( 1.0, 1.0 ) ) == 0.0 )
				discard;

			// Calculate right and bottom deltas:
			vec3 Cright = texture2D( colorTex, offset[1].xy ).rgb;
			t = abs( C - Cright );
			delta.z = max( max( t.r, t.g ), t.b );

			vec3 Cbottom  = texture2D( colorTex, offset[1].zw ).rgb;
			t = abs( C - Cbottom );
			delta.w = max( max( t.r, t.g ), t.b );

			// Calculate the maximum delta in the direct neighborhood:
			float maxDelta = max( max( max( delta.x, delta.y ), delta.z ), delta.w );

			// Calculate left-left and top-top deltas:
			vec3 Cleftleft  = texture2D( colorTex, offset[2].xy ).rgb;
			t = abs( C - Cleftleft );
			delta.z = max( max( t.r, t.g ), t.b );

			vec3 Ctoptop = texture2D( colorTex, offset[2].zw ).rgb;
			t = abs( C - Ctoptop );
			delta.w = max( max( t.r, t.g ), t.b );

			// Calculate the final maximum delta:
			maxDelta = max( max( maxDelta, delta.z ), delta.w );

			// Local contrast adaptation in action:
			edges.xy *= step( 0.5 * maxDelta, delta.xy );

			return vec4( edges, 0.0, 0.0 );
		}

		void main() {

			gl_FragColor = SMAAColorEdgeDetectionPS( vUv, vOffset, tDiffuse );

		}`},da={defines:{SMAA_MAX_SEARCH_STEPS:"8",SMAA_AREATEX_MAX_DISTANCE:"16",SMAA_AREATEX_PIXEL_SIZE:"( 1.0 / vec2( 160.0, 560.0 ) )",SMAA_AREATEX_SUBTEX_SIZE:"( 1.0 / 7.0 )"},uniforms:{tDiffuse:{value:null},tArea:{value:null},tSearch:{value:null},resolution:{value:new we(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];
		varying vec2 vPixcoord;

		void SMAABlendingWeightCalculationVS( vec2 texcoord ) {
			vPixcoord = texcoord / resolution;

			// We will use these offsets for the searches later on (see @PSEUDO_GATHER4):
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -0.25, 0.125, 1.25, 0.125 ); // WebGL port note: Changed sign in Y and W components
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4( -0.125, 0.25, -0.125, -1.25 ); // WebGL port note: Changed sign in Y and W components

			// And these for the searches, they indicate the ends of the loops:
			vOffset[ 2 ] = vec4( vOffset[ 0 ].xz, vOffset[ 1 ].yw ) + vec4( -2.0, 2.0, -2.0, 2.0 ) * resolution.xxyy * float( SMAA_MAX_SEARCH_STEPS );

		}

		void main() {

			vUv = uv;

			SMAABlendingWeightCalculationVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		#define SMAASampleLevelZeroOffset( tex, coord, offset ) texture2D( tex, coord + float( offset ) * resolution, 0.0 )

		uniform sampler2D tDiffuse;
		uniform sampler2D tArea;
		uniform sampler2D tSearch;
		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[3];
		varying vec2 vPixcoord;

		#if __VERSION__ == 100
		vec2 round( vec2 x ) {
			return sign( x ) * floor( abs( x ) + 0.5 );
		}
		#endif

		float SMAASearchLength( sampler2D searchTex, vec2 e, float bias, float scale ) {
			// Not required if searchTex accesses are set to point:
			// float2 SEARCH_TEX_PIXEL_SIZE = 1.0 / float2(66.0, 33.0);
			// e = float2(bias, 0.0) + 0.5 * SEARCH_TEX_PIXEL_SIZE +
			//     e * float2(scale, 1.0) * float2(64.0, 32.0) * SEARCH_TEX_PIXEL_SIZE;
			e.r = bias + e.r * scale;
			return 255.0 * texture2D( searchTex, e, 0.0 ).r;
		}

		float SMAASearchXLeft( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			/**
				* @PSEUDO_GATHER4
				* This texcoord has been offset by (-0.25, -0.125) in the vertex shader to
				* sample between edge, thus fetching four edges in a row.
				* Sampling with different offsets in each direction allows to disambiguate
				* which edges are active from the four fetched ones.
				*/
			vec2 e = vec2( 0.0, 1.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord -= vec2( 2.0, 0.0 ) * resolution;
				if ( ! ( texcoord.x > end && e.g > 0.8281 && e.r == 0.0 ) ) break;
			}

			// We correct the previous (-0.25, -0.125) offset we applied:
			texcoord.x += 0.25 * resolution.x;

			// The searches are bias by 1, so adjust the coords accordingly:
			texcoord.x += resolution.x;

			// Disambiguate the length added by the last step:
			texcoord.x += 2.0 * resolution.x; // Undo last step
			texcoord.x -= resolution.x * SMAASearchLength(searchTex, e, 0.0, 0.5);

			return texcoord.x;
		}

		float SMAASearchXRight( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 0.0, 1.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord += vec2( 2.0, 0.0 ) * resolution;
				if ( ! ( texcoord.x < end && e.g > 0.8281 && e.r == 0.0 ) ) break;
			}

			texcoord.x -= 0.25 * resolution.x;
			texcoord.x -= resolution.x;
			texcoord.x -= 2.0 * resolution.x;
			texcoord.x += resolution.x * SMAASearchLength( searchTex, e, 0.5, 0.5 );

			return texcoord.x;
		}

		float SMAASearchYUp( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 1.0, 0.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord += vec2( 0.0, 2.0 ) * resolution; // WebGL port note: Changed sign
				if ( ! ( texcoord.y > end && e.r > 0.8281 && e.g == 0.0 ) ) break;
			}

			texcoord.y -= 0.25 * resolution.y; // WebGL port note: Changed sign
			texcoord.y -= resolution.y; // WebGL port note: Changed sign
			texcoord.y -= 2.0 * resolution.y; // WebGL port note: Changed sign
			texcoord.y += resolution.y * SMAASearchLength( searchTex, e.gr, 0.0, 0.5 ); // WebGL port note: Changed sign

			return texcoord.y;
		}

		float SMAASearchYDown( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 1.0, 0.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord -= vec2( 0.0, 2.0 ) * resolution; // WebGL port note: Changed sign
				if ( ! ( texcoord.y < end && e.r > 0.8281 && e.g == 0.0 ) ) break;
			}

			texcoord.y += 0.25 * resolution.y; // WebGL port note: Changed sign
			texcoord.y += resolution.y; // WebGL port note: Changed sign
			texcoord.y += 2.0 * resolution.y; // WebGL port note: Changed sign
			texcoord.y -= resolution.y * SMAASearchLength( searchTex, e.gr, 0.5, 0.5 ); // WebGL port note: Changed sign

			return texcoord.y;
		}

		vec2 SMAAArea( sampler2D areaTex, vec2 dist, float e1, float e2, float offset ) {
			// Rounding prevents precision errors of bilinear filtering:
			vec2 texcoord = float( SMAA_AREATEX_MAX_DISTANCE ) * round( 4.0 * vec2( e1, e2 ) ) + dist;

			// We do a scale and bias for mapping to texel space:
			texcoord = SMAA_AREATEX_PIXEL_SIZE * texcoord + ( 0.5 * SMAA_AREATEX_PIXEL_SIZE );

			// Move to proper place, according to the subpixel offset:
			texcoord.y += SMAA_AREATEX_SUBTEX_SIZE * offset;

			return texture2D( areaTex, texcoord, 0.0 ).rg;
		}

		vec4 SMAABlendingWeightCalculationPS( vec2 texcoord, vec2 pixcoord, vec4 offset[ 3 ], sampler2D edgesTex, sampler2D areaTex, sampler2D searchTex, ivec4 subsampleIndices ) {
			vec4 weights = vec4( 0.0, 0.0, 0.0, 0.0 );

			vec2 e = texture2D( edgesTex, texcoord ).rg;

			if ( e.g > 0.0 ) { // Edge at north
				vec2 d;

				// Find the distance to the left:
				vec2 coords;
				coords.x = SMAASearchXLeft( edgesTex, searchTex, offset[ 0 ].xy, offset[ 2 ].x );
				coords.y = offset[ 1 ].y; // offset[1].y = texcoord.y - 0.25 * resolution.y (@CROSSING_OFFSET)
				d.x = coords.x;

				// Now fetch the left crossing edges, two at a time using bilinear
				// filtering. Sampling at -0.25 (see @CROSSING_OFFSET) enables to
				// discern what value each edge has:
				float e1 = texture2D( edgesTex, coords, 0.0 ).r;

				// Find the distance to the right:
				coords.x = SMAASearchXRight( edgesTex, searchTex, offset[ 0 ].zw, offset[ 2 ].y );
				d.y = coords.x;

				// We want the distances to be in pixel units (doing this here allow to
				// better interleave arithmetic and memory accesses):
				d = d / resolution.x - pixcoord.x;

				// SMAAArea below needs a sqrt, as the areas texture is compressed
				// quadratically:
				vec2 sqrt_d = sqrt( abs( d ) );

				// Fetch the right crossing edges:
				coords.y -= 1.0 * resolution.y; // WebGL port note: Added
				float e2 = SMAASampleLevelZeroOffset( edgesTex, coords, ivec2( 1, 0 ) ).r;

				// Ok, we know how this pattern looks like, now it is time for getting
				// the actual area:
				weights.rg = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.y ) );
			}

			if ( e.r > 0.0 ) { // Edge at west
				vec2 d;

				// Find the distance to the top:
				vec2 coords;

				coords.y = SMAASearchYUp( edgesTex, searchTex, offset[ 1 ].xy, offset[ 2 ].z );
				coords.x = offset[ 0 ].x; // offset[1].x = texcoord.x - 0.25 * resolution.x;
				d.x = coords.y;

				// Fetch the top crossing edges:
				float e1 = texture2D( edgesTex, coords, 0.0 ).g;

				// Find the distance to the bottom:
				coords.y = SMAASearchYDown( edgesTex, searchTex, offset[ 1 ].zw, offset[ 2 ].w );
				d.y = coords.y;

				// We want the distances to be in pixel units:
				d = d / resolution.y - pixcoord.y;

				// SMAAArea below needs a sqrt, as the areas texture is compressed
				// quadratically:
				vec2 sqrt_d = sqrt( abs( d ) );

				// Fetch the bottom crossing edges:
				coords.y -= 1.0 * resolution.y; // WebGL port note: Added
				float e2 = SMAASampleLevelZeroOffset( edgesTex, coords, ivec2( 0, 1 ) ).g;

				// Get the area for this direction:
				weights.ba = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.x ) );
			}

			return weights;
		}

		void main() {

			gl_FragColor = SMAABlendingWeightCalculationPS( vUv, vPixcoord, vOffset, tDiffuse, tArea, tSearch, ivec4( 0.0 ) );

		}`},Qo={uniforms:{tDiffuse:{value:null},tColor:{value:null},resolution:{value:new we(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 2 ];

		void SMAANeighborhoodBlendingVS( vec2 texcoord ) {
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -1.0, 0.0, 0.0, 1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4( 1.0, 0.0, 0.0, -1.0 ); // WebGL port note: Changed sign in W component
		}

		void main() {

			vUv = uv;

			SMAANeighborhoodBlendingVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform sampler2D tColor;
		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 2 ];

		vec4 SMAANeighborhoodBlendingPS( vec2 texcoord, vec4 offset[ 2 ], sampler2D colorTex, sampler2D blendTex ) {
			// Fetch the blending weights for current pixel:
			vec4 a;
			a.xz = texture2D( blendTex, texcoord ).xz;
			a.y = texture2D( blendTex, offset[ 1 ].zw ).g;
			a.w = texture2D( blendTex, offset[ 1 ].xy ).a;

			// Is there any blending weight with a value greater than 0.0?
			if ( dot(a, vec4( 1.0, 1.0, 1.0, 1.0 )) < 1e-5 ) {
				return texture2D( colorTex, texcoord, 0.0 );
			} else {
				// Up to 4 lines can be crossing a pixel (one through each edge). We
				// favor blending by choosing the line with the maximum weight for each
				// direction:
				vec2 offset;
				offset.x = a.a > a.b ? a.a : -a.b; // left vs. right
				offset.y = a.g > a.r ? -a.g : a.r; // top vs. bottom // WebGL port note: Changed signs

				// Then we go in the direction that has the maximum weight:
				if ( abs( offset.x ) > abs( offset.y )) { // horizontal vs. vertical
					offset.y = 0.0;
				} else {
					offset.x = 0.0;
				}

				// Fetch the opposite color and lerp by hand:
				vec4 C = texture2D( colorTex, texcoord, 0.0 );
				texcoord += sign( offset ) * resolution;
				vec4 Cop = texture2D( colorTex, texcoord, 0.0 );
				float s = abs( offset.x ) > abs( offset.y ) ? abs( offset.x ) : abs( offset.y );

				// WebGL port note: Added gamma correction
				C.xyz = pow(C.xyz, vec3(2.2));
				Cop.xyz = pow(Cop.xyz, vec3(2.2));
				vec4 mixed = mix(C, Cop, s);
				mixed.xyz = pow(mixed.xyz, vec3(1.0 / 2.2));

				return mixed;
			}
		}

		void main() {

			gl_FragColor = SMAANeighborhoodBlendingPS( vUv, vOffset, tColor, tDiffuse );

		}`};class sS extends Cn{constructor(e,t){super(),this.edgesRT=new Ht(e,t,{depthBuffer:!1,type:oi}),this.edgesRT.texture.name="SMAAPass.edges",this.weightsRT=new Ht(e,t,{depthBuffer:!1,type:oi}),this.weightsRT.texture.name="SMAAPass.weights";const i=this,n=new Image;n.src=this.getAreaTexture(),n.onload=function(){i.areaTexture.needsUpdate=!0},this.areaTexture=new bt,this.areaTexture.name="SMAAPass.area",this.areaTexture.image=n,this.areaTexture.minFilter=Dt,this.areaTexture.generateMipmaps=!1,this.areaTexture.flipY=!1;const r=new Image;r.src=this.getSearchTexture(),r.onload=function(){i.searchTexture.needsUpdate=!0},this.searchTexture=new bt,this.searchTexture.name="SMAAPass.search",this.searchTexture.image=r,this.searchTexture.magFilter=At,this.searchTexture.minFilter=At,this.searchTexture.generateMipmaps=!1,this.searchTexture.flipY=!1,this.uniformsEdges=Zi.clone(ua.uniforms),this.uniformsEdges.resolution.value.set(1/e,1/t),this.materialEdges=new gt({defines:Object.assign({},ua.defines),uniforms:this.uniformsEdges,vertexShader:ua.vertexShader,fragmentShader:ua.fragmentShader}),this.uniformsWeights=Zi.clone(da.uniforms),this.uniformsWeights.resolution.value.set(1/e,1/t),this.uniformsWeights.tDiffuse.value=this.edgesRT.texture,this.uniformsWeights.tArea.value=this.areaTexture,this.uniformsWeights.tSearch.value=this.searchTexture,this.materialWeights=new gt({defines:Object.assign({},da.defines),uniforms:this.uniformsWeights,vertexShader:da.vertexShader,fragmentShader:da.fragmentShader}),this.uniformsBlend=Zi.clone(Qo.uniforms),this.uniformsBlend.resolution.value.set(1/e,1/t),this.uniformsBlend.tDiffuse.value=this.weightsRT.texture,this.materialBlend=new gt({uniforms:this.uniformsBlend,vertexShader:Qo.vertexShader,fragmentShader:Qo.fragmentShader}),this.fsQuad=new kr(null)}render(e,t,i){this.uniformsEdges.tDiffuse.value=i.texture,this.fsQuad.material=this.materialEdges,e.setRenderTarget(this.edgesRT),this.clear&&e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.materialWeights,e.setRenderTarget(this.weightsRT),this.clear&&e.clear(),this.fsQuad.render(e),this.uniformsBlend.tColor.value=i.texture,this.fsQuad.material=this.materialBlend,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(),this.fsQuad.render(e))}setSize(e,t){this.edgesRT.setSize(e,t),this.weightsRT.setSize(e,t),this.materialEdges.uniforms.resolution.value.set(1/e,1/t),this.materialWeights.uniforms.resolution.value.set(1/e,1/t),this.materialBlend.uniforms.resolution.value.set(1/e,1/t)}getAreaTexture(){return"data:image/png;base64,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"}getSearchTexture(){return"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEIAAAAhCAAAAABIXyLAAAAAOElEQVRIx2NgGAWjYBSMglEwEICREYRgFBZBqDCSLA2MGPUIVQETE9iNUAqLR5gIeoQKRgwXjwAAGn4AtaFeYLEAAAAASUVORK5CYII="}dispose(){this.edgesRT.dispose(),this.weightsRT.dispose(),this.areaTexture.dispose(),this.searchTexture.dispose(),this.materialEdges.dispose(),this.materialWeights.dispose(),this.materialBlend.dispose(),this.fsQuad.dispose()}}const rS={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`
	
		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};class aS extends Cn{constructor(){super();const e=rS;this.uniforms=Zi.clone(e.uniforms),this.material=new qy({name:e.name,uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader}),this.fsQuad=new kr(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,i){this.uniforms.tDiffuse.value=i.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},Ye.getTransfer(this._outputColorSpace)===nt&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===Bu?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===zu?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===Hu?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===uc?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===Gu?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===Vu&&(this.material.defines.NEUTRAL_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}const oS=5e-4,bu=1.55,lS=.78,cS=.17,ws=(s,e=0)=>s?new z(s[0],s[1],s[2]):new z(e,e,e);class hS{composer;renderer;bloom;bokeh;grade;smaa;output;gradeU;cinematic=!0;reduced=!1;grainSetting=.5;themeGrain=1;themeBloom=.65;fieldBlur=0;shadowBridge=0;midLift=0;flashTween=null;glitchTween=null;constructor(e,t,i,n,r,a){this.renderer=e,this.composer=new $w(e),this.composer.setPixelRatio(e.getPixelRatio()),this.composer.setSize(r,a);const o=new eS(t,i);this.composer.addPass(o),this.composer.addPass(n),this.bloom=new qs(new we(r,a),.65,cS,lS),this.composer.addPass(this.bloom),this.bokeh=new nS(t,i,{focus:6.5,aperture:oS,maxblur:.009}),this.composer.addPass(this.bokeh),this.gradeU={tDiffuse:{value:null},uResolution:{value:new we(r,a).multiplyScalar(e.getPixelRatio())},uTime:{value:0},uLift:{value:ws(void 0,0)},uGamma:{value:ws(void 0,1)},uGain:{value:ws(void 0,1)},uContrast:{value:1.06},uSaturation:{value:1.03},uSplitTone:{value:.35},uVignette:{value:.32},uGrain:{value:.5},uGrainSize:{value:bu*e.getPixelRatio()},uAberration:{value:.0016},uFlash:{value:0},uGlitch:{value:0},uFocus:{value:new je(.5,.5,1,1)},uFieldBlur:{value:0},uShadowBridge:{value:0},uMidLift:{value:0}},this.grade=new zc({name:"PQGrade",uniforms:this.gradeU,vertexShader:Tf,fragmentShader:yw}),this.composer.addPass(this.grade),this.smaa=new sS(r*e.getPixelRatio(),a*e.getPixelRatio()),this.composer.addPass(this.smaa),this.output=new aS,this.composer.addPass(this.output)}setGrade(e){const t=e.grade??{};this.gradeU.uLift.value.copy(ws(t.lift,0)),this.gradeU.uGamma.value.copy(ws(t.gamma,1)),this.gradeU.uGain.value.copy(ws(t.gain,1)),this.gradeU.uContrast.value=t.contrast??1.06,this.gradeU.uSaturation.value=t.saturation??1.03,this.gradeU.uSplitTone.value=t.splitTone??.35,this.gradeU.uVignette.value=e.vignette??.32,this.themeGrain=e.grain??1,this.themeBloom=e.bloom??.65,this.bloom.strength=this.cinematic?this.themeBloom:0,this.refreshGrain()}setGrain(e){this.grainSetting=Bt.clamp(e,0,1),this.refreshGrain()}setBloom(e){this.themeBloom=e,this.bloom.strength=this.cinematic?e:0}refreshGrain(){const e=this.reduced?.5:1;this.gradeU.uGrain.value=this.cinematic?this.grainSetting*this.themeGrain*e:0}setFieldFocus(e,t,i,n,r){this.gradeU.uFocus.value.set(e,t,Math.max(i,.001),Math.max(n,.001)),this.fieldBlur=Math.max(0,r),this.gradeU.uFieldBlur.value=this.cinematic?this.fieldBlur:0}setShadowBridge(e){this.shadowBridge=Bt.clamp(e,0,1),this.gradeU.uShadowBridge.value=this.cinematic?this.shadowBridge:0}setMidLift(e){this.midLift=Bt.clamp(e,0,1),this.gradeU.uMidLift.value=this.cinematic?this.midLift:0}setFocus(e){if(!this.cinematic)return;const t=this.bokeh.materialBokeh.uniforms,i=t.focus.value;t.focus.value=i+(e-i)*.1}flash(e=.9){this.flashTween&&this.flashTween.kill(),this.gradeU.uFlash.value=Bt.clamp(e,0,1),this.flashTween=qe.to(this.gradeU.uFlash,{value:0,duration:.5,ease:"power2.out"})}glitch(e=1,t=.5){this.glitchTween&&this.glitchTween.kill(),this.gradeU.uGlitch.value=Bt.clamp(e,0,1.5),this.glitchTween=qe.to(this.gradeU.uGlitch,{value:0,duration:t,ease:"power2.out"})}update(e,t){this.gradeU.uTime.value=t}applySettings(e){this.cinematic=e.cinematic,this.reduced=e.reducedMotion,this.grainSetting=e.grain,this.bloom.enabled=e.cinematic,this.bokeh.enabled=e.cinematic,this.grade.enabled=e.cinematic,this.bloom.strength=e.cinematic?this.themeBloom:0,this.gradeU.uFieldBlur.value=e.cinematic?this.fieldBlur:0,this.gradeU.uShadowBridge.value=e.cinematic?this.shadowBridge:0,this.gradeU.uMidLift.value=e.cinematic?this.midLift:0,this.refreshGrain()}render(e){this.composer.render(e)}resize(e,t){const i=this.renderer.getPixelRatio();this.composer.setPixelRatio(i),this.composer.setSize(e,t),this.bloom.resolution.set(e,t),this.bloom.setSize(e,t),this.gradeU.uResolution.value.set(e*i,t*i),this.gradeU.uGrainSize.value=bu*i,this.smaa.setSize(e*i,t*i)}dispose(){this.flashTween&&this.flashTween.kill(),this.glitchTween&&this.glitchTween.kill(),qe.killTweensOf(this.gradeU.uFlash),qe.killTweensOf(this.gradeU.uGlitch),this.bloom.dispose(),this.bokeh.dispose(),this.grade.dispose(),this.smaa.dispose(),this.output.dispose(),this.composer.dispose()}}const uS=35,dS=6,wu=-7,Su=-1.8,Ei=-.7,fS=-1.25,Ss=1.3,pS=1.2,mS=1.1;function fa(s){const e=s.replace("#","").trim(),t=e.length===3?e.split("").map(n=>n+n).join(""):e.padEnd(6,"0").slice(0,6),i=parseInt(t,16);return{r:i>>16&255,g:i>>8&255,b:i&255}}function pa(s,e,t){return{r:Math.round(s.r+(e.r-s.r)*t),g:Math.round(s.g+(e.g-s.g)*t),b:Math.round(s.b+(e.b-s.b)*t)}}const zn=(s,e=1)=>`rgba(${s.r},${s.g},${s.b},${e})`;function pt(s,e,t){const i=Math.min(1,Math.max(0,(t-s)/(e-s)));return i*i*(3-2*i)}function gS(s,e,t,i,n){if(n<1)return;const r=e*t,a=new Float32Array(r*3);for(let l=0;l<r;l++)a[l*3]=s[l*4],a[l*3+1]=s[l*4+1],a[l*3+2]=s[l*4+2];const o=Float32Array.from(a),c=new Float32Array(r*3),u=n*2+1;for(let l=0;l<2;l++){for(let h=0;h<t;h++){const f=h*e;for(let g=0;g<3;g++){let _=0;for(let p=-n;p<=n;p++)_+=o[(f+Math.min(e-1,Math.max(0,p)))*3+g];for(let p=0;p<e;p++){c[(f+p)*3+g]=_/u;const m=Math.min(e-1,p+n+1),x=Math.max(0,p-n);_+=o[(f+m)*3+g]-o[(f+x)*3+g]}}}for(let h=0;h<e;h++)for(let f=0;f<3;f++){let g=0;for(let _=-n;_<=n;_++)g+=c[(Math.min(t-1,Math.max(0,_))*e+h)*3+f];for(let _=0;_<t;_++){o[(_*e+h)*3+f]=g/u;const p=Math.min(t-1,_+n+1),m=Math.max(0,_-n);g+=c[(p*e+h)*3+f]-c[(m*e+h)*3+f]}}}const d=1-i;for(let l=0;l<r;l++)for(let h=0;h<3;h++){const f=o[l*3+h];s[l*4+h]=f+(a[l*3+h]-f)*d}}function oc(s,e,t,i,n,r){if(i===0||n<1)return;const a=e*t,o=new Float32Array(a*3);for(let f=0;f<a;f++)o[f*3]=s[f*4],o[f*3+1]=s[f*4+1],o[f*3+2]=s[f*4+2];const c=Float32Array.from(o),u=new Float32Array(a*3),d=n*2+1;for(let f=0;f<2;f++){for(let g=0;g<t;g++){const _=g*e;for(let p=0;p<3;p++){let m=0;for(let x=-n;x<=n;x++)m+=c[(_+Math.min(e-1,Math.max(0,x)))*3+p];for(let x=0;x<e;x++)u[(_+x)*3+p]=m/d,m+=c[(_+Math.min(e-1,x+n+1))*3+p]-c[(_+Math.max(0,x-n))*3+p]}}for(let g=0;g<e;g++)for(let _=0;_<3;_++){let p=0;for(let m=-n;m<=n;m++)p+=u[(Math.min(t-1,Math.max(0,m))*e+g)*3+_];for(let m=0;m<t;m++)c[(m*e+g)*3+_]=p/d,p+=u[(Math.min(t-1,m+n+1)*e+g)*3+_]-u[(Math.max(0,m-n)*e+g)*3+_]}}const l=Math.max(1-r.soft,0),h=1+r.soft;for(let f=0;f<t;f++){const g=((f+.5)/t-r.cy)/Math.max(r.ry,1e-4);for(let _=0;_<e;_++){const p=((_+.5)/e-r.cx)/Math.max(r.rx,1e-4),m=Math.sqrt(p*p+g*g);if(m>=h)continue;const x=1+i*(1-pt(l,h,m)),y=(f*e+_)*4;for(let b=0;b<3;b++){const C=c[(f*e+_)*3+b];s[y+b]=C+(o[(f*e+_)*3+b]-C)*x}}}}const te={cx:.45,cy:.43,rLeft:.34,rRight:.5,rTop:.58,rBottom:.95,power:2.1,core:.83,rampGamma:.9,headStart:.08,headEnd:0,tailStart:.72,tailEnd:.84,vignette:.44,vignetteGamma:1,rimIn:.36,rimPeak:.66,rimOut:.95,rimAmt:.095,rimDirMin:.24,rimR:232,rimG:164,rimB:92,rimCoolIn:.63,rimCoolPeak:.87,rimCoolOut:.995,rimCoolAmt:.042,rimCoolDirMin:.22,rimCoolR:116,rimCoolG:186,rimCoolB:204,localContrast:.24,localRadius:.014,midLift:.19,softenAmt:-.34,softenRadius:.0075,softenCx:.5,softenCy:.78,softenRx:.52,softenRy:.3,softenSoft:.5,crispAmt:.34,crispRadius:.005,crispCx:.515,crispCy:.295,crispRx:.34,crispRy:.26,crispSoft:.62,shadeStart:.72,shadeEnd:.88,shadeAmt:.66,keyAmt:.46,keyR:1,keyG:.67,keyB:.36,keyDirStart:-.24,keyDirEnd:.16,keyLumIn:.1,keyLumFull:.44,keyLumRollFrom:.5,keyLumRollTo:.88,keyRoll:.74,spillAmt:.42,spillR:.63,spillG:.9,spillB:1,spillDirStart:-.34,spillDirEnd:.06,spillRiseStart:.18,spillRiseEnd:.48,spillLumIn:.06,spillLumFull:.3,spillLumRollFrom:.45,spillLumRollTo:.85,spillRoll:.72,backdropIn:.41,backdropOut:.95,backdropLeft:.72,backdropRight:.52},_S={ops_room:{ox:.179372,oy:.456608,ux:.135079,uy:.012051,vx:.009302,vy:.167982,bw:260,bh:182}},vS={ops_room:{lobes:[{cx:.19,cy:.44,rx:.27,ry:.36,soft:.34},{cx:.5,cy:.02,rx:.9,ry:.3,soft:.35},{cx:.552,cy:.235,rx:.118,ry:.225,soft:.28},{cx:.11,cy:.82,rx:.31,ry:.34,soft:.42}],amount:1}},xS={ops_room:{x0:.425,y0:.31,x1:1.06,y1:1.08,softX:.05,softY:.055}},yS={ops_room:{ranges:[{x0:.462,x1:1,y0:.492,y1:1},{x0:.678,x1:1,y0:.305,y1:1}],softX:.032,softY:.045},window_rain:{ranges:[{x0:.185,x1:1,y0:0,y1:1}],softX:.035,softY:.04},window_dawn:{ranges:[{x0:.082,x1:.122,y0:.2,y1:1},{x0:.328,x1:1,y0:0,y1:1}],softX:.028,softY:.04},memory_atrium:{ranges:[{x0:.03,x1:.78,y0:.66,y1:1},{x0:.29,x1:.49,y0:.18,y1:.58}],softX:.035,softY:.04}},bS={ops_room:{cx:.2,cy:.42,rx:.2,ry:.28,blur:.0042,bridge:.34,midLift:.45},memory_atrium:{cx:.5,cy:.5,rx:1,ry:1,blur:0,bridge:0,midLift:0}},ma=[["04-11","HOLD",!0],["04-12","OPEN",!1],["04-07","CLEAR",!1]],Mu=1.71;function wS(s,e,t,i){const{bw:n,bh:r}=e,a=P=>`rgba(186, 236, 248, ${P*Mu})`,o=P=>`rgba(238, 178, 112, ${P*Mu})`,c=Math.round(n*.05),u=Math.round(n*.05),d=n-u;s.save(),s.setTransform(e.ux*t/n,e.uy*i/n,e.vx*t/r,e.vy*i/r,e.ox*t,e.oy*i),s.beginPath(),s.rect(0,0,n,r),s.clip();const l=s.createLinearGradient(0,0,0,r);l.addColorStop(0,"rgba(7, 21, 26, 0.88)"),l.addColorStop(.6,"rgba(6, 17, 22, 0.87)"),l.addColorStop(1,"rgba(5, 13, 17, 0.9)"),s.fillStyle=l,s.fillRect(0,0,n,r);const h=n*.52,f=r*.56,g=s.createRadialGradient(h,f,2,h,f,n*.62);g.addColorStop(0,"rgba(104, 204, 218, 0.3)"),g.addColorStop(.42,"rgba(72, 162, 180, 0.11)"),g.addColorStop(1,"rgba(40, 110, 128, 0)"),s.fillStyle=g,s.fillRect(0,0,n,r);for(let P=1.5;P<r;P+=3)s.fillStyle="rgba(2, 9, 12, 0.30)",s.fillRect(0,P,n,1);s.textBaseline="alphabetic";const _=s;_.letterSpacing="0.05em",s.font='13px "JetBrains Mono", ui-monospace, monospace';const p=c+13,m=Math.round(r*.165),x=m+Math.round(r*.165),y=Math.round(r*.154),b=P=>{const B=P===0?.34:1;if(P===0?(s.shadowColor="rgba(126, 208, 226, 0.5)",s.shadowBlur=7):s.shadowBlur=0,P===1){const O=s.createLinearGradient(0,0,n,0);O.addColorStop(0,a(.05)),O.addColorStop(.7,a(.028)),O.addColorStop(1,a(.014)),s.fillStyle=O,s.fillRect(0,0,n,m)}s.textAlign="left",s.fillStyle=a(.14*B),s.fillText("LUMEN RELAY",p,m-10),s.textAlign="right",s.fillStyle=a(.115*B),s.fillText("04",d,m-10),s.fillStyle=a(.095*B),s.fillRect(0,m,n,1),ma.forEach(([O,j,V],se)=>{const ee=x+se*y;se===ma.length-1?(s.fillStyle=a(.13*B),s.fillRect(c,ee-9,3,1),s.fillRect(c,ee+1,3,1),s.fillRect(c,ee-8,1,9),s.fillRect(c+2,ee-8,1,9)):(s.fillStyle=V?o(.2*B):a(.19*B),s.fillRect(c,ee-9,3,11)),s.textAlign="left",s.fillStyle=a(.128*B),s.fillText(O,p,ee),s.textAlign="right",s.fillStyle=V?o(.15*B):a(.128*B),s.fillText(j,d,ee),se<ma.length-1&&P===1&&(s.fillStyle=a(.03),s.fillRect(p,ee+y-19,d-p,1))})};b(0),b(1),s.shadowColor="rgba(126, 208, 226, 0.5)",s.shadowBlur=7;const C=x+(ma.length-1)*y+Math.round(r*.11);s.fillStyle=a(.07),s.fillRect(0,C,n,1);const E=p,A=d-E,L=Math.round((C+r)/2),D=Math.min(18,(r-L)*.8),v=Math.max(12,Math.round(A/6.5)),S=P=>{const B=Math.sin(P*78.233+12.9898)*43758.5453;return B-Math.floor(B)};s.shadowBlur=0,s.fillStyle=a(.04),s.fillRect(E+2,L,A-4,1),s.shadowColor="rgba(126, 208, 226, 0.5)",s.shadowBlur=7;for(let P=0;P<v;P++){const B=P/(v-1),O=Math.min(1,B*5.2)*(1-.62*B**1.6),j=.34+.3*Math.abs(Math.sin(P*.9+.7))+.22*Math.abs(Math.sin(P*.41+2.3))+.14*Math.abs(Math.sin(P*1.7+5.1)),V=S(P)>.86?.42:0,se=1-.86*Math.exp(-(((B-.46)/.035)**2)),ee=Math.max(.05,O*(j+V)*se)*D;s.fillStyle=a(.05+.095*(ee/D)),s.fillRect(Math.round(E+B*(A-2)),Math.round(L-ee),2,Math.round(ee)*2)}s.shadowBlur=0,s.save(),s.beginPath(),s.moveTo(-.022*n,.205*r),s.lineTo(.189*n,-.041*r),s.lineTo(.289*n,-.041*r),s.lineTo(-.022*n,.322*r),s.closePath(),s.clip();const H=s.createLinearGradient(-.022*n,.205*r,.256*n,-.027*r);H.addColorStop(0,"rgba(246, 206, 150, 0.0)"),H.addColorStop(.42,"rgba(246, 206, 150, 0.055)"),H.addColorStop(1,"rgba(246, 206, 150, 0.012)"),s.fillStyle=H,s.fillRect(-8,-8,n+16,r+16),s.restore(),s.save(),s.translate(n/2,r/2),s.scale(1,r/n);const F=s.createRadialGradient(0,0,n*.3,0,0,n*.8);F.addColorStop(0,"rgba(2, 9, 12, 0)"),F.addColorStop(.58,"rgba(2, 9, 12, 0.12)"),F.addColorStop(1,"rgba(2, 9, 12, 0.4)"),s.fillStyle=F,s.fillRect(-n,-n,n*2,n*2),s.restore(),s.restore()}const ga=.58,SS=.8,MS={ops_room:{amount:.34,radius:.0021,cx:.175,cy:.62,rx:.19,ry:.27,soft:.35}};function TS(s){const e=SS-ga;for(let t=0;t<s.length;t+=4){const i=s[t]/255,n=s[t+1]/255,r=s[t+2]/255,a=.2126*i+.7152*n+.0722*r;if(a<=ga)continue;const c=(ga+e*(1-Math.exp(-(a-ga)/e)))/a,u=1-c;s[t]=Math.min(255,i*c*(1+u*.06)*255),s[t+1]=Math.min(255,n*c*(1-u*.01)*255),s[t+2]=Math.min(255,r*c*(1-u*.12)*255)}}function AS(s,e){const t=_S[s],i=e.image,n=Math.floor(i?.width??0),r=Math.floor(i?.height??0);if(!i||n<2||r<2)return e;const a=document.createElement("canvas");a.width=n,a.height=r;const o=a.getContext("2d");if(!o)return e;try{o.drawImage(i,0,0,n,r);const u=o.getImageData(0,0,n,r);TS(u.data);const d=MS[s];d&&oc(u.data,n,r,d.amount,Math.max(1,Math.round(n*d.radius)),d),o.putImageData(u,0,0),t&&wS(o,t,n,r)}catch{return e}const c=new Xn(a);return c.colorSpace=yt,c.needsUpdate=!0,e.dispose(),c}const _a={left:.34,right:.66,top:.34,bottom:.6},Tu={x:.12,y:.1};class cn{bus;canvas;renderer;scene;camera;clock=new Ed(!1);layerGroup=new fn;characterGroup=new fn;contactShadow;contactShadowTex;layers=[];characters=new Map;charIndex=new Map;charSeq=0;weather;transitions;postfx;bundle=null;settings={...cc};textureCache=new Map;failed=new Set;procedural=[];gradientTex=null;silhouettes=new Map;lightTex=null;width=1280;height=720;running=!1;rafId=0;hasBackground=!1;focusZ=Ei;currentParallax=.05;depthHidden=[!0,!0];framingX=0;framingY=0;figureProbe=new z;plateFocus=null;figureFocus=null;unsub=[];constructor(e,t){this.bus=e,this.canvas=t,this.measure(),this.renderer=new zy({canvas:t,antialias:!0,alpha:!1,powerPreference:"high-performance",preserveDrawingBuffer:!0,stencil:!1}),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),this.renderer.setSize(this.width,this.height,!1),this.renderer.outputColorSpace=yt,this.renderer.toneMapping=uc,this.renderer.toneMappingExposure=1,this.renderer.setClearColor(329739,1),this.scene=new Hy,this.scene.add(this.layerGroup,this.characterGroup);const i=document.createElement("canvas");i.width=256,i.height=64;const n=i.getContext("2d");if(n){const r=n.createRadialGradient(128,32,2,128,32,126);r.addColorStop(0,"rgba(4, 6, 8, 1)"),r.addColorStop(.3,"rgba(4, 6, 8, 0.93)"),r.addColorStop(.58,"rgba(4, 6, 8, 0.44)"),r.addColorStop(.82,"rgba(4, 6, 8, 0.12)"),r.addColorStop(1,"rgba(4, 6, 8, 0)"),n.fillStyle=r,n.fillRect(0,0,i.width,i.height)}this.contactShadowTex=new Xn(i),this.contactShadowTex.colorSpace=yt,this.contactShadow=new Vy(new Sd({map:this.contactShadowTex,color:329737,transparent:!0,opacity:.12,depthTest:!0,depthWrite:!1,toneMapped:!0})),this.contactShadow.position.z=Ei-.02,this.contactShadow.renderOrder=19,this.contactShadow.visible=!1,this.characterGroup.add(this.contactShadow),this.camera=new mw(this.width/this.height),this.weather=new qw(fS),this.weather.setResolution(this.width*this.renderer.getPixelRatio(),this.height*this.renderer.getPixelRatio()),this.scene.add(this.weather.group),this.scene.onBeforeRender=()=>{this.scene.overrideMaterial&&(this.depthHidden=[this.weather.group.visible,this.characterGroup.visible],this.weather.group.visible=!1,this.characterGroup.visible=!1)},this.scene.onAfterRender=()=>{this.scene.overrideMaterial&&(this.weather.group.visible=this.depthHidden[0],this.characterGroup.visible=this.depthHidden[1])},this.transitions=new Qw(this.renderer,this.width*this.renderer.getPixelRatio(),this.height*this.renderer.getPixelRatio(),new Pe(8238280)),this.postfx=new hS(this.renderer,this.scene,this.camera.camera,this.transitions.pass,this.width,this.height),this.subscribe()}subscribe(){this.unsub.push(this.bus.on("scene:bg",e=>this.onBg(e.id,e.transition)),this.bus.on("char:enter",e=>this.onCharEnter(e.char,e.from,e.pose)),this.bus.on("char:exit",e=>this.onCharExit(e.char,e.to)),this.bus.on("char:pose",e=>this.onCharPose(e.char,e.pose)),this.bus.on("char:move",e=>this.onCharMove(e.char,e.to)),this.bus.on("char:speaking",e=>this.onSpeaking(e.char)),this.bus.on("weather:set",e=>this.weather.setWeather(e.weather,e.intensity)),this.bus.on("camera:move",e=>this.camera.move(e.move,e.zoom,e.duration)),this.bus.on("fx:play",e=>this.onFx(e.effect,e.params)))}async loadStory(e){this.bundle=e,this.resetSceneState();const t=e.manifest.theme,i=fa(t.paper||"#0d1418");this.renderer.setClearColor(new Pe(i.r/255,i.g/255,i.b/255).multiplyScalar(.4).getHex(),1),this.postfx.setGrade(t),this.postfx.setGrain(this.settings.grain),this.transitions.setKeyColor(new Pe(t.key||"#7db4c8"));const n=new Set,r=new Set,a=new Map;for(const[c,u]of Object.entries(e.assets.backgrounds))u.layers.forEach((d,l)=>{d&&(n.add(d),l===0&&!a.has(d)&&a.set(d,c))});for(const c of Object.values(e.assets.characters))for(const u of Object.values(c))u&&(n.add(u),r.add(u));const o=new Ky;await Promise.allSettled([...n].map(c=>new Promise(u=>{if(this.textureCache.has(c)){u();return}o.load(c,d=>{const l=a.get(c),h=r.has(c)?this.toPresenceTexture(d):l?AS(l,d):d;h.colorSpace=yt,h.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy()),h.generateMipmaps=!0,h.minFilter=dn,h.needsUpdate=!0,this.textureCache.set(c,h),u()},void 0,()=>{this.failed.add(c),u()})}))),this.gradientTex=this.makeGradient(t)}resetSceneState(){for(const e of this.characters.values())this.characterGroup.remove(e.group),e.dispose();this.characters.clear(),this.charIndex.clear(),this.charSeq=0,this.hasBackground=!1}resolveBg(e){return this.bundle?.assets.backgrounds[e]??null}onBg(e,t){const i=this.resolveBg(e),n=[];if(i)for(const c of i.layers){const u=this.textureCache.get(c);u&&n.push(u)}const r=i?.parallax??.05;this.transitions.snapshot(this.scene,this.camera.camera);const a=n.length===0?this.gradientOrMake():n[0];this.computeFraming(a),this.applyLayers(n.length===0?[a]:n,r),this.updateLightField(a);const o=vS[e];this.weather.setInteriorMask(o?.lobes??[],o?.amount??0),this.weather.setPaneMask(xS[e]??null),this.weather.setRainWindow(yS[e]??null),this.plateFocus=bS[e]??null,this.applyFieldFocus(),this.postfx.setShadowBridge(this.plateFocus?.bridge??0),this.postfx.setMidLift(this.plateFocus?.midLift??0),this.refreshFocus(),this.transitions.play(t??(this.hasBackground?"dissolve":"crossfade")),this.hasBackground=!0}gradientOrMake(){return!this.gradientTex&&this.bundle&&(this.gradientTex=this.makeGradient(this.bundle.manifest.theme)),this.gradientTex}ensureLayers(e){for(;this.layers.length<e;){const t=new gw;this.layers.push(t),this.layerGroup.add(t.mesh)}}applyLayers(e,t){const i=e.length;this.currentParallax=t,this.ensureLayers(i);for(let n=0;n<this.layers.length;n++){const r=this.layers[n];if(n<i){const a=i>1?n/(i-1):.5,o=Bt.lerp(wu,Su,a),c=this.frustum(o);r.setTexture(e[n]),r.configure({z:o,width:c.w*Ss,height:c.h*Ss,depth:a,parallax:t,phase:n*1.73+.4,offsetX:this.framingX*c.w,offsetY:this.framingY*c.h})}else r.setTexture(null)}}static LIGHT_W=64;static LIGHT_H=36;samplePlate(e,t,i){const n=cn.LIGHT_W,r=cn.LIGHT_H,a=e?.image;if(!a)return null;try{const o=document.createElement("canvas");o.width=n,o.height=r;const c=o.getContext("2d",{willReadFrequently:!0});if(!c)return null;const u=n*Ss,d=r*Ss;return c.drawImage(a,(n-u)*.5+t*n,(r-d)*.5-i*r,u,d),c.getImageData(0,0,n,r)}catch{return null}}computeFraming(e){this.framingX=0,this.framingY=0;const t=this.samplePlate(e,0,0);if(!t)return;const i=cn.LIGHT_W,n=cn.LIGHT_H;let r=0,a=0,o=0;for(let u=0;u<n;u++)for(let d=0;d<i;d++){const l=(u*i+d)*4,h=t.data[l],f=t.data[l+1],g=t.data[l+2],_=(.2126*h+.7152*f+.0722*g)/255,p=Math.max(0,(h-g)/255)+.22,m=Math.max(0,_*_*p-.02);r+=m,a+=m*((d+.5)/i),o+=m*((u+.5)/n)}if(r<=1e-4)return;const c=(u,d,l,h)=>u<d?Math.min(d-u,h):u>l?Math.max(l-u,-h):0;this.framingX=c(a/r,_a.left,_a.right,Tu.x),this.framingY=-c(o/r,_a.top,_a.bottom,Tu.y)}updateLightField(e){const t=cn.LIGHT_W,i=cn.LIGHT_H,n=this.samplePlate(e,this.framingX,this.framingY);if(!n){this.weather.setLightField(null,null);return}const r=new Uint8Array(t*i*4);let a=-1,o=.5,c=.5;const u=new Pe(1,1,1);for(let h=0;h<i;h++){const f=i-1-h;for(let g=0;g<t;g++){const _=(f*t+g)*4,p=(h*t+g)*4,m=n.data[_],x=n.data[_+1],y=n.data[_+2];r[p]=m,r[p+1]=x,r[p+2]=y,r[p+3]=255;const b=(.2126*m+.7152*x+.0722*y)/255,C=Math.max(0,(m-y)/255)+.22,E=b*b*C;E>a&&(a=E,o=(g+.5)/t,c=(h+.5)/i,u.setRGB(m/255,x/255,y/255))}}this.lightTex?.dispose();const d=new Td(r,t,i);d.minFilter=Dt,d.magFilter=Dt,d.wrapS=qi,d.wrapT=qi,d.needsUpdate=!0,this.lightTex=d;const l=Math.max(u.r,u.g,u.b,.001);u.setRGB(u.r/l,u.g/l,u.b/l).lerp(new Pe(1,1,1),.14),this.weather.setLightField(d,{x:Bt.clamp(.5+(.5-o)*.78,.1,.9),y:Bt.clamp(c,.55,.88),color:u,amount:a>.02?.05:0})}applyFieldFocus(){const e=this.plateFocus;if(!e||e.blur<=0){this.postfx.setFieldFocus(e?.cx??.5,e?.cy??.5,e?.rx??1,e?.ry??1,0);return}const t=this.figureFocus;if(!t){this.postfx.setFieldFocus(e.cx,e.cy,e.rx,e.ry,e.blur);return}const i=t.rx*1.15,n=t.ry*1.05,r=Math.min(e.cx-e.rx,t.cx-i),a=Math.max(e.cx+e.rx,t.cx+i),o=Math.min(e.cy-e.ry,t.cy-n),c=Math.max(e.cy+e.ry,t.cy+n);this.postfx.setFieldFocus((r+a)*.5,(o+c)*.5,(a-r)*.5,(c-o)*.5,e.blur)}refreshFocus(){this.focusZ=this.averageLayerZ()}averageLayerZ(){const e=this.layers.filter(t=>t.mesh.visible);return e.length===0?-3.5:e.reduce((t,i)=>t+i.mesh.position.z,0)/e.length}charDef(e){return this.bundle?.manifest.characters[e]??null}anchorsAt(e){const t=this.frustum(e);return{left:-t.w*.166,center:0,right:t.w*.166}}charTexture(e,t){const i=this.bundle?.assets.characters[e]?.[t];if(i){const a=this.textureCache.get(i);if(a)return a}const n=this.bundle?.assets.characters[e];if(n)for(const a of Object.values(n)){const o=this.textureCache.get(a);if(o)return o}const r=this.charDef(e)?.color??this.bundle?.manifest.theme.key??"#7db4c8";return this.makeSilhouette(r)}indexFor(e){let t=this.charIndex.get(e);return t===void 0&&(t=this.charSeq++,this.charIndex.set(e,t)),t}onCharEnter(e,t,i){const n=this.charDef(e),r=i??n?.defaultPose??this.firstPose(e)??"neutral",a=this.charTexture(e,r),o=t??n?.home??"center",c=this.characters.get(e);if(c){c.setPose(a,this.settings.reducedMotion),c.moveTo(o,this.settings.reducedMotion);return}const u=this.frustum(Ei),d=new Cs({key:e,index:this.indexFor(e),tint:new Pe(n?.color??"#ffffff"),height:u.h*.72*(n?.scale??1),anchors:this.anchorsAt(Ei),worldZ:Ei},a);d.setSpeaking("neutral"),this.characters.set(e,d),this.characterGroup.add(d.group),d.enter(o,this.settings.reducedMotion),this.refreshFocus()}firstPose(e){const t=this.bundle?.manifest.characters[e]?.poses;if(!t)return null;const i=Object.keys(t);return i.length?i[0]:null}onCharExit(e,t){const i=this.characters.get(e);i&&(this.characters.delete(e),this.refreshFocus(),i.exit(t??"left",this.settings.reducedMotion).then(()=>{this.characterGroup.remove(i.group),i.dispose()}))}onCharPose(e,t){const i=this.characters.get(e);i&&i.setPose(this.charTexture(e,t),this.settings.reducedMotion)}onCharMove(e,t){this.characters.get(e)?.moveTo(t,this.settings.reducedMotion)}onSpeaking(e){for(const[t,i]of this.characters)e===null?i.setSpeaking("neutral"):i.setSpeaking(t===e?"speaker":"listener");this.refreshFocus()}onFx(e,t){switch(e){case"flash":this.postfx.flash(t.strength??.9);break;case"shake":this.camera.shake(t.intensity??1,t.duration??.4);break;case"glitch":this.postfx.glitch(t.strength??1,t.duration??.5);break;case"dissolve":this.transitions.busy||this.transitions.fxShimmer(this.scene,this.camera.camera);break}}start(){if(this.running)return;this.running=!0,this.clock.running||this.clock.start();const e=()=>{this.running&&(this.rafId=requestAnimationFrame(e),this.frame())};this.rafId=requestAnimationFrame(e)}stop(){this.running=!1,this.rafId&&cancelAnimationFrame(this.rafId),this.rafId=0,this.clock.stop()}frame(){const e=Math.min(this.clock.getDelta(),.05),t=this.clock.elapsedTime,i=this.settings.reducedMotion;this.camera.update(e,t);for(const n of this.layers)n.mesh.visible&&n.update(t,this.camera.panX,this.camera.panY,i);for(const n of this.characters.values())n.update(t,e);this.publishFigureMask(),this.weather.update(e,t),this.transitions.update(t),this.postfx.update(e,t),this.postfx.setFocus(this.camera.distanceTo(this.focusZ)),this.postfx.render(e)}publishFigureMask(){let e=null,t=0;for(const l of this.characters.values()){const h=l.presence;h>t&&(t=h,e=l)}if(!e||t<=.01){this.weather.setFigureMask(.5,.5,1e-4,1e-4,0),this.contactShadow.visible=!1,this.figureFocus&&(this.figureFocus=null,this.applyFieldFocus());return}const i=this.camera.camera;i.updateMatrixWorld(),i.matrixWorldInverse.copy(i.matrixWorld).invert();const n=e.coreBounds();this.contactShadow.visible=!0,this.contactShadow.position.set(n.x,n.y-n.hy*1.08,Ei-.02),this.contactShadow.scale.set(n.hx*1.72,n.hy*.17,1),this.contactShadow.material.opacity=.46*t;const r=this.figureProbe;r.set(n.x,n.y,Ei).project(i);const a=r.x*.5+.5,o=r.y*.5+.5;r.set(n.x+n.hx,n.y+n.hy,Ei).project(i);const c=Math.abs(r.x*.5+.5-a),u=Math.abs(r.y*.5+.5-o);this.weather.setFigureMask(a,o,c*pS,u*mS,t);const d=this.figureFocus;(!d||Math.abs(d.cx-a)>.002||Math.abs(d.cy-o)>.002||Math.abs(d.rx-c)>.004||Math.abs(d.ry-u)>.004)&&(this.figureFocus={cx:a,cy:o,rx:c,ry:u},this.applyFieldFocus())}applySettings(e){this.settings={...e},this.camera.setReducedMotion(e.reducedMotion),this.postfx.applySettings(e)}measure(){const e=this.canvas.clientWidth||window.innerWidth||1280,t=this.canvas.clientHeight||window.innerHeight||720;this.width=Math.max(1,Math.floor(e)),this.height=Math.max(1,Math.floor(t))}frustum(e){const i=2*(dS-e)*Math.tan(uS*Math.PI/180/2);return{w:i*(this.width/this.height),h:i}}resize(){this.measure();const e=Math.min(window.devicePixelRatio||1,2);this.renderer.setPixelRatio(e),this.renderer.setSize(this.width,this.height,!1),this.camera.setAspect(this.width/this.height),this.postfx.resize(this.width,this.height),this.transitions.resize(this.width*e,this.height*e),this.weather.setResolution(this.width*e,this.height*e),this.refitLayers();const t=this.frustum(Ei),i=this.anchorsAt(Ei);for(const[n,r]of this.characters){const a=this.charDef(n);r.relayout(t.h*.72*(a?.scale??1),i)}}refitLayers(){const e=this.layers.filter(i=>i.mesh.visible),t=e.length;for(let i=0;i<t;i++){const n=t>1?i/(t-1):.5,r=Bt.lerp(wu,Su,n),a=this.frustum(r);e[i].configure({z:r,width:a.w*Ss,height:a.h*Ss,depth:n,parallax:this.currentParallax,phase:i*1.73+.4,offsetX:this.framingX*a.w,offsetY:this.framingY*a.h})}}captureThumbnail(e=480,t=270){this.frame();const i=document.createElement("canvas");i.width=e,i.height=t;const n=i.getContext("2d");if(!n)return"";n.drawImage(this.renderer.domElement,0,0,e,t);try{return i.toDataURL("image/png")}catch{return""}}toPresenceTexture(e){const t=e.image,i=Math.floor(t?.width??0),n=Math.floor(t?.height??0);if(!t||i<2||n<2)return e;const r=document.createElement("canvas");r.width=i,r.height=n;const a=r.getContext("2d");if(!a)return e;a.drawImage(t,0,0,i,n);let o;try{o=a.getImageData(0,0,i,n)}catch{return e}const c=o.data;gS(c,i,n,te.localContrast,Math.max(1,Math.round(i*te.localRadius))),oc(c,i,n,te.softenAmt,Math.max(1,Math.round(i*te.softenRadius)),{cx:te.softenCx,cy:te.softenCy,rx:te.softenRx,ry:te.softenRy,soft:te.softenSoft}),oc(c,i,n,te.crispAmt,Math.max(1,Math.round(i*te.crispRadius)),{cx:te.crispCx,cy:te.crispCy,rx:te.crispRx,ry:te.crispRy,soft:te.crispSoft});const u=1/te.power;for(let l=0;l<n;l++){const h=(l+.5)/n,f=h-te.cy,g=Math.abs(f/(f<0?te.rTop:te.rBottom))**te.power,_=pt(te.headEnd,te.headStart,h)*(1-pt(te.tailStart,te.tailEnd,h)),p=.5+.5*(1-pt(.26,.7,h)),m=1-te.shadeAmt*pt(te.shadeStart,te.shadeEnd,h),x=pt(te.spillRiseStart,te.spillRiseEnd,h),y=l*i*4;for(let b=0;b<i;b++){const E=(b+.5)/i-te.cx,L=(Math.abs(E/(E<0?te.rLeft:te.rRight))**te.power+g)**u,D=(1-pt(te.core,1,L))**te.rampGamma*_;if(D<=0){c[y+b*4+3]=0;continue}const v=y+b*4,S=1-pt(te.keyDirStart,te.keyDirEnd,E),H=1-pt(te.spillDirStart,te.spillDirEnd,E),F=(.2126*c[v]+.7152*c[v+1]+.0722*c[v+2])/255;let P=0,B=0;if((S>0||H*x>0)&&m>0){if(S>0){const Y=pt(te.keyLumIn,te.keyLumFull,F)*(1-te.keyRoll*pt(te.keyLumRollFrom,te.keyLumRollTo,F));P=te.keyAmt*S*Y*D*m}if(H>0&&x>0){const Y=pt(te.spillLumIn,te.spillLumFull,F)*(1-te.spillRoll*pt(te.spillLumRollFrom,te.spillLumRollTo,F));B=te.spillAmt*H*x*Y*D*m}}const O=te.backdropRight+(te.backdropLeft-te.backdropRight)*(1-pt(-.1,.3,E)),j=m*(1+te.midLift*4*F*(1-F))*(1-te.vignette*(1-D)**te.vignetteGamma)*(1-O*pt(te.backdropIn,te.backdropOut,L)),V=pt(te.rimIn,te.rimPeak,D)*(1-pt(te.rimPeak,te.rimOut,D)),se=te.rimDirMin+(1-te.rimDirMin)*(1-pt(-.12,.18,E)),ee=te.rimAmt*V*se*p*m,ce=pt(te.rimCoolIn,te.rimCoolPeak,D)*(1-pt(te.rimCoolPeak,te.rimCoolOut,D)),Ie=te.rimCoolDirMin+(1-te.rimCoolDirMin)*pt(-.2,.12,E),Oe=te.rimCoolAmt*ce*Ie*m;c[v]=Math.min(255,c[v]*j*(1+P*te.keyR+B*te.spillR)+ee*te.rimR+Oe*te.rimCoolR),c[v+1]=Math.min(255,c[v+1]*j*(1+P*te.keyG+B*te.spillG)+ee*te.rimG+Oe*te.rimCoolG),c[v+2]=Math.min(255,c[v+2]*j*(1+P*te.keyB+B*te.spillB)+ee*te.rimB+Oe*te.rimCoolB),c[v+3]*=D}}a.putImageData(o,0,0);const d=new Xn(r);return d.colorSpace=yt,d.needsUpdate=!0,e.dispose(),d}makeGradient(e){const n=document.createElement("canvas");n.width=1280,n.height=720;const r=n.getContext("2d"),a=fa(e.paper||"#0d1418"),o=fa(e.key||"#7db4c8"),c=pa(a,{r:0,g:0,b:0},.55),u=pa(a,o,.4),d=r.createLinearGradient(0,0,0,720);d.addColorStop(0,zn(u)),d.addColorStop(.5,zn(a)),d.addColorStop(1,zn(c)),r.fillStyle=d,r.fillRect(0,0,1280,720);const l=r.createRadialGradient(1280*.68,720*.32,20,1280*.68,720*.32,720*.9);l.addColorStop(0,zn(pa(a,o,.5),.35)),l.addColorStop(1,zn(a,0)),r.fillStyle=l,r.fillRect(0,0,1280,720);const h=r.createRadialGradient(1280/2,720/2,720*.35,1280/2,720/2,720*.95);h.addColorStop(0,"rgba(0,0,0,0)"),h.addColorStop(1,"rgba(0,0,0,0.5)"),r.fillStyle=h,r.fillRect(0,0,1280,720);const f=new Xn(n);return f.colorSpace=yt,f.needsUpdate=!0,this.procedural.push(f),f}makeSilhouette(e){const t=this.silhouettes.get(e);if(t)return t;const i=600,n=900,r=document.createElement("canvas");r.width=i,r.height=n;const a=r.getContext("2d"),o=fa(e);a.save(),a.filter="blur(6px)",a.fillStyle=zn(o,.55),a.beginPath(),a.ellipse(i/2,n*.26,i*.17,n*.15,0,0,Math.PI*2),a.fill(),a.beginPath(),a.moveTo(i*.5-i*.18,n*.42),a.bezierCurveTo(i*.16,n*.5,i*.1,n*.72,i*.14,n),a.lineTo(i*.86,n),a.bezierCurveTo(i*.9,n*.72,i*.84,n*.5,i*.5+i*.18,n*.42),a.bezierCurveTo(i*.6,n*.36,i*.4,n*.36,i*.5-i*.18,n*.42),a.closePath(),a.fill(),a.restore();const c=a.createLinearGradient(i*.3,0,i,0);c.addColorStop(0,"rgba(255,255,255,0)"),c.addColorStop(1,zn(pa(o,{r:255,g:255,b:255},.6),.25)),a.globalCompositeOperation="source-atop",a.fillStyle=c,a.fillRect(0,0,i,n),a.globalCompositeOperation="source-over";const u=new Xn(r);return u.colorSpace=yt,u.needsUpdate=!0,this.silhouettes.set(e,u),this.procedural.push(u),u}dispose(){this.stop();for(const e of this.unsub)e();this.unsub.length=0;for(const e of this.characters.values())e.dispose();this.characters.clear();for(const e of this.layers)this.layerGroup.remove(e.mesh),e.dispose();this.layers.length=0,this.weather.dispose(),this.transitions.dispose(),this.postfx.dispose();for(const e of this.textureCache.values())e.dispose();this.textureCache.clear();for(const e of this.procedural)e.dispose();this.procedural.length=0,this.silhouettes.clear(),this.gradientTex=null,this.lightTex?.dispose(),this.lightTex=null,this.contactShadow.material.dispose(),this.contactShadowTex.dispose(),this.camera.dispose(),this.scene.clear(),this.renderer.dispose()}}function T(s,e={},t=[]){const i=document.createElement(s);if(e.class!==void 0&&(i.className=e.class),e.id!==void 0&&(i.id=e.id),e.text!==void 0&&(i.textContent=String(e.text)),e.html!==void 0&&(i.innerHTML=e.html),e.title!==void 0&&(i.title=e.title),e.role!==void 0&&i.setAttribute("role",e.role),e.type!==void 0&&i.setAttribute("type",e.type),e.href!==void 0&&i.setAttribute("href",e.href),e.name!==void 0&&i.setAttribute("name",e.name),e.tabIndex!==void 0&&(i.tabIndex=e.tabIndex),e.hidden!==void 0&&(i.hidden=e.hidden),e.value!==void 0){const n=String(e.value);i instanceof HTMLInputElement||i instanceof HTMLTextAreaElement?i.value=n:i.setAttribute("value",n)}if(e.disabled&&(i.setAttribute("disabled",""),i.setAttribute("aria-disabled","true")),e.style!==void 0&&(typeof e.style=="string"?i.style.cssText=e.style:Object.assign(i.style,e.style)),e.attrs)for(const[n,r]of Object.entries(e.attrs))r==null||r===!1||i.setAttribute(n,r===!0?"":String(r));if(e.data)for(const[n,r]of Object.entries(e.data))i.dataset[n]=String(r);if(e.aria)for(const[n,r]of Object.entries(e.aria))i.setAttribute(`aria-${n}`,String(r));if(e.on)for(const[n,r]of Object.entries(e.on))i.addEventListener(n,r);return ES(i,t),i}function ES(s,e){const t=Array.isArray(e)?e:[e];for(const i of t)i==null||i===!1||s.appendChild(i instanceof Node?i:document.createTextNode(String(i)))}function kt(s){for(;s.firstChild;)s.removeChild(s.firstChild)}const Jo=new Set([" ",`
`,"	","(","[","{","—","–","‘","“"," "]);function Tn(s){if(!s)return s;const e=s.replace(/---/g,"—").replace(/--/g,"—").replace(/\.[ \u00a0\u2009\u202f]+\.[ \u00a0\u2009\u202f]+\./g,"…").replace(/\.{3,}/g,i=>i.length>=4?"….":"…").replace(/…(?=[A-Za-z0-9‘“(])/g,"… ");let t="";for(let i=0;i<e.length;i++){const n=e[i];if(n!=="'"&&n!=='"'){t+=n;continue}const r=i>0?e[i-1]:"",a=i+1<e.length?e[i+1]:"";if(n==="'"){const o=/[A-Za-z0-9]/.test(r),c=/[A-Za-z0-9]/.test(a);o&&c?t+="’":!o&&c&&(r===""||Jo.has(r))?t+=/'/.test(e.slice(i+1))?"‘":"’":t+=r===""||Jo.has(r)?"‘":"’";continue}t+=r===""||Jo.has(r)?"“":"”"}return t}function Rf(s,e="pq-ic"){return T("span",{class:e,html:s,aria:{hidden:!0}})}function hr(s){const e=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s.trim());if(!e)return null;let t=e[1];t.length===3&&(t=t[0]+t[0]+t[1]+t[1]+t[2]+t[2]);const i=parseInt(t,16);return`${i>>16&255} ${i>>8&255} ${i&255}`}function CS(s){if(!s)return"";const e=new Date(s);if(Number.isNaN(e.getTime()))return"";const i=Date.now()-e.getTime(),n=6e4,r=60*n,a=24*r;return i<n?"just now":i<r?`${Math.floor(i/n)} min ago`:i<a&&e.getDate()===new Date().getDate()?e.toLocaleTimeString(void 0,{hour:"numeric",minute:"2-digit"}):e.toLocaleDateString(void 0,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}function Au(){return!(typeof matchMedia=="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches)}function Eu(s){return Array.from(s.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(t=>t.offsetParent!==null||t===document.activeElement)}function es(s,e={onClose:()=>{}}){const t=T("h2",{class:"pq-modal__title",text:s}),i=e.kicker?T("span",{class:"pq-modal__kicker",text:e.kicker,aria:{hidden:!0}}):null,n=T("div",{class:"pq-modal__body"}),r=T("button",{class:"pq-modal__close",type:"button",html:Tt.close,aria:{label:"Close"},on:{click:e.onClose}}),a=T("div",{class:e.wide?"pq-modal__panel pq-modal__panel--wide":"pq-modal__panel",role:"document",tabIndex:-1},[T("header",{class:"pq-modal__head"},[T("div",{class:"pq-modal__titles"},[i,t]),r]),n]),o=T("div",{class:"pq-modal__defocus",aria:{hidden:!0}}),c=T("div",{class:"pq-modal",role:"dialog",hidden:!0,aria:{modal:"true",label:s},on:{click:u=>{u.target===c&&e.onClose()}}},[o,a]);return{overlay:c,panel:a,body:n,setTitle(u){t.textContent=u,c.setAttribute("aria-label",u)}}}const pi=s=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${s}</svg>`,Tt={menu:pi('<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>'),close:pi('<path d="M6 6l12 12"/><path d="M18 6L6 18"/>'),save:pi('<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4"/><rect x="8" y="13" width="8" height="6" rx="1"/>'),load:pi('<path d="M4 7h5l2 2h9v9a2 2 0 0 1-2 2H4z"/><path d="M4 7V5h4l2 2"/>'),settings:pi('<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M18.5 5.5L17 7M7 17l-1.5 1.5"/>'),backlog:pi('<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/>'),home:pi('<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>'),trash:pi('<path d="M5 7h14"/><path d="M9 7V5h6v2"/><path d="M7 7l1 12h8l1-12"/>'),chevron:pi('<path d="M6 9l6 6 6-6"/>'),play:pi('<path d="M8 5l11 7-11 7z"/>'),spark:pi('<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/>'),quill:pi('<path d="M4 20c6-2 8-6 12-14 2 4 0 9-4 11-2 1-5 2-8 3z"/><path d="M4 20l4-4"/>')},va=34,RS=220;function PS(s){const e=Math.sin(s*78.233+12.9898)*43758.5453;return e-Math.floor(e)}class LS{root;labelEl;timerEl;callerEl;levelEl;bars=[];startedAt=0;tick=0;trace=0;frame=0;live=!1;constructor(e){this.labelEl=T("span",{class:"pq-callstrip__label",text:"line standby"}),this.timerEl=T("span",{class:"pq-callstrip__timer",text:"00:00"}),this.callerEl=T("span",{class:"pq-callstrip__caller",text:"board clear"}),this.levelEl=T("span",{class:"pq-callstrip__level",text:"0.00"});for(let t=0;t<va;t++)this.bars.push(T("i"));this.root=T("aside",{class:"pq-callstrip",aria:{hidden:!0},hidden:!0},[T("span",{class:"pq-callstrip__glass"}),T("div",{class:"pq-callstrip__head"},[T("span",{class:"pq-callstrip__dot"}),this.labelEl,T("span",{class:"pq-callstrip__sep",text:"·"}),this.callerEl,this.timerEl]),T("div",{class:"pq-callstrip__line"},[T("span",{class:"pq-callstrip__gauge",text:"carrier"}),T("span",{class:"pq-callstrip__wave"},this.bars),this.levelEl])]),e.appendChild(this.root),this.paintTrace()}paintTrace(){const e=this.frame,t=this.live?1:.34;let i=0;for(let r=0;r<va;r++){const a=r/(va-1),o=.5+.28*Math.sin(r*.72-e*.31)+.18*Math.sin(r*.29+e*.17+1.7),c=PS(r*3.1+e)>.9?.34:0,u=Math.min(1,a*7)*Math.min(1,(1-a)*7),d=Math.max(.08,(.16+.7*o+c)*t*u);i+=d,this.bars[r].style.setProperty("--h",d.toFixed(3))}const n=Math.min(.99,i/va*1.15);this.levelEl.textContent=n.toFixed(2)}get reducedMotion(){return document.documentElement.dataset.pqMotion==="reduced"}reset(){this.live=!1,this.startedAt=performance.now(),this.frame=0,this.root.classList.remove("is-live"),this.labelEl.textContent="line standby",this.callerEl.textContent="board clear",this.timerEl.textContent="00:00",this.refresh(),this.paintTrace()}connect(e){this.callerEl.textContent=e,!this.live&&(this.live=!0,this.startedAt=performance.now(),this.root.classList.add("is-live"),this.labelEl.textContent="line open",this.refresh(),this.paintTrace())}setVisible(e){e!==!this.root.hidden&&(this.root.hidden=!e,e?(this.startedAt||(this.startedAt=performance.now()),this.refresh(),this.tick=window.setInterval(()=>this.refresh(),1e3),this.reducedMotion||(this.trace=window.setInterval(()=>{this.frame+=1,this.paintTrace()},RS)),requestAnimationFrame(()=>this.root.classList.add("is-in"))):(this.root.classList.remove("is-in"),this.stopTick()))}refresh(){const e=Math.max(0,Math.floor((performance.now()-this.startedAt)/1e3)),t=String(Math.floor(e/60)%100).padStart(2,"0"),i=String(e%60).padStart(2,"0");this.timerEl.textContent=`${t}:${i}`}stopTick(){this.tick&&window.clearInterval(this.tick),this.tick=0,this.trace&&window.clearInterval(this.trace),this.trace=0}destroy(){this.stopTick(),this.root.remove()}}class DS{root;nameEl;bodyEl;tailEl;tailText;continueEl;full="";tailAt=0;schedule=[];startTime=0;raf=0;typing=!1;revealed=0;onDone=null;constructor(e){this.nameEl=T("div",{class:"pq-dialogue__name",aria:{hidden:!0}}),this.bodyEl=T("p",{class:"pq-dialogue__body"}),this.continueEl=T("span",{class:"pq-continue",aria:{hidden:!0}}),this.tailText=document.createTextNode(""),this.tailEl=T("span",{class:"pq-dialogue__tail"}),this.tailEl.append(this.tailText,this.continueEl),this.root=T("div",{class:"pq-dialogue",role:"group",aria:{label:"Dialogue",live:"polite"},hidden:!0},[T("div",{class:"pq-dialogue__scrim",aria:{hidden:!0}}),T("div",{class:"pq-dialogue__inner"},[this.nameEl,T("div",{class:"pq-dialogue__text"},[this.bodyEl,this.tailEl])])]),e.appendChild(this.root)}get textElement(){return this.bodyEl}isTyping(){return this.typing}isVisible(){return!this.root.hidden}show(e,t,i,n){this.stopRaf();const r=Tn(t);this.full=r,this.tailAt=kS(r),this.onDone=n??null,this.root.hidden=!1,this.root.classList.remove("is-done"),this.continueEl.classList.remove("is-shown");const a=e?e.name:i.narrator??"";if(this.root.classList.toggle("is-narration",!e),this.nameEl.textContent=a,this.nameEl.hidden=a.length===0,i.instant||i.speed<=0){this.paint(r.length),this.typing=!1,this.revealed=r.length,this.markDone(!0);return}this.schedule=US(r,i.speed),this.revealed=0,this.paint(0),this.typing=!0,this.startTime=performance.now(),this.raf=requestAnimationFrame(this.tick)}tick=e=>{const t=e-this.startTime;let i=this.revealed;for(;i<this.schedule.length&&this.schedule[i]<=t;)i++;if(i!==this.revealed&&(this.revealed=i,this.paint(i)),i>=this.full.length){this.typing=!1,this.markDone(!0);return}this.raf=requestAnimationFrame(this.tick)};skip(){!this.typing&&this.revealed>=this.full.length||(this.stopRaf(),this.typing=!1,this.revealed=this.full.length,this.paint(this.full.length),this.markDone(!1))}paint(e){const t=Math.min(e,this.tailAt);this.bodyEl.textContent=this.full.slice(0,t),this.tailText.data=e>this.tailAt?this.full.slice(this.tailAt,e):""}clear(){this.stopRaf(),this.typing=!1,this.full="",this.tailAt=0,this.revealed=0,this.paint(0),this.nameEl.textContent="",this.nameEl.hidden=!0,this.continueEl.classList.remove("is-shown"),this.root.classList.remove("is-done"),this.root.hidden=!0}markDone(e){this.root.classList.add("is-done"),this.continueEl.classList.add("is-shown");const t=this.onDone;this.onDone=null,t&&t(e)}stopRaf(){this.raf&&cancelAnimationFrame(this.raf),this.raf=0}destroy(){this.stopRaf(),this.root.remove()}}const IS=26;function kS(s){const e=s.trimEnd(),t=e.lastIndexOf(" ");if(t<=0)return 0;const i=e.lastIndexOf(" ",t-1);return i>0&&e.length-i-1<=IS?i+1:t+1}function US(s,e){const t=1e3/Math.max(1,e),i=new Array(s.length);let n=0,r=0;for(let a=0;a<s.length;a++){const o=s[a];let c=OS(o)?t*.4:t;a<6&&(c*=1.6-a*.1),a===s.length-1&&Cu(o)>0&&(c*=.15),n+=c+r,i[a]=n,r=Cu(o)*t}return i}function OS(s){return s===" "||s===" "}function Cu(s){return s===","||s===";"||s===":"?2.2:s==="."||s==="!"||s==="?"||s==="…"?5:s==="—"||s==="-"?1.4:0}class NS{root;listEl;offEl;labelEl;tiles=[];constructor(e){this.listEl=T("div",{class:"pq-proxy__list",role:"list"}),this.offEl=T("div",{class:"pq-proxy__off"}),this.labelEl=T("div",{class:"pq-proxy__label",text:"PROXY RESPONSE"}),this.root=T("section",{class:"pq-proxy",role:"group",aria:{label:"Lumen — suggested responses"},hidden:!0},[T("div",{class:"pq-proxy__glow",aria:{hidden:!0}}),T("div",{class:"pq-proxy__glass",aria:{hidden:!0}}),T("header",{class:"pq-proxy__head"},[T("div",{class:"pq-proxy__brand"},[T("span",{class:"pq-proxy__mark",html:Tt.spark}),T("span",{class:"pq-proxy__name",text:"LUMEN"}),T("span",{class:"pq-proxy__tag",text:"PROXY"})]),T("div",{class:"pq-proxy__status"},[T("span",{class:"pq-proxy__dot",aria:{hidden:!0}}),T("span",{text:"channel open"})])]),T("div",{class:"pq-proxy__telemetry",aria:{hidden:!0}},[T("div",{class:"pq-meter pq-meter--vocal"},[T("span",{class:"pq-meter__label",text:"VOCAL"}),T("div",{class:"pq-proxy__wave"},FS(40)),T("span",{class:"pq-meter__val",text:"0.2"})]),$o("AFFECT",.6,"+0.1"),$o("RECEPTIVITY",.8,"0.8"),$o("COHERENCE",.5,"0.5")]),this.labelEl,this.listEl,this.offEl]),e.appendChild(this.root)}isOpen(){return!this.root.hidden}show(e,t){kt(this.listEl),kt(this.offEl),this.tiles=new Array(e.length),e.forEach((n,r)=>{if(n.kind==="offscript"){const a=this.buildOffscript(n,r,t);this.tiles[r]=a,this.offEl.appendChild(a)}else{const a=this.buildSuggested(n,r,t);this.tiles[r]=a,this.listEl.appendChild(a)}});const i=e.every(n=>n.kind==="suggested"||n.kind==="offscript");return this.labelEl.textContent=i?"PROXY RESPONSE":"RESPONSE",this.root.classList.remove("is-choosing"),this.root.hidden=!1,requestAnimationFrame(()=>this.root.classList.add("is-in")),this.tiles}buildSuggested(e,t,i){const n=e.kind==="suggested";return T("button",{class:"pq-tile pq-tile--suggested"+(n?"":" pq-tile--neutral"),type:"button",role:"listitem",style:`--pq-i:${t}`,aria:{keyshortcuts:String(t+1)},on:{click:()=>i(t)}},[T("span",{class:"pq-tile__num",text:t+1,aria:{hidden:!0}}),T("span",{class:"pq-tile__scan",aria:{hidden:!0}}),T("span",{class:"pq-tile__text",text:Tn(e.text)}),n?T("span",{class:"pq-tile__cue",text:"suggested",aria:{hidden:!0}}):null])}buildOffscript(e,t,i){return T("button",{class:"pq-tile pq-tile--offscript",type:"button",style:`--pq-i:${t}`,aria:{keyshortcuts:String(t+1)},on:{click:()=>i(t)}},[T("span",{class:"pq-tile__quill",html:Tt.quill,aria:{hidden:!0}}),T("span",{class:"pq-tile__off"},[T("span",{class:"pq-tile__offlabel",text:"say your own words"}),T("span",{class:"pq-tile__text",text:Tn(e.text)})]),T("span",{class:"pq-tile__num pq-tile__num--off",text:t+1,aria:{hidden:!0}})])}hide(){this.root.hidden=!0,this.root.classList.remove("is-in","is-choosing"),kt(this.listEl),kt(this.offEl),this.tiles=[]}destroy(){this.root.remove()}}function $o(s,e,t){return T("div",{class:"pq-meter"},[T("span",{class:"pq-meter__label",text:s}),T("span",{class:"pq-meter__track"},[T("span",{class:"pq-meter__fill",style:`--v:${Math.round(e*100)}%`})]),T("span",{class:"pq-meter__val",text:t})])}function FS(s){const e=[];for(let t=0;t<s;t++){const i=t/Math.max(1,s-1),n=Math.sin(Math.PI*i)**.72,r=.28+.72*Math.abs(Math.sin(t*.71+.42)),a=.52+.48*Math.abs(Math.sin(t*2.17+1.3)*Math.cos(t*1.09+.6)),o=Math.min(1,Math.max(.08,n*r*a));e.push(T("span",{class:"pq-wave__bar",style:`--d:${t%7*90+t%3*41}ms;--h:${Math.round(24+o*72)}%;--i:${Math.round(10+o*24)}%`}))}return e}class BS{root;listEl;rows=[];constructor(e){this.listEl=T("div",{class:"pq-choices__list",role:"list"}),this.root=T("section",{class:"pq-choices",role:"group",aria:{label:"Choices"},hidden:!0},[this.listEl]),e.appendChild(this.root)}isOpen(){return!this.root.hidden}show(e,t){return kt(this.listEl),this.rows=e.map((i,n)=>{const r=T("button",{class:"pq-choice",type:"button",role:"listitem",style:`--pq-i:${n}`,aria:{keyshortcuts:String(n+1)},on:{click:()=>t(n)}},[T("span",{class:"pq-choice__num",text:n+1,aria:{hidden:!0}}),T("span",{class:"pq-choice__text",text:Tn(i.text)})]);return this.listEl.appendChild(r),r}),this.root.classList.remove("is-choosing"),this.root.hidden=!1,requestAnimationFrame(()=>this.root.classList.add("is-in")),this.rows}hide(){this.root.hidden=!0,this.root.classList.remove("is-in","is-choosing"),kt(this.listEl),this.rows=[]}destroy(){this.root.remove()}}class zS{root;overline;titleEl;subEl;count=0;open=!1;constructor(e){this.overline=T("div",{class:"pq-chapter__over",aria:{hidden:!0}}),this.titleEl=T("h2",{class:"pq-chapter__title"}),this.subEl=T("p",{class:"pq-chapter__sub"}),this.root=T("div",{class:"pq-chapter",role:"group",aria:{label:"Chapter",live:"polite"},hidden:!0},[T("div",{class:"pq-chapter__bleed",aria:{hidden:!0}}),T("div",{class:"pq-chapter__inner"},[this.overline,T("div",{class:"pq-chapter__rule",aria:{hidden:!0}}),this.titleEl,T("div",{class:"pq-chapter__rule pq-chapter__rule--under",aria:{hidden:!0}}),this.subEl]),T("div",{class:"pq-chapter__more",aria:{hidden:!0}},[T("i"),T("i")])]),e.appendChild(this.root)}isOpen(){return this.open}show(e,t,i){this.open=!0,this.count=i&&i>0?i:this.count+1,this.overline.textContent=`Chapter ${HS(this.count)}`,this.titleEl.textContent=Tn(e),this.subEl.textContent=t?Tn(t):"",this.subEl.hidden=!t,this.root.hidden=!1,this.root.classList.remove("is-in"),this.root.offsetWidth,this.root.classList.add("is-in")}hide(){if(this.root.hidden)return;this.open=!1,this.root.classList.remove("is-in"),this.root.classList.add("is-out");const e=()=>{this.root.hidden=!0,this.root.classList.remove("is-out"),this.root.removeEventListener("transitionend",t)},t=i=>{i.target===this.root&&i.propertyName==="opacity"&&e()};this.root.addEventListener("transitionend",t),window.setTimeout(e,640)}reset(){this.count=0}destroy(){this.root.remove()}}function HS(s){const e=[[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];let t="",i=s;for(const[n,r]of e)for(;i>=n;)t+=r,i-=n;return t||"I"}function GS(s){const e=s.trim();return e.startsWith("(")&&e.endsWith(")")||e.startsWith("—")&&e.endsWith("—")}const VS=168,WS=22,qS=3*60+11,XS=900;function YS(s){const e=(qS+s)%1440,t=String(Math.floor(e/60)).padStart(2,"0"),i=String(e%60).padStart(2,"0");return`${t}:${i}`}class jS{overlay;panel;body;scroll;cue;rail;thumb;entries=[];railTimer=null;constructor(e,t){const i=es("History",{onClose:t,kicker:"Transcript"});this.overlay=i.overlay,this.panel=i.panel,this.body=i.body,this.overlay.classList.add("pq-modal--offset"),this.body.classList.add("pq-modal__body--flush"),this.scroll=T("div",{class:"pq-backlog",tabIndex:0,aria:{label:"Transcript"}}),this.scroll.addEventListener("scroll",()=>{this.syncFades(),this.wakeRail()},{passive:!0}),this.body.appendChild(this.scroll),this.thumb=T("div",{class:"pq-backlog__thumb"}),this.rail=T("div",{class:"pq-backlog__rail",aria:{hidden:!0}},[this.thumb]),this.body.appendChild(this.rail),this.cue=Rf(Tt.chevron,"pq-backlog__cue"),this.panel.appendChild(this.cue),this.overlay.insertBefore(T("div",{class:"pq-modal__rain",aria:{hidden:!0}}),this.panel),e.appendChild(this.overlay)}wakeRail(){this.rail.dataset.active="1",this.railTimer!==null&&window.clearTimeout(this.railTimer),this.railTimer=window.setTimeout(()=>{this.railTimer=null,this.rail.dataset.active="0"},XS)}push(e){this.entries.push(e),this.overlay.hidden||this.appendRow(e,this.entries.length-1,!0)}reset(){this.entries=[],kt(this.scroll),this.syncFades()}render(){if(kt(this.scroll),this.entries.length===0){this.scroll.appendChild(T("p",{class:"pq-backlog__empty",text:"The night is still ahead of you."})),this.syncFades();return}this.entries.forEach((e,t)=>this.appendRow(e,t,!1)),requestAnimationFrame(()=>{this.scroll.scrollTop=this.scroll.scrollHeight,this.syncFades()})}syncFades(){const e=this.scroll.scrollHeight>this.scroll.clientHeight+2;this.scroll.dataset.empty=this.entries.length===0?"1":"0";const t=this.scroll.scrollTop>6,i=!e||this.scroll.scrollTop+this.scroll.clientHeight>=this.scroll.scrollHeight-6;this.scroll.dataset.overflow=e?"1":"0",this.scroll.dataset.top=t?"1":"0",this.scroll.dataset.end=i?"1":"0",this.cue.dataset.end=i?"1":"0",this.cue.dataset.overflow=e?"1":"0",this.rail.dataset.overflow=e?"1":"0",this.syncHeadFade(t);const n=this.scroll.clientHeight,r=Math.max(this.scroll.scrollHeight,1),a=Math.min(.32,n/r),o=r>n?this.scroll.scrollTop/(r-n):0;this.thumb.style.height=`${(a*100).toFixed(2)}%`,this.thumb.style.top=`${(o*(1-a)*100).toFixed(2)}%`}syncHeadFade(e){const t=this.scroll.style;if(!e){t.setProperty("--fade-start","0px"),t.setProperty("--fade-top","0px");return}const i=this.scroll.scrollTop;let n=0;for(const a of Array.from(this.scroll.children)){const o=a.offsetTop-i;if(o>=0){n=o;break}}const r=Math.min(Math.max(n-WS,0),VS);t.setProperty("--fade-start",`${(n-r).toFixed(1)}px`),t.setProperty("--fade-top",`${n.toFixed(1)}px`)}markLatest(){const e=this.scroll.querySelectorAll(".pq-backlog__row");e.forEach((t,i)=>t.classList.toggle("is-latest",i===e.length-1))}appendRow(e,t,i){const n=e.name===null,r=e.kind==="offscript",a=T("div",{class:"pq-backlog__row"+(n?" is-narration":"")+(n&&GS(e.text)?" is-stage":"")+(r?" is-offscript":e.kind?" is-reply":"")});n||(e.color&&a.style.setProperty("--pq-name",e.color),a.appendChild(T("span",{class:"pq-backlog__name",text:e.name??""}))),a.appendChild(T("span",{class:"pq-backlog__time",text:YS(t)})),a.appendChild(T("p",{class:"pq-backlog__line",text:Tn(e.text)})),this.scroll.appendChild(a),this.markLatest(),i&&(this.scroll.scrollTop=this.scroll.scrollHeight),this.syncFades()}destroy(){this.railTimer!==null&&window.clearTimeout(this.railTimer),this.railTimer=null,this.overlay.remove()}}const el=6,KS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" aria-hidden="true"><path d="M12 5.6v12.8"/><path d="M5.6 12h12.8"/></svg>';class hn{overlay;panel;body;setTitle;host;onAfterAction;hintAction;count;mode="save";constructor(e,t,i,n){this.host=t,this.onAfterAction=n;const r=es("Save",{wide:!0,onClose:i,kicker:"Slots"});this.overlay=r.overlay,this.panel=r.panel,this.body=r.body,this.setTitle=r.setTitle,this.panel.classList.add("pq-modal__panel--slots"),this.body.classList.add("pq-modal__body--slots"),this.hintAction=hn.hintLabel("Save"),this.count=T("span",{class:"pq-modal__count"}),this.panel.appendChild(T("div",{class:"pq-modal__foot"},[T("div",{class:"pq-hints"},[hn.hint("Tab",hn.hintLabel("Slot")),hn.hint("Enter",this.hintAction),hn.hint("Esc",hn.hintLabel("Back"))]),this.count])),e.appendChild(this.overlay)}static hint(e,t){return T("span",{class:"pq-hint"},[T("span",{class:"pq-hint__k",text:e,aria:{hidden:!0}}),t])}static hintLabel(e){return T("span",{class:"pq-hint__l",text:e})}open(e){this.mode=e,this.setTitle(e==="save"?"Save":"Load"),this.hintAction.textContent=e==="save"?"Save":"Load",this.render()}render(){kt(this.body);const e=new Map;for(const n of this.host.listSaves())e.set(n.slot,n);let t=0;for(let n=1;n<=el;n++)if(this.mode==="save"?!e.has(n):e.has(n)){t=n;break}const i=T("div",{class:"pq-slots"});for(let n=1;n<=el;n++)i.appendChild(this.buildSlot(n,e.get(n),n===t));this.body.appendChild(i),this.count.textContent=`${e.size} / ${el} used`}buildSlot(e,t,i){const n=!!t,r=this.mode==="load"&&!n,a=T("div",{class:"pq-slot__thumb",aria:{hidden:!0}});t?.thumbnail?a.appendChild(T("img",{attrs:{src:t.thumbnail,alt:""},class:"pq-slot__img"})):(a.classList.add("is-empty"),a.appendChild(T("span",{class:"pq-slot__art",aria:{hidden:!0}})),a.appendChild(T("span",{class:"pq-slot__mark",html:Tt.spark,aria:{hidden:!0}})),a.appendChild(T("span",{class:"pq-slot__ph"},[this.mode==="save"?T("span",{class:"pq-slot__plus",html:KS,aria:{hidden:!0}}):null,T("span",{class:"pq-slot__phtext",text:this.mode==="save"?"New save":"Empty"})])));const o=T("div",{class:"pq-slot__meta"},[T("div",{class:"pq-slot__row"},[T("span",{class:"pq-slot__idx",text:`Slot ${e}`,aria:{hidden:!0}}),t?T("span",{class:"pq-slot__when",text:CS(t.savedAt)}):null]),T("span",{class:n?"pq-slot__story":"pq-slot__story is-blank",text:t?t.storyTitle:"Empty"}),T("span",{class:"pq-slot__field"},[T("span",{class:"pq-slot__cap",text:"Chapter",aria:{hidden:!0}}),t?.label?T("span",{class:"pq-slot__label",text:t.label}):T("span",{class:"pq-slot__blank",aria:{hidden:!0}})])]),c=T("button",{class:"pq-slot"+(n?" is-filled":" is-empty")+(i&&!r?" is-cursor":""),type:"button",disabled:r,aria:{label:(this.mode==="save"?"Save to slot ":"Load slot ")+e+(t?`, ${t.storyTitle}, ${t.label}`:", empty")},on:{click:()=>this.onSlotAction(e,n)}},[a,o]),u=T("div",{class:"pq-slot__wrap"},[c]);return n&&u.appendChild(T("button",{class:"pq-iconbtn pq-slot__del",type:"button",html:Tt.trash,title:"Delete save",aria:{label:`Delete slot ${e}`},on:{click:d=>{d.stopPropagation(),this.host.deleteSlot(e),this.render()}}})),u}onSlotAction(e,t){this.mode==="save"?(this.host.saveToSlot(e),this.render()):t&&(this.host.loadFromSlot(e),this.onAfterAction())}destroy(){this.overlay.remove()}}class ZS{overlay;panel;body;scroll;cue;host;commit;current;selfEdit=!1;entering=!1;enterTimer=0;constructor(e,t,i,n){this.host=t,this.commit=n,this.current={...t.getSettings()};const r=es("Settings",{onClose:i,kicker:"Preferences"});this.overlay=r.overlay,this.panel=r.panel,this.body=r.body,this.panel.classList.add("pq-modal__panel--set"),this.overlay.classList.add("pq-modal--set"),this.body.classList.add("pq-modal__body--flush"),this.scroll=T("div",{class:"pq-set"}),this.scroll.addEventListener("scroll",()=>this.syncFades(),{passive:!0}),this.body.appendChild(this.scroll),this.cue=Rf(Tt.chevron,"pq-set__cue"),this.panel.appendChild(T("div",{class:"pq-set__rail"},[this.cue,T("button",{class:"pq-set__reset",type:"button",text:"Reset to defaults",on:{click:()=>this.resetDefaults()}})])),e.appendChild(this.overlay)}open(){this.current={...this.host.getSettings()},this.entering=!0,this.render(),window.clearTimeout(this.enterTimer),this.enterTimer=window.setTimeout(()=>{this.entering=!1},1200)}sync(e){this.current={...e},!this.selfEdit&&(this.overlay.hidden||this.render())}change(e){this.current={...this.current,...e},this.selfEdit=!0;try{this.commit(this.current)}finally{this.selfEdit=!1}}render(){kt(this.scroll),this.scroll.classList.toggle("is-entering",this.entering);const e=this.current,t=(i,n)=>T("section",{class:"pq-set__group"},[T("h3",{class:"pq-set__grouptitle",text:i}),T("div",{class:"pq-set__rows"},n)]);for(const i of[t("Text",[this.slider("Text speed",e.textSpeed,0,100,5,n=>this.change({textSpeed:n}),n=>n<=0?{n:"Instant"}:{n:String(n),unit:"cps"}),this.toggle("Auto-advance",e.autoAdvance,n=>this.change({autoAdvance:n}),"Advance dialogue automatically once a line finishes.")]),t("Audio",[this.slider("Master volume",xa(e.masterVolume),0,100,1,n=>this.change({masterVolume:n/100}),ya),this.slider("Music",xa(e.musicVolume),0,100,1,n=>this.change({musicVolume:n/100}),ya),this.slider("Effects",xa(e.sfxVolume),0,100,1,n=>this.change({sfxVolume:n/100}),ya)]),t("Visuals",[this.toggle("Cinematic",e.cinematic,n=>this.change({cinematic:n}),"Bloom, depth of field and per-story color grade."),this.slider("Film grain",xa(e.grain),0,100,1,n=>this.change({grain:n/100}),ya),this.toggle("Reduced motion",e.reducedMotion,n=>this.change({reducedMotion:n}),"Calms camera drift, shake and heavy motion."),this.toggle("Fullscreen",e.fullscreen,n=>this.onFullscreen(n))])])this.scroll.appendChild(i);this.syncFades(),requestAnimationFrame(()=>this.syncFades())}syncFades(){const e=this.scroll.scrollHeight>this.scroll.clientHeight+8,t=!e||this.scroll.scrollTop+this.scroll.clientHeight>=this.scroll.scrollHeight-6;this.scroll.dataset.overflow=e?"1":"0",this.scroll.dataset.top=this.scroll.scrollTop>6?"1":"0",this.scroll.dataset.end=t?"1":"0",this.cue.dataset.end=t?"1":"0"}onFullscreen(e){try{e&&!document.fullscreenElement?document.documentElement.requestFullscreen?.():!e&&document.fullscreenElement&&document.exitFullscreen?.()}catch{}this.change({fullscreen:e})}slider(e,t,i,n,r,a,o){const c=g=>`${(g-i)/(n-i)*100}%`,u=QS(o(t)),d=T("span",{class:"pq-range__fill",aria:{hidden:!0}}),l=T("span",{class:"pq-range__rail",aria:{hidden:!0}},[d]),h=T("input",{class:"pq-range",type:"range",aria:{label:e},attrs:{min:i,max:n,step:r,value:t},on:{input:g=>{const _=Number(g.target.value);Pf(u,o(_)),f.style.setProperty("--pq-fill",c(_)),a(_)}}}),f=T("div",{class:"pq-range-wrap"},[l,h]);return f.style.setProperty("--pq-fill",c(t)),T("div",{class:"pq-field pq-field--slider"},[T("div",{class:"pq-field__head"},[T("label",{class:"pq-field__label",text:e})]),T("div",{class:"pq-field__track"},[f,u])])}toggle(e,t,i,n){const r=T("span",{class:"pq-switch__knob",aria:{hidden:!0}}),a=T("button",{class:"pq-switch"+(t?" is-on":""),type:"button",role:"switch",aria:{checked:t?"true":"false",label:e},on:{click:()=>{const o=!a.classList.contains("is-on");a.classList.toggle("is-on",o),a.setAttribute("aria-checked",o?"true":"false"),i(o)}}},[r]);return T("div",{class:"pq-field pq-field--toggle"},[T("div",{class:"pq-field__copy"},[T("span",{class:"pq-field__label",text:e}),n?T("span",{class:"pq-field__hint",text:n}):null]),a])}resetDefaults(){this.current={...cc},this.selfEdit=!0;try{this.commit(this.current)}finally{this.selfEdit=!1}this.render()}destroy(){window.clearTimeout(this.enterTimer),this.overlay.remove()}}function xa(s){return Math.round(s*100)}function ya(s){return{n:String(s),unit:"%"}}function QS(s){const e=T("span",{class:"pq-field__val"});return Pf(e,s),e}function Pf(s,e){kt(s),s.appendChild(T("span",{class:"pq-field__num",text:e.n})),e.unit&&s.appendChild(T("span",{class:e.unit==="%"?"pq-field__unit pq-field__unit--tight":"pq-field__unit",text:e.unit}))}const JS=3;class $S{root;railEl;menuEl;plateEl;haloEl;picker;pickerCount;h;stories=[];featured=0;constructor(e,t,i){this.h=i,this.railEl=T("div",{class:"pq-rail",role:"list",aria:{label:"Stories"}}),this.menuEl=T("nav",{class:"pq-title__menu",aria:{label:"Main menu"}});const n=r=>T("img",{class:r,attrs:{alt:"",decoding:"async"},on:{error:a=>a.currentTarget.hidden=!0}});this.plateEl=n("pq-title__plate"),this.haloEl=n("pq-title__halo"),this.root=T("div",{class:"pq-title",role:"region",aria:{label:"Title screen"},hidden:!0},[T("div",{class:"pq-title__bg",aria:{hidden:!0}},[this.plateEl,this.haloEl,T("div",{class:"pq-title__scrim"}),T("div",{class:"pq-title__vignette"}),T("div",{class:"pq-title__dither"})]),T("div",{class:"pq-title__inner"},[T("div",{class:"pq-title__lead"},[T("h1",{class:"pq-title__word"},[T("span",{class:"pq-title__word-a",text:"Lamp"}),T("span",{class:"pq-title__word-b",text:"lighter"})]),T("p",{class:"pq-title__tag",text:"A cinematic narrative quest — you are the voice between the machine and the night."}),this.menuEl])]),T("div",{class:"pq-title__stamp",aria:{hidden:!0},text:"Lamplighter · build 0.1.0"}),T("div",{class:"pq-title__grain",aria:{hidden:!0}})]),e.appendChild(this.root),this.picker=es("Choose a story",{onClose:()=>this.h.closeModal(),kicker:"Library"}),this.picker.overlay.classList.add("pq-modal--picker"),this.pickerCount=T("span",{class:"pq-picker__count"}),this.picker.body.appendChild(T("div",{class:"pq-picker"},[T("div",{class:"pq-picker__head"},[T("span",{class:"pq-picker__eyebrow",text:"Stories"}),this.pickerCount]),this.railEl])),t.appendChild(this.picker.overlay)}isVisible(){return!this.root.hidden}show(e){this.stories=e,this.featured=0,this.renderMenu(),this.renderRail(),this.applyBackdrop(),this.root.hidden=!1,this.root.classList.remove("is-in"),this.root.offsetWidth,this.root.classList.add("is-in")}hide(){this.root.classList.remove("is-in"),this.root.hidden=!0}refresh(){this.root.hidden||this.renderMenu()}applyBackdrop(){const e=this.stories[this.featured],t=e?this.h.backdropUrl(e.id)??this.h.coverUrl(e.id):void 0;for(const i of[this.plateEl,this.haloEl])t?(i.getAttribute("src")!==t&&i.setAttribute("src",t),i.hidden=!1):(i.removeAttribute("src"),i.hidden=!0);this.root.classList.toggle("has-art",!!t)}renderMenu(){kt(this.menuEl);const e=[this.menuItem("New Story",()=>this.newStory(),!0)];this.h.hasContinue()&&e.push(this.menuItem("Continue",()=>this.h.onContinue())),this.h.canCreate()&&e.push(this.menuItem("Create a Story",()=>this.h.onCreate())),e.push(this.menuItem("Load",()=>this.h.onLoad()),this.menuItem("Settings",()=>this.h.onSettings()),this.menuItem("About",()=>this.h.onAbout()));for(const t of e)this.menuEl.appendChild(t)}newStory(){if(this.stories.length>1||this.h.canCreate()){this.renderRail(),this.h.openModal(this.picker.overlay,this.picker.panel);return}const e=this.stories[this.featured]??this.stories[0];e&&this.h.onStart(e.id)}menuItem(e,t,i=!1){return T("button",{class:"pq-menuitem"+(i?" is-primary":""),type:"button",on:{click:t}},[T("span",{class:"pq-menuitem__label",text:e})])}renderRail(){if(kt(this.railEl),this.pickerCount.textContent=`${this.stories.length} available`,this.stories.forEach((t,i)=>{this.railEl.appendChild(this.buildCard(t,i))}),this.h.canCreate()){this.railEl.classList.add("has-lock"),this.railEl.appendChild(this.buildCreateCard());return}const e=Math.max(0,JS-this.stories.length);this.railEl.classList.toggle("has-lock",e>0),e>0&&this.railEl.appendChild(this.buildLockedSlot(e))}buildCreateCard(){return T("button",{class:"pq-storycard pq-storycard--create",type:"button",role:"listitem",aria:{label:"Write a new story"},on:{click:()=>{this.h.closeModal(),this.h.onCreate()}}},[T("div",{class:"pq-storycard__art",aria:{hidden:!0}},[T("span",{class:"pq-storycard__mark",html:Tt.quill,aria:{hidden:!0}}),T("div",{class:"pq-storycard__grade"}),T("div",{class:"pq-storycard__spark"}),T("div",{class:"pq-storycard__grain"}),T("div",{class:"pq-storycard__glow"})]),T("div",{class:"pq-storycard__body"},[T("h3",{class:"pq-storycard__title",text:"Write a new one"}),T("p",{class:"pq-storycard__sub",text:"A premise, a few minutes, a story that plays like any other."}),T("div",{class:"pq-storycard__foot"},[T("span",{class:"pq-storycard__cta"},[T("span",{class:"pq-storycard__ctalabel",text:"Create"})])])])])}buildLockedSlot(e){return T("div",{class:"pq-lockslot",aria:{hidden:!0}},[T("span",{class:"pq-lockslot__idx",text:`${e} ${e===1?"slot":"slots"}`}),T("span",{class:"pq-lockslot__state"},[T("span",{class:"pq-lockslot__lock",aria:{hidden:!0}}),T("span",{class:"pq-lockslot__word",text:"Locked"})])])}buildCard(e,t){const i=e.theme,n=this.h.coverUrl(e.id),r=n?T("img",{class:"pq-storycard__img",attrs:{src:n,alt:"",decoding:"async"},on:{error:c=>c.currentTarget.remove()}}):null,a=T("div",{class:"pq-storycard__art"+(n?" has-cover":""),aria:{hidden:!0}},[r,T("div",{class:"pq-storycard__grade"}),T("div",{class:"pq-storycard__spark"}),T("div",{class:"pq-storycard__grain"}),T("div",{class:"pq-storycard__glow"})]);return T("button",{class:"pq-storycard"+(t===this.featured?" is-featured":""),type:"button",role:"listitem",style:eM(i.key,i.accent,i.paper,i.ink),aria:{label:`Start ${e.title}${e.subtitle?" — "+e.subtitle:""}`},on:{click:()=>{this.h.closeModal(),this.h.onStart(e.id)},focus:()=>this.setFeatured(t),mouseenter:()=>this.setFeatured(t)}},[a,T("div",{class:"pq-storycard__body"},[T("h3",{class:"pq-storycard__title",text:e.title}),e.subtitle?T("p",{class:"pq-storycard__sub",text:Tn(e.subtitle)}):null,T("div",{class:"pq-storycard__foot"},[e.author?T("span",{class:"pq-storycard__author",text:e.author}):null,T("span",{class:"pq-storycard__cta"},[T("span",{class:"pq-storycard__ctalabel",text:"Begin"})])])])])}setFeatured(e){if(this.featured===e)return;this.featured=e,this.railEl.querySelectorAll(".pq-storycard").forEach((i,n)=>i.classList.toggle("is-featured",n===e)),this.applyBackdrop()}focusFirst(){this.menuEl.querySelector("button:not([disabled])")?.focus()}destroy(){this.picker.overlay.remove(),this.root.remove()}}function eM(s,e,t,i){const n=hr(s)??"125 180 200",r=hr(e)??"224 164 107",a=hr(t)??"13 20 24",o=hr(i)??"232 238 242";return`--k:${n};--a:${r};--p:${a};--n:${o}`}const tM=["gemini","xai","openai-compatible","anthropic","mock"],Ru={gemini:"Gemini",xai:"xAI","openai-compatible":"OpenAI",anthropic:"Anthropic",mock:"Mock"},iM={gemini:"Gemini",xai:"xAI","openai-compatible":"The OpenAI-compatible endpoint",anthropic:"Anthropic",mock:"Mock"},nM=[{value:"short",label:"Short"},{value:"standard",label:"Standard"},{value:"long",label:"Long"}],sM=["A lighthouse keeper's last night before the light goes automatic.","Two archivists, one file that should not exist, forty minutes before the building is sealed.","A night-bus driver who recognises a passenger from a photograph they were never supposed to see."],Pu=8,tl=2e3,rM=64,il={plan:"Reading your premise…",draft:"Writing the story…",validate:"Checking the script…",repair:"Fixing a few loose ends…",write:"Saving the story…",art:"Painting…",done:"Ready."},Lu=[{stages:["plan"],label:"PLAN"},{stages:["draft"],label:"WRITE"},{stages:["validate","repair"],label:"CHECK"},{stages:["write"],label:"SAVE"},{stages:["art"],label:"PAINT"}],aM={no_provider:{heading:"No writer is configured",body:()=>"Add a key to .env.local and restart the dev server. Gemini needs GEMINI_KEY; xAI needs XAI_API_KEY; Anthropic needs ANTHROPIC_API_KEY. You can pick Mock under Advanced to try the flow offline.",actions:["use_mock","close"]},proxy:{heading:"Couldn't reach the writer",body:s=>s.message,actions:["retry","close"]},network:{heading:"Couldn't reach the writer",body:s=>s.message,actions:["retry","close"]},tls:{heading:"Couldn't verify the connection",body:()=>"The certificate chain wasn't trusted. If you're behind a corporate proxy, set NODE_EXTRA_CA_CERTS to its CA bundle and restart the dev server.",actions:["retry","close"]},provider_auth:{heading:"The key was rejected",body:s=>`${iM[s.provider]} returned 401. Check the key in .env.local and restart.`,actions:["close"]},provider_rate_limit:{heading:"The writer is rate-limited",body:()=>"Wait a minute, or pick a different provider under Advanced.",actions:["retry","close"]},provider_refused:{heading:"The writer declined this premise",body:()=>"It wouldn't write from this prompt. Try a different angle — the same story from another character, or a less literal version of the same idea.",actions:["edit","close"]},invalid_output:{heading:"The draft didn't hold together",body:()=>"We asked twice more and it still didn't fit the format. Your premise is untouched — try again, or nudge it toward a smaller cast.",actions:["retry","edit"]},invalid_json:{heading:"The draft didn't hold together",body:()=>"We asked twice more and it still didn't fit the format. Your premise is untouched — try again, or nudge it toward a smaller cast.",actions:["retry","edit"]},disk:{heading:"Could not save the story",body:s=>`${s.message} Check that stories/ is writable.`,actions:["retry","close"]},id_conflict:{heading:"Could not save the story",body:s=>`${s.message} Check that stories/ is writable.`,actions:["retry","close"]},timeout:{heading:"The writer took too long",body:()=>"Nothing was saved. Try Short under length, or a faster model under Advanced.",actions:["retry","close"]}},oM={heading:"Something went wrong",body:s=>s.message||"The request could not be completed.",actions:["retry","close"]};class lM{overlay;panel;h;formWrap;resultWrap;premiseEl;countEl;titleEl;modelEl;generateBtn;lengthBtns=[];providerBtns=[];advancedDisc=null;length="standard";art=!1;provider="gemini";view="form";submitting=!1;jobId=null;localAbort=null;startedAt=0;currentStage="plan";currentStageMessage="";heard=null;assetProgress=null;notes=[];readyInfo=null;doneInfo=null;failure=null;timerHandle=0;timerEl=null;constructor(e,t){this.h=t;const i=es("Create a Story",{onClose:()=>this.h.close(),kicker:"New"});this.overlay=i.overlay,this.panel=i.panel,this.overlay.classList.add("pq-modal--create"),this.panel.classList.add("pq-modal__panel--create");const n=this.h.health();this.provider=n?.defaultProvider??"gemini",this.art=!!n?.art.available;const r=this.buildForm(n);this.formWrap=r.root,this.premiseEl=r.premise,this.countEl=r.count,this.titleEl=r.title,this.modelEl=r.model,this.generateBtn=r.generate,this.resultWrap=T("div",{class:"pq-create__result-wrap",hidden:!0}),i.body.classList.add("pq-create"),i.body.append(this.formWrap,this.resultWrap),e.appendChild(this.overlay)}open(){this.view==="form"&&requestAnimationFrame(()=>requestAnimationFrame(()=>this.premiseEl.focus())),this.renderResult()}destroy(){this.stopTimer(),this.localAbort?.abort(),this.overlay.remove()}buildForm(e){const t=(C,E,A)=>T("div",{class:"pq-create__row"},[T("span",{class:"pq-create__label",text:C}),E,A??null]),i=T("span",{class:"pq-create__count",text:`0 / ${tl}`}),n=T("textarea",{class:"pq-create__field",attrs:{rows:4,maxlength:tl,placeholder:"A place, a person, and something they have to decide before morning."},aria:{label:"Premise"},on:{input:()=>{this.syncCount(),this.syncGenerateEnabled()}}}),r=T("div",{class:"pq-create__examples"},sM.map(C=>T("button",{class:"pq-create__chip",type:"button",text:cM(C),title:C,on:{click:()=>{n.value=C,n.focus(),this.syncCount(),this.syncGenerateEnabled()}}}))),a=T("input",{class:"pq-create__field pq-create__field--line",type:"text",attrs:{maxlength:rM,placeholder:"Leave blank and the story names itself."},aria:{label:"Title (optional)"}}),o=T("div",{class:"pq-create__seg",role:"radiogroup",aria:{label:"Length"}});for(const C of nM){const E=T("button",{class:"pq-create__segbtn"+(C.value===this.length?" is-active":""),type:"button",role:"radio",aria:{checked:C.value===this.length?"true":"false"},text:C.label,on:{click:()=>this.setLength(C.value)}});this.lengthBtns.push({value:C.value,btn:E}),o.appendChild(E)}const c=!!e?.art.available,u=T("span",{class:"pq-switch__knob",aria:{hidden:!0}}),d=T("button",{class:"pq-switch"+(this.art?" is-on":""),type:"button",role:"switch",disabled:!c,aria:{checked:this.art?"true":"false",label:"Paint the art"},on:{click:()=>{c&&(this.art=!this.art,d.classList.toggle("is-on",this.art),d.setAttribute("aria-checked",this.art?"true":"false"))}}},[u]),l=T("div",{class:"pq-field pq-field--toggle"},[T("div",{class:"pq-field__copy"},[T("span",{class:"pq-field__label",text:"Paint the art"}),c?null:T("span",{class:"pq-field__hint",text:"Set GEMINI_KEY in .env.local to paint art. Stories play without it, on themed placeholders."})]),d]),h=T("div",{class:"pq-create__seg",role:"radiogroup",aria:{label:"Provider"}}),f=tM.filter(C=>C==="mock"||!!e?.providers[C]?.configured);f.includes(this.provider)||(this.provider=f[0]??"mock");for(const C of f){const E=T("button",{class:"pq-create__segbtn"+(C===this.provider?" is-active":""),type:"button",role:"radio",aria:{checked:C===this.provider?"true":"false"},text:Ru[C],on:{click:()=>this.setProvider(C,e)}});this.providerBtns.push({value:C,btn:E}),h.appendChild(E)}const g=T("input",{class:"pq-create__field pq-create__field--line",type:"text",attrs:{maxlength:80,placeholder:e?.providers[this.provider]?.defaultModel??""},aria:{label:"Model"}}),_=T("div",{class:"pq-create__discbody pq-create__advgrid"},[t("Provider",h),t("Model",g)]),p=this.buildDisclosure("Advanced",_);this.advancedDisc=p;const m=T("button",{class:"pq-btn",type:"button",text:"Generate",disabled:!0,on:{click:()=>void this.onGenerate()}}),x=T("button",{class:"pq-btn pq-btn--ghost",type:"button",text:"Cancel",on:{click:()=>this.h.close()}}),y=T("div",{class:"pq-create__actions"},[x,m]);return{root:T("div",{class:"pq-create__form"},[t("Premise",n,i),r,t("Title",a),t("Length",o),l,p.root,y]),premise:n,count:i,title:a,model:g,generate:m}}setLength(e){this.length=e;for(const{value:t,btn:i}of this.lengthBtns)i.classList.toggle("is-active",t===e),i.setAttribute("aria-checked",t===e?"true":"false")}setProvider(e,t){this.provider=e;for(const{value:i,btn:n}of this.providerBtns)n.classList.toggle("is-active",i===e),n.setAttribute("aria-checked",i===e?"true":"false");this.modelEl.placeholder=t?.providers[e]?.defaultModel??""}syncCount(){this.countEl.textContent=`${this.premiseEl.value.length} / ${tl}`}syncGenerateEnabled(){const e=this.premiseEl.value.trim().length>=Pu;this.generateBtn.disabled=!e,e?this.generateBtn.removeAttribute("aria-disabled"):this.generateBtn.setAttribute("aria-disabled","true")}buildDisclosure(e,t,i=!1){let n=i;const r=T("span",{class:"pq-create__discchev",html:Tt.chevron,aria:{hidden:!0}}),a=T("button",{class:"pq-create__disc"+(n?" is-open":""),type:"button",aria:{expanded:n?"true":"false"}},[r,T("span",{class:"pq-create__disclabel",text:e})]);t.classList.add("pq-create__discbody"),t.hidden=!n;const o=c=>{n=c,t.hidden=!n,a.classList.toggle("is-open",n),a.setAttribute("aria-expanded",n?"true":"false")};return a.addEventListener("click",()=>o(!n)),{root:T("div",{class:"pq-create__discwrap"},[a,t]),setOpen:o}}async onGenerate(){if(this.submitting)return;const e=this.premiseEl.value.trim();if(e.length<Pu)return;this.submitting=!0,this.failure=null,this.notes=[],this.assetProgress=null,this.readyInfo=null,this.doneInfo=null,this.jobId=null,this.heard=null,this.currentStage="plan",this.currentStageMessage=il.plan,this.startedAt=Date.now(),this.startTimer(),this.setView("connecting");const t={prompt:e},i=this.titleEl.value.trim();i&&(t.title=i);const n=this.modelEl.value.trim();t.options={provider:this.provider,art:this.art,length:this.length},n&&(t.options.model=n),this.localAbort=new AbortController;try{await this.h.submit(t,r=>this.onEvent(r),this.localAbort.signal)}catch(r){this.onTransportFault(r)}finally{this.submitting=!1,this.localAbort=null}}onEvent(e){switch(e.event){case"hello":{const t=e.data;this.jobId=t.jobId,this.heard={provider:t.provider,model:t.model},this.startedAt=t.startedAt||Date.now(),this.startTimer(),this.setView("working");break}case"stage":{const t=e.data;this.currentStage=t.stage,this.currentStageMessage=t.message||il[t.stage]||"",this.renderResult();break}case"note":{const t=e.data;t.level==="warn"&&(this.notes.push(t.message),this.notes.length>3&&this.notes.shift(),this.renderResult());break}case"asset":{const t=e.data;this.assetProgress={index:t.index,total:t.total,label:t.label},this.renderResult();break}case"ready":{const t=e.data;this.readyInfo={id:t.id,title:t.title},t.art==="running"&&this.setView("painting");break}case"done":{const t=e.data;this.doneInfo=t,this.stopTimer(),this.setView("done");break}case"error":{const t=e.data;this.stopTimer(),t.code==="cancelled"?this.resetToForm():(this.failure={code:t.code,message:t.message,detail:t.detail},this.setView("failed"));break}}}onTransportFault(e){if(this.view==="form")return;this.stopTimer();const t=e instanceof Error?e.message:"The connection to the writer failed.";this.failure={code:"network",message:t},this.setView("failed")}onCancel(){this.jobId?this.h.cancel(this.jobId):(this.localAbort?.abort(),this.resetToForm())}onStopPainting(){this.jobId&&this.h.cancel(this.jobId),this.readyInfo&&!this.doneInfo&&(this.doneInfo={id:this.readyInfo.id,title:this.readyInfo.title,durationMs:Date.now()-this.startedAt,warnings:[],art:{generated:0,skipped:0,failed:0}}),this.stopTimer(),this.setView("done")}onBegin(){const e=this.doneInfo??this.readyInfo;e&&this.h.adopt(e.id)}resetToForm(){this.stopTimer(),this.jobId=null,this.assetProgress=null,this.notes=[],this.setView("form")}retry(){this.onGenerate()}editPremise(){this.failure=null,this.setView("form"),requestAnimationFrame(()=>this.premiseEl.focus())}useMock(){this.setProvider("mock",this.h.health()),this.advancedDisc?.setOpen(!0),this.onGenerate()}setView(e){this.view=e,this.formWrap.hidden=e!=="form",this.resultWrap.hidden=e==="form",this.renderResult()}renderResult(){if(this.view!=="form")switch(kt(this.resultWrap),this.timerEl=null,this.view){case"connecting":case"working":this.renderWorking(!1);break;case"painting":this.renderWorking(!0);break;case"done":this.renderDone();break;case"failed":this.renderFailed();break}}renderWorking(e){const t=T("div",{class:"pq-create__working"});e&&this.readyInfo&&t.appendChild(T("div",{class:"pq-create__ready"},[T("p",{class:"pq-create__readytitle",text:`${this.readyInfo.title} is ready to play.`}),T("p",{class:"pq-create__readybody",text:"The art is still being painted — it will be there the next time you open the story."}),T("div",{class:"pq-create__actions"},[T("span",{class:"pq-create__keepwatch",text:"Keep watching"}),T("button",{class:"pq-btn pq-btn--ghost",type:"button",text:"Stop painting",on:{click:()=>this.onStopPainting()}}),T("button",{class:"pq-btn",type:"button",text:"Begin now",on:{click:()=>this.onBegin()}})])]));const i=Lu.findIndex(u=>u.stages.includes(this.currentStage)),n=T("div",{class:"pq-create__rail",role:"list",aria:{label:"Progress"}});Lu.forEach((u,d)=>{const l=d<i?"past":d===i?"live":"future";n.appendChild(T("span",{class:`pq-create__step is-${l}`,role:"listitem"},[l==="live"?T("span",{class:"pq-create__stepdot",aria:{hidden:!0}}):null,T("span",{class:"pq-create__steplabel",text:u.label})]))}),t.appendChild(n);const r=T("span",{class:"pq-create__timer",text:"00:00"});this.timerEl=r,this.tickTimer(),t.appendChild(T("div",{class:"pq-create__stagerow"},[T("p",{class:"pq-create__stagecopy",text:this.currentStageMessage||il[this.currentStage]}),r]));const a=this.assetProgress!==null,o=T("div",{class:"pq-create__bar"+(a?"":" is-indeterminate")}),c=T("div",{class:"pq-create__barfill"});if(a&&this.assetProgress){const u=this.assetProgress.total>0?this.assetProgress.index/this.assetProgress.total*100:0;c.style.width=`${Math.max(2,Math.min(100,u))}%`}o.appendChild(c),t.appendChild(o),a&&this.assetProgress&&t.appendChild(T("p",{class:"pq-create__assetline",text:`Painting ${this.assetProgress.label} (${this.assetProgress.index} of ${this.assetProgress.total})…`})),this.notes.length&&t.appendChild(T("div",{class:"pq-create__notes"},this.notes.map(u=>T("p",{class:"pq-create__note",text:u})))),this.heard&&t.appendChild(T("p",{class:"pq-create__byline",text:`${Ru[this.heard.provider]} · ${this.heard.model}`})),e||t.appendChild(T("div",{class:"pq-create__actions"},[T("button",{class:"pq-btn pq-btn--ghost",type:"button",text:"Cancel",on:{click:()=>this.onCancel()}})])),this.resultWrap.appendChild(t)}renderDone(){const e=this.doneInfo;if(!e)return;const t=e.art.generated+e.art.skipped+e.art.failed;this.resultWrap.appendChild(T("div",{class:"pq-create__result"},[T("p",{class:"pq-create__resulttitle",text:`${e.title} is ready.`}),e.warnings.length?T("p",{class:"pq-create__resulthint",text:`${e.warnings.length} ${e.warnings.length===1?"detail was":"details were"} smoothed over automatically during validation.`}):null,t?T("p",{class:"pq-create__resulthint",text:`Art: ${e.art.generated} painted${e.art.skipped?`, ${e.art.skipped} skipped`:""}${e.art.failed?`, ${e.art.failed} failed`:""}.`}):null,T("div",{class:"pq-create__actions"},[T("button",{class:"pq-btn pq-btn--ghost",type:"button",text:"Close",on:{click:()=>this.h.close()}}),T("button",{class:"pq-btn",type:"button",text:"Begin",on:{click:()=>this.onBegin()}})])]))}renderFailed(){const e=this.failure;if(!e)return;const t=aM[e.code]??oM,i=T("div",{class:"pq-create__fail"},[T("p",{class:"pq-create__failheading",text:t.heading}),T("p",{class:"pq-create__failbody",text:t.body({message:e.message,provider:this.provider})})]);if(e.detail&&e.detail.length){const r=T("ul",{class:"pq-create__faillist"},e.detail.map(a=>T("li",{text:a})));i.appendChild(this.buildDisclosure("Details",r).root)}const n=T("div",{class:"pq-create__actions"});for(const r of t.actions)n.appendChild(this.failureActionButton(r));i.appendChild(n),this.resultWrap.appendChild(i)}failureActionButton(e){switch(e){case"retry":return T("button",{class:"pq-btn",type:"button",text:"Try again",on:{click:()=>this.retry()}});case"edit":return T("button",{class:"pq-btn pq-btn--ghost",type:"button",text:"Edit premise",on:{click:()=>this.editPremise()}});case"use_mock":return T("button",{class:"pq-btn",type:"button",text:"Use Mock",on:{click:()=>this.useMock()}});case"close":return T("button",{class:"pq-btn pq-btn--ghost",type:"button",text:"Close",on:{click:()=>this.h.close()}})}}startTimer(){this.stopTimer(),this.timerHandle=window.setInterval(()=>this.tickTimer(),250)}stopTimer(){this.timerHandle&&(window.clearInterval(this.timerHandle),this.timerHandle=0)}tickTimer(){if(!this.timerEl)return;const e=Math.max(0,Math.floor((Date.now()-this.startedAt)/1e3)),t=String(Math.floor(e/60)).padStart(2,"0"),i=String(e%60).padStart(2,"0");this.timerEl.textContent=`${t}:${i}`}}function cM(s){return s.length>46?`${s.slice(0,45)}…`:s}async function*hM(s,e){if(!s.body)return;const t=s.body.getReader(),i=new TextDecoder;let n="";const r=()=>{t.cancel().catch(()=>{})};e?.addEventListener("abort",r);try{for(;;){if(e?.aborted)return;let a;try{a=await t.read()}catch{return}if(a.done)break;n+=i.decode(a.value,{stream:!0}),n=n.replace(/\r\n/g,`
`);let o=n.indexOf(`

`);for(;o!==-1;){const c=n.slice(0,o);n=n.slice(o+2);const u=uM(c);u&&(yield u),o=n.indexOf(`

`)}}}finally{e?.removeEventListener("abort",r)}}function uM(s){let e="";const t=[];for(const i of s.split(`
`))!i||i.startsWith(":")||(i.startsWith("event:")?e=i.slice(6).trim():i.startsWith("data:")&&t.push(i.slice(5).trim()));if(!e||t.length===0)return null;try{return{event:e,data:JSON.parse(t.join(`
`))}}catch{return null}}class dM{bus;host;pq;stage;modalLayer;advanceEl;waitEl;topbar;liveEl;creditsEl;gradeEl;atmosEl;tonePlateEl;plateEl;cornerPlateEl;wallPlateEl;vignettePlateEl;dialogue;callstrip;proxy;choices;chapter;backlog;saveload;settings;title;create;pause;about;settingsState;unsubs=[];modalStack=[];choiceActive=!1;choiceOptions=[];choiceEls=[];waitActive=!1;cast=new Set;narratorLabel;creditsActive=!1;creditsDone=!1;autoTimer=0;constructor(e,t,i){this.bus=e,this.host=i,this.settingsState={...i.getSettings()},this.advanceEl=T("div",{class:"pq-advance",role:"button",tabIndex:-1,aria:{label:"Advance dialogue",hidden:!0},on:{click:()=>this.requestAdvance()}}),this.waitEl=T("div",{class:"pq-wait",aria:{hidden:!0},hidden:!0},[T("span",{class:"pq-wait__dot"}),T("span",{class:"pq-wait__dot"}),T("span",{class:"pq-wait__dot"})]),this.stage=T("div",{class:"pq-stagelayer"},[this.advanceEl,this.waitEl]),this.topbar=T("div",{class:"pq-topbar",hidden:!0},[T("button",{class:"pq-iconbtn pq-topbar__menu",type:"button",html:Tt.menu,aria:{label:"Menu"},on:{click:()=>this.togglePauseMenu()}})]),this.modalLayer=T("div",{class:"pq-modallayer"}),this.creditsEl=T("div",{class:"pq-credits",role:"group",aria:{label:"Credits"},hidden:!0}),this.liveEl=T("div",{class:"pq-sr",aria:{live:"polite",atomic:"true"}}),this.gradeEl=T("div",{class:"pq-roomgrade",aria:{hidden:!0}}),this.atmosEl=T("div",{class:"pq-atmos",aria:{hidden:!0}},[T("span",{class:"pq-atmos__focus"}),T("span",{class:"pq-atmos__local"}),T("span",{class:"pq-atmos__midlight"}),T("span",{class:"pq-atmos__bokeh"}),T("span",{class:"pq-atmos__shafts"}),T("span",{class:"pq-atmos__cool"})]),this.tonePlateEl=T("div",{class:"pq-plate pq-plate--tone",aria:{hidden:!0}}),this.plateEl=T("div",{class:"pq-plate",aria:{hidden:!0}}),this.cornerPlateEl=T("div",{class:"pq-plate pq-plate--corner",aria:{hidden:!0}}),this.wallPlateEl=T("div",{class:"pq-plate pq-plate--wall",aria:{hidden:!0}}),this.vignettePlateEl=T("div",{class:"pq-plate pq-plate--vignette",aria:{hidden:!0}}),this.pq=T("div",{class:"pq"},[this.gradeEl,this.atmosEl,this.stage,this.topbar,this.modalLayer,this.creditsEl,this.tonePlateEl,this.plateEl,this.cornerPlateEl,this.wallPlateEl,this.vignettePlateEl,this.liveEl]),t.appendChild(this.pq),this.dialogue=new DS(this.stage),this.callstrip=new LS(this.pq),this.proxy=new NS(this.stage),this.choices=new BS(this.stage),this.chapter=new zS(this.stage),this.title=new $S(this.pq,this.modalLayer,{onStart:n=>this.host.startStory(n),onContinue:()=>this.host.continueGame(),onLoad:()=>this.openSaveLoad("load"),onSettings:()=>this.openSettings(),onAbout:()=>this.openModal(this.about.overlay,this.about.panel),hasContinue:()=>this.host.hasContinue(),coverUrl:n=>this.host.getCoverUrl(n),backdropUrl:n=>this.host.getBackdropUrl(n),openModal:(n,r)=>this.openModal(n,r),closeModal:()=>this.closeTop(),canCreate:()=>!!this.host.storygenHealth(),onCreate:()=>this.openCreate()}),this.create=new lM(this.modalLayer,{health:()=>this.host.storygenHealth(),submit:(n,r,a)=>this.submitGenerate(n,r,a),cancel:n=>this.cancelGenerate(n),adopt:n=>this.host.adoptStory(n),close:()=>this.closeTop()}),this.backlog=new jS(this.modalLayer,()=>this.closeTop()),this.saveload=new hn(this.modalLayer,i,()=>this.closeTop(),()=>this.closeAllModals()),this.settings=new ZS(this.modalLayer,i,()=>this.closeTop(),n=>this.commitSettings(n)),this.pause=this.buildPauseMenu(),this.about=this.buildAbout(),this.modalLayer.appendChild(this.pause.overlay),this.modalLayer.appendChild(this.about.overlay),this.subscribe(),this.onKeyDown=this.onKeyDown.bind(this),window.addEventListener("keydown",this.onKeyDown),this.applySettings(this.settingsState),this.updateInputMode()}subscribe(){this.unsubs.push(this.bus.on("ui:say",e=>{this.clearWait(),this.clearAuto(),this.closeChoiceUI(),this.dialogue.show(e.speaker,e.text,{speed:this.settingsState.textSpeed,narrator:this.narratorLabel},t=>this.onLineComplete(t,e.auto)),e.speaker&&this.callstrip.connect(e.speaker.name),this.backlog.push({name:e.speaker?.name??null,color:e.speaker?.color,text:e.text}),this.announce(e.speaker?`${e.speaker.name}. ${e.text}`:e.text),this.updateInputMode()})),this.unsubs.push(this.bus.on("scene:bg",e=>{this.pq.dataset.pqBg=e.id})),this.unsubs.push(this.bus.on("char:enter",e=>{this.cast.add(e.char),this.pq.classList.add("has-cast")}),this.bus.on("char:exit",e=>{this.cast.delete(e.char),this.pq.classList.toggle("has-cast",this.cast.size>0)}),this.bus.on("runtime:ready",()=>{this.cast.clear(),this.pq.classList.remove("has-cast")})),this.unsubs.push(this.bus.on("ui:choices",e=>this.presentChoices(e.options))),this.unsubs.push(this.bus.on("ui:chapter",e=>{this.clearWait(),this.clearAuto(),this.closeChoiceUI(),this.chapter.show(e.title,e.subtitle,e.index),this.announce(`Chapter. ${e.title}${e.subtitle?". "+e.subtitle:""}`),this.updateInputMode()})),this.unsubs.push(this.bus.on("ui:clear",()=>{this.clearAuto(),this.dialogue.clear(),this.updateInputMode()})),this.unsubs.push(this.bus.on("ui:end",e=>this.rollCredits(e.credits??[]))),this.unsubs.push(this.bus.on("wait:begin",e=>{this.waitActive=!0,this.waitEl.hidden=this.dialogue.isVisible(),this.updateInputMode(),window.setTimeout(()=>{this.waitActive&&this.waitEl.classList.add("is-soft")},Math.max(200,e.seconds*1e3))})),this.unsubs.push(this.bus.on("runtime:ready",e=>{this.backlog.reset(),this.chapter.reset(),this.callstrip.reset(),this.narratorLabel=e.story.narrator;for(const t of e.history)this.backlog.push({name:t.speakerName??(t.speaker?t.speaker:null),color:t.speaker?e.story.characters[t.speaker]?.color:void 0,text:t.text,kind:t.choiceKind});this.applyTheme(e.story.theme),this.applySlotArt(e.story.id)}))}onLineComplete(e,t){if(!e||!(t||this.settingsState.autoAdvance))return;const i=520;this.clearAuto(),this.autoTimer=window.setTimeout(()=>{this.autoTimer=0,!this.choiceActive&&this.modalStack.length===0&&!this.creditsActive&&this.bus.emit("input:advance",{})},i)}presentChoices(e){this.clearWait(),this.clearAuto(),this.dialogue.isTyping()&&this.dialogue.skip();const t=e.some(n=>n.kind==="suggested"||n.kind==="offscript"),i=e;this.choiceOptions=i,this.choiceEls=t?this.proxy.show(i,n=>this.selectChoice(n)):this.choices.show(i,n=>this.selectChoice(n)),this.choiceActive=!0,this.updateInputMode(),requestAnimationFrame(()=>this.choiceEls[0]?.focus())}selectChoice(e){if(!this.choiceActive)return;const t=this.choiceOptions[e],i=this.choiceEls[e];if(!t)return;this.choiceActive=!1,this.clearAuto();const n=this.proxy.isOpen();i&&i.classList.add("is-chosen"),(n?this.proxy.root:this.choices.root).classList.add("is-choosing");const r=()=>{this.proxy.hide(),this.choices.hide(),this.choiceEls=[],this.choiceOptions=[],this.updateInputMode(),this.backlog.push({name:null,text:t.text,kind:t.kind}),this.bus.emit("input:choose",{target:t.target})};i&&this.motionOK()?this.liftIntoDialogue(i,r):window.setTimeout(r,90)}closeChoiceUI(){this.proxy.isOpen()&&this.proxy.hide(),this.choices.isOpen()&&this.choices.hide(),this.choiceActive=!1,this.choiceEls=[],this.choiceOptions=[]}liftIntoDialogue(e,t){const i=this.dialogue.textElement;if(!this.dialogue.isVisible()||!i){t();return}const n=e.getBoundingClientRect(),r=i.getBoundingClientRect();if(n.width===0){t();return}const a=e.cloneNode(!0);a.classList.add("pq-lift"),Object.assign(a.style,{position:"fixed",left:`${n.left}px`,top:`${n.top}px`,width:`${n.width}px`,height:`${n.height}px`,margin:"0",transformOrigin:"top left",pointerEvents:"none",zIndex:"95"}),this.pq.appendChild(a);const o=Math.min(1,r.width/n.width),c=r.left-n.left,u=r.top-n.top,d=a.animate([{transform:"translate(0px, 0px) scale(1)",opacity:1,filter:"blur(0px)"},{transform:`translate(${c}px, ${u}px) scale(${o})`,opacity:0,filter:"blur(2px)"}],{duration:380,easing:"cubic-bezier(0.22, 1, 0.36, 1)",fill:"forwards"});let l=!1;const h=()=>{l||(l=!0,a.remove(),t())};d.addEventListener("finish",h),window.setTimeout(h,460)}requestAdvance(){if(!(this.title.isVisible()||this.modalStack.length>0)){if(this.creditsActive){this.skipCredits();return}if(this.chapter.isOpen()){this.chapter.hide(),this.updateInputMode(),this.bus.emit("input:advance",{});return}if(this.waitActive){this.clearWait(),this.bus.emit("input:continue",{});return}if(!this.choiceActive){if(this.dialogue.isTyping()){this.dialogue.skip(),this.bus.emit("input:skip",{});return}this.dialogue.isVisible()&&(this.clearAuto(),this.bus.emit("input:advance",{}))}}}updateInputMode(){const e=!this.title.isVisible()&&this.modalStack.length===0&&!this.creditsActive&&!this.choiceActive;this.advanceEl.classList.toggle("is-armed",e),this.advanceEl.setAttribute("aria-hidden",e?"false":"true");const t=!this.title.isVisible()&&!this.creditsActive;this.topbar.hidden=!t,this.callstrip.setVisible(t),this.pq.classList.toggle("is-choice",this.choiceActive),this.pq.classList.toggle("is-modal",this.modalStack.length>0),this.pq.classList.toggle("is-chapter",this.chapter.isOpen())}clearWait(){!this.waitActive&&this.waitEl.hidden||(this.waitActive=!1,this.waitEl.hidden=!0,this.waitEl.classList.remove("is-soft"))}clearAuto(){this.autoTimer&&(clearTimeout(this.autoTimer),this.autoTimer=0)}onKeyDown(e){const t=e.target,i=t?.tagName,n=i==="INPUT"||i==="TEXTAREA"||i==="SELECT"||(t?.isContentEditable??!1);if(e.key==="Escape"){e.preventDefault(),this.onEscape();return}if(this.modalStack.length>0){e.key==="Tab"&&this.trapTab(e);return}if(this.creditsActive){(e.key===" "||e.key==="Enter"||e.key==="Spacebar")&&(e.preventDefault(),this.skipCredits());return}if(!this.title.isVisible()){if(this.choiceActive){if(!n&&e.key>="1"&&e.key<="9"){const r=Number(e.key)-1;r<this.choiceEls.length&&(e.preventDefault(),this.selectChoice(r))}return}n||(e.key===" "||e.key==="Enter"||e.key==="Spacebar")&&this.isReadingTarget(t)&&(e.preventDefault(),this.requestAdvance())}}isReadingTarget(e){return e===document.body||e===this.pq||e===this.stage||e===this.advanceEl||e===null}onEscape(){if(this.creditsActive){this.skipCredits();return}if(this.modalStack.length>0){this.closeTop();return}this.title.isVisible()||this.openModal(this.pause.overlay,this.pause.panel)}togglePauseMenu(){const e=this.modalStack[this.modalStack.length-1];e&&e.overlay===this.pause.overlay?this.closeTop():this.modalStack.length===0&&this.openModal(this.pause.overlay,this.pause.panel)}openSaveLoad(e){this.saveload.open(e),this.openModal(this.saveload.overlay,this.saveload.panel)}openSettings(){this.settings.open(),this.openModal(this.settings.overlay,this.settings.panel)}openCreate(){this.create.open(),this.openModal(this.create.overlay,this.create.panel)}async submitGenerate(e,t,i){const n=await fetch("/api/generate-story",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e),signal:i});if(!n.ok){let r={};try{r=await n.json()}catch{}const a=r.error?.code??"bad_request";t({event:"error",data:{code:a,message:r.error?.message??`The request could not be sent (HTTP ${n.status}).`,detail:r.error?.detail,retryable:r.error?.retryable??!1,stage:"plan"}});return}for await(const r of hM(n,i))t(r)}cancelGenerate(e){fetch(`/api/jobs/${encodeURIComponent(e)}`,{method:"DELETE"}).catch(()=>{})}openBacklog(){this.backlog.render(),this.openModal(this.backlog.overlay,this.backlog.panel)}openModal(e,t){const i=document.activeElement??null;this.setUnder(this.modalStack[this.modalStack.length-1],!0),this.modalStack.push({overlay:e,panel:t,prevFocus:i}),this.modalLayer.appendChild(e),e.hidden=!1,requestAnimationFrame(()=>e.classList.add("is-open")),this.focusInto(t),this.updateInputMode()}closeTop(){const e=this.modalStack.pop();if(!e)return;e.overlay.classList.remove("is-open"),window.setTimeout(()=>{this.modalStack.some(i=>i.overlay===e.overlay)||(e.overlay.hidden=!0)},220);const t=this.modalStack[this.modalStack.length-1];this.setUnder(t,!1),e.prevFocus&&document.contains(e.prevFocus)?e.prevFocus.focus():t&&this.focusInto(t.panel),this.updateInputMode()}closeAllModals(){for(;this.modalStack.length;){const e=this.modalStack.pop();e&&(e.overlay.classList.remove("is-open","is-under"),e.overlay.hidden=!0)}this.updateInputMode()}setUnder(e,t){e&&e.overlay.classList.toggle("is-under",t)}focusInto(e){requestAnimationFrame(()=>{e.hasAttribute("tabindex")?e.focus():(Eu(e)[0]??e).focus()})}trapTab(e){const t=this.modalStack[this.modalStack.length-1];if(!t)return;const i=Eu(t.panel);if(i.length===0){e.preventDefault();return}const n=i[0],r=i[i.length-1],a=document.activeElement;e.shiftKey&&(a===n||!t.panel.contains(a))?(e.preventDefault(),r.focus()):!e.shiftKey&&a===r&&(e.preventDefault(),n.focus())}buildPauseMenu(){const e=es("Paused",{onClose:()=>this.closeTop(),kicker:"Menu"}),t=(i,n,r)=>T("button",{class:"pq-menurow",type:"button",on:{click:r}},[T("span",{class:"pq-menurow__ic",html:n,aria:{hidden:!0}}),T("span",{class:"pq-menurow__label",text:i}),T("span",{class:"pq-menurow__chev",html:Tt.chevron,aria:{hidden:!0}})]);return e.body.appendChild(T("div",{class:"pq-menugrid"},[t("Resume",Tt.play,()=>this.closeTop()),t("Save",Tt.save,()=>this.openSaveLoad("save")),t("Load",Tt.load,()=>this.openSaveLoad("load")),t("History",Tt.backlog,()=>this.openBacklog()),t("Settings",Tt.settings,()=>this.openSettings()),t("Return to title",Tt.home,()=>{this.closeAllModals(),this.host.returnToTitle()})])),e}buildAbout(){const e=es("About",{onClose:()=>this.closeTop(),kicker:"Lamplighter"});return e.body.appendChild(T("div",{class:"pq-about"},[T("p",{class:"pq-about__lede",text:"Lamplighter is a cinematic anthology of narrative quests. You play the human voice of an AI companion — choosing between the words it suggests and the words that are truly yours."}),T("p",{class:"pq-about__body",text:"An original work in the spirit of Zachtronics’ Eliza, rendered in real time with Three.js: parallax depth, weather, film grain and a per-story color grade. Every story is a folder you can drop in — no code required."}),T("p",{class:"pq-about__note",text:"Stories can be written from inside the app when Lamplighter is running from npm run dev or npm run preview."}),T("div",{class:"pq-about__meta"},[T("span",{text:"Space / Enter — advance"}),T("span",{text:"1 – 3 — choose a response"}),T("span",{text:"Esc — menu"})]),T("p",{class:"pq-about__credit",text:"Built with Three.js · original work in the spirit of Eliza"})])),e}rollCredits(e){this.closeAllModals(),this.closeChoiceUI(),this.clearWait(),this.clearAuto(),this.dialogue.clear(),this.creditsActive=!0,this.creditsDone=!1,this.updateInputMode(),kt(this.creditsEl);const t=!this.motionOK(),i=T("div",{class:"pq-credits__col"},[T("div",{class:"pq-credits__mark"},[T("span",{class:"pq-credits__glyph",html:Tt.spark,aria:{hidden:!0}}),T("span",{class:"pq-credits__word",text:"fin"})]),...e.map(o=>T("p",{class:"pq-credits__line",text:o})),T("div",{class:"pq-credits__end"},[T("p",{class:"pq-credits__thanks",text:"Thank you for lending your voice."})])]),n=T("button",{class:"pq-btn pq-btn--ghost pq-credits__skip",type:"button",text:t?"Return to title":"Skip",on:{click:()=>this.skipCredits()}});if(this.creditsEl.append(i,n),this.creditsEl.hidden=!1,this.creditsEl.classList.remove("is-out"),t){i.classList.add("is-static"),requestAnimationFrame(()=>n.focus());return}const r=Math.max(12,e.length*1.7+8);i.style.animationDuration=`${r}s`,i.classList.add("is-rolling");const a=o=>{o.animationName&&o.target===i&&(i.removeEventListener("animationend",a),this.finishCredits())};i.addEventListener("animationend",a),requestAnimationFrame(()=>n.focus())}skipCredits(){this.creditsActive&&this.finishCredits()}finishCredits(){this.creditsDone||(this.creditsDone=!0,this.creditsActive=!1,this.creditsEl.classList.add("is-out"),window.setTimeout(()=>{this.creditsEl.hidden=!0,kt(this.creditsEl)},400),this.updateInputMode(),this.host.returnToTitle())}showTitle(e){this.closeAllModals(),this.closeChoiceUI(),this.clearWait(),this.clearAuto(),this.dialogue.clear(),this.chapter.hide(),this.creditsActive=!1,this.creditsEl.hidden=!0,this.title.show(e),this.updateInputMode(),requestAnimationFrame(()=>this.title.focusFirst())}hideTitle(){this.title.hide(),this.updateInputMode()}applyTheme(e){const t=document.documentElement.style,i=(n,r)=>{t.setProperty(n,r);const a=hr(r);a&&t.setProperty(`${n}-rgb`,a)};e.key&&i("--pq-key",e.key),e.accent&&i("--pq-accent",e.accent),e.ink&&i("--pq-ink",e.ink),e.paper&&i("--pq-paper",e.paper)}applySlotArt(e){const t=this.host.getBackdropUrl(e),i=document.documentElement.style;t?i.setProperty("--pq-slot-art",`url("${t}")`):i.removeProperty("--pq-slot-art")}applySettings(e){this.settingsState={...e};const t=e.reducedMotion||!Au();document.documentElement.dataset.pqMotion=t?"reduced":"full",this.settings.sync(this.settingsState)}commitSettings(e){this.host.applySettings(e),this.applySettings(e),this.title.refresh()}motionOK(){return!this.settingsState.reducedMotion&&Au()}announce(e){this.liveEl.textContent="",requestAnimationFrame(()=>{this.liveEl.textContent=e})}dispose(){window.removeEventListener("keydown",this.onKeyDown);for(const e of this.unsubs)e();this.unsubs.length=0,this.clearAuto(),this.dialogue.destroy(),this.callstrip.destroy(),this.proxy.destroy(),this.choices.destroy(),this.chapter.destroy(),this.backlog.destroy(),this.saveload.destroy(),this.settings.destroy(),this.title.destroy(),this.create.destroy(),this.pq.remove()}}var ar=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{},Ia={};/*!
 *  howler.js v2.2.4
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */(function(s){(function(){var e=function(){this.init()};e.prototype={init:function(){var l=this||t;return l._counter=1e3,l._html5AudioPool=[],l.html5PoolSize=10,l._codecs={},l._howls=[],l._muted=!1,l._volume=1,l._canPlayEvent="canplaythrough",l._navigator=typeof window<"u"&&window.navigator?window.navigator:null,l.masterGain=null,l.noAudio=!1,l.usingWebAudio=!0,l.autoSuspend=!0,l.ctx=null,l.autoUnlock=!0,l._setup(),l},volume:function(l){var h=this||t;if(l=parseFloat(l),h.ctx||d(),typeof l<"u"&&l>=0&&l<=1){if(h._volume=l,h._muted)return h;h.usingWebAudio&&h.masterGain.gain.setValueAtTime(l,t.ctx.currentTime);for(var f=0;f<h._howls.length;f++)if(!h._howls[f]._webAudio)for(var g=h._howls[f]._getSoundIds(),_=0;_<g.length;_++){var p=h._howls[f]._soundById(g[_]);p&&p._node&&(p._node.volume=p._volume*l)}return h}return h._volume},mute:function(l){var h=this||t;h.ctx||d(),h._muted=l,h.usingWebAudio&&h.masterGain.gain.setValueAtTime(l?0:h._volume,t.ctx.currentTime);for(var f=0;f<h._howls.length;f++)if(!h._howls[f]._webAudio)for(var g=h._howls[f]._getSoundIds(),_=0;_<g.length;_++){var p=h._howls[f]._soundById(g[_]);p&&p._node&&(p._node.muted=l?!0:p._muted)}return h},stop:function(){for(var l=this||t,h=0;h<l._howls.length;h++)l._howls[h].stop();return l},unload:function(){for(var l=this||t,h=l._howls.length-1;h>=0;h--)l._howls[h].unload();return l.usingWebAudio&&l.ctx&&typeof l.ctx.close<"u"&&(l.ctx.close(),l.ctx=null,d()),l},codecs:function(l){return(this||t)._codecs[l.replace(/^x-/,"")]},_setup:function(){var l=this||t;if(l.state=l.ctx&&l.ctx.state||"suspended",l._autoSuspend(),!l.usingWebAudio)if(typeof Audio<"u")try{var h=new Audio;typeof h.oncanplaythrough>"u"&&(l._canPlayEvent="canplay")}catch{l.noAudio=!0}else l.noAudio=!0;try{var h=new Audio;h.muted&&(l.noAudio=!0)}catch{}return l.noAudio||l._setupCodecs(),l},_setupCodecs:function(){var l=this||t,h=null;try{h=typeof Audio<"u"?new Audio:null}catch{return l}if(!h||typeof h.canPlayType!="function")return l;var f=h.canPlayType("audio/mpeg;").replace(/^no$/,""),g=l._navigator?l._navigator.userAgent:"",_=g.match(/OPR\/(\d+)/g),p=_&&parseInt(_[0].split("/")[1],10)<33,m=g.indexOf("Safari")!==-1&&g.indexOf("Chrome")===-1,x=g.match(/Version\/(.*?) /),y=m&&x&&parseInt(x[1],10)<15;return l._codecs={mp3:!!(!p&&(f||h.canPlayType("audio/mp3;").replace(/^no$/,""))),mpeg:!!f,opus:!!h.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/,""),ogg:!!h.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/,""),oga:!!h.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/,""),wav:!!(h.canPlayType('audio/wav; codecs="1"')||h.canPlayType("audio/wav")).replace(/^no$/,""),aac:!!h.canPlayType("audio/aac;").replace(/^no$/,""),caf:!!h.canPlayType("audio/x-caf;").replace(/^no$/,""),m4a:!!(h.canPlayType("audio/x-m4a;")||h.canPlayType("audio/m4a;")||h.canPlayType("audio/aac;")).replace(/^no$/,""),m4b:!!(h.canPlayType("audio/x-m4b;")||h.canPlayType("audio/m4b;")||h.canPlayType("audio/aac;")).replace(/^no$/,""),mp4:!!(h.canPlayType("audio/x-mp4;")||h.canPlayType("audio/mp4;")||h.canPlayType("audio/aac;")).replace(/^no$/,""),weba:!!(!y&&h.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/,"")),webm:!!(!y&&h.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/,"")),dolby:!!h.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/,""),flac:!!(h.canPlayType("audio/x-flac;")||h.canPlayType("audio/flac;")).replace(/^no$/,"")},l},_unlockAudio:function(){var l=this||t;if(!(l._audioUnlocked||!l.ctx)){l._audioUnlocked=!1,l.autoUnlock=!1,!l._mobileUnloaded&&l.ctx.sampleRate!==44100&&(l._mobileUnloaded=!0,l.unload()),l._scratchBuffer=l.ctx.createBuffer(1,1,22050);var h=function(f){for(;l._html5AudioPool.length<l.html5PoolSize;)try{var g=new Audio;g._unlocked=!0,l._releaseHtml5Audio(g)}catch{l.noAudio=!0;break}for(var _=0;_<l._howls.length;_++)if(!l._howls[_]._webAudio)for(var p=l._howls[_]._getSoundIds(),m=0;m<p.length;m++){var x=l._howls[_]._soundById(p[m]);x&&x._node&&!x._node._unlocked&&(x._node._unlocked=!0,x._node.load())}l._autoResume();var y=l.ctx.createBufferSource();y.buffer=l._scratchBuffer,y.connect(l.ctx.destination),typeof y.start>"u"?y.noteOn(0):y.start(0),typeof l.ctx.resume=="function"&&l.ctx.resume(),y.onended=function(){y.disconnect(0),l._audioUnlocked=!0,document.removeEventListener("touchstart",h,!0),document.removeEventListener("touchend",h,!0),document.removeEventListener("click",h,!0),document.removeEventListener("keydown",h,!0);for(var b=0;b<l._howls.length;b++)l._howls[b]._emit("unlock")}};return document.addEventListener("touchstart",h,!0),document.addEventListener("touchend",h,!0),document.addEventListener("click",h,!0),document.addEventListener("keydown",h,!0),l}},_obtainHtml5Audio:function(){var l=this||t;if(l._html5AudioPool.length)return l._html5AudioPool.pop();var h=new Audio().play();return h&&typeof Promise<"u"&&(h instanceof Promise||typeof h.then=="function")&&h.catch(function(){console.warn("HTML5 Audio pool exhausted, returning potentially locked audio object.")}),new Audio},_releaseHtml5Audio:function(l){var h=this||t;return l._unlocked&&h._html5AudioPool.push(l),h},_autoSuspend:function(){var l=this;if(!(!l.autoSuspend||!l.ctx||typeof l.ctx.suspend>"u"||!t.usingWebAudio)){for(var h=0;h<l._howls.length;h++)if(l._howls[h]._webAudio){for(var f=0;f<l._howls[h]._sounds.length;f++)if(!l._howls[h]._sounds[f]._paused)return l}return l._suspendTimer&&clearTimeout(l._suspendTimer),l._suspendTimer=setTimeout(function(){if(l.autoSuspend){l._suspendTimer=null,l.state="suspending";var g=function(){l.state="suspended",l._resumeAfterSuspend&&(delete l._resumeAfterSuspend,l._autoResume())};l.ctx.suspend().then(g,g)}},3e4),l}},_autoResume:function(){var l=this;if(!(!l.ctx||typeof l.ctx.resume>"u"||!t.usingWebAudio))return l.state==="running"&&l.ctx.state!=="interrupted"&&l._suspendTimer?(clearTimeout(l._suspendTimer),l._suspendTimer=null):l.state==="suspended"||l.state==="running"&&l.ctx.state==="interrupted"?(l.ctx.resume().then(function(){l.state="running";for(var h=0;h<l._howls.length;h++)l._howls[h]._emit("resume")}),l._suspendTimer&&(clearTimeout(l._suspendTimer),l._suspendTimer=null)):l.state==="suspending"&&(l._resumeAfterSuspend=!0),l}};var t=new e,i=function(l){var h=this;if(!l.src||l.src.length===0){console.error("An array of source files must be passed with any new Howl.");return}h.init(l)};i.prototype={init:function(l){var h=this;return t.ctx||d(),h._autoplay=l.autoplay||!1,h._format=typeof l.format!="string"?l.format:[l.format],h._html5=l.html5||!1,h._muted=l.mute||!1,h._loop=l.loop||!1,h._pool=l.pool||5,h._preload=typeof l.preload=="boolean"||l.preload==="metadata"?l.preload:!0,h._rate=l.rate||1,h._sprite=l.sprite||{},h._src=typeof l.src!="string"?l.src:[l.src],h._volume=l.volume!==void 0?l.volume:1,h._xhr={method:l.xhr&&l.xhr.method?l.xhr.method:"GET",headers:l.xhr&&l.xhr.headers?l.xhr.headers:null,withCredentials:l.xhr&&l.xhr.withCredentials?l.xhr.withCredentials:!1},h._duration=0,h._state="unloaded",h._sounds=[],h._endTimers={},h._queue=[],h._playLock=!1,h._onend=l.onend?[{fn:l.onend}]:[],h._onfade=l.onfade?[{fn:l.onfade}]:[],h._onload=l.onload?[{fn:l.onload}]:[],h._onloaderror=l.onloaderror?[{fn:l.onloaderror}]:[],h._onplayerror=l.onplayerror?[{fn:l.onplayerror}]:[],h._onpause=l.onpause?[{fn:l.onpause}]:[],h._onplay=l.onplay?[{fn:l.onplay}]:[],h._onstop=l.onstop?[{fn:l.onstop}]:[],h._onmute=l.onmute?[{fn:l.onmute}]:[],h._onvolume=l.onvolume?[{fn:l.onvolume}]:[],h._onrate=l.onrate?[{fn:l.onrate}]:[],h._onseek=l.onseek?[{fn:l.onseek}]:[],h._onunlock=l.onunlock?[{fn:l.onunlock}]:[],h._onresume=[],h._webAudio=t.usingWebAudio&&!h._html5,typeof t.ctx<"u"&&t.ctx&&t.autoUnlock&&t._unlockAudio(),t._howls.push(h),h._autoplay&&h._queue.push({event:"play",action:function(){h.play()}}),h._preload&&h._preload!=="none"&&h.load(),h},load:function(){var l=this,h=null;if(t.noAudio){l._emit("loaderror",null,"No audio support.");return}typeof l._src=="string"&&(l._src=[l._src]);for(var f=0;f<l._src.length;f++){var g,_;if(l._format&&l._format[f])g=l._format[f];else{if(_=l._src[f],typeof _!="string"){l._emit("loaderror",null,"Non-string found in selected audio sources - ignoring.");continue}g=/^data:audio\/([^;,]+);/i.exec(_),g||(g=/\.([^.]+)$/.exec(_.split("?",1)[0])),g&&(g=g[1].toLowerCase())}if(g||console.warn('No file extension was found. Consider using the "format" property or specify an extension.'),g&&t.codecs(g)){h=l._src[f];break}}if(!h){l._emit("loaderror",null,"No codec support for selected audio sources.");return}return l._src=h,l._state="loading",window.location.protocol==="https:"&&h.slice(0,5)==="http:"&&(l._html5=!0,l._webAudio=!1),new n(l),l._webAudio&&a(l),l},play:function(l,h){var f=this,g=null;if(typeof l=="number")g=l,l=null;else{if(typeof l=="string"&&f._state==="loaded"&&!f._sprite[l])return null;if(typeof l>"u"&&(l="__default",!f._playLock)){for(var _=0,p=0;p<f._sounds.length;p++)f._sounds[p]._paused&&!f._sounds[p]._ended&&(_++,g=f._sounds[p]._id);_===1?l=null:g=null}}var m=g?f._soundById(g):f._inactiveSound();if(!m)return null;if(g&&!l&&(l=m._sprite||"__default"),f._state!=="loaded"){m._sprite=l,m._ended=!1;var x=m._id;return f._queue.push({event:"play",action:function(){f.play(x)}}),x}if(g&&!m._paused)return h||f._loadQueue("play"),m._id;f._webAudio&&t._autoResume();var y=Math.max(0,m._seek>0?m._seek:f._sprite[l][0]/1e3),b=Math.max(0,(f._sprite[l][0]+f._sprite[l][1])/1e3-y),C=b*1e3/Math.abs(m._rate),E=f._sprite[l][0]/1e3,A=(f._sprite[l][0]+f._sprite[l][1])/1e3;m._sprite=l,m._ended=!1;var L=function(){m._paused=!1,m._seek=y,m._start=E,m._stop=A,m._loop=!!(m._loop||f._sprite[l][2])};if(y>=A){f._ended(m);return}var D=m._node;if(f._webAudio){var v=function(){f._playLock=!1,L(),f._refreshBuffer(m);var P=m._muted||f._muted?0:m._volume;D.gain.setValueAtTime(P,t.ctx.currentTime),m._playStart=t.ctx.currentTime,typeof D.bufferSource.start>"u"?m._loop?D.bufferSource.noteGrainOn(0,y,86400):D.bufferSource.noteGrainOn(0,y,b):m._loop?D.bufferSource.start(0,y,86400):D.bufferSource.start(0,y,b),C!==1/0&&(f._endTimers[m._id]=setTimeout(f._ended.bind(f,m),C)),h||setTimeout(function(){f._emit("play",m._id),f._loadQueue()},0)};t.state==="running"&&t.ctx.state!=="interrupted"?v():(f._playLock=!0,f.once("resume",v),f._clearTimer(m._id))}else{var S=function(){D.currentTime=y,D.muted=m._muted||f._muted||t._muted||D.muted,D.volume=m._volume*t.volume(),D.playbackRate=m._rate;try{var P=D.play();if(P&&typeof Promise<"u"&&(P instanceof Promise||typeof P.then=="function")?(f._playLock=!0,L(),P.then(function(){f._playLock=!1,D._unlocked=!0,h?f._loadQueue():f._emit("play",m._id)}).catch(function(){f._playLock=!1,f._emit("playerror",m._id,"Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction."),m._ended=!0,m._paused=!0})):h||(f._playLock=!1,L(),f._emit("play",m._id)),D.playbackRate=m._rate,D.paused){f._emit("playerror",m._id,"Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.");return}l!=="__default"||m._loop?f._endTimers[m._id]=setTimeout(f._ended.bind(f,m),C):(f._endTimers[m._id]=function(){f._ended(m),D.removeEventListener("ended",f._endTimers[m._id],!1)},D.addEventListener("ended",f._endTimers[m._id],!1))}catch(B){f._emit("playerror",m._id,B)}};D.src==="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"&&(D.src=f._src,D.load());var H=window&&window.ejecta||!D.readyState&&t._navigator.isCocoonJS;if(D.readyState>=3||H)S();else{f._playLock=!0,f._state="loading";var F=function(){f._state="loaded",S(),D.removeEventListener(t._canPlayEvent,F,!1)};D.addEventListener(t._canPlayEvent,F,!1),f._clearTimer(m._id)}}return m._id},pause:function(l){var h=this;if(h._state!=="loaded"||h._playLock)return h._queue.push({event:"pause",action:function(){h.pause(l)}}),h;for(var f=h._getSoundIds(l),g=0;g<f.length;g++){h._clearTimer(f[g]);var _=h._soundById(f[g]);if(_&&!_._paused&&(_._seek=h.seek(f[g]),_._rateSeek=0,_._paused=!0,h._stopFade(f[g]),_._node))if(h._webAudio){if(!_._node.bufferSource)continue;typeof _._node.bufferSource.stop>"u"?_._node.bufferSource.noteOff(0):_._node.bufferSource.stop(0),h._cleanBuffer(_._node)}else(!isNaN(_._node.duration)||_._node.duration===1/0)&&_._node.pause();arguments[1]||h._emit("pause",_?_._id:null)}return h},stop:function(l,h){var f=this;if(f._state!=="loaded"||f._playLock)return f._queue.push({event:"stop",action:function(){f.stop(l)}}),f;for(var g=f._getSoundIds(l),_=0;_<g.length;_++){f._clearTimer(g[_]);var p=f._soundById(g[_]);p&&(p._seek=p._start||0,p._rateSeek=0,p._paused=!0,p._ended=!0,f._stopFade(g[_]),p._node&&(f._webAudio?p._node.bufferSource&&(typeof p._node.bufferSource.stop>"u"?p._node.bufferSource.noteOff(0):p._node.bufferSource.stop(0),f._cleanBuffer(p._node)):(!isNaN(p._node.duration)||p._node.duration===1/0)&&(p._node.currentTime=p._start||0,p._node.pause(),p._node.duration===1/0&&f._clearSound(p._node))),h||f._emit("stop",p._id))}return f},mute:function(l,h){var f=this;if(f._state!=="loaded"||f._playLock)return f._queue.push({event:"mute",action:function(){f.mute(l,h)}}),f;if(typeof h>"u")if(typeof l=="boolean")f._muted=l;else return f._muted;for(var g=f._getSoundIds(h),_=0;_<g.length;_++){var p=f._soundById(g[_]);p&&(p._muted=l,p._interval&&f._stopFade(p._id),f._webAudio&&p._node?p._node.gain.setValueAtTime(l?0:p._volume,t.ctx.currentTime):p._node&&(p._node.muted=t._muted?!0:l),f._emit("mute",p._id))}return f},volume:function(){var l=this,h=arguments,f,g;if(h.length===0)return l._volume;if(h.length===1||h.length===2&&typeof h[1]>"u"){var _=l._getSoundIds(),p=_.indexOf(h[0]);p>=0?g=parseInt(h[0],10):f=parseFloat(h[0])}else h.length>=2&&(f=parseFloat(h[0]),g=parseInt(h[1],10));var m;if(typeof f<"u"&&f>=0&&f<=1){if(l._state!=="loaded"||l._playLock)return l._queue.push({event:"volume",action:function(){l.volume.apply(l,h)}}),l;typeof g>"u"&&(l._volume=f),g=l._getSoundIds(g);for(var x=0;x<g.length;x++)m=l._soundById(g[x]),m&&(m._volume=f,h[2]||l._stopFade(g[x]),l._webAudio&&m._node&&!m._muted?m._node.gain.setValueAtTime(f,t.ctx.currentTime):m._node&&!m._muted&&(m._node.volume=f*t.volume()),l._emit("volume",m._id))}else return m=g?l._soundById(g):l._sounds[0],m?m._volume:0;return l},fade:function(l,h,f,g){var _=this;if(_._state!=="loaded"||_._playLock)return _._queue.push({event:"fade",action:function(){_.fade(l,h,f,g)}}),_;l=Math.min(Math.max(0,parseFloat(l)),1),h=Math.min(Math.max(0,parseFloat(h)),1),f=parseFloat(f),_.volume(l,g);for(var p=_._getSoundIds(g),m=0;m<p.length;m++){var x=_._soundById(p[m]);if(x){if(g||_._stopFade(p[m]),_._webAudio&&!x._muted){var y=t.ctx.currentTime,b=y+f/1e3;x._volume=l,x._node.gain.setValueAtTime(l,y),x._node.gain.linearRampToValueAtTime(h,b)}_._startFadeInterval(x,l,h,f,p[m],typeof g>"u")}}return _},_startFadeInterval:function(l,h,f,g,_,p){var m=this,x=h,y=f-h,b=Math.abs(y/.01),C=Math.max(4,b>0?g/b:g),E=Date.now();l._fadeTo=f,l._interval=setInterval(function(){var A=(Date.now()-E)/g;E=Date.now(),x+=y*A,x=Math.round(x*100)/100,y<0?x=Math.max(f,x):x=Math.min(f,x),m._webAudio?l._volume=x:m.volume(x,l._id,!0),p&&(m._volume=x),(f<h&&x<=f||f>h&&x>=f)&&(clearInterval(l._interval),l._interval=null,l._fadeTo=null,m.volume(f,l._id),m._emit("fade",l._id))},C)},_stopFade:function(l){var h=this,f=h._soundById(l);return f&&f._interval&&(h._webAudio&&f._node.gain.cancelScheduledValues(t.ctx.currentTime),clearInterval(f._interval),f._interval=null,h.volume(f._fadeTo,l),f._fadeTo=null,h._emit("fade",l)),h},loop:function(){var l=this,h=arguments,f,g,_;if(h.length===0)return l._loop;if(h.length===1)if(typeof h[0]=="boolean")f=h[0],l._loop=f;else return _=l._soundById(parseInt(h[0],10)),_?_._loop:!1;else h.length===2&&(f=h[0],g=parseInt(h[1],10));for(var p=l._getSoundIds(g),m=0;m<p.length;m++)_=l._soundById(p[m]),_&&(_._loop=f,l._webAudio&&_._node&&_._node.bufferSource&&(_._node.bufferSource.loop=f,f&&(_._node.bufferSource.loopStart=_._start||0,_._node.bufferSource.loopEnd=_._stop,l.playing(p[m])&&(l.pause(p[m],!0),l.play(p[m],!0)))));return l},rate:function(){var l=this,h=arguments,f,g;if(h.length===0)g=l._sounds[0]._id;else if(h.length===1){var _=l._getSoundIds(),p=_.indexOf(h[0]);p>=0?g=parseInt(h[0],10):f=parseFloat(h[0])}else h.length===2&&(f=parseFloat(h[0]),g=parseInt(h[1],10));var m;if(typeof f=="number"){if(l._state!=="loaded"||l._playLock)return l._queue.push({event:"rate",action:function(){l.rate.apply(l,h)}}),l;typeof g>"u"&&(l._rate=f),g=l._getSoundIds(g);for(var x=0;x<g.length;x++)if(m=l._soundById(g[x]),m){l.playing(g[x])&&(m._rateSeek=l.seek(g[x]),m._playStart=l._webAudio?t.ctx.currentTime:m._playStart),m._rate=f,l._webAudio&&m._node&&m._node.bufferSource?m._node.bufferSource.playbackRate.setValueAtTime(f,t.ctx.currentTime):m._node&&(m._node.playbackRate=f);var y=l.seek(g[x]),b=(l._sprite[m._sprite][0]+l._sprite[m._sprite][1])/1e3-y,C=b*1e3/Math.abs(m._rate);(l._endTimers[g[x]]||!m._paused)&&(l._clearTimer(g[x]),l._endTimers[g[x]]=setTimeout(l._ended.bind(l,m),C)),l._emit("rate",m._id)}}else return m=l._soundById(g),m?m._rate:l._rate;return l},seek:function(){var l=this,h=arguments,f,g;if(h.length===0)l._sounds.length&&(g=l._sounds[0]._id);else if(h.length===1){var _=l._getSoundIds(),p=_.indexOf(h[0]);p>=0?g=parseInt(h[0],10):l._sounds.length&&(g=l._sounds[0]._id,f=parseFloat(h[0]))}else h.length===2&&(f=parseFloat(h[0]),g=parseInt(h[1],10));if(typeof g>"u")return 0;if(typeof f=="number"&&(l._state!=="loaded"||l._playLock))return l._queue.push({event:"seek",action:function(){l.seek.apply(l,h)}}),l;var m=l._soundById(g);if(m)if(typeof f=="number"&&f>=0){var x=l.playing(g);x&&l.pause(g,!0),m._seek=f,m._ended=!1,l._clearTimer(g),!l._webAudio&&m._node&&!isNaN(m._node.duration)&&(m._node.currentTime=f);var y=function(){x&&l.play(g,!0),l._emit("seek",g)};if(x&&!l._webAudio){var b=function(){l._playLock?setTimeout(b,0):y()};setTimeout(b,0)}else y()}else if(l._webAudio){var C=l.playing(g)?t.ctx.currentTime-m._playStart:0,E=m._rateSeek?m._rateSeek-m._seek:0;return m._seek+(E+C*Math.abs(m._rate))}else return m._node.currentTime;return l},playing:function(l){var h=this;if(typeof l=="number"){var f=h._soundById(l);return f?!f._paused:!1}for(var g=0;g<h._sounds.length;g++)if(!h._sounds[g]._paused)return!0;return!1},duration:function(l){var h=this,f=h._duration,g=h._soundById(l);return g&&(f=h._sprite[g._sprite][1]/1e3),f},state:function(){return this._state},unload:function(){for(var l=this,h=l._sounds,f=0;f<h.length;f++)h[f]._paused||l.stop(h[f]._id),l._webAudio||(l._clearSound(h[f]._node),h[f]._node.removeEventListener("error",h[f]._errorFn,!1),h[f]._node.removeEventListener(t._canPlayEvent,h[f]._loadFn,!1),h[f]._node.removeEventListener("ended",h[f]._endFn,!1),t._releaseHtml5Audio(h[f]._node)),delete h[f]._node,l._clearTimer(h[f]._id);var g=t._howls.indexOf(l);g>=0&&t._howls.splice(g,1);var _=!0;for(f=0;f<t._howls.length;f++)if(t._howls[f]._src===l._src||l._src.indexOf(t._howls[f]._src)>=0){_=!1;break}return r&&_&&delete r[l._src],t.noAudio=!1,l._state="unloaded",l._sounds=[],l=null,null},on:function(l,h,f,g){var _=this,p=_["_on"+l];return typeof h=="function"&&p.push(g?{id:f,fn:h,once:g}:{id:f,fn:h}),_},off:function(l,h,f){var g=this,_=g["_on"+l],p=0;if(typeof h=="number"&&(f=h,h=null),h||f)for(p=0;p<_.length;p++){var m=f===_[p].id;if(h===_[p].fn&&m||!h&&m){_.splice(p,1);break}}else if(l)g["_on"+l]=[];else{var x=Object.keys(g);for(p=0;p<x.length;p++)x[p].indexOf("_on")===0&&Array.isArray(g[x[p]])&&(g[x[p]]=[])}return g},once:function(l,h,f){var g=this;return g.on(l,h,f,1),g},_emit:function(l,h,f){for(var g=this,_=g["_on"+l],p=_.length-1;p>=0;p--)(!_[p].id||_[p].id===h||l==="load")&&(setTimeout(function(m){m.call(this,h,f)}.bind(g,_[p].fn),0),_[p].once&&g.off(l,_[p].fn,_[p].id));return g._loadQueue(l),g},_loadQueue:function(l){var h=this;if(h._queue.length>0){var f=h._queue[0];f.event===l&&(h._queue.shift(),h._loadQueue()),l||f.action()}return h},_ended:function(l){var h=this,f=l._sprite;if(!h._webAudio&&l._node&&!l._node.paused&&!l._node.ended&&l._node.currentTime<l._stop)return setTimeout(h._ended.bind(h,l),100),h;var g=!!(l._loop||h._sprite[f][2]);if(h._emit("end",l._id),!h._webAudio&&g&&h.stop(l._id,!0).play(l._id),h._webAudio&&g){h._emit("play",l._id),l._seek=l._start||0,l._rateSeek=0,l._playStart=t.ctx.currentTime;var _=(l._stop-l._start)*1e3/Math.abs(l._rate);h._endTimers[l._id]=setTimeout(h._ended.bind(h,l),_)}return h._webAudio&&!g&&(l._paused=!0,l._ended=!0,l._seek=l._start||0,l._rateSeek=0,h._clearTimer(l._id),h._cleanBuffer(l._node),t._autoSuspend()),!h._webAudio&&!g&&h.stop(l._id,!0),h},_clearTimer:function(l){var h=this;if(h._endTimers[l]){if(typeof h._endTimers[l]!="function")clearTimeout(h._endTimers[l]);else{var f=h._soundById(l);f&&f._node&&f._node.removeEventListener("ended",h._endTimers[l],!1)}delete h._endTimers[l]}return h},_soundById:function(l){for(var h=this,f=0;f<h._sounds.length;f++)if(l===h._sounds[f]._id)return h._sounds[f];return null},_inactiveSound:function(){var l=this;l._drain();for(var h=0;h<l._sounds.length;h++)if(l._sounds[h]._ended)return l._sounds[h].reset();return new n(l)},_drain:function(){var l=this,h=l._pool,f=0,g=0;if(!(l._sounds.length<h)){for(g=0;g<l._sounds.length;g++)l._sounds[g]._ended&&f++;for(g=l._sounds.length-1;g>=0;g--){if(f<=h)return;l._sounds[g]._ended&&(l._webAudio&&l._sounds[g]._node&&l._sounds[g]._node.disconnect(0),l._sounds.splice(g,1),f--)}}},_getSoundIds:function(l){var h=this;if(typeof l>"u"){for(var f=[],g=0;g<h._sounds.length;g++)f.push(h._sounds[g]._id);return f}else return[l]},_refreshBuffer:function(l){var h=this;return l._node.bufferSource=t.ctx.createBufferSource(),l._node.bufferSource.buffer=r[h._src],l._panner?l._node.bufferSource.connect(l._panner):l._node.bufferSource.connect(l._node),l._node.bufferSource.loop=l._loop,l._loop&&(l._node.bufferSource.loopStart=l._start||0,l._node.bufferSource.loopEnd=l._stop||0),l._node.bufferSource.playbackRate.setValueAtTime(l._rate,t.ctx.currentTime),h},_cleanBuffer:function(l){var h=this,f=t._navigator&&t._navigator.vendor.indexOf("Apple")>=0;if(!l.bufferSource)return h;if(t._scratchBuffer&&l.bufferSource&&(l.bufferSource.onended=null,l.bufferSource.disconnect(0),f))try{l.bufferSource.buffer=t._scratchBuffer}catch{}return l.bufferSource=null,h},_clearSound:function(l){var h=/MSIE |Trident\//.test(t._navigator&&t._navigator.userAgent);h||(l.src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA")}};var n=function(l){this._parent=l,this.init()};n.prototype={init:function(){var l=this,h=l._parent;return l._muted=h._muted,l._loop=h._loop,l._volume=h._volume,l._rate=h._rate,l._seek=0,l._paused=!0,l._ended=!0,l._sprite="__default",l._id=++t._counter,h._sounds.push(l),l.create(),l},create:function(){var l=this,h=l._parent,f=t._muted||l._muted||l._parent._muted?0:l._volume;return h._webAudio?(l._node=typeof t.ctx.createGain>"u"?t.ctx.createGainNode():t.ctx.createGain(),l._node.gain.setValueAtTime(f,t.ctx.currentTime),l._node.paused=!0,l._node.connect(t.masterGain)):t.noAudio||(l._node=t._obtainHtml5Audio(),l._errorFn=l._errorListener.bind(l),l._node.addEventListener("error",l._errorFn,!1),l._loadFn=l._loadListener.bind(l),l._node.addEventListener(t._canPlayEvent,l._loadFn,!1),l._endFn=l._endListener.bind(l),l._node.addEventListener("ended",l._endFn,!1),l._node.src=h._src,l._node.preload=h._preload===!0?"auto":h._preload,l._node.volume=f*t.volume(),l._node.load()),l},reset:function(){var l=this,h=l._parent;return l._muted=h._muted,l._loop=h._loop,l._volume=h._volume,l._rate=h._rate,l._seek=0,l._rateSeek=0,l._paused=!0,l._ended=!0,l._sprite="__default",l._id=++t._counter,l},_errorListener:function(){var l=this;l._parent._emit("loaderror",l._id,l._node.error?l._node.error.code:0),l._node.removeEventListener("error",l._errorFn,!1)},_loadListener:function(){var l=this,h=l._parent;h._duration=Math.ceil(l._node.duration*10)/10,Object.keys(h._sprite).length===0&&(h._sprite={__default:[0,h._duration*1e3]}),h._state!=="loaded"&&(h._state="loaded",h._emit("load"),h._loadQueue()),l._node.removeEventListener(t._canPlayEvent,l._loadFn,!1)},_endListener:function(){var l=this,h=l._parent;h._duration===1/0&&(h._duration=Math.ceil(l._node.duration*10)/10,h._sprite.__default[1]===1/0&&(h._sprite.__default[1]=h._duration*1e3),h._ended(l)),l._node.removeEventListener("ended",l._endFn,!1)}};var r={},a=function(l){var h=l._src;if(r[h]){l._duration=r[h].duration,u(l);return}if(/^data:[^;]+;base64,/.test(h)){for(var f=atob(h.split(",")[1]),g=new Uint8Array(f.length),_=0;_<f.length;++_)g[_]=f.charCodeAt(_);c(g.buffer,l)}else{var p=new XMLHttpRequest;p.open(l._xhr.method,h,!0),p.withCredentials=l._xhr.withCredentials,p.responseType="arraybuffer",l._xhr.headers&&Object.keys(l._xhr.headers).forEach(function(m){p.setRequestHeader(m,l._xhr.headers[m])}),p.onload=function(){var m=(p.status+"")[0];if(m!=="0"&&m!=="2"&&m!=="3"){l._emit("loaderror",null,"Failed loading audio file with status: "+p.status+".");return}c(p.response,l)},p.onerror=function(){l._webAudio&&(l._html5=!0,l._webAudio=!1,l._sounds=[],delete r[h],l.load())},o(p)}},o=function(l){try{l.send()}catch{l.onerror()}},c=function(l,h){var f=function(){h._emit("loaderror",null,"Decoding audio data failed.")},g=function(_){_&&h._sounds.length>0?(r[h._src]=_,u(h,_)):f()};typeof Promise<"u"&&t.ctx.decodeAudioData.length===1?t.ctx.decodeAudioData(l).then(g).catch(f):t.ctx.decodeAudioData(l,g,f)},u=function(l,h){h&&!l._duration&&(l._duration=h.duration),Object.keys(l._sprite).length===0&&(l._sprite={__default:[0,l._duration*1e3]}),l._state!=="loaded"&&(l._state="loaded",l._emit("load"),l._loadQueue())},d=function(){if(t.usingWebAudio){try{typeof AudioContext<"u"?t.ctx=new AudioContext:typeof webkitAudioContext<"u"?t.ctx=new webkitAudioContext:t.usingWebAudio=!1}catch{t.usingWebAudio=!1}t.ctx||(t.usingWebAudio=!1);var l=/iP(hone|od|ad)/.test(t._navigator&&t._navigator.platform),h=t._navigator&&t._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/),f=h?parseInt(h[1],10):null;if(l&&f&&f<9){var g=/safari/.test(t._navigator&&t._navigator.userAgent.toLowerCase());t._navigator&&!g&&(t.usingWebAudio=!1)}t.usingWebAudio&&(t.masterGain=typeof t.ctx.createGain>"u"?t.ctx.createGainNode():t.ctx.createGain(),t.masterGain.gain.setValueAtTime(t._muted?0:t._volume,t.ctx.currentTime),t.masterGain.connect(t.ctx.destination)),t._setup()}};s.Howler=t,s.Howl=i,typeof ar<"u"?(ar.HowlerGlobal=e,ar.Howler=t,ar.Howl=i,ar.Sound=n):typeof window<"u"&&(window.HowlerGlobal=e,window.Howler=t,window.Howl=i,window.Sound=n)})();/*!
 *  Spatial Plugin - Adds support for stereo and 3D audio where Web Audio is supported.
 *  
 *  howler.js v2.2.4
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */(function(){HowlerGlobal.prototype._pos=[0,0,0],HowlerGlobal.prototype._orientation=[0,0,-1,0,1,0],HowlerGlobal.prototype.stereo=function(t){var i=this;if(!i.ctx||!i.ctx.listener)return i;for(var n=i._howls.length-1;n>=0;n--)i._howls[n].stereo(t);return i},HowlerGlobal.prototype.pos=function(t,i,n){var r=this;if(!r.ctx||!r.ctx.listener)return r;if(i=typeof i!="number"?r._pos[1]:i,n=typeof n!="number"?r._pos[2]:n,typeof t=="number")r._pos=[t,i,n],typeof r.ctx.listener.positionX<"u"?(r.ctx.listener.positionX.setTargetAtTime(r._pos[0],Howler.ctx.currentTime,.1),r.ctx.listener.positionY.setTargetAtTime(r._pos[1],Howler.ctx.currentTime,.1),r.ctx.listener.positionZ.setTargetAtTime(r._pos[2],Howler.ctx.currentTime,.1)):r.ctx.listener.setPosition(r._pos[0],r._pos[1],r._pos[2]);else return r._pos;return r},HowlerGlobal.prototype.orientation=function(t,i,n,r,a,o){var c=this;if(!c.ctx||!c.ctx.listener)return c;var u=c._orientation;if(i=typeof i!="number"?u[1]:i,n=typeof n!="number"?u[2]:n,r=typeof r!="number"?u[3]:r,a=typeof a!="number"?u[4]:a,o=typeof o!="number"?u[5]:o,typeof t=="number")c._orientation=[t,i,n,r,a,o],typeof c.ctx.listener.forwardX<"u"?(c.ctx.listener.forwardX.setTargetAtTime(t,Howler.ctx.currentTime,.1),c.ctx.listener.forwardY.setTargetAtTime(i,Howler.ctx.currentTime,.1),c.ctx.listener.forwardZ.setTargetAtTime(n,Howler.ctx.currentTime,.1),c.ctx.listener.upX.setTargetAtTime(r,Howler.ctx.currentTime,.1),c.ctx.listener.upY.setTargetAtTime(a,Howler.ctx.currentTime,.1),c.ctx.listener.upZ.setTargetAtTime(o,Howler.ctx.currentTime,.1)):c.ctx.listener.setOrientation(t,i,n,r,a,o);else return u;return c},Howl.prototype.init=function(t){return function(i){var n=this;return n._orientation=i.orientation||[1,0,0],n._stereo=i.stereo||null,n._pos=i.pos||null,n._pannerAttr={coneInnerAngle:typeof i.coneInnerAngle<"u"?i.coneInnerAngle:360,coneOuterAngle:typeof i.coneOuterAngle<"u"?i.coneOuterAngle:360,coneOuterGain:typeof i.coneOuterGain<"u"?i.coneOuterGain:0,distanceModel:typeof i.distanceModel<"u"?i.distanceModel:"inverse",maxDistance:typeof i.maxDistance<"u"?i.maxDistance:1e4,panningModel:typeof i.panningModel<"u"?i.panningModel:"HRTF",refDistance:typeof i.refDistance<"u"?i.refDistance:1,rolloffFactor:typeof i.rolloffFactor<"u"?i.rolloffFactor:1},n._onstereo=i.onstereo?[{fn:i.onstereo}]:[],n._onpos=i.onpos?[{fn:i.onpos}]:[],n._onorientation=i.onorientation?[{fn:i.onorientation}]:[],t.call(this,i)}}(Howl.prototype.init),Howl.prototype.stereo=function(t,i){var n=this;if(!n._webAudio)return n;if(n._state!=="loaded")return n._queue.push({event:"stereo",action:function(){n.stereo(t,i)}}),n;var r=typeof Howler.ctx.createStereoPanner>"u"?"spatial":"stereo";if(typeof i>"u")if(typeof t=="number")n._stereo=t,n._pos=[t,0,0];else return n._stereo;for(var a=n._getSoundIds(i),o=0;o<a.length;o++){var c=n._soundById(a[o]);if(c)if(typeof t=="number")c._stereo=t,c._pos=[t,0,0],c._node&&(c._pannerAttr.panningModel="equalpower",(!c._panner||!c._panner.pan)&&e(c,r),r==="spatial"?typeof c._panner.positionX<"u"?(c._panner.positionX.setValueAtTime(t,Howler.ctx.currentTime),c._panner.positionY.setValueAtTime(0,Howler.ctx.currentTime),c._panner.positionZ.setValueAtTime(0,Howler.ctx.currentTime)):c._panner.setPosition(t,0,0):c._panner.pan.setValueAtTime(t,Howler.ctx.currentTime)),n._emit("stereo",c._id);else return c._stereo}return n},Howl.prototype.pos=function(t,i,n,r){var a=this;if(!a._webAudio)return a;if(a._state!=="loaded")return a._queue.push({event:"pos",action:function(){a.pos(t,i,n,r)}}),a;if(i=typeof i!="number"?0:i,n=typeof n!="number"?-.5:n,typeof r>"u")if(typeof t=="number")a._pos=[t,i,n];else return a._pos;for(var o=a._getSoundIds(r),c=0;c<o.length;c++){var u=a._soundById(o[c]);if(u)if(typeof t=="number")u._pos=[t,i,n],u._node&&((!u._panner||u._panner.pan)&&e(u,"spatial"),typeof u._panner.positionX<"u"?(u._panner.positionX.setValueAtTime(t,Howler.ctx.currentTime),u._panner.positionY.setValueAtTime(i,Howler.ctx.currentTime),u._panner.positionZ.setValueAtTime(n,Howler.ctx.currentTime)):u._panner.setPosition(t,i,n)),a._emit("pos",u._id);else return u._pos}return a},Howl.prototype.orientation=function(t,i,n,r){var a=this;if(!a._webAudio)return a;if(a._state!=="loaded")return a._queue.push({event:"orientation",action:function(){a.orientation(t,i,n,r)}}),a;if(i=typeof i!="number"?a._orientation[1]:i,n=typeof n!="number"?a._orientation[2]:n,typeof r>"u")if(typeof t=="number")a._orientation=[t,i,n];else return a._orientation;for(var o=a._getSoundIds(r),c=0;c<o.length;c++){var u=a._soundById(o[c]);if(u)if(typeof t=="number")u._orientation=[t,i,n],u._node&&(u._panner||(u._pos||(u._pos=a._pos||[0,0,-.5]),e(u,"spatial")),typeof u._panner.orientationX<"u"?(u._panner.orientationX.setValueAtTime(t,Howler.ctx.currentTime),u._panner.orientationY.setValueAtTime(i,Howler.ctx.currentTime),u._panner.orientationZ.setValueAtTime(n,Howler.ctx.currentTime)):u._panner.setOrientation(t,i,n)),a._emit("orientation",u._id);else return u._orientation}return a},Howl.prototype.pannerAttr=function(){var t=this,i=arguments,n,r,a;if(!t._webAudio)return t;if(i.length===0)return t._pannerAttr;if(i.length===1)if(typeof i[0]=="object")n=i[0],typeof r>"u"&&(n.pannerAttr||(n.pannerAttr={coneInnerAngle:n.coneInnerAngle,coneOuterAngle:n.coneOuterAngle,coneOuterGain:n.coneOuterGain,distanceModel:n.distanceModel,maxDistance:n.maxDistance,refDistance:n.refDistance,rolloffFactor:n.rolloffFactor,panningModel:n.panningModel}),t._pannerAttr={coneInnerAngle:typeof n.pannerAttr.coneInnerAngle<"u"?n.pannerAttr.coneInnerAngle:t._coneInnerAngle,coneOuterAngle:typeof n.pannerAttr.coneOuterAngle<"u"?n.pannerAttr.coneOuterAngle:t._coneOuterAngle,coneOuterGain:typeof n.pannerAttr.coneOuterGain<"u"?n.pannerAttr.coneOuterGain:t._coneOuterGain,distanceModel:typeof n.pannerAttr.distanceModel<"u"?n.pannerAttr.distanceModel:t._distanceModel,maxDistance:typeof n.pannerAttr.maxDistance<"u"?n.pannerAttr.maxDistance:t._maxDistance,refDistance:typeof n.pannerAttr.refDistance<"u"?n.pannerAttr.refDistance:t._refDistance,rolloffFactor:typeof n.pannerAttr.rolloffFactor<"u"?n.pannerAttr.rolloffFactor:t._rolloffFactor,panningModel:typeof n.pannerAttr.panningModel<"u"?n.pannerAttr.panningModel:t._panningModel});else return a=t._soundById(parseInt(i[0],10)),a?a._pannerAttr:t._pannerAttr;else i.length===2&&(n=i[0],r=parseInt(i[1],10));for(var o=t._getSoundIds(r),c=0;c<o.length;c++)if(a=t._soundById(o[c]),a){var u=a._pannerAttr;u={coneInnerAngle:typeof n.coneInnerAngle<"u"?n.coneInnerAngle:u.coneInnerAngle,coneOuterAngle:typeof n.coneOuterAngle<"u"?n.coneOuterAngle:u.coneOuterAngle,coneOuterGain:typeof n.coneOuterGain<"u"?n.coneOuterGain:u.coneOuterGain,distanceModel:typeof n.distanceModel<"u"?n.distanceModel:u.distanceModel,maxDistance:typeof n.maxDistance<"u"?n.maxDistance:u.maxDistance,refDistance:typeof n.refDistance<"u"?n.refDistance:u.refDistance,rolloffFactor:typeof n.rolloffFactor<"u"?n.rolloffFactor:u.rolloffFactor,panningModel:typeof n.panningModel<"u"?n.panningModel:u.panningModel};var d=a._panner;d||(a._pos||(a._pos=t._pos||[0,0,-.5]),e(a,"spatial"),d=a._panner),d.coneInnerAngle=u.coneInnerAngle,d.coneOuterAngle=u.coneOuterAngle,d.coneOuterGain=u.coneOuterGain,d.distanceModel=u.distanceModel,d.maxDistance=u.maxDistance,d.refDistance=u.refDistance,d.rolloffFactor=u.rolloffFactor,d.panningModel=u.panningModel}return t},Sound.prototype.init=function(t){return function(){var i=this,n=i._parent;i._orientation=n._orientation,i._stereo=n._stereo,i._pos=n._pos,i._pannerAttr=n._pannerAttr,t.call(this),i._stereo?n.stereo(i._stereo):i._pos&&n.pos(i._pos[0],i._pos[1],i._pos[2],i._id)}}(Sound.prototype.init),Sound.prototype.reset=function(t){return function(){var i=this,n=i._parent;return i._orientation=n._orientation,i._stereo=n._stereo,i._pos=n._pos,i._pannerAttr=n._pannerAttr,i._stereo?n.stereo(i._stereo):i._pos?n.pos(i._pos[0],i._pos[1],i._pos[2],i._id):i._panner&&(i._panner.disconnect(0),i._panner=void 0,n._refreshBuffer(i)),t.call(this)}}(Sound.prototype.reset);var e=function(t,i){i=i||"spatial",i==="spatial"?(t._panner=Howler.ctx.createPanner(),t._panner.coneInnerAngle=t._pannerAttr.coneInnerAngle,t._panner.coneOuterAngle=t._pannerAttr.coneOuterAngle,t._panner.coneOuterGain=t._pannerAttr.coneOuterGain,t._panner.distanceModel=t._pannerAttr.distanceModel,t._panner.maxDistance=t._pannerAttr.maxDistance,t._panner.refDistance=t._pannerAttr.refDistance,t._panner.rolloffFactor=t._pannerAttr.rolloffFactor,t._panner.panningModel=t._pannerAttr.panningModel,typeof t._panner.positionX<"u"?(t._panner.positionX.setValueAtTime(t._pos[0],Howler.ctx.currentTime),t._panner.positionY.setValueAtTime(t._pos[1],Howler.ctx.currentTime),t._panner.positionZ.setValueAtTime(t._pos[2],Howler.ctx.currentTime)):t._panner.setPosition(t._pos[0],t._pos[1],t._pos[2]),typeof t._panner.orientationX<"u"?(t._panner.orientationX.setValueAtTime(t._orientation[0],Howler.ctx.currentTime),t._panner.orientationY.setValueAtTime(t._orientation[1],Howler.ctx.currentTime),t._panner.orientationZ.setValueAtTime(t._orientation[2],Howler.ctx.currentTime)):t._panner.setOrientation(t._orientation[0],t._orientation[1],t._orientation[2])):(t._panner=Howler.ctx.createStereoPanner(),t._panner.pan.setValueAtTime(t._stereo,Howler.ctx.currentTime)),t._panner.connect(t._node),t._paused||t._parent.pause(t._id,!0).play(t._id,!0)}})()})(Ia);const fM=.06;function Er(s,e,t){return s<e?e:s>t?t:s}function Ks(s){const e=(s%360+360)%360,t=[0,3,5,7,10],i=Math.floor(e/360*t.length)%t.length;return 110*Math.pow(2,t[i]/12)}function Hc(s,e=2.5){const t=Math.max(1,Math.floor(s.sampleRate*e)),i=s.createBuffer(1,t,s.sampleRate),n=i.getChannelData(0);for(let r=0;r<t;r++)n[r]=Math.random()*2-1;return i}function Rn(s){const e=s.createGain();e.gain.value=0,e.connect(s.destination);const t=[],i={master:e,started:!1,disposed:!1,register(n){t.push(n)},setVolume(n,r=fM){if(i.disposed)return;const a=s.currentTime,o=Er(n,0,1),c=e.gain;c.cancelScheduledValues(a),c.setValueAtTime(Math.max(c.value,1e-4),a),r<=.001?c.setValueAtTime(o,a):c.linearRampToValueAtTime(Math.max(o,1e-4),a+r)},stop(){if(i.disposed)return;i.disposed=!0;const n=s.currentTime;try{e.gain.cancelScheduledValues(n),e.gain.setValueAtTime(Math.max(e.gain.value,1e-4),n),e.gain.linearRampToValueAtTime(1e-4,n+.08)}catch{}const r=n+.1;for(const a of t)try{a.stop?.(r)}catch{}window.setTimeout(()=>{for(const a of t)try{a.disconnect()}catch{}try{e.disconnect()}catch{}},160)}};return i}function Cr(s,e,t,i,n){const r=s.createOscillator();r.type="sine",r.frequency.value=e;const a=s.createGain();return a.gain.value=t,n.value=i,r.connect(a).connect(n),r}function Du(s,e){const t=Rn(s),i=Ks(e.hue??200)/2,n=s.createBiquadFilter();n.type="lowpass",n.frequency.value=700,n.Q.value=.4,n.connect(t.master);const r=[1,1.5,2],a=[-6,7],o=[];for(const f of r)for(const g of a){const _=s.createOscillator();_.type=f===2?"triangle":"sine",_.frequency.value=i*f,_.detune.value=g;const p=s.createGain();p.gain.value=.16/r.length,_.connect(p).connect(n),t.register(_),t.register(p),o.push(_)}const c=Cr(s,.05,260,620,n.frequency),u=s.createOscillator();u.type="sine",u.frequency.value=.08;const d=s.createGain();d.gain.value=.12;const l=s.createConstantSource();l.offset.value=.88;const h=s.createGain();return h.gain.value=1,n.disconnect(),n.connect(h).connect(t.master),u.connect(d).connect(h.gain),l.connect(h.gain),t.register(c),t.register(u),t.register(l),t.register(h),t.register(n),{start(){if(t.started||t.disposed)return;t.started=!0;const f=s.currentTime+.02;for(const g of o)g.start(f);c.start(f),u.start(f),l.start(f)},stop:()=>t.stop(),setVolume:(f,g)=>t.setVolume(f,g)}}function pM(s,e){const t=Rn(s),i=Ks(e.hue??210)/4,n=s.createBiquadFilter();n.type="lowpass",n.frequency.value=380,n.Q.value=.6,n.connect(t.master);const r=[];for(const[o,c]of[[1,-4],[1,5],[2,0]]){const u=s.createOscillator();u.type=o===2?"sine":"sawtooth",u.frequency.value=i*o,u.detune.value=c;const d=s.createGain();d.gain.value=o===2?.05:.14,u.connect(d).connect(n),t.register(u),t.register(d),r.push(u)}const a=Cr(s,.03,120,340,n.frequency);return t.register(a),t.register(n),{start(){if(t.started||t.disposed)return;t.started=!0;const o=s.currentTime+.02;for(const c of r)c.start(o);a.start(o)},stop:()=>t.stop(),setVolume:(o,c)=>t.setVolume(o,c)}}function mM(s,e){const t=Rn(s),i=s.createBufferSource();i.buffer=Hc(s,3),i.loop=!0;const n=s.createBiquadFilter();n.type="highpass",n.frequency.value=900;const r=s.createBiquadFilter();r.type="lowpass",r.frequency.value=6500;const a=s.createGain();a.gain.value=.5,i.connect(n).connect(r).connect(a).connect(t.master);const o=Cr(s,.07,.18,.5,a.gain);return t.register(i),t.register(n),t.register(r),t.register(a),t.register(o),{start(){if(t.started||t.disposed)return;t.started=!0;const c=s.currentTime+.02;i.start(c),o.start(c)},stop:()=>t.stop(),setVolume:(c,u)=>t.setVolume(c,u)}}function gM(s,e){const t=Rn(s),i=Ks(e.hue??200)/4,n=s.createOscillator();n.type="sine",n.frequency.value=Er(i,45,90);const r=s.createGain();r.gain.value=.12,n.connect(r).connect(t.master);const a=s.createOscillator();a.type="sine",a.frequency.value=Er(i,45,90)*1.5,a.detune.value=4;const o=s.createGain();o.gain.value=.04,a.connect(o).connect(t.master);const c=s.createBufferSource();c.buffer=Hc(s,2.5),c.loop=!0;const u=s.createBiquadFilter();u.type="lowpass",u.frequency.value=420;const d=s.createGain();return d.gain.value=.05,c.connect(u).connect(d).connect(t.master),t.register(n),t.register(a),t.register(r),t.register(o),t.register(c),t.register(u),t.register(d),{start(){if(t.started||t.disposed)return;t.started=!0;const l=s.currentTime+.02;n.start(l),a.start(l),c.start(l)},stop:()=>t.stop(),setVolume:(l,h)=>t.setVolume(l,h)}}function _M(s,e){const t=Rn(s),i=s.createBufferSource();i.buffer=Hc(s,3),i.loop=!0;const n=s.createBiquadFilter();n.type="bandpass",n.frequency.value=500,n.Q.value=1.2;const r=s.createGain();r.gain.value=.5,i.connect(n).connect(r).connect(t.master);const a=Cr(s,.05,380,620,n.frequency),o=Cr(s,.09,.22,.5,r.gain);return t.register(i),t.register(n),t.register(r),t.register(a),t.register(o),{start(){if(t.started||t.disposed)return;t.started=!0;const c=s.currentTime+.02;i.start(c),a.start(c),o.start(c)},stop:()=>t.stop(),setVolume:(c,u)=>t.setVolume(c,u)}}function vM(s,e){const t=Rn(s),i=Ks(e.hue??200),n=[[1,.5],[2.01,.28],[3.02,.16],[4.75,.08]],r=[],a=[];for(const[o,c]of n){const u=s.createOscillator();u.type="sine",u.frequency.value=i*o;const d=s.createGain();d.gain.value=0,u.connect(d).connect(t.master),t.register(u),t.register(d),r.push(u),a.push(d)}return{start(){if(t.started||t.disposed)return;t.started=!0;const o=s.currentTime+.01,c=Er(e.seconds??2.4,.6,4);r.forEach((u,d)=>{const l=n[d][1],h=a[d].gain;h.setValueAtTime(0,o),h.linearRampToValueAtTime(l,o+.008),h.exponentialRampToValueAtTime(1e-4,o+c*(1-d*.12)),u.start(o),u.stop(o+c+.1)})},stop:()=>t.stop(),setVolume:(o,c)=>t.setVolume(o,c===void 0?.005:c)}}function xM(s,e){const t=Rn(s),i=s.createOscillator();i.type="sine",i.frequency.value=Er(Ks(e.hue??200)*3,300,900);const n=s.createGain();n.gain.value=0;const r=s.createBiquadFilter();return r.type="lowpass",r.frequency.value=2200,i.connect(n).connect(r).connect(t.master),t.register(i),t.register(n),t.register(r),{start(){if(t.started||t.disposed)return;t.started=!0;const a=s.currentTime+.005;n.gain.setValueAtTime(0,a),n.gain.linearRampToValueAtTime(.4,a+.004),n.gain.exponentialRampToValueAtTime(1e-4,a+.16),i.frequency.setValueAtTime(i.frequency.value,a),i.frequency.exponentialRampToValueAtTime(i.frequency.value*.6,a+.14),i.start(a),i.stop(a+.22)},stop:()=>t.stop(),setVolume:(a,o)=>t.setVolume(a,o===void 0?.005:o)}}function yM(s,e){const t=Rn(s),i=s.createOscillator();i.type="sine",i.frequency.value=Ks(e.hue??200);const n=s.createGain();return n.gain.value=.2,i.connect(n).connect(t.master),t.register(i),t.register(n),{start(){t.started||t.disposed||(t.started=!0,i.start(s.currentTime+.02))},stop:()=>t.stop(),setVolume:(r,a)=>t.setVolume(r,a)}}function bM(s){switch(s){case"chime":case"click":return!1;default:return!0}}function Iu(s,e,t={}){switch(e){case"pad":return Du(s,t);case"drone":return pM(s,t);case"rain":return mM(s);case"hum":return gM(s,t);case"wind":return _M(s);case"chime":return vM(s,t);case"click":return xM(s,t);case"tone":return yM(s,t);default:return Du(s,t)}}const wM={music:.7,ambience:.55,sfx:.85},SM=.5,MM=.8,ku=.6;function Ms(s){return s<0?0:s>1?1:s}function TM(s){let e=s.trim().replace("#","");if(e.length===3&&(e=e[0]+e[0]+e[1]+e[1]+e[2]+e[2]),e.length<6)return 200;const t=parseInt(e.slice(0,2),16)/255,i=parseInt(e.slice(2,4),16)/255,n=parseInt(e.slice(4,6),16)/255;if(Number.isNaN(t)||Number.isNaN(i)||Number.isNaN(n))return 200;const r=Math.max(t,i,n),a=Math.min(t,i,n),o=r-a;if(o===0)return 200;let c;return r===t?c=(i-n)/o%6:r===i?c=(n-t)/o+2:c=(t-i)/o+4,c*=60,c<0?c+360:c}class nl{constructor(e,t,i,n,r){this.mgr=e,this.category=t,this.base=i,this.howl=n,this.synth=r}level=0;howlId;howlVol=0;freeTimer;freed=!1;start(){this.howl?(this.howlId=this.howl.play(),this.howl.loop(!0,this.howlId),this.howlVol=0,this.howl.volume(0,this.howlId)):this.synth&&(this.synth.start(),this.synth.setVolume(0,.01))}fadeTo(e,t){this.level=Ms(e);const i=this.mgr.busVolume(this.category);if(this.howl&&this.howlId!==void 0){const n=i*this.base*this.level,r=Math.max(0,Math.round(t*1e3));r<20?this.howl.volume(n,this.howlId):this.howl.fade(this.howlVol,n,r,this.howlId),this.howlVol=n}else if(this.synth){const n=this.mgr.masterVolume*i*this.base*this.level;this.synth.setVolume(n,Math.max(0,t))}}refresh(){this.fadeTo(this.level,.12)}stop(e){if(this.freed)return;this.fadeTo(0,e);const t=Math.max(0,Math.round(e*1e3))+140;this.freeTimer=window.setTimeout(()=>this.free(),t)}free(){if(!this.freed){if(this.freed=!0,this.freeTimer!==void 0&&(clearTimeout(this.freeTimer),this.freeTimer=void 0),this.howl&&this.howlId!==void 0)try{this.howl.stop(this.howlId)}catch{}if(this.synth)try{this.synth.stop()}catch{}}}}class AM{constructor(e){this.bus=e,this.unsubs.push(e.on("audio:music",({id:t,fade:i})=>this.setBed("music",t,i??ku)),e.on("audio:ambience",({id:t,fade:i})=>this.setBed("ambience",t,i??ku)),e.on("audio:sfx",({id:t})=>this.playSfx(t)))}masterVolume=.9;musicVol=.7;sfxVol=.85;unsubs=[];ctx;hue=200;music={};ambience={};sfx={};musicChannel;ambienceChannel;currentMusicId=null;currentAmbienceId=null;transientSynths=new Set;transientTimers=new Set;ownedHowls=new Set;async loadStory(e){this.teardownSounds(),this.hue=TM(e.manifest.theme.key??"#7db4c8"),this.ensureContext(),this.music=this.buildEntries("music",e.assets.music),this.ambience=this.buildEntries("ambience",e.assets.ambience),this.sfx=this.buildEntries("sfx",e.assets.sfx);const t=[];for(const i of[this.music,this.ambience,this.sfx])for(const n of Object.values(i))n.url&&t.push(this.warmHowl(n));t.length>0&&await Promise.race([Promise.all(t),new Promise(i=>window.setTimeout(i,4e3))])}applySettings(e){this.masterVolume=Ms(e.masterVolume),this.musicVol=Ms(e.musicVolume),this.sfxVol=Ms(e.sfxVolume);try{Ia.Howler.volume(this.masterVolume)}catch{}this.musicChannel?.refresh(),this.ambienceChannel?.refresh()}unlock(){this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume().catch(()=>{});try{const e=Ia.Howler.ctx;e&&e.state==="suspended"&&e.resume()}catch{}}dispose(){for(const e of this.unsubs)e();this.unsubs.length=0,this.teardownSounds(),this.ctx&&(this.ctx.close().catch(()=>{}),this.ctx=void 0)}busVolume(e){return e==="sfx"?this.sfxVol:this.musicVol}ensureContext(){if(this.ctx)return;const e=window,t=e.AudioContext??e.webkitAudioContext;if(t)try{this.ctx=new t}catch{this.ctx=void 0}}buildEntries(e,t){const i={};for(const[n,{url:r,def:a}]of Object.entries(t))i[n]={id:n,category:e,def:a,url:r,preset:this.resolvePreset(e,a)};return i}resolvePreset(e,t){if(t.synth&&t.synth.trim().length>0)return t.synth.trim();switch(e){case"music":return"pad";case"ambience":return"hum";case"sfx":default:return"chime"}}baseFor(e){const t=e.def.volume??wM[e.category];if(e.url)return Ms(t);const i=bM(e.preset)?SM:MM;return Ms(t)*i}ensureHowl(e){if(e.url){if(!e.howl){const t=e.category!=="sfx"&&(e.def.loop??!0);e.howl=new Ia.Howl({src:[e.url],loop:t,volume:1,preload:!0,html5:!1}),this.ownedHowls.add(e.howl)}return e.howl}}warmHowl(e){const t=this.ensureHowl(e);return!t||t.state()==="loaded"?Promise.resolve():new Promise(i=>{const n=()=>i();t.once("load",n),t.once("loaderror",n)})}makeBedVoice(e){const t=this.baseFor(e);if(e.url)return new nl(this,e.category,t,this.ensureHowl(e),void 0);if(this.ctx){const i=Iu(this.ctx,e.preset,{hue:this.hue});return new nl(this,e.category,t,void 0,i)}return new nl(this,e.category,t,void 0,void 0)}setBed(e,t,i){const n=e==="music",r=n?this.currentMusicId:this.currentAmbienceId,a=n?this.musicChannel:this.ambienceChannel;if(t!==null&&t===r&&a)return;if(a&&a.stop(i),t===null){n?(this.musicChannel=void 0,this.currentMusicId=null):(this.ambienceChannel=void 0,this.currentAmbienceId=null);return}const c=(n?this.music:this.ambience)[t];if(!c){n?(this.musicChannel=void 0,this.currentMusicId=null):(this.ambienceChannel=void 0,this.currentAmbienceId=null);return}const u=this.makeBedVoice(c);u.start(),u.fadeTo(1,i),n?(this.musicChannel=u,this.currentMusicId=t):(this.ambienceChannel=u,this.currentAmbienceId=t)}playSfx(e){const t=this.sfx[e];if(!t)return;const i=this.busVolume("sfx"),n=this.baseFor(t);if(t.url){const o=this.ensureHowl(t);if(!o)return;const c=o.play();o.loop(!1,c),o.volume(i*n,c);return}if(!this.ctx)return;const r=Iu(this.ctx,t.preset,{hue:this.hue,seconds:2.4});r.start(),r.setVolume(this.masterVolume*i*n,.02),this.transientSynths.add(r);const a=window.setTimeout(()=>{try{r.stop()}catch{}this.transientSynths.delete(r),this.transientTimers.delete(a)},3400);this.transientTimers.add(a)}teardownSounds(){this.musicChannel?.free(),this.ambienceChannel?.free(),this.musicChannel=void 0,this.ambienceChannel=void 0,this.currentMusicId=null,this.currentAmbienceId=null;for(const e of this.transientTimers)clearTimeout(e);this.transientTimers.clear();for(const e of this.transientSynths)try{e.stop()}catch{}this.transientSynths.clear();for(const e of this.ownedHowls)try{e.stop(),e.unload()}catch{}this.ownedHowls.clear(),this.music={},this.ambience={},this.sfx={}}}const EM=1400,CM=2e3,RM="1";async function PM(){try{const s=await fetch("/api/health",{signal:AbortSignal.timeout(CM)});if(!s.ok)return null;const e=await s.json();return e.ok!==!0||typeof e.api!="string"||e.api.split(".")[0]!==RM?null:e}catch{return null}}const lc="pq:autostart",LM=12e4;function DM(s){try{sessionStorage.setItem(lc,JSON.stringify({id:s,at:Date.now()}))}catch{}location.reload()}function IM(){try{const s=sessionStorage.getItem(lc);if(sessionStorage.removeItem(lc),!s)return null;const e=JSON.parse(s);return typeof e.id!="string"||typeof e.at!="number"||Date.now()-e.at>LM?null:e.id}catch{return null}}function Uu(s){const e=document.getElementById(s);if(!e)throw new Error(`[pq] required element #${s} not found in index.html`);return e}function kM(s,e){for(let t=s.history.length-1;t>=0;t--){const i=s.history[t];if(!i?.text)continue;const n=i.speakerName?`${i.speakerName}: `:"",r=i.text.replace(/\s+/g," ").trim(),a=`${n}${r}`;return a.length>84?`${a.slice(0,83)}…`:a}return e.subtitle??e.title}async function UM(){const s=Uu("stage"),e=Uu("ui"),t=document.getElementById("boot"),i=new Uf,n=new Rm,r=new Pm;let a=r.load();const[o,c]=await Promise.all([Cm(),PM()]),u=new Map;for(const P of o)u.set(P.manifest.id,P);const d=o.map(P=>P.manifest),l=new AM(i),h=new cn(i,s),f=new Jf(i);let g=null,_=!1,p=!1,m=!1,x=0;const y=()=>{m||(m=!0,l.unlock())},b=P=>{a=P,h.applySettings(P),L.applySettings(P),l.applySettings(P),OM(P.fullscreen)},C=P=>{if(!g)return null;const B=f.snapshot();let O;try{O=h.captureThumbnail()}catch{O=void 0}const j=new Date().toISOString();return{slot:P,state:{...B,savedAt:j},thumbnail:O,savedAt:j,label:kM(B,g.manifest),storyId:g.manifest.id,storyTitle:g.manifest.title}},E=async(P,B)=>{if(!p){p=!0;try{g=P,await Promise.all([h.loadStory(P),l.loadStory(P)]),b(a),L.applyTheme(P.manifest.theme),f.load(P,B),L.hideTitle(),F(),h.start(),y(),_=!0,f.start()}catch(O){console.error("[pq] failed to start story",O),_=!1,g=null,h.stop(),L.showTitle(d),F()}finally{p=!1}}},A={stories(){return d},getCoverUrl(P){const B=u.get(P),O=B?.manifest.cover;if(!(!B||!O))return B.assets.cg[O]},getBackdropUrl(P){const B=u.get(P);if(!B)return;const O=B.assets.cg.title_backdrop;if(O)return O;for(const j of Object.values(B.assets.backgrounds)){const V=j.layers[j.layers.length-1];if(V)return V}},startStory(P){const B=u.get(P);if(!B){console.warn(`[pq] unknown story "${P}"`);return}E(B)},continueGame(){const P=n.loadAuto();if(!P)return;const B=u.get(P.storyId);if(!B){console.warn(`[pq] autosave references missing story "${P.storyId}"`);return}E(B,P.state)},hasContinue(){const P=n.loadAuto();return!!P&&u.has(P.storyId)},saveToSlot(P){const B=C(P);B&&n.save(P,B)},loadFromSlot(P){const B=n.load(P);if(!B)return;const O=u.get(B.storyId);O&&E(O,B.state)},deleteSlot(P){n.remove(P)},listSaves(){return n.list()},applySettings(P){r.save(P),b(P)},getSettings(){return{...a}},returnToTitle(){_=!1,g=null,x&&(window.clearTimeout(x),x=0),h.stop(),i.emit("audio:music",{id:null,fade:1.2}),i.emit("audio:ambience",{id:null,fade:1.2}),L.showTitle(d)},storygenHealth(){return c},adoptStory(P){DM(P)}},L=new dM(i,e,A);h.resize(),b(a);const D=IM(),v=D?u.get(D):void 0;v?E(v):(L.showTitle(d),requestAnimationFrame(()=>requestAnimationFrame(F))),i.on("state:changed",()=>{!_||!g||x||(x=window.setTimeout(()=>{x=0;const P=C(0);P&&n.autosave(P)},EM))});let S=0;window.addEventListener("resize",()=>{S||(S=requestAnimationFrame(()=>{S=0,h.resize()}))}),document.addEventListener("visibilitychange",()=>{_&&(document.hidden?h.stop():h.start())});const H=()=>{y(),window.removeEventListener("pointerdown",H),window.removeEventListener("keydown",H)};window.addEventListener("pointerdown",H,{passive:!0}),window.addEventListener("keydown",H);function F(){if(!t||!t.isConnected)return;t.classList.add("is-out"),t.setAttribute("data-out","");const P=()=>t.remove();t.addEventListener("transitionend",P,{once:!0}),window.setTimeout(P,1200)}}function OM(s){try{const e=!!document.fullscreenElement;s&&!e?document.documentElement.requestFullscreen?.():!s&&e&&document.exitFullscreen?.()}catch{}}UM().catch(s=>{console.error("[pq] fatal boot error",s)});

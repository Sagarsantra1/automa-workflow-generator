#!/usr/bin/env node
'use strict';

const fs = require('fs');
const crypto = require('crypto');
const VERSION = '0.7.0';

function id() {
  return crypto.randomBytes(7).toString('base64url').replace(/[^A-Za-z0-9_-]/g, '');
}
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function merge(base, override) {
  if (!override || typeof override !== 'object' || Array.isArray(override)) return clone(base);
  const out = clone(base);
  for (const [k, v] of Object.entries(override)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) out[k] = merge(out[k], v);
    else out[k] = clone(v);
  }
  return out;
}

const basic = (label, data = {}, extra = {}) => ({ label, type: 'BlockBasic', data, width: 192, height: 72, input: true, outputs: ['1'], ...extra });

// Based on Automa's task definitions. User data can override any field in these defaults.
const defaults = {
  trigger: basic('trigger', {
    disableBlock:false, description:'', type:'manual', interval:60, delay:5, date:'', time:'00:00', url:'', shortcut:'',
    activeInInput:false, isUrlRegex:false, days:[], contextMenuName:'', contextTypes:[], parameters:[], preferParamsInTab:false,
    observeElement:{selector:'',baseSelector:'',matchPattern:'',targetOptions:{subtree:false,childList:true,attributes:false,attributeFilter:[],characterData:false},baseElOptions:{subtree:false,childList:true,attributes:false,attributeFilter:[],characterData:false}}
  }, { input:false }),
  'active-tab': basic('active-tab', { disableBlock:false }),
  note: { label:'note', type:'BlockNote', data:{ color:'white', disableBlock:false, drawing:false, fontSize:'regular', height:168, note:'', width:280 }, width:312, height:252, input:false, outputs:[] },
  'blocks-group': { label:'blocks-group', type:'BlockGroup', data:{disableBlock:false,name:'',blocks:[]}, width:192,height:72,input:true,outputs:['1'] },
  'event-click': basic('event-click', { disableBlock:false, description:'', findBy:'cssSelector', waitForSelector:false, waitSelectorTimeout:5000, selector:'', markEl:false, multiple:false }),
  'get-text': basic('get-text', { disableBlock:false, description:'', findBy:'cssSelector', waitForSelector:false, waitSelectorTimeout:5000, selector:'', markEl:false, multiple:false, regex:'', prefixText:'', suffixText:'', regexExp:[], dataColumn:'', saveData:true, includeTags:false, addExtraRow:false, assignVariable:false, useTextContent:false, variableName:'', extraRowValue:'', extraRowDataColumn:'' }),
  forms: basic('forms', { disableBlock:false, description:'', findBy:'cssSelector', waitForSelector:false, waitSelectorTimeout:5000, selector:'', markEl:false, multiple:false, selected:true, clearValue:true, getValue:false, saveData:false, dataColumn:'', selectOptionBy:'value', optionPosition:'1', value:'', delay:0, events:[], assignVariable:false, variableName:'', type:'text-field' }),
  delay: { label:'delay', type:'BlockDelay', data:{disableBlock:false,time:500}, width:192,height:72,input:true,outputs:['1'] },
  'javascript-code': basic('javascript-code', { disableBlock:false, description:'', timeout:20000, context:'website', code:'console.log("Hello world!");\nautomaNextBlock()', preloadScripts:[], everyNewTab:false, runBeforeLoad:false }),
  'loop-elements': basic('loop-elements', { disableBlock:false, loopId:'', selector:'', maxLoop:'0', description:'', reverseLoop:false, actionElSelector:'', findBy:'cssSelector', actionElMaxWaitTime:5, actionPageMaxWaitTime:10, loadMoreAction:'none', scrollToBottom:true, waitForSelector:false, waitSelectorTimeout:5000 }),
  'loop-data': basic('loop-data', { disableBlock:false, loopId:'', maxLoop:0, toNumber:10, fromNumber:1, startIndex:0, loopData:'[]', description:'', variableName:'', referenceKey:'', reverseLoop:false, elementSelector:'', waitForSelector:false, waitSelectorTimeout:5000, resumeLastWorkflow:false, loopThrough:'data-columns' }),
  'new-tab': basic('new-tab', { disableBlock:false, description:'', url:'', userAgent:'', active:true, tabZoom:1, inGroup:false, waitTabLoaded:false, updatePrevTab:false, customUserAgent:false }),
  'switch-tab': basic('switch-tab', { disableBlock:false, description:'', url:'', tabIndex:0, tabTitle:'', matchPattern:'', activeTab:true, createIfNoMatch:false, findTabBy:'match-patterns' }),
  'data-mapping': basic('data-mapping', { disableBlock:false, description:'', dataSource:'table', sources:[], varSourceName:'', dataColumn:'', saveData:false, assignVariable:false, variableName:'' }),
  'insert-data': basic('insert-data', { disableBlock:false, description:'', dataList:[] }),
  conditions: { label:'conditions', type:'BlockConditions', data:{disableBlock:false,description:'',conditions:[],retryConditions:false,retryCount:10,retryTimeout:1000}, width:256,height:157,input:true,outputs:[] },
  'element-exists': { label:'element-exists', type:'BlockElementExists', data:{disableBlock:false,description:'',findBy:'cssSelector',selector:'',tryCount:1,timeout:500,markEl:false,throwError:false}, width:192,height:72,input:true,outputs:['1','2'] },
  webhook: { label:'webhook', type:'BlockBasicWithFallback', data:{disableBlock:false,description:'',url:'',body:'{}',headers:[],method:'POST',timeout:10000,dataPath:'',contentType:'json',variableName:'',assignVariable:false,saveData:false,dataColumn:'',responseType:'json'}, width:192,height:72,input:true,outputs:['1','fallback'] },
  'while-loop': { label:'while-loop', type:'BlockBasicWithFallback', data:{disableBlock:false,description:'',conditions:[],retryConditions:false,retryCount:10,retryTimeout:1000}, width:256,height:157,input:true,outputs:['fallback'] },
  notification: basic('notification', { disableBlock:false, description:'', message:'', iconUrl:'', imageUrl:'', title:'Hello world!' }),
  'execute-workflow': basic('execute-workflow', { disableBlock:false, executeId:'', workflowId:'', globalData:'', description:'', insertAllVars:false, insertAllGlobalData:false }),
  'press-key': basic('press-key', { disableBlock:false, keys:'', selector:'', pressTime:'0', description:'', keysToPress:'', action:'press-key' }),
  'element-scroll': basic('element-scroll', { disableBlock:false, description:'', findBy:'cssSelector', waitForSelector:false, waitSelectorTimeout:5000, selector:'html', markEl:false, multiple:false, scrollY:0, scrollX:0, incX:false, incY:false, smooth:false, scrollIntoView:false }),
  'attribute-value': basic('attribute-value', { disableBlock:false, description:'', findBy:'cssSelector', waitForSelector:false, waitSelectorTimeout:5000, selector:'', markEl:false, multiple:false, attributeValue:'', attributeName:'', assignVariable:false, variableName:'', dataColumn:'', saveData:true, action:'get', addExtraRow:false, extraRowValue:'', extraRowDataColumn:'' }),
  'new-window': basic('new-window', { disableBlock:false, description:'', top:0,left:0,width:0,url:'',height:0,type:'normal',incognito:false,windowState:'normal' }),
  'upload-file': basic('upload-file', { disableBlock:false, findBy:'cssSelector', waitForSelector:false, waitSelectorTimeout:5000, selector:'', filePaths:[] }),
  'handle-download': basic('handle-download', { disableBlock:false, description:'', filename:'', timeout:20000, onConflict:'uniquify', waitForDownload:true, dataColumn:'', saveData:true, assignVariable:false, variableName:'', downloadId:'' }),
  'take-screenshot': basic('take-screenshot', { description:'', disableBlock:false, fileName:'', ext:'png', quality:100, dataColumn:'', variableName:'', selector:'', fullPage:false, saveToColumn:false, saveToComputer:true, assignVariable:false, captureActiveTab:true, type:'page' }),
  'increase-variable': basic('increase-variable', { disableBlock:false, description:'', variableName:'', increaseBy:1 }),
  clipboard: basic('clipboard', { disableBlock:false, description:'', type:'get', assignVariable:false, variableName:'', saveData:true, dataColumn:'', dataToCopy:'', copySelectedText:false }),
  'loop-breakpoint': { label:'loop-breakpoint', type:'BlockLoopBreakpoint', data:{clearLoop:false,disableBlock:false,loopId:''}, width:192,height:151,input:true,outputs:['1'] },
  'go-back': basic('go-back', {disableBlock:false}),
  'forward-page': basic('forward-page', {disableBlock:false}),
  'close-tab': basic('close-tab', {disableBlock:false,url:'',description:'',activeTab:true,closeType:'tab',allWindows:false}),
  'browser-event': basic('browser-event', {disableBlock:false,description:'',timeout:10000,eventName:'tab:loaded',setAsActiveTab:true,activeTabLoaded:true,tabLoadedUrl:'',tabUrl:'',fileQuery:''}),
  'export-data': basic('export-data', {disableBlock:false,name:'',refKey:'',type:'json',description:'',variableName:'',csvDelimiter:',',addBOMHeader:true,onConflict:'uniquify',dataToExport:'data-columns'}),
};

// Common friendly aliases for the simple JSON format.
const aliases = {
  click:'event-click', 'event-click':'event-click', 'get-text':'get-text', 'getText':'get-text',
  'javascript':'javascript-code', 'javascript-code':'javascript-code', 'loop-elements':'loop-elements',
  'loop-data':'loop-data', 'new-tab':'new-tab', 'switch-tab':'switch-tab', 'data-mapping':'data-mapping',
  'insert-data':'insert-data', 'element-exists':'element-exists', 'element exists':'element-exists',
  'http-request':'webhook', webhook:'webhook', 'while-loop':'while-loop', notification:'notification',
  'execute-workflow':'execute-workflow', 'press-key':'press-key', 'element-scroll':'element-scroll',
  'attribute-value':'attribute-value', 'new-window':'new-window', 'upload-file':'upload-file',
  'handle-download':'handle-download', 'take-screenshot':'take-screenshot', 'increase-variable':'increase-variable',
  clipboard:'clipboard', forms:'forms', delay:'delay', trigger:'trigger', 'active-tab':'active-tab',
  'loop-breakpoint':'loop-breakpoint', 'blocks-group':'blocks-group', note:'note'
};

function normalizeType(block) {
  if (!block || typeof block !== 'object') throw new Error('Each block must be an object.');
  const raw = block.type || block.label;
  const t = aliases[raw] || raw;
  if (!defaults[t]) throw new Error(`Unsupported block type: ${raw}`);
  return t;
}
function handleBounds(nodeId,width,height,hasInput,outputIds) {
  const ids = outputIds && outputIds.length ? outputIds : ['1'];
  const target = hasInput ? [{id:`${nodeId}-input-1`,position:'left',nodeId,type:'target',x:-24,y:height/2-8,width:16,height:16}] : [];
  const step = ids.length > 1 ? Math.min(42, Math.max(22, (height-40)/(ids.length-1))) : 0;
  const start = ids.length > 1 ? 18 : height/2-8;
  const source = ids.map((o,i)=>({id:`${nodeId}-output-${o}`,position:'right',nodeId,type:'source',x:width+8,y:start+i*step,width:16,height:16}));
  return {source,target};
}
function conditionPaths(paths) {
  return (paths || []).map((p,i)=>({id:p.id || id(), name:p.name || `Path ${i+1}`, conditions:clone(p.conditions || [])}));
}

const SELECTOR_BLOCKS = new Set([
  'event-click','get-text','forms','element-scroll','attribute-value','element-exists','upload-file'
]);
function ensureEnum(data, key, allowed, fallback, label) {
  if (data[key] == null || data[key] === '') data[key] = fallback;
  if (!allowed.includes(data[key])) {
    throw new Error(`Invalid ${label || key}: ${data[key]}. Use one of: ${allowed.join(', ')}.`);
  }
}
const TRIGGER_TYPES = [
  'interval','cron-job','context-menu','date','specific-day','on-startup','visit-web','keyboard-shortcut'
];
function normalizeSelectorData(data, label) {
  ensureEnum(data, 'findBy', ['cssSelector','xpath'], 'cssSelector', `${label} findBy`);
  if (data.waitForSelector) {
    data.waitSelectorTimeout = Number(data.waitSelectorTimeout ?? 5000);
    if (!Number.isFinite(data.waitSelectorTimeout) || data.waitSelectorTimeout < 0) {
      throw new Error(`${label} waitSelectorTimeout must be a non-negative number.`);
    }
  }
}
function normalizeFormsData(data) {
  ensureEnum(data, 'type', ['text-field','select','checkbox','radio'], 'text-field', 'forms type');
  if (data.type === 'select') {
    ensureEnum(data, 'selectOptionBy', ['value','first-option','last-option','custom-position'], 'value', 'forms selectOptionBy');
    if (data.selectOptionBy === 'custom-position') {
      data.optionPosition = String(data.optionPosition ?? '1');
      if (!/^\d+$/.test(data.optionPosition) || Number(data.optionPosition) < 0) {
        throw new Error('forms optionPosition must be a non-negative integer.');
      }
    }
  }
  if (data.type === 'checkbox' || data.type === 'radio') data.selected = Boolean(data.selected);
  if (data.type === 'text-field') data.delay = Number(data.delay ?? 0);
}
function normalizeLoopData(data) {
  ensureEnum(data, 'loopThrough', ['data-columns','numbers','google-sheets','variable','custom-data','elements'], 'data-columns', 'loop-data loopThrough');
  if (data.loopThrough === 'numbers') {
    data.fromNumber = Number(data.fromNumber ?? 1);
    data.toNumber = Number(data.toNumber ?? 10);
    if (!Number.isFinite(data.fromNumber) || !Number.isFinite(data.toNumber)) throw new Error('loop-data numbers require numeric fromNumber and toNumber.');
    if (data.toNumber <= data.fromNumber) data.toNumber = data.fromNumber + 1;
  }
  if (data.loopThrough === 'google-sheets') data.referenceKey = data.referenceKey ?? '';
  if (data.loopThrough === 'variable') data.variableName = data.variableName ?? '';
  if (data.loopThrough === 'custom-data') data.loopData = data.loopData ?? '[]';
  if (data.loopThrough === 'elements') {
    data.elementSelector = data.elementSelector ?? '';
    if (data.waitForSelector) data.waitSelectorTimeout = Number(data.waitSelectorTimeout ?? 5000);
  }
}
function normalizeLoopElements(data) {
  normalizeSelectorData(data, 'loop-elements');
  ensureEnum(data, 'loadMoreAction', ['none','click-element','click-link','scroll','scroll-up'], 'none', 'loop-elements loadMoreAction');
  if (['click-element','click-link'].includes(data.loadMoreAction)) data.actionElSelector = data.actionElSelector ?? '';
  if (['click-element','scroll','scroll-up'].includes(data.loadMoreAction)) data.actionElMaxWaitTime = Number(data.actionElMaxWaitTime ?? 5);
  if (data.loadMoreAction.includes('scroll')) data.scrollToBottom = Boolean(data.scrollToBottom);
  if (data.loadMoreAction === 'click-link') data.actionPageMaxWaitTime = Number(data.actionPageMaxWaitTime ?? 10);
}
function normalizeSwitchTab(data) {
  ensureEnum(data, 'findTabBy', ['match-patterns','tab-title','next-tab','prev-tab','tab-index'], 'match-patterns', 'switch-tab findTabBy');
  if (data.findTabBy === 'match-patterns') data.matchPattern = data.matchPattern ?? '';
  if (data.findTabBy === 'tab-title') data.tabTitle = data.tabTitle ?? '';
  if (data.findTabBy === 'tab-index') data.tabIndex = Number(data.tabIndex ?? 0);
  if (data.createIfNoMatch && ['match-patterns','tab-title'].includes(data.findTabBy)) data.url = data.url ?? '';
}
function normalizeAttributeValue(data) {
  ensureEnum(data, 'action', ['get','set'], 'get', 'attribute-value action');
  if (data.action === 'set') data.attributeValue = data.attributeValue ?? '';
}
function normalizePressKey(data) {
  ensureEnum(data, 'action', ['press-key','multiple-keys'], 'press-key', 'press-key action');
  data.pressTime = String(data.pressTime ?? '0');
  if (data.action === 'press-key') data.keys = data.keys ?? '';
  if (data.action === 'multiple-keys') data.keysToPress = data.keysToPress ?? '';
}
function normalizeClipboard(data) {
  ensureEnum(data, 'type', ['get','insert'], 'get', 'clipboard type');
  if (data.type === 'get') {
    data.assignVariable = Boolean(data.assignVariable);
    data.variableName = data.variableName ?? '';
    data.saveData = Boolean(data.saveData);
    data.dataColumn = data.dataColumn ?? '';
  } else {
    data.dataToCopy = data.dataToCopy ?? '';
    data.copySelectedText = Boolean(data.copySelectedText);
  }
}
function normalizeScreenshot(data) {
  ensureEnum(data, 'type', ['page','fullpage','element'], 'page', 'take-screenshot type');
  if (data.type === 'element') data.selector = data.selector ?? '';
  ensureEnum(data, 'ext', ['png','jpeg'], 'png', 'take-screenshot ext');
  if (data.ext === 'jpeg') {
    data.quality = Math.max(0, Math.min(100, Number(data.quality ?? 100)));
  }
  if (data.saveToComputer) {
    data.fileName = data.fileName ?? '';
  }
  if (data.saveToColumn) data.dataColumn = data.dataColumn ?? '';
  if (data.assignVariable) data.variableName = data.variableName ?? '';
}
function normalizeHandleDownload(data) {
  data.timeout = Number(data.timeout ?? 20000);
  data.waitForDownload = Boolean(data.waitForDownload);
  if (!String(data.downloadId || '').trim()) {
    data.filename = data.filename ?? '';
    ensureEnum(data, 'onConflict', ['uniquify','overwrite','prompt'], 'uniquify', 'handle-download onConflict');
  }
  if (data.waitForDownload) {
    data.dataColumn = data.dataColumn ?? '';
    data.saveData = data.saveData !== false;
    data.assignVariable = Boolean(data.assignVariable);
    data.variableName = data.variableName ?? '';
  }
}
function normalizeDataMapping(data) {
  ensureEnum(data, 'dataSource', ['table','variable'], 'table', 'data-mapping dataSource');
  data.sources = Array.isArray(data.sources) ? data.sources : [];
  if (data.dataSource === 'variable') data.varSourceName = data.varSourceName ?? '';
}
function normalizeNewTab(data) {
  data.active = Boolean(data.active);
  data.waitTabLoaded = Boolean(data.waitTabLoaded);
  data.updatePrevTab = Boolean(data.updatePrevTab);
  data.customUserAgent = Boolean(data.customUserAgent);
  if (data.customUserAgent) data.userAgent = data.userAgent ?? '';
  data.tabZoom = Number(data.tabZoom ?? 1);
  if (!Number.isFinite(data.tabZoom) || data.tabZoom < 0.25 || data.tabZoom > 4.5) throw new Error('new-tab tabZoom must be between 0.25 and 4.5.');
  if (data.active === false) data.url = data.url ?? '';
}
function normalizeNewWindow(data) {
  ensureEnum(data, 'type', ['normal','popup','panel'], 'normal', 'new-window type');
  ensureEnum(data, 'windowState', ['normal','minimized','maximized','fullscreen'], 'normal', 'new-window windowState');
  if (data.windowState === 'normal') {
    data.top = Number(data.top ?? 0); data.left = Number(data.left ?? 0);
    data.height = Number(data.height ?? 0); data.width = Number(data.width ?? 0);
  }
}
function normalizeCloseTab(data) {
  ensureEnum(data, 'closeType', ['tab','window'], 'tab', 'close-tab closeType');
  if (data.closeType === 'tab') {
    data.activeTab = Boolean(data.activeTab);
    if (!data.activeTab) data.url = data.url ?? '';
  } else {
    data.allWindows = Boolean(data.allWindows);
  }
}
function normalizeJavascriptCode(data) {
  data.timeout = Number(data.timeout ?? 20000);
  data.everyNewTab = Boolean(data.everyNewTab);
  data.runBeforeLoad = Boolean(data.runBeforeLoad);
  data.preloadScripts = Array.isArray(data.preloadScripts) ? data.preloadScripts : [];
  if (!data.everyNewTab) ensureEnum(data, 'context', ['website','background'], 'website', 'javascript-code context');
}
function normalizeWebhook(data) {
  ensureEnum(data, 'method', ['GET','POST','PUT','PATCH','DELETE','HEAD'], 'POST', 'webhook method');
  ensureEnum(data, 'contentType', ['text','json','form-data','form'], 'json', 'webhook contentType');
  ensureEnum(data, 'responseType', ['json','text','base64'], 'json', 'webhook responseType');
  data.headers = Array.isArray(data.headers) ? data.headers : [];
  if (data.method === 'GET' || data.method === 'HEAD') data.body = data.body ?? '{}';
  if (data.responseType === 'json') data.dataPath = data.dataPath ?? '';
}
function normalizeExecuteWorkflow(data) {
  data.insertAllVars = Boolean(data.insertAllVars);
  data.insertAllGlobalData = Boolean(data.insertAllGlobalData);
  if (!data.insertAllVars) data.insertVars = data.insertVars ?? '';
  if (data.insertAllGlobalData) data.globalData = data.globalData ?? '';
}
function normalizeTrigger(data) {
  if (Array.isArray(data.triggers)) {
    for (const trigger of data.triggers) {
      if (!trigger || typeof trigger !== 'object') throw new Error('trigger triggers must contain objects.');
      if (!TRIGGER_TYPES.includes(trigger.type)) {
        throw new Error(`Invalid trigger type: ${trigger.type}. Use one of: ${TRIGGER_TYPES.join(', ')}.`);
      }
      if (trigger.type === 'interval') { trigger.data = trigger.data || {}; trigger.data.interval = Number(trigger.data.interval ?? 60); }
      if (trigger.type === 'specific-day') { trigger.data = trigger.data || {}; trigger.data.days = Array.isArray(trigger.data.days) ? trigger.data.days : []; }
    }
  }
}
function normalizeConditionalData(t, data) {
  if (SELECTOR_BLOCKS.has(t)) normalizeSelectorData(data, t);
  if (t === 'forms') normalizeFormsData(data);
  if (t === 'loop-data') normalizeLoopData(data);
  if (t === 'loop-elements') normalizeLoopElements(data);
  if (t === 'switch-tab') normalizeSwitchTab(data);
  if (t === 'attribute-value') normalizeAttributeValue(data);
  if (t === 'press-key') normalizePressKey(data);
  if (t === 'clipboard') normalizeClipboard(data);
  if (t === 'take-screenshot') normalizeScreenshot(data);
  if (t === 'handle-download') normalizeHandleDownload(data);
  if (t === 'data-mapping') normalizeDataMapping(data);
  if (t === 'new-tab') normalizeNewTab(data);
  if (t === 'new-window') normalizeNewWindow(data);
  if (t === 'close-tab') normalizeCloseTab(data);
  if (t === 'javascript-code') normalizeJavascriptCode(data);
  if (t === 'webhook') normalizeWebhook(data);
  if (t === 'execute-workflow') normalizeExecuteWorkflow(data);
  if (t === 'trigger') normalizeTrigger(data);
  if (t === 'get-text') data.regexExp = Array.isArray(data.regexExp) ? data.regexExp : Object.values(data.regexExp || {});
  return data;
}
function nodePosition(block,index,layout) {
  return { x:block.position?.x ?? (layout.startX + index*layout.gapX), y:block.position?.y ?? layout.startY };
}
function nodeDimensions(block) {
  const t=normalizeType(block), d=defaults[t], data=block.data || {};
  if (t === 'note') return { width:Number(data.width ?? d.data.width)+32, height:Number(data.height ?? d.data.height)+84 };
  if (t === 'conditions' || t === 'while-loop') return { width:256, height:157 };
  return { width:d.width, height:d.height };
}
function buildNode(block,index,layout,allBlocks) {
  const t = normalizeType(block);
  const d = defaults[t];
  const nodeId = block.id || id();
  const data = merge(d.data, block.data || {});
  normalizeConditionalData(t, data);
  let {x,y}=nodePosition(block,index,layout);
  let {width,height}=nodeDimensions(block);
  if (t === 'note' && block.noteFor) {
    const targetIndex=allBlocks.findIndex(item=>item.id===block.noteFor);
    if (targetIndex < 0) throw new Error(`Note ${nodeId} refers to unknown block: ${block.noteFor}`);
    const target=allBlocks[targetIndex];
    if (normalizeType(target)==='note') throw new Error(`Note ${nodeId} cannot be placed below another note.`);
    const targetPosition=nodePosition(target,targetIndex,layout);
    const targetDimensions=nodeDimensions(target);
    x=targetPosition.x+(targetDimensions.width-width)/2;
    y=targetPosition.y+targetDimensions.height+24;
  }
  if (t === 'note') {
    data.width=Number(data.width);
    data.height=Number(data.height);
    if (!Number.isFinite(data.width) || data.width < 1 || !Number.isFinite(data.height) || data.height < 1) {
      throw new Error(`Note ${nodeId} width and height must be positive numbers.`);
    }
  }
  // Descriptions are optional. Only copy one when the user supplied it.
  // A top-level block.description takes precedence over data.description.
  const explicitDescription = block.description ?? block.data?.description;
  if (typeof explicitDescription === 'string' && explicitDescription.trim()) {
    const description = explicitDescription.trim();
    if (description.length <= 14) {
      data.description = description;
    } else {
      const shortened = description.slice(0, 14);
      const wordBoundary = shortened.lastIndexOf(' ');
      data.description = (wordBoundary >= 7 ? shortened.slice(0, wordBoundary) : shortened).trim();
    }
  }
  if ((t === 'conditions' || t === 'while-loop')) data.conditions = conditionPaths(block.paths || data.conditions || []);
  if (t === 'loop-data' && !data.loopId) data.loopId = block.loopId || `${nodeId}_loop`;
  if (t === 'loop-elements' && !data.loopId) data.loopId = block.loopId || `${nodeId}_loop`;
  if (t === 'loop-breakpoint' && !data.loopId) data.loopId = block.loopId || `${nodeId}_loop`;

  let type = d.type, hasInput=d.input, outputs=d.outputs;
  let outputIds = outputs;
  if (t === 'conditions') { type='BlockConditions'; width=256; height=157; outputIds=data.conditions.map(p=>p.id).concat(['fallback']); }
  if (t === 'while-loop') { type='BlockBasicWithFallback'; width=256; height=157; outputIds=['1','fallback']; }

  return { id:nodeId, type, dimensions:{width,height}, computedPosition:{x,y,z:1000}, handleBounds:t==='note'?{}:handleBounds(nodeId,width,height,hasInput,outputIds), selected:true, dragging:false, resizing:false, initialized:false, isParent:false, position:{x,y}, data, events:{}, label:block.label || d.label };
}
function placeNotes(nodes,blocks) {
  const byId=new Map(nodes.map(node=>[node.id,node]));
  const obstacles=nodes.filter(node=>node.type!=='BlockNote');
  const placed=[];
  for(const block of blocks) {
    if(normalizeType(block)!=='note'||!block.noteFor) continue;
    const note=byId.get(block.id), target=byId.get(block.noteFor);
    const x=target.position.x+(target.dimensions.width-note.dimensions.width)/2;
    let y=target.position.y+target.dimensions.height+24;
    for(let attempt=0;attempt<=obstacles.length+placed.length;attempt++) {
      const overlaps=[...obstacles.filter(node=>node.id!==target.id),...placed].filter(node=>
        x<node.position.x+node.dimensions.width && x+note.dimensions.width>node.position.x &&
        y<node.position.y+node.dimensions.height && y+note.dimensions.height>node.position.y
      );
      if(!overlaps.length) break;
      y=Math.max(...overlaps.map(node=>node.position.y+node.dimensions.height))+24;
    }
    note.position.x=x; note.position.y=y;
    note.computedPosition.x=x; note.computedPosition.y=y;
    placed.push(note);
  }
}
function edgeId(source,sh,target,th){ return `vueflow__edge-${source}${sh}-${target}${th}`; }
function buildEdge(edge, registry) {
  const s=registry.get(edge.from), t=registry.get(edge.to);
  if(!s||!t) throw new Error(`Edge refers to unknown node: ${edge.from} -> ${edge.to}`);
  if(s.type==='BlockNote'||t.type==='BlockNote') throw new Error('Note blocks are visual annotations and cannot be connected with edges.');
  let branch=edge.branch || '1';
  if (s.type === 'BlockElementExists' && branch === 'true') branch = '1';
  if (s.type === 'BlockElementExists' && branch === 'false') branch = '2';
  const sourceHandle=`${edge.from}-output-${branch}`;
  const targetHandle=`${edge.to}-input-1`;
  const sourceIndex = s.type==='BlockConditions' ? Math.max(0,(s.data.conditions||[]).findIndex(p=>p.id===branch)) : (branch==='fallback'?1:(branch==='2'?1:0));
  const sy=s.position.y+s.dimensions.height/2 + (s.type==='BlockConditions' ? (sourceIndex-0.5)*42 : (sourceIndex?42:0));
  const sx=s.position.x+s.dimensions.width+24;
  const tx=t.position.x-16;
  const ty=t.position.y+t.dimensions.height/2;
  return {id:edgeId(edge.from,sourceHandle,edge.to,targetHandle),type:'custom',source:edge.from,target:edge.to,sourceHandle,targetHandle,updatable:true,selectable:true,data:{},events:{},class:'connected-edges',label:'',markerEnd:'arrowclosed',sourceX:sx,sourceY:sy,targetX:tx,targetY:ty,sourceNode:clone(s),targetNode:clone(t),selected:true};
}
function compile(input){
  if(!input||typeof input!=='object'||Array.isArray(input)) throw new Error('Input must be an object.');
  if(!Array.isArray(input.blocks)) throw new Error('Input.blocks must be an array.');
  const layout={startX:input.layout?.startX??96,startY:input.layout?.startY??97,gapX:input.layout?.gapX??292};
  const registry=new Map();
  const nodes=input.blocks.map((b,i)=>buildNode(b,i,layout,input.blocks));
  placeNotes(nodes,input.blocks);
  nodes.forEach(n=>registry.set(n.id,n));
  const edges=(input.edges||[]).map(e=>buildEdge(e,registry));
  return { name: 'automa-blocks', data: { nodes, edges } };
}


// Machine-readable guidance for AI systems generating the simple input JSON.
const AI_INPUT_SPEC = {
  purpose: 'Convert simple workflow input JSON into an Automa editor block package for pasting into an existing workflow.',
  input: {
    blocks: 'Array of block objects. Each block should have a unique id and type. Optional label, description, data, and position. Note blocks may also use noteFor.',
    edges: 'Array of {from,to,branch?}. Branch defaults to "1".',
    layout: 'Optional {startX,startY,gapX} for automatic node positions.'
  },
  agentResponse: 'By default, return the simple input JSON with blocks, edges, and optional layout, followed by one short instruction for converting it. Return the generated package only when the user asks for it.',
  output: 'The generator returns {name:"automa-blocks",data:{nodes:[...],edges:[...]}} for pasting into an existing workflow. It is not a standalone workflow export.',
  workflowDesign: 'Use one shared loop body for repeated records, pages, or elements. Choose Loop Data or Loop Elements based on the input. Avoid duplicate actions and do not add loops without real repetition.',
  descriptions: 'Add a concise description for each block. Keep each description to 14 characters or fewer. The generator trims overlong descriptions to fit.',
  selectors: {
    findBy: ['cssSelector','xpath'],
    conditional: { waitForSelector: 'When true, waitSelectorTimeout is used.', markEl: 'Used only with cssSelector.' }
  },
  blocks: {
    'trigger': { fields: ['data.type','data.interval','data.delay','data.date','data.time','data.url','data.shortcut','data.days','data.contextMenuName','data.contextTypes','data.parameters','data.preferParamsInTab','data.observeElement'] },
    'active-tab': { fields: [] },
    'note': { fields: ['data.note','data.color','data.fontSize','data.width','data.height'], positioning: 'Set noteFor to a block ID to center the note below that block. The generator shifts notes down to avoid overlapping other nodes. Notes are visual annotations and do not connect to workflow edges.' },
    'blocks-group': { fields: ['data.name','data.blocks'], note: 'When editing an existing workflow, preserve this data as supplied. Its nested blocks use Automa block data.' },
    'event-click': { selector: true, fields: ['data.findBy','data.selector','data.waitForSelector','data.waitSelectorTimeout','data.markEl','data.multiple'] },
    'get-text': { selector: true, fields: ['data.findBy','data.selector','data.regex','data.regexExp','data.prefixText','data.suffixText','data.includeTags','data.useTextContent','data.saveData','data.dataColumn','data.assignVariable','data.variableName','data.addExtraRow','data.extraRowValue','data.extraRowDataColumn'] },
    'forms': { selector: true, fields: ['data.type'], conditional: {
      'text-field': ['data.value','data.clearValue','data.delay'],
      'select': ['data.selectOptionBy'],
      'selectOptionBy=value': ['data.value','data.clearValue'],
      'selectOptionBy=first-option': [],
      'selectOptionBy=last-option': [],
      'selectOptionBy=custom-position': ['data.optionPosition'],
      'checkbox': ['data.selected'],
      'radio': ['data.selected']
    }},
    'conditions': { fields: ['paths','data.retryConditions','data.retryCount','data.retryTimeout'], conditionPath: 'paths[] = {id,name?,conditions:[]}' },
    'delay': { fields: ['data.time'] },
    'javascript-code': { fields: ['data.code','data.timeout','data.context','data.everyNewTab','data.runBeforeLoad','data.preloadScripts'], conditional: { 'everyNewTab=false': ['data.context'], 'everyNewTab=true': ['data.context? optional by editor state'] } },
    'loop-elements': { selector: true, fields: ['data.loopId','data.selector','data.findBy','data.waitForSelector','data.waitSelectorTimeout','data.maxLoop','data.reverseLoop','data.loadMoreAction'], conditional: {
      'loadMoreAction=click-element': ['data.actionElSelector','data.actionElMaxWaitTime'],
      'loadMoreAction=click-link': ['data.actionElSelector','data.actionElMaxWaitTime','data.actionPageMaxWaitTime'],
      'loadMoreAction=scroll': ['data.actionElMaxWaitTime','data.scrollToBottom'],
      'loadMoreAction=scroll-up': ['data.actionElMaxWaitTime','data.scrollToBottom'],
      'loadMoreAction=none': []
    }},
    'loop-data': { fields: ['data.loopId','data.loopThrough','data.maxLoop','data.startIndex','data.resumeLastWorkflow','data.reverseLoop'], conditional: {
      'loopThrough=data-columns': [],
      'loopThrough=numbers': ['data.fromNumber','data.toNumber'],
      'loopThrough=google-sheets': ['data.referenceKey'],
      'loopThrough=variable': ['data.variableName'],
      'loopThrough=custom-data': ['data.loopData'],
      'loopThrough=elements': ['data.elementSelector','data.waitForSelector','data.waitSelectorTimeout']
    }},
    'new-tab': { fields: ['data.url','data.active','data.waitTabLoaded','data.updatePrevTab','data.inGroup','data.customUserAgent','data.userAgent','data.tabZoom'], conditional: { 'active=false': ['data.url'], 'customUserAgent=true': ['data.userAgent'] } },
    'switch-tab': { fields: ['data.findTabBy','data.createIfNoMatch','data.activeTab'], conditional: {
      'findTabBy=match-patterns': ['data.matchPattern'],
      'findTabBy=tab-title': ['data.tabTitle'],
      'findTabBy=next-tab': [], 'findTabBy=prev-tab': [],
      'findTabBy=tab-index': ['data.tabIndex'],
      'createIfNoMatch=true with match-patterns/tab-title': ['data.url']
    }},
    'data-mapping': { fields: ['data.dataSource','data.sources','data.assignVariable','data.variableName','data.saveData','data.dataColumn'], conditional: { 'dataSource=variable': ['data.varSourceName'], 'dataSource=table': ['data.sources'] } },
    'insert-data': { fields: ['data.dataList'] },
    'element-exists': { selector: true, outputs: { true: '1', false: '2' }, fields: ['data.findBy','data.selector','data.tryCount','data.timeout','data.throwError'] },
    'http-request': { alias: 'webhook', fields: ['data.method','data.url','data.contentType','data.timeout','data.headers','data.body','data.responseType','data.dataPath','data.variableName','data.assignVariable','data.saveData','data.dataColumn'], conditional: { 'method=GET or HEAD': ['data.body? not needed by editor'], 'responseType=json': ['data.dataPath'] } },
    'while-loop': { fields: ['data.conditions','data.retryConditions','data.retryCount','data.retryTimeout'], outputs: ['1','fallback'], conditionPath: 'data.conditions[]' },
    'notification': { fields: ['data.title','data.message','data.iconUrl','data.imageUrl'] },
    'execute-workflow': { fields: ['data.workflowId','data.executeId','data.insertAllGlobalData','data.globalData','data.insertAllVars','data.insertVars'] },
    'press-key': { fields: ['data.selector','data.action','data.pressTime'], conditional: { 'action=press-key': ['data.keys'], 'action=multiple-keys': ['data.keysToPress'] } },
    'element-scroll': { selector: true, fields: ['data.selector','data.findBy','data.scrollY','data.scrollX','data.incX','data.incY','data.smooth','data.scrollIntoView'] },
    'attribute-value': { selector: true, fields: ['data.findBy','data.selector','data.action','data.attributeName'], conditional: { 'action=get': ['data.assignVariable','data.variableName','data.saveData','data.dataColumn'], 'action=set': ['data.attributeValue'] } },
    'new-window': { fields: ['data.type','data.url','data.windowState','data.incognito'], conditional: { 'windowState=normal': ['data.top','data.left','data.height','data.width'] } },
    'upload-file': { selector: true, fields: ['data.findBy','data.selector','data.filePaths'] },
    'handle-download': { fields: ['data.timeout','data.downloadId','data.waitForDownload'], conditional: { 'downloadId empty': ['data.filename','data.onConflict'], 'waitForDownload=true': ['data.saveData','data.dataColumn','data.assignVariable','data.variableName'] } },
    'take-screenshot': { fields: ['data.type','data.saveToComputer','data.saveToColumn','data.assignVariable','data.ext','data.fileName'], conditional: { 'type=element': ['data.selector'], 'ext=jpeg': ['data.quality'], 'saveToComputer=true': ['data.fileName','data.ext'], 'saveToColumn=true': ['data.dataColumn'], 'assignVariable=true': ['data.variableName'] } },
    'increase-variable': { fields: ['data.variableName','data.increaseBy'] },
    'clipboard': { fields: ['data.type'], conditional: { 'type=get': ['data.assignVariable','data.variableName','data.saveData','data.dataColumn'], 'type=insert': ['data.dataToCopy','data.copySelectedText'] } },
    'loop-breakpoint': { fields: ['data.loopId','data.clearLoop'] },
    'go-back': { fields: [] },
    'forward-page': { fields: [] },
    'close-tab': { fields: ['data.closeType'], conditional: { 'closeType=tab': ['data.activeTab','data.url when activeTab=false'], 'closeType=window': ['data.allWindows'] } },
    'browser-event': { fields: ['data.eventName','data.timeout','data.setAsActiveTab','data.activeTabLoaded','data.tabLoadedUrl','data.tabUrl','data.fileQuery'] },
    'export-data': { fields: ['data.name','data.refKey','data.type','data.variableName','data.csvDelimiter','data.addBOMHeader','data.onConflict','data.dataToExport'] }
  },
  graph: {
    normal: 'branch omitted or branch="1"',
    conditions: 'branch must equal a path id, or "fallback"',
    elementExists: 'branch=true maps to output 1; branch=false maps to output 2',
    whileLoop: 'use branch="1" for the loop body and branch="fallback" for exit',
    loops: 'use the same loopId for loop-data/loop-elements and loop-breakpoint. To repeat, connect the breakpoint back to the desired loop block.',
    notes: 'Note blocks are visual only. Use noteFor with a block ID to place a note below that block. Do not connect notes with edges.'
  },
  aliases
};

function printHelp() {
  console.log([
    'Automa Workflow Generator',
    '',
    'Usage:',
    '  node automa-workflow-generator.js input.json [output.json]',
    '  node automa-workflow-generator.js --help',
    '  node automa-workflow-generator.js --schema',
    '  node automa-workflow-generator.js --example',
    '',
    'Input requirements:',
    '  { blocks: [...], edges: [...] }',
    '  IDs should be unique. Edge.from and Edge.to must match block IDs.',
    '  Add concise descriptions to blocks, with 14 characters maximum.',
    '',
    'Conditional block parameters are documented by --schema and README.'
  ].join('\n'));
}

function fullExample() {
  return {
    blocks: [
      {id:'start',type:'trigger',description:'Start'},
      {id:'tab',type:'new-tab',description:'Open page',data:{url:'https://example.com',active:true,waitTabLoaded:true}},
      {id:'click',type:'event-click',description:'Click',data:{findBy:'cssSelector',selector:'button.login',waitForSelector:true,waitSelectorTimeout:5000}},
      {id:'text',type:'get-text',description:'Get title',data:{findBy:'cssSelector',selector:'h1',assignVariable:true,variableName:'title',saveData:true,dataColumn:'Title'}},
      {id:'title-note',type:'note',noteFor:'text',data:{note:'Create a Text table column named Title, then select it in Get Text.',color:'white'}},
      {id:'form',type:'forms',description:'Fill name',data:{findBy:'cssSelector',selector:'#name',type:'text-field',value:'{{name}}',clearValue:true,delay:0}},
      {id:'exists',type:'element-exists',description:'Has result',data:{findBy:'cssSelector',selector:'.result',tryCount:2,timeout:500,throwError:false}},
      {id:'cond',type:'conditions',description:'Check result',paths:[{id:'found',name:'Found',conditions:[]},{id:'missing',name:'Missing',conditions:[]}]},
      {id:'js',type:'javascript-code',description:'Process data',data:{context:'website',code:'automaSetVariable("ready", true);\nautomaNextBlock();'}},
      {id:'loop',type:'loop-data',description:'Loop rows',loopId:'rows',data:{loopThrough:'data-columns',maxLoop:0}},
      {id:'loopEl',type:'loop-elements',description:'Loop items',loopId:'items',data:{findBy:'cssSelector',selector:'.item',loadMoreAction:'none'}},
      {id:'wait',type:'delay',description:'Wait',data:{time:1000}},
      {id:'map',type:'data-mapping',description:'Map data',data:{dataSource:'table',sources:[{id:'s1',name:'Title',destinations:[{id:'d1',name:'title'}]}]}},
      {id:'insert',type:'insert-data',description:'Save row',data:{dataList:[{name:'Result',type:'table',value:'{{title}}'}]}},
      {id:'scroll',type:'element-scroll',description:'Scroll page',data:{findBy:'cssSelector',selector:'html',scrollY:500}},
      {id:'attr',type:'attribute-value',description:'Get href',data:{findBy:'cssSelector',selector:'a.next',action:'get',attributeName:'href',assignVariable:true,variableName:'nextUrl'}},
      {id:'press',type:'press-key',description:'Press Enter',data:{action:'press-key',keys:'Enter'}},
      {id:'shot',type:'take-screenshot',description:'Capture',data:{type:'element',selector:'.result',saveToComputer:true,fileName:'result',ext:'png'}},
      {id:'copy',type:'clipboard',description:'Copy text',data:{type:'insert',dataToCopy:'{{title}}',copySelectedText:false}},
      {id:'inc',type:'increase-variable',description:'Count',data:{variableName:'page',increaseBy:1}},
      {id:'webhook',type:'http-request',description:'Send result',data:{method:'POST',url:'https://example.com/hook',contentType:'json',body:'{"title":"{{title}}"}',responseType:'json'}},
      {id:'notify',type:'notification',description:'Done',data:{title:'Done',message:'Workflow complete'}},
      {id:'execute',type:'execute-workflow',description:'Run child',data:{workflowId:'child-workflow',executeId:'run1'}},
      {id:'while',type:'while-loop',description:'Repeat',paths:[{id:'again',name:'Again',conditions:[]}]},
      {id:'switch',type:'switch-tab',description:'Find tab',data:{findTabBy:'tab-title',tabTitle:'Example'}},
      {id:'window',type:'new-window',description:'New window',data:{type:'popup',windowState:'normal',width:800,height:600}},
      {id:'upload',type:'upload-file',description:'Upload file',data:{findBy:'cssSelector',selector:'input[type=file]',filePaths:['C:/tmp/test.pdf']}},
      {id:'download',type:'handle-download',description:'Handle file',data:{downloadId:'',waitForDownload:true,filename:'result',onConflict:'uniquify'}},
      {id:'break',type:'loop-breakpoint',description:'Loop back',data:{loopId:'rows',clearLoop:false}},
      {id:'close',type:'close-tab',description:'Close tab',data:{closeType:'tab',activeTab:true}},
      {id:'back',type:'go-back',description:'Go back'},
      {id:'forward',type:'forward-page',description:'Go forward'},
      {id:'browserEvent',type:'browser-event',description:'Wait load',data:{eventName:'tab:loaded',timeout:10000}},
      {id:'export',type:'export-data',description:'Export JSON',data:{name:'result',type:'json',dataToExport:'data-columns'}}
    ],
    edges: [
      {from:'start',to:'tab'},{from:'tab',to:'click'},{from:'click',to:'text'},{from:'text',to:'form'},
      {from:'form',to:'exists'},{from:'exists',to:'cond',branch:'true'},{from:'exists',to:'back',branch:'false'},
      {from:'cond',to:'js',branch:'found'},{from:'cond',to:'notify',branch:'missing'},{from:'js',to:'loop'},
      {from:'loop',to:'loopEl'},{from:'loopEl',to:'wait'},{from:'wait',to:'map'},{from:'map',to:'insert'},{from:'insert',to:'scroll'},
      {from:'scroll',to:'attr'},{from:'attr',to:'press'},{from:'press',to:'shot'},{from:'shot',to:'copy'},{from:'copy',to:'inc'},
      {from:'inc',to:'webhook'},{from:'webhook',to:'notify'},{from:'notify',to:'execute'},{from:'execute',to:'while'},
      {from:'while',to:'switch',branch:'1'},{from:'while',to:'export',branch:'fallback'},{from:'switch',to:'window'},
      {from:'window',to:'upload'},{from:'upload',to:'download'},{from:'download',to:'break'},{from:'break',to:'loop'},
      {from:'back',to:'forward'},{from:'forward',to:'browserEvent'},{from:'browserEvent',to:'export'}
    ]
  };
}

if(require.main===module){
  const args=process.argv.slice(2);
  if(args.includes('--version')){console.log(VERSION);process.exit(0)}
  if(args.includes('--help') || args.length===0){printHelp();process.exit(0)}
  if(args.includes('--schema')){console.log(JSON.stringify(AI_INPUT_SPEC,null,2));process.exit(0)}
  if(args.includes('--example')){console.log(JSON.stringify(fullExample(),null,2));process.exit(0)}
  try{const out=compile(JSON.parse(fs.readFileSync(args[0],'utf8')));const text=JSON.stringify(out,null,2);if(args[1])fs.writeFileSync(args[1],text+'\n');else console.log(text)}catch(e){console.error(`Error: ${e.message}`);process.exit(1)}
}
module.exports={compile,defaults,aliases,VERSION,AI_INPUT_SPEC,fullExample};

const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('app/src/main/assets/apocalypse-changelog.js', 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: 'apocalypse-changelog.js' });
const data = sandbox.window.APOCALYPSE_CHANGELOG;
if (!data || typeof data !== 'object') throw new Error('Missing APOCALYPSE_CHANGELOG manifest');
for (const key of ['version', 'pcVersion', 'date', 'title', 'intro', 'sections']) {
  if (!data[key]) throw new Error('Changelog manifest is missing: ' + key);
}
const appVersion = fs.readFileSync('version.txt', 'utf8').trim();
const gradle = fs.readFileSync('app/build.gradle', 'utf8');
const pc = fs.readFileSync('apocalypse_pc.py', 'utf8');
if (data.version !== appVersion) throw new Error('Changelog version ' + data.version + ' does not match version.txt ' + appVersion);
if (!gradle.includes("versionName '" + data.version + "'")) throw new Error('Changelog version does not match app/build.gradle');
if (!pc.includes('APP_VERSION = "apocalypse-pc-v' + data.pcVersion + '"')) throw new Error('Changelog PC version does not match apocalypse_pc.py');
if (!Array.isArray(data.sections) || !data.sections.length) throw new Error('Changelog has no sections');
const ids = new Set();
let count = 0;
for (const section of data.sections) {
  if (!section.id || ids.has(section.id)) throw new Error('Missing or duplicate changelog section id: ' + section.id);
  ids.add(section.id);
  if (!section.title || !Array.isArray(section.features) || !section.features.length) throw new Error('Invalid changelog section: ' + section.id);
  for (const feature of section.features) {
    if (!feature.title || !feature.description || feature.description.length < 25) throw new Error('Feature needs a detailed title and description in section ' + section.id);
    count++;
  }
}
const html = fs.readFileSync('app/src/main/assets/apocalypse.html', 'utf8');
const js = fs.readFileSync('app/src/main/assets/apocalypse.js', 'utf8');
if (!html.includes('apocalypse-changelog.js') || !html.includes('id="journalEntries"')) throw new Error('HTML does not load the changelog manifest or render target');
if (!js.includes('renderUpdateJournal') || !js.includes('APOCALYPSE_CHANGELOG')) throw new Error('Game script does not render the changelog manifest');
for (const required of ['updateRadioSignal', 'drawRadioSignal', 'completeRadioSignal', 'radioFinds', 'survivorTrust', 'surfaceTextures', 'worldProps', 'drawWorldProp']) {
  if (!js.includes(required)) throw new Error('Endless radio-event system is missing: ' + required);
}
console.log('Apocalypse changelog validated: ' + data.version + ' / PC ' + data.pcVersion + ', ' + data.sections.length + ' sections, ' + count + ' detailed features.');

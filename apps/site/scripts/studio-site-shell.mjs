import { readFileSync } from 'node:fs';

const navigation = JSON.parse(readFileSync(new URL('../lib/site-navigation.json', import.meta.url), 'utf8'));
const header = `<header class="site-header"><div class="header-inner"><a class="brand" href="/" aria-label="Jamloom home"><img src="/studio/icon.svg" alt="" width="34" height="34">jamloom</a><nav aria-label="Main">${navigation.map(({href,label})=>`<a href="${href}">${label}</a>`).join('')}</nav></div></header>`;

// Only hosted copies get site navigation; standalone and native bundles retain local links.
export function studioSiteShell(html) {
  const original = html.match(/<header>.*?<\/header>/s)?.[0];
  const shortcuts = original?.match(/<nav aria-label="Main">(.*?)<\/nav>/s)?.[1];
  if (!original || !shortcuts) throw new Error('Studio navigation changed; review the integration.');
  const back = html.includes('class="voice-studio"') ? '<a href="/improvise">Create an AI song</a>' : '';
  const mode = original.match(/<span class="brand-mode">.*?<\/span>/)?.[0] ?? '';
  return html.replace(original, `${header}<div class="studio-page-tools">${mode}<nav aria-label="Studio shortcuts">${back}${shortcuts}</nav></div>`)
    .replace('Save the app in local remixes → Privacy &amp; credits for offline preparation', 'Open <a href="/pro">your Pro account</a> → Use the web studio offline to prepare offline access');
}

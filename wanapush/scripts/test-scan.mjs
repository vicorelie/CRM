import * as cheerio from 'cheerio';

async function scan(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'WanaPushBot' } });
  const html = await res.text();
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  const main = $("main").first().length ? $("main").first()
    : $("article").first().length ? $("article").first() : $("body");

  const firstWithClass = (sel) => main.find(sel).filter((_, el) => !!$(el).attr("class")?.trim()).first();
  const h2 = firstWithClass("h2"), h3 = firstWithClass("h3"), p = firstWithClass("p");
  const h2Class = (h2.attr("class") ?? "").trim();
  const h3Class = (h3.attr("class") ?? "").trim();
  const pClass = (p.attr("class") ?? "").trim();

  let containerClass = "", target = h2.length ? h2 : (p.length ? p : null);
  if (target) {
    let parent = target.parent();
    for (let i=0; i<5 && parent.length; i++) {
      const cls = (parent.attr("class") ?? "").trim();
      if (cls) { containerClass = cls; break; }
      parent = parent.parent();
    }
  }
  const section = main.find("section").filter((_, el) => !!$(el).attr("class")?.trim()).first();
  const sectionClass = (section.attr("class") ?? "").trim();
  return { url, containerClass, sectionClass, h2Class, h3Class, pClass, hasSignals: !!(h2Class || pClass) };
}

console.log('--- topizy.webama.fr/lp2/ ---');
console.log(JSON.stringify(await scan('https://www.topizy.webama.fr/lp2/'), null, 2));
console.log('\n--- spotifone v1/tarifs.html ---');
console.log(JSON.stringify(await scan('https://web101.spotifone.com/v1/tarifs.html'), null, 2));

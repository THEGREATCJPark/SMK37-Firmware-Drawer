import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage();
const svg=await readFile('public/icon.svg','utf8');
for(const size of [192,512]){
  await page.setViewportSize({width:size,height:size});
  await page.setContent(`<style>body{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`);
  await page.screenshot({path:`public/icon-${size}.png`,omitBackground:true});
}
console.log(`Rendered PWA icons with ${browser.version()}`);
await browser.close();

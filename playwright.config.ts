import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/ui',fullyParallel:false,timeout:30000,
  use:{baseURL:'http://127.0.0.1:4173',browserName:'chromium',headless:true,screenshot:'only-on-failure'},
  projects:[{name:'edge',use:{channel:'msedge'}},{name:'chrome',use:{channel:'chrome'}}],
  workers:1,
  outputDir:'test-results',reporter:[['list'],['html',{open:'never'}]],
  webServer:{command:'npm run preview',url:'http://127.0.0.1:4173',reuseExistingServer:true,timeout:20000},
});

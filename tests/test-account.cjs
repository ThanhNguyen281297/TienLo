/* Legacy mechanics suites use an isolated mocked account; real auth is covered by online-game.test.cjs. */
module.exports=async function installTestAccount(page){
 await page.route('**/api/session',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{id:1,username:'mechanics_test',gm:true},csrf:'test-only'})}));
 await page.route('**/api/world',r=>r.abort());
 await page.route('**/api/trade',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({trades:[],currentRevision:0})}));
 await page.route('**/api/community',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({party:null,guild:null,day:'2026-10-16',invites:[],guilds:[],rewards:[],online:[]})}));
 await page.addInitScript(()=>addEventListener('DOMContentLoaded',()=>{if(location.protocol==='file:'){account.state.ready=true;account.state.user={id:1,username:'mechanics_test',gm:true};document.getElementById('account-screen').hidden=true;}}));
};

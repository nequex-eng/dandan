/* 本地测试：先在dandan目录起http服务再跑本脚本 */
const { chromium } = require('/home/hatch/workspace/pw-bili/node_modules/playwright-core');
const URL = 'http://127.0.0.1:8901/index.html';
const results = [];
function check(name, ok, extra) { results.push({ name, ok: !!ok, extra: extra || '' }); console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (extra ? ' | ' + extra : '')); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ channel: 'chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && m.text().indexOf('501') < 0 && m.text().indexOf('Failed to load resource') < 0) errors.push('console: ' + m.text()); });

  const ev = (fn, arg) => page.evaluate(fn, arg);
  async function closeDialogues() {
    for (let i = 0; i < 16; i++) {
      const st = await ev(() => {
        const d = document.getElementById('dialogue');
        const c = document.getElementById('cook');
        const dn = document.getElementById('dinner');
        const pz = document.getElementById('puzzle');
        return { dlg: d && !d.hidden, cook: c && !c.hidden, dinner: dn && !dn.hidden, puzzle: pz && !pz.hidden };
      });
      if (st.cook) break; // 做饭单独处理
      if (st.dinner) break;
      if (st.puzzle) { await page.click('#puzzle-close'); await sleep(150); continue; }
      if (!st.dlg) return;
      await page.click('#dlg-next'); await sleep(150);
    }
  }
  async function walkAndWait() {
    // 等自动走到地点并弹出对话/做饭，最多等18秒（无头CPU渲染帧率低，走路会变慢）
    for (let i = 0; i < 60; i++) {
      const any = await ev(() => !document.getElementById('dialogue').hidden || !document.getElementById('cook').hidden);
      if (any) return true;
      await sleep(300);
    }
    return false;
  }
  async function doCook() {
    // v2做饭是火候计时：用测试钩子把火候标强制拨到绿区正中再点
    const wasOpen = await ev(() => !document.getElementById('cook').hidden);
    if (!wasOpen) return false;
    for (let i = 0; i < 8; i++) {
      const open = await ev(() => !document.getElementById('cook').hidden);
      if (!open) return true;
      await ev(() => window.__dandan.cookForceHit());
      await sleep(200);
    }
    return await ev(() => document.getElementById('cook').hidden);
  }
  async function endDayAndClose() {
    await page.click('#btn-dinner'); await sleep(300);
    const dinnerOpen = await ev(() => !document.getElementById('dinner').hidden);
    if (!dinnerOpen) return false;
    await page.click('#dinner-next'); await sleep(300);
    await closeDialogues();
    return true;
  }
  const tasksDone = () => ev(() => { const s = window.__dandan.state(); const t = s.tasksDone[s.day] || {}; return Object.keys(t).length; });
  const dayIs = n => ev(d => window.__dandan.state().day === d, n);

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(800);
    check('页面加载', await ev(() => !!window.__dandan && !!document.getElementById('cv')));
    check('开始画面可见', await ev(() => !document.getElementById('start-screen').hidden));

    // 输入名字开始
    await page.fill('#girl-name', '阿桃');
    await page.click('#btn-start'); await sleep(400);
    await closeDialogues();
    check('输入名字开始游戏', await ev(() => window.__dandan.state().girlName === '阿桃' && !document.getElementById('game-screen').hidden));
    check('第1天', await dayIs(1));

    // WASD走路
    const p0 = await ev(() => window.__dandan.player());
    await page.keyboard.down('d'); await sleep(600); await page.keyboard.up('d');
    const p1 = await ev(() => window.__dandan.player());
    check('WASD走路移动', p1.x > p0.x + 20, JSON.stringify(p0) + ' -> ' + JSON.stringify(p1));

    // 第1天：奶奶打招呼（走到奶奶身边互动）
    await ev(() => { window.__dandan.warp(245, 330); window.__dandan.interact(); });
    await sleep(300); await closeDialogues();
    check('第1天·跟奶奶打招呼', await ev(() => !!(window.__dandan.state().tasksDone[1] || {}).meet_grandma));
    // 认识丹丹 + 收拾行李（点地点按钮自动走过去）
    await ev(() => window.__dandan.goToArea('tree')); await walkAndWait();
    await sleep(2500); await closeDialogues();
    check('第1天·认识丹丹', await ev(() => !!(window.__dandan.state().tasksDone[1] || {}).meet_dog));
    await ev(() => window.__dandan.goToArea('house')); await walkAndWait();
    await sleep(2500); await closeDialogues();
    check('第1天·收拾行李', await ev(() => !!(window.__dandan.state().tasksDone[1] || {}).unpack));
    check('第1天3任务全完成', (await tasksDone()) === 3);
    check('v2·时光点：做完3件事剩3点', await ev(() => window.__dandan.actionPoints() === 3));
    check('v2·天气与时段显示', await ev(() => document.getElementById('hud-weather').textContent.length > 0));

    // 切换成丹丹 + 闻
    await page.keyboard.press('q'); await sleep(300);
    check('Q切换成丹丹', await ev(() => window.__dandan.state().mode === 'dog' && !document.getElementById('dog-actions').hidden));
    await page.click('[data-dog="smell"]'); await sleep(300);
    check('丹丹用闻无报错', await ev(() => window.__dandan.state().mode === 'dog'));
    await page.keyboard.press('q'); await sleep(200);

    // 过第1天
    check('第1天晚饭进入第2天', await endDayAndClose() && await dayIs(2));

    // 第2天：种花、浇水、丹丹挖弹珠
    await ev(() => window.__dandan.goToArea('garden')); await walkAndWait(); await sleep(2500); await closeDialogues();
    check('第2天·种向日葵', await ev(() => !!(window.__dandan.state().tasksDone[2] || {}).plant));
    await ev(() => window.__dandan.interact());
    await sleep(300); await closeDialogues();
    check('第2天·浇水', await ev(() => !!(window.__dandan.state().tasksDone[2] || {}).water));
    await page.keyboard.press('q'); await sleep(200);
    await ev(() => { window.__dandan.warpDog(230, 520); window.__dandan.dogAction('smell'); });
    await sleep(200);
    check('v2·气味轨迹实时出现', await ev(() => window.__dandan.smellTrail().length > 0));
    await ev(() => { window.__dandan.warpDog(230, 520); window.__dandan.dogAction('drill'); });
    await sleep(300); await closeDialogues();
    check('第2天·丹丹挖出旧弹珠（狗专属）', await ev(() => { const s = window.__dandan.state(); return !!(s.tasksDone[2] || {}).marble && s.fragments.indexOf('marble') >= 0; }));
    check('v2·种花成长：浇水后阶段>=1', await ev(() => window.__dandan.plantState().stage >= 1));
    await page.keyboard.press('q'); await sleep(200);
    check('第2天晚饭进入第3天', await endDayAndClose() && await dayIs(3));

    // 第3天：做饭、晒被子、喂丹丹
    await ev(() => window.__dandan.goToArea('kitchen')); await walkAndWait(); await sleep(2500);
    check('第3天·做饭小游戏打开', await ev(() => !document.getElementById('cook').hidden));
    check('第3天·西红柿炒鸡蛋做完', await doCook());
    await sleep(300); await closeDialogues();
    check('第3天·做饭任务完成且收录菜谱', await ev(() => { const s = window.__dandan.state(); return !!(s.tasksDone[3] || {}).cook && s.recipes.indexOf('tomato') >= 0; }));
    check('v2·做饭计时有得分', await ev(() => { const c = window.__dandan.cookState(); return c && c.score > 0; }));
    // v2捉迷藏：走到丹丹藏身地点附近，按互动猜
    check('v2·捉迷藏开始', await ev(() => window.__dandan.startHideSeek()));
    await ev(() => {
      const h = window.__dandan.state().hideSeek;
      const pos = { tree: [250, 235], kitchen: [220, 300], house: [490, 175], garden: [170, 485], jar: [835, 545], gate: [480, 600], roof: [800, 150], hutong: [480, 710] }[h.hiddenArea];
      window.__dandan.warp(pos[0], pos[1]);
      window.__dandan.interact();
    });
    await sleep(300); await closeDialogues();
    check('v2·捉迷藏猜中找到丹丹', await ev(() => window.__dandan.state().hideSeek.found));
    await ev(() => window.__dandan.goToArea('roof')); await walkAndWait(); await sleep(2500); await closeDialogues();
    check('第3天·晒被子', await ev(() => !!(window.__dandan.state().tasksDone[3] || {}).dry));
    await ev(() => { const d = window.__dandan.dog(); window.__dandan.warp(d.x, d.y); window.__dandan.interact(); });
    await sleep(300); await closeDialogues();
    check('第3天·喂丹丹', await ev(() => !!(window.__dandan.state().tasksDone[3] || {}).feed));
    check('第3天晚饭进入第4天', await endDayAndClose() && await dayIs(4));

    // 第4天：丹丹时间胶囊、听故事、浇水
    await page.keyboard.press('q'); await sleep(200);
    await ev(() => { window.__dandan.warpDog(890, 540); window.__dandan.dogAction('smell'); window.__dandan.dogAction('drill'); });
    await sleep(300); await closeDialogues();
    check('第4天·丹丹挖出时间胶囊（狗专属）', await ev(() => { const s = window.__dandan.state(); return !!(s.tasksDone[4] || {}).capsule && s.fragments.indexOf('capsule') >= 0; }));
    await page.keyboard.press('q'); await sleep(200);
    await ev(() => { window.__dandan.warp(245, 330); window.__dandan.interact(); });
    await sleep(300); await closeDialogues();
    check('第4天·听奶奶讲往事', await ev(() => !!(window.__dandan.state().tasksDone[4] || {}).story));
    await ev(() => window.__dandan.goToArea('garden')); await walkAndWait(); await sleep(2500); await closeDialogues();
    check('第4天·浇水', await ev(() => !!(window.__dandan.state().tasksDone[4] || {}).water2));
    check('第4天晚饭进入第5天', await endDayAndClose() && await dayIs(5));

    // 第5天：买早点、橘猫、凉拌黄瓜
    await ev(() => window.__dandan.goToArea('hutong')); await walkAndWait(); await sleep(3000); await closeDialogues();
    check('第5天·买早点', await ev(() => !!(window.__dandan.state().tasksDone[5] || {}).breakfast));
    await ev(() => window.__dandan.interact());
    await sleep(300); await closeDialogues();
    check('第5天·遇见橘猫', await ev(() => !!(window.__dandan.state().tasksDone[5] || {}).cat));
    await ev(() => window.__dandan.goToArea('kitchen')); await walkAndWait(); await sleep(2500);
    check('第5天·凉拌黄瓜做完', await doCook());
    await sleep(300); await closeDialogues();
    check('第5天·第二道菜谱收录', await ev(() => window.__dandan.state().recipes.indexOf('cucumber') >= 0));
    check('第5天晚饭进入第6天', await endDayAndClose() && await dayIs(6));

    // 第6天：丹丹找回老花镜（闻→钻叼→送奶奶）、陪奶奶、浇水
    await page.keyboard.press('q'); await sleep(200);
    await ev(() => { window.__dandan.warpDog(470, 175); window.__dandan.dogAction('drill'); });
    await sleep(300); await closeDialogues();
    check('第6天·丹丹叼起老花镜', await ev(() => window.__dandan.state().carrying === 'glasses'));
    await ev(() => { window.__dandan.warpDog(245, 330); window.__dandan.dogAction('carry'); });
    await sleep(300); await closeDialogues();
    check('第6天·老花镜送回奶奶（狗专属）', await ev(() => !!(window.__dandan.state().tasksDone[6] || {}).glasses));
    await page.keyboard.press('q'); await sleep(200);
    await ev(() => { window.__dandan.warp(245, 330); window.__dandan.interact(); });
    await sleep(300); await closeDialogues();
    check('第6天·陪奶奶坐一会儿', await ev(() => !!(window.__dandan.state().tasksDone[6] || {}).comfort));
    await ev(() => window.__dandan.goToArea('garden')); await walkAndWait(); await sleep(2500); await closeDialogues();
    check('第6天·浇水', await ev(() => !!(window.__dandan.state().tasksDone[6] || {}).water3));
    check('第6天晚饭进入第7天', await endDayAndClose() && await dayIs(7));

    // 第7天：全家福、向日葵、告别晚饭→结局
    await ev(() => window.__dandan.goToArea('tree')); await walkAndWait(); await sleep(2500); await closeDialogues();
    check('第7天·拍全家福', await ev(() => !!(window.__dandan.state().tasksDone[7] || {}).photo));
    await ev(() => window.__dandan.goToArea('garden')); await walkAndWait(); await sleep(2500); await closeDialogues();
    check('第7天·向日葵开花', await ev(() => { const s = window.__dandan.state(); return !!(s.tasksDone[7] || {}).sunflower && s.fragments.indexOf('sunflower') >= 0; }));
    await ev(() => window.__dandan.goToArea('house')); await walkAndWait(); await sleep(2500); await closeDialogues();
    check('第7天·告别晚饭任务', await ev(() => !!(window.__dandan.state().tasksDone[7] || {}).farewell));
    await page.click('#btn-dinner'); await sleep(300);
    await page.click('#dinner-next'); await sleep(400);
    check('第7天结局出现', await ev(() => !document.getElementById('ending').hidden && document.getElementById('ending-title').textContent.length > 0));
    check('结局按碎片数变化（≥6碎片圆满）', await ev(() => { const s = window.__dandan.state(); return s.fragments.length >= 6 && /圆满/.test(document.getElementById('ending-title').textContent); }));

    // 低画质开关
    await ev(() => { document.getElementById('ending').hidden = true; });
    await page.click('#btn-settings'); await sleep(200);
    await page.check('#set-lowq'); await sleep(200);
    check('低画质开关生效', await ev(() => window.__dandan.state().lowQ === true));
    await page.uncheck('#set-lowq');

    // 相册面板
    await page.click('#btn-album'); await sleep(300);
    check('相册面板显示碎片', await ev(() => !document.getElementById('collect').hidden && document.getElementById('collect-body').textContent.indexOf('旧弹珠') >= 0));
    await page.click('#collect-close'); await sleep(200);

    // v2大模型聊天：本地无后端，离线回落手写台词，不挡玩
    await page.click('#btn-chat'); await sleep(400);
    check('v2·聊天面板打开且显示离线', await ev(() => !document.getElementById('chat').hidden && document.getElementById('chat-badge').textContent.indexOf('离线') >= 0));
    await page.fill('#chat-input', '奶奶，今天吃什么？');
    await page.click('#chat-send'); await sleep(1200);
    check('v2·离线聊天有回话', await ev(() => document.getElementById('chat-log').textContent.length > 4));
    await page.click('#chat-close'); await sleep(200);
    // v2声音开关
    await page.click('#btn-sound'); await sleep(200);
    check('v2·声音开关可关', await ev(() => window.__dandan.state().soundOn === false));
    await page.click('#btn-sound'); await sleep(200);

    // 留空名字 = 小女孩
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(600);
    await page.click('#btn-start'); await sleep(400); await closeDialogues();
    check('留空名字显示为小女孩', await ev(() => window.__dandan.state().girlName === '小女孩'));

    check('全程无控制台报错', errors.length === 0, errors.slice(0, 3).join(' ; '));
  } catch (e) {
    check('测试脚本未抛异常', false, e.message);
  } finally {
    await browser.close();
  }
  const failed = results.filter(r => !r.ok);
  console.log('\n==== ' + (results.length - failed.length) + '/' + results.length + ' 通过，失败 ' + failed.length + ' 项 ====');
  process.exit(failed.length ? 1 : 0);
})();

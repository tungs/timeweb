const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { chromium, webkit, firefox } = require('playwright');

var browserType;
var oldExpect = global.expect;
var oldNewPage = global.newPage;
var oldPause = global.pause;
var testFolder = __dirname;
var browser;

// eslint-disable-next-line no-console
console.log('Env Browser: ' + process.env.BROWSER);
if (process.env.BROWSER === 'chromium') {
  browserType = chromium;
} else if (process.env.BROWSER === 'firefox') {
  browserType = firefox;
} else if (process.env.BROWSER === 'webkit') {
  browserType = webkit;
} else {
  browserType = chromium;
}
const timewebLib = fs.readFileSync(
  path.resolve(testFolder, 'pages', 'timeweb.js'),
  { encoding: 'utf8' }
);

function getTestPageURL(filePath) {
  return 'file://' + path.resolve(testFolder, 'pages', filePath);
}
before (async function () {
  this.timeout(60000);
  global.expect = expect;
  browser = await browserType.launch({
    dumpio: true
  });
  // eslint-disable-next-line no-console
  console.log(`Using browser:  ${browserType.name()} v${browser.version()}`);
  global.newPage = async function (testPage, beforeLoad) {
    var page = await browser.newPage();
    if (beforeLoad) {
      await page.addInitScript(beforeLoad);
    }
    await page.goto(getTestPageURL(testPage));
    return page;
  };
  global.pause = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  };
  // apparently some browsers (webkit) can sometimes
  // some time after opening the first page
  let firstPage = await global.newPage('basic.html');
  await firstPage.close();
});

after (async function () {
  var close = browser.close();
  global.expect = oldExpect;
  global.newPage = oldNewPage;
  global.pause = oldPause;
  return close;
});
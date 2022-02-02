const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { chromium, webkit, firefox } = require('playwright');

var browserType = chromium;
var oldExpect = global.expect;
var oldNewPage = global.newPage;
var oldPause = global.pause;
var testFolder = __dirname;
var browser;

const timewebLib = fs.readFileSync(
  path.resolve(testFolder, 'pages', 'timeweb.js'),
  { encoding: 'utf8' }
);

function getTestPageURL(filePath) {
  return 'file://' + path.resolve(testFolder, 'pages', filePath);
}
before (async function () {
  global.expect = expect;
  browser = await browserType.launch({
    dumpio: true
  });
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
});

after (async function () {
  var close = browser.close();
  global.expect = oldExpect;
  global.newPage = oldNewPage;
  global.pause = oldPause;
  return close;
});
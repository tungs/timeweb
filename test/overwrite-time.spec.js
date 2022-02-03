describe('timeweb should overwrite time handling functions', function () {
  var page;
  beforeEach(async function () {
    page = await newPage('basic.html');
  });
  afterEach(async function () {
    return page.close();
  });
  describe('Time getting functions should not increment in real time', function () {
    [
      ['Date.now()', () => Date.now() ],
      ['performance.now()', () => performance.now() ],
      ['(new Date()).getTime()', () => (new Date()).getTime() ]
    ].forEach(function ([ name, fn ]) {
      it(name, async function () {
        var time = await page.evaluate(fn);
        await pause(10);
        expect(await page.evaluate(fn)).to.equal(time);
      });
    });
  });
  describe('Time scheduling functions should not run in real time', function () {
    [
      ['setTimeout (without an argument)', () => new Promise(r => setTimeout(r)) ],
      ['setTimeout (with an argument)', () => new Promise(r => setTimeout(r, 5)) ],
      ['setInterval', () => new Promise(r => setInterval(r, 5)) ],
      ['requestAnimationFrame', () => new Promise(r => requestAnimationFrame(r)) ]
    ].forEach(function ([ name, fn ]) {
      it(name, async function () {
        expect(await Promise.race([
          pause(50).then(() => 'timed out'),
          page.evaluate(fn).then(() => `${name} resolved`)
        ])).to.equal('timed out');
      });
    });
  });
});

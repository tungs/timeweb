describe('Virtual performance.now', function () {
  var page;
  beforeEach(async function () {
    page = await newPage('basic.html');
  });
  afterEach(async function () {
    return page.close();
  });
  it('should return 0 without a goTo', async function () {
    expect(await page.evaluate(function () {
      var time = performance.now();
      if (isNaN(time)) {
        return NaN;
      }
      return time;
    })).to.equal(0);
  });
  it('should return a timestamp representing elapsed milliseconds since document creation', async function () {
    var goToTime = 128;
    var thresholdTime = 4;
    expect(await page.evaluate(async function ({ goToTime }) {
      await timeweb.goTo(goToTime);
      var time = performance.now();
      if (isNaN(time)) {
        return NaN;
      }
      return time;
    }, { goToTime })).is.within(goToTime, goToTime + thresholdTime);
  });
});
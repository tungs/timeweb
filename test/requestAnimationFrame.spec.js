describe('Virtual requestAnimationFrame', function () {
  var page;
  beforeEach(async function () {
    page = await newPage('basic.html');
  });
  afterEach(async function () {
    return page.close();
  });

  it('should return a positive integer id', async function () {
    expect(await page.evaluate(function () {
      return window.requestAnimationFrame(function () {});
    })).to.be.above(0).and.to.satisfy(Number.isInteger);
  });

  it('should not run immediately', async function () {
    expect(await page.evaluate(function () {
      var ran = false;
      requestAnimationFrame(function () {
        ran = true;
      });
      return ran;
    })).to.be.false;
  });

  describe('passes a high resolution timestamp to its callback', function () {
    it('representing elapsed milliseconds since document creation', async function () {
      var time = 128;
      var thresholdTime = 10;
      expect(await page.evaluate(function ({ time, thresholdTime }) {
        return new Promise(function (resolve) {
          window.requestAnimationFrame(function (arg) {
            if (isNaN(arg)) {
              resolve('not a number');
            } else if (arg > time + thresholdTime) {
              resolve('exceeds goTo time');
            } else if (arg >= time) {
              resolve('matches');
            }
          });
          timeweb.goTo(time);
        });
      }, { time, thresholdTime })).to.equal('matches');
    });
    it('that is the same per batch of callbacks', async function () {
      var time = 128;
      var numCallbacks = 5;
      expect(await page.evaluate(async function ({ time, numCallbacks }) {
        var state = [];
        var currState;
        requestAnimationFrame(function init() {
          currState = [];
          state.push(currState);
          requestAnimationFrame(init);
        });
        [... new Array(numCallbacks)].forEach(function () {
          requestAnimationFrame(function run(arg) {
            currState.push(arg);
            requestAnimationFrame(run);
          });
        });
        await timeweb.goTo(time);
        return state;
      }, { time, numCallbacks })).to.satisfy(function (state) {
        return state.reduce(function (a, b) {
          return a && b.reduce(function (p, c, i, arr) {
            return p && (i < 1 ? true : c === arr[i - 1]);
          });
        }, true);
      });
    });
  });

  describe('Simultaneous requests should run after a goTo', function () {
    [1, 2, 5, 10].forEach(function (numRequests) {
      it(`${numRequests} request${numRequests>1?'s':''}`, async function () {
        expect(await page.evaluate(async function ({ numRequests }) {
          var ran = [];
          [...new Array(numRequests)].forEach(function (_, i) {
            window.requestAnimationFrame(function () {
              ran[i] = true;
            });
          });
          ran = [...new Array(numRequests)].map(() => false);
          await timeweb.goTo(10);
          return ran.join(' ');
        }, { numRequests })).to.equal([...new Array(numRequests)].map(() => true).join(' '));
      });
    });
  });

  describe('Chained requestAnimationFrames', function () {
    it('should be called at least once per goTo', async function () {
      expect(await page.evaluate(async function () {
        var state = 0;
        function run() {
          state++;
          requestAnimationFrame(run);
        }
        requestAnimationFrame(run);
        var i, previousCount = state;
        for (i = 0; i < 5; i++) {
          await timeweb.goTo(i * 10 + 0.5);
          if (state === previousCount) {
            return 'Didn\'t increment on iteration ' + i;
          }
          previousCount = state;
        }
        return 'passed';
      })).to.equal('passed');
    });
  });
});
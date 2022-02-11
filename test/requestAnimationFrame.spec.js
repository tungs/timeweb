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

  it('should pass a high resolution timestamp representing elapsed milliseconds since document creation', async function () {
    var time = 28;
    expect(await page.evaluate(function ({ time }) {
      return new Promise(function (resolve) {
        window.requestAnimationFrame(function (arg) {
          resolve(arg);
        });
        timeweb.goTo(time);
      });
      // there should be some care with comparing numbers in the node environment compared to browser environment, but they should be representing numbers the same way
    }, { time })).to.equal(time);
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
        };
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
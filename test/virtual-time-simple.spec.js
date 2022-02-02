describe('Virtual time handling functions', function () {
  var page;
  beforeEach(async function () {
    page = await newPage('basic.html');
    page.evaluate(async function () {
      window._timeweb_test_count = 0;
      window._timeweb_test_iterate = function () {
        window._timeweb_test_count++;
      };      
    });
  });
  afterEach(async function () {
    return page.close();
  });
  [
    [
      'Virtual setTimeout without a time argument',
      false,
      () => setTimeout(_timeweb_test_iterate)
    ],
    [
      'Virtual setTimeout with a time argument',
      true,
      () => setTimeout(_timeweb_test_iterate, 100)
    ],
    [
      'Virtual setInterval',
      true,
      () => setInterval(_timeweb_test_iterate, 100)
    ],
    [
      'Virtual requestAnimationFrame',
      false,
      () => requestAnimationFrame(_timeweb_test_iterate)
    ]
  ].forEach(function ([ name, timeArgument, init ]) {
    describe(name, function () {
      beforeEach(async function () {
        await page.evaluate(init);
      });
      it('should not run without goTo', async function () {
        expect(await page.evaluate(
          () => window._timeweb_test_count
        )).to.equal(0);
      });
      if (timeArgument) {
        it('should not run when goTo time is less than time argument', async function () {
          expect(await page.evaluate(async function () {
            await timeweb.goTo(50);
            return window._timeweb_test_count;
          })).to.equal(0);
        });
        it('should run when goTo time is more than the time argument', async function () {
          expect(await page.evaluate(async function () {
            await timeweb.goTo(200);
            return window._timeweb_test_count;
          })).to.not.equal(0);
        });
      } else {
        it('should run with goTo', async function () {
          expect(await page.evaluate(async function () {
            await timeweb.goTo(100);
            return window._timeweb_test_count;
          })).to.not.equal(0);
        });
      }
    });
  });
});
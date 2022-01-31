describe('Simultaneous Virtual Callbacks', function () {
  var page;
  beforeEach(async function () {
    page = await newPage('basic.html');
  });
  afterEach(async function () {
    return page.close();
  });
  [
    [
      'Virtual setTimeout without a time argument',
      () => window.iterate = (fn => setTimeout(fn))
    ],
    [
      'Virtual setTimeout with a time argument',
      () => window.iterate = (fn => setTimeout(fn, 10))
    ],
    [
      'Virtual setInterval',
      () => window.iterate = (fn => setInterval(fn, 10))
    ],
    [
      'Virtual requestAnimationFrame',
      () => window.iterate = (fn => requestAnimationFrame(fn))
    ]
  ].forEach(function ([ name, init ]) {
    describe(name, function () {
      [
        1, 2, 5, 100
      ].forEach(function (iterations) {
        var description = 'Should be able to run ' +
          (iterations === 1 ? 'one callback' : iterations + ' simultaneous callbacks');
        it(description, async function () {
          await page.evaluate(async function ({ iterations }) {
            window.items = [...new Array(iterations)].map(() => false);
          }, { iterations });
          await page.evaluate(init);
          await page.evaluate(async function () {
            window.items.forEach(function (_, i) {
              window.iterate(function () {
                window.items[i] = true;
              });
            });
            return timeweb.goTo(20);
          });
          expect(await page.evaluate(
            () => window.items.reduce((a, b) => a && b, true)
          )).to.be.true;
        });
      });
    });
  });
});
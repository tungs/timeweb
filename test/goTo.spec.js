describe('goTo', function () {
  var page;
  beforeEach(async function () {
    page = await newPage('basic.html', function () {
      window.oldSetTimeout = window.setTimeout.bind(window);
    });
  });
  afterEach(async function () {
    return page.close();
  });
  [
    1, 2, 5, 10
  ].forEach(function (iterations) {
    var description = iterations + (' iteration' + (iterations > 1 ? 's' : '' ));
    describe(description, function () {
      [
        {
          name: 'should increment current time by seeked time difference after goTo',
          init() {
            // TODO: change this to an explicit timeweb function
            // without possible side effects
            window.testInit = () => {
              window.startTime = Date.now();
            }
            window.testCondition = () => {
              return Date.now() - startTime === 20;
            }
          }
        },
        {
          name: 'should run an animation frame with every goTo',
          init() {
            window.testInit = () => {
              window.testRan = false;
              requestAnimationFrame(function () {
                window.testRan = true;
              });
            }
            window.testCondition = () => {
              return window.testRan;
            }
          }
        },
        {
          name: 'animation frame times should not go down after multiple callbacks',
          init() {
            // TODO: change this to an explicit timeweb function
            // without possible side effects
            window.oldFrameTime = Date.now();
            window.newFrameTime = Date.now();
            window.testInit = () => {
              requestAnimationFrame(function () {
                window.oldFrameTime = window.newFrameTime;
                window.newFrameTime = Date.now();
              });
            }
            window.testCondition = () => {
              return window.newFrameTime >= window.oldFrameTime;
            }
          }
        }
      ].forEach(function ({ name, init }) {
        it(name, async function () {
          await page.evaluate(init);
          expect(await page.evaluate(async function ({ iterations }) {
            var i;
            for (i = 0; i < iterations; i++) {
              window.testInit();
              await timeweb.goTo((i + 1) * 20);
              if (!window.testCondition()) {
                return i;
              }
            }
            return i;
          }, { iterations })).to.equal(iterations);
        });
      });
    });
  });
});
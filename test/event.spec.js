describe('timeweb should support events', function () {
  var page;
  beforeEach(async function () {
    page = await newPage('basic.html', function () {
      window.oldSetTimeout = window.setTimeout.bind(window);
      window.state = [];
    });
  });
  afterEach(async function () {
    return page.close();
  });
  [
    {
      capitalizedType: 'Preseek',
      basicDescription: 'should occur before seek',
      basicInit: () => {
        setTimeout(() => state.push('seek'));
      },
      basicExpected: 'preseek seek'
    },
    {
      capitalizedType: 'Postseek',
      basicDescription: 'should occur after seek',
      basicInit: () => {
        setTimeout(() => state.push('seek'));
      },
      basicExpected: 'seek postseek'
    },
    {
      capitalizedType: 'Preanimate',
      basicDescription: 'should occur before animate',
      basicInit: () => {
        requestAnimationFrame(() => state.push('animate'));
      },
      basicExpected: 'preanimate animate'
    },
    {
      capitalizedType: 'Postanimate',
      basicDescription: 'should occur after animate',
      basicInit: () => {
        requestAnimationFrame(() => state.push('animate'));
      },
      basicExpected: 'animate postanimate'
    }
  ].forEach(function ({ capitalizedType, basicInit, basicExpected, basicDescription }) {
    var type = capitalizedType.toLowerCase();
    describe(`${capitalizedType} event handling`, function () {
      it(basicDescription, async function () {
        await page.evaluate(basicInit);
        expect(await page.evaluate(async function ( { type } ) {
          timeweb.on(type, () => state.push(type));
          await timeweb.goTo(20);
          return state.join(' ');
        }, { type })).to.equal(basicExpected);
      });
      describe('Async function handling', function () {
        [
          {
            name: 'Doesn\'t normally prevent goTo from resolving',
            init: () => {
              window.handlerFunction = () => {};
            },
            expected: 'goTo handler'
          },
          {
            name: 'Prevents goTo from resolving by returning a promise with the wait option',
            init: () => {
              window.handlerFunction = (p, e) => p;
              window.handlerOptions = { wait: true };
            },
            expected: 'handler goTo'
          },
          {
            name: 'Doesn\'t prevent goTo from resolving with the wait option, but not returning a promise',
            init: () => {
              window.handlerFunction = () => {};
              window.handlerOptions = { wait: true };
            },
            expected: 'goTo handler'
          },
          {
            name: 'Returning a promise without the wait option doesn\'t prevent goTo from resolving',
            init: () => {
              window.handlerFunction = (p, e) => p;
            },
            expected: 'goTo handler'
          },
          {
            name: 'Prevents goTo from resolving by calling waitAfterFor',
            init: () => {
              window.handlerFunction = (p, e) => {
                e.waitAfterFor(p);
              }
            },
            expected: 'handler goTo'
          },
          {
            name: 'Prevents goTo from resolving by calling waitImmediatelyAfterFor',
            init: () => {
              window.handlerFunction = (p, e) => {
                e.waitImmediatelyAfterFor(p);
              }
            },
            expected: 'handler goTo'
          }
        ].forEach(function ({ name, init, expected }) {
          it(name, async function () {
            await page.evaluate(init);
            expect(await page.evaluate(async function ({ type }) {
              return new Promise(async function (resolve) {
                var handlerPromise;
                window.oldSetTimeout(function () {
                  resolve('timed out');
                }, 200);
                timeweb.on(type, async function (e) {
                  handlerPromise = new Promise(function (r) {
                    window.oldSetTimeout(r, 1);
                  }).then(function () {
                    state.push('handler')
                  });
                  return window.handlerFunction(handlerPromise, e);
                }, window.handlerOptions);
                await timeweb.goTo(20);
                state.push('goTo');
                await handlerPromise;
                resolve(state.join(' '));
              });
            }, { type })).to.equal(expected);
          });
        });
      });

      it(`Event should get a virtualTime property equal to virtual time`, async function () {
        expect(await page.evaluate(async function ({ type }) {
          var time;
          timeweb.on(type, function(e) {
            // TODO: change this to an explicit timeweb function
            // without possible side effects
            time = e.virtualTime === Date.now();
          });
          await timeweb.goTo(10);
          return time;
        }, { type })).to.true;
      });
      it(`Event should get an event detail`, async function () {
        expect(await page.evaluate(async function ({ type }) {
          var detail;
          timeweb.on(type, function(e) {
            detail = e.detail;
          });
          await timeweb.goTo(10, { detail: 'foo' });
          return detail;
        }, { type })).to.equal('foo');
      });
    });
  });
});

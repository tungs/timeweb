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
  // TODO: multiple runs
  [
    {
      capitalizedType: 'Preseek',
      basicDescription: 'should occur once before seek',
      basicInit: () => {
        setTimeout(() => window.state.push('seek'));
      },
      onlyOncePerGoTo: true,
      basicExpected: 'preseek seek'
    },
    {
      capitalizedType: 'Postseek',
      basicDescription: 'should occur once after seek',
      onlyOncePerGoTo: true,
      basicInit: () => {
        setTimeout(() => window.state.push('seek'));
      },
      basicExpected: 'seek postseek'
    },
    {
      capitalizedType: 'Preanimate',
      basicDescription: 'should occur before animate',
      // currently only goes once per goTo, but it's not necessarily the case
      onlyOncePerGoTo: false,
      basicInit: () => {
        requestAnimationFrame(() => window.state.push('animate'));
      },
      basicExpected: 'preanimate animate'
    },
    {
      capitalizedType: 'Postanimate',
      basicDescription: 'should occur after animate',
      // currently only goes once per goTo, but it's not necessarily the case
      onlyOncePerGoTo: false,
      basicInit: () => {
        requestAnimationFrame(() => window.state.push('animate'));
      },
      basicExpected: 'animate postanimate'
    }
  ].forEach(function ({ capitalizedType, basicInit, onlyOncePerGoTo, basicExpected, basicDescription }) {
    var type = capitalizedType.toLowerCase();
    describe(`${capitalizedType} event handling`, function () {
      it(basicDescription, async function () {
        await page.evaluate(basicInit);
        let result = await page.evaluate(async function ( { type } ) {
          timeweb.on(type, () => window.state.push(type));
          await timeweb.goTo(20);
          return window.state.join(' ');
        }, { type });
        if (onlyOncePerGoTo) {
          expect(result).to.equal(basicExpected);
        } else {
          expect(result).to.satisfy(s => s.startsWith(basicExpected));
        }
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
              window.handlerFunction = p => p;
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
              window.handlerFunction = p => p;
            },
            expected: 'goTo handler'
          },
          {
            name: 'Prevents goTo from resolving by calling waitAfterFor',
            init: () => {
              window.handlerFunction = (p, e) => {
                e.waitAfterFor(p);
              };
            },
            expected: 'handler goTo'
          },
          {
            name: 'Prevents goTo from resolving by calling waitImmediatelyAfterFor',
            init: () => {
              window.handlerFunction = (p, e) => {
                e.waitImmediatelyAfterFor(p);
              };
            },
            expected: 'handler goTo'
          }
        ].forEach(function ({ name, init, expected }) {
          it(name, async function () {
            await page.evaluate(init);
            expect(await page.evaluate(async function ({ type }) {
              var timeoutPromise = new Promise(function (resolve) {
                window.oldSetTimeout(function () {
                  resolve('timed out');
                }, 200);
              });
              async function run() {
                var handlerPromise;
                timeweb.on(type, async function (e) {
                  handlerPromise = new Promise(function (r) {
                    window.oldSetTimeout(r, 1);
                  }).then(function () {
                    window.state.push('handler');
                  });
                  return window.handlerFunction(handlerPromise, e);
                }, window.handlerOptions);
                await timeweb.goTo(20);
                window.state.push('goTo');
                await handlerPromise;
                return window.state.join(' ');
              }
              return Promise.race([ timeoutPromise, run() ]);
            }, { type })).to.equal(expected);
          });
        });
      });

      it('Event should get a virtualTime property equal to virtual time', async function () {
        expect(await page.evaluate(async function ({ type }) {
          var time;
          timeweb.on(type, function (e) {
            // TODO: change this to an explicit timeweb function
            // without possible side effects
            time = e.virtualTime === Date.now();
          });
          await timeweb.goTo(10);
          return time;
        }, { type })).to.true;
      });
      it('Event should get an event detail', async function () {
        expect(await page.evaluate(async function ({ type }) {
          var detail;
          timeweb.on(type, function (e) {
            detail = e.detail;
          });
          await timeweb.goTo(10, { detail: 'foo' });
          return detail;
        }, { type })).to.equal('foo');
      });
    });
  });
});

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
        beforeEach(async function () {
          await page.evaluate(function ({ type }) {
            window.run = async function (handlerFunction, handlerOptions) {
              var handlerPromise;
              timeweb.on(type, async function (e) {
                handlerPromise = new Promise(function (r) {
                  window.oldSetTimeout(r, 1);
                }).then(function () {
                  window.state.push('handler');
                });
                return handlerFunction(handlerPromise, e);
              }, handlerOptions);
              await timeweb.goTo(20);
              window.state.push('goTo');
              await handlerPromise;
              return window.state.join(' ');
            };
          }, { type });
        });
        describe('With the wait option', function () {
          describe('Prevents goTo from resolving', function () {
            it('by returning a promise', async function () {
              expect(await page.evaluate(function () {
                return window.run(p => p, { wait: true });
              })).to.equal('handler goTo');
            });
          });
          describe('Doesn\'t prevent goTo from resolving', function () {
            it('when not returning a promise', async function () {
              expect(await page.evaluate(function () {
                return window.run(() => {}, { wait: true });
              })).to.equal('goTo handler');
            });
          });
        });
        describe('Without the wait option', function () {
          describe('Prevents goTo from resolving', function () {
            it('by calling waitAfterFor with a promise', async function () {
              expect(await page.evaluate(function () {
                return window.run((p, e) => { e.waitAfterFor(p); });
              })).to.equal('handler goTo');
            });
            it('by calling waitImmediatelyAfterFor with a promise', async function () {
              expect(await page.evaluate(function () {
                return window.run((p, e) => { e.waitImmediatelyAfterFor(p); });
              })).to.equal('handler goTo');
            });
          });
          describe('Doesn\'t prevent goTo from resolving', function () {
            it('normally', async function() {
              expect(await page.evaluate(function () {
                return window.run(() => {});
              })).to.equal('goTo handler');
            });
            it('when returning a promise', async function () {
              expect(await page.evaluate(function () {
                return window.run(p => p);
              })).to.equal('goTo handler');
            });
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

  // TODO: potentially use this as another looping option for `preseek` and `postseek`
  describe('using skipAnimate in goTo, should skip animation events', function () {
    [
      'preanimate', 'postanimate'
    ].forEach(function (type) {
      it(type, async function () {
        expect(await page.evaluate(async function ({ type }) {
          var state = 'unran';
          timeweb.on(type, () => state = 'ran');
          await timeweb.goTo(20, { skipAnimate: true });
          return state;
        }, { type })).to.equal('unran');
      });
    });
  });
});

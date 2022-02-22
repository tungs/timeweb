describe('Virtual clearTimeout', function () {
  var page;
  beforeEach(async function () {
    page = await newPage('basic.html');
    await page.evaluate(function () {
      window.state = 'not ran';
    });
  });
  afterEach(async function () {
    return page.close();
  });

  it('should not throw an error when passing an undefined argument', async function () {
    expect(await page.evaluate(function () {
      try {
        window.clearTimeout(undefined);
        return 'no error';
      } catch (e) {
        return e.toString();
      }
    })).to.equal('no error');
  });

  describe('clearing a setTimeout with', function () {
    [
      {
        name: 'A function',
        init: () => (window.timeout = () => setTimeout(() => window.state = 'ran')),
        timed: false
      },
      {
        name: 'A function and timeout',
        init: () => (window.timeout = () => setTimeout(()=>window.state = 'ran', 10)),
        timed: true
      },
      {
        name: 'A function, timeout, and argument',
        init: () => (window.timeout = () => setTimeout(()=>window.state = 'ran', 10, 11)),
        timed: true
      },
      {
        name: 'A string',
        init: () => (window.timeout = () => setTimeout('window.state = \'ran\'')),
        timed: false
      },
      {
        name: 'A string and timeout',
        init: () => (window.timeout = () => setTimeout('window.state = \'ran\'', 10)),
        timed: true
      },
    ].forEach(function ({ name, init, timed }) {
      describe(name, function () {
        beforeEach(async function () {
          await page.evaluate(init);
        });
        it('should be clearable immediately', async function () {
          expect(await page.evaluate(async function () {
            var id = window.timeout();
            window.clearTimeout(id);
            await timeweb.goTo(20);
            return window.state;
          })).to.equal('not ran');
        });
        if (timed) {
          it('should be clearable before its timeout', async function () {
            expect(await page.evaluate(async function () {
              var id = window.timeout();
              window.setTimeout(function () {
                window.clearTimeout(id);
              }, 5);
              await timeweb.goTo(20);
              return window.state;
            })).to.equal('not ran');
          });
        }
        it('should not throw an error when clearing an already ran id', async function () {
          expect(await page.evaluate(async function () {
            try {
              var id = window.timeout();
              await timeweb.goTo(20);
              window.clearTimeout(id);
              return 'no error';
            } catch (e) {
              return e.toString();
            }
          })).to.equal('no error');
        });
        it('should not throw an error when clearing an already cleared id', async function () {
          expect(await page.evaluate(async function () {
            try {
              var id = window.timeout();
              window.clearTimeout(id);
              window.clearTimeout(id);
              return 'no error';
            } catch (e) {
              return e.toString();
            }
          })).to.equal('no error');
        });
      });
    });
  });


  describe('Multiple setTimeouts', function () {
    var clearTimes = [20, 40];
    var unsortedTimes = [
      10, 60, 20, 40, 80, 30
    ];
    var sortedTimes = unsortedTimes.sort((a, b) => a - b);
    var expectedTimes = sortedTimes.filter(time => clearTimes.indexOf(time) === -1);
    beforeEach(async function () {
      await page.evaluate(function ({ unsortedTimes, sortedTimes }) {
        window.state = [];
        window.unsortedTimes = unsortedTimes;
        window.sortedTimes = sortedTimes;
      }, { unsortedTimes, sortedTimes });
    });
    [
      { name: 'with sequential times', times: sortedTimes },
      { name: 'with nonsequential times', times: unsortedTimes }
    ].forEach(function ({ name, times }) {
      describe(name, function () {
        beforeEach(async function () {
          await page.evaluate(function ({ times, clearTimes }) {
            times.forEach(function (time) {
              var id = setTimeout(function () {
                window.state.push(time.toString());
              }, time);
              if (clearTimes.indexOf(time) !== -1) {
                window.clearTimeout(id);
              }
            });
          }, { times, clearTimes });
        });
        it('should be canceled when iterating through time', async function () {
          expect(await page.evaluate(async function () {
            for (let i = 0; i < sortedTimes.length; i++) {
              await timeweb.goTo(sortedTimes[i] + 0.5);
            }
            return window.state.join(' ');
          })).to.equal(expectedTimes.map(t => t.toString()).join(' '));
        });
        it('should be canceled in one goTo', async function () {
          expect(await page.evaluate(async function () {
            await timeweb.goTo(sortedTimes[sortedTimes.length - 1] + 0.5);
            return window.state.join(' ');
          })).to.equal(expectedTimes.map(t => t.toString()).join(' '));
        });
      });
    });
  });


  describe('Chained timeouts', function () {
    [
      {
        name: 'with a function',
        init() {
          window.state = 0;
          window.run = function () {
            window.state++;
            var id = setTimeout(window.run, 10);
            if (window.state === 3) {
              window.clearTimeout(id);
            }
          };
          setTimeout(window.run, 10);
        }
      },
      {
        name: 'with a string',
        init() {
          window.state = 0;
          window.run = function () {
            window.state++;
            var id = setTimeout('window.run()', 10);
            if (window.state === 3) {
              window.clearTimeout(id);
            }
          };
          setTimeout('window.run()', 10);
        }
      },
    ].forEach(function ({ name, init }) {
      describe(name, function () {
        beforeEach(async function () {
          await page.evaluate(init);
        });
        it('should be cancelable with sequential goTos', async function () {
          expect(await page.evaluate(async function () {
            var i;
            for (i = 0; i < 6; i++) {
              await timeweb.goTo(i * 10 + 0.5);
              if (i <= 3 && window.state !== i) {
                return 'Expected: ' + i + ' Got: ' + window.state;
              }
            }
            return window.state;
          })).to.equal(3);
        });
        it('should be cancelable with one goTo', async function () {
          expect(await page.evaluate(async function () {
            await timeweb.goTo(50.5);
            return window.state;
          })).to.equal(3);
        });
      });
    });
  });
});
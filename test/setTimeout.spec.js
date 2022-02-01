describe('Virtual setTimeout', function () {
  var page;
  var unsortedTimes = [
    10, 60, 20, 40, 80, 30
  ];
  var sortedTimes = unsortedTimes.sort();
  beforeEach(async function () {
    page = await newPage('basic.html');
    await page.evaluate(function ( { unsortedTimes, sortedTimes } ) {
      window.state = [];
      window.unsortedTimes = unsortedTimes;
      window.sortedTimes = sortedTimes;
    }, { unsortedTimes, sortedTimes })
  });
  afterEach(async function () {
    return page.close();
  });

  describe('multiple timeouts', function () {
    [
      { name: 'with sequential times', times: sortedTimes },
      { name: 'with nonsequential times', times: unsortedTimes }
    ].forEach(function ({ name, times }) {
      describe(name, function () {
        beforeEach(async function () {
          await page.evaluate(function ({ times }) {
            times.forEach(function (time) {
              setTimeout(function () {
                state.push(time.toString());
              }, time);
            });
          }, { times });
        });
        it('should be able to process multiple timeouts seperately', async function () {
          expect(await page.evaluate(async function () {
            for (let i = 0; i < sortedTimes.length; i++) {
              await timeweb.goTo(sortedTimes[i] + 0.5);
            }
            return state.join(' ');
          })).to.equal(sortedTimes.map(t => t.toString()).join(' '));
        });
        it('should not run multiple timeouts before their times', async function () {
          expect(await page.evaluate(async function () {
            for (let i = 0; i < sortedTimes.length; i++) {
              await timeweb.goTo(sortedTimes[i] + 0.5);
              var expected = sortedTimes.slice(0, i + 1).join(' ');
              if (state.join(' ') !== expected) {
                return 'Expected: ' + expected + ' Got: ' + state.join(' ');
              }
            }
            return state.join(' ');
          })).to.equal(sortedTimes.map(t => t.toString()).join(' '));
        });
        var midTime = sortedTimes[Math.ceil((sortedTimes.length)/2)];
        it('should be able to process multiple timeouts in one goTo', async function () {
          expect(await page.evaluate(async function () {
            await timeweb.goTo(sortedTimes[sortedTimes.length - 1] + 0.5);
            return state.join(' ');
          })).to.equal(sortedTimes.map(t => t.toString()).join(' '));
        });
        it('should not run multiple timeouts before their time in one goTo', async function () {
          expect(await page.evaluate(async function ({ time }) {
            await timeweb.goTo(time);
            return state.join(' ');
          }, { time: midTime + 0.5 })).to.equal(
            sortedTimes
              .filter(t => (t <= midTime))
              .map(t => t.toString())
              .join(' ')
          );
        });
      })
    });
  });

});
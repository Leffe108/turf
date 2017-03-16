const path = require('path');
const load = require('load-json-file');
const Benchmark = require('benchmark');
const fs = require('fs');
const area = require('./');

// Define fixtures
const directory = path.join(__dirname, 'test', 'in') + path.sep;
const fixtures = fs.readdirSync(directory).map(filename => {
    return {
        filename,
        name: path.parse(filename).name,
        geojson: load.sync(directory + filename)
    };
});

/**
 * Benmark Results
 *
 * polygon x 4,878,375 ops/sec ±0.96% (85 runs sampled)
 */

// Define benchmark
const suite = new Benchmark.Suite('turf-area');
for (const {name, geojson} of fixtures) {
    suite.add(name, () => area(geojson));
}
suite
  .on('cycle', e => console.log(String(e.target)))
  .on('complete', () => {})
  .run();
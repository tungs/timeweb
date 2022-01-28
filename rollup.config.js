import json from '@rollup/plugin-json';
import { terser } from 'rollup-plugin-terser';
import path from 'path';
import fs from 'fs';
import * as meta from './package.json';

var license = fs.readFileSync(path.join(__dirname, 'LICENSE'), 'utf-8');
var banner = '/**\n *\n' + license.split('\n').map(function (line) {
  return ' *' + (line.length ? ' ' : '') + line;
}).join('\n') + '\n */';
var copyright = license.split('\n').filter(function (line) {
  return /Copyright/.test(line);
}).join(', ');

export default [
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/timeweb.js',
        name: 'timeweb',
        banner,
        format: 'umd'
      },
      {
        file: 'dist/timeweb.min.js',
        name: 'timeweb',
        plugins: [ terser({
          format: { preamble: '// timeweb v' + meta.version + ' ' + copyright }
        }) ],
        format: 'umd'
      },
      {
        file: 'dist/timeweb.module.js',
        banner,
        format: 'es'
      }
    ],
    plugins: [ json() ]
  }
];
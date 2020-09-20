import json from '@rollup/plugin-json';
import path from 'path';
import fs from 'fs';

var license = fs.readFileSync(path.join(__dirname, 'LICENSE'), 'utf-8');
var banner = '/**\n *\n' + license.split('\n').map(function (line) {
  return ' *' + (line.length ? ' ' : '') + line;
}).join('\n') + '\n */';
export default [
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/timeweb.js',
        banner: banner,
        name: 'timeweb',
        format: 'umd'
      },
      {
        file: 'dist/timeweb.module.js',
        banner: banner,
        format: 'es'
      }
    ],
    plugins: [ json() ]
  }
];
const fs = require('fs');
const path = require('path');
const del = require('del');
const CleanCSS = require('clean-css');
const Handlebars = require('handlebars');
const rollup = require('rollup');
const uglify = require('rollup-plugin-uglify');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');

process.chdir(path.join(__dirname, '..'));

function generateOutput(template) {
  let output = '';
  output += `module.exports = (interactiveEndpoint) => \`${template}\`;`;

  return output
}

function build(name) {
  console.log(`building ${name}`);
  const frameBase = `src/frame/${name}`;
  // js
  rollup.rollup({
    entry: `${frameBase}/bundle.js`,
    plugins: [
      nodeResolve({
        module: true,
        jsnext: true,
        main: true,
        browser: true,
        extensions: ['.js'],
        preferBuiltins: false,
      }),
      commonjs(),
      uglify(),
    ]
  })
  .then(bundle => {
    const result = bundle.generate({
      format: 'iife',
      exports: 'named',
      moduleName: 'interactiveManager'
    });

    return result.code;
  })
  .then(bundledJs => {
    // css
    const minCSS = new CleanCSS().minify(fs.readFileSync(`${frameBase}/styles.css`, { encoding: 'utf-8' })).styles;

    // template
    const templateSource = fs.readFileSync(`${frameBase}/page.hbs`, { encoding: 'utf-8' });
    const templateComplied = Handlebars.compile(templateSource);

    const pageParts = templateComplied({
      scripts: bundledJs,
      styles: minCSS,
    });

    fs.writeFileSync(`./dist/${name}.js`, generateOutput(pageParts));
  })
  .catch(err => {
    console.log(err);
  })
}

del.sync(['./dist']);
fs.mkdirSync('./dist');

const buildNames = process.argv.slice(-1)[0].split(',');
buildNames.forEach(buildName => build(buildName));

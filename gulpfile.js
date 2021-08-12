const closureCompiler = require('google-closure-compiler').gulp();
const {src, dest} = require('gulp');

function build(cb) {
    return src('./src/*.js')
          .pipe(closureCompiler({
              compilation_level: 'WHITESPACE',
              warning_level: 'VERBOSE',
              js_output_file: 'chaching.min.js'
            }))
          .pipe(dest('./build'));
}

exports.default = build
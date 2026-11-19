const esbuild = require('esbuild');

module.exports = {
  process(sourceText, sourcePath) {
    const { code, map } = esbuild.transformSync(sourceText, {
      loader: 'ts',
      format: 'esm',
      target: 'node20',
      sourcemap: 'inline',
      sourcefile: sourcePath,
    });
    return { code, map };
  },
};

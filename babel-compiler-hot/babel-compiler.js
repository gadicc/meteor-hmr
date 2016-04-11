/**
 * A compiler that can be instantiated with features and used inside
 * Plugin.registerCompiler
 * @param {Object} extraFeatures The same object that getDefaultOptions takes
 */
BabelCompiler = function BabelCompiler(extraFeatures) {
  Babel.validateExtraFeatures(extraFeatures);
  this.extraFeatures = extraFeatures;
};

var BCp = BabelCompiler.prototype;
var excludedFileExtensionPattern = /\.es5\.js$/i;

BCp.processFilesForTarget = function (inputFiles) {
  var self = this;

  // hot
  hot.forFork(inputFiles, this);

  inputFiles.forEach(function (inputFile) {
    var source = inputFile.getContentsAsString();
    var packageName = inputFile.getPackageName();
    var inputFilePath = inputFile.getPathInPackage();
    var outputFilePath = inputFilePath;
    var fileOptions = inputFile.getFileOptions();
    var toBeAdded = {
      sourcePath: inputFilePath,
      path: outputFilePath,
      data: source,
      hash: inputFile.getSourceHash(),
      sourceMap: null,
      bare: !! fileOptions.bare
    };
    var deps, origSource;

    // If you need to exclude a specific file within a package from Babel
    // compilation, pass the { transpile: false } options to api.addFiles
    // when you add that file.
    if (fileOptions.transpile !== false &&
        // If you need to exclude a specific file within an app from Babel
        // compilation, give it the following file extension: .es5.js
        ! excludedFileExtensionPattern.test(inputFilePath)) {

      var targetCouldBeInternetExplorer8 =
        inputFile.getArch() === "web.browser";

      self.extraFeatures = self.extraFeatures || {};
      if (! self.extraFeatures.hasOwnProperty("jscript")) {
        // Perform some additional transformations to improve
        // compatibility in older browsers (e.g. wrapping named function
        // expressions, per http://kiro.me/blog/nfe_dilemma.html).
        self.extraFeatures.jscript = targetCouldBeInternetExplorer8;
      }

      var babelOptions = Babel.getDefaultOptions(self.extraFeatures);

      // hot
      deps = mergeBabelrcOptions(babelOptions, inputFile);
      origSource = source;
      source = hot.transformStateless(source, inputFilePath);
      deps.sourceHash = toBeAdded.hash;

      babelOptions.sourceMap = true;
      babelOptions.filename =
      babelOptions.sourceFileName = packageName
        ? "/packages/" + packageName + "/" + inputFilePath
        : "/" + inputFilePath;

      babelOptions.sourceMapTarget = babelOptions.filename + ".map";

      try {
        var result = profile('Babel.compile', function () {
          return Babel.compile(source, babelOptions, deps);
        });
      } catch (e) {
        if (e.loc) {
          console.log(source);
          inputFile.error({
            message: e.message + (source !== origSource
              ? ' on ecmascript-hot TRANSFORMED file, possible false positive:\n'
                + source.split('\n').slice(e.loc.line-5, e.loc.line+5).join('\n')
              : ''),
            line: e.loc.line,
            column: e.loc.column,
          });

          return;
        }

        throw e;
      }

      toBeAdded.data = result.code;
      toBeAdded.hash = result.hash;
      toBeAdded.sourceMap = result.map;
    }

    inputFile.addJavaScript(toBeAdded);
  });
};

BCp.setDiskCacheDirectory = function (cacheDir) {
  if (hot.setCacheDir) // false during publish?
    hot.setCacheDir(cacheDir);
  Babel.setCacheDir(cacheDir);
};

function profile(name, func) {
  if (typeof Profile !== 'undefined') {
    return Profile.time(name, func);
  } else {
    return func();
  }
};

class FakeFile {

  constructor(data) {
    this.data = data;
  }

  getContentsAsString() {
    return this.data.contents;
  }

  getPackageName() {
    return this.data.packageName;
  }

  getPathInPackage() {
    return this.data.pathInPackage;
  }

  getFileOptions() {
    return this.data.fileOptions;
  }

  getArch() {
    return 'web.browser';
  }

  getSourceHash() {
    return this.data.sourceHash;
  }

  addJavaScript(js) {
    // no-op
    console.log('addJavaScript', js);
  }

  error(error) {
    log(error);
  }
}

export default FakeFile;

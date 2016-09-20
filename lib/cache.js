'use strict';

const path = require('path');
const os = require('os');

const fss = require('fs');
const fs = require('fs-promise');

const mkdirp = require('./mkdirp.js');
const userHome = require('user-home');
const log = require('./log.js');

// Multiple methods of caching.

const CACHE_INPLACE = 'inplace';
const CACHE_TMP = 'tmp';
const CACHE_USER = '.cache';

const CACHE_DIRECTORY_NAME = 'lms';

class CacheManager {
  
  constructor() {
    this.root = '';
    this.cache_mode = CACHE_INPLACE;
  }

  getCacheDir(filename) {
    if(this.cache_mode == CACHE_INPLACE) {
      let dirname = path.dirname(filename);
      return path.join(dirname, '.' + this.cache_directory);
    } else if(this.cache_mode == CACHE_TMP) {
      return path.join(os.tmpdir(), this.cache_directory, filename);
    } else if(this.cache_mode == CACHE_USER) {
      return path.join(userHome, '.cache', CACHE_DIRECTORY_NAME, filename);
    } else {
      log.error('Unknown cache mode ' + this.cache_mode);
      return null;
    }
  }

  getCache(filename, name) {
    let cachedir = this.getCacheDir(filename);
    let cachefile = path.join(cachedir, name);
    
    return fs.readFile(cachefile).then((data) => {
      return new Promise((resolve) => {
        resolve(data);
      });
    });
  }

  hasCache(filename, name) {
    let cachedir = this.getCacheDir(filename);
    let cachefile = path.join(cachedir, name);

    try {
      fs.accessSync(cachefile, fs.F_OK);
    } catch(e) {
      return false;
    }
    
    return true;
  }

  cache(filename, name, data) {
    let cachedir = this.getCacheDir(filename);
    let cachefile = path.join(cachedir, name);

    return mkdirp(cachedir)
      .then((result) => {
        return fs.writeFile(cachefile, data);
      })
      .catch((err) => {
        log.error(err.message);
      });
  }

}

exports.CacheManager = CacheManager;
exports.CACHE_INPLACE = CACHE_INPLACE;
exports.CACHE_TMP = CACHE_TMP;
exports.CACHE_USER = CACHE_USER;

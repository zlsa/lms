'use strict';

const path = require('path');
const crypto = require('crypto');

const mime = require('mime');
const uuid = require('uuid');
const walk = require('walk-sync');
const fs = require('fs-promise');
const sharp = require('sharp');

const cache = require('./cache.js');
const log = require('./log.js');

const ColorThief = require('color-thief');
const ct = new ColorThief();

const THUMBNAIL_SIZE = 192 * 2;

class Media {
  
  constructor() {
    this.type = null;
    this.id = null;
    this.name = '';

    this.filename = null;

    this.cachemanager = null;
  }
  
  getStats() {
    return fs.lstat(this.filename)
      .then((stat) => {
        return new Promise((resolve, reject) => { resolve(); });
      }, (err) => {
        console.error(err);
      });
  }

  setFilename(filename) {
    this.filename = filename;
    this.id = crypto.createHash('md5').update(this.filename).digest('hex');
    //console.log(filename);
  }
  
}

class ImageMedia extends Media {

  constructor() {
    super();

    this.size = [1, 1];
    this.aspect = 1;
    
    this.thumbnail = null;
    this.thumbnail_promise = null;

    this.color = [0, 0, 0];
  }

  createThumbnail() {
    if(!this.thumbnail && this.cachemanager.hasCache(this.filename, 'thumbnail')) {
      this.thumbnail_promise = this.cachemanager.getCache(this.filename, 'thumbnail')
        .then((data) => {
          this.thumbnail = data;
          this.color = ct.getColor(this.thumbnail);
        });
    }
    
    if(this.thumbnail_promise) return this.thumbnail_promise;

    this.thumbnail_promise = this.image
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        kernel: 'cubic',
        interpolator: 'bilinear'
      })
      .min()
      .quality(90)
      .jpeg()
      .toBuffer()
      .then((buffer) => {
        this.thumbnail = buffer;
        this.color = ct.getColor(this.thumbnail);
        this.cacheThumbnail();
      });

    return this.thumbnail_promise;
  }

  cacheThumbnail() {
    this.cachemanager.cache(this.filename, 'thumbnail', this.thumbnail);
  }

  setSize(width, height) {
    this.size = [width, height];
    this.aspect = width / height;
  }

  getRoundedAspect(aspects) {
    if(!aspects) aspects = [1/1, 5/4, 4/3, 3/2];

    return aspects.reduce((prev, curr) => {
      return (Math.abs(curr - this.aspect) < Math.abs(prev - this.aspect) ? curr : prev);
    });
  }
  
  getStats() {
    return super.getStats()
      .then((stat) => {
        this.image = sharp(this.filename);
        return;

        this.image.metadata()
          .then((meta) => {
            this.setSize(meta.width, meta.height);
            //this.createThumbnail();
            return new Promise((resolve, reject) => { resolve(); });
          }, (err) => {
            console.log(this.filename);
          });
      });
  }

}

class Source {

  constructor() {
    this.media = {};
    this.list = [];

    this.mediaNumber = 0;

    this.cachemanager = new cache.CacheManager();
    this.cachemanager.cache_mode = cache.CACHE_USER;
  }

  addMedia(media) {
    this.media[media.id] = media;
    this.mediaNumber += 1;
    
    media.cachemanager = this.cachemanager;
  }

  removeMedia(media) {
    delete this.media[media.id];
    this.mediaNumber -= 1;
  }

  getMedia(id) {
    return this.media[id];
  }

  getMediaList(sort, start, max) {
    if(!start) start = 0;
    if(!max) max = 50;

    if(this.list.length != this.mediaNumber) {
      this.list = [];
      for(var i in this.media) {
        this.list.push(this.media[i]);
      }
    }

    return this.list.slice(start, start + max);
  }

}

class DirectorySource extends Source {

  constructor(root) {
    super();

    this.root = root;
  }

  init() {
    return this.initMedia();
  }

  initMedia() {
    var paths = walk(this.root);

    var promises = [];

    for(var i in paths) {
      promises.push(this.addMediaFromFilepath(path.resolve(this.root, paths[i])));
    }

    return Promise.all(promises);
  }

  addMediaFromFilepath(filepath) {
    let media = null;

    let type = mime.lookup(filepath).split('/')[0];
    
    if(type == 'image') {
      media = new ImageMedia();
    } else {
      // We don't know what type this media is, so we bail out
      log.debug('unknown file type ' + filepath);
      return new Promise((resolve) => { resolve(null); });
    }
    
    media.setFilename(filepath);
    
    let promise = media.getStats();
    
    this.addMedia(media);
    
    return promise;
  }
  
}

exports.THUMBNAIL_SIZE = THUMBNAIL_SIZE;
exports.Source = Source;
exports.DirectorySource = DirectorySource;

'use strict';

const path = require('path');

const merge = require('merge');
const fs = require('fs-promise');
const hogan = require('hogan.js');
const i18n = require('i18n');

const log = require('./log.js');

i18n.configure({
  locales:['en'],
  directory: __dirname + '/locales'
});

class Page {

  constructor(options) {
    this.options = merge({}, options);
  }

  render(data) {
    console.log('Override the render() method of Page');
    return '';
  }

}

class TemplatePage extends Page {

  constructor(options) {
    super(options);
    
    this.options = merge(
      {
        templateDirectory: path.join(__dirname, 'templates')
      }, this.options);
  }

  init() {
    return this.initTemplates();
  }

  initTemplates() {
    this.templates = {};
  }

  // Loads templates asynchronously.
  
  loadTemplate(name) {

    // If there's more than one argument, call ourselves on the list
    // of arguments. Nested lists will still work.
    
    if(arguments.length > 1) {
      return this.loadTemplate(arguments);
    }
    
    // If it's an array of templates, call `loadTemplate` once for
    // each template name, then exit.

    if(Array.isArray(name)) {
      let templates = name;

      name = '';
      
      // Keep a list of promises from the singular `loadTemplate`s.
      var promises = [];
      
      for(var i=0; i<templates.length; i++) {
        name = templates[i];
        
        // Push the promise from this template.
        promises.push(this.loadTemplate(name));
      }
      
      return Promise.all(promises);
    }

    // Now we handle the loading and compiling of the template file.

    let filename = path.join(this.options.templateDirectory, name + '.html');

    // Define scope for the Promise.
    
    return new Promise((resolve, reject) => {
      fs.readFile(filename, 'utf8')
        .then(
          
          // On success, call `createTemplate(name, data)` to finish the creation of the template.
          
          (data) => {
            this.createTemplate(name, data);
            resolve(data);
          },

          // If the file doesn't exist or can't be opened, insert a
          // dummy template.
          (err) => {
            this.createTemplate(name, '<h1>template ' + name + ' missing!</h1>');
            reject(err);
          }
          
        );
      
    });
  }

  render(data) {
    console.log('Override the render() method of TemplatePage');
    return new Promise(function(resolve, reject) { resolve(''); });
  }

  createTemplate(name, data) {
    this.templates[name] = hogan.compile(data);
  }
  
  renderTemplate(name, values) {
    return new Promise((resolve, reject) => {
      resolve(this.templates[name].render(values));
    });
  }
  
}

class ListPage extends TemplatePage {

  constructor(options) {
    super(options);

    this.source = options.source;
  }

  initTemplates() {
    super.initTemplates();

    return this.loadTemplate([
      'page',
      'no-media',
      'media-item',
      'media-item-image',
      'media-list'
    ]);
  }

  renderMediaList(page) {

    let mediaAmount = 50;
    let mediaStart = page * mediaAmount;

    let humanPage = page + 1;

    let media = this.source.getMediaList(null, mediaStart, mediaAmount);

    let canGoNext = true;
    let canGoPrev = true;

    if(this.source.mediaNumber - mediaStart < mediaAmount) canGoNext = false;
    if(mediaStart < mediaAmount) canGoPrev = false;
    
    if(media.length == 0) {
      return this.renderTemplate('no-media', {
        message: i18n.__("There's no media here."),
        back: i18n.__("Back to home")
      });
    }

    let mediahtml = [];

    for(var i in media) {
      let m = media[i];
      
      mediahtml.push(this.renderTemplate('media-item-image', {
        id: m.id,
        color: 'rgb(' + m.color.join(',') + ')',
        width: m.aspect * media.THUMBNAIL_SIZE,
        thumbnail_url: '/thumb/' + m.id
      }).then((data) => {
        return this.renderTemplate('media-item', {
          mediatype: 'image',
          id: m.id,
          filename: m.id,
          data: data
        });
      }));
    }

    let medialist = null;

    return Promise.all(mediahtml)
      .then((data) => {
        return this.renderTemplate('media-list', {
          medialist: data.join('\n'),
          next_page_url: '/page/' + (humanPage + 1),
          prev_page_url: '/page/' + (humanPage - 1),
          can_go_next: canGoNext,
          can_go_prev: canGoPrev
        });
      });
    
  }

  render(values) {
    
    values = merge({
      name: i18n.__('LMS'),
      title: i18n.__('All Media'),
      page: 0
    }, values);

    return this.renderMediaList(values.page)
      .then((data) => {
        values.content = data;
        return this.renderTemplate('page', values);
      }, (err) => {
        log.error(err.message);
        return new Promise((resolve, reject) => { reject([500, 'Template rendering failed']); });
      })
      .catch((err) => {
        log.error(err.message);
        return new Promise((resolve, reject) => { reject([500, 'Template rendering failed']); });
      });
  }

}

exports.Page = Page;
exports.ListPage = ListPage;

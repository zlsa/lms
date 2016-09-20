'use strict';

const path = require('path');
const process = require('process');

const express = require('express');
const page = require('./page.js');
const media = require('./media.js');

class App {

  constructor(source) {
    this.source = source;
  }

}

class WebApp extends App {

  constructor(source) {
    super(source);
  }

  init() {
    let promises = [];

    this.page = {};

    promises.push(this.initListPage());
    
    return Promise.all(promises).then((data) => {
      return this.initServer();
    });
  }

  initListPage() {
    this.page.list = new page.ListPage({
      source: this.source
    });

    return this.page.list.init().then(
      null,
      (err) => {
        console.log(err.message);
      });
  }

  getListPageData(page) {
    return {
      title: this.source.root,
      page: page || 0
    };
  }

  initServer() {
    this.express = express();

    let scope = this;
    
    this.express.get('/', (req, res) => {
      this.page.list.render(this.getListPageData())
        .then((data) => {
          res.send(data);
        });
    });

    this.express.get('/page/:page', (req, res) => {
      this.page.list.render(this.getListPageData(parseInt(req.params.page) - 1))
        .then((data) => {
          res.send(data);
        });
    });

    this.express.get('/style.css', (req, res) => {
      res.sendFile(path.join(__dirname, 'static/css/style.css'));
    });

    this.express.get('/thumb/:id', (req, res) => {

      let media = this.source.getMedia(req.params.id);
      
      media.createThumbnail()
        .then((data) => {
          res.contentType('image/jpeg');
          res.send(media.thumbnail);
        });
    });

    this.express.get('/raw/:id', (req, res) => {
      let media = this.source.getMedia(req.params.id);
      
      res.sendFile(media.filename);
    });

    this.express.get('*', (req, res) => {
      res.status(404);
      res.send('404 not found');
    });

    return new Promise((resolve, reject) => {
      this.express.listen(3000, function() {
        console.log('LMS listening on port 3000');
      });
    });
    
  }
}

exports.App = App;
exports.WebApp = WebApp;

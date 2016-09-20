
const process = require('process');

const lms = require('../lib/main.js');

var root = process.argv[2] || './';
const source = new lms.DirectorySource(root);

console.log('Indexing all files...');

source.init()
  .then(() => {
    var webapp = new lms.WebApp(source);
    
    return webapp.init();
  });

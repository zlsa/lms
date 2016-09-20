
// Promisify the `mkdirp` package.

const mkdirp = require('mkdirp');

module.exports = function(directory) {
  return new Promise((resolve, reject) => {
    mkdirp(directory, function(err, data) {
      if(err) reject(err);
      else resolve(data);
    });
  });
};

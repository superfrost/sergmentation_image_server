const fs = require('fs');
const path = require('path');

function initDirs() {
  fs.mkdir(path.join(__dirname, '..', 'public', 'images', 'result'), { recursive: true }, (err) => {
    if (err) console.log(err);
  });
  fs.mkdir(path.join(__dirname, '..', 'public', 'images', 'result'), { recursive: true }, (err) => {
    if (err) console.log(err);
  });
}

module.exports = initDirs
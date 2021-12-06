const os = require('os');
const path = require('path');

let pythonVenvPath;
let pythonSegmentationScript = path.join(__dirname, '..', 'python_env', 'segmentation.py')

const userOS = os.type()
if(userOS === 'Linux') {
  pythonVenvPath = path.join(__dirname, '..', 'python_env', 'venv', 'bin', 'python')
}
else if (userOS === 'Windows_NT') {
  pythonVenvPath = path.join(__dirname, '..', 'python_env', 'venv', 'Scripts', 'python.exe')
}
else if (userOS === 'Darwin') {
  pythonVenvPath = path.join(__dirname, '..', 'python_env', 'venv', 'bin', 'python')
}

module.exports = { pythonVenvPath, pythonSegmentationScript }
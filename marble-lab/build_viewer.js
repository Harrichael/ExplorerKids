const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2] || 'out/results.json', 'utf8'));
const html = fs.readFileSync('viewer.template.html', 'utf8').replace('/*SIM*/', () => fs.readFileSync('sim.js', 'utf8')).replace('/*DATA*/', () => JSON.stringify(data));
fs.writeFileSync(process.argv[3] || 'out/marble-lab.html', html); console.log('wrote', process.argv[3] || 'out/marble-lab.html', (html.length/1024|0) + 'KB');

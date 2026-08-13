const fs = require('fs');
const path = 'lib/components/HintBox.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix containerLayout
content = content.replace(
  `if (!prev || Math.abs(prev.pageX - pageX) > 1 || Math.abs(prev.pageY - pageY) > 1) {`,
  `if (!prev || Math.abs(prev.pageX - pageX) > 1 || Math.abs(prev.pageY - pageY) > 1 || Math.abs(prev.width - w) > 1 || Math.abs(prev.height - h) > 1) {`
);

// Fix hintsLayouts
content = content.replace(
  `if (!current || Math.abs(current.pageX - pageX) > 1 || Math.abs(current.pageY - pageY) > 1) {`,
  `if (!current || Math.abs(current.pageX - pageX) > 1 || Math.abs(current.pageY - pageY) > 1 || Math.abs(current.width - w) > 1 || Math.abs(current.height - h) > 1) {`
);

// Fix targetsLayouts (since the first replace might only replace the first occurrence, I'll do it again)
content = content.replace(
  `if (!current || Math.abs(current.pageX - pageX) > 1 || Math.abs(current.pageY - pageY) > 1) {`,
  `if (!current || Math.abs(current.pageX - pageX) > 1 || Math.abs(current.pageY - pageY) > 1 || Math.abs(current.width - w) > 1 || Math.abs(current.height - h) > 1) {`
);

fs.writeFileSync(path, content);
console.log('Patched layout measurements successfully');

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to process
const htmlFiles = [
  'build/index.html',
  'build/404.html'
];

// Replacement rules: [pattern, replacement]
const replacements = [
  // CSS files
  [/css\/freelancer\.css/g, 'css/freelancer.min.css'],

  // JS files - use minified versions
  [/js\/booking\.js/g, 'js/booking.min.js'],
  [/js\/contact_me\.js/g, 'js/contact_me.min.js'],
  [/js\/freelancer\.js/g, 'js/freelancer.min.js'],

  // Fix casing issues
  [/js\/cbpAnimatedHeader\.js/g, 'js/cbpanimatedheader.min.js'],
  [/js\/jqBootstrapValidation\.js/g, 'js/jqbootstrapvalidation.js'],
];

htmlFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`Skipping ${file} (not found)`);
    return;
  }

  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  replacements.forEach(([pattern, replacement]) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`✓ Updated references in ${file}`);
  } else {
    console.log(`- No changes needed in ${file}`);
  }
});

console.log('HTML reference updates complete!');

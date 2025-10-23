# Build Process Documentation

This document describes the build process for the Midnight Express LKN website.

## Overview

The build process compiles LESS files, minifies CSS and JavaScript, and creates a production-ready deployment in the `/build` directory.

## Prerequisites

- Node.js (v14 or higher recommended)
- npm (comes with Node.js)

## Installation

Install the build dependencies:

```bash
npm install
```

This will install:
- `less` - LESS compiler
- `clean-css-cli` - CSS minifier
- `terser` - JavaScript minifier
- `watch` - File watcher for development

## Build Commands

### Full Production Build

```bash
npm run build
```

This command runs the complete build process:

1. **Clean** - Removes the existing `/build` directory
2. **Compile LESS** - Compiles `less/freelancer.less` to `css/freelancer.css`
3. **Minify CSS** - Creates minified versions of CSS files
4. **Minify JavaScript** - Creates minified versions of custom JS files
5. **Copy Assets** - Copies all necessary files to `/build`
6. **Update References** - Updates HTML files to use minified assets

### Individual Build Steps

You can also run individual build steps:

```bash
# Compile LESS to CSS
npm run build:less

# Minify CSS files
npm run build:css

# Minify JavaScript files
npm run build:js

# Copy all files to build directory
npm run build:copy

# Clean build directory
npm run clean
```

### Development Watch Mode

```bash
npm run watch
```

Watches the `/less` directory for changes and automatically recompiles LESS files.

## Build Output

The `/build` directory contains:

```
build/
├── index.html              # Main page (with updated asset references)
├── 404.html                # Error page
├── css/
│   ├── freelancer.min.css  # Minified custom styles
│   └── bootstrap.min.css   # Minified Bootstrap
├── js/
│   ├── booking.min.js      # Minified booking functionality
│   ├── contact_me.min.js   # Minified contact form
│   ├── freelancer.min.js   # Minified site scripts
│   ├── jquery.js           # jQuery library
│   ├── bootstrap.min.js    # Bootstrap JS
│   └── [other libraries]
├── assets/                 # Images and other assets
│   ├── banner-1600x1040.png
│   └── images/
├── fonts/                  # Web fonts
├── font-awesome/           # Font Awesome assets
├── mail/                   # Email handling scripts
├── robots.txt              # SEO robots file
├── sitemap.xml             # SEO sitemap
├── CNAME                   # Domain configuration
└── .nojekyll              # GitHub Pages configuration
```

## What Gets Minified

### CSS Files
- `css/freelancer.css` → `build/css/freelancer.min.css`
- `css/bootstrap.css` → `build/css/bootstrap.min.css`

### JavaScript Files
- `js/booking.js` → `build/js/booking.min.js`
- `js/contact_me.js` → `build/js/contact_me.min.js`
- `js/freelancer.js` → `build/js/freelancer.min.js`

### What Gets Copied (Not Minified)
- Library files (jQuery, Bootstrap, etc.) - already minified
- Images and assets - binary files
- Fonts - binary files
- Static files (robots.txt, sitemap.xml, etc.)

## Deployment

The `/build` directory is ready for deployment to any static hosting service:

### Deploy to GitHub Pages

```bash
# The build directory can be pushed to gh-pages branch
cd build
git init
git add .
git commit -m "Deploy"
git push -f git@github.com:yourusername/yourrepo.git main:gh-pages
```

### Deploy to Other Services

Simply upload the contents of the `/build` directory to:
- Netlify
- Vercel
- AWS S3
- Any static hosting service

## File Size Comparison

After building, you can check the size improvements:

```bash
# Original file sizes
ls -lh css/freelancer.css js/booking.js js/contact_me.js

# Minified file sizes
ls -lh build/css/freelancer.min.css build/js/booking.min.js build/js/contact_me.min.js
```

Typical savings:
- CSS: ~30-40% reduction
- JavaScript: ~40-60% reduction

## Troubleshooting

### Build Fails with "command not found"

Make sure you've run `npm install` to install dependencies.

### LESS Compilation Errors

Check your LESS files for syntax errors:
- `less/freelancer.less`
- `less/variables.less`
- `less/mixins.less`

### Assets Not Copying

Ensure all source directories exist:
- `assets/`
- `fonts/`
- `font-awesome/`
- `mail/`

## Maintaining the Build Process

### Adding New JavaScript Files

1. Add your file to the `js/` directory
2. Update `package.json` in the `build:js:minify` script to include it
3. Update `update-html-refs.js` if the file needs to be referenced in HTML

### Adding New LESS Files

1. Add your `.less` file to the `less/` directory
2. Import it in `less/freelancer.less`: `@import "yourfile.less";`
3. The build process will automatically include it

### Modifying the Build Process

Edit the `scripts` section in `package.json` to customize the build process.

## Notes

- The `/build` directory is git-ignored to prevent committing build artifacts
- Source files in `/css` are also generated from LESS and should not be manually edited
- Always edit LESS files, not the compiled CSS files
- HTML files are automatically updated to reference minified assets during build

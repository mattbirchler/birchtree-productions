#!/bin/bash
# Updates all HTML files with cache-busting hashes for the CSS and JS assets.
# Run this after making changes to styles.css, home.css, home.js, app.css, app.js,
# or any page-local asset under apps/<app>/.

set -e

bust() {
    asset="$1"
    [ -f "$asset" ] || return 0
    name=$(basename "$asset")
    escaped=$(echo "$name" | sed 's/\./\\./g')
    hash=$(md5 -q "$asset" | cut -c1-8)
    echo "Cache-busting $name with hash: $hash"
    find . -name "*.html" | while read -r file; do
        sed -i '' "s|${escaped}\(?v=[a-z0-9]*\)\{0,1\}\"|${name}?v=${hash}\"|g" "$file"
    done
}

bust styles.css
bust home.css
bust home.js
bust app.css
bust app.js

# Page-local demo assets (apps/<app>/<app>.css and .js).
for asset in apps/*/*.css apps/*/*.js; do
    bust "$asset"
done

echo "Done. Updated all HTML files."

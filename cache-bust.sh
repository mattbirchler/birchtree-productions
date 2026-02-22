#!/bin/bash
# Updates all HTML files with a cache-busting hash for styles.css
# Run this after making changes to styles.css

HASH=$(md5 -q styles.css | cut -c1-8)

echo "Cache-busting styles.css with hash: $HASH"

# Update all HTML files that reference styles.css
find . -name "*.html" | while read -r file; do
    # Replace styles.css (with or without existing query param) with styles.css?v=HASH
    sed -i '' "s|styles\.css\(?v=[a-f0-9]*\)\{0,1\}\"|styles.css?v=$HASH\"|g" "$file"
done

echo "Done. Updated all HTML files."

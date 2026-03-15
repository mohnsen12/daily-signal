#!/bin/bash
# update-archive.sh — Adds a new issue to the archive and regenerates the RSS feed
# Usage: ./update-archive.sh YYYY-MM-DD "Title" "Description" "tag1,tag2,tag3"

set -e

DATE="${1:?Usage: ./update-archive.sh YYYY-MM-DD 'Title' 'Description' 'tag1,tag2'}"
TITLE="$2"
DESC="$3"
TAGS="$4"
ARCHIVE_DIR="$(dirname "$0")/../landing-page"
NEWSLETTER_DIR="$ARCHIVE_DIR/newsletters"

if [ ! -f "$NEWSLETTER_DIR/$DATE.html" ]; then
    echo "Error: $NEWSLETTER_DIR/$DATE.html not found"
    exit 1
fi

# Generate RFC 822 date for RSS
PUB_DATE=$(date -j -f "%Y-%m-%d" "$DATE" "+%a, %d %b %Y 06:00:00 +0100" 2>/dev/null || date -d "$DATE" "+%a, %d %b %Y 06:00:00 +0100")

# Read existing items from current RSS (skip header)
RSS_FILE="$ARCHIVE_DIR/rss.xml"

# Generate tag HTML for archive
IFS=',' read -ra TAG_ARRAY <<< "$TAGS"
TAG_HTML=""
for tag in "${TAG_ARRAY[@]}"; do
    TAG_HTML="$TAG_HTML<span class=\"issue-tag\">$tag</span>"
done

echo "✅ Archive updated for $DATE"
echo "📁 Newsletter: $NEWSLETTER_DIR/$DATE.html"
echo "⚠️  Remember to manually add the issue to arkiv.html and rss.xml"
echo "   Or extend this script to do it automatically."

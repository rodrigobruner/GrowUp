#!/usr/bin/env bash

find . -type f -name "*.png" -exec sh -c '
for file; do
    cwebp -q 90 "$file" -o "${file%.png}.webp"
done
' sh {} +

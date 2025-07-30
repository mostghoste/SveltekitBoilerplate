#!/usr/bin/env bash
set -euo pipefail

OUTPUT="codebase.txt"
> "$OUTPUT"

echo "Collecting source files…"

while IFS= read -r file; do
  printf "===== %s =====\n" "$file" >> "$OUTPUT"
  cat "$file" >> "$OUTPUT"
  printf "\n\n" >> "$OUTPUT"
done < <(
  find . \
    -type f \
    ! -path "./node_modules/*" \
    ! -path "./.git/*" \
    ! -path "*/.*/*" \
    ! -path "./src/lib/paraglide/*" \
    ! -name "package-lock.json" \
    ! -name "yarn.lock" \
    ! -name "pnpm-lock.yaml" \
    ! -name "*.log" \
    \( -iname "*.js" -o -iname "*.ts" -o -iname "*.svelte" \
     -o -iname "*.css" -o -iname "*.html" -o -iname "*.json" \
     -o -iname "*.md" \
    \) | sort
)

# Summaries
file_count=$(grep -c '^=====' "$OUTPUT" || echo 0)
line_count=$(wc -l < "$OUTPUT")

echo
echo "===== SUMMARY ====="
echo "Files collected: $file_count"
echo "Total lines:     $line_count"
echo "Written to:      $OUTPUT"
echo

# Clipboard
echo "Attempting to copy to clipboard…"
if   command -v pbcopy &>/dev/null; then
  pbcopy < "$OUTPUT" && echo "✓ pbcopy"
elif command -v wl-copy &>/dev/null; then
  wl-copy < "$OUTPUT" && echo "✓ wl-copy"
elif command -v xclip &>/dev/null; then
  xclip -selection clipboard < "$OUTPUT" && echo "✓ xclip"
elif command -v xsel &>/dev/null; then
  xsel --clipboard --input < "$OUTPUT" && echo "✓ xsel"
elif command -v clip.exe &>/dev/null; then
  clip.exe < "$OUTPUT" && echo "✓ clip.exe (WSL)"
else
  echo "✗ No clipboard tool found."
  echo "  Install one, for example:"
  echo "    sudo apt update && sudo apt install xclip xsel wl-clipboard"
fi

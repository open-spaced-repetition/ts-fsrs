#!/usr/bin/env bash
# Create GitHub Releases + git tags for packages published by changesets.
#
# Usage:
#   create-github-releases.sh [--dry-run|-n] [<json>]
#
# Input (pick one):
#   $1                       JSON array, e.g. [{"name":"ts-fsrs","version":"5.3.3"}, ...]
#   env PUBLISHED_PACKAGES   same JSON, used when $1 is empty
# In CI: `${{ steps.changesets.outputs.publishedPackages }}`.
#
# --dry-run prints tags/notes/assets without touching git or gh.
# (Skips the GITHUB_TOKEN and gh CLI checks too — safe to run locally.)
#
# Tag scheme:
#   ts-fsrs                         -> v<version>
#   @open-spaced-repetition/binding -> @open-spaced-repetition/binding@<version>
#
# Notes  : the "## <version>" section from the package's CHANGELOG.md.
# Assets : for binding, every *.node / *.wasm from the build-napi matrix.
# Idempotent (rerun = edit + upload --clobber). GITHUB_TOKEN needs contents:write.

set -euo pipefail

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" || "${1:-}" == "-n" ]]; then
  DRY_RUN=1
  shift
fi

PUBLISHED_JSON="${1:-${PUBLISHED_PACKAGES:-}}"
if [[ -z "$PUBLISHED_JSON" || "$PUBLISHED_JSON" == "[]" ]]; then
  echo "No published packages; nothing to release."
  exit 0
fi

required=(jq git awk find)
(( DRY_RUN )) || required+=(gh)
for cmd in "${required[@]}"; do
  command -v "$cmd" >/dev/null || { echo "Error: '$cmd' not found in PATH." >&2; exit 1; }
done
(( DRY_RUN )) || : "${GITHUB_TOKEN:?GITHUB_TOKEN is required}"

cd "$(git rev-parse --show-toplevel)"
git config user.email >/dev/null 2>&1 || {
  git config user.email "github-actions[bot]@users.noreply.github.com"
  git config user.name  "github-actions[bot]"
}

# Make sure local tag state matches remote before deciding what to create.
# Skip in dry-run to avoid polluting the user's local repo.
(( DRY_RUN )) || git fetch --tags --quiet origin

TMP_FILES=()
cleanup() { [[ ${#TMP_FILES[@]} -gt 0 ]] && rm -f "${TMP_FILES[@]}"; }
trap cleanup EXIT

# Print only the body of "## <version>" (exclusive of headings), stripping
# leading and trailing blank lines.
extract_section() {
  awk -v ver="$2" '
    /^## / { if (found) exit; if ($0 == "## " ver) { found = 1; next } }
    found { if (!started && $0 == "") next; started = 1; buf[++n] = $0 }
    END   { while (n > 0 && buf[n] == "") n--; for (i = 1; i <= n; i++) print buf[i] }
  ' "$1"
}

tag_for() {
  case "$1" in
    ts-fsrs)                         echo "v$2" ;;
    @open-spaced-repetition/binding) echo "@open-spaced-repetition/binding@$2" ;;
  esac
}

dir_for() {
  case "$1" in
    ts-fsrs)                         echo "packages/fsrs" ;;
    @open-spaced-repetition/binding) echo "packages/binding" ;;
  esac
}

# Emit newline-separated paths of *.node / *.wasm, deduped by basename.
collect_binding_assets() {
  local dirs=() d
  for d in packages/binding/{artifacts,npm,dist}; do
    [[ -d "$d" ]] && dirs+=("$d")
  done
  (( ${#dirs[@]} )) || return 0
  find "${dirs[@]}" -type f \
    \( -name '*.node' -o \( -name '*.wasm' ! -name '*.debug.wasm' \) \) |
    awk -F/ '!seen[$NF]++'
}

exit_code=0

while IFS= read -r row; do
  name=$(jq -r '.name // empty' <<<"$row")
  version=$(jq -r '.version // empty' <<<"$row")
  if [[ -z "$name" || -z "$version" ]]; then
    echo "Error: malformed entry: $row" >&2
    exit_code=1; continue
  fi

  pkg_dir=$(dir_for "$name")
  if [[ -z "$pkg_dir" ]]; then
    echo "Error: unknown package '$name' (add it to dir_for/tag_for)." >&2
    exit_code=1; continue
  fi

  tag=$(tag_for "$name" "$version")
  title="${name}@${version}"
  changelog="${pkg_dir}/CHANGELOG.md"

  echo ""
  echo "=== Releasing $title ==="
  echo "  tag       = $tag"
  echo "  changelog = $changelog"

  if [[ ! -f "$changelog" ]]; then
    echo "Error: missing $changelog" >&2
    exit_code=1; continue
  fi

  notes=$(mktemp); TMP_FILES+=("$notes")
  extract_section "$changelog" "$version" >"$notes"
  if [[ ! -s "$notes" ]]; then
    echo "Error: no '## $version' section in $changelog" >&2
    exit_code=1; continue
  fi

  assets=()
  if [[ "$name" == "@open-spaced-repetition/binding" ]]; then
    while IFS= read -r line; do
      [[ -n "$line" ]] && assets+=("$line")
    done < <(collect_binding_assets)
    if (( ${#assets[@]} == 0 )); then
      echo "Warning: no .node/.wasm found — release will have no binaries." >&2
    else
      echo "Attaching ${#assets[@]} asset(s):"
      printf '  %s\n' "${assets[@]}"
    fi
  fi

  if (( DRY_RUN )); then
    echo "  [dry-run] would tag + push: $tag"
    echo "  [dry-run] would create/update release with notes:"
    sed 's/^/    | /' "$notes"
    continue
  fi

  # Annotated tag -> remote. Pushing the same ref to the same SHA is a no-op;
  # a real mismatch (non-fast-forward, auth error) fails via set -e.
  if ! git rev-parse -q --verify "refs/tags/${tag}" >/dev/null; then
    git tag -a "$tag" -m "$title"
  fi
  git push origin "refs/tags/${tag}"

  if gh release view "$tag" >/dev/null 2>&1; then
    gh release edit "$tag" --title "$title" --notes-file "$notes"
    (( ${#assets[@]} )) && gh release upload "$tag" "${assets[@]}" --clobber
  elif (( ${#assets[@]} )); then
    gh release create "$tag" --title "$title" --notes-file "$notes" "${assets[@]}"
  else
    gh release create "$tag" --title "$title" --notes-file "$notes"
  fi
done < <(jq -c '.[]' <<<"$PUBLISHED_JSON")

exit "$exit_code"

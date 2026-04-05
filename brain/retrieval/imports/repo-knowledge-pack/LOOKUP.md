# Repo Knowledge Pack Lookup

Use the JSON lookup first, then open the card path.

## Fast path

1. Search [lookup.json](../../../imports/repo-knowledge-pack/manifests/lookup.json) for the source path or basename.
2. Open the card path under [normalized/repo-knowledge-pack/cards/](../../../imports/repo-knowledge-pack/normalized/repo-knowledge-pack/cards/).
3. If the file is not carded, inspect [files.jsonl](../../../imports/repo-knowledge-pack/raw/repo-knowledge-pack/files.jsonl) and the top-level summary docs.

## Retrieval Notes

- Script surfaces are intentionally over-weighted.
- Generated/vendor/runtime trees remain in the raw manifest but are de-prioritized for cards.
- Run `npm run brain:repo-knowledge-pack:update` to refresh unchanged cards after normal edits.
- Retrieval profile: repo-knowledge-pack
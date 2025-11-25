# Beta Tag Cleanup - lacylights-mcp

## Issue

The repository had an incorrect beta version format in `package.json` which caused a malformed git tag to be created.

## What Was Wrong

- **package.json had**: `"version": "1.4.2-b1"` (with dash)
- **Should have been**: `"version": "1.4.2b1"` (no dash)
- **Result**: Created malformed tag `v1.4.2-` instead of `v1.4.2`

## Tags Removed

The following malformed tag was deleted from both local and remote:
- `v1.4.2-` (created 2025-11-25, deleted same day)

## Root Cause

The release workflow's regex patterns didn't account for dashes in beta versions:
- Detection regex: `b[1-9][0-9]*$` (missed `-b` format)
- Removal regex: `s/b[1-9][0-9]*$/` (removed only `b1`, left the dash)

When finalizing `1.4.2-b1` to stable, it became `1.4.2-` instead of `1.4.2`.

## Fix Applied

Updated `.github/workflows/release.yml`:
```bash
# Before
if [[ "$CURRENT_VERSION" =~ b[1-9][0-9]*$ ]]; then
  BASE_VERSION=$(echo "$CURRENT_VERSION" | sed 's/b[1-9][0-9]*$//')

# After
if [[ "$CURRENT_VERSION" =~ -?b[1-9][0-9]*$ ]]; then
  BASE_VERSION=$(echo "$CURRENT_VERSION" | sed 's/-\?b[1-9][0-9]*$//')
```

The workflow now handles both formats (`Xb1` and `X-b1`) and properly removes both the dash and beta suffix.

## Cleanup Actions Taken

1. ✅ Deleted malformed tag `v1.4.2-` (local and remote)
2. ✅ Fixed `package.json` version format: `1.4.2-b1` → `1.4.2b1`
3. ✅ Updated `package-lock.json` to match
4. ✅ Fixed workflow regex to handle both formats
5. ✅ Committed fix to `fix/idempotent-tag-creation` branch

## Correct Beta Version Format

Going forward, all beta versions should follow this format:
- ✅ **Correct**: `X.Y.Zb[N]` (e.g., `1.4.2b1`, `1.4.2b2`)
- ❌ **Incorrect**: `X.Y.Z-b[N]` (e.g., `1.4.2-b1`, `1.4.2-b2`)

The workflow now tolerates both formats but will normalize to the correct format when creating git tags.

## Verification

To verify the fix is working:
```bash
# Check current package.json version
grep '"version"' package.json

# Check git tags (should not see any ending with -)
git tag -l | grep -- '-$'

# Should return empty
```

---
**Created**: 2025-11-25
**Issue**: Malformed beta tag `v1.4.2-`
**Fixed by**: Updated regex patterns in release workflow

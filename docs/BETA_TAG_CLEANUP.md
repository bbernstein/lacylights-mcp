# Beta Tag Cleanup - lacylights-mcp

## Issue

The repository had non-standard beta version formats in `package.json` which caused a malformed git tag to be created.

## What Was Wrong

- **package.json had**: `"version": "1.4.2-b1"` (non-standard format)
- **Should be**: `"version": "1.4.2-beta.1"` (semver-compatible format)
- **Result**: Created malformed tag `v1.4.2-` instead of `v1.4.2`

## Tags Removed

The following malformed tag was deleted from both local and remote:
- `v1.4.2-` (created 2025-11-25, deleted same day)

## Root Cause

The release workflow's regex patterns didn't properly handle non-standard beta version formats. The old workflow used patterns like `b[1-9][0-9]*$` which didn't account for various dash positions, leading to incomplete version string removal during beta finalization.

When attempting to finalize `1.4.2-b1` to stable, it became `1.4.2-` instead of `1.4.2`.

## Fix Applied

Updated `.github/workflows/release.yml` to use semver-compatible beta format (`X.Y.Z-beta.N`):
```bash
# New semver-compatible format
if [[ "$CURRENT_VERSION" =~ ^([0-9]+\.[0-9]+\.[0-9]+)-beta\.([0-9]+)$ ]]; then
  CURRENT_IS_BETA=true
  BASE_VERSION="${BASH_REMATCH[1]}"
  BETA_NUM="${BASH_REMATCH[2]}"
fi
```

The workflow now:
- **Accepts** old formats as input (for backward compatibility during migration): `Xb1`, `X-b1`, `X-bN`
- **Normalizes** them to semver format: `X.Y.Z-beta.N`
- **Outputs** only semver-compatible versions in package.json and git tags

## Cleanup Actions Taken

1. ✅ Deleted malformed tag `v1.4.2-` (local and remote)
2. ✅ Fixed `package.json` version format: `1.4.2-b1` → `1.4.2-beta.1`
3. ✅ Updated `package-lock.json` to match
4. ✅ Completely rewrote workflow to use semver-compatible format
5. ✅ Committed fix to `fix/idempotent-tag-creation` branch

## Correct Beta Version Format

Going forward, all beta versions MUST follow the semver-compatible format:
- ✅ **Correct**: `X.Y.Z-beta.N` (e.g., `1.4.2-beta.1`, `1.4.2-beta.2`)
- ❌ **Incorrect**: `X.Y.Zb[N]` (e.g., `1.4.2b1`)
- ❌ **Incorrect**: `X.Y.Z-b[N]` (e.g., `1.4.2-b1`)

The workflow accepts legacy formats as input for backward compatibility but always normalizes output to the standard `X.Y.Z-beta.N` format when creating new versions or git tags.

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

# LacyLights MCP Release Process

This document describes the complete release process for the LacyLights MCP server, including beta (prerelease) and stable release workflows.

## Table of Contents

- [Overview](#overview)
- [Version Format](#version-format)
- [Release Types](#release-types)
- [Beta Release Process](#beta-release-process)
- [Stable Release Process](#stable-release-process)
- [Release Checklist](#release-checklist)
- [Distribution Verification](#distribution-verification)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)

---

## Overview

LacyLights MCP uses an automated release workflow that supports both beta (prerelease) and stable releases. The workflow handles version management, builds distribution archives, creates GitHub releases, and updates distribution infrastructure (S3 + DynamoDB).

**Key Features:**
- Automated semantic versioning
- Smart beta version incrementing
- Multi-channel distribution (GitHub, S3, DynamoDB)
- SHA256 checksums for security
- Automatic release notes generation

---

## Version Format

### Stable Releases
Format: `X.Y.Z` (e.g., `1.4.0`, `2.0.0`)

Follows [Semantic Versioning 2.0.0](https://semver.org/):
- **X (Major)**: Breaking changes, incompatible API changes
- **Y (Minor)**: New features, backward-compatible
- **Z (Patch)**: Bug fixes, backward-compatible

### Beta Releases
Format: `X.Y.Zb[N]` (e.g., `1.4.1b1`, `1.5.0b3`)

- `X.Y.Z`: Base semantic version
- `b`: Beta identifier (lowercase)
- `[N]`: Beta iteration number (1, 2, 3, ...)

**Examples:**
- `1.4.1b1` - First beta for version 1.4.1
- `1.4.1b2` - Second beta for version 1.4.1
- `2.0.0b1` - First beta for version 2.0.0

---

## Release Types

The release workflow supports **four versioning scenarios** with smart detection:

### Scenario 1: Stable → First Beta
**When:** Starting a new beta cycle from a stable release

**Input:**
- Current version: `1.4.0` (stable)
- Version bump: `patch`, `minor`, or `major`
- Is prerelease: `✓ true`

**Result:**
- `patch` → `1.4.1b1`
- `minor` → `1.5.0b1`
- `major` → `2.0.0b1`

**Use cases:**
- Testing new features before stable release
- Getting early user feedback
- Validating breaking changes

---

### Scenario 2: Beta → Next Beta
**When:** Iterating on an existing beta

**Input:**
- Current version: `1.4.1b1` (beta)
- Version bump: *any* (ignored)
- Is prerelease: `✓ true`

**Result:** `1.4.1b2`

**Notes:**
- Base version (`1.4.1`) remains unchanged
- Only beta counter increments
- Version bump selection is ignored

**Use cases:**
- Bug fixes in beta
- Incremental improvements
- Additional testing iterations

---

### Scenario 3: Beta → Stable (Finalize)
**When:** Promoting a beta to stable release

**Input:**
- Current version: `1.4.1b5` (beta)
- Version bump: *any* (ignored)
- Is prerelease: `☐ false`

**Result:** `1.4.1` (stable)

**Notes:**
- Removes beta suffix
- Base version remains unchanged
- This is the **only** way to finalize a beta

**Use cases:**
- Beta testing complete
- Ready for production
- Promoting tested changes

---

### Scenario 4: Stable → Stable
**When:** Regular version bump (no beta testing)

**Input:**
- Current version: `1.4.0` (stable)
- Version bump: `patch`, `minor`, or `major`
- Is prerelease: `☐ false`

**Result:**
- `patch` → `1.4.1`
- `minor` → `1.5.0`
- `major` → `2.0.0`

**Use cases:**
- Hotfixes
- Standard releases
- Direct-to-stable deployments

---

## Beta Release Process

### When to Create Beta Releases

Create beta releases when you want to:
- Test new features with early adopters
- Validate breaking changes before stable release
- Get feedback on experimental functionality
- Test integration with other LacyLights components
- Perform extended QA on significant changes

### Step-by-Step: Creating a Beta Release

1. **Navigate to GitHub Actions**
   - Go to: https://github.com/bbernstein/lacylights-mcp/actions
   - Select: "Create Release" workflow

2. **Configure Release Parameters**
   - Click: "Run workflow"
   - Select branch: `main` (or feature branch)
   - **Version bump:** Select `patch`, `minor`, or `major`
     - First beta: Creates `X.Y.Zb1` based on bump type
     - Subsequent betas: Selection ignored, increments beta number
   - **Create as prerelease:** ✓ Check this box
   - **Release name:** (optional) Leave blank for auto-generated

3. **Review and Run**
   - Click: "Run workflow"
   - Workflow duration: ~3-5 minutes

4. **Monitor Workflow Progress**
   Watch for these steps:
   - ✓ Version calculation
   - ✓ Package.json update
   - ✓ Git tag creation
   - ✓ GitHub release creation
   - ✓ Archive build
   - ✓ S3 upload
   - ✓ DynamoDB update

5. **Verify Beta Release**
   See [Distribution Verification](#distribution-verification)

### Beta Release Behavior

**What Happens:**
- ✓ GitHub release marked as "Pre-release"
- ✓ Archive uploaded to S3: `s3://dist.lacylights.com/releases/mcp/lacylights-mcp-X.Y.Zb[N].tar.gz`
- ✓ DynamoDB entry created with `isPrerelease: true`
- ✗ `latest.json` **NOT** updated (stable releases only)

**Notification Badge:**
Beta releases show an orange "Pre-release" badge on GitHub.

---

## Stable Release Process

### When to Create Stable Releases

Create stable releases when:
- Finalizing a tested beta (beta → stable)
- Deploying production-ready changes
- Publishing hotfixes
- Releasing well-tested features

### Step-by-Step: Creating a Stable Release

1. **Navigate to GitHub Actions**
   - Go to: https://github.com/bbernstein/lacylights-mcp/actions
   - Select: "Create Release" workflow

2. **Configure Release Parameters**
   - Click: "Run workflow"
   - Select branch: `main`
   - **Version bump:** Select `patch`, `minor`, or `major`
     - If current is beta: Selection ignored, removes beta suffix
     - If current is stable: Normal semantic version bump
   - **Create as prerelease:** ☐ Leave unchecked
   - **Release name:** (optional) Leave blank for auto-generated

3. **Review and Run**
   - Click: "Run workflow"
   - Workflow duration: ~3-5 minutes

4. **Monitor Workflow Progress**
   Same steps as beta, plus:
   - ✓ `latest.json` update

5. **Verify Stable Release**
   See [Distribution Verification](#distribution-verification)

### Stable Release Behavior

**What Happens:**
- ✓ GitHub release marked as "Latest release"
- ✓ Archive uploaded to S3
- ✓ `latest.json` **updated** with new version
- ✓ DynamoDB entry created with `isPrerelease: false`

---

## Release Checklist

Use these checklists to ensure successful releases:

### Pre-Release Validation

**Before triggering the workflow:**

- [ ] All tests passing locally (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Coverage meets thresholds (70%+ lines, 65%+ functions)
- [ ] Code reviewed and approved
- [ ] CHANGELOG.md updated (if applicable)
- [ ] Breaking changes documented (for major versions)
- [ ] Integration tests pass with lacylights-go backend
- [ ] Current branch is `main` (or approved feature branch)

### Post-Release Validation

**After workflow completes:**

#### Git & GitHub
- [ ] Git tag created: `v{version}`
- [ ] GitHub release published
- [ ] Prerelease flag correct (beta=true, stable=false)
- [ ] Release notes auto-generated
- [ ] Archive asset uploaded

#### Distribution (S3)
- [ ] Archive exists at: `https://dist.lacylights.com/releases/mcp/lacylights-mcp-{version}.tar.gz`
- [ ] Archive downloadable (no 404)
- [ ] SHA256 checksum matches
- [ ] For stable: `latest.json` updated
- [ ] For beta: `latest.json` **not** modified

#### Database (DynamoDB)
- [ ] Item exists in `lacylights-releases` table
- [ ] Component: `mcp`
- [ ] Version matches
- [ ] `isPrerelease` boolean correct
- [ ] `releaseDate` populated
- [ ] SHA256 checksum stored

#### Archive Contents
- [ ] Extract and verify archive structure:
  ```bash
  tar -tzf lacylights-mcp-{version}.tar.gz | head -20
  ```
- [ ] Contains: `dist/`, `node_modules/`, `package.json`
- [ ] No test files included
- [ ] No dev dependencies included
- [ ] Archive size reasonable (~50-80MB)

---

## Distribution Verification

### Quick Verification Script

```bash
#!/bin/bash
VERSION="1.4.1b1"  # Replace with your version

echo "=== Verifying Release: $VERSION ==="

# 1. Check GitHub release
echo "1. GitHub Release:"
gh release view "v$VERSION" --json tagName,name,isPrerelease,publishedAt

# 2. Check S3 archive
echo ""
echo "2. S3 Archive:"
curl -I "https://dist.lacylights.com/releases/mcp/lacylights-mcp-$VERSION.tar.gz"

# 3. Check latest.json (stable only)
echo ""
echo "3. Latest JSON:"
curl -s "https://dist.lacylights.com/releases/mcp/latest.json" | jq

# 4. Verify SHA256
echo ""
echo "4. SHA256 Verification:"
curl -sL "https://dist.lacylights.com/releases/mcp/lacylights-mcp-$VERSION.tar.gz" | sha256sum
```

### Manual Verification Steps

#### 1. Verify GitHub Release
```bash
# List recent releases
gh release list --limit 5

# View specific release
gh release view v1.4.1b1
```

**Expected output:**
- Title: `v1.4.1b1` (or custom name)
- Tag: `v1.4.1b1`
- Pre-release: `true` (for beta) or `false` (for stable)
- Assets: `lacylights-mcp-1.4.1b1.tar.gz`

#### 2. Verify S3 Distribution
```bash
# Check if archive exists
curl -I https://dist.lacylights.com/releases/mcp/lacylights-mcp-1.4.1b1.tar.gz

# Download archive
curl -LO https://dist.lacylights.com/releases/mcp/lacylights-mcp-1.4.1b1.tar.gz

# Verify SHA256
sha256sum lacylights-mcp-1.4.1b1.tar.gz
# Compare with workflow output or DynamoDB record
```

**Expected response:**
- HTTP 200 OK
- Content-Type: `application/gzip`
- Content-Length: ~50-80MB

#### 3. Verify latest.json (Stable Only)
```bash
# Fetch latest.json
curl -s https://dist.lacylights.com/releases/mcp/latest.json | jq
```

**Expected for stable release:**
```json
{
  "version": "1.4.1",
  "url": "https://dist.lacylights.com/releases/mcp/lacylights-mcp-1.4.1.tar.gz",
  "sha256": "abc123...",
  "releaseDate": "2025-11-24T16:30:00Z",
  "isPrerelease": false,
  "fileSize": 52428800
}
```

**Expected for beta release:**
- Previous stable version remains in `latest.json`
- Beta version **NOT** in `latest.json`

#### 4. Verify DynamoDB Entry
```bash
# Query DynamoDB (requires AWS credentials)
aws dynamodb get-item \
  --table-name lacylights-releases \
  --key '{"component": {"S": "mcp"}, "version": {"S": "1.4.1b1"}}'
```

**Expected attributes:**
- `component`: `"mcp"`
- `version`: `"1.4.1b1"`
- `url`: Full S3 URL
- `sha256`: SHA256 checksum
- `releaseDate`: ISO 8601 timestamp
- `isPrerelease`: `true` (beta) or `false` (stable)
- `fileSize`: Number (bytes)

#### 5. Test Installation
```bash
# Extract archive
tar -xzf lacylights-mcp-1.4.1b1.tar.gz
cd lacylights-mcp

# Verify version
node -p "require('./package.json').version"
# Expected: 1.4.1b1

# Test run
npm start
# Should start without errors
```

---

## Troubleshooting

### Common Issues

#### Issue: "Tag already exists"

**Symptoms:**
- Workflow fails at "Create Git tag" step
- Error: `fatal: tag 'vX.Y.Z' already exists`

**Cause:**
Workflow previously ran but failed after creating tag.

**Solution:**
```bash
# Option 1: Delete tag and re-run
git push --delete origin v1.4.1b1
git tag -d v1.4.1b1

# Option 2: Skip to next beta
# If v1.4.1b1 exists, create v1.4.1b2 instead
```

---

#### Issue: "Release already exists"

**Symptoms:**
- Workflow logs: "Release vX.Y.Z already exists. Skipping creation."

**Cause:**
GitHub release exists but workflow is re-running.

**Behavior:**
- Workflow continues (not an error)
- S3 and DynamoDB still update
- Archive overwrites existing

**Action:**
No action needed. This is expected behavior for workflow reruns.

---

#### Issue: S3 Upload Fails

**Symptoms:**
- Workflow fails at "Upload to S3" step
- Error: `AccessDenied` or `NoSuchBucket`

**Cause:**
AWS credentials invalid or expired.

**Solution:**
1. Verify secrets in GitHub:
   - `AWS_DIST_ACCESS_KEY_ID`
   - `AWS_DIST_SECRET_ACCESS_KEY`
   - `AWS_DIST_REGION`
   - `AWS_DIST_BUCKET`
2. Test credentials locally:
   ```bash
   aws s3 ls s3://dist.lacylights.com/releases/mcp/
   ```
3. Contact AWS administrator if credentials need rotation

---

#### Issue: latest.json Not Updating

**Symptoms:**
- Stable release created
- `latest.json` shows old version

**Diagnosis:**
```bash
# Check workflow logs for "Skipping latest.json"
# If present, version incorrectly detected as prerelease

# Verify version format
echo "1.4.1b5" | grep -E 'b[0-9]+$'  # Should match for beta
echo "1.4.1" | grep -E 'b[0-9]+$'    # Should NOT match for stable
```

**Solution:**
1. Verify version in `package.json` is stable (no `b` suffix)
2. Check workflow logs for prerelease detection
3. Re-run workflow if version is correct

---

#### Issue: DynamoDB Update Fails

**Symptoms:**
- Workflow fails at "Update DynamoDB" step
- Error: `ResourceNotFoundException` or `AccessDeniedException`

**Cause:**
DynamoDB table doesn't exist or permissions incorrect.

**Solution:**
1. Verify table exists:
   ```bash
   aws dynamodb describe-table --table-name lacylights-releases
   ```
2. Check IAM permissions for:
   - `dynamodb:PutItem`
   - `dynamodb:GetItem`
3. Verify table schema:
   - Partition key: `component` (String)
   - Sort key: `version` (String)

---

#### Issue: Archive Size Too Large

**Symptoms:**
- Archive > 100MB
- Slow uploads/downloads

**Diagnosis:**
```bash
# Extract and check size breakdown
tar -xzf lacylights-mcp-X.Y.Z.tar.gz
du -sh lacylights-mcp/*
```

**Common causes:**
- Dev dependencies included (should be omitted)
- `.cache` directories not excluded
- Test files included

**Solution:**
Check workflow "Create release archive" step excludes:
- `.git`
- `.github`
- `node_modules/.cache`
- `*.test.ts`
- `__tests__`

---

### Debugging Workflow

#### View Workflow Logs
```bash
# List recent workflow runs
gh run list --workflow=release.yml --limit 5

# View logs for specific run
gh run view <run-id> --log
```

#### Re-run Failed Workflow
```bash
# Re-run failed workflow
gh run rerun <run-id>

# Re-run failed jobs only
gh run rerun <run-id> --failed
```

#### Test Version Calculation Locally
```bash
# Simulate workflow version calculation
CURRENT_VERSION="1.4.0"
IS_PRERELEASE="true"
VERSION_BUMP="patch"

# Extract base and beta number
if [[ "$CURRENT_VERSION" =~ b[0-9]+$ ]]; then
  BASE_VERSION=$(echo "$CURRENT_VERSION" | sed 's/b[0-9]*$//')
  BETA_NUM=$(echo "$CURRENT_VERSION" | grep -oE 'b[0-9]+$' | sed 's/b//')
else
  BASE_VERSION="$CURRENT_VERSION"
  BETA_NUM=0
fi

echo "Base: $BASE_VERSION, Beta: $BETA_NUM"
```

---

## Rollback Procedures

### Rollback Scenarios

#### Scenario 1: Rollback Beta Release

**When:**
- Beta has critical bugs
- Want to revert to previous beta

**Steps:**
1. **Create new beta with fixes** (recommended)
   ```bash
   # If current: 1.4.1b2 (broken)
   # Create: 1.4.1b3 (with fixes)
   ```

2. **OR: Unpublish beta release**
   ```bash
   # Delete GitHub release
   gh release delete v1.4.1b2 --yes

   # Delete git tag
   git push --delete origin v1.4.1b2
   ```

**Note:** Cannot rollback S3/DynamoDB entries. Mark version as deprecated instead.

---

#### Scenario 2: Rollback Stable Release

**When:**
- Stable release has critical production bug
- Need to revert to previous stable

**Steps:**

1. **Update latest.json to previous version**
   ```bash
   # Manually update latest.json in S3
   aws s3 cp s3://dist.lacylights.com/releases/mcp/latest.json latest.json

   # Edit to point to previous version
   vim latest.json  # Change version, url, sha256

   # Upload updated file
   aws s3 cp latest.json s3://dist.lacylights.com/releases/mcp/latest.json \
     --content-type "application/json"
   ```

2. **Mark problematic release as deprecated**
   ```bash
   # Edit GitHub release
   gh release edit v1.4.1 --notes "⚠️ DEPRECATED: Critical bug found. Use v1.4.0 instead."
   ```

3. **Create hotfix release**
   ```bash
   # After fixing, create new patch version
   # If current: 1.4.1 (broken)
   # Create: 1.4.2 (with fixes)
   ```

**Important:** Do not delete stable releases from S3/DynamoDB. Users may have pinned versions.

---

#### Scenario 3: Emergency Rollback

**When:**
- Critical security vulnerability
- Data corruption risk

**Immediate Actions:**

1. **Unpublish GitHub release**
   ```bash
   gh release delete vX.Y.Z --yes
   gh release delete vX.Y.Z  # Confirm
   ```

2. **Delete S3 archive**
   ```bash
   aws s3 rm s3://dist.lacylights.com/releases/mcp/lacylights-mcp-X.Y.Z.tar.gz
   ```

3. **Update latest.json to previous safe version**
   ```bash
   # See Scenario 2 steps
   ```

4. **Add DynamoDB warning attribute** (optional)
   ```bash
   aws dynamodb update-item \
     --table-name lacylights-releases \
     --key '{"component": {"S": "mcp"}, "version": {"S": "X.Y.Z"}}' \
     --update-expression "SET deprecated = :true, deprecationReason = :reason" \
     --expression-attribute-values '{":true": {"BOOL": true}, ":reason": {"S": "Security vulnerability"}}'
   ```

5. **Notify users**
   - Post GitHub issue
   - Update README with warning
   - Send notifications via appropriate channels

---

### Preventing Rollback Needs

**Best Practices:**

1. **Always test betas before stable**
   - Create `X.Y.Zb1` first
   - Test with real workloads
   - Gather user feedback
   - Iterate with `b2`, `b3`, etc.
   - Only finalize to stable when confident

2. **Use staging environments**
   - Test against lacylights-go backend
   - Run contract tests
   - Validate with real fixtures

3. **Review checklist**
   - Follow [Release Checklist](#release-checklist)
   - Don't skip pre-release validation
   - Verify post-release validation

4. **Monitor after release**
   - Watch for user reports
   - Check error logs
   - Monitor GitHub issues

---

## Version History Best Practices

### Semantic Versioning Guidelines

**Patch (X.Y.Z → X.Y.Z+1):**
- Bug fixes
- Performance improvements
- Documentation updates
- Internal refactoring (no API changes)

**Minor (X.Y.Z → X.Y+1.0):**
- New features (backward-compatible)
- New MCP tools
- Enhanced existing functionality
- Deprecations (with backward compatibility)

**Major (X.Y.Z → X+1.0.0):**
- Breaking changes
- Removed deprecated features
- Changed tool interfaces
- GraphQL schema breaking changes
- Incompatible with previous versions

### Beta Testing Strategy

**When to use betas:**
- New major versions (`2.0.0b1`, `2.0.0b2`, etc.)
- Significant new features
- Breaking changes
- Changes requiring user testing

**Beta lifecycle:**
```
1.4.0 (stable)
  ↓
1.5.0b1 (first beta)
  ↓
1.5.0b2 (fixes)
  ↓
1.5.0b3 (more testing)
  ↓
1.5.0 (finalized stable)
```

---

## Additional Resources

- **GitHub Actions Workflow:** [`.github/workflows/release.yml`](../.github/workflows/release.yml)
- **Workflow Testing Guide:** [`.github/workflows/TESTING.md`](../.github/workflows/TESTING.md)
- **Repository:** https://github.com/bbernstein/lacylights-mcp
- **Distribution:** https://dist.lacylights.com/releases/mcp/

---

## Support

For issues with the release process:
1. Check [Troubleshooting](#troubleshooting) section
2. Review workflow logs in GitHub Actions
3. Open an issue: https://github.com/bbernstein/lacylights-mcp/issues

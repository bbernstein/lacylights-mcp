# Release Workflow Testing Guide

This document provides comprehensive test scenarios for the beta versioning system implemented in the release workflow.

## Overview

The release workflow now supports automatic beta versioning with smart detection and increment logic. This guide covers all test scenarios to validate the implementation.

## Test Scenarios

### Scenario 1: Stable to First Beta (Patch)

**Initial State:** `1.4.0` (stable)

**Action:** Create release with:
- `version_bump`: `patch`
- `is_prerelease`: `true`

**Expected Result:** `1.4.1b1`

**Validation:**
- ✅ Version increments patch number
- ✅ Adds `b1` suffix
- ✅ Creates prerelease in GitHub
- ✅ Skips `latest.json` update
- ✅ DynamoDB `isPrerelease`: `true`

---

### Scenario 2: Stable to First Beta (Minor)

**Initial State:** `1.4.0` (stable)

**Action:** Create release with:
- `version_bump`: `minor`
- `is_prerelease`: `true`

**Expected Result:** `1.5.0b1`

**Validation:**
- ✅ Version increments minor number
- ✅ Resets patch to 0
- ✅ Adds `b1` suffix
- ✅ Creates prerelease in GitHub

---

### Scenario 3: Stable to First Beta (Major)

**Initial State:** `1.4.0` (stable)

**Action:** Create release with:
- `version_bump`: `major`
- `is_prerelease`: `true`

**Expected Result:** `2.0.0b1`

**Validation:**
- ✅ Version increments major number
- ✅ Resets minor and patch to 0
- ✅ Adds `b1` suffix
- ✅ Creates prerelease in GitHub

---

### Scenario 4: Beta to Next Beta

**Initial State:** `1.4.1b1` (beta)

**Action:** Create release with:
- `version_bump`: `patch` (ignored)
- `is_prerelease`: `true`

**Expected Result:** `1.4.1b2`

**Validation:**
- ✅ Base version unchanged (`1.4.1`)
- ✅ Beta number increments (`b1` → `b2`)
- ✅ `version_bump` input is ignored
- ✅ Creates prerelease in GitHub
- ✅ Skips `latest.json` update

---

### Scenario 5: Beta Sequence

**Initial State:** `1.4.1b2` (beta)

**Action:** Create multiple releases with `is_prerelease: true`

**Expected Sequence:**
- `1.4.1b2` → `1.4.1b3`
- `1.4.1b3` → `1.4.1b4`
- `1.4.1b4` → `1.4.1b5`

**Validation:**
- ✅ Each release only increments beta number
- ✅ All marked as prerelease
- ✅ No `latest.json` updates

---

### Scenario 6: Beta to Stable (Finalize)

**Initial State:** `1.4.1b5` (beta)

**Action:** Create release with:
- `version_bump`: `patch` (ignored)
- `is_prerelease`: `false`

**Expected Result:** `1.4.1` (stable)

**Validation:**
- ✅ Removes `b5` suffix
- ✅ Base version unchanged
- ✅ `version_bump` input is ignored
- ✅ Creates stable release in GitHub
- ✅ Updates `latest.json`
- ✅ DynamoDB `isPrerelease`: `false`

---

### Scenario 7: Stable to Stable (Normal Bump)

**Initial State:** `1.4.1` (stable)

**Action:** Create release with:
- `version_bump`: `patch`
- `is_prerelease`: `false`

**Expected Result:** `1.4.2`

**Validation:**
- ✅ Version increments normally
- ✅ No beta suffix
- ✅ Creates stable release
- ✅ Updates `latest.json`

---

### Scenario 8: Multiple Betas Across Versions

**Test Sequence:**

1. Start: `1.4.0` (stable)
2. Create `1.4.1b1` (first beta for patch)
3. Create `1.4.1b2` (increment beta)
4. Finalize to `1.4.1` (stable)
5. Create `1.5.0b1` (first beta for minor)
6. Create `1.5.0b2` (increment beta)
7. Create `1.5.0b3` (increment beta)
8. Finalize to `1.5.0` (stable)

**Validation:**
- ✅ Each beta sequence maintains base version
- ✅ Beta numbers reset when changing base version
- ✅ Stable releases update `latest.json`
- ✅ Beta releases skip `latest.json`

---

## Edge Cases

### Edge Case 1: Beta to New Beta (Different Base)

**Initial State:** `1.4.1b3` (beta)

**Action:** Create release with:
- `version_bump`: `minor`
- `is_prerelease`: `true`

**Expected Result:** `1.5.0b1`

**Notes:**
- This creates a new beta series
- Previous beta series abandoned
- Common when pivoting to different feature scope

---

### Edge Case 2: Beta with Large Numbers

**Initial State:** `1.4.1b99` (beta)

**Action:** Create release with `is_prerelease: true`

**Expected Result:** `1.4.1b100`

**Validation:**
- ✅ No overflow issues
- ✅ Regex correctly parses large beta numbers

---

### Edge Case 3: Tag Already Exists

**Scenario:** Workflow creates tag, then reruns

**Expected Behavior:**
- ✅ GitHub release creation detects existing tag
- ✅ Logs "Release already exists" message
- ✅ Continues with S3/DynamoDB updates
- ✅ No error thrown

---

## Validation Checklist

For each test scenario, validate:

### Git Operations
- [ ] Version in `package.json` matches expected
- [ ] Version in `package-lock.json` matches expected
- [ ] Git tag created with format `v{version}`
- [ ] Commit message: `chore: bump version to {version}`

### GitHub Release
- [ ] Release created with correct version
- [ ] Release marked as prerelease if beta
- [ ] Release notes auto-generated
- [ ] Archive asset uploaded

### Distribution (S3)
- [ ] Archive uploaded to S3 at correct path
- [ ] `latest.json` updated only for stable releases
- [ ] `latest.json` skipped for beta releases

### DynamoDB
- [ ] Item created with correct version
- [ ] `isPrerelease` boolean set correctly
- [ ] SHA256 checksum stored
- [ ] File size recorded

---

## Manual Testing Commands

### Test Version Calculation Locally

```bash
# Test stable to beta (patch)
CURRENT_VERSION="1.4.0"
IS_PRERELEASE="true"
VERSION_BUMP="patch"
# Expected: 1.4.1b1

# Test beta to beta
CURRENT_VERSION="1.4.1b1"
IS_PRERELEASE="true"
VERSION_BUMP="patch"  # ignored
# Expected: 1.4.1b2

# Test beta to stable
CURRENT_VERSION="1.4.1b2"
IS_PRERELEASE="false"
VERSION_BUMP="patch"  # ignored
# Expected: 1.4.1
```

### Extract Version Components

```bash
# Extract base version from beta
echo "1.4.1b5" | sed 's/b[0-9]*$//'
# Output: 1.4.1

# Extract beta number
echo "1.4.1b5" | grep -oE 'b[0-9]+$' | sed 's/b//'
# Output: 5

# Check if version is beta
if [[ "1.4.1b5" =~ b[0-9]+$ ]]; then
  echo "Is beta"
fi
```

---

## Automated Testing

### GitHub Actions Test Matrix

Create a test workflow to validate all scenarios:

```yaml
name: Test Release Versioning
on:
  workflow_dispatch:
    inputs:
      test_scenario:
        type: choice
        options:
          - stable_to_beta_patch
          - stable_to_beta_minor
          - stable_to_beta_major
          - beta_to_beta
          - beta_to_stable
          - stable_to_stable

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Test version calculation
        run: |
          # Load test scenario
          # Run version calculation logic
          # Assert expected output
```

---

## Regression Tests

After implementing workflow changes, verify:

1. **No Code Changes Required:**
   - [ ] No TypeScript source files modified
   - [ ] No test files modified
   - [ ] Only workflow YAML changed

2. **Quality Maintained:**
   - [ ] All ESLint checks pass
   - [ ] All tests pass (400 tests)
   - [ ] Code coverage meets thresholds (70% lines, 79% functions)

3. **Existing Workflows Unaffected:**
   - [ ] CI workflow still runs on PRs
   - [ ] Status checks still validate
   - [ ] Contract tests still work

---

## Known Issues

### Node.js v25 Local Storage

**Issue:** Tests fail with `SecurityError: Cannot initialize local storage without a --localstorage-file path`

**Workaround:** Run tests with:
```bash
node --localstorage-file=/tmp/jest-localstorage node_modules/.bin/jest
```

**Status:** This is a Node.js v25 security restriction when running MCP SDK. Does not affect CI (uses Node 20) or production usage.

---

## Success Criteria

The workflow is validated when:

1. ✅ All test scenarios produce expected versions
2. ✅ Prerelease flag set correctly in GitHub
3. ✅ `latest.json` only updated for stable releases
4. ✅ DynamoDB records accurate prerelease status
5. ✅ Archive naming matches version exactly
6. ✅ No regression in existing functionality
7. ✅ All tests pass with proper coverage

---

## References

- Main workflow: [`.github/workflows/release.yml`](./release.yml)
- Version detection: Lines 62-72
- Beta increment logic: Lines 80-130
- Prerelease check: Lines 165-174
- Distribution logic: Lines 294-317

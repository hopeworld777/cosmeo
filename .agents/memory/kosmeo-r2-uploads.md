---
name: R2 upload signature failures
description: Two independent causes of "signature does not match" errors when uploading to Cloudflare R2 via @aws-sdk/client-s3 in this project.
---

Uploads to R2 (`server/r2.js`, used by `server/routes/upload.js` and `auth.js`
avatar upload) failed with `The request signature we calculated does not
match the signature you provided` after pulling in remote changes.

**Root cause found this time:** `R2_SECRET_ACCESS_KEY` (and other R2_* env
secrets) had trailing whitespace (likely from copy/paste when the secret was
set). Any whitespace in a SigV4 credential silently breaks the signature —
AWS/R2 give no hint the credential itself is malformed, just a generic
mismatch error.

**Why:** Env var values pasted from a UI or terminal frequently pick up a
trailing newline/space; Node reads it verbatim and it becomes part of the
signing key.

**How to apply:** `server/r2.js` now `.trim()`s all four R2_* env vars before
constructing the `S3Client` — keep that trim in place. If a future signature
error appears despite valid-looking secrets, verify with a minimal
`HeadBucketCommand` call outside the app to isolate credential vs. app-code
issues before assuming it's a code bug.

**Secondary/unrelated finding also applied defensively:** newer
`@aws-sdk/client-s3` versions (>=3.729-ish) default to adding a request
checksum header that R2 doesn't validate the same way as AWS S3, which can
independently cause similar signature errors. `requestChecksumCalculation:
"WHEN_REQUIRED"` and `responseChecksumValidation: "WHEN_REQUIRED"` are set on
the `S3Client` config as a defensive measure, though the whitespace was the
actual fix in this case.

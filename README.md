# TaskMaster-API

REST API with a background worker, used as a lab target for software supply chain
security (SCA, DAST) and configuration hardening. This fork has been remediated:
dependencies upgraded, runtimes moved off end-of-life versions, containers run as
non-root, and a GitHub Actions security gate is in place.

> The `LEGACY_NOTES.md` file in `docs/` describes the original, intentionally outdated versions.

## Architecture

| Component | Stack                          | Path      |
| --------- | ------------------------------ | --------- |
| REST API  | Node.js 24 / Express 4.22      | `api/`    |
| Worker    | Python 3.12 / Flask 3.1        | `worker/` |
| Datastore | MongoDB 7.0 (docker compose)   | -         |

The API accepts tasks (`/tasks`) and hands reminder/report jobs to the worker
(`/jobs`), which renders templates and posts to a webhook.

## Quick start

```
docker compose up --build
curl http://localhost:8080/health      # API (container port 3000)
curl http://localhost:5000/health      # worker
```

## Security pipeline

`.github/workflows/devsecops-pipeline.yml` ("DevSecOps Security Delivery Gate") runs on
push and pull requests to `main`:

1. **Software Supply Chain Analysis**: Snyk (npm and pip) and OWASP Dependency-Check.
   The build fails on High/Critical findings.
2. **DAST Runtime Verification**: builds the stack with Docker Compose and runs an
   OWASP ZAP baseline scan against `http://localhost:8080`.

## Hardening applied

- Direct npm and pip dependencies upgraded; transitive `qs` forced via npm `overrides`.
- `helmet` security headers, `X-Powered-By` disabled.
- API and worker containers run as a non-root user; `npm ci` with a lockfile.
- Runtimes moved from Node 8 / Python 3.6 / MongoDB 3.6 to supported versions.
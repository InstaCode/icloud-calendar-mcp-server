# Security Policy

## Reporting a Vulnerability

This project handles iCloud credentials (app-specific passwords) and accesses calendar data via CalDAV. If you discover a security issue, **please do not open a public GitHub issue**.

Instead, report it privately to **jason@instacode.io**, or use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) on this repository.

Please include:

- A description of the issue and its impact
- Steps to reproduce
- Affected version(s)

You can expect an initial response within a few days. Coordinated disclosure is appreciated — I'll work with you on a fix and disclosure timeline before any public advisory.

## Scope

In scope:

- Credential handling (env vars, logs, error messages)
- CalDAV request construction and response parsing
- Any code path that could leak calendar data or credentials to a third party
- Dependency vulnerabilities with a realistic exploitation path through this server

Out of scope:

- Vulnerabilities in iCloud / CalDAV itself (report to Apple)
- Issues requiring a compromised local machine or already-leaked credentials

## Credential Hygiene Reminders for Users

- Always use an [app-specific password](https://support.apple.com/en-us/102654), never your main Apple ID password.
- Revoke the app-specific password immediately at <https://appleid.apple.com> if you suspect it's been exposed.
- Don't commit `.env` files. The included `.gitignore` excludes them by default.

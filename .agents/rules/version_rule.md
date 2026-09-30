# Versioning Rule

1. **Automatic Versioning Requirement:** 
   Every time the code is updated, the system must automatically run and handle versioning logic.
   - For the first 10 runs/updates, the version should be displayed as **V.1**.
   - If it exceeds 10 runs, the version format must automatically change to **V2.[DD]/[MM]/[YYYY]** (using the current date).

2. **Local Testing Requirement:** 
   Every time a code task is completed, the agent MUST provide a local test link (e.g., localhost) for the user to test the changes BEFORE deploying to Cloudflare D1.

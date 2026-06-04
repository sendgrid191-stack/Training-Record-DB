# Security Specification & Threat Model for TrainingDB V1

This document outlines the zero-trust security configuration, data invariants, and mock penetration test vectors ("Dirty Dozen") for the Firestore database.

## 1. Core Data Invariants

1. **Administrative Access Boundary**: Only authentic, authenticated administrators with verified email addresses registered in the `/admins` collection or matching the bootstrapped admin email address (`ullahikram307@gmail.com`) can perform any mutation on `/records`, `/batches`, and `/admins`.
2. **Immutable Timestamps**: Record and Batch timestamp values (`uploadedAt`) cannot be falsified on creation or modified during updates; they must strictly align with the server transaction timestamp (`request.time`).
3. **Boundary Controls**: 
   - `hours` must be a positive, non-zero numeric value `<= 100`.
   - `employeeId` and `employeeName` must not contain excessive characters (capped at `128` characters to guard against Denial of Wallet).
   - `status` must be restricted to standard enum boundaries (`Completed`, `Pending`, `Expired`).

---

## 2. The "Dirty Dozen" Attack Payloads

Below are twelve high-risk target payloads crafted by an adversary attempting to bypass application security. All listed operations must return `PERMISSION_DENIED`.

### Attack 1: Self-Assigned Administrative Elevation
*   **Path**: `/admins/attacker_uid`
*   **Payload**: `{"email": "malicious_actor@domain.com"}`
*   **Vector**: Target writes directly to `/admins` sub-tree without prior authorization.

### Attack 2: Spoofed Identity Record Creation
*   **Path**: `/records/tr_spoof_1`
*   **Payload**: `{"employeeId": "EMP999", "employeeName": "Impostor", "hours": 5, "status": "Completed"}` (sent by unauthenticated user)
*   **Vector**: Injection of compliance data from an anonymous, unauthenticated client.

### Attack 3: Resource Poisoning via Infinite Note Fields (DeDoS)
*   **Path**: `/records/tr_dedos_1`
*   **Payload**: `{"employeeId": "EMP01", "employeeName": "Jane", "trainingTitle": "Security", "hours": 4, "status": "Completed", "notes": "<1MB of repetitive junk padding...>"}`
*   **Vector**: Attempting to bloat the database index size and trigger billing spikes.

### Attack 4: Key Inject Poisoning (ID characters)
*   **Path**: `/records/tr_$$$___$$$`
*   **Payload**: `{"employeeId": "EMP01", "employeeName": "Jane", "trainingTitle": "Security", "hours": 4, "status": "Completed"}`
*   **Vector**: Sending non-alphanumeric, overly long characters into Document ID strings to break queries.

### Attack 5: Time Splicing (Falsified Audit Timestamps)
*   **Path**: `/records/tr_time_1`
*   **Payload**: `{"employeeId": "EMP01", "employeeName": "Jane", "trainingTitle": "Security", "hours": 4, "status": "Completed", "uploadedAt": "1999-12-31 23:59:59"}`
*   **Vector**: Backdating safety and compliance certifications to circumvent legal expiry checks.

### Attack 6: Contradictory Compliance Status Validation
*   **Path**: `/records/tr_status_1`
*   **Payload**: `{"employeeId": "EMP01", "employeeName": "Jane", "trainingTitle": "Security", "hours": 4, "status": "BypassedCompliance"}`
*   **Vector**: Setting unvetted compliance statuses outside strict enums.

### Attack 7: Negative Credit Hours Exploitation
*   **Path**: `/records/tr_neg_1`
*   **Payload**: `{"employeeId": "EMP01", "employeeName": "Jane", "trainingTitle": "Security", "hours": -12.5, "status": "Completed"}`
*   **Vector**: Injecting negative metrics to break sum aggregations of training history.

### Attack 8: Administrative Emulation via Unverified Email Account
*   **Path**: `/records/tr_unverified_1`
*   **Payload**: `{"employeeId": "EMP01", "employeeName": "Jane", "trainingTitle": "Security", "hours": 1.5, "status": "Completed"}` (sent from standard sign-in but with `email_verified: false`)
*   **Vector**: Identity spoofing with fake domain domains.

### Attack 9: Implicit Schema Modification (Shadow Updating)
*   **Path**: `/records/tr-existing`
*   **Payload**: `{"isCompliantVerified": true, "hours": 99}`
*   **Vector**: Appending arbitrary flags ("Ghost fields") to override compliance state.

### Attack 10: Unauthorized Batch Ingestion
*   **Path**: `/batches/batch_evil_1`
*   **Payload**: `{"filename": "totally_safe_exec.exe", "recordsCount": 100000, "status": "Success"}`
*   **Vector**: Falsifying bulk processing history to hide unauthorized bulk writes.

### Attack 11: Blanket Database Reading
*   **Query**: `db.collection('records').get()` as Guest
*   **Vector**: Data exfiltration of employee names, department affiliations, and training scores.

### Attack 12: Admin User Purging
*   **Action**: `delete` on `/admins/super_admin` by normal user.
*   **Vector**: Administrative lockout via deletion of active credentials.

---

## 3. Mock Test Specification (firestore.rules.test.ts)

Below is the verification model framework to confirm absolute compliance on local tests.

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('TrainingDB Security Core Spec', () => {
  it('rejects unauthenticated document writes', async () => {
    const db = (await initializeTestEnvironment({ projectId: "gen-lang-client-0336293679" })).unauthenticatedContext().firestore();
    await assertFails(db.collection('records').add({
      employeeId: 'EMP001',
      employeeName: 'Sarah Jenkins',
      hours: 5.5
    }));
  });

  it('allows verified admin to perform operational actions', async () => {
    const db = (await initializeTestEnvironment({ projectId: "gen-lang-client-0336293679" })).authenticatedContext('ullahikram307', {
      email: 'ullahikram307@gmail.com',
      email_verified: true
    }).firestore();
    
    // Admin write is permitted
    await assertSucceeds(db.collection('admins').doc('ullahikram307').set({
      email: 'ullahikram307@gmail.com'
    }));
  });
});
```

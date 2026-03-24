# FE Flow Updates - 2026-03-25

## Purpose

This document summarizes the Frontend flow changes completed today. It is written as a presentation-ready handoff note, with emphasis on:

- the guest-request/session bug fixed in commit `e80d0dac0f8dece8cacefc2d7eb503e4d62d8ce8`,
- the Coordinator auto-priority verification flow changed in commit `091790bb8c7c35128766127bd82bd5816f61ecc0`,
- the forgot-password flow introduced in commit `b5d560c0dff2b97ec4526de99d702e780712c02e` and refined afterward,
- the complete FE flow around the `Report Safe` / completion button that started from commit `2a088488834b63441ddaaa6a5f5941f885845c3e` and was refined later.

This README only describes the FE side, but it explicitly states which APIs are called and what each screen does with the response.

---

## 1. Guest Request Context Bug Fix

### Commit

- `e80d0dac0f8dece8cacefc2d7eb503e4d62d8ce8`

### Business Problem

There was a cross-session bug in the same browser tab:

1. Guest user A created a rescue request with phone number A.
2. In the same tab, the user logged in as another account B.
3. FE correctly hid guest A's request while B was logged in.
4. But after logout, the guest request of A disappeared completely.

This was a UX problem because the tab lost the original guest tracking context.

### Root Cause

FE stores guest request tracking in `localStorage`:

- `guestRescueRequestTracking`
- `guestRescueRequestDetails`

Before the fix, login removed those keys from `localStorage` directly. That prevented account B from seeing the guest request, but it also destroyed the guest session context permanently.

### FE Solution

`authService.js` was updated to preserve and restore guest request context:

- `preserveGuestRequestContextForLogout()`
- `restoreGuestRequestContextAfterLogout()`

### Technical Flow

#### Guest request creation

When a guest creates a rescue request:

- FE calls `POST /api/RescueRequest`
- service: `rescueRequestService.createRescueRequest(formData)`
- on success, FE stores:
  - `guestRescueRequestTracking`
  - `guestRescueRequestDetails`

#### When the user logs in

Flow:

1. `Login.jsx` submits through `authService.login(phone, password)`.
2. `authService.login(...)` now calls `preserveGuestRequestContextForLogout()` before storing the authenticated session.
3. That function:
   - copies guest tracking/details from `localStorage` into `sessionStorage` backup keys,
   - removes guest keys from `localStorage`.
4. After that, the dashboard no longer resolves the guest request in the authenticated session.

Result:

- account B does not see guest A's request,
- but the guest data is still safely preserved for later restoration.

#### When the authenticated user logs out

Flow:

1. FE calls `authService.logout()`.
2. `logout()` clears:
   - `accessToken`
   - `refreshToken`
   - `user`
3. Then it calls `restoreGuestRequestContextAfterLogout()`.
4. That function restores guest tracking/details from `sessionStorage` back into `localStorage`.

Result:

- after logout in the same tab, the original guest request of user A is visible again.

### Files Involved

- `src/services/authService.js`
- `src/components/Dashboard.jsx`
- `src/services/rescueRequestService.js`

### Presentation Summary

The FE now isolates authenticated user state from guest request state without losing the guest request after logout. This solves the “same tab, different identity” problem cleanly.

---

## 2. Coordinator Auto-Priority Verification Flow

### Commit

- `091790bb8c7c35128766127bd82bd5816f61ecc0`

### Business Change

The old Coordinator flow required the user to manually choose a priority before verifying a request.

The new BE flow sets priority automatically. FE therefore needed to remove the manual priority-selection step and use the new verification API directly.

### Old FE Behavior

Old FE flow:

1. Coordinator clicked `Verify`.
2. FE switched the row into an edit mode.
3. FE displayed a priority dropdown.
4. Coordinator selected a priority.
5. FE called:

`PUT /api/RescueRequest/{id}/set-priority-and-verify`

with payload containing:

```json
{
  "status": "Verified",
  "priorityLevelId": 1
}
```

### New FE Behavior

New FE flow:

1. Coordinator clicks `Verify`.
2. FE sends the request immediately, without any priority dropdown.
3. FE calls:

`PUT /api/RescueRequest/{id}/verify`

via:

- `coordinatorService.verifyRequest(requestId)`

### What Changed in the UI

#### Coordinator request list

In `CoordinatorRequestsPage.jsx`:

- the priority dropdown was removed,
- the temporary verify edit mode was removed,
- the button label is always just `Verify`,
- after success, FE shows a message saying that priority was assigned automatically by the system.

#### Coordinator dashboard summary

The `Confirmed` state is no longer treated as its own active column in FE.

To remain backward-compatible with old data:

- `CONFIRMED` is normalized into `ASSIGNED`

This affects:

- request list filters,
- status badges,
- dashboard chart counts.

### API Flow

#### Read side

FE still loads request data from:

- `GET /api/RescueRequest`

The response already contains the assigned priority label returned by BE.

#### Action side

FE now verifies a request by calling only:

- `PUT /api/RescueRequest/{id}/verify`

No FE-managed priority payload is needed anymore.

### Files Involved

- `src/pages/CoordinatorRequestsPage.jsx`
- `src/pages/CoordinatorDashboardPage.jsx`
- `src/services/coordinatorService.js`
- `src/components/Dashboard.jsx`
- `src/components/ViewRequest.jsx`

### Presentation Summary

The FE was simplified to match the new business rule:

- verification is now a single action,
- priority is determined automatically by the backend,
- legacy `Confirmed` data is still displayed safely by mapping it into `Assigned`.

---

## 3. Forgot Password Flow

### Main Commit

- `b5d560c0dff2b97ec4526de99d702e780712c02e`

### Current FE Goal

Build a simple, demo-friendly forgot-password flow using a mock OTP, while keeping the route structure and API integration clear enough for later production replacement.

### APIs Used

#### Request OTP

- `POST /api/Auth/forgot-password/send-otp`

Payload:

```json
{
  "phone": "0912345678"
}
```

#### Reset password

- `POST /api/Auth/forgot-password/reset-password`

Payload:

```json
{
  "phone": "0912345678",
  "otp": "123456",
  "newPassword": "newPassword123"
}
```

### Route Structure

The flow is intentionally split into two pages:

- `/forgot-password`
- `/reset-password`

Configured in:

- `src/App.jsx`

### End-to-End FE Flow

#### Step 1: User opens Login and clicks Forgot Password

In `Login.jsx`:

- the secondary button `Forgot password?` calls `onShowForgotPassword()`
- page navigation sends the user to `/forgot-password`

#### Step 2: `/forgot-password` renders the phone input screen

`ForgotPasswordPage.jsx` renders:

- `ForgotPassword`

The component starts in:

- `step = 'request'`

Screen behavior:

- shows only the phone field,
- validates phone on blur,
- uses the same Vietnamese phone validation pattern as the rescue request flow,
- clears any old reset context on mount:
  - `authService.clearForgotPasswordResetContext()`

#### Step 3: User requests OTP

On submit:

- component calls `authService.sendForgotPasswordOtp(phone)`
- service sends:
  - `POST /api/Auth/forgot-password/send-otp`

On success, FE:

- switches from `request` to `verify`,
- stores `submittedPhone`,
- clears the OTP field,
- starts a resend cooldown:
  - 30 seconds
- starts OTP expiry countdown:
  - 10 minutes

#### Step 4: OTP verification screen

In the OTP screen:

- the phone input is hidden,
- the entered phone is shown in the info message,
- OTP input is shown,
- `Resend OTP` is shown beside the OTP field,
- FE shows a local demo hint:
  - current OTP for local/demo is `123456`

The screen also shows:

- a live `10:00` countdown,
- and after expiry:
  - `OTP has expired. Please request a new code.`

#### Step 5: Resend OTP

When the user clicks `Resend OTP`:

- FE calls the same API again:
  - `POST /api/Auth/forgot-password/send-otp`
- the button is disabled while the 30-second cooldown is active
- the button label shows:
  - `Resend OTP (30s)`

#### Step 6: FE verifies OTP locally for demo flow

When the user clicks `Confirm OTP`:

1. FE validates the OTP field.
2. FE checks if OTP is expired.
3. FE compares the entered value with the mock code:
   - `123456`
4. If invalid:
   - FE shows a business error on the page.
5. If valid:
   - FE waits about 3 seconds,
   - stores the verified reset context in `sessionStorage` using:
     - `authService.storeForgotPasswordResetContext(phone, otp)`
   - navigates to:
     - `/reset-password`

This 3-second delay was intentionally added to simulate a real verification step and make the transition feel less abrupt during demos.

#### Step 7: `/reset-password` guards access using session context

`ResetPasswordPage.jsx`:

1. reads the stored context using:
   - `authService.getForgotPasswordResetContext()`
2. if no valid context exists:
   - redirects back to `/forgot-password`
3. otherwise renders `ResetPassword`

This prevents direct navigation to `/reset-password` without completing the OTP step first.

#### Step 8: User enters the new password

`ResetPassword.jsx` renders:

- new password field,
- confirm password field

Validation:

- password must be 5 to 100 characters,
- confirm password must match,
- validation is shown on blur and on submit.

#### Step 9: FE calls reset-password API

On submit:

- FE calls `authService.resetForgotPassword(phone, otp, newPassword)`
- service sends:
  - `POST /api/Auth/forgot-password/reset-password`

On success:

- FE clears reset context from `sessionStorage`,
- switches the screen into success mode,
- shows the title:
  - `Đổi mật khẩu thành công!`
- starts a 5-second countdown,
- auto-redirects back to `/login`

The success screen also keeps a direct button:

- `Back to Login (5s)`

### Why the Flow Was Split

The split into `/forgot-password` and `/reset-password` makes the flow easier to explain and maintain:

- page 1 handles OTP request and OTP verification,
- page 2 handles password update only,
- session storage bridges the two steps safely,
- direct route access to reset is blocked without OTP context.

### Files Involved

- `src/App.jsx`
- `src/components/Login.jsx`
- `src/components/ForgotPassword.jsx`
- `src/components/ResetPassword.jsx`
- `src/pages/ForgotPasswordPage.jsx`
- `src/pages/ResetPasswordPage.jsx`
- `src/services/authService.js`

### Presentation Summary

The forgot-password FE flow is now a complete 2-step route-based flow:

1. request OTP,
2. verify OTP,
3. store temporary verified context,
4. go to reset page,
5. submit the new password,
6. return to login automatically.

It is intentionally demo-friendly, but the FE is already structured in a way that can be upgraded to a real OTP provider later.

---

## 4. Report Safe / Completed Button Flow

### Starting Commit

- `2a088488834b63441ddaaa6a5f5941f885845c3e`

### Business Goal

The FE needed to support the new completion rule:

1. Rescue Team marks the mission as completed.
2. The request itself is still not closed yet.
3. Citizen or Guest must explicitly confirm that they are safe.
4. Only then is the request finalized.

### APIs Used by This FE Flow

#### Request retrieval

- `GET /api/RescueRequest/my-requests`
- `GET /api/RescueRequest/my-latest-request`
- `GET /api/RescueRequest/{id}`
- `GET /api/RescueRequest/guest/status`

These APIs return a computed field:

- `CanReportSafe`

#### Safe confirmation actions

Citizen:

- `PUT /api/RescueRequest/{id}/confirm-rescued`

Guest:

- `PUT /api/RescueRequest/guest/{id}/confirm-rescued`

Payload:

```json
{
  "phone": "0912345678"
}
```

### FE Read Flow

#### Dashboard load

`Dashboard.jsx` loads the latest request differently based on identity:

##### Authenticated citizen

- FE calls `rescueRequestService.getMyRequests()`
- service calls:
  - `GET /api/RescueRequest/my-requests`

##### Guest

- FE calls `rescueRequestService.getTrackedGuestRequestStatus()`
- service:
  1. reads tracking info from `localStorage`,
  2. calls:
     - `GET /api/RescueRequest/guest/status`
  3. merges API data with locally cached guest details.

The request is normalized through:

- `rescueRequestService.toRequestFormData()`

That mapping carries the BE field:

- `canReportSafe`

### FE Dashboard Behavior

When the latest request satisfies:

- `status === Assigned`
- `canReportSafe === true`

the dashboard changes visibly:

1. the main button switches from normal `Create Request` style into a green “ready” state,
2. the `View Request` button shows a red unread-style dot,
3. a floating notice appears,
4. that notice includes a direct `Report Safe` action.

This gives the citizen a very clear signal that the rescue team has finished and the final user action is now available.

### FE View Request Behavior

`ViewRequest.jsx` also loads the request based on identity:

##### Citizen

- `GET /api/RescueRequest/{id}`

##### Guest

- `GET /api/RescueRequest/guest/status`

In the modal:

- `Report Safe` is always part of the action area,
- but it is enabled only when:
  - `canReportSafe === true`
  - and the request status is still `Assigned`

The modal also shows the team-completion prompt when this condition is met.

### FE Write Flow When User Clicks Report Safe

#### Citizen branch

If the user is logged in as `CITIZEN`:

- FE calls `rescueRequestService.confirmRescued(requestId)`
- service sends:
  - `PUT /api/RescueRequest/{id}/confirm-rescued`

#### Guest branch

If the user is not authenticated:

- FE calls `rescueRequestService.confirmRescuedAsGuest(requestId, phone)`
- service sends:
  - `PUT /api/RescueRequest/guest/{id}/confirm-rescued`

with the guest phone number in the body.

### FE Refresh After Success

After the API succeeds:

- FE reloads request details,
- `canReportSafe` becomes `false`,
- the success message is shown,
- the floating notice disappears,
- the red dot disappears,
- the green state on the main button disappears,
- the request becomes terminal (`Completed`),
- the main button returns to normal `Create Request` behavior for future requests.

### Current UX Refinements Added on Top of the Base Flow

The flow that started in `2a088...` was later refined so that:

- the dashboard notice and the modal button trigger the same report-safe flow,
- the request form and view-request layout are aligned,
- the view-request modal now uses the same left/right layout as the create-request form:
  - left side: phone, location, map, address
  - right side: people counts, conditions, notes

This makes the “view and confirm” step visually consistent with the original form the user already knows.

### Files Involved

- `src/components/Dashboard.jsx`
- `src/components/Dashboard.css`
- `src/components/ViewRequest.jsx`
- `src/components/ViewRequest.css`
- `src/components/RequestForm.jsx`
- `src/components/RequestForm.css`
- `src/services/rescueRequestService.js`

### Presentation Summary

This FE flow turns the final completion into a user-confirmed process:

1. Rescue Team completes its mission.
2. FE detects `CanReportSafe`.
3. Dashboard and View Request both expose `Report Safe`.
4. Citizen or Guest confirms safety through the correct API branch.
5. FE refreshes the request and returns the UI to a normal post-completion state.

---

## 5. Overall Talking Points for Presentation

### What was improved today

1. Guest request state now survives login/logout correctly in the same tab.
2. Coordinator verification now follows the new backend rule where priority is assigned automatically.
3. Forgot-password became a complete multi-step routed flow instead of a single mixed screen.
4. The rescue completion flow is now user-centered:
   - team finishes mission first,
   - citizen/guest closes the request second.

### Why these changes matter

- They reduce ambiguity in the UI.
- They align FE tightly with the updated BE APIs.
- They remove inconsistent states that previously confused users.
- They make the system easier to explain in a thesis/demo setting because each step now has a clear actor and a clear API call.

### Final FE Design Principle Used Across All Changes

For every flow changed today, the FE now follows the same pattern:

1. call the API,
2. normalize the response,
3. store only the minimum local context needed,
4. reflect the business state clearly in the UI,
5. avoid hidden transitions that the user cannot understand.

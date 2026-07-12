# Wedding Platform System Manual

## Access

Default accounts created by the current seed/bootstrap logic:

| Role | Username | Password | Purpose |
| --- | --- | --- | --- |
| Admin | `admin` | `admin2026` | Full dashboard access |
| Guard | `guard` | `guard2026` | Entrance scanner access |

Session behavior:

- Login is token-based.
- Sessions last 7 days unless logged out.
- Admin is allowed to access guard and moderation-protected functions.

## Main URLs

- Landing page: `/`
- Personal invitation: `/i/<invitation-token>`
- Arabic invitation: `/i/<invitation-token>?lang=ar`
- Admin dashboard: `/admin`
- Guard scanner: `/scanner`
- Live wall display: `/wall`
- Table page: `/t/<table-token>`
- After-wedding archive: `/memories`

## Current Operational Mode

Current intended setup in code:

- Table functionality is off unless manually enabled in admin settings.
- Auto-approve is enabled by default so uploads and wishes can appear on the live wall without waiting for moderation.

When tables are off:

- guests are not assigned to tables
- invitation pages do not show table names
- table QR pages are not part of the active guest flow
- turning the setting off clears existing invitation table assignments

## Roles And Responsibilities

### Admin

The admin uses `/admin` to:

- manage guests and invitations
- share invitation links
- view RSVP and attendance metrics
- export attendance CSV
- moderate uploads and guestbook messages
- configure event behavior
- edit the invitation card design and copy
- switch the event into archive mode after the wedding
- access the scanner and live wall when needed
- perform guard-level check-ins if the guard is unavailable
- access moderation-protected review screens

### Guard

The guard uses `/scanner` to:

- scan guest QR codes
- resolve invitation validity
- check in arriving guests
- handle extra-guest override cases with a note
- review the most recent check-ins

Admin can use the same scanner flow if the guard is unavailable.

### Guest

The guest uses the personal invitation link to:

- view the invitation
- RSVP
- access their entrance pass after confirmation
- upload memories
- write a guestbook wish
- copy the CliQ alias
- open directions
- add the event to calendar

## End-To-End Flow

### 1. Admin setup

1. Open `/admin`.
2. Login with `admin / admin2026`.
3. Review the overview metrics.
4. Go to `Settings`.
5. Confirm:
   - event is `live`
   - `Table assignments and table QR pages` is off for now
   - `Auto-approve new uploads and messages` is on
6. Edit welcome text, thank-you text, and invitation card content if needed.

### 2. Guest creation and sharing

In `Guests & RSVP`:

- add guest/family manually
- or import CSV with columns:

```csv
name,phone,seats
Ahmad Family,+962790000001,4
Sara & Omar,+962790000002,2
```

For each invitation the system creates a unique tokenized link.

Admin can share:

- English invitation link
- Arabic invitation link
- WhatsApp message in either language

### 3. Guest invitation flow

Guest opens `/i/<token>`.

The invitation currently supports:

- envelope opening experience
- bilingual English/Arabic view
- editable invitation sections
- venue details
- map directions
- calendar export
- countdown
- RSVP
- CliQ / Nuqoot section

If the link is invalid or cancelled, the guest sees an invalid invitation screen.

### 4. RSVP flow

Guest can:

- confirm attendance
- decline
- choose attending count if more than one seat is allowed
- later change their response

Rules:

- confirmed count cannot exceed the invitation allowed count
- decline records zero attending guests

### 5. Confirmed guest flow

After RSVP is confirmed:

- the bottom navigation appears
- the guest is taken to the `Pass` screen automatically
- on future visits to the same link, the confirmed guest still gets bottom navigation

Bottom navigation screens:

- `Invite`
- `Pass`
- `Memories`
- `Guestbook`

### 6. Entrance pass flow

On the `Pass` screen the guest sees:

- guest name
- entrance QR code
- confirmed guest count

The QR image is generated from:

- `/api/qr/invite/<token>`

At the hall entrance:

1. guest shows the QR from the invitation link
2. guard scans it in `/scanner`
3. scanner validates invitation status
4. guard records how many guests are entering now
5. if arriving count exceeds remaining capacity, scanner requires an override note and accepts an optional reason for escalation

Possible scanner resolution states:

- `valid`
- `full`
- `cancelled`
- `invalid`

## Live Wall Flow

### What the live wall is

`/wall` is a display page for a TV, projector, or dedicated screen.

It currently:

- rotates content automatically like a slider
- polls for fresh content automatically
- shows approved photos
- shows approved text guestbook wishes
- offers a fullscreen button in the page UI

It does not currently display:

- voice notes
- videos in the wall rotation UI

### How guests add content to the live wall

Guests do not upload content from `/wall`.

Current active guest entry points are on the personal invitation link after RSVP confirmation:

#### `Memories`

Guests upload:

- photo
- short video

This content is intended for the live wall.

#### `Guestbook`

Guests submit:

- a written wish/message

This text can also appear on the live wall.

### Table entry point

There is also a table page flow in code:

- `/t/<table-token>`

It allows:

- photo/video upload
- text wish
- voice note
- simple program view

This exists in the system, but because table mode is currently off, it is not part of the active guest flow.

### Approval behavior

Right now auto-approve is enabled by default/current bootstrap behavior, so new guest submissions are intended to show on the live wall without waiting for manual moderation.

If auto-approve is later turned off:

- uploads and messages go into moderation first
- they appear on the live wall only after approval

## Admin Dashboard Features

### Overview

Shows:

- total invitations
- confirmed, declined, pending RSVP counts
- expected guests
- invited seats
- checked in guests
- override guests
- pending moderation count
- total uploads
- total messages
- recent check-in audit log

### Guests & RSVP

Allows:

- add guest/family
- import CSV
- export attendance CSV
- edit guest seat count
- edit RSVP state
- cancel invitations
- share invitation links

### Tables

Visible only if table mode is enabled.

Allows:

- create table
- delete table
- review assigned count per table

Current policy:

- not used in the active workflow

### Moderation

Allows review of:

- memory uploads
- guestbook messages

Statuses:

- pending
- approved
- rejected

### Settings

Allows:

- switching event mode between `live` and `archived`
- toggling table mode
- toggling auto-approve
- toggling public guestbook in archive
- editing welcome and thank-you text
- editing invitation sections order and visibility
- overriding English and Arabic invitation copy
- editing top/center/bottom invitation backgrounds
- uploading invitation background assets

## Invitation Card Editor

The invitation editor supports:

- show/hide sections
- reorder sections
- edit bilingual text overrides
- upload top/center/bottom design images
- hide individual decorative images

Blank fields fall back to built-in default wording.

## Memory Uploads And Guestbook

### From invitation link

After RSVP confirmation:

- `Memories` uploads photo/video tied to the invitation token
- `Guestbook` saves a text wish tied to the invitation token

### From table page

If table mode is enabled later:

- photo/video uploads can be tied to the table token
- text wishes can be tied to the table token
- voice notes can be tied to the table token

## Live Wall Vs Archive

### Live wall

- intended for in-event display
- auto-rotating
- visual presentation only
- shows approved photos and approved text wishes

### Archive

When event status is changed to `archived`:

- invitation links redirect guests to `/memories`
- page shows thank-you message
- approved photos
- approved videos
- approved guestbook messages if `guestbookPublic` is enabled

## Current Default Event Details

- Event: `Mohammad & Renad Wedding`
- Date: `Saturday, July 25, 2026`
- Time: `7:00 PM`
- Venue: `Tal Pine, Amman`
- Default CliQ alias: `MAGHATHE7`

## Practical Operating Sequence

1. Admin logs into `/admin`
2. Admin keeps tables disabled
3. Admin confirms auto-approve is on
4. Admin adds/imports guests
5. Admin sends personal invitation links
6. Guests RSVP from their personal links
7. Confirmed guests receive QR pass and access to memories/guestbook
8. Guard logs into `/scanner`
9. Guard scans guest QR codes at entrance
10. Guest uploads memories or writes wishes from the invitation link
11. `/wall` displays live content on a dedicated screen
12. After the wedding, admin switches the event to `archived`

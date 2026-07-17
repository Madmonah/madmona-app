---
name: linkedin-outreach
description: Run a B2B outreach campaign to named decision-makers on LinkedIn — find the actual people (name + title + company + profile URL) via Google, store them in a tracked pipeline, send connection requests through the browser, then send the real pitch once they accept. Use this skill whenever the user wants to reach a *role* at a set of companies ("marketing managers at restaurants", "CTOs at fintechs", "procurement heads at hospitals"), asks for "leads" or "contacts" or "أرقام"/"داتا" for a job title, wants to build a prospect list, or asks to send LinkedIn connection requests or DMs at any scale. Also use it when the user assumes phone numbers are obtainable from LinkedIn — a core job of this skill is to correct that assumption early and route them to a plan that actually produces contactable people.
---

# LinkedIn outreach to named decision-makers

The job is to get from *"I want to reach marketing managers at restaurants"* to *a real conversation with a real person*. LinkedIn is the only reliable public source for **who holds a role at a company**, but it is a walled garden with limits that will quietly wreck a campaign if you don't know them going in.

Most of the value of this skill is in the constraints below. They're not obvious, they're not documented anywhere the user will find, and every one of them was learned by hitting it.

## The four things that break naive plans

**1. LinkedIn will never give you a phone number.** Not the site, not Google, not any scraper. If the user asked for "أرقام" / "phone numbers" / "contact data" for a job title, tell them this *before* doing the work, not after. What you can reliably get is: **full name · exact title · company · profile URL**. That's still enough to run a campaign — see "When the user really needs a phone number" below.

**2. LinkedIn hides names from you in its own search.** Searching people on LinkedIn shows out-of-network profiles as "LinkedIn Member" with the name blanked. So don't source names from LinkedIn search. **Source them from Google instead** — Google indexed those same profiles *with* the names visible.

**3. A free account gets 5 personalized invitations per month.** Five. Total. Not per day. Once they're spent, the "Add a note" button leads to a Premium upsell and nothing else. So spend them deliberately on the highest-value targets, and send everyone else **without a note**.

**4. The note is capped at 200 characters.** A real pitch will not fit. Don't try to compress the whole value proposition into it — that produces a garbled note that reads like spam. The note's only job is to get the request accepted. The real pitch goes in a **normal message after they accept**, which is free and unlimited.

These four together imply the shape of the whole campaign: **short hook to get in → real pitch once you're in.**

## Workflow

### Step 1 — Agree on the target and the pitch

Before touching a browser, get from the user:

- **The role** (marketing manager, head of ops, ...) and **the sector** (restaurants, clinics, ...) and **the geography**.
- **The full pitch** — the message that gets sent *after* someone accepts. Ask for it; don't invent it. What does their company do, and why should this person care? Write it out and have them approve it. This is the message that actually does the selling.

Then write the **≤200-char connect note** yourself from that pitch. Keep it to: who you are, one line on what the company does, and a reason you're reaching out to *them specifically* (name their employer). A note that references their actual company gets accepted at a much higher rate than a generic one.

### Step 2 — Find the people (Google, not LinkedIn)

Use Google with a `site:` operator. The names come through even though LinkedIn hides them:

```
site:linkedin.com/in "marketing manager" (restaurant OR cafe OR "F&B") Egypt
```

Vary it to widen the net — swap in `"marketing director"`, `"brand manager"`, sector synonyms, city names. Page through results (`&start=10`, `&start=20`, ...).

To extract the profile URLs, use `read_page` with `filter: "interactive"` — the hrefs are in the accessibility tree. Note that it only returns what's currently rendered, so **scroll and re-read** to collect the whole page. (`javascript_tool` is blocked on Google search results, so don't reach for it.)

Read each result's snippet and keep the company — it's what makes the connect note land, and it's how you spot people who've *moved on* from the sector. Skip those; a marketing manager who now works at an engineering supply firm is not a lead.

### Step 3 — Store the pipeline before sending anything

Put every lead in a tracked table before the first request goes out. Mid-campaign the browser will hang, a click will land on the wrong element, and you'll lose your place — the table is what lets you recover without double-sending.

Minimum columns: `full_name`, `headline`, `company`, `linkedin_url` (unique), `location`, `connect_status` (`pending` → `sent` → `accepted` → replied, plus `skipped`), `connect_sent_at`, `message_sent_at`, `notes`.

If the user has a database, create the table there. If not, a CSV is fine. What matters is that it exists and gets updated as you go.

### Step 4 — Send the connection requests

**This is a side-effectful action taken as the user.** Confirm the target list and the note text with them before the first send, and tell them the pace you'll use.

Pace matters: LinkedIn restricts accounts that fire off requests in bursts. Stay under ~15–20/day and don't rush.

Per profile:

1. Navigate to the profile URL and wait — LinkedIn's profile header loads late and the page **reflows after you screenshot it**. If you click a coordinate from a stale screenshot you'll open the cover photo or a random link instead. Take a fresh screenshot, or use `find` to get an element ref, then click the ref.
2. Click **Connect**. On some profiles (creator mode) there's no Connect button — only **Follow**. The Connect option is hidden in the **⋯ More** menu; use `find` for "Invite <name> to connect".
3. A dialog appears: **Add a note** / **Send without a note**.
   - For a high-value target while you still have personalized invites left: Add a note → type the ≤200-char note → Send.
   - Otherwise: **Send without a note**.
4. Confirm it worked — the button becomes **Pending** and a toast says "Invitation sent". Don't mark it sent in your table until you've *seen* that.
5. Update the row.

The dialog's buttons shift vertically depending on how long the person's name is, so verify with a screenshot rather than reusing coordinates from the previous profile.

If the tab freezes (screenshot times out — LinkedIn does this), open a fresh tab and carry on. The pipeline table tells you where you were.

### Step 5 — Follow up on acceptances (this is where the campaign actually pays off)

Check `linkedin.com/mynetwork/invitation-manager/sent/` — it lists everything still pending. Anyone you sent to who is **no longer on that list** has either accepted or ignored you; their profile will show **Message** instead of Pending if they accepted.

For each acceptance, send the **full pitch** as a regular message. No character limit, no monthly quota. End with a real contact channel (phone / WhatsApp / a link) so they can move off LinkedIn.

Acceptances trickle in over days, so offer to make this a **recurring scheduled task** rather than a thing the user has to remember.

## When the user really needs a phone number

They usually do — that's why they asked. LinkedIn can't provide it, but two routes work:

- **Through the company.** Business phone numbers are public (Google Maps, the company site). Combine them with the name you found: *"مطعم X — رقمه 01xxx — مسؤول الماركتنج اسمه Y."* Asking for someone **by name** gets past the gatekeeper in a way that "can I speak to whoever does marketing" does not. If the user already has a business-contact list, join the two.
- **Through LinkedIn itself, after acceptance.** People often share their number once they're connected and interested. That's what Step 5 is for.

Be upfront that route one is the fast one.

## Reference

`references/linkedin-ui.md` — exact selectors, dialog layouts, failure modes, and the profile variants (creator-mode, out-of-network) that need special handling. Read it before the first send; it'll save you from rediscovering the UI quirks.

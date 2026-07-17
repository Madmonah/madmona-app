# LinkedIn UI — what actually happens when you drive it

Everything here was observed directly. LinkedIn's DOM is unstable and coordinate-based clicking is fragile; the patterns below are what survived contact with the real site.

## Contents
- [Sourcing names from Google](#sourcing-names-from-google)
- [The three profile variants](#the-three-profile-variants)
- [The invite dialog](#the-invite-dialog)
- [Verifying a send actually happened](#verifying-a-send-actually-happened)
- [Failure modes](#failure-modes)
- [Checking acceptances](#checking-acceptances)
- [Rate limits and account safety](#rate-limits-and-account-safety)

---

## Sourcing names from Google

LinkedIn's own people search renders out-of-network profiles as literally **"LinkedIn Member"** — the name is blanked. Filtering to 1st/2nd degree usually returns *No results found*, because the user has no network in the target sector (that's the whole reason they're prospecting).

Google, however, indexed those same profiles **with names intact**. So:

```
site:linkedin.com/in "<title>" (<sector synonyms>) <country>
```

Paginate with `&start=10`, `&start=20`, … Each result gives you name, current title, and current company in the snippet — enough to write a personalized note and to filter out people who've left the sector.

**Extracting the URLs:** `javascript_tool` returns `[BLOCKED: Cookie/query string data]` on Google SERPs. Use `read_page` with `filter: "interactive"` instead — profile hrefs appear as `link [ref_N] href="https://eg.linkedin.com/in/..."`. The tree only contains what's rendered, so scroll down and re-read to get the rest of the page.

Ignore the `#:~:text=` fragment variants — they're duplicates of the same profile.

---

## The three profile variants

What you see in the header determines how you connect.

**A. Normal — `Connect` button visible**
```
[Connect] [Message] [⋯]
```
Click Connect directly.

**B. Creator mode — `Follow` button instead**
```
[+ Follow] [Message] [⋯]
```
There is no Connect button. It lives inside **⋯ More**. Open the menu and `find` "Invite \<name\> to connect", then click that ref. Roughly a third of profiles are like this — always check which variant you're on before clicking.

**C. Already sent / connected**
```
[Message] [🕘 Pending]     ← invite is out, waiting
[Message] [✓ Following]    ← accepted (or you follow them)
```
`Pending` means you already sent. Don't re-send.

---

## The invite dialog

Two-step. First:

```
Add a note to your invitation?
[ Add a note ]  [ Send without a note ]
```

**The buttons move vertically depending on how long the person's name is** — a long name wraps the body text and pushes the buttons down ~30px. This is the single most common way to misclick. Take a fresh screenshot for each profile rather than reusing the previous one's coordinates, or find the button by ref.

Choosing **Add a note** opens:

```
Add a note to your invitation
N personalized invitations remaining for this month.
[ textarea ]                                  0/200
[ Cancel ]  [ Send ]
```

`Send` stays disabled until the textarea has content. **The header tells you exactly how many personalized invites you have left** — read it. When it hits zero, clicking "Add a note" shows a Premium upsell instead of the textarea:

> *Send unlimited personalized invites with Premium — You've used all your monthly custom invites.*

Close it and use **Send without a note**.

The 200-char counter counts what's actually in the box. Arabic + a Latin company name lands around 155–170 chars for a well-formed note — comfortable.

---

## Verifying a send actually happened

Do not mark a lead as sent until you see **both**:
- the button flipped to **Pending**, and
- the toast: *"Invitation sent to \<first name\>."*

If neither appears, the click missed. Re-navigate to the profile and try again — you can't double-send, so a retry is safe.

---

## Failure modes

**Screenshot timeout.** `CDP sendCommand "Page.captureScreenshot" timed out … The renderer may be frozen`. LinkedIn does this regularly. Open a fresh tab (`tabs_create_mcp`) and continue — the frozen tab isn't recoverable and the pipeline table tells you where you left off.

**Accidentally opened the cover photo.** The URL becomes `.../overlay/background-photo/` and the screenshot is a zoomed image. You clicked a coordinate that was valid *before* the page reflowed. Re-navigate to the clean profile URL and start over.

**Page zoomed way in.** Occasionally a click lands in a way that leaves the viewport zoomed. `ctrl+0` sometimes fixes it; re-navigating always does.

**The `⋯` menu won't open on a coordinate click.** Use `find` to get the More button's ref and click the ref instead. Coordinates are unreliable here because the header shifts as lazy content loads.

---

## Checking acceptances

`https://www.linkedin.com/mynetwork/invitation-manager/sent/`

Lists every invitation still **pending**, newest first, each with a Withdraw button. Read it with `get_page_text`.

The logic: anyone you sent to who is **no longer on this list** has resolved — check their profile. `Message` (no Pending) = accepted. Then send the full pitch.

Acceptances arrive over days, not minutes. Right after a batch, everything will still be pending — that's expected, not a bug.

---

## Rate limits and account safety

- **~15–20 connection requests per day** is a safe ceiling. Bursts trigger restrictions; a restricted account ends the campaign entirely.
- **5 personalized invites per month** on free (see above).
- Messages to existing **connections are unlimited and free** — which is why the strategy is "get accepted, *then* pitch."
- LinkedIn's ToS discourages automated bulk connecting. Keep a human in the loop: confirm the target list and the note text with the user before sending, and keep the pace human.

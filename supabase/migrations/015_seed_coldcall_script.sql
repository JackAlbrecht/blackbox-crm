-- Seed the Blackbox "Cold Call Script" for any tenant whose name matches.
insert into call_scripts (tenant_id, title, body)
select t.id, 'Cold Call Script',
$$Goal: book a 15-minute Zoom to show them the free website we built for them. That's it.

1. Opener
"Hey, is this [BUSINESS NAME]?"
(wait for yes)
"I've got kind of a weird question for you…"
(half-second pause, then straight into the pitch)

2. The Pitch (keep it short)
"So we actually already built you a brand new website — completely free. It's got a price estimator on it that qualifies your leads before they ever call you, and an AI that picks up your phone when you're on the jobsite so you stop missing calls.

Can I hop on a quick 15-minute Zoom this week and just show it to you? If you like it, it's yours. If not, no worries at all."
(shut up. let them respond.)

3. Book the Meeting
"Awesome — does [DAY] at [TIME] work, or is [DAY 2] at [TIME] better?"
Then: "What's the best email for the calendar invite?"
Always two specific times. Never "whenever works."

4. Quick Objection Handlers
"What's this gonna cost me?"
 → "Nothing to look at it. It's literally built and waiting for you. 15 minutes, zero commitment — Tuesday 2pm or Thursday 10am?"

"I already have a website."
 → "All good — this isn't a replacement. Think of it as an extra tool on top. 15 min, I'll just show you?"

"Just send me info."
 → "Yep — what's the best email? I'll send the link and a time to jump on a quick call."

"I'm too busy."
 → "Heard you. That's actually why we built this. 15 min, I'll show you, you decide. Tuesday or Thursday work better?"

"Not interested."
 → "All good. Mind if I ask — is it the timing, or just not on your radar right now?" (one answer, then:) "Got it, appreciate you being straight with me."

5. Voicemail
"Hey [FIRST NAME], it's Carson. Weird one for you — we actually built you a free website I wanted to show you. Call me back at [YOUR NUMBER] when you've got a sec. Thanks."

6. Tone Rules
• Sound like a friend calling, not a salesman reading.
• Say "weird question" like you mean it — the pause sells it.
• The whole pitch is two sentences. Don't pile on more. Let the meeting do the selling.
• Every time you feel the urge to keep talking — stop. Silence is pressure, and it's on their side.
• One goal only: get the meeting booked. That's it. Don't try to close anything else on the phone.
$$
  from tenants t
 where (t.name ilike '%black box advancements%' or t.slug ilike '%blackbox%')
   and not exists (select 1 from call_scripts where tenant_id = t.id and title = 'Cold Call Script');

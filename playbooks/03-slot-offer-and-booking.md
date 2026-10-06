# 03 · Slot offer and booking

Someone who asks "when can we talk?" is the warmest lead you will have. Every hour of delay costs you.
Draft the slot offer in the same run that classified the reply.

## Offer slots

1. **Read the calendar** (approval: read_calendar) for the next `calendar.booking_window_days` days.
2. **Pick `calendar.slots_to_offer` slots** that:
   - fall inside `calendar.working_hours`,
   - leave `calendar.buffer_minutes` before and after any other meeting,
   - start at least 2 hours from now,
   - are spread over at least 2 different days,
   - last `calendar.meeting_minutes`.
3. **If the lead already suggested a time,** check that one first. If it is free, propose exactly that one and nothing else.
4. **Timezone.** Use the lead's timezone only if you know it from the thread, signature or lead data. Otherwise use `calendar.timezone`.
   Say which one in the draft: "all times Eastern".
5. **Write the draft** (voice and checklist from `voice/tone.md`). Times as a short plain list. End with
   "or pick any time here" and `offer.calendar_link`. Post as a Reply card (approval: send_slot_offer).
   If the calendar cannot be read, send the calendar link alone and say so on the card.

## When the lead picks a time

1. Re-check the slot is still free. If not, offer the next best slot and say sorry in one clause.
2. Post a **Booking card** with the time in both timezones, the invite attendees, and the exact confirmation text you will send.
3. On approval:
   1. Create the calendar event (approval: book_meeting) with the lead's email as attendee (you have it from Instantly), the client's video link,
      and a description of the client and the campaign only. No thread text. Note that the calendar invite itself emails the lead; that is why this is an `ask`.
   2. Send the confirmation as a reply (approval: send_booking_confirmation).
   3. Set status 2, meeting booked (approval: set_interest_status), if allowed for this client.
   4. Log it, and queue a brief (`09-meeting-briefs.md`).

## When the lead goes quiet

If a slot offer gets no answer in 3 days, add the lead to the radar (`08-radar-and-followups.md`). Do not send anything yourself.

## When the lead books through the calendar link

Instantly may emit `lead_meeting_booked`. Do not offer slots again. Check the event exists on the calendar, set status 2 if not set, and queue the brief.

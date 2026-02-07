import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Profile = {
  user_id: string;
  display_name: string;
  goal_category: "academic" | "career_switch" | "health";
  last_checkin_at: string | null;
  status: "active" | "slumping" | "SOS";
};

type Contact = {
  contact_email: string;
  contact_name: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") ?? "";
const SENDGRID_FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const STALE_HOURS = 72;

async function sendSosEmails(user: Profile, contacts: Contact[]): Promise<void> {
  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL || contacts.length === 0) return;

  const subject = `${user.display_name} has gone silent on their goal.`;

  for (const c of contacts) {
    const body = {
      personalizations: [
        {
          to: [{ email: c.contact_email, name: c.contact_name }],
        },
      ],
      from: { email: SENDGRID_FROM_EMAIL, name: "GoalKeeper" },
      subject,
      content: [
        {
          type: "text/plain",
          value:
            `Hi ${c.contact_name},\n\n` +
            `${user.display_name} hasn’t checked in on their goal for a while. ` +
            `This is an automated SOS alert from GoalKeeper.\n\n` +
            `Please consider reaching out to them.\n`,
        },
      ],
    };

    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("SendGrid error", res.status, text);
    }
  }
}

async function maybeCreatePeerMatch(user: Profile): Promise<void> {
  const { data: candidates, error: candErr } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("goal_category", user.goal_category)
    .in("status", ["SOS", "active"])
    .neq("user_id", user.user_id);

  if (candErr) {
    console.error("Candidate fetch error", candErr);
    return;
  }

  if (!candidates || candidates.length === 0) return;

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  const otherId = picked.user_id as string;

  const { count, error: matchErr } = await supabase
    .from("peer_matches")
    .select("id", { count: "exact", head: true })
    .or(
      `and(user_id_1.eq.${user.user_id},user_id_2.eq.${otherId}),and(user_id_1.eq.${otherId},user_id_2.eq.${user.user_id})`,
    );

  if (matchErr) {
    console.error("Match lookup error", matchErr);
    return;
  }

  if ((count ?? 0) > 0) return;

  const { error: insertErr } = await supabase
    .from("peer_matches")
    .insert({ user_id_1: user.user_id, user_id_2: otherId });

  if (insertErr) {
    console.error("Match insert error", insertErr);
  }
}

serve(async () => {
  try {
    const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString();

    const { data: users, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, goal_category, last_checkin_at, status")
      .eq("status", "active")
      .lt("last_checkin_at", cutoff);

    if (error) {
      console.error("Query error", error);
      return new Response(JSON.stringify({ ok: false, error }), { status: 500 });
    }

    const targets = (users ?? []) as Profile[];

    let updatedCount = 0;

    for (const user of targets) {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ status: "SOS", updated_at: new Date().toISOString() })
        .eq("user_id", user.user_id);

      if (updateErr) {
        console.error("Update error", updateErr);
        continue;
      }

      updatedCount++;

      const { data: contacts, error: contactsErr } = await supabase
        .from("emergency_contacts")
        .select("contact_email, contact_name")
        .eq("user_id", user.user_id);

      if (contactsErr) {
        console.error("Contacts error", contactsErr);
      } else {
        await sendSosEmails(user, (contacts ?? []) as Contact[]);
      }

      await maybeCreatePeerMatch(user);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        checked: targets.length,
        updated: updatedCount,
      }),
      { status: 200 },
    );
  } catch (err) {
    console.error("Unhandled error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
});

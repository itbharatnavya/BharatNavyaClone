"use client";

// Contact page form. Sends to POST /api/contact (saved for the admin team, see
// backend modules/platform/routes/contact.routes.js). Needs a name, a message and an email or
// phone; signed-in users get their name, email and phone filled in. Native select for the
// topic. Styles: .cf-* in app/counter-soft-system.css.

import { useEffect, useState } from "react";
import { sendContactMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const TOPICS = [
  ["general", "General question"],
  ["listing", "Listing my business"],
  ["advertising", "Advertising"],
  ["hiring", "Hiring and jobs"],
  ["support", "Help with my account"],
  ["partnership", "Partnership"],
  ["other", "Something else"],
];

export default function ContactForm() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", topic: "general", message: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  // Links like /contact?topic=support&message=... (account-suspended page, seller banner)
  // open the form already filled in.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const topic = q.get("topic");
    const message = q.get("message");
    setForm((f) => ({
      ...f,
      topic: topic && TOPICS.some(([value]) => value === topic) ? topic : f.topic,
      message: f.message || (message || "").slice(0, 1000),
    }));
  }, []);

  useEffect(() => {
    if (!user) return;
    const u = user as { name?: string; email?: string; mobile?: string; phone?: string };
    setForm((f) => ({ ...f, name: f.name || u.name || "", email: f.email || u.email || "", phone: f.phone || u.mobile || u.phone || "" }));
  }, [user]);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Please enter your name.");
    if (!form.email.trim() && !form.phone.trim()) return setError("Add an email or phone number so we can reply.");
    if (form.message.trim().length < 10) return setError("Please write a little more so we can help.");
    setState("sending");
    try {
      await sendContactMessage({ name: form.name.trim(), email: form.email.trim() || undefined, phone: form.phone.trim() || undefined, topic: form.topic, message: form.message.trim() });
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your message. Please try again.");
      setState("idle");
    }
  }

  if (state === "sent") return <div className="cf cf-done" role="status">
    <span className="cf-done-icon" aria-hidden><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span>
    <h3>Message sent.</h3>
    <p>Thanks, {form.name.split(" ")[0]}. We&rsquo;ll reply to {form.email || form.phone}.</p>
    <button type="button" className="le-button" onClick={() => { setForm((f) => ({ ...f, message: "" })); setState("idle"); }}>Send another message</button>
  </div>;

  return <form className="cf" onSubmit={submit} noValidate>
    <div className="cf-row">
      <label className="cf-field"><span>Your name</span><input value={form.name} onChange={set("name")} autoComplete="name" maxLength={120} required /></label>
      <label className="cf-field"><span>Topic</span><select value={form.topic} onChange={set("topic")}>{TOPICS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <div className="cf-row">
      <label className="cf-field"><span>Email</span><input type="email" value={form.email} onChange={set("email")} autoComplete="email" maxLength={160} inputMode="email" /></label>
      <label className="cf-field"><span>Phone <small>(optional if you add email)</small></span><input type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" maxLength={30} inputMode="tel" /></label>
    </div>
    <label className="cf-field"><span>Message</span><textarea rows={5} value={form.message} onChange={set("message")} maxLength={3000} placeholder="Tell us what you need and we'll get back to you." required /></label>
    {error && <p className="cf-error" role="alert">{error}</p>}
    <div className="cf-foot">
      <button type="submit" className="le-button is-primary" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send message"}</button>
      <small>We reply within 1 to 2 working days.</small>
    </div>
  </form>;
}

"use client";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
export default function LoginPage() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(""); const result = await signIn("credentials", { email, password, redirect: false }); setBusy(false); if (result?.error) setError("Email hoặc mật khẩu không chính xác."); else window.location.href = "/"; }
  return <main className="auth-wrap"><form className="auth-card" onSubmit={submit}><a href="/" className="auth-brand">BCD KIDS</a><h1>Đăng nhập khách sỉ</h1><p>Đăng nhập để đặt hàng và theo dõi đơn hàng của bạn.</p><label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} /></label><label>Mật khẩu<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button full" disabled={busy}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button><p>Chưa có tài khoản? <a href="/register">Đăng ký khách sỉ</a></p></form></main>;
}

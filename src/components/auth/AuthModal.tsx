// File: src/components/auth/AuthModal.tsx
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { Mail, LockKeyhole, UserPlus, LogIn, HelpCircle, Eye, EyeOff } from "lucide-react";
import { login, register as apiRegister, forgot, sendVerify, verifyCode, verifyEmail, reset } from "../../services/auth.api";
import { useAuth } from "../../store/useAuth";
import { toErrorString } from "../../lib/errors";
import { nameOk, emailOk, pwdOk } from "../../lib/validators";
import { registerPush } from "../../services/push";

export default function AuthModal({
  open, onClose, initialView = "login", onAuthed,
}: {
  open: boolean;
  onClose: () => void;
  initialView?: "login"|"register"|"forgot"|"verify"|"reset";
  onAuthed?: () => void;
}) {
  const { persist } = useAuth();
  const location = useLocation();
  const [view, setView] = useState<"login"|"register"|"forgot"|"verify"|"reset">(initialView);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [mobile, setMobile] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shouldOpenReport, setShouldOpenReport] = useState(false);

  async function handleVerifyToken(token: string) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const result = await verifyEmail(token);
      setMsg(result.message || "Email verified successfully! You can now sign in.");
      setTimeout(() => {
        switchView("login", true);
      }, 1500);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Verification failed or link expired.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (open) {
      const state = location.state as any;
      const newView = state?.initialView || initialView;
      setView(newView);
      setBusy(false);
      
      // Track if report should open after auth
      if (state?.openReportAfterAuth) {
        setShouldOpenReport(true);
      } else {
        setShouldOpenReport(false);
      }
      
      if (state?.verifyToken) {
        setErr(null);
        setMsg(null);
        handleVerifyToken(state.verifyToken);
      } else if (state?.verifyError) {
        setErr(state.verifyError);
        setMsg(null);
      } else if (state?.resetToken) {
        setMsg("Please enter your new password below.");
        setErr(null);
      } else if (state?.resetError) {
        setErr(state.resetError);
        setMsg(null);
      } else if (state?.message) {
        setMsg(state.message);
        setErr(null);
      } else if (!state?.verifyToken && !state?.resetToken && !state?.message) {
        setErr(null);
        setMsg(null);
      }
    } else {
      setShouldOpenReport(false);
    }
  }, [open, initialView, location.state]);

  useEffect(() => {
    function onOpenAuth(e: any) {
      if (e?.detail?.openReportAfterAuth) {
        setShouldOpenReport(true);
      }
    }
    window.addEventListener("imc:open-auth", onOpenAuth);
    return () => window.removeEventListener("imc:open-auth", onOpenAuth);
  }, []);

  function switchView(v: typeof view, preserveMsg = false) {
    setView(v);
    if (!preserveMsg) {
      setErr(null);
      setMsg(null);
    }
    setBusy(false);
    if (v !== "register") setName("");
    if (v !== "verify") setCode("");
    if (v === "login") {
      setPassword("");
      setConfirmPassword("");
    }
  }

  
  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const tokens = await login({ email, password });
      await persist(tokens);
      try { await registerPush(); } catch {}
      onAuthed?.();
      const state = location.state as any;
      const openReport = shouldOpenReport || state?.openReportAfterAuth || false;
      window.dispatchEvent(new CustomEvent("imc:auth-success", { detail: { openReport } }));
      setShouldOpenReport(false);
      setBusy(false);
      onClose();
    } catch (e:any) {
      const detail = e?.response?.data?.detail;
      const m = detail || toErrorString(e);
      setErr(m);
      setBusy(false);
      if (m.toLowerCase().includes("verify")) {
        switchView("verify");
      }
    }
  }

  async function doRegister(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      await apiRegister({ name, email, password, mobile: mobile || undefined });
      setMsg("Account created. Check your email for a verification link, or enter the 6-digit code below.");
      switchView("verify");
    } catch (e:any) {
      setErr(toErrorString(e));
    } finally {
      setBusy(false);
    }
  }

  async function doForgot(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const result = await forgot({ email });
      setMsg(result.message || "If the email exists, we've sent a reset link.");
    } catch (e:any) {
      setErr(toErrorString(e));
    } finally {
      setBusy(false);
    }
  }

  async function doVerify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const result = await verifyCode(email, code);
      setMsg(result.message || "Email verified! You can now sign in.");
      switchView("login", true);
    } catch (e:any) {
      setErr(toErrorString(e));
    } finally {
      setBusy(false);
    }
  }

  async function doSendVerify() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      if (!emailOk(email)) {
        setErr("Enter your email first.");
        setBusy(false);
        return;
      }
      const result = await sendVerify(email);
      if (result.message && result.message.toLowerCase().includes("already verified")) {
        setMsg("Your email is already verified! You can sign in now.");
        setTimeout(() => {
          switchView("login", true);
        }, 1500);
      } else {
        setMsg(result.message || "Verification email sent. Enter your 6-digit code or click the link we emailed you.");
      }
    } catch (e:any) {
      setErr(toErrorString(e));
    } finally {
      setBusy(false);
    }
  }

  async function doReset(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    
    const state = location.state as any;
    const token = state?.resetToken;
    
    if (!token) {
      setErr("Missing reset token. Please use the link from your email.");
      return;
    }

    if (!pwdOk(password)) {
      setErr("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.");
      return;
    }

    if (password !== confirmPassword) {
      setErr("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const result = await reset(token, password);
      setMsg(result.message || "Password reset successfully! You can now sign in.");
      setTimeout(() => {
        switchView("login", true);
      }, 2000);
    } catch (e:any) {
      setErr(toErrorString(e) || "Password reset failed. The link may have expired.");
    } finally {
      setBusy(false);
    }
  }

  const loginDisabled = !(emailOk(email) && password.length >= 8);
  const registerDisabled = !(nameOk(name) && emailOk(email) && pwdOk(password));

  const handleClose = () => {
    if (busy) return;
    setErr(null);
    setMsg(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Welcome to Improve My City" wide>
      {/* Tabs */}
      <div className="inline-flex rounded-2xl border bg-gray-50 p-1">
        <button
          className={`px-3 py-1.5 rounded-xl text-sm inline-flex items-center gap-2 ${view==='login'?'bg-white shadow':'text-gray-600 hover:text-gray-900'}`}
          onClick={() => switchView("login")}
        ><LogIn className="h-4 w-4" /> Sign in</button>
        <button
          className={`px-3 py-1.5 rounded-xl text-sm inline-flex items-center gap-2 ${view==='register'?'bg-white shadow':'text-gray-600 hover:text-gray-900'}`}
          onClick={() => switchView("register")}
        ><UserPlus className="h-4 w-4" /> Create account</button>
      </div>

      <div className="mt-4 grid gap-4">
        {/* Messages */}
        {err && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        {msg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</div>}

        {view === "login" && (
          <form onSubmit={doLogin} className="grid gap-3">
            <label className="text-sm">Email</label>
            <div className="relative">
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} required />
              <Mail className="h-4 w-4 text-gray-500 absolute right-2 top-1/2 -translate-y-1/2" />
            </div>
            <label className="text-sm mt-1">Password</label>
            <div className="relative">
              <Input type={showPwd ? "text":"password"} placeholder="••••••••" value={password} onChange={(e)=>setPassword(e.target.value)} minLength={8} required />
              <button type="button" onClick={()=>setShowPwd(v=>!v)} className="absolute right-7 top-1/2 -translate-y-1/2 p-1">
                {showPwd ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
              </button>
              <LockKeyhole className="h-4 w-4 text-gray-500 absolute right-2 top-1/2 -translate-y-1/2" />
            </div>
            <Button
              disabled={busy || loginDisabled}
              title={loginDisabled ? "Fill required fields" : undefined}
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">New here? <button type="button" className="text-indigo-700 underline" onClick={()=>switchView("register")}>Create account</button></span>
              <button type="button" className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900" onClick={()=>switchView("forgot")}><HelpCircle className="h-4 w-4"/> Forgot?</button>
            </div>
          </form>
        )}

        {view === "register" && (
          <form onSubmit={doRegister} className="grid gap-3">
            <label className="text-sm">Full name <span className="text-red-600">*</span></label>
            <Input placeholder="e.g., Asha Verma" value={name} onChange={(e)=>setName(e.target.value)} required />

            <label className="text-sm mt-1">Email <span className="text-red-600">*</span></label>
            <div className="relative">
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} required />
              <Mail className="h-4 w-4 text-gray-500 absolute right-2 top-1/2 -translate-y-1/2" />
            </div>

            <label className="text-sm mt-1">Mobile</label>
            <Input placeholder="+91…" value={mobile} onChange={(e)=>setMobile(e.target.value)} />

            <label className="text-sm mt-1">Password <span className="text-red-600">*</span></label>
            <div className="text-xs text-gray-600 mb-1">
              Must include: A–Z, a–z, 0–9, special; min 8 chars.
            </div>
            <div className="relative">
              <Input type={showPwd ? "text":"password"} placeholder="Strong password"
                    value={password} onChange={(e)=>setPassword(e.target.value)} minLength={8} required />
              <button type="button" onClick={()=>setShowPwd(v=>!v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1">
                {showPwd ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
              </button>
            </div>

            {/* unmet requirements */}
            {!pwdOk(password) && password.length>0 && (
              <ul className="text-xs text-amber-700 list-disc pl-5">
                {/[A-Z]/.test(password) ? null : <li>Add an uppercase letter</li>}
                {/[a-z]/.test(password) ? null : <li>Add a lowercase letter</li>}
                {/\d/.test(password) ? null : <li>Add a digit</li>}
                {/[^A-Za-z0-9]/.test(password) ? null : <li>Add a special character</li>}
                {password.length>=8 ? null : <li>At least 8 characters</li>}
              </ul>
            )}
            <Button
              disabled={busy || registerDisabled}
              title={registerDisabled ? "Fill required fields and meet password rules" : undefined}
            >
              {busy ? "Creating…" : "Create account"}
            </Button>
            <div className="text-sm text-gray-600">Already have an account? <button type="button" className="text-indigo-700 underline" onClick={()=>switchView("login")}>Sign in</button></div>
          </form>
        )}

        {view === "forgot" && (
          <form onSubmit={doForgot} className="grid gap-3">
            <div className="text-sm text-gray-700 inline-flex items-center gap-2"><HelpCircle className="h-4 w-4" /> Trouble signing in?</div>
            <label className="text-sm">Email</label>
            <Input type="email" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} required />
            <Button disabled={busy || !emailOk(email)}>{busy ? "Sending…" : "Send reset link"}</Button>
            <div className="text-sm text-gray-600">Or <button type="button" className="text-indigo-700 underline" onClick={()=>switchView("verify")}>enter verification code</button></div>
          </form>
        )}

        {view === "verify" && (
          <form onSubmit={doVerify} className="grid gap-3">
            <label className="text-sm">Email</label>
            <Input type="email" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} required />
            <label className="text-sm">6-digit code</label>
            <Input inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={(e)=>setCode(e.target.value.replace(/\D/g,""))} required />
            <div className="flex items-center gap-2">
              <Button disabled={busy || code.length !== 6}>{busy ? "Verifying…" : "Verify"}</Button>
              <Button type="button" variant="secondary" disabled={busy || !emailOk(email)} onClick={doSendVerify}>Resend email</Button>
            </div>
            <div className="text-sm text-gray-600">Verified? <button type="button" className="text-indigo-700 underline" onClick={()=>switchView("login")}>Sign in now</button></div>
          </form>
        )}

        {view === "reset" && (
          <form onSubmit={doReset} className="grid gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-2">
              <div className="text-sm font-medium text-blue-900 mb-1">Reset Your Password</div>
              <div className="text-xs text-blue-700">Enter a new secure password below. Make sure it meets all the requirements.</div>
            </div>
            <label className="text-sm font-medium">New password <span className="text-red-600">*</span></label>
            <div className="relative">
              <Input
                type={showPwd ? "text" : "password"}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1">
                {showPwd ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
              </button>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div className={password.length >= 8 ? "text-green-600" : ""}>✓ At least 8 characters</div>
              <div className={/[a-z]/.test(password) ? "text-green-600" : ""}>✓ One lowercase letter</div>
              <div className={/[A-Z]/.test(password) ? "text-green-600" : ""}>✓ One uppercase letter</div>
              <div className={/\d/.test(password) ? "text-green-600" : ""}>✓ One number</div>
              <div className={/[^A-Za-z0-9]/.test(password) ? "text-green-600" : ""}>✓ One special character</div>
            </div>
            <label className="text-sm font-medium">Confirm password <span className="text-red-600">*</span></label>
            <div className="relative">
              <Input
                type={showPwd ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1">
                {showPwd ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-600">Passwords do not match</p>
            )}
            <Button
              disabled={busy || !pwdOk(password) || password !== confirmPassword}
              className="w-full"
            >
              {busy ? "Updating…" : "Update password"}
            </Button>
            <div className="text-sm text-gray-600 text-center">Remember your password? <button type="button" className="text-indigo-700 underline" onClick={() => switchView("login")}>Sign in</button></div>
          </form>
        )}
      </div>
    </Modal>
  );
}
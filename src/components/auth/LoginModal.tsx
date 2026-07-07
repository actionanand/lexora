"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import styles from "@/components/auth/AuthGate.module.css";
import { Eye, EyeOff, KeyRound, LockKeyhole, UserRound, X } from "lucide-react";
import { FormEvent, useState } from "react";

export function LoginModal({ onClose }: { onClose?: () => void }) {
  const { config, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);

    const result = await login(username, password);

    if (result.ok) {
      setSuccess(true);
      setMessage("Access granted");
      return;
    }

    setShake(false);
    requestAnimationFrame(() => setShake(true));

    if (result.reason === "username") {
      setMessage("Username is required");
      return;
    }

    if (result.reason === "config") {
      setMessage("Password config is invalid");
      return;
    }

    setMessage("Wrong password");
  }

  const configNotice =
    config?.source === "invalid"
      ? "The configured password hash is invalid. Update the deployment config and revalidate."
      : config?.source === "missing"
        ? "Password validation is not configured. Add a deployment hash and revalidate."
      : "Sign in to continue. Existing sessions revalidate when the active hash changes.";

  return (
    <form className={`${styles.card} ${shake ? styles.shake : ""}`} onSubmit={onSubmit}>
      {onClose && (
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
          <X size={18} aria-hidden />
        </button>
      )}
      <div className={styles.badge}>
        <LockKeyhole size={18} aria-hidden />
        Protected docs
      </div>
      <h1>Welcome back</h1>
      <p>{configNotice}</p>

      <label className={styles.field}>
        <span>Username</span>
        <div className={styles.inputShell}>
          <UserRound size={18} aria-hidden />
          <input
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Your name"
          />
        </div>
      </label>

      <label className={styles.field}>
        <span>Password</span>
        <div className={styles.inputShell}>
          <KeyRound size={18} aria-hidden />
          <input
            autoComplete="current-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className={styles.eyeButton}
            type="button"
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        </div>
      </label>

      <button className={styles.submit} type="submit">
        Unlock
      </button>

      <div className={`${styles.message} ${success ? styles.success : ""}`} aria-live="polite">
        {message}
      </div>
    </form>
  );
}

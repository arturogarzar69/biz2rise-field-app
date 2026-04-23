"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient, getSupabaseConfig } from "../lib/supabaseClient";
import { uiText } from "../lib/uiText";

const DEBUG = process.env.NODE_ENV === "development";
const debugLog = (...args) => {
  if (DEBUG) {
    console.log(...args);
  }
};

function getLoginErrorMessage(error) {
  const message = error?.message || "";

  if (message.toLowerCase().includes("invalid login credentials")) {
    return uiText.login.invalidCredentials;
  }

  return message || uiText.login.loginFailed;
}

function getNetworkErrorMessage() {
  return uiText.login.networkError;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const config = getSupabaseConfig();
    const tokenUrl = config.supabaseUrl
      ? `${config.supabaseUrl}/auth/v1/token?grant_type=password`
      : "";

    debugLog("[Supabase Debug] NEXT_PUBLIC_SUPABASE_URL exists:", config.hasUrl);
    debugLog(
      "[Supabase Debug] NEXT_PUBLIC_SUPABASE_ANON_KEY exists:",
      config.hasAnonKey
    );
    debugLog("[Supabase Debug] Supabase URL:", config.supabaseUrl || "(missing)");
    debugLog(
      "[Supabase Debug] Supabase anon key prefix:",
      config.supabaseAnonKey ? config.supabaseAnonKey.slice(0, 8) : "(missing)"
    );
    debugLog("[Supabase Debug] Token endpoint:", tokenUrl || "(missing)");

    const supabase = getSupabaseClient();

    if (!supabase) {
      console.error("[Supabase Debug] Client not created because env config is invalid.");
      setIsCheckingSession(false);
      return;
    }

    let isMounted = true;

    async function checkSession() {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (session) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setIsCheckingSession(false);
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    const config = getSupabaseConfig();
    const supabase = getSupabaseClient();

    if (!supabase) {
      setErrorMessage(uiText.login.missingEnv);
      setIsLoading(false);
      return;
    }

    debugLog(
      "[Supabase Debug] Attempting sign-in against:",
      `${config.supabaseUrl}/auth/v1/token?grant_type=password`
    );

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setErrorMessage(getLoginErrorMessage(error));
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error("[Supabase Debug] signInWithPassword threw:", error);
      setErrorMessage(getNetworkErrorMessage());
      setIsLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  };

  if (isCheckingSession) {
    return (
      <main className="page">
        <section className="card">
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <img
              src="/logo.svg"
              alt="Biz2Rise"
              style={{ maxWidth: "160px", height: "auto" }}
            />
          </div>
          <h1>{uiText.login.title}</h1>
          <p>{uiText.login.checkingSession}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="card">
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <img
            src="/logo.svg"
            alt="Biz2Rise"
            style={{ maxWidth: "160px", height: "auto" }}
          />
        </div>
        <h1>{uiText.login.title}</h1>
        <p>{uiText.login.subtitle}</p>

        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">{uiText.login.emailLabel}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={uiText.login.emailPlaceholder}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">{uiText.login.passwordLabel}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={uiText.login.passwordPlaceholder}
              required
            />
          </div>

          {errorMessage ? <p className="error">{errorMessage}</p> : null}

          <button className="button" type="submit" disabled={isLoading}>
            {isLoading ? uiText.login.submitting : uiText.login.submit}
          </button>
        </form>
      </section>
    </main>
  );
}

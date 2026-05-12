import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { loginRequest } from "@/lib/api/authApi";
import {
  loginFormSchema,
  type LoginFormValues,
} from "@/lib/validation/authSchemas";
import { useAuthStore } from "@/stores/authStore";
import type { LoginFailureReason } from "@/types/auth";
import { getRoleDashboardPath } from "@/routes/paths";

export type LoginPhase = "idle" | "loading" | "success" | "error";

export interface LoginControllerState {
  phase: LoginPhase;
  failureReason: LoginFailureReason | null;
  serverMessage: string | null;
}

function mapReasonToUiMessage(
  reason: LoginFailureReason,
  serverMessage?: string,
): string {
  switch (reason) {
    case "INVALID_CREDENTIALS":
      return serverMessage?.trim() || "Invalid email or password.";
    case "NETWORK":
      return "Unable to reach the server. Check your connection and try again.";
    case "TIMEOUT":
      return "The request timed out. Please try again.";
    case "SERVER":
      return "The server is unavailable. Please try again shortly.";
    case "MALFORMED_RESPONSE":
      return "Received an unexpected response. Please try again.";
    case "EMPTY_PAYLOAD":
      return "The server returned an empty response. Please try again.";
    case "ABORTED":
      return "";
    case "UNEXPECTED":
    default:
      return serverMessage?.trim() || "Something went wrong. Please try again.";
  }
}

export function useLoginController() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const abortRef = useRef<AbortController | null>(null);

  const [ui, setUi] = useState<LoginControllerState>({
    phase: "idle",
    failureReason: null,
    serverMessage: null,
  });

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const onSubmit = form.handleSubmit(async (values) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setUi({
      phase: "loading",
      failureReason: null,
      serverMessage: null,
    });

    const result = await loginRequest(values, controller.signal);

    if (!result.ok) {
      if (result.reason === "ABORTED") {
        setUi({ phase: "idle", failureReason: null, serverMessage: null });
        return;
      }
      setUi({
        phase: "error",
        failureReason: result.reason,
        serverMessage: result.message ?? null,
      });
      return;
    }

    setSession({
      token: result.data.token,
      user: result.data.user,
      wardenHostel: result.data.user.role === "WARDEN" ? result.data.hostel : null,
    });
    setUi({ phase: "success", failureReason: null, serverMessage: null });

    const path = getRoleDashboardPath(result.data.user.role);
    navigate(path, { replace: true });
  });

  const dismissError = () => {
    setUi((prev) =>
      prev.phase === "error"
        ? { phase: "idle", failureReason: null, serverMessage: null }
        : prev,
    );
  };

  const submitErrorMessage =
    ui.phase === "error" && ui.failureReason && ui.failureReason !== "ABORTED"
      ? mapReasonToUiMessage(ui.failureReason, ui.serverMessage ?? undefined)
      : null;

  const fieldErrorKeys = Object.keys(form.formState.errors);
  const hasFieldErrorsAfterSubmit =
    form.formState.submitCount > 0 &&
    fieldErrorKeys.length > 0 &&
    ui.phase !== "loading";

  const emptyFormSummary = useMemo(() => {
    if (!hasFieldErrorsAfterSubmit) return null;
    const { email, password } = form.formState.errors;
    const parts = [email?.message, password?.message].filter(Boolean);
    if (parts.length === 0) return "Please fix the highlighted fields.";
    return parts.join(" ");
  }, [hasFieldErrorsAfterSubmit, form.formState.errors]);

  return {
    form,
    onSubmit,
    ui,
    dismissError,
    submitErrorMessage,
    hasFieldErrorsAfterSubmit,
    emptyFormSummary,
    mapReasonToUiMessage,
  };
}

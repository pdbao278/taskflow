type ApiFetchOptions = RequestInit & {
  /**
   * Use this only for protected API calls (not /api/auth/login).
   * When true, a 401 will redirect to /login with the PRD message.
   */
  redirectOn401?: boolean;
};

export async function apiFetch(input: RequestInfo | URL, init?: ApiFetchOptions) {
  const redirectOn401 = init?.redirectOn401 ?? true;

  const res = await fetch(input, {
    ...init,
    credentials: init?.credentials ?? "include",
  });

  if (redirectOn401 && res.status === 401) {
    try {
      window.localStorage.setItem("taskflow_auth_event", Date.now().toString());
    } catch {
      // ignore
    }

    const message = encodeURIComponent("Phiên làm việc đã hết hạn.");
    window.location.href = `/login?message=${message}`;
    throw new Error("Unauthorized");
  }

  return res;
}


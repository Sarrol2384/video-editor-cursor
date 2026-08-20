/** User-facing message for failed API responses. */
export function formatApiError(status: number, error?: string): string {
  if (status === 401) {
    return "Your session expired. Log out, sign in again, then retry.";
  }
  return error || "Request failed";
}

export function isUnauthorized(status: number): boolean {
  return status === 401;
}

/** Default fetch options for authenticated same-origin API calls. */
export const authFetchInit: RequestInit = {
  credentials: "include",
};

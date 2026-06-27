const BASE = "/api";

function getToken() {
  return localStorage.getItem("kosmeo_token");
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: authHeaders(),
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  auth: {
    register: (body) =>
      request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
    login: (body) =>
      request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
    me: () => request("/auth/me"),
    updateMe: (body) =>
      request("/auth/me", { method: "PATCH", body: JSON.stringify(body) }),
    resendVerification: () =>
      request("/auth/resend-verification", { method: "POST" }),
    verifyEmail: (token) =>
      request("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) }),
    forgotPassword: (email) =>
      request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
    resetPassword: (token, password) =>
      request("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),
    validateResetToken: (token) =>
      request("/auth/validate-reset-token", { method: "POST", body: JSON.stringify({ token }) }),
  },

  listings: {
    list: (params = {}) => {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v != null && v !== "")
      ).toString();
      return request(`/listings${qs ? `?${qs}` : ""}`);
    },
    trending: () => request("/listings/trending"),
    get: (id) => request(`/listings/${id}`),
    create: (body) =>
      request("/listings", { method: "POST", body: JSON.stringify(body) }),
    delete: (id) => request(`/listings/${id}`, { method: "DELETE" }),
    byUser: (userId) => request(`/listings/user/${userId}`),
    me: () => request("/listings/me"),
    markSold: (id) => request(`/listings/${id}/sold`, { method: "PATCH" }),
    markAvailable: (id) => request(`/listings/${id}/available`, { method: "PATCH" }),
  },

  wallet: {
    balance: () => request("/wallet"),
    withdraw: (body) =>
      request("/wallet/withdraw", { method: "POST", body: JSON.stringify(body) }),
  },

  reviews: {
    forSeller: (userId) => request(`/reviews/${userId}`),
    submit: (body) =>
      request("/reviews", { method: "POST", body: JSON.stringify(body) }),
  },

  favorites: {
    list: () => request("/favorites"),
    add: (listing_id) =>
      request("/favorites", { method: "POST", body: JSON.stringify({ listing_id }) }),
    remove: (listingId) =>
      request(`/favorites/${listingId}`, { method: "DELETE" }),
  },

  messages: {
    conversations: () => request("/messages/conversations"),
    getMessages: (convId) => request(`/messages/conversations/${convId}`),
    startConversation: (listing_id, body) =>
      request("/messages/conversations", {
        method: "POST",
        body: JSON.stringify({ listing_id, body }),
      }),
    sendMessage: (convId, body) =>
      request(`/messages/conversations/${convId}`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
  },

  reports: {
    create: async ({ reported_user_id, listing_id, conversation_id, reason, detail }) => {
      const token = getToken();
      const res = await fetch(`${BASE}/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reported_user_id, listing_id, conversation_id, reason, detail }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit report");
      }
      return res.json();
    },
  },

  upload: {
    single: async (file) => {
      const formData = new FormData();
      formData.append("image", file);
      const token = getToken();
      const res = await fetch(`${BASE}/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      return data;
    },
    multiple: async (files) => {
      const formData = new FormData();
      for (const file of files) formData.append("images", file);
      const token = getToken();
      const res = await fetch(`${BASE}/upload/multiple`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      return data;
    },
  },
};

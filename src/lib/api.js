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

// Auth
export const api = {
  auth: {
    register: (body) =>
      request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
    login: (body) =>
      request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
    me: () => request("/auth/me"),
    updateMe: (body) =>
      request("/auth/me", { method: "PATCH", body: JSON.stringify(body) }),
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

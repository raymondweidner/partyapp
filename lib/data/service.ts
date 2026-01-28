import { getResourceEndpoint } from "../util";
import { Guest } from "./Guest";
import { Host } from "./Host";
import { Invite } from "./Invite";
import { Party } from "./Party";
import { UserDevice } from "./UserDevice";

const getHeaders = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

// UserDevice Services
export const getUserDeviceByToken = async (
  token: string,
  authToken: string,
): Promise<UserDevice | null> => {
  const response = await fetch(
    `${getResourceEndpoint()}/user_device?token=${encodeURIComponent(token)}`,
    {
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );
  if (response.ok) {
    const data = await response.json();
    const devices = Array.isArray(data) ? data : [data];
    return devices.length > 0 ? devices[0] : null;
  }
  return null;
};

export const createUserDevice = async (
  device: Omit<UserDevice, "id">,
  authToken: string,
): Promise<UserDevice> => {
  const response = await fetch(`${getResourceEndpoint()}/user_device`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(device),
  });
  if (!response.ok) throw new Error("Failed to create user device");
  return response.json();
};

export const updateUserDevice = async (
  device: UserDevice,
  authToken: string,
): Promise<UserDevice> => {
  const response = await fetch(
    `${getResourceEndpoint()}/user_device/${device.id}`,
    {
      method: "PUT",
      headers: getHeaders(authToken),
      body: JSON.stringify(device),
    },
  );
  if (!response.ok) throw new Error("Failed to update user device");
  return response.json();
};

export const deleteUserDevice = async (
  deviceId: string,
  authToken: string,
): Promise<void> => {
  const response = await fetch(
    `${getResourceEndpoint()}/user_device/${deviceId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );
  if (!response.ok) throw new Error("Failed to delete user device");
};

// Host Services
export const getHostByUserId = async (
  userId: string,
  authToken: string,
): Promise<Host | null> => {
  const response = await fetch(
    `${getResourceEndpoint()}/host?user_id=${encodeURIComponent(userId)}`,
    {
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );
  if (response.ok) {
    const data = await response.json();
    const hosts = Array.isArray(data) ? data : [data];
    return hosts.length > 0 ? hosts[0] : null;
  }
  return null;
};

export const getHostByEmail = async (
  email: string,
  authToken: string,
): Promise<Host | null> => {
  const response = await fetch(
    `${getResourceEndpoint()}/host?email=${encodeURIComponent(email)}`,
    {
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );
  if (response.ok) {
    const data = await response.json();
    const hosts = Array.isArray(data) ? data : [data];
    return hosts.length > 0 ? hosts[0] : null;
  }
  return null;
};

export const createHost = async (
  host: Omit<Host, "id">,
  authToken: string,
): Promise<Host> => {
  const response = await fetch(`${getResourceEndpoint()}/host`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(host),
  });
  if (!response.ok) throw new Error("Failed to create host record");
  return response.json();
};

export const updateHost = async (
  host: Host,
  authToken: string,
): Promise<Host> => {
  const response = await fetch(`${getResourceEndpoint()}/host/${host.id}`, {
    method: "PUT",
    headers: getHeaders(authToken),
    body: JSON.stringify(host),
  });
  if (!response.ok) throw new Error("Failed to update host record");
  return response.json();
};

// Guest Services
export const getGuests = async (authToken: string): Promise<Guest[]> => {
  const response = await fetch(`${getResourceEndpoint()}/guest`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) throw new Error("Failed to fetch guests");
  return response.json();
};

export const createGuest = async (
  guest: Omit<Guest, "id">,
  authToken: string,
): Promise<Guest> => {
  const response = await fetch(`${getResourceEndpoint()}/guest`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(guest),
  });
  if (!response.ok) throw new Error("Failed to create guest record");
  return response.json();
};

export const updateGuest = async (
  guest: Guest,
  authToken: string,
): Promise<Guest> => {
  const response = await fetch(`${getResourceEndpoint()}/guest/${guest.id}`, {
    method: "PUT",
    headers: getHeaders(authToken),
    body: JSON.stringify(guest),
  });
  if (!response.ok) throw new Error("Failed to update guest");
  return response.json();
};

// Party Services
export const getParties = async (authToken: string): Promise<Party[]> => {
  const response = await fetch(`${getResourceEndpoint()}/party`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) throw new Error("Failed to fetch parties");
  return response.json();
};

export const createParty = async (
  party: Omit<Party, "id">,
  authToken: string,
): Promise<Party> => {
  const response = await fetch(`${getResourceEndpoint()}/party`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(party),
  });
  if (!response.ok) throw new Error("Failed to create party");
  return response.json();
};

export const updateParty = async (
  party: Party,
  authToken: string,
): Promise<Party> => {
  const response = await fetch(`${getResourceEndpoint()}/party/${party.id}`, {
    method: "PUT",
    headers: getHeaders(authToken),
    body: JSON.stringify(party),
  });
  if (!response.ok) throw new Error("Failed to update party");
  return response.json();
};

// Invite Services
export const getInvites = async (authToken: string): Promise<Invite[]> => {
  const response = await fetch(`${getResourceEndpoint()}/invite`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) throw new Error("Failed to fetch invites");
  return response.json();
};

export const createInvite = async (
  invite: Omit<Invite, "id">,
  authToken: string,
): Promise<Invite> => {
  const response = await fetch(`${getResourceEndpoint()}/invite`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(invite),
  });
  if (!response.ok) throw new Error("Failed to create invite");
  return response.json();
};

export const updateInvite = async (
  invite: Invite,
  authToken: string,
): Promise<Invite> => {
  const response = await fetch(`${getResourceEndpoint()}/invite/${invite.id}`, {
    method: "PUT",
    headers: getHeaders(authToken),
    body: JSON.stringify(invite),
  });
  if (!response.ok) throw new Error("Failed to update invite");
  return response.json();
};

export const deleteInvite = async (
  inviteId: string,
  authToken: string,
): Promise<void> => {
  const response = await fetch(`${getResourceEndpoint()}/invite/${inviteId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) throw new Error("Failed to delete invite");
};

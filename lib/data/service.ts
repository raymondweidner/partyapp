import { getResourceEndpoint } from "../util";

import { Availability } from "./Availability";
import { Fam } from "./Fam";
import { Meetup } from "./Meetup";
import { Tribe } from "./Tribe";
import { TribeFam } from "./TribeFam";
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

// Fam Services
export const getFams = async (
  authToken: string,
  userId?: string,
): Promise<Fam[]> => {
  let url = `${getResourceEndpoint()}/fam`;
  if (userId) {
    url += `?user_id=${encodeURIComponent(userId)}`;
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch fams");
  }
  return response.json();
};

export const createFam = async (
  fam: Omit<Fam, "id">,
  authToken: string,
): Promise<Fam> => {
  const response = await fetch(`${getResourceEndpoint()}/fam`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(fam),
  });
  if (!response.ok) throw new Error("Failed to create fam record");
  return response.json();
};

export const updateFam = async (
  fam: Fam & { id: string },
  authToken: string,
): Promise<Fam> => {
  const response = await fetch(`${getResourceEndpoint()}/fam/${fam.id}`, {
    method: "PUT",
    headers: getHeaders(authToken),
    body: JSON.stringify(fam),
  });
  if (!response.ok) throw new Error("Failed to update fam");
  return response.json();
};

// Meetup Services
export const getMeetups = async (
  authToken: string,
  tribeId?: string,
): Promise<Meetup[]> => {
  let url = `${getResourceEndpoint()}/meetup`;
  if (tribeId) {
    url += `?tribe_id=${encodeURIComponent(tribeId)}`;
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch meetups");
  }
  return response.json();
};

export const createMeetup = async (
  meetup: Omit<Meetup, "id">,
  authToken: string,
): Promise<Meetup> => {
  const response = await fetch(`${getResourceEndpoint()}/meetup`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(meetup),
  });
  if (!response.ok) throw new Error("Failed to create meetup");
  return response.json();
};

export const updateMeetup = async (
  meetup: Meetup & { id: string },
  authToken: string,
): Promise<Meetup> => {
  const response = await fetch(`${getResourceEndpoint()}/meetup/${meetup.id}`, {
    method: "PUT",
    headers: getHeaders(authToken),
    body: JSON.stringify(meetup),
  });
  if (!response.ok) throw new Error("Failed to update meetup");
  return response.json();
};

// Availability Services
export const getAvailabilities = async (
  authToken: string,
): Promise<Availability[]> => {
  const response = await fetch(`${getResourceEndpoint()}/availability`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) throw new Error("Failed to fetch availabilities");
  return response.json();
};

export const createAvailability = async (
  availability: Omit<Availability, "id">,
  authToken: string,
): Promise<Availability> => {
  const response = await fetch(`${getResourceEndpoint()}/availability`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(availability),
  });
  if (!response.ok) throw new Error("Failed to create availability");
  return response.json();
};

export const updateAvailability = async (
  availability: Availability & { id: string },
  authToken: string,
): Promise<Availability> => {
  const response = await fetch(
    `${getResourceEndpoint()}/availability/${availability.id}`,
    {
      method: "PUT",
      headers: getHeaders(authToken),
      body: JSON.stringify(availability),
    },
  );
  if (!response.ok) throw new Error("Failed to update availability");
  return response.json();
};

export const deleteAvailability = async (
  availabilityId: string,
  authToken: string,
): Promise<void> => {
  const response = await fetch(
    `${getResourceEndpoint()}/availability/${availabilityId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );
  if (!response.ok) throw new Error("Failed to delete availability");
};

// Tribe Services
export const getTribes = async (authToken: string): Promise<Tribe[]> => {
  const response = await fetch(`${getResourceEndpoint()}/tribe`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) throw new Error("Failed to fetch tribes");
  return response.json();
};

export const createTribe = async (
  tribe: Omit<Tribe, "id">,
  authToken: string,
): Promise<Tribe> => {
  const response = await fetch(`${getResourceEndpoint()}/tribe`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(tribe),
  });
  if (!response.ok) throw new Error("Failed to create tribe");
  return response.json();
};

export const updateTribe = async (
  tribe: Tribe & { id: string },
  authToken: string,
): Promise<Tribe> => {
  const response = await fetch(`${getResourceEndpoint()}/tribe/${tribe.id}`, {
    method: "PUT",
    headers: getHeaders(authToken),
    body: JSON.stringify(tribe),
  });
  if (!response.ok) throw new Error("Failed to update tribe");
  return response.json();
};

// TribeFam Services
export const getTribeFams = async (
  tribeId: string,
  authToken: string,
): Promise<TribeFam[]> => {
  const response = await fetch(
    `${getResourceEndpoint()}/tribe_fam?tribe_id=${encodeURIComponent(tribeId)}`,
    {
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch tribe fams");
  }
  return response.json();
};

export const createTribeFam = async (
  tribeFam: Omit<TribeFam, "id">,
  authToken: string,
): Promise<TribeFam> => {
  const response = await fetch(`${getResourceEndpoint()}/tribe_fam`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(tribeFam),
  });
  if (!response.ok) throw new Error("Failed to create tribe fam");
  return response.json();
};

export const deleteTribeFam = async (
  tribeFamId: string | undefined,
  tribeId: string,
  famId: string,
  authToken: string,
): Promise<void> => {
  const url = tribeFamId
    ? `${getResourceEndpoint()}/tribe_fam/${tribeFamId}`
    : `${getResourceEndpoint()}/tribe_fam?tribe_id=${encodeURIComponent(tribeId)}&fam_id=${encodeURIComponent(famId)}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) throw new Error("Failed to delete tribe fam");
};

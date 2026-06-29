import { getResourceEndpoint } from "../util";

import { Availability } from "./Availability";
import { Chat } from "./Chat";
import { ChatMember } from "./ChatMember";
import { Meetup } from "./Meetup";
import { Member } from "./Member";
import { MemberContact } from "./MemberContact";
import { Proposal } from "./Proposal";
import { Tribe } from "./Tribe";
import { TribeMember } from "./TribeMember";
import { UserDevice } from "./UserDevice";
import { Notification } from "./Notification";
import { MemberAlertPreference } from "./MemberAlertPreference";

const getHeaders = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

// MemberAlertPreference Services
export const getMemberAlertPreferences = async (
  memberId: string,
  authToken: string,
): Promise<MemberAlertPreference[]> => {
  const response = await fetch(
    `${getResourceEndpoint()}/member_alert_preference?member_id=${encodeURIComponent(memberId)}`,
    {
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );
  if (response.ok) {
    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  }
  return [];
};

export const updateMemberAlertPreference = async (
  pref: MemberAlertPreference & { id?: string },
  authToken: string,
): Promise<MemberAlertPreference> => {
  const idToUpdate = pref.id; 
  if (idToUpdate) {
    const response = await fetch(
      `${getResourceEndpoint()}/member_alert_preference/${idToUpdate}`,
      {
        method: "PUT",
        headers: getHeaders(authToken),
        body: JSON.stringify(pref),
      },
    );
    if (!response.ok) throw new Error("Failed to update preference");
    return response.json();
  } else {
    throw new Error("No ID provided for preference update");
  }
};

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

// Member Services
export const getMembers = async (authToken: string): Promise<Member[]> => {
  const response = await fetch(`${getResourceEndpoint()}/member`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch members");
  }
  return response.json();
};

export const createMember = async (
  member: Omit<Member, "id">,
  authToken: string,
): Promise<Member> => {
  const response = await fetch(`${getResourceEndpoint()}/member`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(member),
  });
  if (!response.ok) throw new Error("Failed to create member");
  return response.json();
};

export const updateMember = async (
  member: Member & { id: string },
  authToken: string,
): Promise<Member> => {
  const response = await fetch(`${getResourceEndpoint()}/member/${member.id}`, {
    method: "PUT",
    headers: getHeaders(authToken),
    body: JSON.stringify(member),
  });
  if (!response.ok) throw new Error("Failed to update member");
  return response.json();
};

export const checkInvite = async (email: string): Promise<Member | null> => {
  console.log(
    `Checking for invite with email ${email} at endpoint ${getResourceEndpoint()}/member/invite?email=${encodeURIComponent(email)}`,
  );
  const response = await fetch(
    `${getResourceEndpoint()}/member/invite?email=${encodeURIComponent(email)}`,
  );
  if (response.ok) {
    const data = await response.json();
    return data;
  }
  return null;
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

// Proposal Services
export const getProposals = async (
  authToken: string,
  hostId?: string,
  meetupId?: string,
): Promise<Proposal[]> => {
  let url = `${getResourceEndpoint()}/proposal`;
  if (hostId && meetupId) {
    url += `?host_id=${encodeURIComponent(hostId)}&meetup_id=${encodeURIComponent(meetupId)}`;
  } else if (hostId) {
    url += `?host_id=${encodeURIComponent(hostId)}`;
  } else if (meetupId) {
    url += `?meetup_id=${encodeURIComponent(meetupId)}`;
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch proposals");
  }
  return response.json();
};

export const createProposal = async (
  proposal: Omit<Proposal, "id">,
  authToken: string,
): Promise<Proposal> => {
  const response = await fetch(`${getResourceEndpoint()}/proposal`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(proposal),
  });
  if (!response.ok) throw new Error("Failed to create proposal");
  return response.json();
};

export const updateProposal = async (
  proposal: Proposal & { id: string },
  authToken: string,
): Promise<Proposal> => {
  const response = await fetch(
    `${getResourceEndpoint()}/proposal/${proposal.id}`,
    {
      method: "PUT",
      headers: getHeaders(authToken),
      body: JSON.stringify(proposal),
    },
  );
  if (!response.ok) throw new Error("Failed to update proposal");
  return response.json();
};

export const deleteProposal = async (
  proposalId: string,
  authToken: string,
): Promise<void> => {
  const response = await fetch(
    `${getResourceEndpoint()}/proposal/${proposalId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );
  if (!response.ok) throw new Error("Failed to delete proposal");
};

// Availability Services
export const getAvailabilities = async (
  authToken: string,
  memberId?: string,
  proposalId?: string,
): Promise<Availability[]> => {
  let url = `${getResourceEndpoint()}/availability`;
  if (memberId && proposalId) {
    url += `?member_id=${encodeURIComponent(memberId)}&proposal_id=${encodeURIComponent(proposalId)}`;
  } else if (memberId) {
    url += `?member_id=${encodeURIComponent(memberId)}`;
  } else if (proposalId) {
    url += `?proposal_id=${encodeURIComponent(proposalId)}`;
  }
  const response = await fetch(url, {
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

// TribeMember Services
export const getTribeMembers = async (
  tribeId: string,
  authToken: string,
): Promise<TribeMember[]> => {
  const response = await fetch(
    `${getResourceEndpoint()}/tribe_member?tribe_id=${encodeURIComponent(tribeId)}`,
    {
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch tribe members");
  }
  return response.json();
};

export const getTribeMembersByMemberId = async (
  memberId: string,
  authToken: string,
): Promise<TribeMember[]> => {
  const response = await fetch(
    `${getResourceEndpoint()}/tribe_member?member_id=${encodeURIComponent(memberId)}`,
    {
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch tribe members by member id");
  }
  return response.json();
};

export const createTribeMember = async (
  tribeMember: Omit<TribeMember, "id">,
  authToken: string,
): Promise<TribeMember> => {
  const response = await fetch(`${getResourceEndpoint()}/tribe_member`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(tribeMember),
  });
  if (!response.ok) throw new Error("Failed to create tribe member");
  return response.json();
};

export const deleteTribeMember = async (
  tribeMemberId: string | undefined,
  tribeId: string,
  memberId: string,
  authToken: string,
): Promise<void> => {
  const url = tribeMemberId
    ? `${getResourceEndpoint()}/tribe_member/${tribeMemberId}`
    : `${getResourceEndpoint()}/tribe_member?tribe_id=${encodeURIComponent(tribeId)}&member_id=${encodeURIComponent(memberId)}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) throw new Error("Failed to delete tribe member");
};

// MemberContact Services
export interface GroupedMemberContacts {
  acceptedSources: MemberContact[];
  acceptedSubjects: MemberContact[];
  invitedSources: MemberContact[];
  invitedSubjects: MemberContact[];
}

export const getMemberContacts = async (
  authToken: string,
  memberId: string,
): Promise<GroupedMemberContacts> => {
  const [sourceRes, subjectRes] = await Promise.all([
    fetch(
      `${getResourceEndpoint()}/member_contact?source_id=${encodeURIComponent(memberId)}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    ),
    fetch(
      `${getResourceEndpoint()}/member_contact?subject_id=${encodeURIComponent(memberId)}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    ),
  ]);

  if (!sourceRes.ok && sourceRes.status !== 404)
    throw new Error("Failed to fetch member contacts");
  if (!subjectRes.ok && subjectRes.status !== 404)
    throw new Error("Failed to fetch member contacts");

  const sourceContacts: MemberContact[] = sourceRes.ok
    ? await sourceRes.json()
    : [];
  const subjectContacts: MemberContact[] = subjectRes.ok
    ? await subjectRes.json()
    : [];

  const result: GroupedMemberContacts = {
    acceptedSources: [],
    acceptedSubjects: [],
    invitedSources: [],
    invitedSubjects: [],
  };

  sourceContacts.forEach((contact) => {
    if (contact.status === "accepted") result.acceptedSources.push(contact);
    else if (contact.status === "invited") result.invitedSources.push(contact);
  });

  subjectContacts.forEach((contact) => {
    if (contact.status === "accepted") result.acceptedSubjects.push(contact);
    else if (contact.status === "invited") result.invitedSubjects.push(contact);
  });

  return result;
};

export const createMemberContact = async (
  memberContact: Omit<MemberContact, "id">,
  authToken: string,
): Promise<MemberContact> => {
  const response = await fetch(`${getResourceEndpoint()}/member_contact`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(memberContact),
  });
  if (!response.ok) throw new Error("Failed to create member contact");
  return response.json();
};

export const updateMemberContact = async (
  memberContact: MemberContact,
  authToken: string,
): Promise<MemberContact> => {
  const response = await fetch(
    `${getResourceEndpoint()}/member_contact/${memberContact.id}`,
    {
      method: "PUT",
      headers: getHeaders(authToken),
      body: JSON.stringify(memberContact),
    },
  );
  if (!response.ok) throw new Error("Failed to update member contact");
  return response.json();
};

export const deleteMemberContact = async (
  id: string,
  authToken: string,
): Promise<void> => {
  const response = await fetch(
    `${getResourceEndpoint()}/member_contact/${id}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );
  if (!response.ok) throw new Error("Failed to delete member contact");
};

// Chat Services
export const getChats = async (authToken: string): Promise<Chat[]> => {
  const response = await fetch(`${getResourceEndpoint()}/chat`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch chats");
  }
  return response.json();
};

export const createChat = async (
  chat: Omit<Chat, "id">,
  authToken: string,
): Promise<Chat> => {
  const response = await fetch(`${getResourceEndpoint()}/chat`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(chat),
  });
  if (!response.ok) throw new Error("Failed to create chat");
  return response.json();
};

// ChatMember Services
export const getChatMembers = async (
  authToken: string,
  chatId?: string,
): Promise<ChatMember[]> => {
  let url = `${getResourceEndpoint()}/chat_member`;
  if (chatId) {
    url += `?chat_id=${encodeURIComponent(chatId)}`;
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch chat members");
  }
  return response.json();
};

export const createChatMember = async (
  chatMember: Omit<ChatMember, "id">,
  authToken: string,
): Promise<ChatMember> => {
  const response = await fetch(`${getResourceEndpoint()}/chat_member`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(chatMember),
  });
  if (!response.ok) throw new Error("Failed to create chat member");
  return response.json();
};

// Notification Services
export const getNotifications = async (
  authToken: string,
  memberId?: string,
): Promise<Notification[]> => {
  let url = `${getResourceEndpoint()}/notification`;
  if (memberId) {
    url += `?member_id=${encodeURIComponent(memberId)}`;
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch notifications");
  }
  return response.json();
};

export const createNotification = async (
  notification: Omit<Notification, "id">,
  authToken: string,
): Promise<Notification> => {
  const response = await fetch(`${getResourceEndpoint()}/notification`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(notification),
  });
  if (!response.ok) throw new Error("Failed to create notification");
  return response.json();
};

export const updateNotification = async (
  notification: Notification & { id: string },
  authToken: string,
): Promise<Notification> => {
  const response = await fetch(
    `${getResourceEndpoint()}/notification/${notification.id}`,
    {
      method: "PUT",
      headers: getHeaders(authToken),
      body: JSON.stringify(notification),
    },
  );
  if (!response.ok) throw new Error("Failed to update notification");
  return response.json();
};

export const deleteNotification = async (
  notificationId: string,
  authToken: string,
): Promise<void> => {
  const response = await fetch(
    `${getResourceEndpoint()}/notification/${notificationId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );
  if (!response.ok) throw new Error("Failed to delete notification");
};

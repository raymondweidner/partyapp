import { getResourceEndpoint } from "../util";
import { Platform } from "react-native";
import { Availability } from "./Availability";
import { Chat } from "./Chat";
import { ChatMember } from "./ChatMember";
import { Meetup } from "./Meetup";
import { MeetupEvent } from "./MeetupEvent";
import { Member } from "./Member";
import { MemberContact } from "./MemberContact";
import { Proposal } from "./Proposal";
import { Tribe } from "./Tribe";
import { TribeMember } from "./TribeMember";
import { UserDevice } from "./UserDevice";
import { Notification } from "./Notification";
import { MemberAlertPreference } from "./MemberAlertPreference";
import { Poll } from "./Poll";
import { PollEntry } from "./PollEntry";
import { PollVote } from "./PollVote";
import { PollWinner } from "./PollWinner";
import { HelpRegistry } from "./HelpRegistry";
import { RegistryItem } from "./RegistryItem";
import { TribalCouncil } from "./TribalCouncil";
import { EventCheckIn } from "./EventCheckIn";

const getHeaders = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

// MemberAlertPreference Services
export const getMemberAlertPreferences = async (
  authToken: string,
  memberId: string
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

export const createMemberAlertPreference = async (
  authToken: string,
  pref: Omit<MemberAlertPreference, "id">
): Promise<MemberAlertPreference> => {
  const response = await fetch(`${getResourceEndpoint()}/member_alert_preference`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(pref),
  });
  if (!response.ok) throw new Error("Failed to create preference");
  return response.json();
};

export const updateMemberAlertPreference = async (
  authToken: string,
  pref: MemberAlertPreference & { id?: string }
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

// EventCheckIn Services
export const getEventCheckIns = async (
  authToken: string,
  eventId: string
): Promise<EventCheckIn[]> => {
  const response = await fetch(
    `${getResourceEndpoint()}/event_check_in?meetup_event_id=${encodeURIComponent(eventId)}`,
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

export const checkInEvent = async (
  authToken: string,
  eventId: string,
  latitude: number,
  longitude: number
): Promise<EventCheckIn> => {
  const response = await fetch(`${getResourceEndpoint()}/meetup_event/${eventId}/checkin`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify({ latitude, longitude }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to check in");
  }
  return response.json();
};

export const checkOutEvent = async (
  authToken: string,
  eventId: string
): Promise<void> => {
  const response = await fetch(`${getResourceEndpoint()}/meetup_event/${eventId}/checkout`, {
    method: "POST",
    headers: getHeaders(authToken),
  });
  if (!response.ok) {
    throw new Error("Failed to check out");
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
  authToken: string,
  device: Omit<UserDevice, "id">
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
  authToken: string,
  device: UserDevice
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
  authToken: string,
  deviceId: string
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
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch members: ${response.status} ${response.statusText} - ${text}`);
  }
  return response.json();
};

export const createMember = async (
  authToken: string,
  member: Omit<Member, "id">
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
  authToken: string,
  member: Member & { id: string }
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
  authToken: string,
  meetup: Omit<Meetup, "id">
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
  authToken: string,
  meetup: Meetup & { id: string }
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
  authToken: string,
  proposal: Omit<Proposal, "id">
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
  authToken: string,
  proposal: Proposal & { id: string }
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
  authToken: string,
  proposalId: string
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
  authToken: string,
  availability: Omit<Availability, "id">
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
  authToken: string,
  availability: Availability & { id: string }
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
  authToken: string,
  availabilityId: string
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
  authToken: string,
  tribe: Omit<Tribe, "id">
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
  authToken: string,
  tribe: Tribe & { id: string }
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
  authToken: string,
  tribeId: string
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
  authToken: string,
  memberId: string
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
  authToken: string,
  tribeMember: Omit<TribeMember, "id">
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
  authToken: string,
  tribeMemberId: string | undefined,
  tribeId: string,
  memberId: string
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
    const status = contact.status?.toLowerCase();
    if (status === "accepted") result.acceptedSources.push(contact);
    else if (status === "invited") result.invitedSources.push(contact);
  });

  subjectContacts.forEach((contact) => {
    const status = contact.status?.toLowerCase();
    if (status === "accepted") result.acceptedSubjects.push(contact);
    else if (status === "invited") result.invitedSubjects.push(contact);
  });

  return result;
};

export const createMemberContact = async (
  authToken: string,
  memberContact: Omit<MemberContact, "id">
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
  authToken: string,
  memberContact: MemberContact
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
  authToken: string,
  id: string
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
  authToken: string,
  chat: Omit<Chat, "id">
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
  authToken: string,
  chatMember: Omit<ChatMember, "id">
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
  authToken: string,
  notification: Omit<Notification, "id">
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
  authToken: string,
  notification: Notification & { id: string }
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
  authToken: string,
  notificationId: string
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

// Poll Services
export const getPolls = async (
  authToken: string,
  meetupId?: string,
): Promise<Poll[]> => {
  let url = `${getResourceEndpoint()}/poll`;
  if (meetupId) {
    url += `?meetup_id=${encodeURIComponent(meetupId)}`;
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch polls");
  }
  return response.json();
};

export const getPollEntries = async (
  authToken: string,
  pollId?: string,
): Promise<PollEntry[]> => {
  let url = `${getResourceEndpoint()}/poll_entry`;
  if (pollId) {
    url += `?poll_id=${encodeURIComponent(pollId)}`;
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch poll entries");
  }
  return response.json();
};

export const getPollVotes = async (
  authToken: string,
  pollId?: string,
): Promise<PollVote[]> => {
  let url = `${getResourceEndpoint()}/poll_vote`;
  if (pollId) {
    url += `?poll_id=${encodeURIComponent(pollId)}`;
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch poll votes");
  }
  return response.json();
};

export const createPoll = async (
  authToken: string,
  poll: Omit<Poll, "id">
): Promise<Poll> => {
  const response = await fetch(`${getResourceEndpoint()}/poll`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(poll),
  });
  if (!response.ok) throw new Error("Failed to create poll");
  return response.json();
};

export const getPoll = async (
  authToken: string,
  pollId: string
): Promise<Poll> => {
  const response = await fetch(`${getResourceEndpoint()}/poll/${pollId}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch poll");
  }
  return response.json();
};

export const updatePollEntry = async (
  authToken: string,
  entry: Partial<PollEntry>
): Promise<PollEntry> => {
  const { id, ...data } = entry;
  const res = await fetch(`${getResourceEndpoint()}/poll_entry/${id}`, {
    method: "PUT",
    headers: getHeaders(authToken),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deletePollEntry = async (authToken: string, id: string): Promise<void> => {
  await fetch(`${getResourceEndpoint()}/poll_entry/${id}`, {
    method: "DELETE",
    headers: getHeaders(authToken),
  });
};

export const updatePoll = async (
  authToken: string,
  poll: Poll & { id: string }
): Promise<Poll> => {
  const response = await fetch(`${getResourceEndpoint()}/poll/${poll.id}`, {
    method: "PUT",
    headers: getHeaders(authToken),
    body: JSON.stringify(poll),
  });
  if (!response.ok) throw new Error("Failed to update poll");
  return response.json();
};

// PollVote Services
export const createPollVote = async (
  authToken: string,
  vote: Omit<PollVote, "id">
): Promise<PollVote> => {
  const response = await fetch(`${getResourceEndpoint()}/poll_vote`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(vote),
  });
  if (!response.ok) throw new Error("Failed to create poll vote");
  return response.json();
};

export const updatePollVote = async (
  authToken: string,
  vote: PollVote & { id: string }
): Promise<PollVote> => {
  const response = await fetch(`${getResourceEndpoint()}/poll_vote/${vote.id}`, {
    method: "PUT",
    headers: getHeaders(authToken),
    body: JSON.stringify(vote),
  });
  if (!response.ok) throw new Error("Failed to update poll vote");
  return response.json();
};

export const deletePollVote = async (
  authToken: string,
  voteId: string
): Promise<void> => {
  const response = await fetch(`${getResourceEndpoint()}/poll_vote/${voteId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) throw new Error("Failed to delete poll vote");
};

// PollWinner Services
export const getPollWinners = async (
  authToken: string,
  pollId?: string,
): Promise<PollWinner[]> => {
  let url = `${getResourceEndpoint()}/poll_winner`;
  if (pollId) {
    url += `?poll_id=${encodeURIComponent(pollId)}`;
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch poll winners");
  }
  return response.json();
};

export const createPollWinner = async (
  authToken: string,
  winner: Omit<PollWinner, "id">
): Promise<PollWinner> => {
  const response = await fetch(`${getResourceEndpoint()}/poll_winner`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(winner),
  });
  if (!response.ok) throw new Error("Failed to create poll winner");
  return response.json();
};

export const updatePollWinner = async (
  authToken: string,
  winner: PollWinner & { id?: string }
): Promise<PollWinner> => {
  const idToUpdate = winner.id;
  if (!idToUpdate) throw new Error("No ID provided for winner update");

  const response = await fetch(
    `${getResourceEndpoint()}/poll_winner/${idToUpdate}`,
    {
      method: "PUT",
      headers: getHeaders(authToken),
      body: JSON.stringify(winner),
    },
  );
  if (!response.ok) throw new Error("Failed to update poll winner");
  return response.json();
};

// MeetupEvent Services
export const getMeetupEvents = async (
  authToken: string,
  meetupId: string
): Promise<MeetupEvent[]> => {
  const response = await fetch(
    `${getResourceEndpoint()}/meetup_event?meetup_id=${encodeURIComponent(meetupId)}`,
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

export const createMeetupEvent = async (
  authToken: string,
  meetupEvent: Omit<MeetupEvent, "id">
): Promise<MeetupEvent> => {
  const response = await fetch(`${getResourceEndpoint()}/meetup_event`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(meetupEvent),
  });
  if (!response.ok) throw new Error("Failed to create meetup event");
  return response.json();
};

export const updateMeetupEvent = async (
  authToken: string,
  meetupEvent: MeetupEvent & { id: string }
): Promise<MeetupEvent> => {
  const response = await fetch(
    `${getResourceEndpoint()}/meetup_event/${meetupEvent.id}`,
    {
      method: "PUT",
      headers: getHeaders(authToken),
      body: JSON.stringify(meetupEvent),
    },
  );
  if (!response.ok) throw new Error("Failed to update meetup event");
  return response.json();
};

export const deleteMeetupEvent = async (
  authToken: string,
  meetupEventId: string
): Promise<void> => {
  const response = await fetch(
    `${getResourceEndpoint()}/meetup_event/${meetupEventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );
  if (!response.ok) throw new Error("Failed to delete meetup event");
};

export const deletePollWinner = async (
  authToken: string,
  winnerId: string
): Promise<void> => {
  const response = await fetch(`${getResourceEndpoint()}/poll_winner/${winnerId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) throw new Error("Failed to delete poll winner");
};

// Media Services
export const uploadMedia = async (
  authToken: string,
  uri: string,
  filename: string,
  mimeType: string,
  meetupId: string,
  pollId: string,
  caption?: string
): Promise<{ success: boolean; fileId?: string }> => {
  const formData = new FormData();
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append("file", blob, filename);
  } else {
    formData.append("file", {
      uri,
      name: filename,
      type: mimeType,
    } as any);
  }

  let url = `${getResourceEndpoint()}/media/${encodeURIComponent(filename)}?meetup_id=${encodeURIComponent(meetupId)}`;
  if (pollId) {
    url += `&poll_id=${encodeURIComponent(pollId)}`;
  }
  if (caption) {
    url += `&caption=${encodeURIComponent(caption)}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload media: ${response.statusText}`);
  }

  return response.json();
};

// HelpRegistry Services
export const getHelpRegistries = async (
  authToken: string,
  proposalId?: string,
  meetupEventId?: string
): Promise<HelpRegistry[]> => {
  let url = `${getResourceEndpoint()}/help_registry`;
  if (proposalId) {
    url += `?proposal_id=${encodeURIComponent(proposalId)}`;
  } else if (meetupEventId) {
    url += `?meetup_event_id=${encodeURIComponent(meetupEventId)}`;
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch help registries");
  }
  return response.json();
};

export const getHelpRegistry = async (
  authToken: string,
  id: string
): Promise<HelpRegistry> => {
  const response = await fetch(`${getResourceEndpoint()}/help_registry/${id}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch help registry");
  }
  return response.json();
};

export const createHelpRegistry = async (
  authToken: string,
  registry: Omit<HelpRegistry, "id">
): Promise<HelpRegistry> => {
  const response = await fetch(`${getResourceEndpoint()}/help_registry`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(registry),
  });
  if (!response.ok) throw new Error("Failed to create help registry");
  return response.json();
};

export const updateHelpRegistry = async (
  authToken: string,
  registry: HelpRegistry & { id: string }
): Promise<HelpRegistry> => {
  const response = await fetch(`${getResourceEndpoint()}/help_registry/${registry.id}`, {
    method: "PUT",
    headers: getHeaders(authToken),
    body: JSON.stringify(registry),
  });
  if (!response.ok) throw new Error("Failed to update help registry");
  return response.json();
};

export const deleteHelpRegistry = async (
  authToken: string,
  id: string
): Promise<void> => {
  const response = await fetch(`${getResourceEndpoint()}/help_registry/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) throw new Error("Failed to delete help registry");
};

// RegistryItem Services
export const getRegistryItems = async (
  authToken: string,
  helpRegistryId: string
): Promise<RegistryItem[]> => {
  const response = await fetch(
    `${getResourceEndpoint()}/registry_item?help_registry_id=${encodeURIComponent(helpRegistryId)}`,
    {
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch registry items");
  }
  return response.json();
};

export const createRegistryItem = async (
  authToken: string,
  item: Omit<RegistryItem, "id">
): Promise<RegistryItem> => {
  const response = await fetch(`${getResourceEndpoint()}/registry_item`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(item),
  });
  if (!response.ok) throw new Error("Failed to create registry item");
  return response.json();
};

export const updateRegistryItem = async (
  authToken: string,
  item: RegistryItem & { id: string }
): Promise<RegistryItem> => {
  const response = await fetch(`${getResourceEndpoint()}/registry_item/${item.id}`, {
    method: "PUT",
    headers: getHeaders(authToken),
    body: JSON.stringify(item),
  });
  if (!response.ok) throw new Error("Failed to update registry item");
  return response.json();
};

export const deleteRegistryItem = async (
  authToken: string,
  id: string
): Promise<void> => {
  const response = await fetch(`${getResourceEndpoint()}/registry_item/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) throw new Error("Failed to delete registry item");
};

// TribalCouncil Services
export const getTribalCouncils = async (
  authToken: string,
  meetupId: string
): Promise<TribalCouncil[]> => {
  const response = await fetch(
    `${getResourceEndpoint()}/tribal_council?meetup_id=${encodeURIComponent(meetupId)}`,
    {
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch tribal councils");
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [data];
};

export const createTribalCouncil = async (
  authToken: string,
  council: Omit<TribalCouncil, "id">
): Promise<TribalCouncil> => {
  const response = await fetch(`${getResourceEndpoint()}/tribal_council`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(council),
  });
  if (!response.ok) throw new Error("Failed to create tribal council");
  return response.json();
};

export const deleteTribalCouncil = async (
  authToken: string,
  id: string
): Promise<void> => {
  const response = await fetch(`${getResourceEndpoint()}/tribal_council/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) throw new Error("Failed to delete tribal council");
};

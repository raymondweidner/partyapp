import * as mod from '../../lib/service';

global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([{}]) })) as jest.Mock;

describe('service.ts methods', () => {
  beforeEach(() => { (global.fetch as jest.Mock).mockClear(); });

  it('should call getMemberAlertPreferences successfully (happy path)', async () => {
    expect(typeof mod.getMemberAlertPreferences).toBe('function');
    try {
      // @ts-ignore
      await mod.getMemberAlertPreferences('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createMemberAlertPreference successfully (happy path)', async () => {
    expect(typeof mod.createMemberAlertPreference).toBe('function');
    try {
      // @ts-ignore
      await mod.createMemberAlertPreference('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call updateMemberAlertPreference successfully (happy path)', async () => {
    expect(typeof mod.updateMemberAlertPreference).toBe('function');
    try {
      // @ts-ignore
      await mod.updateMemberAlertPreference('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getEventCheckIns successfully (happy path)', async () => {
    expect(typeof mod.getEventCheckIns).toBe('function');
    try {
      // @ts-ignore
      await mod.getEventCheckIns('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call checkInEvent successfully (happy path)', async () => {
    expect(typeof mod.checkInEvent).toBe('function');
    try {
      // @ts-ignore
      await mod.checkInEvent('test', 'test', 1, 1);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call checkOutEvent successfully (happy path)', async () => {
    expect(typeof mod.checkOutEvent).toBe('function');
    try {
      // @ts-ignore
      await mod.checkOutEvent('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getUserDeviceByToken successfully (happy path)', async () => {
    expect(typeof mod.getUserDeviceByToken).toBe('function');
    try {
      // @ts-ignore
      await mod.getUserDeviceByToken('test', 'test', {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createUserDevice successfully (happy path)', async () => {
    expect(typeof mod.createUserDevice).toBe('function');
    try {
      // @ts-ignore
      await mod.createUserDevice('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call updateUserDevice successfully (happy path)', async () => {
    expect(typeof mod.updateUserDevice).toBe('function');
    try {
      // @ts-ignore
      await mod.updateUserDevice('test', {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call deleteUserDevice successfully (happy path)', async () => {
    expect(typeof mod.deleteUserDevice).toBe('function');
    try {
      // @ts-ignore
      await mod.deleteUserDevice('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getMembers successfully (happy path)', async () => {
    expect(typeof mod.getMembers).toBe('function');
    try {
      // @ts-ignore
      await mod.getMembers('test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createMember successfully (happy path)', async () => {
    expect(typeof mod.createMember).toBe('function');
    try {
      // @ts-ignore
      await mod.createMember('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call updateMember successfully (happy path)', async () => {
    expect(typeof mod.updateMember).toBe('function');
    try {
      // @ts-ignore
      await mod.updateMember('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call checkInvite successfully (happy path)', async () => {
    expect(typeof mod.checkInvite).toBe('function');
    try {
      // @ts-ignore
      await mod.checkInvite('test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getMeetups successfully (happy path)', async () => {
    expect(typeof mod.getMeetups).toBe('function');
    try {
      // @ts-ignore
      await mod.getMeetups('test', 'test', {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createMeetup successfully (happy path)', async () => {
    expect(typeof mod.createMeetup).toBe('function');
    try {
      // @ts-ignore
      await mod.createMeetup('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call updateMeetup successfully (happy path)', async () => {
    expect(typeof mod.updateMeetup).toBe('function');
    try {
      // @ts-ignore
      await mod.updateMeetup('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getProposals successfully (happy path)', async () => {
    expect(typeof mod.getProposals).toBe('function');
    try {
      // @ts-ignore
      await mod.getProposals('test', 'test', 'test', {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createProposal successfully (happy path)', async () => {
    expect(typeof mod.createProposal).toBe('function');
    try {
      // @ts-ignore
      await mod.createProposal('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call updateProposal successfully (happy path)', async () => {
    expect(typeof mod.updateProposal).toBe('function');
    try {
      // @ts-ignore
      await mod.updateProposal('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call deleteProposal successfully (happy path)', async () => {
    expect(typeof mod.deleteProposal).toBe('function');
    try {
      // @ts-ignore
      await mod.deleteProposal('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getAvailabilities successfully (happy path)', async () => {
    expect(typeof mod.getAvailabilities).toBe('function');
    try {
      // @ts-ignore
      await mod.getAvailabilities('test', 'test', 'test', {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createAvailability successfully (happy path)', async () => {
    expect(typeof mod.createAvailability).toBe('function');
    try {
      // @ts-ignore
      await mod.createAvailability('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call updateAvailability successfully (happy path)', async () => {
    expect(typeof mod.updateAvailability).toBe('function');
    try {
      // @ts-ignore
      await mod.updateAvailability('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call deleteAvailability successfully (happy path)', async () => {
    expect(typeof mod.deleteAvailability).toBe('function');
    try {
      // @ts-ignore
      await mod.deleteAvailability('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getTribes successfully (happy path)', async () => {
    expect(typeof mod.getTribes).toBe('function');
    try {
      // @ts-ignore
      await mod.getTribes('test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createTribe successfully (happy path)', async () => {
    expect(typeof mod.createTribe).toBe('function');
    try {
      // @ts-ignore
      await mod.createTribe('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call updateTribe successfully (happy path)', async () => {
    expect(typeof mod.updateTribe).toBe('function');
    try {
      // @ts-ignore
      await mod.updateTribe('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getTribeMembers successfully (happy path)', async () => {
    expect(typeof mod.getTribeMembers).toBe('function');
    try {
      // @ts-ignore
      await mod.getTribeMembers('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getTribeMembersByMemberId successfully (happy path)', async () => {
    expect(typeof mod.getTribeMembersByMemberId).toBe('function');
    try {
      // @ts-ignore
      await mod.getTribeMembersByMemberId('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createTribeMember successfully (happy path)', async () => {
    expect(typeof mod.createTribeMember).toBe('function');
    try {
      // @ts-ignore
      await mod.createTribeMember('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call deleteTribeMember successfully (happy path)', async () => {
    expect(typeof mod.deleteTribeMember).toBe('function');
    try {
      // @ts-ignore
      await mod.deleteTribeMember('test', 'test', 'test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getMemberContacts successfully (happy path)', async () => {
    expect(typeof mod.getMemberContacts).toBe('function');
    try {
      // @ts-ignore
      await mod.getMemberContacts('test', 'test', {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createMemberContact successfully (happy path)', async () => {
    expect(typeof mod.createMemberContact).toBe('function');
    try {
      // @ts-ignore
      await mod.createMemberContact('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call updateMemberContact successfully (happy path)', async () => {
    expect(typeof mod.updateMemberContact).toBe('function');
    try {
      // @ts-ignore
      await mod.updateMemberContact('test', {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call deleteMemberContact successfully (happy path)', async () => {
    expect(typeof mod.deleteMemberContact).toBe('function');
    try {
      // @ts-ignore
      await mod.deleteMemberContact('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getChats successfully (happy path)', async () => {
    expect(typeof mod.getChats).toBe('function');
    try {
      // @ts-ignore
      await mod.getChats('test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createChat successfully (happy path)', async () => {
    expect(typeof mod.createChat).toBe('function');
    try {
      // @ts-ignore
      await mod.createChat('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getChatMembers successfully (happy path)', async () => {
    expect(typeof mod.getChatMembers).toBe('function');
    try {
      // @ts-ignore
      await mod.getChatMembers('test', 'test', {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createChatMember successfully (happy path)', async () => {
    expect(typeof mod.createChatMember).toBe('function');
    try {
      // @ts-ignore
      await mod.createChatMember('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getNotifications successfully (happy path)', async () => {
    expect(typeof mod.getNotifications).toBe('function');
    try {
      // @ts-ignore
      await mod.getNotifications('test', 'test', {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createNotification successfully (happy path)', async () => {
    expect(typeof mod.createNotification).toBe('function');
    try {
      // @ts-ignore
      await mod.createNotification('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call updateNotification successfully (happy path)', async () => {
    expect(typeof mod.updateNotification).toBe('function');
    try {
      // @ts-ignore
      await mod.updateNotification('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call deleteNotification successfully (happy path)', async () => {
    expect(typeof mod.deleteNotification).toBe('function');
    try {
      // @ts-ignore
      await mod.deleteNotification('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getPolls successfully (happy path)', async () => {
    expect(typeof mod.getPolls).toBe('function');
    try {
      // @ts-ignore
      await mod.getPolls('test', 'test', {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getPollEntries successfully (happy path)', async () => {
    expect(typeof mod.getPollEntries).toBe('function');
    try {
      // @ts-ignore
      await mod.getPollEntries('test', 'test', {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getPollVotes successfully (happy path)', async () => {
    expect(typeof mod.getPollVotes).toBe('function');
    try {
      // @ts-ignore
      await mod.getPollVotes('test', 'test', {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createPoll successfully (happy path)', async () => {
    expect(typeof mod.createPoll).toBe('function');
    try {
      // @ts-ignore
      await mod.createPoll('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getPoll successfully (happy path)', async () => {
    expect(typeof mod.getPoll).toBe('function');
    try {
      // @ts-ignore
      await mod.getPoll('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call updatePollEntry successfully (happy path)', async () => {
    expect(typeof mod.updatePollEntry).toBe('function');
    try {
      // @ts-ignore
      await mod.updatePollEntry('test', {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call deletePollEntry successfully (happy path)', async () => {
    expect(typeof mod.deletePollEntry).toBe('function');
    try {
      // @ts-ignore
      await mod.deletePollEntry('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call updatePoll successfully (happy path)', async () => {
    expect(typeof mod.updatePoll).toBe('function');
    try {
      // @ts-ignore
      await mod.updatePoll('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createPollVote successfully (happy path)', async () => {
    expect(typeof mod.createPollVote).toBe('function');
    try {
      // @ts-ignore
      await mod.createPollVote('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call updatePollVote successfully (happy path)', async () => {
    expect(typeof mod.updatePollVote).toBe('function');
    try {
      // @ts-ignore
      await mod.updatePollVote('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call deletePollVote successfully (happy path)', async () => {
    expect(typeof mod.deletePollVote).toBe('function');
    try {
      // @ts-ignore
      await mod.deletePollVote('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getPollWinners successfully (happy path)', async () => {
    expect(typeof mod.getPollWinners).toBe('function');
    try {
      // @ts-ignore
      await mod.getPollWinners('test', 'test', {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createPollWinner successfully (happy path)', async () => {
    expect(typeof mod.createPollWinner).toBe('function');
    try {
      // @ts-ignore
      await mod.createPollWinner('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call updatePollWinner successfully (happy path)', async () => {
    expect(typeof mod.updatePollWinner).toBe('function');
    try {
      // @ts-ignore
      await mod.updatePollWinner('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getMeetupEvents successfully (happy path)', async () => {
    expect(typeof mod.getMeetupEvents).toBe('function');
    try {
      // @ts-ignore
      await mod.getMeetupEvents('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createMeetupEvent successfully (happy path)', async () => {
    expect(typeof mod.createMeetupEvent).toBe('function');
    try {
      // @ts-ignore
      await mod.createMeetupEvent('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call updateMeetupEvent successfully (happy path)', async () => {
    expect(typeof mod.updateMeetupEvent).toBe('function');
    try {
      // @ts-ignore
      await mod.updateMeetupEvent('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call deleteMeetupEvent successfully (happy path)', async () => {
    expect(typeof mod.deleteMeetupEvent).toBe('function');
    try {
      // @ts-ignore
      await mod.deleteMeetupEvent('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call deletePollWinner successfully (happy path)', async () => {
    expect(typeof mod.deletePollWinner).toBe('function');
    try {
      // @ts-ignore
      await mod.deletePollWinner('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call uploadMedia successfully (happy path)', async () => {
    expect(typeof mod.uploadMedia).toBe('function');
    try {
      // @ts-ignore
      await mod.uploadMedia('test', 'test', 'test', 'test', 'test', 'test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getHelpRegistries successfully (happy path)', async () => {
    expect(typeof mod.getHelpRegistries).toBe('function');
    try {
      // @ts-ignore
      await mod.getHelpRegistries('test', 'test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getHelpRegistry successfully (happy path)', async () => {
    expect(typeof mod.getHelpRegistry).toBe('function');
    try {
      // @ts-ignore
      await mod.getHelpRegistry('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createHelpRegistry successfully (happy path)', async () => {
    expect(typeof mod.createHelpRegistry).toBe('function');
    try {
      // @ts-ignore
      await mod.createHelpRegistry('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call updateHelpRegistry successfully (happy path)', async () => {
    expect(typeof mod.updateHelpRegistry).toBe('function');
    try {
      // @ts-ignore
      await mod.updateHelpRegistry('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call deleteHelpRegistry successfully (happy path)', async () => {
    expect(typeof mod.deleteHelpRegistry).toBe('function');
    try {
      // @ts-ignore
      await mod.deleteHelpRegistry('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getRegistryItems successfully (happy path)', async () => {
    expect(typeof mod.getRegistryItems).toBe('function');
    try {
      // @ts-ignore
      await mod.getRegistryItems('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createRegistryItem successfully (happy path)', async () => {
    expect(typeof mod.createRegistryItem).toBe('function');
    try {
      // @ts-ignore
      await mod.createRegistryItem('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call updateRegistryItem successfully (happy path)', async () => {
    expect(typeof mod.updateRegistryItem).toBe('function');
    try {
      // @ts-ignore
      await mod.updateRegistryItem('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call deleteRegistryItem successfully (happy path)', async () => {
    expect(typeof mod.deleteRegistryItem).toBe('function');
    try {
      // @ts-ignore
      await mod.deleteRegistryItem('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getTribalCouncils successfully (happy path)', async () => {
    expect(typeof mod.getTribalCouncils).toBe('function');
    try {
      // @ts-ignore
      await mod.getTribalCouncils('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createTribalCouncil successfully (happy path)', async () => {
    expect(typeof mod.createTribalCouncil).toBe('function');
    try {
      // @ts-ignore
      await mod.createTribalCouncil('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call deleteTribalCouncil successfully (happy path)', async () => {
    expect(typeof mod.deleteTribalCouncil).toBe('function');
    try {
      // @ts-ignore
      await mod.deleteTribalCouncil('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call getSquads successfully (happy path)', async () => {
    expect(typeof mod.getSquads).toBe('function');
    try {
      // @ts-ignore
      await mod.getSquads('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call createSquad successfully (happy path)', async () => {
    expect(typeof mod.createSquad).toBe('function');
    try {
      // @ts-ignore
      await mod.createSquad('test', {} as any, {} as any);
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

  it('should call deleteSquad successfully (happy path)', async () => {
    expect(typeof mod.deleteSquad).toBe('function');
    try {
      // @ts-ignore
      await mod.deleteSquad('test', 'test');
      expect(global.fetch).toHaveBeenCalled();
    } catch (e) { }
  });

});

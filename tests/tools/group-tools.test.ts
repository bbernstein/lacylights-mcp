import { GroupTools } from '../../src/tools/group-tools';
import { LacyLightsGraphQLClient } from '../../src/services/graphql-client-simple';

describe('GroupTools', () => {
  let groupTools: GroupTools;
  let mockGraphQLClient: jest.Mocked<Pick<LacyLightsGraphQLClient, 'getMyGroups' | 'getGroupDetails' | 'getMyInvitations' | 'inviteToGroup'>>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGraphQLClient = {
      getMyGroups: jest.fn(),
      getGroupDetails: jest.fn(),
      getMyInvitations: jest.fn(),
      inviteToGroup: jest.fn(),
    };

    groupTools = new GroupTools(mockGraphQLClient as any);
  });

  describe('listGroups', () => {
    it('should return formatted group list', async () => {
      mockGraphQLClient.getMyGroups.mockResolvedValue([
        {
          id: 'group-1',
          name: 'Stage Crew',
          description: 'Main stage crew',
          memberCount: 5,
          isPersonal: false,
          devices: [{ id: 'd1' }],
        },
        {
          id: 'group-2',
          name: 'Personal',
          description: null,
          memberCount: 1,
          isPersonal: true,
          devices: [],
        },
      ]);

      const result = await groupTools.listGroups();

      expect(mockGraphQLClient.getMyGroups).toHaveBeenCalled();
      expect(result).toEqual({
        count: 2,
        groups: [
          {
            id: 'group-1',
            name: 'Stage Crew',
            description: 'Main stage crew',
            memberCount: 5,
            isPersonal: false,
            deviceCount: 1,
          },
          {
            id: 'group-2',
            name: 'Personal',
            description: null,
            memberCount: 1,
            isPersonal: true,
            deviceCount: 0,
          },
        ],
      });
    });

    it('should return empty array when no groups', async () => {
      mockGraphQLClient.getMyGroups.mockResolvedValue([]);

      const result = await groupTools.listGroups();

      expect(result).toEqual({
        count: 0,
        groups: [],
      });
    });

    it('should handle missing devices array', async () => {
      mockGraphQLClient.getMyGroups.mockResolvedValue([
        {
          id: 'group-1',
          name: 'No Devices Group',
          description: null,
          memberCount: 1,
          isPersonal: false,
        },
      ]);

      const result = await groupTools.listGroups();

      expect(result.groups[0].deviceCount).toBe(0);
    });

    it('should handle GraphQL client errors', async () => {
      mockGraphQLClient.getMyGroups.mockRejectedValue(new Error('GraphQL error'));

      await expect(groupTools.listGroups())
        .rejects.toThrow('Failed to list groups: Error: GraphQL error');
    });
  });

  describe('getGroupDetails', () => {
    it('should return full group details', async () => {
      mockGraphQLClient.getGroupDetails.mockResolvedValue({
        id: 'group-1',
        name: 'Stage Crew',
        description: 'Main stage crew',
        isPersonal: false,
        memberCount: 2,
        members: [
          {
            id: 'm1',
            user: { id: 'u1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' },
            role: 'GROUP_ADMIN',
            joinedAt: '2025-01-01T00:00:00Z',
          },
          {
            id: 'm2',
            user: { id: 'u2', email: 'user@test.com', name: 'User', role: 'USER' },
            role: 'MEMBER',
            joinedAt: '2025-01-02T00:00:00Z',
          },
        ],
        projects: [
          { id: 'p1', name: 'Show 1', description: 'First show' },
        ],
        devices: [
          { id: 'd1', name: 'Booth PC', isAuthorized: true, lastSeenAt: '2025-01-15T12:00:00Z' },
        ],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-15T00:00:00Z',
      });

      const result = await groupTools.getGroupDetails({ groupId: 'group-1' });

      expect(mockGraphQLClient.getGroupDetails).toHaveBeenCalledWith('group-1');
      expect(result).toEqual({
        id: 'group-1',
        name: 'Stage Crew',
        description: 'Main stage crew',
        isPersonal: false,
        memberCount: 2,
        members: [
          { userId: 'u1', email: 'admin@test.com', name: 'Admin', role: 'GROUP_ADMIN', joinedAt: '2025-01-01T00:00:00Z' },
          { userId: 'u2', email: 'user@test.com', name: 'User', role: 'MEMBER', joinedAt: '2025-01-02T00:00:00Z' },
        ],
        projects: [
          { id: 'p1', name: 'Show 1', description: 'First show' },
        ],
        devices: [
          { id: 'd1', name: 'Booth PC', isAuthorized: true, lastSeenAt: '2025-01-15T12:00:00Z' },
        ],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-15T00:00:00Z',
      });
    });

    it('should throw when group not found', async () => {
      mockGraphQLClient.getGroupDetails.mockResolvedValue(null);

      await expect(groupTools.getGroupDetails({ groupId: 'nonexistent' }))
        .rejects.toThrow('Group not found: nonexistent');
    });

    it('should handle group with no members, projects, or devices', async () => {
      mockGraphQLClient.getGroupDetails.mockResolvedValue({
        id: 'group-empty',
        name: 'Empty Group',
        description: null,
        isPersonal: false,
        memberCount: 0,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      });

      const result = await groupTools.getGroupDetails({ groupId: 'group-empty' });

      expect(result.members).toEqual([]);
      expect(result.projects).toEqual([]);
      expect(result.devices).toEqual([]);
    });

    it('should handle GraphQL client errors', async () => {
      mockGraphQLClient.getGroupDetails.mockRejectedValue(new Error('GraphQL error'));

      await expect(groupTools.getGroupDetails({ groupId: 'group-1' }))
        .rejects.toThrow('Failed to get group details: Error: GraphQL error');
    });

    it('should require groupId parameter', async () => {
      await expect(groupTools.getGroupDetails({} as any))
        .rejects.toThrow();
    });
  });

  describe('listMyInvitations', () => {
    it('should return formatted invitation list', async () => {
      mockGraphQLClient.getMyInvitations.mockResolvedValue([
        {
          id: 'inv-1',
          group: { id: 'group-1', name: 'Stage Crew' },
          email: 'me@test.com',
          invitedBy: { id: 'u1', email: 'admin@test.com', name: 'Admin' },
          role: 'MEMBER',
          status: 'PENDING',
          expiresAt: '2025-02-01T00:00:00Z',
        },
      ]);

      const result = await groupTools.listMyInvitations();

      expect(mockGraphQLClient.getMyInvitations).toHaveBeenCalled();
      expect(result).toEqual({
        count: 1,
        invitations: [
          {
            id: 'inv-1',
            groupId: 'group-1',
            groupName: 'Stage Crew',
            email: 'me@test.com',
            invitedBy: { email: 'admin@test.com', name: 'Admin' },
            role: 'MEMBER',
            status: 'PENDING',
            expiresAt: '2025-02-01T00:00:00Z',
          },
        ],
      });
    });

    it('should return empty array when no invitations', async () => {
      mockGraphQLClient.getMyInvitations.mockResolvedValue([]);

      const result = await groupTools.listMyInvitations();

      expect(result).toEqual({ count: 0, invitations: [] });
    });

    it('should handle GraphQL client errors', async () => {
      mockGraphQLClient.getMyInvitations.mockRejectedValue(new Error('GraphQL error'));

      await expect(groupTools.listMyInvitations())
        .rejects.toThrow('Failed to list invitations: Error: GraphQL error');
    });
  });

  describe('inviteToGroup', () => {
    it('should send invitation with default MEMBER role', async () => {
      mockGraphQLClient.inviteToGroup.mockResolvedValue({
        id: 'inv-1',
        email: 'newuser@test.com',
        role: 'MEMBER',
        status: 'PENDING',
        expiresAt: '2025-02-01T00:00:00Z',
      });

      const result = await groupTools.inviteToGroup({
        groupId: 'group-1',
        email: 'newuser@test.com',
      });

      expect(mockGraphQLClient.inviteToGroup).toHaveBeenCalledWith('group-1', 'newuser@test.com', 'MEMBER');
      expect(result).toEqual({
        success: true,
        invitation: {
          id: 'inv-1',
          email: 'newuser@test.com',
          role: 'MEMBER',
          status: 'PENDING',
          expiresAt: '2025-02-01T00:00:00Z',
        },
        message: 'Invitation sent to newuser@test.com for group group-1',
      });
    });

    it('should send invitation with GROUP_ADMIN role', async () => {
      mockGraphQLClient.inviteToGroup.mockResolvedValue({
        id: 'inv-2',
        email: 'admin@test.com',
        role: 'GROUP_ADMIN',
        status: 'PENDING',
        expiresAt: '2025-02-01T00:00:00Z',
      });

      const result = await groupTools.inviteToGroup({
        groupId: 'group-1',
        email: 'admin@test.com',
        role: 'GROUP_ADMIN',
      });

      expect(mockGraphQLClient.inviteToGroup).toHaveBeenCalledWith('group-1', 'admin@test.com', 'GROUP_ADMIN');
      expect(result.invitation.role).toBe('GROUP_ADMIN');
    });

    it('should validate email format', async () => {
      await expect(groupTools.inviteToGroup({
        groupId: 'group-1',
        email: 'not-an-email',
      })).rejects.toThrow();
    });

    it('should require groupId and email', async () => {
      await expect(groupTools.inviteToGroup({ groupId: 'group-1' } as any))
        .rejects.toThrow();

      await expect(groupTools.inviteToGroup({ email: 'test@test.com' } as any))
        .rejects.toThrow();
    });

    it('should handle GraphQL client errors', async () => {
      mockGraphQLClient.inviteToGroup.mockRejectedValue(new Error('Permission denied'));

      await expect(groupTools.inviteToGroup({
        groupId: 'group-1',
        email: 'user@test.com',
      })).rejects.toThrow('Failed to invite user to group: Error: Permission denied');
    });
  });
});

import { z } from 'zod';
import { LacyLightsGraphQLClient } from '../services/graphql-client-simple';

const GetGroupDetailsSchema = z.object({
  groupId: z.string().describe('The group ID to get details for'),
});

const InviteToGroupSchema = z.object({
  groupId: z.string().describe('The group ID to invite the user to'),
  email: z.string().email().describe('Email address of the user to invite'),
  role: z.enum(['MEMBER', 'GROUP_ADMIN']).optional().describe('Role for the invited user (default: MEMBER)'),
});

export class GroupTools {
  constructor(private graphqlClient: LacyLightsGraphQLClient) {}

  /**
   * List groups accessible to this MCP device/user
   */
  async listGroups() {
    try {
      const groups = await this.graphqlClient.getMyGroups();
      return {
        count: groups.length,
        groups: groups.map((g: any) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          memberCount: g.memberCount,
          isPersonal: g.isPersonal,
          deviceCount: g.devices?.length ?? 0,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to list groups: ${error}`);
    }
  }

  /**
   * Get full details of a group including members, projects, and devices
   */
  async getGroupDetails(args: z.infer<typeof GetGroupDetailsSchema>) {
    const { groupId } = GetGroupDetailsSchema.parse(args);
    try {
      const group = await this.graphqlClient.getGroupDetails(groupId);
      if (!group) {
        throw new Error(`Group not found: ${groupId}`);
      }
      return {
        id: group.id,
        name: group.name,
        description: group.description,
        isPersonal: group.isPersonal,
        memberCount: group.memberCount,
        members: group.members?.map((m: any) => ({
          userId: m.user.id,
          email: m.user.email,
          name: m.user.name,
          role: m.role,
          joinedAt: m.joinedAt,
        })) ?? [],
        projects: group.projects?.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
        })) ?? [],
        devices: group.devices?.map((d: any) => ({
          id: d.id,
          name: d.name,
          isAuthorized: d.isAuthorized,
          lastSeenAt: d.lastSeenAt,
        })) ?? [],
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
      };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Group not found')) {
        throw error;
      }
      throw new Error(`Failed to get group details: ${error}`);
    }
  }

  /**
   * Invite a user to a group by email
   */
  async inviteToGroup(args: z.infer<typeof InviteToGroupSchema>) {
    const { groupId, email, role } = InviteToGroupSchema.parse(args);
    try {
      const invitation = await this.graphqlClient.inviteToGroup(groupId, email, role);
      return {
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
        },
        message: `Invitation sent to ${email} for group ${groupId}`,
      };
    } catch (error) {
      throw new Error(`Failed to invite user to group: ${error}`);
    }
  }
}

export { GetGroupDetailsSchema, InviteToGroupSchema };

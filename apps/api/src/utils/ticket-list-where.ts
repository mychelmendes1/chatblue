import { prisma } from '../config/database.js';

export type TicketListMode = 'all' | 'queue' | 'mine' | 'custom';

export interface TicketListQueryInput {
  companyId: string;
  userId: string;
  role: string;
  visibleDeptIds: Set<string>;
  mode: TicketListMode;
  /** Used only when mode === 'custom' */
  status?: string;
  /** Used only when mode === 'custom' */
  assignedToId?: string;
  /**
   * When mode === 'all', optionally scope "Todos" to this assignee (dropdown no Chat).
   * Does not apply to queue/mine tab counts.
   */
  scopeAssignedToIdForAll?: string;
  departmentId?: string;
  priority?: string;
  isAIHandled?: boolean;
  hideResolved: boolean;
  hasMentions: boolean;
  noHumanAssigned: boolean;
  massDispatchOnly: boolean;
  search?: string;
}

/**
 * Loads department ids visible to the user (own departments + parents).
 */
export async function getVisibleDepartmentIdsForUser(userId: string): Promise<Set<string>> {
  const userDepartments = await prisma.userDepartment.findMany({
    where: { userId },
    select: { departmentId: true },
  });
  const deptIds = userDepartments.map((d) => d.departmentId);
  const visibleDeptIds = new Set(deptIds);
  for (const deptId of deptIds) {
    const dept = await prisma.department.findUnique({
      where: { id: deptId },
      select: { parentId: true },
    });
    if (dept?.parentId) {
      visibleDeptIds.add(dept.parentId);
    }
  }
  return visibleDeptIds;
}

/**
 * Builds Prisma where for ticket list / counts — mirrors GET /tickets visibility rules.
 */
export function buildTicketListWhere(input: TicketListQueryInput): Record<string, unknown> {
  const {
    companyId,
    userId,
    role,
    visibleDeptIds,
    mode,
    departmentId,
    priority,
    isAIHandled,
    hideResolved,
    hasMentions,
    noHumanAssigned,
    massDispatchOnly,
    search,
  } = input;

  let status: string | undefined;
  let assignedToId: string | undefined;

  if (mode === 'all') {
    status = undefined;
    assignedToId = input.scopeAssignedToIdForAll;
  } else if (mode === 'queue') {
    status = 'PENDING';
    assignedToId = undefined;
  } else if (mode === 'mine') {
    status = undefined;
    assignedToId = userId;
  } else {
    status = input.status;
    assignedToId = input.assignedToId;
  }

  const isMentionsFilter = hasMentions;
  const isMyTicketsFilter = assignedToId === userId;
  const isQueueFilter = status === 'PENDING' && !assignedToId && !isMentionsFilter;
  const isAllFilter = !status && !assignedToId && !isMentionsFilter;

  const baseWhere: Record<string, unknown> = {
    companyId,
    ...(status && { status }),
    ...(departmentId && { departmentId }),
    ...(assignedToId && { assignedToId }),
    ...(priority && { priority }),
    ...(typeof isAIHandled === 'boolean' && { isAIHandled }),
    ...(hideResolved && !status && {
      status: { notIn: ['RESOLVED', 'CLOSED'] },
    }),
    ...(massDispatchOnly && { campaignId: { not: null } }),
  };

  if (isMentionsFilter) {
    baseWhere.messages = {
      some: {
        mentionedUserIds: {
          has: userId,
        },
      },
    };
  }

  if (noHumanAssigned) {
    baseWhere.OR = [{ assignedToId: null }, { assignedTo: { isAI: true } }];
  }

  const searchConditions: Record<string, unknown>[] = [];
  if (search) {
    searchConditions.push(
      { protocol: { contains: search, mode: 'insensitive' } },
      { contact: { name: { contains: search, mode: 'insensitive' } } },
      { contact: { email: { contains: search, mode: 'insensitive' } } },
      { contact: { phone: { contains: search } } }
    );
  }

  const where: Record<string, unknown> = { ...baseWhere };
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(role);

  if (isAdmin) {
    // Admin: fila (PENDING) inclui todos os pendentes da empresa, sem forçar assignedToId null
    if (searchConditions.length > 0) {
      where.AND = [baseWhere, { OR: searchConditions }];
    }
  } else if (isMentionsFilter) {
    if (searchConditions.length > 0) {
      where.AND = [baseWhere, { OR: searchConditions }];
    }
  } else if (isMyTicketsFilter) {
    if (searchConditions.length > 0) {
      where.AND = [baseWhere, { OR: searchConditions }];
    }
  } else if (isQueueFilter) {
    // Não-admin: fila = PENDING, sem atribuição, departamentos visíveis
    const queueFilter: Record<string, unknown> = {
      ...baseWhere,
      assignedToId: null,
    };
    if (visibleDeptIds.size > 0) {
      queueFilter.departmentId = { in: Array.from(visibleDeptIds) };
    }
    if (searchConditions.length > 0) {
      where.AND = [queueFilter, { OR: searchConditions }];
    } else {
      Object.assign(where, queueFilter);
    }
  } else if (isAllFilter) {
    if (searchConditions.length > 0) {
      where.AND = [baseWhere, { OR: searchConditions }];
    }
  } else {
    const visibilityConditions: Record<string, unknown>[] = [{ assignedToId: userId }];
    if (visibleDeptIds.size > 0) {
      visibilityConditions.push({ departmentId: { in: Array.from(visibleDeptIds) } });
    } else {
      visibilityConditions.push({ assignedToId: null });
    }
    if (searchConditions.length > 0) {
      where.AND = [baseWhere, { OR: visibilityConditions }, { OR: searchConditions }];
    } else {
      where.AND = [baseWhere, { OR: visibilityConditions }];
    }
  }

  return where;
}

import { SetMetadata } from '@nestjs/common';

/**
 * Role type representing all supported user roles in the system.
 * Uses the UserRole enum from the common interface for consistency.
 */
export type Role = 'admin' | 'user';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for endpoint access.
 * Works with RolesGuard to enforce role-based access control.
 *
 * @example
 * @Roles('admin')
 * @Roles('admin', 'user')
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

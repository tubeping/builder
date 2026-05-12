/**
 * 권한 헬퍼 — admin/super_admin 체크.
 * 서버사이드(API 라우트) + 클라이언트사이드 양쪽에서 사용.
 */

export type Role = "creator" | "admin" | "super_admin";

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === "super_admin";
}

export const ROLE_LABEL: Record<Role, string> = {
  creator: "크리에이터",
  admin: "관리자",
  super_admin: "최고 관리자",
};

import {
  LayoutDashboard,
  BookOpen,
  Users,
  Sparkles,
  CalendarDays,
  BarChart3,
  MessageSquare,
  Settings2,
  Inbox,
  TrendingUp,
  ShieldCheck,
  Heart,
  Bell,
  Flag,
  Server,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "../domain/types";
export const roleHome: Record<Role, string> = {
  learner: "/learn",
  tutor: "/studio",
  guardian: "/guardian",
  champion: "/champion",
  admin: "/admin",
};
export type WorkspaceDestination = {
  to: string;
  label: string;
  group: string;
  icon: LucideIcon;
};
const overview = (role: Role): WorkspaceDestination => ({
  to: roleHome[role],
  label: "Overview",
  group: "Workspace",
  icon: LayoutDashboard,
});
const settings: WorkspaceDestination = {
  to: "/settings",
  label: "Settings",
  group: "Account",
  icon: Settings2,
};
export const workspaceNavigation: Record<Role, WorkspaceDestination[]> = {
  learner: [
    overview("learner"),
    { to: "/explore", label: "My Learning", group: "Learning", icon: BookOpen },
    { to: "/tutors", label: "Find Tutors", group: "Learning", icon: Users },
    {
      to: "/sessions",
      label: "Sessions",
      group: "Learning",
      icon: CalendarDays,
    },
    { to: "/assistant", label: "Ask AI", group: "Learning", icon: Sparkles },
    {
      to: "/learn/progress",
      label: "Progress",
      group: "Learning",
      icon: BarChart3,
    },
    {
      to: "/community",
      label: "Community",
      group: "Learning",
      icon: MessageSquare,
    },
    settings,
  ],
  tutor: [
    overview("tutor"),
    {
      to: "/studio#requests",
      label: "Requests",
      group: "Teaching",
      icon: Inbox,
    },
    {
      to: "/studio#schedule",
      label: "Schedule",
      group: "Teaching",
      icon: CalendarDays,
    },
    {
      to: "/sessions",
      label: "Sessions",
      group: "Teaching",
      icon: MessageSquare,
    },
    {
      to: "/studio/feedback",
      label: "Co-Teacher Feedback",
      group: "Development",
      icon: Sparkles,
    },
    {
      to: "/studio#growth",
      label: "Teaching Growth",
      group: "Development",
      icon: TrendingUp,
    },
    {
      to: "/community",
      label: "Community",
      group: "Development",
      icon: BookOpen,
    },
    settings,
  ],
  guardian: [
    overview("guardian"),
    {
      to: "/guardian#progress",
      label: "Learner Progress",
      group: "Your learner",
      icon: Heart,
    },
    {
      to: "/guardian#consent",
      label: "Consent",
      group: "Your learner",
      icon: ShieldCheck,
    },
    {
      to: "/guardian#updates",
      label: "Updates",
      group: "Your learner",
      icon: Bell,
    },
    settings,
  ],
  champion: [
    overview("champion"),
    {
      to: "/champion#verification",
      label: "Tutor Verification",
      group: "Trust & safety",
      icon: ShieldCheck,
    },
    {
      to: "/champion#moderation",
      label: "Moderation",
      group: "Trust & safety",
      icon: MessageSquare,
    },
    {
      to: "/champion#reports",
      label: "Safety Reports",
      group: "Trust & safety",
      icon: Flag,
    },
    settings,
  ],
  admin: [
    overview("admin"),
    { to: "/explore", label: "Curriculum", group: "Platform", icon: BookOpen },
    { to: "/admin/users", label: "Users", group: "Platform", icon: Users },
    {
      to: "/admin#operations",
      label: "Operations",
      group: "Platform",
      icon: Server,
    },
    settings,
  ],
};
export function destinationIsActive(
  to: string,
  pathname: string,
  hash: string,
) {
  const [path, fragment] = to.split("#");
  if (fragment) return path === pathname && hash === `#${fragment}`;
  if (path === "/explore" && pathname.startsWith("/lesson/")) return true;
  if (path === "/sessions" && pathname.startsWith("/room/")) return true;
  return path === pathname && !hash;
}
export function currentDestination(role: Role, pathname: string, hash: string) {
  return workspaceNavigation[role].find((item) =>
    destinationIsActive(item.to, pathname, hash),
  );
}

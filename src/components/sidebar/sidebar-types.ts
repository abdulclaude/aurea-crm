export type SidebarItem = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  url: string;
  activeUrls?: string[];
};

export type SidebarGroup = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: SidebarItem[];
};

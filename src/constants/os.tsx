import { Apple, Monitor, Terminal, Laptop } from "lucide-react";
import {
  AndroidIcon,
  IosIcon,
  WindowsIcon,
} from "@/components/icons/brand-icons";

const normalizeOsName = (osName: string) => osName.toLowerCase();

export const getOsIcon = (osName: string) => {
  const name = normalizeOsName(osName);

  if (name.includes("ios")) return IosIcon;
  if (name.includes("mac") || name.includes("os x")) return Apple;
  if (name.includes("windows")) return WindowsIcon;
  if (name.includes("android")) return AndroidIcon;
  if (name.includes("chrome os")) return Laptop;
  if (
    name.includes("linux") ||
    name.includes("ubuntu") ||
    name.includes("debian")
  )
    return Terminal;

  return Monitor;
};

export { Apple, Monitor, Terminal, Laptop, AndroidIcon, IosIcon, WindowsIcon };

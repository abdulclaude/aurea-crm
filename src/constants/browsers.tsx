import { Compass } from "lucide-react";
import {
  IconChrome as ChromeIcon,
  IconFirefox as FirefoxIcon,
  IconOpera as OperaIcon,
} from "central-icons";
import { EdgeIcon, SafariIcon } from "@/components/icons/brand-icons";

const normalizeBrowserName = (browserName: string) =>
  browserName.toLowerCase();

export const getBrowserIcon = (browserName: string) => {
  const name = normalizeBrowserName(browserName);

  if (name.includes("edge")) return EdgeIcon;
  if (name.includes("chrome")) return ChromeIcon;
  if (name.includes("firefox")) return FirefoxIcon;
  if (name.includes("safari")) return SafariIcon;
  if (name.includes("opera")) return OperaIcon;

  return Compass;
};

export { ChromeIcon, FirefoxIcon, SafariIcon, OperaIcon, EdgeIcon };

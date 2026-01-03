import {
  IconTablet as TabletIcon,
  IconImac as DesktopIcon,
  IconTelevision as UltrawideIcon,
  IconMacbook as LaptopIcon,
  IconPhone as MobileIcon,
} from "central-icons";

const normalizeDeviceType = (deviceType: string) =>
  deviceType.toLowerCase();

export const getDeviceIcon = (deviceType: string) => {
  const type = normalizeDeviceType(deviceType);

  if (type.includes("mobile") || type.includes("phone")) return MobileIcon;
  if (type.includes("tablet") || type.includes("ipad")) return TabletIcon;
  if (type.includes("laptop") || type.includes("notebook")) return LaptopIcon;
  if (type.includes("ultrawide") || type.includes("tv"))
    return UltrawideIcon;
  if (type.includes("desktop") || type.includes("imac")) return DesktopIcon;

  return DesktopIcon;
};

export {
  TabletIcon,
  DesktopIcon,
  UltrawideIcon,
  LaptopIcon,
  MobileIcon,
};

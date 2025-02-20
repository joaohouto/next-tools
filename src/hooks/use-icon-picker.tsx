"use client";
import React, { useMemo, useState } from "react";
import { icons as HeroIcons } from "lucide-react";

type Icons = {
  // the name of the component
  name: string;
  // a more human-friendly name
  friendly_name: string;
  Component: React.FC<React.ComponentPropsWithoutRef<"svg">>;
};

export const useIconPicker = (): {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  icons: Icons[];
  iconCount: number;
} => {
  const icons: Icons[] = useMemo(
    () =>
      Object.entries(HeroIcons).map(([iconName, IconComponent]) => ({
        name: iconName,
        // split the icon name at capital letters and join them with a space
        friendly_name: iconName.match(/[A-Z][a-z]+/g)?.join(" ") ?? iconName,
        Component: IconComponent,
      })),
    []
  );

  // these lines can be removed entirely if you're not using the controlled component approach
  const [search, setSearch] = useState("");
  //   memoize the search functionality
  const filteredIcons = useMemo(() => {
    return icons.filter((icon) => {
      if (search === "") {
        return true;
      } else if (icon.name.toLowerCase().includes(search.toLowerCase())) {
        return true;
      } else {
        return false;
      }
    });
  }, [icons, search]);

  return { search, setSearch, icons: filteredIcons, iconCount: icons.length };
};

export const IconRenderer = ({
  icon,
  strokeWidth,
  size,
  ...rest
}: {
  icon: string;
  strokeWidth?: number;
  size?: number;
} & React.ComponentPropsWithoutRef<"svg">) => {
  const IconComponent = HeroIcons[icon as keyof typeof HeroIcons];

  if (!IconComponent) {
    return null;
  }

  return (
    <IconComponent
      data-slot="icon"
      size={size}
      strokeWidth={strokeWidth}
      {...rest}
    />
  );
};

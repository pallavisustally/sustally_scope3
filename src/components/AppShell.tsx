"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  NAV_FOOTER,
  NAV_MAIN,
  findNavFamily,
  isGroupActive,
  isNavGroup,
  type NavGroup,
  type NavItem,
  type NavLeaf,
} from "@/data/protocol";
import { BrandWordmark, ThemeToggle, UserChip } from "./Brand";
import { IconBell, IconChevronDown, IconChevronLeft, IconHelp, NavGlyph } from "./NavIcons";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const current = findNavFamily(pathname);
    return current ? { [current.id]: true } : {};
  });

  const family = useMemo(() => findNavFamily(pathname), [pathname]);
  const currentChild = family?.children.find((child) => child.href === pathname);

  useEffect(() => {
    if (!family) return;
    setOpenGroups((prev) => ({ ...prev, [family.id]: true }));
  }, [family]);

  const closeMobile = () => setNavOpen(false);

  const toggleGroup = (group: NavGroup) => {
    if (collapsed) {
      router.push(group.children[0].href);
      closeMobile();
      return;
    }
    setOpenGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }));
  };

  return (
    <div className="app-shell" data-collapsed={collapsed ? "true" : "false"}>
      <header className="topbar">
        <div className="flex items-center gap-2">
          <button type="button" className="menu-btn icon-chip" onClick={() => setNavOpen((v) => !v)} aria-label="Open navigation">
            ☰
          </button>
          <Link href="/dashboard" className="logo-link">
            <BrandWordmark />
          </Link>
        </div>
        <div className="topbar-actions">
          <button type="button" className="top-icon" aria-label="Notifications">
            <IconBell />
          </button>
          <Link href="/help" className="top-icon" aria-label="Help">
            <IconHelp />
          </Link>
          <ThemeToggle />
          <UserChip />
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar" data-open={navOpen ? "true" : "false"}>
          <button
            type="button"
            className="collapse-btn"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            {collapsed ? "›" : "‹"}
          </button>
          <nav className="side-nav">
            {NAV_MAIN.map((item) => (
              <NavEntry
                key={isNavGroup(item) ? item.id : item.href}
                item={item}
                pathname={pathname}
                open={isNavGroup(item) ? Boolean(openGroups[item.id]) : false}
                onToggle={toggleGroup}
                onNavigate={closeMobile}
              />
            ))}
          </nav>
          <div className="side-foot">
            {NAV_FOOTER.map((item) => (
              <NavEntry
                key={isNavGroup(item) ? item.id : item.href}
                item={item}
                pathname={pathname}
                open={isNavGroup(item) ? Boolean(openGroups[item.id]) : false}
                onToggle={toggleGroup}
                onNavigate={closeMobile}
              />
            ))}
          </div>
        </aside>
        <main className="canvas">
          {family ? (
            <nav className="family-tabs" aria-label={family.label}>
              {family.children.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  className="family-tab"
                  data-active={pathname === child.href ? "true" : "false"}
                >
                  {child.label}
                </Link>
              ))}
            </nav>
          ) : null}
          <div className="canvas-body">
            {family && currentChild ? (
              <p className="crumbs">
                <Link href="/dashboard">Home</Link>
                <span className="crumbs-sep">/</span>
                <span>{family.label}</span>
                <span className="crumbs-sep">/</span>
                <span>{currentChild.label}</span>
              </p>
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function NavEntry({
  item,
  pathname,
  open,
  onToggle,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  open: boolean;
  onToggle: (group: NavGroup) => void;
  onNavigate: () => void;
}) {
  if (!isNavGroup(item)) {
    return <NavLink item={item} active={pathname === item.href} onNavigate={onNavigate} />;
  }

  const groupActive = isGroupActive(pathname, item);

  return (
    <div className="nav-group">
      <button
        type="button"
        className="nav-link nav-parent"
        data-active={groupActive ? "true" : "false"}
        aria-expanded={open}
        onClick={() => onToggle(item)}
      >
        <span className="nav-ico">
          <NavGlyph href={item.icon} />
        </span>
        <span className="nav-label">{item.label}</span>
        <span className="nav-chevron">{open ? <IconChevronDown /> : <IconChevronLeft />}</span>
      </button>
      {open ? (
        <div className="nav-children">
          {item.children.map((child) => (
            <NavLink key={child.href} item={child} active={pathname === child.href} onNavigate={onNavigate} nested />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NavLink({
  item,
  active,
  onNavigate,
  nested,
}: {
  item: NavLeaf;
  active: boolean;
  onNavigate: () => void;
  nested?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className="nav-link"
      data-active={active ? "true" : "false"}
      data-nested={nested ? "true" : "false"}
      onClick={onNavigate}
    >
      <span className="nav-ico">
        <NavGlyph href={item.icon} />
      </span>
      <span className="nav-label">{item.label}</span>
    </Link>
  );
}

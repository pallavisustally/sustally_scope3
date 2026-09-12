"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CATEGORY_DATA_HREF,
  NAV_FOOTER,
  NAV_MAIN,
  collectionTrail,
  findNavFamily,
  includedCategories,
  isGroupActive,
  isNavChildActive,
  isNavGroup,
  type NavGroup,
  type NavItem,
  type NavLeaf,
} from "@/data/protocol";
import { BrandWordmark, ThemeToggle, UserChip } from "./Brand";
import { NotificationBell } from "./NotificationBell";
import { IconChevronDown, IconChevronLeft, IconHelp, NavGlyph } from "./NavIcons";
import { useInventory } from "./InventoryProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingCat = searchParams.get("cat");
  const { state } = useInventory();
  const [collapsed, setCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const current = findNavFamily(pathname);
    return current ? { [current.id]: true } : {};
  });

  const family = useMemo(() => findNavFamily(pathname), [pathname]);
  const trail = useMemo(() => {
    if (!family) return [];
    if (family.id === "activity") return collectionTrail(pathname, editingCat);
    const child = family.children.find((entry) => entry.href === pathname);
    return child ? [{ href: child.href, label: child.label }] : [];
  }, [editingCat, family, pathname]);

  const sidebarNav = useMemo(() => {
    const selected = includedCategories(state.categories);
    return NAV_MAIN.map((item) => {
      if (!isNavGroup(item) || item.id !== "activity") return item;
      const hub = item.children[0];
      const review = item.children[item.children.length - 1];
      return {
        ...item,
        children: [
          hub,
          ...selected.map((category) => ({
            href: `/activity?cat=${category.id}`,
            label: category.name,
            icon: "/activity",
          })),
          review,
        ],
      };
    });
  }, [state.categories]);

  useEffect(() => {
    if (!family) return;
    setOpenGroups((prev) => ({ ...prev, [family.id]: true }));
  }, [family]);

  useEffect(() => {
    if (includedCategories(state.categories).length === 0) return;
    setOpenGroups((prev) => ({ ...prev, activity: true }));
  }, [state.categories]);

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
          <NotificationBell />
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
            {sidebarNav.map((item) => (
              <NavEntry
                key={isNavGroup(item) ? item.id : item.href}
                item={item}
                pathname={pathname}
                cat={editingCat}
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
                cat={editingCat}
                open={isNavGroup(item) ? Boolean(openGroups[item.id]) : false}
                onToggle={toggleGroup}
                onNavigate={closeMobile}
              />
            ))}
          </div>
        </aside>
        <main className="canvas">
          {family && family.id !== "activity" ? (
            <nav className="family-tabs" aria-label={family.label}>
              {family.children.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  className="family-tab"
                  data-active={isNavChildActive(pathname, child.href) ? "true" : "false"}
                >
                  {child.label}
                </Link>
              ))}
            </nav>
          ) : null}
          <div className="canvas-body">
            {family && trail.length ? (
              <p className="crumbs">
                <Link href="/dashboard">Home</Link>
                <span className="crumbs-sep">/</span>
                <span>{family.label}</span>
                {trail.map((crumb, index) => {
                  const last = index === trail.length - 1;
                  return (
                    <span key={`${crumb.href}-${crumb.label}`}>
                      <span className="crumbs-sep">/</span>
                      {last ? <span>{crumb.label}</span> : <Link href={crumb.href}>{crumb.label}</Link>}
                    </span>
                  );
                })}
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
  cat,
  open,
  onToggle,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  cat: string | null;
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
          {item.children
            .filter((child) => child.href !== CATEGORY_DATA_HREF)
            .map((child) => (
              <NavLink
                key={child.href}
                item={child}
                active={isLeafActive(pathname, child.href, cat)}
                onNavigate={onNavigate}
                nested
              />
            ))}
        </div>
      ) : null}
    </div>
  );
}

function isLeafActive(pathname: string, href: string, cat: string | null) {
  if (href.includes("?cat=")) {
    return pathname === "/activity" && cat === href.split("cat=")[1];
  }
  return isNavChildActive(pathname, href);
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
  const catId = item.href.includes("?cat=") ? item.href.split("cat=")[1] : "";
  return (
    <Link
      href={item.href}
      className="nav-link"
      data-active={active ? "true" : "false"}
      data-nested={nested ? "true" : "false"}
      onClick={onNavigate}
    >
      <span className="nav-ico">
        {catId ? <span className="nav-cat-n">{catId}</span> : <NavGlyph href={item.icon} />}
      </span>
      <span className="nav-label">{item.label}</span>
    </Link>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInventory } from "@/components/InventoryProvider";
import { IconBell } from "@/components/NavIcons";

const SEEN_KEY = "sustally-notif-seen";

export function NotificationBell() {
  const { notices } = useInventory();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(SEEN_KEY);
      if (stored) setSeen(JSON.parse(stored) as string[]);
    } catch {
      setSeen([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = useMemo(() => notices.filter((note) => !seen.includes(note.id)).length, [notices, seen]);

  const markSeen = () => {
    const ids = notices.map((note) => note.id);
    setSeen(ids);
    window.sessionStorage.setItem(SEEN_KEY, JSON.stringify(ids));
  };

  return (
    <div className="notif-wrap" ref={root}>
      <button
        type="button"
        className="top-icon"
        aria-label={unread ? `${unread} notifications` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen((value) => {
            const next = !value;
            if (next) markSeen();
            return next;
          });
        }}
      >
        <IconBell />
        {unread > 0 ? <span className="notif-badge">{unread > 9 ? "9+" : unread}</span> : null}
      </button>
      {open ? (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-head">
            <p>Notifications</p>
            <span>{notices.length}</span>
          </div>
          {notices.length === 0 ? (
            <p className="notif-empty">No report alerts right now.</p>
          ) : (
            <ul>
              {notices.map((note) => (
                <li key={note.id} data-tone={note.tone}>
                  {note.href ? (
                    <Link href={note.href} onClick={() => setOpen(false)}>
                      <strong>{note.title}</strong>
                      <span>{note.body}</span>
                    </Link>
                  ) : (
                    <div>
                      <strong>{note.title}</strong>
                      <span>{note.body}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

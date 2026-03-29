/**
 * Custom Quill 2 mention blot and module.
 *
 * Renders mentions as:
 *   <span class="mention" data-id="userId" data-value="Username">@Username</span>
 *
 * Triggered by typing "@" in the editor.
 */

import type Quill from "quill";
import { escapeHtml } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 200;

// ─── Mention Blot ────────────────────────────────────────────────────────────

let blotRegistered = false;

export function registerMentionBlot(QuillClass: typeof Quill) {
  if (blotRegistered) return;

  const Inline = QuillClass.import("blots/inline") as typeof import("parchment").InlineBlot;

  class MentionBlot extends Inline {
    static blotName = "mention";
    static tagName = "span";
    static className = "mention";

    static create(data: { id: string; value: string }): HTMLElement {
      const node = super.create() as HTMLElement;
      node.setAttribute("data-id", data.id);
      node.setAttribute("data-value", data.value);
      node.setAttribute("contenteditable", "false");
      node.textContent = `@${data.value}`;
      return node;
    }

    static value(node: HTMLElement): { id: string; value: string } {
      return {
        id: node.getAttribute("data-id") ?? "",
        value: node.getAttribute("data-value") ?? "",
      };
    }

    static formats(node: HTMLElement): { id: string; value: string } {
      return MentionBlot.value(node);
    }
  }

  QuillClass.register(MentionBlot, true);
  blotRegistered = true;
}

// ─── Mention Module ──────────────────────────────────────────────────────────

export interface MentionUser {
  id: string;
  value: string;
  avatarUrlId?: string;
}

export type MentionSearchFn = (query: string) => Promise<MentionUser[]>;

interface MentionModuleOptions {
  source: MentionSearchFn;
}

export class MentionModule {
  private quill: Quill;
  private source: MentionSearchFn;
  private container: HTMLDivElement | null = null;
  private isOpen = false;
  private results: MentionUser[] = [];
  private selectedIndex = 0;
  private mentionCharIndex = -1;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  // Stored bound references so destroy() can remove the exact same listeners
  private keyDownHandler: (e: Event) => void;
  private textChangeHandler: () => void;
  private documentClickHandler: (e: MouseEvent) => void;

  constructor(quill: Quill, options: MentionModuleOptions) {
    this.quill = quill;
    this.source = options.source;
    this.keyDownHandler = this.handleKeyDown.bind(this);
    this.textChangeHandler = this.handleTextChange.bind(this);
    this.documentClickHandler = this.handleDocumentClick.bind(this);

    this.quill.root.addEventListener("keydown", this.keyDownHandler);
    this.quill.on("text-change", this.textChangeHandler);
    document.addEventListener("click", this.documentClickHandler);
  }

  public destroy(): void {
    this.quill.root.removeEventListener("keydown", this.keyDownHandler);
    this.quill.off("text-change", this.textChangeHandler);
    document.removeEventListener("click", this.documentClickHandler);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.close();
  }

  private handleTextChange() {
    const selection = this.quill.getSelection();
    if (!selection) {
      this.close();
      return;
    }

    const cursorIndex = selection.index;
    const text = this.quill.getText(0, cursorIndex);

    let atIndex = -1;
    for (let i = text.length - 1; i >= 0; i--) {
      if (text[i] === "@") {
        if (i === 0 || /\s/.test(text[i - 1])) {
          atIndex = i;
        }
        break;
      }
      if (/[\s\n]/.test(text[i])) break;
    }

    if (atIndex >= 0) {
      const query = text.slice(atIndex + 1);
      if (query.length <= 30 && !/\n/.test(query)) {
        this.mentionCharIndex = atIndex;
        this.debouncedSearch(query);
        return;
      }
    }

    this.close();
  }

  private debouncedSearch(query: string) {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.search(query);
    }, SEARCH_DEBOUNCE_MS);
  }

  private async search(query: string) {
    if (!query) {
      this.close();
      return;
    }

    // Capture the query so stale responses from slower requests can be discarded
    const currentQuery = query;
    try {
      const results = await this.source(currentQuery);
      // Discard if user has typed more since this request was fired
      const selection = this.quill.getSelection();
      if (!selection) return;
      const currentText = this.quill.getText(0, selection.index);
      const activeQuery = this.mentionCharIndex >= 0
        ? currentText.slice(this.mentionCharIndex + 1)
        : null;
      if (activeQuery !== currentQuery) return;

      if (results.length > 0) {
        this.results = results;
        this.selectedIndex = 0;
        this.renderDropdown();
      } else {
        this.close();
      }
    } catch {
      this.close();
    }
  }

  private handleKeyDown(e: Event) {
    const event = e as KeyboardEvent;
    if (!this.isOpen) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % this.results.length;
      this.updateSelection();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + this.results.length) % this.results.length;
      this.updateSelection();
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      this.selectItem(this.selectedIndex);
    } else if (event.key === "Escape") {
      event.preventDefault();
      this.close();
    }
  }

  private handleDocumentClick(e: MouseEvent) {
    if (this.container && !this.container.contains(e.target as Node)) {
      this.close();
    }
  }

  private selectItem(index: number) {
    const item = this.results[index];
    if (!item) return;

    const selection = this.quill.getSelection();
    if (!selection) return;

    const deleteLength = selection.index - this.mentionCharIndex;
    this.quill.deleteText(this.mentionCharIndex, deleteLength);
    this.quill.insertEmbed(this.mentionCharIndex, "mention", {
      id: item.id,
      value: item.value,
    });
    this.quill.insertText(this.mentionCharIndex + 1, " ");
    this.quill.setSelection(this.mentionCharIndex + 2, 0);

    this.close();
  }

  private buildItemElement(user: MentionUser, index: number): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.index = String(index);
    btn.className = "ql-mention-item";
    btn.style.cssText = `display:flex;width:100%;align-items:center;gap:0.5rem;padding:0.5rem 0.75rem;font-size:0.875rem;text-align:left;border:none;cursor:pointer;background:${index === this.selectedIndex ? "#f4f4f5" : "#fff"};`;

    // Avatar wrapper
    const avatarWrap = document.createElement("span");
    avatarWrap.style.cssText =
      "display:flex;align-items:center;justify-content:center;width:1.5rem;height:1.5rem;border-radius:50%;background:#f4f4f5;font-size:10px;font-weight:600;color:#52525b;overflow:hidden;flex-shrink:0;";

    const initials = user.value.slice(0, 2).toUpperCase();
    if (user.avatarUrlId) {
      const img = document.createElement("img");
      img.src = user.avatarUrlId;
      img.alt = escapeHtml(user.value);
      img.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%;";
      const fallback = document.createElement("span");
      fallback.style.cssText =
        "display:none;align-items:center;justify-content:center;width:100%;height:100%;font-size:10px;font-weight:600;color:#52525b;";
      fallback.textContent = initials;
      img.addEventListener("error", () => {
        img.style.display = "none";
        fallback.style.display = "flex";
      });
      avatarWrap.appendChild(img);
      avatarWrap.appendChild(fallback);
    } else {
      avatarWrap.textContent = initials;
    }

    const nameSpan = document.createElement("span");
    nameSpan.style.cssText = "font-weight:500;color:#18181b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    nameSpan.textContent = user.value;

    btn.appendChild(avatarWrap);
    btn.appendChild(nameSpan);
    return btn;
  }

  private renderDropdown() {
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.className = "ql-mention-dropdown";
      this.container.style.cssText =
        "position:absolute;z-index:50;width:16rem;border-radius:0.5rem;border:1px solid #e4e4e7;background:#fff;box-shadow:0 4px 6px -1px rgb(0 0 0/.1);overflow:hidden;";
      this.quill.container.appendChild(this.container);

      // Delegated mouseover — unified with keyboard navigation via updateSelection
      this.container.addEventListener("mouseover", (e) => {
        const btn = (e.target as HTMLElement).closest("[data-index]") as HTMLElement | null;
        if (!btn) return;
        const index = parseInt(btn.dataset.index ?? "0", 10);
        if (index !== this.selectedIndex) {
          this.selectedIndex = index;
          this.updateSelection();
        }
      });
    }

    const bounds = this.quill.getBounds(this.mentionCharIndex);
    if (bounds) {
      this.container.style.top = `${bounds.top + bounds.height + 4}px`;
      this.container.style.left = `${bounds.left}px`;
    }

    this.container.replaceChildren(
      ...this.results.map((user, i) => {
        const btn = this.buildItemElement(user, i);
        btn.addEventListener("mousedown", (e) => {
          e.preventDefault();
          this.selectItem(i);
        });
        return btn;
      })
    );

    this.isOpen = true;
  }

  private updateSelection() {
    if (!this.container) return;
    const items = this.container.querySelectorAll(".ql-mention-item");
    items.forEach((item, i) => {
      (item as HTMLElement).style.background = i === this.selectedIndex ? "#f4f4f5" : "#fff";
    });
  }

  private close() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.isOpen = false;
    this.results = [];
    this.selectedIndex = 0;
    this.mentionCharIndex = -1;
  }
}

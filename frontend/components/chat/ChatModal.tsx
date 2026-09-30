"use client";

// ChatModal — opens a single ChatThread over the current page, so a buyer
// (or a seller replying from a notification) never has to leave the listing
// or seller-profile page to chat. Used by SellerContactCard, SellerHeader,
// and the listing page's `?chat=<id>` deep-link handler.

import React from "react";
import Modal from "@/components/Modal";
import ChatThread from "@/components/chat/ChatThread";

interface Props {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  meId: string;
  otherUserName?: string | null;
  listingTitle?: string | null;
}

export default function ChatModal({
  open,
  onClose,
  conversationId,
  meId,
  otherUserName,
  listingTitle,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
            {otherUserName || "Chat"}
          </div>
          {listingTitle && (
            <div className="line-clamp-1" style={{ fontSize: 12, fontWeight: 400, color: "var(--faint)" }}>
              {listingTitle}
            </div>
          )}
        </div>
      }
      bodyClassName="chat-modal-body"
    >
      <div style={{ margin: -22, display: "flex", flexDirection: "column", minHeight: 420 }}>
        <ChatThread conversationId={conversationId} meId={meId} maxHeight="60vh" />
      </div>
    </Modal>
  );
}

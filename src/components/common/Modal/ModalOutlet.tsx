"use client";

import { useEffect, useState, useCallback } from "react";
import Modal from "./Modal";
import { useModal, type ModalEntry } from "./ModalContext";

export default function ModalOutlet() {
  const { modals, closeModal } = useModal();
  const [renderedModals, setRenderedModals] = useState<ModalEntry[]>([]);

  useEffect(() => {
    setRenderedModals((prev) => {
      const merged = [...prev];
      for (const modal of modals) {
        const existingIdx = merged.findIndex((m) => m.id === modal.id);
        if (existingIdx === -1) {
          merged.push(modal);
        } else {
          merged[existingIdx] = modal;
        }
      }
      return merged;
    });
  }, [modals]);

  const handleExited = useCallback((id: string) => {
    setRenderedModals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const isOpenInContext = (id: string) => modals.some((m) => m.id === id);

  return (
    <>
      {renderedModals.map((modal) => (
        <Modal
          key={modal.id}
          open={isOpenInContext(modal.id)}
          onClose={() => closeModal(modal.id)}
          onExited={() => handleExited(modal.id)}
          size={modal.size}
          title={modal.title}
          hideCloseButton={modal.hideCloseButton}
          closeOnBackdropClick={modal.closeOnBackdropClick}
          closeOnEscape={modal.closeOnEscape}
          footer={modal.footer}
        >
          {modal.content}
        </Modal>
      ))}
    </>
  );
}

"use client";

import { Dialog } from "@radix-ui/themes";

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ title, onClose, children }: Props) {
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Content maxWidth="440px">
        <Dialog.Title>{title}</Dialog.Title>
        {children}
      </Dialog.Content>
    </Dialog.Root>
  );
}

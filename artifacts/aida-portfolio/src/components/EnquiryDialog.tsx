import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import EnquiryForm from "@/components/EnquiryForm";

export default function EnquiryDialog({
  kind,
  subjectId,
  subjectName,
  trigger,
  defaultOpen = false,
  onOpenChange,
}: {
  kind: "artwork" | "moving_image";
  subjectId?: string;
  subjectName?: string;
  trigger: ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const moving = kind === "moving_image";
  return (
    <Dialog.Root defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="enquiry-modal__overlay" />
        <Dialog.Content className="enquiry-modal" data-public-site>
          <Dialog.Close
            className="enquiry-modal__close"
            aria-label="Close form"
          >
            <X aria-hidden="true" />
          </Dialog.Close>
          <header className="enquiry-modal__header">
            <p>{moving ? "CREATIVE ENQUIRY" : "ARTWORK ENQUIRY"}</p>
            <Dialog.Title>
              {moving
                ? "Tell me about your project."
                : `Enquire about ${subjectName}`}
            </Dialog.Title>
            <Dialog.Description className="enquiry-modal__description">
              {moving
                ? "Share the timing, budget and visual direction you have in mind."
                : "Aida will reply personally with availability, shipping and collection details."}
            </Dialog.Description>
          </header>
          <EnquiryForm
            kind={kind}
            subjectId={subjectId}
            subjectName={subjectName}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

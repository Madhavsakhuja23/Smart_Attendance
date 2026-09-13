import { useEffect, useRef } from "react";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "520px",
  showCloseButton = true
}) {
  const modalRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="modal-container"
        ref={modalRef}
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          {title && (
            <h3 id="modal-title" className="modal-title">
              {title}
            </h3>
          )}
          {showCloseButton && (
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close dialog"
            >
              ✕
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

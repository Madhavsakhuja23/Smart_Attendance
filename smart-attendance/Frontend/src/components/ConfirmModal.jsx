import Modal from "./Modal";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  loading = false
}) {
  return (
    <Modal isOpen={isOpen} onClose={loading ? () => {} : onClose} title={title} maxWidth="460px">
      <div className="confirm-modal-content">
        <div className="confirm-modal-icon-row">
          <div
            className={`confirm-modal-badge ${
              isDestructive ? "badge-destructive" : "badge-info"
            }`}
          >
            {isDestructive ? "⚠" : "ℹ"}
          </div>
          <div className="confirm-modal-text">
            <p className="confirm-modal-message">{message}</p>
          </div>
        </div>

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${isDestructive ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

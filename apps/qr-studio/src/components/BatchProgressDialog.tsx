import { useEffect, useRef } from "react";
import type { ExportProgress } from "./SidebarExport";

interface Props {
  progress: ExportProgress;
}

export function BatchProgressDialog({ progress }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const percentage = Math.round((progress.current / Math.max(progress.total, 1)) * 100);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  return <dialog ref={dialogRef} className="qr-progress-dialog" role="alertdialog" aria-modal="true" aria-labelledby="qr-progress-dialog-title" aria-describedby="qr-progress-dialog-detail" onCancel={(event) => event.preventDefault()}>
    <div className="qr-progress-spinner" aria-hidden="true" />
    <h2 id="qr-progress-dialog-title">{progress.label}</h2>
    <div className="qr-progress-summary"><span>Batch export in progress</span><strong>{percentage}%</strong></div>
    <progress value={progress.current} max={progress.total} aria-label={`Batch export ${percentage}% complete`} />
    <p id="qr-progress-dialog-detail">{progress.detail}</p>
    <small>Please keep this page open. The download will start automatically when the ZIP is ready.</small>
  </dialog>;
}

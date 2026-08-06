import { useEffect, useRef } from "react";

interface Props {
  message: string;
  onClose: () => void;
}

export function CsvErrorDialog({ message, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  return <dialog ref={dialogRef} className="qr-csv-dialog" role="alertdialog" aria-modal="true" aria-labelledby="qr-csv-dialog-title" aria-describedby="qr-csv-dialog-message" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="qr-csv-dialog-icon" aria-hidden="true">!</div>
    <h2 id="qr-csv-dialog-title">CSV file could not be loaded</h2>
    <p id="qr-csv-dialog-message">{message}</p>
    <p className="qr-csv-dialog-help">Check that the file:</p>
    <ul>
      <li>Is a CSV file with <code>name,data</code> columns</li>
      <li>Has one QR value per row</li>
      <li>Contains no more than 250 data rows</li>
    </ul>
    <button type="button" className="qr-primary-action" autoFocus onClick={onClose}>Close</button>
  </dialog>;
}

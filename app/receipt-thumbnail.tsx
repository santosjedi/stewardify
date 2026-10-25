"use client";

import { useRef } from "react";
import styles from "./page.module.css";

// A small receipt photo. Clicking it opens a larger view; click anywhere to close.
export function ReceiptThumbnail({ url, description }: { url: string; description: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className={styles.thumbnailButton}
        onClick={() => dialogRef.current?.showModal()}
        aria-label={`View receipt for ${description}`}
      >
        <img src={url} alt="" className={styles.thumbnail} />
      </button>

      <dialog ref={dialogRef} className={styles.viewer} onClick={() => dialogRef.current?.close()}>
        <img src={url} alt={`Receipt for ${description}`} className={styles.viewerImage} />
        <p className={styles.viewerHint}>Click anywhere to close</p>
      </dialog>
    </>
  );
}

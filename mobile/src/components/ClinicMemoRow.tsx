import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActionRow } from "./ActionRow";
import { Icon } from "./Icon";
import { PhotoViewer } from "./PhotoViewer";
import { useClinicMemo } from "../lib/useClinicMemo";

/**
 * "From the Doctor": photos of clinic memos, kept on this phone. A new photo is added on top; earlier ones stay.
 * Empty: tap → camera/file picker. With photos: the row shows the newest; tap → all photos, each with
 * "Remove photo" (asks once), and "Add a photo". No upload, no reading of the memo, no advice.
 */
export function ClinicMemoRow({ title }: { title: string }) {
  const { t } = useTranslation();
  const { photos, busy, failed, add, remove } = useClinicMemo();
  const [viewing, setViewing] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickPhoto = () => inputRef.current?.click();
  const newest = photos[0] ?? null;
  const subtitle = busy ? t("health.memoSaving") : failed ? t("health.memoFailed") : newest ? t("health.memoSet", { count: photos.length }) : t("health.memoEmpty");
  const close = () => { setViewing(false); setConfirmingId(null); };

  return (
    <>
      <ActionRow
        icon={newest ? <img src={newest.dataUrl} alt="" /> : <Icon name="camera" />}
        iconTone="peach"
        title={title}
        subtitle={subtitle}
        onClick={newest ? () => setViewing(true) : pickPhoto}
        disabled={busy}
      />
      <input
        ref={inputRef}
        hidden
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => {
          void add(event.target.files?.[0]);
          // Let the same file be picked again.
          event.target.value = "";
        }}
      />
      {viewing && photos.length > 0 && (
        <PhotoViewer
          title={title}
          closeLabel={t("health.memoClose")}
          onClose={close}
          actions={<button type="button" className="secondary-button" onClick={pickPhoto} disabled={busy}>{t("health.memoAdd")}</button>}
        >
          {photos.map((photo) => (
            <figure key={photo.id} className="memo-photo">
              <img className="photo-viewer__image" src={photo.dataUrl} alt={t("health.memoAlt")} />
              <figcaption className="memo-photo__actions">
                {confirmingId === photo.id ? (
                  <>
                    <button type="button" className="secondary-button" onClick={() => { remove(photo.id); setConfirmingId(null); }}>{t("health.memoRemoveConfirm")}</button>
                    <button type="button" className="text-button" onClick={() => setConfirmingId(null)}>{t("health.memoKeep")}</button>
                  </>
                ) : (
                  <button type="button" className="text-button" onClick={() => setConfirmingId(photo.id)}>{t("health.memoRemove")}</button>
                )}
              </figcaption>
            </figure>
          ))}
        </PhotoViewer>
      )}
    </>
  );
}

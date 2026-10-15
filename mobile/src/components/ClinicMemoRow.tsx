import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActionRow } from "./ActionRow";
import { Icon } from "./Icon";
import { PhotoViewer } from "./PhotoViewer";
import { useClinicMemo } from "../lib/useClinicMemo";

/**
 * "Doctor's tiny tasks": a photo of the clinic memo, kept on this phone.
 * Empty: tap → camera/file picker. With a photo: the row shows a thumbnail; tap → larger view with "Replace photo".
 * No upload, no reading of the memo, no advice.
 */
export function ClinicMemoRow({ title }: { title: string }) {
  const { t } = useTranslation();
  const { photo, busy, failed, choose } = useClinicMemo();
  const [viewing, setViewing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickPhoto = () => inputRef.current?.click();
  const subtitle = busy ? t("health.memoSaving") : failed ? t("health.memoFailed") : photo ? t("health.memoSet") : t("health.memoEmpty");

  return (
    <>
      <ActionRow
        icon={photo ? <img src={photo} alt="" /> : <Icon name="camera" />}
        iconTone="peach"
        title={title}
        subtitle={subtitle}
        onClick={photo ? () => setViewing(true) : pickPhoto}
        disabled={busy}
      />
      <input
        ref={inputRef}
        hidden
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => {
          void choose(event.target.files?.[0]);
          // Let the same file be picked again after a replace.
          event.target.value = "";
          setViewing(false);
        }}
      />
      {viewing && photo && (
        <PhotoViewer
          src={photo}
          alt={t("health.memoAlt")}
          title={title}
          closeLabel={t("health.memoClose")}
          onClose={() => setViewing(false)}
          actions={<button type="button" className="secondary-button" onClick={pickPhoto}>{t("health.memoReplace")}</button>}
        />
      )}
    </>
  );
}

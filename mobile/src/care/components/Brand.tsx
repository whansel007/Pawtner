import { useTranslation } from "react-i18next";
import { Icon } from "../../components/Icon";

/** Paw + wordmark. A button when it navigates, plain text otherwise. */
export function Brand({ onClick }: { onClick?: () => void }) {
  const { t } = useTranslation();
  const content = (
    <>
      <Icon name="paw" size={26} className="care-brand__paw" />
      <span>{t("care.web.brand")}</span>
    </>
  );
  if (!onClick) return <span className="care-brand">{content}</span>;
  return (
    <button className="care-brand" type="button" onClick={onClick} aria-label={t("care.web.brandHome")}>
      {content}
    </button>
  );
}

import { useTranslation } from "react-i18next";
import type { CareRoute } from "../routing";
import { DEMO_VIDEO_URL } from "../config";
import { youtubeEmbedUrl } from "../lib/video";
import { CareCard, PageWelcome } from "../components/CareCard";
import { CareLink } from "../components/CareLink";

/**
 * /care/video: the demo video played on our own page (user, 16 Oct: watch it without leaving Pawtner's address).
 * Public, like the landing page. If the link can't be embedded, it falls back to a plain link to the video.
 */
export function VideoPage({ onNavigate }: { onNavigate: (route: CareRoute) => void }) {
  const { t } = useTranslation();
  const embed = youtubeEmbedUrl(DEMO_VIDEO_URL);
  return (
    <div className="care-content care-page-enter">
      <PageWelcome eyebrow={t("care.web.video.eyebrow")} title={t("care.web.video.title")} intro={t("care.web.video.intro")} />
      <CareCard title={t("care.web.video.cardTitle")} className="care-video-card">
        {embed ? (
          <iframe
            className="care-video"
            src={embed}
            title={t("care.web.video.playerTitle")}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <p className="care-hint">
            <a href={DEMO_VIDEO_URL} target="_blank" rel="noopener noreferrer">{t("care.web.video.openElsewhere")}</a>
          </p>
        )}
        <CareLink to="landing" onNavigate={onNavigate} className="care-video__back">{t("care.web.video.back")}</CareLink>
      </CareCard>
    </div>
  );
}

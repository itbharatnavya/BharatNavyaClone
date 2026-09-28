import { useEffect, useState, type ReactNode } from 'react';
import { ExternalLink, ImageOff, Info, Megaphone } from 'lucide-react';

function classes(...items: Array<string | false | undefined>) {
  return items.filter(Boolean).join(' ');
}

function useImageAvailable(src?: string) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return { available: Boolean(src) && !failed, onError: () => setFailed(true) };
}

export function EntityLogo({ src, name, initials, size = 'default', decorative = true, className }: { src?: string; name: string; initials: string; size?: 'small' | 'default' | 'large'; decorative?: boolean; className?: string }) {
  const image = useImageAvailable(src);
  return <span className={classes('ds-entity-logo', `ds-entity-logo--${size}`, className)} aria-label={!decorative ? `${name} logo` : undefined} role={!decorative ? 'img' : undefined}>
    {image.available ? <img src={src} alt="" loading="lazy" onError={image.onError} /> : <span aria-hidden="true">{initials}</span>}
  </span>;
}

export function PersonAvatar({ src, name, initials, size = 'default', className }: { src?: string; name: string; initials: string; size?: 'small' | 'default' | 'large'; className?: string }) {
  const image = useImageAvailable(src);
  return <span className={classes('ds-person-avatar', `ds-person-avatar--${size}`, className)} role="img" aria-label={`${name} profile photo`}>
    {image.available ? <img src={src} alt="" loading="lazy" onError={image.onError} /> : <span aria-hidden="true">{initials}</span>}
  </span>;
}

export function MediaFrame({ src, alt, ratio = 'card', loading = 'lazy', className, fallbackLabel = 'Media unavailable', overlay }: { src?: string; alt: string; ratio?: 'wide' | 'card' | 'square' | 'portrait'; loading?: 'lazy' | 'eager'; className?: string; fallbackLabel?: string; overlay?: ReactNode }) {
  const image = useImageAvailable(src);
  return <figure className={classes('ds-media-frame', `ds-media-frame--${ratio}`, className)}>
    {image.available ? <img src={src} alt={alt} loading={loading} onError={image.onError} /> : <span className="ds-media-frame__fallback"><ImageOff size={20} aria-hidden="true" />{fallbackLabel}</span>}
    {overlay && <figcaption>{overlay}</figcaption>}
  </figure>;
}

export function MediaStrip({ items, label }: { items: Array<{ src?: string; alt: string; label?: string }>; label: string }) {
  return <div className="ds-media-strip" aria-label={label}>{items.map((item, index) => <MediaFrame key={`${item.src ?? 'missing'}-${index}`} src={item.src} alt={item.alt} overlay={item.label} />)}</div>;
}

export function MediaRecord({ media, children, action, className }: { media: { src?: string; alt: string }; children: ReactNode; action?: ReactNode; className?: string }) {
  return <article className={classes('ds-media-record', className)}><MediaFrame src={media.src} alt={media.alt} ratio="square" /><div className="ds-media-record__copy">{children}</div>{action && <div className="ds-media-record__action">{action}</div>}</article>;
}

export interface ThirdPartyAd {
  id: string;
  advertiser: string;
  headline: string;
  body: string;
  cta: string;
  href: string;
  logo: string;
  creative: string;
  creativeAlt: string;
  context: string;
}

export function Advertisement({ ad, format = 'partner', blocked = false, className }: { ad: ThirdPartyAd; format?: 'partner' | 'rail' | 'inline'; blocked?: boolean; className?: string }) {
  const [showReason, setShowReason] = useState(false);
  return <aside className={classes('ds-advertisement', `ds-advertisement--${format}`, blocked && 'is-blocked', className)} aria-label={`Advertisement from ${ad.advertiser}`}>
    <div className="ds-advertisement__label"><Megaphone size={14} aria-hidden="true" /><strong>Advertisement</strong><span>External partner</span></div>
    {blocked ? <div className="ds-advertisement__blocked"><ImageOff size={22} aria-hidden="true" /><strong>Creative unavailable</strong><span>The advertiser message could not be loaded.</span></div> : <>
      <MediaFrame src={ad.creative} alt={ad.creativeAlt} ratio={format === 'rail' ? 'portrait' : 'wide'} />
      <div className="ds-advertisement__identity"><EntityLogo src={ad.logo} name={ad.advertiser} initials={ad.advertiser.slice(0, 2).toUpperCase()} size="small" /><span><strong>{ad.advertiser}</strong><small>Prototype advertiser</small></span></div>
      <div className="ds-advertisement__copy"><h3>{ad.headline}</h3><p>{ad.body}</p></div>
      <a href={ad.href} target="_blank" rel="sponsored noopener noreferrer">{ad.cta}<ExternalLink size={15} aria-hidden="true" /></a>
    </>}
    <button className="ds-advertisement__why" type="button" aria-expanded={showReason} onClick={() => setShowReason((current) => !current)}><Info size={14} aria-hidden="true" />Why this ad?</button>
    {showReason && <p className="ds-advertisement__reason">{ad.context} No private profile or application data was used.</p>}
  </aside>;
}


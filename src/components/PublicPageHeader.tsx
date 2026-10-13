type Props = {
  onBack: () => void;
  eyebrow: string;
  title: string;
  lede: string;
};

export function PublicPageHeader({ onBack, eyebrow, title, lede }: Props) {
  return (
    <header className="public-page-header">
      <button type="button" className="text-button back-link" onClick={onBack}>← Back</button>
      <div className="public-page-heading">
        <img
          className="public-emblem"
          src="/brand/knight-emblem-160.jpg"
          alt=""
          width={72}
          height={72}
          decoding="async"
        />
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
        </div>
      </div>
      <p className="public-lede">{lede}</p>
    </header>
  );
}

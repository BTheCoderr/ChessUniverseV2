type NativeDestination = "home" | "play" | "learn" | "online" | "account";

type Props = {
  activeView: string;
  onNavigate: (view: NativeDestination) => void;
};

const TABS: Array<{ view: NativeDestination; icon: string; label: string }> = [
  { view: "home", icon: "⌂", label: "Home" },
  { view: "play", icon: "♟", label: "Play" },
  { view: "learn", icon: "◫", label: "Learn" },
  { view: "online", icon: "◉", label: "Online" },
  { view: "account", icon: "♞", label: "Profile" },
];

export function NativeTabBar({ activeView, onNavigate }: Props) {
  return (
    <nav className="native-tab-bar" aria-label="Chess Universe mobile navigation">
      {TABS.map((tab) => (
        <button
          key={tab.view}
          type="button"
          className={activeView === tab.view ? "active" : ""}
          onClick={() => onNavigate(tab.view)}
          aria-label={tab.label}
        >
          <span aria-hidden="true">{tab.icon}</span>
          <small>{tab.label}</small>
        </button>
      ))}
    </nav>
  );
}

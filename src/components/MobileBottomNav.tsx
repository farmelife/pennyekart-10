import { Home, Tag, User, ShoppingCart, PlayCircle } from "lucide-react";

const tabs = [
  { icon: Home, label: "Home" },
  { icon: PlayCircle, label: "Play" },
  { icon: Tag, label: "Top Deals" },
  { icon: User, label: "Account" },
  { icon: ShoppingCart, label: "Cart" },
];

const MobileBottomNav = () => (
  <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden">
    <div className="flex items-center justify-around py-2">
      {tabs.map((t, i) => (
        <button
          key={t.label}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
            i === 0
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <t.icon className="h-5 w-5" />
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  </nav>
);

export default MobileBottomNav;

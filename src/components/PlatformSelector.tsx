import { useState } from "react";
import logo from "@/assets/logo.png";
import { ShoppingBag, UtensilsCrossed, Wrench } from "lucide-react";

const platforms = [
  { id: "pennyekart", label: "Pennyekart", icon: ShoppingBag, logo: true },
  { id: "pennycarbs", label: "Penny Carbs", icon: UtensilsCrossed, logo: false },
  { id: "pennyservices", label: "Penny Services", icon: Wrench, logo: false },
];

interface Props {
  selected: string;
  onSelect: (id: string) => void;
}

const PlatformSelector = ({ selected, onSelect }: Props) => (
  <div className="bg-primary">
    <div className="container flex items-center gap-2 overflow-x-auto py-2 scrollbar-hide">
      {platforms.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            selected === p.id
              ? "bg-card text-foreground shadow-sm"
              : "bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
          }`}
        >
          {p.logo ? (
            <img src={logo} alt={p.label} className="h-5" />
          ) : (
            <p.icon className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{p.label}</span>
          <span className="sm:hidden">{p.label.split(" ").pop()}</span>
        </button>
      ))}
    </div>
  </div>
);

export default PlatformSelector;

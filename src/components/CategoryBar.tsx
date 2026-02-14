import {
  Smartphone,
  Shirt,
  Home,
  Dumbbell,
  Sparkles,
  BookOpen,
  Laptop,
  Baby,
  Car,
  Gift,
} from "lucide-react";

const categories = [
  { icon: Smartphone, name: "Mobiles" },
  { icon: Laptop, name: "Electronics" },
  { icon: Shirt, name: "Fashion" },
  { icon: Home, name: "Home" },
  { icon: Sparkles, name: "Beauty" },
  { icon: Dumbbell, name: "Sports" },
  { icon: BookOpen, name: "Books" },
  { icon: Baby, name: "Kids" },
  { icon: Car, name: "Auto" },
  { icon: Gift, name: "Gifts" },
];

const CategoryBar = () => (
  <div className="border-b bg-card">
    <div className="container py-3">
      {/* Desktop: single scrollable row */}
      <div className="hidden md:flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide">
        {categories.map((c) => (
          <button
            key={c.name}
            className="group flex flex-col items-center gap-1.5 px-3 py-1 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-secondary group-hover:text-secondary-foreground">
              <c.icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
              {c.name}
            </span>
          </button>
        ))}
      </div>

      {/* Mobile: two rows, scrollable */}
      <div className="md:hidden">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {categories.slice(0, 5).map((c) => (
            <button
              key={c.name}
              className="group flex shrink-0 flex-col items-center gap-1.5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-secondary group-hover:text-secondary-foreground">
                <c.icon className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {c.name}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-4 overflow-x-auto pt-1 scrollbar-hide">
          {categories.slice(5).map((c) => (
            <button
              key={c.name}
              className="group flex shrink-0 flex-col items-center gap-1.5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-secondary group-hover:text-secondary-foreground">
                <c.icon className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {c.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default CategoryBar;

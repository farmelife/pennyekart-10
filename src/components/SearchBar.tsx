import { Search, User, Wallet, ShoppingCart } from "lucide-react";

const SearchBar = () => (
  <div className="border-b bg-card">
    <div className="container flex items-center gap-3 py-2.5">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search for Products, Brands and More"
          className="w-full rounded-lg border bg-muted/50 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:bg-card"
        />
      </div>

      {/* Actions - desktop */}
      <div className="hidden items-center gap-1 sm:flex">
        <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
          <User className="h-4 w-4" />
          <span>Login</span>
        </button>
        <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
          <Wallet className="h-4 w-4" />
          <span>Wallet</span>
        </button>
        <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
          <ShoppingCart className="h-4 w-4" />
          <span>Cart</span>
        </button>
      </div>

      {/* Actions - mobile icons only */}
      <div className="flex items-center gap-2 sm:hidden">
        <button className="rounded-lg p-2 text-foreground hover:bg-muted" aria-label="Login">
          <User className="h-5 w-5" />
        </button>
        <button className="rounded-lg p-2 text-foreground hover:bg-muted" aria-label="Cart">
          <ShoppingCart className="h-5 w-5" />
        </button>
      </div>
    </div>
  </div>
);

export default SearchBar;

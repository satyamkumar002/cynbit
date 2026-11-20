import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="no-print mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm text-muted sm:grid-cols-3">
        <div>
          <p className="font-semibold text-text">Cynbit Technologies</p>
          <p className="mt-2">32/115 Pratap Nagar, Jaipur, Rajasthan 302033</p>
        </div>
        <div>
          <p className="font-semibold text-text">Talk to us</p>
          <ul className="mt-2 space-y-1">
            <li>
              New projects: <a className="hover:text-text" href="mailto:opportunities@cynbit.in">opportunities@cynbit.in</a>
            </li>
            <li>
              Support: <a className="hover:text-text" href="mailto:support@cynbit.in">support@cynbit.in</a>
            </li>
            <li>
              Phone: <a className="hover:text-text" href="tel:+918947962667">+91 89479 62667</a>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-text">Try the prototype</p>
          <ul className="mt-2 space-y-1">
            <li><Link className="hover:text-text" href="/start">Project Blueprint builder</Link></li>
            <li><Link className="hover:text-text" href="/bitelevate">BitElevate Path Finder</Link></li>
            <li><Link className="hover:text-text" href="/admin">Team dashboard</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

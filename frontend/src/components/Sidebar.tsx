/** Shared club selector and navigation. Home is the only available page for now. */
export default function Sidebar() {
  return (
<aside className="dashboard-sidebar">
          <p className="dashboard-logo">C.E.O. <span className="dashboard-version">v1</span></p>

          <button className="club-selector" type="button" disabled>
            Select a club
            <span aria-hidden="true">⌄</span>
          </button>

          <nav aria-label="Main navigation">
            <button
              className="nav-item nav-item-active"
              type="button"
              aria-current="page"
            >
              Home
            </button>
            <button className="nav-item" type="button" disabled>
              Members <span>Coming soon</span>
            </button>
            <button className="nav-item" type="button" disabled>
              Events <span>Coming soon</span>
            </button>
            <button className="nav-item" type="button" disabled>
              Finance <span>Coming soon</span>
            </button>
          </nav>
        </aside>
  );
}

# Alex Bell — Engineering portfolio

A responsive, accessible static portfolio for engineering, robotics and embedded-systems job and internship applications. Built with HTML, CSS and a small progressive-enhancement script; no package installation or build tool is required.

## Preview locally

```sh
python3 -m http.server 8080
```

Open http://localhost:8080. Alternatively open `index.html` directly.

## Publish on GitHub Pages

1. Open this repository’s **Settings → Pages**.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. Push to `main`, or manually run **Deploy portfolio to GitHub Pages** from the Actions tab.

The workflow uploads only the public site files and deploys to https://alexbnz-1.github.io/Portfolio/. Asset paths are relative so the project URL works correctly.

The site can also be deployed from the `main` branch, using `/ (root)` as the publishing folder, without the Actions workflow.

## Update the portfolio

- **Content and links:** edit `index.html`.
- **Design and mobile layouts:** edit `styles.css` and `experience.css`.
- **Project assets:** add them to `assets/` and reference their relative paths.
- **CV:** once a current CV is available, place it in `assets/` and add a descriptive download link. No placeholder CV is included.
- **Contact:** currently uses the supplied LinkedIn profile. Add an email only if you want it publicly visible.

## Content notes

Seven projects are included: RoboCup, RoboDev, OpenBrain, the autonomous line-follower (including the Jit Following Jawn work), the ENME302 frame toolkit, elevator controls and desktop CNC. Descriptions are based on shared source folders, public project documentation and the original portfolio. The University of Canterbury mechatronics education is supported by the original portfolio and supplied LinkedIn profile. The system diagrams explain the documented architecture; they are not photographs or claims of tested hardware. RoboDev is marked as in development and RoboCup as a team project. Awards, employment history, individual team contributions and performance results have not been invented.

External Google Fonts enhance the typography, with local system-font fallbacks when unavailable. The site uses no analytics, cookies, contact-form service or backend.

## Interaction and accessibility

Project filters, animated reveals, subtle pointer tilt and a keyboard-accessible image viewer are progressive enhancements. The viewer supports Escape and left/right arrow keys. Reduced-motion preferences disable animation. Case studies remain readable without JavaScript. Original images are optimised as WebP assets.

## Hardware showcase

The hardware design projects lead the source order. The opening collage and sticky three-chapter hardware showcase use real portfolio assets. Native scrolling drives chapter transitions, image movement, a CAD-to-prototype reveal, hero typography and the horizontal divider. Chapter buttons provide direct navigation. On short screens and with reduced-motion preferences the showcase becomes a static sequence. No animation library or scroll interception is used.

### Engineering lab

The Frame solver GUI tab is an employer-facing case study of the original desktop application, with actual GUI screenshots and explanations of modelling, visual analysis, shared architecture and calculation reporting. The browser truss simulator has been removed.

The Elevator control tab is a five-floor browser simulation inspired by the PLC project. It implements directional request scheduling, PI speed feedback, door dwell and interlocks, an obstruction sensor, pause/reset, emergency stop, and live velocity telemetry. It does not execute the original Structured Text program.

### Design and development

The redesign applies the installed taste skill: asymmetric real-photo hero, restrained typography, one page-level theme with light/dark toggle, consistent olive accent, and hardware-first ordering. GSAP ScrollTrigger drives the scroll narrative without custom scroll event listeners; CSS sticky keeps normal native scrolling. Animation and fonts are self-hosted. GSAP's license is stated in the vendored file headers: https://gsap.com/standard-license. Manrope and IBM Plex Mono use the SIL Open Font License.

Run `npm ci` to restore development dependencies. Run `npm run serve` for local preview. Rebuild the CSS bundle after edits with `cat styles.css experience.css lab.css > bundle.css`. GitHub Pages requires no runtime backend or npm build.

RoboCup uses the supplied original CAD render in the hero, hardware scroll showcase and featured project. The project includes keyboard-accessible assembly, belt-drive and front-assembly detail controls; these inspect the render rather than simulating a 3D model.

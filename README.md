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
- **Design and mobile layouts:** edit `styles.css`.
- **Project assets:** add them to `assets/` and reference their relative paths.
- **CV:** once a current CV is available, place it in `assets/` and add a descriptive download link. No placeholder CV is included.
- **Contact:** currently uses the supplied LinkedIn profile. Add an email only if you want it publicly visible.

## Content notes

Seven projects are included: RoboCup, RoboDev, OpenBrain, the autonomous line-follower (including the Jit Following Jawn work), the ENME302 frame toolkit, elevator controls and desktop CNC. Descriptions are based on shared source folders, public project documentation and the original portfolio. The University of Canterbury mechatronics education is supported by the original portfolio and supplied LinkedIn profile. The system diagrams explain the documented architecture; they are not photographs or claims of tested hardware. RoboDev is marked as in development and RoboCup as a team project. Awards, employment history, individual team contributions and performance results have not been invented.

External Google Fonts enhance the typography, with local system-font fallbacks when unavailable. The site uses no analytics, cookies, contact-form service or backend.

## Interaction and accessibility

Project filters, animated reveals, subtle pointer tilt and a keyboard-accessible image viewer are progressive enhancements. The viewer supports Escape and left/right arrow keys. Reduced-motion preferences disable animation. Case studies remain readable without JavaScript. Original images are optimised as WebP assets.

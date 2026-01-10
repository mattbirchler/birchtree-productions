# Birchtree Productions Website

## Project Overview
Portfolio website for Birchtree Productions, LLC - an indie app development company. Built with vanilla HTML, CSS, and JavaScript.

## Design System

### Colors
- **Accent color**: `rgb(136, 57, 239)` (purple)
- **Accent hover**: `rgb(156, 87, 255)`
- **Gradient**: `linear-gradient(135deg, rgb(136, 57, 239) 0%, #db2777 100%)`
- All CSS variables are defined in `styles.css`

### Typography
- Font: Atkinson Hyperlegible Next (Google Fonts)
- App icons use 22% border-radius

### Shared Styles
- All pages use `styles.css` as the base stylesheet
- App sub-pages add page-specific styles in a `<style>` block in the head

## Page Structure

### All Pages Must Include
1. **Background shapes** - Floating colored blobs for visual interest
   ```html
   <div class="background-shapes">
       <div class="shape shape-1"></div>
       <div class="shape shape-2"></div>
       <div class="shape shape-3"></div>
   </div>
   ```

2. **Scroll indicator** - Bouncing arrow button at bottom of hero section
   ```html
   <a href="#features" class="scroll-indicator fade-in" aria-label="Scroll down">
       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
           <polyline points="6 9 12 15 18 9"></polyline>
       </svg>
   </a>
   ```

3. **Dynamic copyright year** - Footer uses JavaScript to show current year
   ```html
   <span id="current-year"></span>
   ```
   ```javascript
   document.getElementById('current-year').textContent = new Date().getFullYear();
   ```

4. **Scroll reveal animations** - Elements with class `scroll-reveal` animate in on scroll

5. **Fade-in animations** - Hero content uses class `fade-in`

### App Sub-Pages Structure
Each app page in `apps/[app-name]/index.html` should have:
- Sticky navigation with app icon and name linking back to home (`../../`)
- Hero section with title, subtitle, download buttons, screenshot, and scroll indicator
- Features section with `id="features"` (scroll indicator target)
- CTA section with dark gradient background
- Footer with privacy policy link and copyright

### Navigation Patterns
- Main site: Full navbar with Apps, Creative, About links
- App pages: Minimal nav with app branding and Features/Pricing links
- All navs use backdrop blur effect when scrolled

## File Organization

```
/
├── index.html              # Main landing page
├── styles.css              # Shared styles
├── CLAUDE.md               # This file
├── .gitignore
├── images/                 # All images
│   ├── [app-name].png      # App icons (1024x1024 or similar)
│   ├── matt.jpg            # Profile photo
│   └── [app]-[feature].png # App screenshots
└── apps/
    └── [app-name]/
        ├── index.html      # App landing page
        └── privacy.html    # Privacy policy
```

## Screenshot Guidelines
- Hero screenshots: 16:10 aspect ratio
- Feature screenshots: 4:3 aspect ratio
- Images should be edge-to-edge (no gradient backgrounds needed)
- Use placeholder divs during development:
  ```html
  <div class="screenshot-placeholder">
      <span>filename.png</span>
  </div>
  ```

## Common Patterns

### Download Buttons
```html
<div class="download-buttons">
    <a href="https://apps.apple.com/..." class="download-btn download-btn-primary">
        <!-- Apple icon SVG -->
        Download for iPhone & iPad
    </a>
    <a href="https://apps.apple.com/..." class="download-btn download-btn-secondary">
        <!-- Mac icon SVG -->
        Download for Mac
    </a>
</div>
```

### Feature Sections
- Alternate between normal and `-alt` (gray background) sections
- Use `feature-grid` for image + text layouts
- Use `feature-grid-reverse` to flip the layout

### Analytics
All pages include Plausible analytics:
```html
<script defer data-domain="quickstuff.app" src="https://plausible.io/js/script.js"></script>
```

## Content Guidelines
- Emphasize indie development spirit and early web values
- No algorithms, no tracking, no bloat messaging
- Focus on privacy and on-device processing for apps
- Mention "Founded in 2025" in about section

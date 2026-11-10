// The pixel friends: a small version of me and my cats Capitu and Sancho, living along the bottom of the window.
// Loaded as a module after main.js; everything else is imported from boot.js only when the page can run it.
if (window.SITE && window.SITE.addCommands && window.requestAnimationFrame && window.matchMedia) import("./boot.js");

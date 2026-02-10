import defaultTheme from "tailwindcss/defaultTheme";

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}", // <-- include js and jsx
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", ...defaultTheme.fontFamily.sans],
        heading: ["Playfair Display", ...defaultTheme.fontFamily.serif],
      },
      colors: {
        marblewhite: "#ffffff",
        marbleblack: "#17160f",
        backnewswhite: "#d78822", // brand orange
        backnewsdark: "#134800", // brand green
        lightgreen: "#578d49", // helper for dark-mode text accents
        darkgray: "#2a2a2a", // helper for dark surfaces
      },
      container: {
        center: true,
        padding: "1rem",
      },
      ringOffsetWidth: { 2: "2px" }, // nicer focus rings
    },
  },
  plugins: [],
};

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}", // <-- include js and jsx
  ],
  theme: {
    extend: {
      colors: {
        marblewhite: "#f8fcfe",
        marbleblack: "#17160f",
        backnewswhite: "#ec8b0b", // brand orange
        backnewsdark: "#578d49", // brand green
        lightgreen: "#9ccb8b", // helper for dark-mode text accents
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

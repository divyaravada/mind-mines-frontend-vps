export default {
  server: {
    proxy: {
      "/api": {
        target: "https://mindmines.eu",
        changeOrigin: true,
      },
    },
  },
};

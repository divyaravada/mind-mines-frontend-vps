// src/data/homeCategories.ts
import marbleTray from "../assets/marbleTray.jpg";
import kitchen from "../assets/kitchen.jpg";
import homeDecor from "../assets/homeDecor.jpg";
import office from "../assets/office.jpg";
import sculpture from "../assets/sculpture.jpg";
import bathroom from "../assets/bathroom.jpg";
import naturalStone from "../assets/naturalStone.jpg";
import countertops from "../assets/countertops.jpg";

export const homeCategories = [
  {
    key: "MIND00",
    id: "natural_stone",
    image: naturalStone,
    label: "home.categories.natural_stone.heading",
    link: "/natural-stone", // landing with slabs/tiles/services
  },
  // {
  //   key: "MIND01",
  //   id: "countertops",
  //   image: countertops,
  //   label: "home.categories.countertops.heading",
  //   link: "/natural-stone/countertops",
  // },
  {
    key: "MIND02",
    id: "home_decor",
    image: homeDecor,
    label: "home.categories.home_decor.heading",
    link: "/decorative-products/category/home-decor",
  },
  {
    key: "MIND03",
    id: "storage",
    image: marbleTray,
    label: "home.categories.storage.heading",
    link: "/decorative-products/category/storage-organization",
  },
  {
    key: "MIND04",
    id: "kitchen",
    image: kitchen,
    label: "home.categories.kitchen.heading",
    link: "/decorative-products/category/kitchen-serveware",
  },
  {
    key: "MIND05",
    id: "office",
    image: office,
    label: "home.categories.office.heading",
    link: "/decorative-products/category/office-supplies",
  },
  {
    key: "MIND06",
    id: "bathroom",
    image: bathroom,
    label: "home.categories.bathroom.heading",
    link: "/decorative-products/category/bathroom-accessories",
  },
  {
    key: "MIND07",
    id: "sculpture",
    image: sculpture,
    label: "home.categories.sculpture.heading",
    link: "/decorative-products/category/sculptures-customization",
  },
];

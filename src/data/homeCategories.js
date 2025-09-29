// src/data/homeCategories.ts
import marbleTray from "../assets/marbleTray.jpg";
import kitchen from "../assets/kitchen.jpg";
import homeDecor from "../assets/homeDecor.jpg";
import office from "../assets/office.jpg";
import sculpture from "../assets/sculpture.jpg";
import bathroom from "../assets/bathroom.jpg";

export const homeCategories = [
  {
    key: "MIND01",
    id: "home_decor",
    category: "home_decor",
    image: homeDecor,
    label: "home.categories.home_decor",
    link: "/decorative-products/category/home-decor",
  },
  {
    key: "MIND02",
    id: "storage",
    image: marbleTray,
    label: "home.categories.storage",
    link: "/decorative-products/category/storage-organization",
  },
  {
    key: "MIND03",
    id: "kitchen",
    image: kitchen,
    label: "home.categories.kitchen",
    link: "/decorative-products/category/kitchen-appliances",
  },
  {
    key: "MIND04",
    id: "office",
    image: office,
    label: "home.categories.office",
    link: "/decorative-products/category/office-supplies",
  },
  {
    key: "MIND05",
    id: "bathroom",
    image: bathroom,
    label: "home.categories.bathroom",
    link: "/decorative-products/category/bathroom-accessories",
  },
  {
    key: "MIND06",
    id: "sculpture",
    image: sculpture,
    label: "home.categories.sculptures_customization",
    link: "/decorative-products/category/sculptures-customization",
  },
];

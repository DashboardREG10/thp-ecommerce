import { onRequestDelete as __api_data_js_onRequestDelete } from "G:\\My Drive\\Antigravity IDE (Project)\\ระบบ E-Commerce\\functions\\api\\data.js"
import { onRequestGet as __api_data_js_onRequestGet } from "G:\\My Drive\\Antigravity IDE (Project)\\ระบบ E-Commerce\\functions\\api\\data.js"
import { onRequestPost as __api_data_js_onRequestPost } from "G:\\My Drive\\Antigravity IDE (Project)\\ระบบ E-Commerce\\functions\\api\\data.js"

export const routes = [
    {
      routePath: "/api/data",
      mountPath: "/api",
      method: "DELETE",
      middlewares: [],
      modules: [__api_data_js_onRequestDelete],
    },
  {
      routePath: "/api/data",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_data_js_onRequestGet],
    },
  {
      routePath: "/api/data",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_data_js_onRequestPost],
    },
  ]
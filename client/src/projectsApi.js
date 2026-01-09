import { api } from "./api";

export async function fetchProjects() {
  const res = await api.get("/projects");
  return res.data;
}

export async function createProject(name) {
  const res = await api.post("/projects", { name });
  return res.data;
}

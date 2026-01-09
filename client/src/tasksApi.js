import { api } from "./api";

export async function fetchTasks(projectId) {
  const res = await api.get("/tasks", { params: { project_id: projectId } });
  return res.data;
}

export async function createTask(payload) {
  const res = await api.post("/tasks", payload);
  return res.data;
}

export async function updateTask(id, payload) {
  const res = await api.patch(`/tasks/${id}`, payload);
  return res.data;
}

export async function deleteTask(id) {
  await api.delete(`/tasks/${id}`);
}

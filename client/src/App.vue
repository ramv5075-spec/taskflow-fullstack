<script setup>
import { ref, onMounted } from "vue";
import { fetchProjects, createProject } from "./projectsApi";
import { fetchTasks, createTask, updateTask, deleteTask } from "./tasksApi";

const projects = ref([]);
const tasks = ref([]);
const selectedProject = ref(null);

const newProject = ref("");
const newTask = ref("");

const loading = ref(false);
const error = ref("");

async function loadProjects() {
  projects.value = await fetchProjects();
}

async function selectProject(project) {
  selectedProject.value = project;
  tasks.value = await fetchTasks(project.id);
}

async function addProject() {
  if (!newProject.value.trim()) return;
  await createProject(newProject.value);
  newProject.value = "";
  await loadProjects();
}

async function addTask() {
  if (!newTask.value.trim() || !selectedProject.value) return;
  await createTask({
    project_id: selectedProject.value.id,
    title: newTask.value,
  });
  newTask.value = "";
  await selectProject(selectedProject.value);
}

async function moveTask(task, status) {
  await updateTask(task.id, { status });
  await selectProject(selectedProject.value);
}

async function removeTask(task) {
  await deleteTask(task.id);
  await selectProject(selectedProject.value);
}

onMounted(loadProjects);
</script>

<template>
  <div style="padding:24px; font-family: Arial; max-width:1100px; margin:auto;">
    <h1>TaskFlow</h1>

    <!-- Projects -->
    <section style="margin-bottom:24px;">
      <h2>Projects</h2>
      <input v-model="newProject" placeholder="New project name" />
      <button @click="addProject">Add</button>

      <ul>
        <li
          v-for="p in projects"
          :key="p.id"
          @click="selectProject(p)"
          style="cursor:pointer;"
        >
          {{ p.name }}
        </li>
      </ul>
    </section>

    <!-- Tasks -->
    <section v-if="selectedProject">
      <h2>Tasks — {{ selectedProject.name }}</h2>

      <input v-model="newTask" placeholder="New task title" />
      <button @click="addTask">Add Task</button>

      <div style="display:flex; gap:16px; margin-top:16px;">
        <div v-for="status in ['TODO','IN_PROGRESS','DONE']" :key="status" style="flex:1;">
          <h3>{{ status }}</h3>
          <div
            v-for="t in tasks.filter(x => x.status === status)"
            :key="t.id"
            style="border:1px solid #ccc; padding:8px; margin-bottom:8px;"
          >
            <div>{{ t.title }}</div>
            <div style="margin-top:6px;">
              <button v-if="status!=='TODO'" @click="moveTask(t,'TODO')">TODO</button>
              <button v-if="status!=='IN_PROGRESS'" @click="moveTask(t,'IN_PROGRESS')">PROGRESS</button>
              <button v-if="status!=='DONE'" @click="moveTask(t,'DONE')">DONE</button>
              <button @click="removeTask(t)">❌</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

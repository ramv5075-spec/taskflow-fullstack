import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import { z } from "zod";

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const db = new Database("taskflow.db");

// --- DB setup ---
db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'TODO',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
`);

const ProjectSchema = z.object({ name: z.string().min(1).max(80) });
const TaskSchema = z.object({
  project_id: z.number().int().positive(),
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
});

// --- Routes ---
app.get("/health", (req, res) => res.json({ ok: true }));

app.get("/projects", (req, res) => {
  const rows = db.prepare("SELECT * FROM projects ORDER BY id DESC").all();
  res.json(rows);
});

app.post("/projects", (req, res) => {
  const parsed = ProjectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const info = db.prepare("INSERT INTO projects (name) VALUES (?)").run(parsed.data.name);
  const project = db.prepare("SELECT * FROM projects WHERE id=?").get(info.lastInsertRowid);
  res.status(201).json(project);
});

app.get("/tasks", (req, res) => {
  const projectId = Number(req.query.project_id);
  const status = req.query.status;

  let query = "SELECT * FROM tasks WHERE 1=1";
  const params = [];

  if (!Number.isNaN(projectId)) { query += " AND project_id=?"; params.push(projectId); }
  if (status) { query += " AND status=?"; params.push(status); }

  query += " ORDER BY id DESC";
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

app.post("/tasks", (req, res) => {
  const parsed = TaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const { project_id, title, description, status } = parsed.data;
  const st = status ?? "TODO";

  const info = db.prepare(`
    INSERT INTO tasks (project_id, title, description, status)
    VALUES (?, ?, ?, ?)
  `).run(project_id, title, description ?? null, st);

  const task = db.prepare("SELECT * FROM tasks WHERE id=?").get(info.lastInsertRowid);
  res.status(201).json(task);
});

app.patch("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const PatchSchema = z.object({
    title: z.string().min(1).max(120).optional(),
    description: z.string().max(500).optional().nullable(),
    status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  });

  const parsed = PatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const current = db.prepare("SELECT * FROM tasks WHERE id=?").get(id);
  if (!current) return res.status(404).json({ message: "Task not found" });

  const next = {
    title: parsed.data.title ?? current.title,
    description: parsed.data.description ?? current.description,
    status: parsed.data.status ?? current.status,
  };

  db.prepare(`
    UPDATE tasks
    SET title=?, description=?, status=?, updated_at=datetime('now')
    WHERE id=?
  `).run(next.title, next.description, next.status, id);

  const updated = db.prepare("SELECT * FROM tasks WHERE id=?").get(id);
  res.json(updated);
});

app.delete("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare("DELETE FROM tasks WHERE id=?").run(id);
  if (info.changes === 0) return res.status(404).json({ message: "Task not found" });
  res.status(204).send();
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

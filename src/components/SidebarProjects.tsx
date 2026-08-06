import type { ChangeEvent } from "react";
import type { QrProject } from "../utils/qrProjects";

interface Props {
  projects: QrProject[];
  selectedProjectId: string;
  name: string;
  description: string;
  tags: string;
  notes: string;
  status: string;
  onSelect: (id: string) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onNew: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onLoad: (id?: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onExport: () => void;
  onImport: (file: File) => void | Promise<void>;
}

export function SidebarProjects(props: Props) {
  const importProject = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void props.onImport(file);
    event.target.value = "";
  };

  return <div className="qr-panel-content qr-projects-panel">
    <section className="qr-style-section">
      <h3>Current project</h3>
      <p className="qr-help">Save every content, styling, batch, and export setting together. Projects stay in this browser unless you export a JSON copy.</p>
      <label className="qr-field"><span>Project name</span><input value={props.name} onChange={(event) => props.onNameChange(event.target.value)} placeholder="Spring campaign" required /></label>
      <label className="qr-field"><span>Description</span><textarea rows={2} value={props.description} onChange={(event) => props.onDescriptionChange(event.target.value)} placeholder="What this QR project is for" /></label>
      <label className="qr-field"><span>Tags</span><input value={props.tags} onChange={(event) => props.onTagsChange(event.target.value)} placeholder="campaign, print, spring-2026" /><small>Separate tags with commas.</small></label>
      <label className="qr-field"><span>Notes</span><textarea rows={2} value={props.notes} onChange={(event) => props.onNotesChange(event.target.value)} placeholder="Production notes or reminders" /></label>
      <div className="qr-project-actions">
        <button type="button" onClick={props.onNew}>New Project</button>
        <button type="button" className="primary" onClick={props.onSave}>Save Project</button>
        <button type="button" onClick={props.onSaveAs}>Save As…</button>
        <button type="button" disabled={!props.selectedProjectId} onClick={() => props.onLoad()}>Load Project</button>
      </div>
      {props.status && <p className="qr-project-status" role="status">{props.status}</p>}
    </section>

    <section className="qr-style-section">
      <h3>Project JSON</h3>
      <div className="qr-project-json-actions">
        <button type="button" disabled={!props.selectedProjectId && !props.name.trim()} onClick={props.onExport}>Export Project as JSON</button>
        <label className="qr-project-import">Import Project from JSON<input type="file" accept=".json,application/json" onChange={importProject} /></label>
      </div>
    </section>

    <section className="qr-style-section">
      <div className="qr-project-list-heading"><h3>Saved projects</h3><span>{props.projects.length}</span></div>
      {props.projects.length === 0 ? <p className="qr-project-empty">No projects saved yet.</p> : <div className="qr-project-list">
        {props.projects.map((project) => {
          const selected = props.selectedProjectId === project.id;
          return <article key={project.id} className={`qr-project-card${selected ? " selected" : ""}`}>
            <button type="button" className="qr-project-select" aria-pressed={selected} onClick={() => props.onSelect(project.id)}>
              <strong>{project.name}</strong>
              {project.description && <span>{project.description}</span>}
              <small>{project.qrType.toUpperCase()} · Updated {formatDate(project.updatedAt)}</small>
              <small>Created {formatDate(project.createdAt)}</small>
              {project.meta.tags.length > 0 && <span className="qr-project-tags">{project.meta.tags.map((tag) => <em key={tag}>{tag}</em>)}</span>}
            </button>
            <div className="qr-project-card-actions">
              <button type="button" onClick={() => props.onLoad(project.id)}>Load</button>
              <button type="button" onClick={() => props.onDuplicate(project.id)}>Duplicate</button>
              <button type="button" className="danger" onClick={() => props.onDelete(project.id)}>Delete</button>
            </div>
          </article>;
        })}
      </div>}
    </section>
  </div>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

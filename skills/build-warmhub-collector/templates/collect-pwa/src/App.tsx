import { useEffect, useMemo, useState } from "react";
import {
  buildEnvelope,
  flushQueue,
  getCollectorInstanceWref,
  queueSubmission,
  readQueue,
  type IdentityMode,
} from "./warmhub";

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    });
  });
}

export function App() {
  const [identityMode, setIdentityMode] = useState<IdentityMode>("anonymous-collector-instance");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [userWref, setUserWref] = useState("");
  const [queueCount, setQueueCount] = useState(readQueue().length);
  const [status, setStatus] = useState("Ready");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy?: number }>();
  const collectorInstance = useMemo(() => getCollectorInstanceWref(), []);

  useEffect(() => {
    const onOnline = () => {
      void handleFlush();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  async function captureLocation() {
    try {
      const position = await getPosition();
      setCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      setStatus("Location captured");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Location unavailable");
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setStatus("Title is required");
      return;
    }
    if (identityMode === "warmhub-account" && !userWref.trim()) {
      setStatus("WarmHub user wref is required for attributed mode");
      return;
    }

    const envelope = buildEnvelope(identityMode, {
      title: title.trim(),
      notes: notes.trim(),
      userWref,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      accuracy: coords?.accuracy,
    });
    const next = queueSubmission(envelope);
    setQueueCount(next.length);
    setTitle("");
    setNotes("");
    setStatus("Submission queued");
  }

  async function handleFlush() {
    try {
      const result = await flushQueue();
      setQueueCount(result.remaining.length);
      setStatus(`Sent ${result.sent}; ${result.remaining.length} still queued`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Flush failed");
    }
  }

  return (
    <main>
      <header>
        <p className="eyebrow">WarmHub Collector</p>
        <h1>Field submission</h1>
        <p className="status">{status}</p>
      </header>

      <section className="panel">
        <dl>
          <div>
            <dt>Collector identity</dt>
            <dd>{collectorInstance}</dd>
          </div>
          <div>
            <dt>Queued</dt>
            <dd>{queueCount}</dd>
          </div>
        </dl>
      </section>

      <form className="panel" onSubmit={handleSubmit}>
        <label>
          Identity mode
          <select value={identityMode} onChange={(event) => setIdentityMode(event.target.value as IdentityMode)}>
            <option value="anonymous-collector-instance">Anonymous collector instance</option>
            <option value="warmhub-account">WarmHub account attributed</option>
            <option value="hybrid">Hybrid claim later</option>
          </select>
        </label>

        {identityMode === "warmhub-account" ? (
          <label>
            WarmHub user wref
            <input value={userWref} onChange={(event) => setUserWref(event.target.value)} placeholder="User/example" />
          </label>
        ) : null}

        <label>
          Observation title
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>

        <label>
          Notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} />
        </label>

        <div className="actions">
          <button type="button" onClick={captureLocation}>
            Capture GPS
          </button>
          <button type="submit">Queue submission</button>
        </div>
      </form>

      <section className="panel">
        <button type="button" onClick={handleFlush}>
          Flush queue
        </button>
      </section>
    </main>
  );
}

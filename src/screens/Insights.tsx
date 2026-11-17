import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { overview, peopleStats, waitedFor } from '../domain/insights';
import { formatDuration } from '../domain/sort';
import { Cover } from '../components/Cover';
import { personHref } from '../router';

export function Insights() {
  const albums = useLiveQuery(() => db.albums.toArray(), []);
  if (!albums) return null;
  const o = overview(albums);
  const people = peopleStats(albums);
  const max = Math.max(1, ...o.months.flatMap((m) => [m.added, m.heard]));
  const bestMatch = people.filter((p) => p.match != null).sort((a, b) => b.match! - a.match!)[0];

  if (o.saved === 0)
    return (
      <section>
        <div className="page-head">
          <h1 className="screen-title">Insights</h1>
        </div>
        <div className="empty">
          <div className="empty-bars" aria-hidden="true">
            <span style={{ height: '40%' }} />
            <span style={{ height: '70%' }} />
            <span style={{ height: '55%' }} />
            <span style={{ height: '90%' }} />
          </div>
          <h2>Your listening, over time</h2>
          <p className="muted">
            Save a few albums and mark them as listened. Earmark charts what you add and hear, and how long
            things wait.
          </p>
          <a className="btn btn-primary" href="#/">
            Add an album
          </a>
        </div>
      </section>
    );

  return (
    <section aria-labelledby="insights-title">
      <div className="page-head">
        <h1 id="insights-title" className="screen-title">
          Insights
        </h1>
        <p className="summary muted">Everything here is worked out on your device.</p>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="stat-num">{o.saved}</span>
          <span className="muted">saved</span>
        </div>
        <div className="stat">
          <span className="stat-num">{o.heard}</span>
          <span className="muted">heard{o.heardMinutes ? ` · ${formatDuration(o.heardMinutes)}` : ''}</span>
        </div>
        <div className="stat">
          <span className="stat-num">{o.heard ? Math.round((o.loved / o.heard) * 100) : 0}%</span>
          <span className="muted">loved</span>
        </div>
        <div className="stat">
          <span className="stat-num">{o.medianDaysToListen ?? '–'}</span>
          <span className="muted">days a pick usually waits</span>
        </div>
      </div>

      <div className="panel chart-panel">
        <div className="chart-head">
          <h2 className="panel-title">The last 12 months</h2>
          <div className="legend small">
            <span>
              <i className="sw sw-added" /> Added
            </span>
            <span>
              <i className="sw sw-heard" /> Heard
            </span>
          </div>
        </div>
        <div className="bars" role="img" aria-label="Albums added and heard per month">
          {o.months.map((m) => (
            <div key={m.key} className="bar-col" title={`${m.label}: ${m.added} added, ${m.heard} heard`}>
              <div className="bar-pair">
                <span className="bar bar-added" style={{ height: `${(m.added / max) * 100}%` }} />
                <span className="bar bar-heard" style={{ height: `${(m.heard / max) * 100}%` }} />
              </div>
              <span className="bar-label">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="insight-grid">
        {o.longestWaiting && (
          <a className="panel insight-card" href={`#/album/${o.longestWaiting.id}`}>
            <h2 className="panel-title">Waiting longest</h2>
            <div className="insight-album">
              <Cover album={o.longestWaiting} />
              <div>
                <strong>{o.longestWaiting.title}</strong>
                <span className="muted">{o.longestWaiting.artist}</span>
                <span className="small">waiting {waitedFor(o.longestWaiting.addedAt)}</span>
              </div>
            </div>
          </a>
        )}
        {bestMatch && (
          <a className="panel insight-card" href={personHref(bestMatch.name)}>
            <h2 className="panel-title">Best taste match</h2>
            <p className="person insight-person">{bestMatch.name}</p>
            <p className="muted">
              {bestMatch.match}% of their picks landed. {bestMatch.queued} still waiting.
            </p>
          </a>
        )}
        <div className="panel insight-card">
          <h2 className="panel-title">Still to hear</h2>
          <p className="insight-big">{o.queuedMinutes ? formatDuration(o.queuedMinutes) : '—'}</p>
          <p className="muted">of music on your list</p>
        </div>
        {o.topArtists.length > 0 && (
          <div className="panel insight-card">
            <h2 className="panel-title">Artists you keep saving</h2>
            <ol className="rank">
              {o.topArtists.map((a) => (
                <li key={a.artist}>
                  <span>{a.artist}</span>
                  <span className="count">{a.count}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}

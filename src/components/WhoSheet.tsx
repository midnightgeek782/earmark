import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { editAlbum } from '../db/albums';
import { recommenders } from '../domain/sort';
import { LIMITS, type Album } from '../domain/types';
import { Cover } from './Cover';
import { useEscape } from './useEscape';

/** Right after adding: "Who told you?" with one-tap suggestions from people you've used before. */
export function WhoSheet({ album, onClose }: { album: Album; onClose: () => void }) {
  const all = useLiveQuery(() => db.albums.filter((a) => !a.sample && !a.deletedAt).toArray(), []);
  const people = recommenders(all ?? []).slice(0, 8);
  const [who, setWho] = useState('');
  const [note, setNote] = useState('');
  useEscape(onClose);

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = who.trim();
    if (name || note.trim())
      await editAlbum(album.id, { recommendedBy: name || null, recommenderNote: note.trim() || null });
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet who-sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
        role="dialog"
        aria-label="Who told you about it?"
      >
        <div className="who-head">
          <Cover album={album} />
          <div>
            <p className="muted small">Added</p>
            <strong>{album.title}</strong>
            <span className="muted">{album.artist}</span>
          </div>
        </div>
        <label className="field">
          Who told you about it?
          <input
            className="person-input"
            value={who}
            onChange={(e) => setWho(e.target.value)}
            maxLength={LIMITS.recommender}
            placeholder="A friend, a podcast, a review…"
            autoFocus
          />
        </label>
        {people.length > 0 && (
          <div className="row wrap">
            {people.map((p) => (
              <button
                key={p.name}
                type="button"
                className={`chip chip-person ${who.trim().toLowerCase() === p.name.toLowerCase() ? 'chip-on' : ''}`}
                onClick={() => setWho(p.name)}
              >
                <span className="person">{p.name}</span>
              </button>
            ))}
          </div>
        )}
        <label className="field">
          What did they say? (optional)
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={LIMITS.note}
            placeholder="“Track 3 is the one”"
          />
        </label>
        <div className="row">
          <button className="btn" type="button" onClick={onClose}>
            Skip
          </button>
          <button className="btn btn-primary" type="submit">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

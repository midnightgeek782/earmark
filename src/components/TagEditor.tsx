import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { editAlbum } from '../db/albums';
import { addTag, allTags, removeTag, SUGGESTED_TAGS } from '../domain/tags';
import { LIMITS, type Album } from '../domain/types';
import { queueHref } from '../router';

/** Tags on the album page: current tags as removable chips, an input, and one-tap suggestions. */
export function TagEditor({ album }: { album: Album }) {
  const all = useLiveQuery(() => db.albums.toArray(), []);
  const [text, setText] = useState('');
  const tags = album.tags ?? [];
  const used = allTags(all ?? []).map((t) => t.tag);
  const suggestions = [...new Set([...used, ...SUGGESTED_TAGS])].filter((t) => !tags.includes(t)).slice(0, 8);
  const full = tags.length >= LIMITS.maxTags;

  const add = (t: string) => {
    const next = addTag(tags, t);
    if (next !== tags) void editAlbum(album.id, { tags: next });
    setText('');
  };

  return (
    <div className="field tag-editor">
      Tags
      <div className="row wrap">
        {tags.map((t) => (
          <span key={t} className="chip chip-tag chip-on">
            <a href={queueHref(album.status === 'listened' ? 'listened' : 'toListen', { tag: t })}>#{t}</a>
            <button
              type="button"
              className="chip-x"
              aria-label={`Remove tag ${t}`}
              onClick={() => editAlbum(album.id, { tags: removeTag(tags, t) })}
            >
              ×
            </button>
          </span>
        ))}
        {!full && (
          <form
            className="tag-form"
            onSubmit={(e) => {
              e.preventDefault();
              add(text);
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={LIMITS.tag}
              placeholder={tags.length ? 'Add another' : 'Add a tag, like road trip'}
              aria-label="Add a tag"
            />
          </form>
        )}
      </div>
      {!full && suggestions.length > 0 && (
        <div className="row wrap tag-suggest">
          {suggestions.map((t) => (
            <button key={t} type="button" className="chip chip-ghost" onClick={() => add(t)}>
              + {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

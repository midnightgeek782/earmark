# Earmark

**Every album, and who told you about it.**

A friend texts you an album. A review mentions one. A video plays a song you want to hear in full. Earmark keeps them all in one to-listen list, remembers who recommended each one, and helps you pick something to play when you have time.

- **Open source and free.** MIT licensed.
- **Nothing to install, no account.** It's a web app you can add to your home screen.
- **Your list is yours.** It lives in your browser and exports to a plain file you can take anywhere.
- **Works with any music app.** Spotify, Apple Music, YouTube Music, Tidal, Deezer or Bandcamp.
- **Suggests what to hear next**: albums like the ones you save, from [ListenBrainz](https://listenbrainz.org)'s open listening data.
- **Built on open music data** from [MusicBrainz](https://musicbrainz.org) and the [Cover Art Archive](https://coverartarchive.org).

**Use it:** https://midnightgeek782.github.io/earmark/

> Status: v0.1, first public version. See [docs/plan.md](docs/plan.md) for the plan.

## How it compares

|                              | Earmark     | Side B | Record Club | albumz             |
| ---------------------------- | ----------- | ------ | ----------- | ------------------ |
| Platform                     | Any browser | iPhone | iPhone, web | Self-hosted server |
| Account needed               | No          | No     | Yes         | Yes (your server)  |
| Remembers who recommended it | Yes         | No     | No          | No                 |
| Open source                  | Yes         | No     | No          | Yes                |

## Run it locally

```sh
git clone https://github.com/midnightgeek782/earmark.git && cd earmark
npm ci
npm run dev
```

Run the tests with `npm test`.

## Privacy

Earmark has no server and no analytics. Your list never leaves your device. Network requests:

- Album searches and details from MusicBrainz (the text you type, album IDs) and covers from the Cover Art Archive.
- Optional: album suggestions from ListenBrainz (artist IDs only) and short descriptions from Wikipedia (album IDs). Both can be turned off in Settings.

## Being a good MusicBrainz citizen

Earmark sends at most one request per second to MusicBrainz, caches answers, and identifies itself through its web address. Contributors develop against recorded replies, not the live service.

## License

[MIT](LICENSE)

# Labotel HSE Dashboard

Static HSE management dashboard for Labotel operations.

## Run locally

Open `index.html` directly, or run:

```powershell
npx serve .
```

Then open the local URL shown in the terminal.

## Deploy online

### Netlify

1. Create a new Netlify site from this folder/repo.
2. Publish directory: `.`
3. No build command required.

### Vercel

1. Import the project into Vercel.
2. Framework preset: `Other`
3. No build command required.

### GitHub Pages

1. Push this folder to GitHub.
2. Open repository `Settings > Pages`.
3. Under `Build and deployment`, choose `Deploy from a branch`.
4. Select your main branch and `/ (root)` folder.
5. Save, then wait for GitHub Pages to publish the site.

This project already includes:

- `.nojekyll` so GitHub Pages serves static files directly
- `404.html` to redirect visitors back to `index.html`
- relative local asset paths for static hosting

If your repo is a normal project repo, your URL will look like:

`https://your-username.github.io/repository-name/`

If it is your special username site repo, your URL will look like:

`https://your-username.github.io/`

## Notes

- Data created in the dashboard is stored in browser `localStorage`.
- Different browsers/devices keep separate local data unless you connect a real backend later.

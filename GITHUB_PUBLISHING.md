# Publish NIGERIA 2027 to GitHub

This project uses a normal Git repository and can be pushed to a new GitHub repository or copied into another repository. The package files include a `.gitignore` and a GitHub Actions workflow that runs `npm ci` and `npm run build` on pushes and pull requests.

## Publish a fresh copy

1. On GitHub, create a new empty repository. Choose Public or Private. Do not initialize it with a README, license, or `.gitignore` because those files are already included.
2. Open a terminal in the project folder and run:

```bash
git init
git add .
git commit -m "Initial NIGERIA 2027 game prototype"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the remote URL with your repository URL. Authenticate with GitHub’s secure browser/device flow or GitHub Desktop; do not put a personal access token in the repository or share it in chat.

## GitHub Desktop

1. Extract the project ZIP.
2. In GitHub Desktop, choose **File → Add Local Repository** and select the extracted folder (or create a repository in that folder).
3. Commit the files, then choose **Publish repository** and select the visibility you want.

The project’s `.gitignore` excludes `node_modules`, build output, local Vite data, `.env`, and OS metadata. Run `npm install` and `npm run build` after cloning to verify the app locally.
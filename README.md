# GEo3d - 3D Geometry Visualizer

This is a web application for visualizing and solving 3D geometry problems, built with React, TypeScript, and Vite.

## Tech Stack
- **Frontend Framework**: React 18 (TypeScript)
- **Build Tool**: Vite
- **Routing**: React Router
- **3D Rendering**: Three.js, React Three Fiber, React Three Drei
- **UI & Styling**: Tailwind CSS, Radix UI (Shadcn UI)
- **State & Data**: TanStack React Query
- **Backend / API**: Express & Node.js endpoints (in `api/` folder) for AI analysis
- **Database & Auth**: Supabase

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) with your browser to see the result.

## Project Structure
- `src/` - React frontend code (Components, Pages, Contexts, Hooks, 3D Canvas configuration).
- `api/` - Backend API endpoints (Geometry parsing, AI models integration, payment webhooks).
- `public/` - Static public assets.

## Scripts
- `npm run dev`: Start the local development server (Vite)
- `npm run build`: Build the app for production
- `npm run lint`: Run ESLint on the source files
- `npm run preview`: Preview the production build locally

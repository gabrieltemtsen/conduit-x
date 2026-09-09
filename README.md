# Conduit X

A modern web application built with [Next.js](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), and [Tailwind CSS](https://tailwindcss.com/).

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18.18+ or v20+) and npm/yarn/pnpm installed.

### Installation

Clone the repository and install dependencies:

```bash
# Clone the repository
git clone https://github.com/gabrieltemtsen/conduit-x.git
cd conduit-x

# Install dependencies
npm install
```

### Running Locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🛠️ Available Scripts

| Script | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server with Turbopack |
| `npm run build` | Compiles and builds the production bundle |
| `npm run start` | Runs the production server |
| `npm run lint` | Runs ESLint to check for code quality and syntax issues |

---

## 📁 Project Structure

```text
conduit-x/
├── app/                  # Next.js App Router (pages, layouts, styles)
│   ├── favicon.ico       # Favicon
│   ├── globals.css       # Global CSS with Tailwind configuration
│   ├── layout.tsx        # Root layout component
│   └── page.tsx          # Home page component
├── public/               # Static assets (images, SVGs)
├── .editorconfig         # Editor configuration for code consistency
├── .gitignore            # Git ignore rules
├── eslint.config.mjs     # ESLint flat config
├── next.config.ts        # Next.js configuration
├── package.json          # Dependencies and scripts
├── postcss.config.mjs    # PostCSS plugins (Tailwind CSS v4)
└── tsconfig.json         # TypeScript configuration
```

---

## 🧰 Tech Stack

- **Framework**: [Next.js 16 (Turbopack)](https://nextjs.org/)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Linting**: [ESLint](https://eslint.org/)

---

## 📄 License

This project is licensed under the MIT License.

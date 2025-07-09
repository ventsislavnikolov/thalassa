# Quick Setup Guide

## Prerequisites

1. **Install Node.js** (v18 or higher)

   - Download from: https://nodejs.org/

2. **Install pnpm** (recommended package manager)
   ```bash
   npm install -g pnpm
   ```

## Setup

1. **Clone/download the project**

   ```bash
   # If using git
   git clone <repository-url>
   cd greece-reserve-online-net-booking
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start development server**

   ```bash
   pnpm dev
   ```

4. **Open your browser**
   - Navigate to: http://localhost:3000

## Common Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run code linting

## Adding UI Components

```bash
pnpm dlx shadcn@latest add [component-name]
```

## Troubleshooting

- **Port in use**: The app will automatically use the next available port
- **Node version**: Ensure you're using Node.js 18 or higher
- **pnpm issues**: Try `pnpm install --force` to refresh dependencies

---

🏖️ You're ready to find the best hotel deals in Pefkohori, Greece!

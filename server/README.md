# TypeScript Server Setup

This server has been converted to TypeScript for improved type safety and developer experience.

## Development

Run the development server with hot-reload:

```bash
pnpm dev
```

This uses `nodemon` with `ts-node` to automatically restart the server when you make changes.

## Production Build

Build the TypeScript files to JavaScript:

```bash
pnpm build
```

This compiles all TypeScript files to the `dist/` directory.

## Start Production Server

After building, start the production server:

```bash
pnpm start
```

## TypeScript Configuration

- **tsconfig.json**: TypeScript compiler configuration
- **nodemon.json**: Nodemon configuration for watching TypeScript files

## File Structure

- All `.ts` files are the active source files
- Old `.js` files can be safely deleted
- Compiled output goes to `dist/` directory

## Key Features

- Strict type checking enabled
- ES Modules (ESM) support
- Proper Express types with `@types/express`
- Type definitions for all dependencies
- Source maps for debugging
